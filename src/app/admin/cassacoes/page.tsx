"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarNotificacaoPDF, type Agente } from "@/lib/notificacaoPdf";
import { gerarCadernoInstauracao } from "@/lib/cassacaoPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";

const sb = createSupabase();

const GATILHOS = [
  { v: "obito", l: "Óbito do titular", base: "Parecer 33/2024/PGM · ADI 5.337" },
  { v: "inadimplencia", l: "Inadimplência (> 3 cotas)", base: "Art. 14, §3º e art. 19, II do Decreto" },
  { v: "recadastramento", l: "Ausência em recadastramento", base: "Art. 12, V do Decreto" },
  { v: "banca_fechada", l: "Banca fechada (10 dias úteis)", base: "Art. 6º do Decreto" },
  { v: "irregularidade", l: "Irregularidade reiterada", base: "Art. 5º e 18 do Decreto" },
  { v: "alimentos", l: "Comércio de alimentos", base: "Art. 19, I do Decreto" },
];
const ETAPAS = ["aberto", "contraditorio", "decidido", "desocupacao", "encerrado"];
const ETAPA_LABEL: Record<string, string> = {
  aberto: "Aberto", contraditorio: "Em contraditório", decidido: "Decidido", desocupacao: "Desocupação", encerrado: "Encerrado",
};
const ETAPA_COR: Record<string, string> = {
  aberto: "#C8961E", contraditorio: "#1F9BD4", decidido: "#3D1A5B", desocupacao: "#C55A11", encerrado: "#2E8B57",
};
const proxima = (s: string) => ETAPAS[Math.min(ETAPAS.indexOf(s) + 1, ETAPAS.length - 1)];

type Banca = { id: string; numero: string };
type Proc = {
  id: string; banca_id: string | null; tipo: string; status: string; gatilho: string | null;
  base_legal: string | null; aberto_em: string | null; desfecho: string | null;
  ciencia_em: string | null; prazo_defesa: string | null;
  banca: { numero: string } | null; permissionario: { nome: string } | null;
};

function prazoInfo(p: Proc) {
  if (!p.prazo_defesa || !["aberto", "contraditorio"].includes(p.status)) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(p.prazo_defesa + "T00:00:00");
  const dias = Math.round((venc.getTime() - hoje.getTime()) / 86400000);
  const cor = dias < 0 ? "#C0392B" : dias <= 3 ? "#C8961E" : "#2E8B57";
  const label = dias < 0 ? `prazo vencido há ${-dias} dia(s)` : dias === 0 ? "vence hoje" : `${dias} dia(s) restante(s)`;
  return { dias, cor, label, venc: venc.toLocaleDateString("pt-BR"), vencido: dias < 0 };
}

