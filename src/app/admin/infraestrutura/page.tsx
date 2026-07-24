"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarNotificacaoPDF, type Agente } from "@/lib/notificacaoPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";

const sb = createSupabase();

const STATUS = { ok: { l: "OK", c: "#2E8B57" }, atencao: { l: "Atenção", c: "#C8961E" }, critico: { l: "Crítico", c: "#C0392B" } } as const;
const PRIOR = [
  { v: "baixa", l: "Baixa" }, { v: "media", l: "Média" }, { v: "alta", l: "Alta" }, { v: "urgente", l: "Urgente" },
];
const REPARO_STATUS: Record<string, string> = {
  aberta: "Aberta", notificada: "Notificada", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};

type Area = { id: string; nome: string; status: keyof typeof STATUS; ultima_vistoria: string | null; observacao: string | null };
type Reparo = { id: string; area_id: string | null; titulo: string; descricao: string | null; prioridade: string; status: string; prazo: string | null };

export default function InfraPage() {
  return (
    <AdminGuard active="infraestrutura" title="Infraestrutura predial">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [reparos, setReparos] = useState<Reparo[]>([]);
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [form, setForm] = useState({ area_id: "", titulo: "", descricao: "", prioridade: "media", prazo: "" });

  const carregar = useCallback(async () => {
    const [{ data: a }, { data: r }] = await Promise.all([
      sb.from("infraestrutura_area").select("id,nome,status,ultima_vistoria,observacao").order("nome"),
      sb.from("ordem_reparo").select("id,area_id,titulo,descricao,prioridade,status,prazo").order("created_at", { ascending: false }),
    ]);
    setAreas((a as Area[]) ?? []);
    setReparos((r as Reparo[]) ?? []);
  }, []);

  useEffect(() => {
    sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true).then(({ data }) => {
      const rows = (data as (Agente & { id: string; papel: string })[]) ?? [];
      setGestor(rows.find((x) => x.papel === "gestor_shopping") ?? null);
      setSecretario(rows.find((x) => x.papel === "secretario") ?? null);
    });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
    carregar();
  }, [carregar]);

  async function setStatus(id: string, status: string) {
    await sb.from("infraestrutura_area").update({ status, ultima_vistoria: new Date().toISOString().slice(0, 10) }).eq("id", id);
    carregar();
  }
  async function setObs(id: string, observacao: string) {
    await sb.from("infraestrutura_area").update({ observacao }).eq("id", id);
  }

  async function abrirReparo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo) return;
    await sb.from("ordem_reparo").insert({
      area_id: form.area_id || null, titulo: form.titulo, descricao: form.descricao || null,
      prioridade: form.prioridade, prazo: form.prazo || null, status: "aberta",
    });
    setForm({ area_id: "", titulo: "", descricao: "", prioridade: "media", prazo: "" });
    carregar();
  }

  async function notificar(o: Reparo) {
    const area = areas.find((a) => a.id === o.area_id);
    const assunto = `Reparo/manutenção — ${area?.nome ?? "área comum"}: ${o.titulo}`;
    const base = "Art. 7º, §4º do Decreto (manutenção estrutural sob responsabilidade da concessionária)";
    const { data } = await sb.from("notificacao").insert({
      destinatario: "administradora", tipo: "irregularidade", origem: "poder_publico",
      assunto, descricao: o.descricao, base_legal: base, prazo: o.prazo, status: "emitida",
      gestor_id: gestor?.id ?? null, secretario_id: secretario?.id ?? null,
    }).select("id").maybeSingle();
    await sb.from("ordem_reparo").update({ status: "notificada", notificacao_id: (data as { id: string } | null)?.id ?? null }).eq("id", o.id);
    gerarNotificacaoPDF({ tipo: "irregularidade", destinatario: "administradora", assunto, descricao: o.descricao, prazo: o.prazo, baseLegal: base, gestor, secretario, logo });
    carregar();
  }

  async function reparoStatus(id: string, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "concluida") patch.concluida_em = new Date().toISOString().slice(0, 10);
    await sb.from("ordem_reparo").update(patch).eq("id", id);
    carregar();
  }

  const cont = (s: string) => areas.filter((a) => a.status === s).length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3.5 md:grid-cols-3">
        {(["ok", "atencao", "critico"] as const).map((s) => (
          <div key={s} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeft: `6px solid ${STATUS[s].c}` }}>
            <b className="block text-3xl font-extrabold" style={{ color: STATUS[s].c }}>{cont(s)}</b>
            <span className="text-[12.5px] text-muted">áreas em “{STATUS[s].l}”</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Áreas do prédio</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <div key={a.id} className="rounded-2xl border border-line bg-white p-4" style={{ borderTop: `4px solid ${STATUS[a.status].c}` }}>
              <div className="flex items-center justify-between">
                <b className="text-navy">{a.nome}</b>
                <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}
                  className="rounded-lg border border-line px-2 py-1 text-[12px] font-semibold" style={{ color: STATUS[a.status].c }}>
                  <option value="ok">OK</option><option value="atencao">Atenção</option><option value="critico">Crítico</option>
                </select>
              </div>
              <input defaultValue={a.observacao ?? ""} onBlur={(e) => setObs(a.id, e.target.value)} placeholder="Observação / vistoria…"
                className="mt-2 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px]" />
              {a.ultima_vistoria && <p className="mt-1 text-[11px] text-muted">Últ. vistoria: {new Date(a.ultima_vistoria).toLocaleDateString("pt-BR")}</p>}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={abrirReparo} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">Abrir ordem de reparo</h3>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="inp md:col-span-1" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Área…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <input className="inp md:col-span-2" placeholder="Título do reparo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <select className="inp" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
            {PRIOR.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <input type="date" className="inp" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
        </div>
        <textarea className="inp mt-3 min-h-[54px]" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <button className="mt-1 rounded-lg bg-accent px-4 py-2.5 font-bold text-white">Abrir ordem</button>
      </form>

      {reparos.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Reparo</th><th className="p-3">Área</th><th className="p-3">Prioridade</th><th className="p-3">Prazo</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {reparos.map((o) => (
                <tr key={o.id} className="border-t border-line align-top">
                  <td className="p-3"><b className="text-navy">{o.titulo}</b>{o.descricao && <span className="block text-[12px] text-muted">{o.descricao}</span>}</td>
                  <td className="p-3">{areas.find((a) => a.id === o.area_id)?.nome ?? "—"}</td>
                  <td className="p-3 capitalize">{o.prioridade}</td>
                  <td className="p-3">{o.prazo ? new Date(o.prazo).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3">{REPARO_STATUS[o.status] ?? o.status}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => notificar(o)} className="text-left text-[12px] font-semibold text-brand">Notificar Administradora + PDF</button>
                      {o.status !== "concluida" && <button onClick={() => reparoStatus(o.id, "concluida")} className="text-left text-[12px] font-semibold text-ok">✓ concluir</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}
