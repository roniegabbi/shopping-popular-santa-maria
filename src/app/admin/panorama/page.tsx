"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarPanoramaPDF } from "@/lib/panoramaPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";
import type { Agente } from "@/lib/notificacaoPdf";

const sb = createSupabase();
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const NIVEL_COR: Record<string, string> = { baixo: "#2E8B57", medio: "#C8961E", alto: "#C0392B", critico: "#20242B" };

type Contagens = Record<string, number>;
type Risco = { id: string; titulo: string; nivel: string; origem: string | null; base_legal: string | null; mitigado: boolean };

export default function PanoramaPage() {
  return (
    <AdminGuard active="panorama" title="Panorama Estratégico do Shopping">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [c, setC] = useState<Contagens>({});
  const [util, setUtil] = useState({ agua: 0, energia: 0, atraso: 0 });
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [form, setForm] = useState({ titulo: "", nivel: "medio", origem: "", base_legal: "" });

  const carregar = useCallback(async () => {
    const count = (t: string, col?: string, val?: string) => {
      let q = sb.from(t).select("*", { count: "exact", head: true });
      if (col && val) q = q.eq(col, val);
      return q;
    };
    const [
      bOc, bVg, bAg, bReg, bCas, pFal, pNao, nAb, pjAt, acp, iAt, iCr, rep,
    ] = await Promise.all([
      count("banca", "status", "ocupada"), count("banca", "status", "vaga"),
      count("banca", "status", "aguardando_sorteio"), count("banca", "status", "em_regularizacao"),
      count("banca", "status", "em_cassacao"),
      count("permissionario", "status", "falecido"), count("permissionario", "status", "nao_recadastrado"),
      count("notificacao", "status", "emitida"),
      count("processo_judicial", "status", "ativo"), count("processo_judicial", "classe", "acao_civil_publica"),
      count("infraestrutura_area", "status", "atencao"), count("infraestrutura_area", "status", "critico"),
      sb.from("ordem_reparo").select("*", { count: "exact", head: true }).in("status", ["aberta", "notificada", "em_andamento"]),
    ]);
    setC({
      ocupada: bOc.count ?? 0, vaga: bVg.count ?? 0, aguardando: bAg.count ?? 0, regularizacao: bReg.count ?? 0,
      cassacao: bCas.count ?? 0, falecidos: pFal.count ?? 0, naoRecad: pNao.count ?? 0, notif: nAb.count ?? 0,
      pjAtivos: pjAt.count ?? 0, acp: acp.count ?? 0, infraAtencao: iAt.count ?? 0, infraCritico: iCr.count ?? 0, reparos: rep.count ?? 0,
    });

    const { data: contas } = await sb.from("conta_utilidade").select("tipo,valor,status");
    const cs = (contas as { tipo: string; valor: number; status: string }[]) ?? [];
    setUtil({
      agua: cs.filter((x) => x.tipo === "agua").reduce((s, x) => s + Number(x.valor || 0), 0),
      energia: cs.filter((x) => x.tipo === "energia").reduce((s, x) => s + Number(x.valor || 0), 0),
      atraso: cs.filter((x) => x.status === "em_atraso").length,
    });

    const { data: r } = await sb.from("risco_legal").select("id,titulo,nivel,origem,base_legal,mitigado").eq("mitigado", false).order("created_at", { ascending: false });
    setRiscos((r as Risco[]) ?? []);

    const { data: ag } = await sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true);
    const ags = (ag as (Agente & { id: string; papel: string })[]) ?? [];
    setGestor(ags.find((x) => x.papel === "gestor_shopping") ?? null);
    setSecretario(ags.find((x) => x.papel === "secretario") ?? null);
    const { data: lg } = await sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle();
    setLogo(await carregarLogo((lg?.valor as { url?: string } | null)?.url));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function addRisco(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo) return;
    await sb.from("risco_legal").insert({ titulo: form.titulo, nivel: form.nivel, origem: form.origem || null, base_legal: form.base_legal || null });
    setForm({ titulo: "", nivel: "medio", origem: "", base_legal: "" });
    carregar();
  }
  async function mitigar(id: string) { await sb.from("risco_legal").update({ mitigado: true }).eq("id", id); carregar(); }

  // riscos derivados dos dados
  const derivados = [
    c.falecidos ? { t: `${c.falecidos} banca(s) com titular falecido`, s: "Cassação obrigatória — Parecer 33/2024 · ADI 5.337", n: "critico" } : null,
    c.naoRecad ? { t: `${c.naoRecad} não recadastrado(s)`, s: "Risco de cassação (art. 12, V)", n: "alto" } : null,
    c.cassacao ? { t: `${c.cassacao} banca(s) em cassação`, s: "Procedimentos em curso", n: "alto" } : null,
    c.acp ? { t: `${c.acp} Ação(ões) Civil(is) Pública(s)`, s: "Acompanhamento judicial", n: "alto" } : null,
    c.notif ? { t: `${c.notif} notificação(ões) em aberto`, s: "Prazos a acompanhar", n: "medio" } : null,
    c.infraCritico ? { t: `${c.infraCritico} área(s) de infraestrutura crítica(s)`, s: "Reparos urgentes", n: "alto" } : null,
  ].filter(Boolean) as { t: string; s: string; n: string }[];

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Leitura estratégica consolidada do Shopping Independência.</p>
        <button
          onClick={() => {
            try {
              gerarPanoramaPDF({ c, util, derivados, riscos, gestor, secretario, logo });
            } catch (e) {
              alert("Erro ao gerar PDF: " + (e instanceof Error ? e.message : String(e)));
            }
          }}
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy2"
        >
          Relatório executivo (PDF)
        </button>
      </div>

      <Secao titulo="Ocupação e conformidade das bancas">
        <Grid>
          <Card v={c.ocupada} l="ocupadas" cor="#2E8B57" />
          <Card v={c.vaga} l="vagas" cor="#6E5C82" />
          <Card v={c.aguardando} l="aguardando sorteio" cor="#1F9BD4" />
          <Card v={c.regularizacao} l="em regularização" cor="#C8961E" />
          <Card v={c.cassacao} l="em cassação" cor="#C0392B" />
        </Grid>
      </Secao>

      <Secao titulo="Riscos legais">
        <Grid>
          <Card v={c.falecidos} l="óbitos → cassação" cor="#20242B" />
          <Card v={c.naoRecad} l="não recadastrados" cor="#C8961E" />
          <Card v={c.notif} l="notificações abertas" cor="#C8961E" />
          <Card v={c.pjAtivos} l="processos judiciais ativos" cor="#C0392B" />
          <Card v={c.acp} l="ações civis públicas" cor="#C0392B" />
        </Grid>
        {derivados.length > 0 && (
          <div className="mt-3 grid gap-2">
            {derivados.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3" style={{ borderLeft: `5px solid ${NIVEL_COR[d.n]}` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NIVEL_COR[d.n] }} />
                <div><b className="text-[13.5px] text-navy">{d.t}</b><span className="block text-[12px] text-muted">{d.s}</span></div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
          <form onSubmit={addRisco} className="h-max rounded-2xl border border-line bg-white p-4">
            <h4 className="mb-2 font-bold text-navy">Registrar risco manual</h4>
            <input className="inp" placeholder="Descrição do risco" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="inp" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                <option value="baixo">Baixo</option><option value="medio">Médio</option><option value="alto">Alto</option><option value="critico">Crítico</option>
              </select>
              <input className="inp" placeholder="Origem" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} />
            </div>
            <input className="inp" placeholder="Base legal" value={form.base_legal} onChange={(e) => setForm({ ...form, base_legal: e.target.value })} />
            <button className="w-full rounded-lg bg-accent px-4 py-2 font-bold text-white">Registrar</button>
          </form>
          <div className="grid gap-2">
            {riscos.length === 0 ? <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Sem riscos manuais registrados.</p> :
              riscos.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3" style={{ borderLeft: `5px solid ${NIVEL_COR[r.nivel] ?? "#888"}` }}>
                  <div className="flex-1"><b className="text-[13.5px] text-navy">{r.titulo}</b><span className="block text-[12px] text-muted">{[r.origem, r.base_legal].filter(Boolean).join(" · ")}</span></div>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold capitalize" style={{ background: (NIVEL_COR[r.nivel] ?? "#888") + "22", color: NIVEL_COR[r.nivel] ?? "#888" }}>{r.nivel}</span>
                  <button onClick={() => mitigar(r.id)} className="text-[12px] font-semibold text-ok">mitigar</button>
                </div>
              ))}
          </div>
        </div>
      </Secao>

      <Secao titulo="Infraestrutura do prédio">
        <Grid>
          <Card v={c.infraAtencao} l="áreas em atenção" cor="#C8961E" />
          <Card v={c.infraCritico} l="áreas críticas" cor="#C0392B" />
          <Card v={c.reparos} l="ordens de reparo abertas" cor="#8A2BAE" />
        </Grid>
      </Secao>

      <Secao titulo="Financeiro — utilidades">
        <Grid>
          <Card money v={util.agua} l="água (acumulado)" cor="#1F9BD4" />
          <Card money v={util.energia} l="energia (acumulado)" cor="#C8961E" />
          <Card money v={util.agua + util.energia} l="total utilidades" cor="#3D1A5B" />
          <Card v={util.atraso} l="contas em atraso" cor="#C0392B" />
        </Grid>
      </Secao>

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:8px 10px;font-size:13.5px;background:#fff;margin-bottom:8px;}`}</style>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (<div><h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted">{titulo}</h3>{children}</div>);
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>{children}</div>;
}
function Card({ v, l, cor, money }: { v: number; l: string; cor: string; money?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4" style={{ borderTop: `4px solid ${cor}` }}>
      <b className="block text-2xl font-extrabold" style={{ color: cor }}>{money ? BRL.format(v || 0) : (v ?? 0)}</b>
      <span className="text-[12.5px] text-muted">{l}</span>
    </div>
  );
}