export default function CassacoesPage() {
  return (
    <AdminGuard active="cassacoes" title="Processos de Cassação">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [lista, setLista] = useState<Proc[]>([]);
  const [notifCount, setNotifCount] = useState<Record<string, number>>({});
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [form, setForm] = useState({ banca_id: "", gatilho: "irregularidade", prazo: "" });

  const carregar = useCallback(async () => {
    const { data } = await sb.from("processo")
      .select("id,banca_id,tipo,status,gatilho,base_legal,aberto_em,desfecho,ciencia_em,prazo_defesa,banca(numero),permissionario(nome)")
      .eq("tipo", "cassacao").order("aberto_em", { ascending: false });
    const rows = (data as unknown as Proc[]) ?? [];
    setLista(rows);
    // conta notificações por banca envolvida
    const ids = rows.map((r) => r.banca_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: nd } = await sb.from("notificacao").select("banca_id").in("banca_id", ids);
      const c: Record<string, number> = {};
      for (const n of (nd as { banca_id: string }[]) ?? []) c[n.banca_id] = (c[n.banca_id] ?? 0) + 1;
      setNotifCount(c);
    }
  }, []);

  useEffect(() => {
    sb.from("banca").select("id,numero").then(({ data }) => {
      const rows = (data as Banca[]) ?? [];
      rows.sort((a, b) => Number(a.numero) - Number(b.numero));
      setBancas(rows);
    });
    sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true).then(({ data }) => {
      const ags = (data as (Agente & { id: string; papel: string })[]) ?? [];
      setGestor(ags.find((x) => x.papel === "gestor_shopping") ?? null);
      setSecretario(ags.find((x) => x.papel === "secretario") ?? null);
    });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
    carregar();
  }, [carregar]);

  const [lote, setLote] = useState<string | null>(null);
  async function instaurarLote() {
    setLote("Instaurando processos pendentes…");
    const { data, error } = await sb.rpc("instaurar_cassacoes_pendentes");
    if (error) { setLote("Erro: " + error.message); return; }
    const n = (data as number) ?? 0;
    setLote(n > 0 ? `${n} novo(s) processo(s) instaurado(s) com notificação de instauração.` : "Nenhum caso pendente — todos os elegíveis já têm processo.");
    carregar();
  }

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    if (!form.banca_id) return;
    const g = GATILHOS.find((x) => x.v === form.gatilho);
    const { data: perm } = await sb.from("permissionario").select("id").eq("banca_id", form.banca_id).maybeSingle();
    await sb.from("processo").insert({
      banca_id: form.banca_id, permissionario_id: (perm as { id: string } | null)?.id ?? null,
      tipo: "cassacao", status: "aberto", gatilho: g?.l ?? form.gatilho, base_legal: g?.base ?? null,
    });
    await sb.from("banca").update({ status: "em_cassacao" }).eq("id", form.banca_id);
    setForm({ ...form, banca_id: "", prazo: "" });
    carregar();
  }

  async function setCiencia(p: Proc, dateStr: string) {
    if (!dateStr) return;
    const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + 10);
    const prazo = d.toISOString().slice(0, 10);
    await sb.from("processo").update({ ciencia_em: dateStr, prazo_defesa: prazo }).eq("id", p.id);
    carregar();
  }

  async function avancar(p: Proc) {
    const nova = proxima(p.status);
    const patch: Record<string, unknown> = { status: nova };
    if (nova === "encerrado") patch.encerrado_em = new Date().toISOString().slice(0, 10);
    await sb.from("processo").update(patch).eq("id", p.id);
    carregar();
  }

  async function notificar(p: Proc) {
    const assunto = `Procedimento de cassação — ${p.gatilho ?? ""}`;
    await sb.from("notificacao").insert({
      destinatario: "permissionario", tipo: "cassacao", origem: "poder_publico",
      banca_id: p.banca_id, numero: 1, assunto, base_legal: p.base_legal, status: "emitida",
      gestor_id: gestor?.id ?? null, secretario_id: secretario?.id ?? null,
    });
    gerarNotificacaoPDF({
      tipo: "cassacao", destinatario: "permissionario", bancaNumero: p.banca?.numero,
      permissionarioNome: p.permissionario?.nome, assunto, baseLegal: p.base_legal, gestor, secretario, logo,
    });
    carregar();
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3.5 md:grid-cols-4">
        {ETAPAS.slice(0, 4).map((s) => (
          <div key={s} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeft: `6px solid ${ETAPA_COR[s]}` }}>
            <b className="block text-3xl font-extrabold" style={{ color: ETAPA_COR[s] }}>{lista.filter((p) => p.status === s).length}</b>
            <span className="text-[12.5px] text-muted">{ETAPA_LABEL[s]}</span>
          </div>
        ))}
      </div>

      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        Fluxo (art. 18): 3 notificações da concessionária → encaminhamento ao fiscal → notificação com contraditório e ampla
        defesa → desocupação em 30 dias → lacre. Abra o processo e avance as etapas conforme o andamento.
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="flex-1">
          <b className="text-[13.5px] text-navy">Instaurar processos pendentes em lote</b>
          <span className="block text-[12px] text-muted">Abre um processo (art. 18) para cada banca elegível ainda sem processo — óbito, inadimplência acima de 3 cotas e ausência em 2 recadastramentos — e registra a notificação de instauração. Não duplica processos já existentes.</span>
          {lote && <span className="mt-1 block text-[12.5px] font-semibold text-brand">{lote}</span>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={instaurarLote} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy2">Instaurar pendentes</button>
          <button
            onClick={() => gerarCadernoInstauracao({
              itens: lista.filter((p) => p.status === "aberto").map((p) => ({ banca: p.banca?.numero ?? "—", nome: p.permissionario?.nome ?? null, gatilho: p.gatilho ?? "", baseLegal: p.base_legal })),
              gestor, secretario, logo,
            })}
            className="rounded-lg border border-navy px-4 py-2.5 text-sm font-bold text-navy hover:bg-[#F1EAF8]"
          >
            Gerar caderno de instaurações (PDF)
          </button>
        </div>
      </div>

      <form onSubmit={abrir} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">Abrir procedimento de cassação</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Banca">
            <select className="inp" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
              <option value="">Selecione…</option>
              {bancas.map((b) => <option key={b.id} value={b.id}>Banca {b.numero}</option>)}
            </select>
          </Campo>
          <Campo label="Motivo (gatilho)">
            <select className="inp" value={form.gatilho} onChange={(e) => setForm({ ...form, gatilho: e.target.value })}>
              {GATILHOS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </Campo>
          <Campo label="Base legal">
            <input className="inp" readOnly value={GATILHOS.find((g) => g.v === form.gatilho)?.base ?? ""} />
          </Campo>
        </div>
        <button className="mt-4 rounded-lg bg-accent px-5 py-2.5 font-bold text-white">Abrir processo</button>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhum processo de cassação aberto.</p>
      ) : (
        <div className="grid gap-3">
          {lista.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeft: `5px solid ${ETAPA_COR[p.status]}` }}>
              <div className="flex flex-wrap items-center gap-3">
                <b className="text-navy">Banca {p.banca?.numero ?? "—"}</b>
                {p.permissionario?.nome && <span className="text-[13px] text-muted">{p.permissionario.nome}</span>}
                <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: ETAPA_COR[p.status] + "22", color: ETAPA_COR[p.status] }}>
                  {ETAPA_LABEL[p.status]}
                </span>
                <span className="text-[12px] text-muted">{notifCount[p.banca_id ?? ""] ?? 0} notificação(ões)</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => notificar(p)} className="text-[12.5px] font-semibold text-brand">Notificar + PDF</button>
                  {p.status !== "encerrado" && (
                    <button onClick={() => avancar(p)} className="rounded-lg bg-navy px-3 py-1.5 text-[12.5px] font-semibold text-white">
                      Avançar → {ETAPA_LABEL[proxima(p.status)]}
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{p.gatilho} · {p.base_legal} · aberto em {p.aberto_em ? new Date(p.aberto_em).toLocaleDateString("pt-BR") : "—"}</p>
              {["aberto", "contraditorio"].includes(p.status) && (() => {
                const pz = prazoInfo(p);
                return (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-[#faf7fd] p-2.5 text-[12px]">
                    <label className="flex items-center gap-1.5 text-muted">Ciência em:
                      <input type="date" defaultValue={p.ciencia_em ?? ""} onChange={(e) => setCiencia(p, e.target.value)}
                        className="rounded-lg border border-line px-2 py-1 text-[12px]" />
                    </label>
                    {pz && (
                      <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: pz.cor }}>
                        <i className="inline-block h-2 w-2 rounded-full" style={{ background: pz.cor }} />
                        Contraditório vence {pz.venc} · {pz.label}
                      </span>
                    )}
                    {pz?.vencido && (
                      <button onClick={() => avancar(p)} className="rounded-lg bg-[#20242B] px-2.5 py-1 text-[11.5px] font-bold text-white">
                        Prazo esgotado → decidir
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>{children}</label>);
}
