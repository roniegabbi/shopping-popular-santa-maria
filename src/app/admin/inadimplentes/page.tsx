"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarRelatorioInadimplencia, gerarOficioPosicionamento, type GrupoInad } from "@/lib/inadimplenciaPdf";
import type { Agente } from "@/lib/notificacaoPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";
import MoedaInput from "../_components/MoedaInput";
import { BRL, moedaParaNumero } from "@/lib/moeda";

const sb = createSupabase();
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const hoje = new Date();
const ANOS = [hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

type Banca = { id: string; numero: string };
type Pag = {
  id: string; taxa: number; condominio: number; status: string;
  banca_id: string; banca: { numero: string } | null; permissionario: { nome: string } | null;
};

type Nivel = "verde" | "amarelo" | "vermelho" | "preto";
const NIVEL_COR: Record<Nivel, string> = {
  verde: "#2E8B57", amarelo: "#C8961E", vermelho: "#C0392B", preto: "#20242B",
};
function severidade(cotas: number): { nivel: Nivel; label: string } {
  if (cotas > 3) return { nivel: "preto", label: "Em cassação (+3 cotas)" };
  if (cotas === 3) return { nivel: "vermelho", label: "Limite — 3 cotas" };
  if (cotas === 2) return { nivel: "amarelo", label: "Atenção — 2 cotas" };
  return { nivel: "verde", label: "Inicial — 1 cota" };
}

export default function InadimplentesPage() {
  return (
    <AdminGuard active="inadimplentes" title="Inadimplentes">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [pagas, setPagas] = useState<Pag[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ banca_id: "", mes: String(hoje.getMonth() + 1), ano: String(hoje.getFullYear()), taxa: "", condominio: "", vencimento: "", status: "em_atraso" });

  const carregar = useCallback(async () => {
    const { data } = await sb
      .from("pagamento")
      .select("id,taxa,condominio,status,banca_id,banca(numero),permissionario(nome)")
      .in("status", ["em_atraso", "protestado"])
      .limit(1000);
    setPagas((data as unknown as Pag[]) ?? []);
  }, []);

  useEffect(() => {
    sb.from("banca").select("id,numero").then(({ data }) => {
      const rows = (data as Banca[]) ?? [];
      rows.sort((a, b) => Number(a.numero) - Number(b.numero));
      setBancas(rows);
    });
    sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true)
      .then(({ data }) => {
        const rows = (data as (Agente & { id: string; papel: string })[]) ?? [];
        setGestor(rows.find((r) => r.papel === "gestor_shopping") ?? null);
        setSecretario(rows.find((r) => r.papel === "secretario") ?? null);
      });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
    carregar();
  }, [carregar]);

  const grupos: GrupoInad[] = useMemo(() => {
    const m = new Map<string, { numero: string; nome: string | null; cotas: number; total: number }>();
    for (const p of pagas) {
      const cur = m.get(p.banca_id) ?? { numero: p.banca?.numero ?? "—", nome: p.permissionario?.nome ?? null, cotas: 0, total: 0 };
      cur.cotas += 1;
      cur.total += Number(p.taxa || 0) + Number(p.condominio || 0);
      m.set(p.banca_id, cur);
    }
    return [...m.entries()].map(([, g]) => {
      const s = severidade(g.cotas);
      return { ...g, nivel: s.nivel, nivelLabel: s.label };
    }).sort((a, b) => b.cotas - a.cotas);
  }, [pagas]);

  const resumo = { bancas: grupos.length, total: grupos.reduce((s, g) => s + g.total, 0), risco: grupos.filter((g) => g.cotas > 3).length };
  const contagem = (n: Nivel) => grupos.filter((g) => g.nivel === n).length;

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!form.banca_id) { setMsg("Selecione a banca."); return; }
    const taxa = moedaParaNumero(form.taxa);
    const condominio = moedaParaNumero(form.condominio);
    if (!taxa && !condominio) { setMsg("Informe ao menos a taxa ou o condomínio."); return; }
    const competencia = `${form.ano}-${String(Number(form.mes)).padStart(2, "0")}-01`;
    setSalvando(true);
    const { error } = await sb.from("pagamento").insert({
      banca_id: form.banca_id, competencia, taxa, condominio,
      vencimento: form.vencimento || null, status: form.status,
    });
    setSalvando(false);
    if (error) { setMsg("Erro ao salvar: " + error.message); return; }
    setMsg(`Competência lançada: ${MESES[Number(form.mes) - 1]}/${form.ano} · taxa ${BRL.format(taxa)} + cond. ${BRL.format(condominio)}.`);
    setForm({ ...form, taxa: "", condominio: "", vencimento: "" });
    carregar();
  }

  // Notifica a Administradora sobre uma banca: cria registro + gera ofício PDF
  async function notificarAdministradora(g: GrupoInad, bancaId: string) {
    await sb.from("notificacao").insert({
      destinatario: "administradora", tipo: "inadimplencia", origem: "poder_publico",
      banca_id: bancaId, numero: 1, status: "emitida",
      assunto: `Posicionamento sobre inadimplência da banca ${g.numero} (${g.cotas} cota(s))`,
      base_legal: "Art. 7º e 14, §3º do Decreto",
      gestor_id: gestor?.id ?? null, secretario_id: secretario?.id ?? null,
    });
    gerarOficioPosicionamento({ grupos: [g], gestor, secretario, logo });
  }

  const semAgentes = !gestor || !secretario;

  return (
    <div className="grid gap-6">
      {/* semáforo */}
      <div>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Painel de risco (semáforo)</h3>
        <div className="grid gap-3.5 md:grid-cols-4">
          {(["verde", "amarelo", "vermelho", "preto"] as Nivel[]).map((n) => (
            <div key={n} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeft: `6px solid ${NIVEL_COR[n]}` }}>
              <b className="block text-3xl font-extrabold" style={{ color: NIVEL_COR[n] }}>{contagem(n)}</b>
              <span className="text-[12.5px] text-muted">
                {n === "verde" ? "1 cota (inicial)" : n === "amarelo" ? "2 cotas (atenção)" : n === "vermelho" ? "3 cotas (limite)" : "cassação (+3 cotas)"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* kpis + ações */}
      <div className="grid gap-3.5 md:grid-cols-3">
        <Kpi val={String(resumo.bancas)} label="bancas inadimplentes" cls="text-bad" />
        <Kpi val={BRL.format(resumo.total)} label="total em atraso" cls="text-navy" />
        <Kpi val={String(resumo.risco)} label="acima de 3 cotas (risco de cassação)" cls="text-warn" />
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => gerarRelatorioInadimplencia({ resumo, grupos, gestor, secretario, logo })}
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white">📄 Relatório-panorama (PDF A4)</button>
        <button onClick={() => gerarOficioPosicionamento({ grupos, gestor, secretario, logo })}
          className="rounded-lg border border-navy px-4 py-2.5 text-sm font-bold text-navy" disabled={grupos.length === 0}>
          ✉️ Ofício à Administradora (todos)
        </button>
        {semAgentes && <span className="self-center text-[12px] text-bad">Cadastre Gestor e Secretário em “Agentes &amp; Portarias” para assinar os documentos.</span>}
      </div>

      {/* form */}
      <form onSubmit={registrar} className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-1 font-extrabold text-navy">Registrar competência / cobrança</h2>
        <p className="mb-4 text-[13px] text-muted">Selecione a banca e o mês/ano e informe os valores em atraso.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Banca">
            <select className="inp" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
              <option value="">Selecione…</option>
              {bancas.map((b) => <option key={b.id} value={b.id}>Banca {b.numero}</option>)}
            </select>
          </Campo>
          <Campo label="Mês de referência">
            <select className="inp" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="Ano">
            <select className="inp" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })}>
              {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Campo>
          <Campo label="Taxa de ocupação (R$)"><MoedaInput value={form.taxa} onChange={(v) => setForm({ ...form, taxa: v })} /></Campo>
          <Campo label="Condomínio (R$)"><MoedaInput value={form.condominio} onChange={(v) => setForm({ ...form, condominio: v })} /></Campo>
          <Campo label="Situação">
            <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="em_atraso">Em atraso</option><option value="protestado">Protestado</option>
              <option value="pago">Pago</option><option value="em_dia">Em dia</option>
            </select>
          </Campo>
          <Campo label="Vencimento — opcional"><input type="date" className="inp" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></Campo>
        </div>
        {msg && <p className="mt-3 text-[13px] font-semibold text-navy">{msg}</p>}
        <button disabled={salvando} className="mt-4 rounded-lg bg-accent px-5 py-2.5 font-bold text-white disabled:opacity-60">{salvando ? "Salvando…" : "Registrar"}</button>
      </form>

      {/* lista */}
      {grupos.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma inadimplência registrada. Use o formulário acima para lançar competências em atraso.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs text-white">
                <th className="p-3">Risco</th><th className="p-3">Banca</th><th className="p-3">Permissionário</th>
                <th className="p-3">Cotas</th><th className="p-3">Total devido</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => {
                const bancaId = [...pagas].find((p) => p.banca?.numero === g.numero)?.banca_id ?? "";
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2">
                        <i className="h-3 w-3 rounded-full" style={{ background: NIVEL_COR[g.nivel] }} />
                        <span className="text-[12px] font-semibold" style={{ color: NIVEL_COR[g.nivel] }}>{g.nivelLabel}</span>
                      </span>
                    </td>
                    <td className="p-3 font-bold text-navy">Banca {g.numero}</td>
                    <td className="p-3">{g.nome ?? "—"}</td>
                    <td className="p-3">{g.cotas}</td>
                    <td className="p-3">{BRL.format(g.total)}</td>
                    <td className="p-3">
                      <button onClick={() => notificarAdministradora(g, bancaId)} className="text-[12px] font-semibold text-brand">
                        Notificar Administradora + PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border: 1px solid #eae2f2; border-radius: 9px; padding: 9px 11px; font-size: 14px; background: #fff; }
      `}</style>
    </div>
  );
}

function Kpi({ val, label, cls }: { val: string; label: string; cls: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <b className={`block text-2xl font-extrabold ${cls}`}>{val}</b>
      <span className="text-[12.5px] text-muted">{label}</span>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>
      {children}
    </label>
  );
}
