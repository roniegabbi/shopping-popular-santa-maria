"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarPanoramaPDF } from "@/lib/panoramaPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";
import type { Agente } from "@/lib/notificacaoPdf";
import FinanceiroChart from "./FinanceiroChart";
import ArrecadacaoChart from "./ArrecadacaoChart";
import SazonalidadeChart from "./SazonalidadeChart";
import { gerarRelatorioSituacoes, type SituacaoSecao } from "@/lib/relatorioSituacoesPdf";

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
  const [totalBancas, setTotalBancas] = useState(0);
  const [util, setUtil] = useState({ agua: 0, energia: 0, atraso: 0 });
  const [custoBanca, setCustoBanca] = useState<{ mensal: number; ano: number | null }>({ mensal: 0, ano: null });
  const [inadKpi, setInadKpi] = useState({ bancas: 0, risco: 0 });
  const [funil, setFunil] = useState<Record<string, number>>({});
  const [topDevedores, setTopDevedores] = useState<{ banca: string; nome: string; cotas: number; total: number }[]>([]);
  const [recad, setRecad] = useState<{ competencia: string; comp: number; tot: number }[]>([]);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [secoes, setSecoes] = useState<SituacaoSecao[]>([]);
  const [form, setForm] = useState({ titulo: "", nivel: "medio", origem: "", base_legal: "" });
  const [aba, setAba] = useState("geral");

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

    const { count: nBancas } = await sb.from("banca").select("*", { count: "exact", head: true });
    setTotalBancas(nBancas ?? 0);

    const { data: contas } = await sb.from("conta_utilidade").select("tipo,competencia,valor,status");
    const cs = (contas as { tipo: string; competencia: string; valor: number; status: string }[]) ?? [];
    setUtil({
      agua: cs.filter((x) => x.tipo === "agua").reduce((s, x) => s + Number(x.valor || 0), 0),
      energia: cs.filter((x) => x.tipo === "energia").reduce((s, x) => s + Number(x.valor || 0), 0),
      atraso: cs.filter((x) => x.status === "em_atraso").length,
    });
    // custo de utilidades por banca ocupada — usa o último ano com lançamentos
    const anosU = [...new Set(cs.map((x) => new Date(x.competencia).getFullYear()))].sort();
    const ultAno = anosU.length ? anosU[anosU.length - 1] : null;
    if (ultAno) {
      const totAno = cs.filter((x) => new Date(x.competencia).getFullYear() === ultAno).reduce((s, x) => s + Number(x.valor || 0), 0);
      const ocup = (bOc.count ?? 0) || 1;
      setCustoBanca({ mensal: totAno / 12 / ocup, ano: ultAno });
    }

    const { data: r } = await sb.from("risco_legal").select("id,titulo,nivel,origem,base_legal,mitigado").eq("mitigado", false).order("created_at", { ascending: false });
    setRiscos((r as Risco[]) ?? []);

    const { data: ag } = await sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true);
    const ags = (ag as (Agente & { id: string; papel: string })[]) ?? [];
    setGestor(ags.find((x) => x.papel === "gestor_shopping") ?? null);
    setSecretario(ags.find((x) => x.papel === "secretario") ?? null);
    const { data: lg } = await sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle();
    setLogo(await carregarLogo((lg?.valor as { url?: string } | null)?.url));

    // listas nominais (quem está em cada situação)
    const { data: perms } = await sb.from("permissionario").select("nome,status,banca(numero)").in("status", ["falecido", "nao_recadastrado", "inadimplente"]);
    const ps = (perms as { nome: string; status: string; banca: { numero: string } | null }[]) ?? [];
    const item = (p: (typeof ps)[number], detalhe?: string) => ({ banca: p.banca?.numero ?? "—", nome: p.nome, detalhe });
    const ordena = (a: { banca: string }, b: { banca: string }) => Number(a.banca) - Number(b.banca);
    const falecidos = ps.filter((p) => p.status === "falecido").map((p) => item(p, "Óbito — cassação obrigatória")).sort(ordena);
    const naoRecad = ps.filter((p) => p.status === "nao_recadastrado").map((p) => item(p)).sort(ordena);

    // nome do permissionário vem da banca (pagamento não guarda permissionario_id)
    const { data: permAll } = await sb.from("permissionario").select("nome,banca_id").not("banca_id", "is", null);
    const nomePorBanca: Record<string, string> = {};
    for (const p of (permAll as { nome: string; banca_id: string }[]) ?? []) nomePorBanca[p.banca_id] = p.nome;

    const { data: pags } = await sb.from("pagamento").select("banca_id,status,taxa,condominio,banca(numero)").in("status", ["em_atraso", "protestado"]);
    const mp = new Map<string, { banca: string; nome: string; cotas: number; total: number }>();
    for (const pg of (pags as { banca_id: string; taxa: number; condominio: number; banca: { numero: string } | null }[]) ?? []) {
      const cur = mp.get(pg.banca_id) ?? { banca: pg.banca?.numero ?? "—", nome: nomePorBanca[pg.banca_id] ?? "—", cotas: 0, total: 0 };
      cur.cotas += 1; cur.total += Number(pg.taxa || 0) + Number(pg.condominio || 0); mp.set(pg.banca_id, cur);
    }
    const grupos = [...mp.values()];
    const inad = grupos.filter((g) => g.cotas > 3).map((g) => ({ banca: g.banca, nome: g.nome, detalhe: `${g.cotas} cotas em atraso` }));
    setInadKpi({ bancas: grupos.length, risco: grupos.reduce((s, g) => s + g.total, 0) });
    setTopDevedores([...grupos].sort((a, b) => b.total - a.total).slice(0, 10));

    setSecoes([
      { titulo: "Titulares falecidos (óbito → cassação)", base: "Parecer 33/2024 · ADI 5.337", itens: falecidos },
      { titulo: "Recadastramento em atraso", base: "Art. 12, V do Decreto", itens: naoRecad },
      { titulo: "Inadimplentes acima de 3 cotas", base: "Art. 14, §3º do Decreto", itens: inad },
    ]);

    // funil de cassação — etapas dos processos abertos no módulo Cassações
    const { data: procs } = await sb.from("processo").select("status").eq("tipo", "cassacao");
    const f: Record<string, number> = {};
    for (const pr of (procs as { status: string }[]) ?? []) f[pr.status] = (f[pr.status] ?? 0) + 1;
    setFunil(f);

    // comparecimento no recadastramento por semestre
    const { data: recs } = await sb.from("recadastramento").select("competencia,compareceu");
    const rm = new Map<string, { comp: number; tot: number }>();
    for (const rr of (recs as { competencia: string; compareceu: boolean }[]) ?? []) {
      const cur = rm.get(rr.competencia) ?? { comp: 0, tot: 0 };
      cur.tot += 1; if (rr.compareceu) cur.comp += 1; rm.set(rr.competencia, cur);
    }
    setRecad([...rm.entries()].map(([competencia, v]) => ({ competencia, ...v })).sort((a, b) => a.competencia.localeCompare(b.competencia)));
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

  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  const taxaOcup = pct(c.ocupada ?? 0, totalBancas);
  const idxInad = pct(inadKpi.bancas, totalBancas);
  const ultRecad = recad.length ? recad[recad.length - 1] : null;
  const recadPct = ultRecad ? pct(ultRecad.comp, ultRecad.tot) : null;
  const ETAPAS_CASS: [string, string, string][] = [
    ["aberto", "Aberto", "#C8961E"], ["contraditorio", "Contraditório", "#1F9BD4"],
    ["decidido", "Decidido", "#3D1A5B"], ["desocupacao", "Desocupação", "#C55A11"], ["encerrado", "Encerrado", "#2E8B57"],
  ];
  const totProc = Object.values(funil).reduce((s, v) => s + v, 0);

  const ABAS: [string, string][] = [
    ["geral", "Visão geral"], ["financeiro", "Financeiro"], ["conformidade", "Conformidade"], ["riscos", "Riscos e cassação"],
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Leitura estratégica consolidada do Shopping Independência.</p>
        <button
          onClick={() => {
            try { gerarPanoramaPDF({ c, util, derivados, riscos, gestor, secretario, logo }); }
            catch (e) { alert("Erro ao gerar PDF: " + (e instanceof Error ? e.message : String(e))); }
          }}
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy2"
        >
          Relatório executivo (PDF)
        </button>
      </div>

      {/* faixa de indicadores compactos */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(116px,1fr))" }}>
        <MiniKpi l="Ocupação" v={`${taxaOcup.toFixed(1)}%`} sub={`${c.ocupada ?? 0}/${totalBancas}`} cor="#2E8B57" />
        <MiniKpi l="Inadimplência" v={`${idxInad.toFixed(1)}%`} sub={`${inadKpi.bancas} bancas`} cor="#C0392B" />
        <MiniKpi l="Em risco" v={BRL.format(inadKpi.risco)} sub="a recuperar" cor="#20242B" />
        <MiniKpi l="Custo/banca·mês" v={BRL.format(custoBanca.mensal)} sub={custoBanca.ano ? `utilidades ${custoBanca.ano}` : "—"} cor="#8A2BAE" />
        <MiniKpi l="Em cassação" v={String(c.cassacao ?? 0)} sub="bancas" cor="#C8961E" />
        <MiniKpi l="Óbitos" v={String(c.falecidos ?? 0)} sub="cassação" cor="#20242B" />
        <MiniKpi l="Recadastro" v={recadPct !== null ? `${recadPct.toFixed(1)}%` : "—"} sub={ultRecad ? ultRecad.competencia : "sem registro"} cor="#1F9BD4" />
      </div>

      {/* abas */}
      <div className="flex flex-wrap gap-1.5 border-b border-line pb-2">
        {ABAS.map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${aba === k ? "bg-navy text-white" : "text-muted hover:bg-[#F1EAF8] hover:text-navy"}`}>
            {l}
          </button>
        ))}
      </div>

      {aba === "geral" && (
        <div className="grid gap-6">
          <Secao titulo="Alertas prioritários">
            {derivados.length === 0 ? (
              <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">Nenhum alerta no momento.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {derivados.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3" style={{ borderLeft: `5px solid ${NIVEL_COR[d.n]}` }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: NIVEL_COR[d.n] }} />
                    <div><b className="text-[13.5px] text-navy">{d.t}</b><span className="block text-[12px] text-muted">{d.s}</span></div>
                  </div>
                ))}
              </div>
            )}
          </Secao>

          <div className="grid gap-6 lg:grid-cols-2">
            <Secao titulo="Ocupação das bancas">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Card v={c.ocupada} l="ocupadas" cor="#2E8B57" />
                <Card v={c.vaga} l="vagas" cor="#6E5C82" />
                <Card v={c.aguardando} l="aguardando" cor="#1F9BD4" />
                <Card v={c.regularizacao} l="regularização" cor="#C8961E" />
                <Card v={c.cassacao} l="em cassação" cor="#C0392B" />
              </div>
            </Secao>
            <Secao titulo="Maiores devedores">
              {topDevedores.length === 0 ? (
                <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">Nenhuma inadimplência.</p>
              ) : (
                <div className="rounded-2xl border border-line bg-white p-4">
                  <div className="grid gap-1.5 text-[12.5px]">
                    {topDevedores.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 border-b border-line pb-1.5 last:border-0 last:pb-0">
                        <span className="truncate text-muted"><b className="text-navy">{i + 1}º Banca {d.banca}</b> · {d.nome}</span>
                        <span className="shrink-0 font-bold text-bad">{BRL.format(d.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Secao>
          </div>
        </div>
      )}

      {aba === "financeiro" && (
        <div className="grid gap-6">
          <Secao titulo="Financeiro — utilidades (água / energia)">
            <p className="mb-3 text-[12.5px] text-muted">
              Selecione o ano para ver total, média mensal e variação. Clique num ano do gráfico para isolar a linha daquele ano.
              {util.atraso > 0 && <span className="ml-1 font-semibold text-bad">· {util.atraso} conta(s) em atraso.</span>}
            </p>
            <FinanceiroChart />
          </Secao>

          <Secao titulo="Sazonalidade — média histórica de despesa por mês">
            <SazonalidadeChart />
          </Secao>

          <Secao titulo="Arrecadação × inadimplência (Repasses CPC 2020–2024)">
            <ArrecadacaoChart />
          </Secao>

          <Secao titulo="Maiores devedores (Top 10)">
            {topDevedores.length === 0 ? (
              <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma inadimplência registrada.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-navy text-left text-xs text-white">
                      <th className="p-3">#</th><th className="p-3">Banca</th><th className="p-3">Permissionário</th><th className="p-3">Cotas</th><th className="p-3">Total devido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDevedores.map((d, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="p-3 font-bold text-muted">{i + 1}º</td>
                        <td className="p-3 font-bold text-navy">Banca {d.banca}</td>
                        <td className="p-3">{d.nome}</td>
                        <td className="p-3">{d.cotas}{d.cotas > 3 && <span className="ml-1 rounded bg-[#20242B] px-1.5 py-0.5 text-[10px] font-bold text-white">cassação</span>}</td>
                        <td className="p-3 font-bold text-bad">{BRL.format(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>
        </div>
      )}

      {aba === "conformidade" && (
        <div className="grid gap-6">
          <Secao titulo="Ocupação e conformidade das bancas">
            <Grid>
              <Card v={c.ocupada} l="ocupadas" cor="#2E8B57" />
              <Card v={c.vaga} l="vagas" cor="#6E5C82" />
              <Card v={c.aguardando} l="aguardando sorteio" cor="#1F9BD4" />
              <Card v={c.regularizacao} l="em regularização" cor="#C8961E" />
              <Card v={c.cassacao} l="em cassação" cor="#C0392B" />
            </Grid>
          </Secao>

          <Secao titulo="Situações por permissionário (nominal)">
            <div className="mb-3">
              <button
                onClick={() => {
                  try { gerarRelatorioSituacoes({ secoes, gestor, secretario, logo }); }
                  catch (e) { alert("Erro ao gerar PDF: " + (e instanceof Error ? e.message : String(e))); }
                }}
                className="rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy2"
              >
                Relatório nominal (PDF)
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {secoes.map((s) => (
                <div key={s.titulo} className="rounded-2xl border border-line bg-white p-4">
                  <b className="text-[14px] text-navy">{s.titulo} ({s.itens.length})</b>
                  {s.base && <span className="mb-1 block text-[11.5px] text-muted">{s.base}</span>}
                  <ul className="mt-2 grid max-h-64 gap-1 overflow-auto text-[13px]">
                    {s.itens.length === 0 ? (
                      <li className="text-muted">Nenhum registro.</li>
                    ) : (
                      s.itens.map((it, i) => (
                        <li key={i} className="border-b border-line pb-1"><b className="text-navy">Banca {it.banca}</b> — {it.nome}</li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Comparecimento no recadastramento (por semestre)">
            {recad.length === 0 ? (
              <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Sem registros de recadastramento.</p>
            ) : (
              <div className="grid gap-2.5 rounded-2xl border border-line bg-white p-5">
                {recad.map((rr) => {
                  const p = rr.tot > 0 ? (rr.comp / rr.tot) * 100 : 0;
                  const cor = p >= 80 ? "#2E8B57" : p >= 60 ? "#C8961E" : "#C0392B";
                  const [ano, sem] = rr.competencia.split("-");
                  return (
                    <div key={rr.competencia} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[13px] font-bold text-navy">{sem}º sem. {ano}</span>
                      <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#eef]">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: cor }} />
                      </div>
                      <span className="w-36 shrink-0 text-right text-[12.5px] text-muted"><b style={{ color: cor }}>{p.toFixed(1)}%</b> ({rr.comp}/{rr.tot})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Secao>

          <Secao titulo="Infraestrutura do prédio">
            <Grid>
              <Card v={c.infraAtencao} l="áreas em atenção" cor="#C8961E" />
              <Card v={c.infraCritico} l="áreas críticas" cor="#C0392B" />
              <Card v={c.reparos} l="ordens de reparo abertas" cor="#8A2BAE" />
            </Grid>
          </Secao>
        </div>
      )}

      {aba === "riscos" && (
        <div className="grid gap-6">
          <Secao titulo="Riscos legais">
            <Grid>
              <Card v={c.falecidos} l="óbitos → cassação" cor="#20242B" />
              <Card v={c.naoRecad} l="não recadastrados" cor="#C8961E" />
              <Card v={c.notif} l="notificações abertas" cor="#C8961E" />
              <Card v={c.pjAtivos} l="processos judiciais ativos" cor="#C0392B" />
              <Card v={c.acp} l="ações civis públicas" cor="#C0392B" />
            </Grid>
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
                  riscos.map((rl) => (
                    <div key={rl.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3" style={{ borderLeft: `5px solid ${NIVEL_COR[rl.nivel] ?? "#888"}` }}>
                      <div className="flex-1"><b className="text-[13.5px] text-navy">{rl.titulo}</b><span className="block text-[12px] text-muted">{[rl.origem, rl.base_legal].filter(Boolean).join(" · ")}</span></div>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold capitalize" style={{ background: (NIVEL_COR[rl.nivel] ?? "#888") + "22", color: NIVEL_COR[rl.nivel] ?? "#888" }}>{rl.nivel}</span>
                      <button onClick={() => mitigar(rl.id)} className="text-[12px] font-semibold text-ok">mitigar</button>
                    </div>
                  ))}
              </div>
            </div>
          </Secao>

          <Secao titulo="Funil de cassação (art. 18)">
            {totProc === 0 ? (
              <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-4 text-[13px] text-[#9a4a12]">
                Nenhum processo de cassação aberto ainda. Há <b>{c.cassacao ?? 0} banca(s)</b> marcada(s) como “em cassação” — abra os
                procedimentos no módulo <b>Cassações</b> para acompanhar o andamento por etapa aqui.
              </p>
            ) : (
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
                {ETAPAS_CASS.map(([k, label, cor]) => (
                  <div key={k} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeft: `6px solid ${cor}` }}>
                    <b className="block text-3xl font-extrabold" style={{ color: cor }}>{funil[k] ?? 0}</b>
                    <span className="text-[12.5px] text-muted">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </Secao>
        </div>
      )}

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
function MiniKpi({ v, l, sub, cor }: { v: string; l: string; sub?: string; cor: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
      <span className="block text-[10.5px] text-muted">{l}</span>
      <b className="block text-[19px] font-extrabold leading-tight" style={{ color: cor }}>{v}</b>
      {sub && <span className="block text-[10px] text-muted">{sub}</span>}
    </div>
  );
}
