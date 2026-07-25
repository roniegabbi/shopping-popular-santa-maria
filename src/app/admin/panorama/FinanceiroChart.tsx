"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";

const sb = createSupabase();
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const CORES = ["#3D1A5B", "#8A2BAE", "#F7901E", "#1F9BD4", "#2E8B57", "#C0392B", "#C8961E", "#0E7C7B"];
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlK = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v)}`);

type Conta = { tipo: string; competencia: string; valor: number };
type Serie = "total" | "agua" | "energia";
type AnoSel = number | "todos";

export default function FinanceiroChart() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [serie, setSerie] = useState<Serie>("total");
  const [anoSel, setAnoSel] = useState<AnoSel>("todos");

  useEffect(() => {
    sb.from("conta_utilidade").select("tipo,competencia,valor").then(({ data }) => setContas((data as Conta[]) ?? []));
  }, []);

  // ano -> { agua:[12], energia:[12] }
  const porAno = useMemo(() => {
    const map = new Map<number, { agua: number[]; energia: number[] }>();
    for (const c of contas) {
      const d = new Date(c.competencia);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!map.has(y)) map.set(y, { agua: new Array(12).fill(0), energia: new Array(12).fill(0) });
      const rec = map.get(y)!;
      if (c.tipo === "agua") rec.agua[m] += Number(c.valor || 0);
      else if (c.tipo === "energia") rec.energia[m] += Number(c.valor || 0);
    }
    return map;
  }, [contas]);

  const anos = useMemo(() => [...porAno.keys()].sort(), [porAno]);

  // default: começa no último ano com dados
  useEffect(() => {
    if (anos.length && anoSel === "todos") setAnoSel(anos[anos.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anos.length]);

  const valorMes = (y: number, m: number): number => {
    const r = porAno.get(y);
    if (!r) return 0;
    if (serie === "agua") return r.agua[m];
    if (serie === "energia") return r.energia[m];
    return r.agua[m] + r.energia[m];
  };

  // resumo de um ano na série ativa
  const resumoAno = (y: number) => {
    const vals = MESES.map((_, m) => valorMes(y, m));
    const meses = vals.filter((v) => v > 0).length;
    const total = vals.reduce((s, v) => s + v, 0);
    return { total, meses, media: meses ? total / meses : 0, vals };
  };

  // séries desenhadas: um ano (isolado) ou todos
  const desenho = useMemo(() => {
    const lista = anoSel === "todos" ? anos : [anoSel];
    return lista.map((y) => ({ ano: y, cor: CORES[anos.indexOf(y) % CORES.length], vals: MESES.map((_, m) => valorMes(y, m)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSel, anos, porAno, serie]);

  const max = useMemo(() => Math.max(1, ...desenho.flatMap((d) => d.vals)), [desenho]);

  const W = 720, H = 300, L = 54, R = 16, T = 22, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const px = (i: number) => L + (i / 11) * pw;
  const py = (v: number) => T + ph - (v / max) * ph;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const anoAtivo = typeof anoSel === "number" ? resumoAno(anoSel) : null;
  const anoAnt = typeof anoSel === "number" && anos.includes(anoSel - 1) ? resumoAno(anoSel - 1) : null;
  const variacao = anoAtivo && anoAnt && anoAnt.total > 0 ? ((anoAtivo.total - anoAnt.total) / anoAnt.total) * 100 : null;

  const serieLabel = serie === "total" ? "utilidades" : serie === "agua" ? "água" : "energia";

  if (anos.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Sem lançamentos de utilidades ainda. Registre contas em “Contas (água/energia)” para ver a evolução.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* seletor de série + ano */}
      <div className="flex flex-wrap items-center gap-2">
        {(["total", "agua", "energia"] as Serie[]).map((s) => (
          <button key={s} onClick={() => setSerie(s)}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${serie === s ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"}`}>
            {s === "total" ? "Total" : s === "agua" ? "Água" : "Energia"}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <button onClick={() => setAnoSel("todos")}
          className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${anoSel === "todos" ? "border-brand bg-brand text-white" : "border-line bg-white text-muted"}`}>
          Todos os anos
        </button>
        {anos.map((y) => (
          <button key={y} onClick={() => setAnoSel(y)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold ${anoSel === y ? "text-white" : "border-line bg-white text-muted"}`}
            style={anoSel === y ? { background: CORES[anos.indexOf(y) % CORES.length], borderColor: CORES[anos.indexOf(y) % CORES.length] } : undefined}>
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[anos.indexOf(y) % CORES.length] }} />
            {y}
          </button>
        ))}
      </div>

      {/* cards do recorte selecionado */}
      {anoAtivo ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          <Mini v={BRL.format(anoAtivo.total)} l={`${serieLabel} · total ${anoSel}`} cor="#3D1A5B" />
          <Mini v={BRL.format(anoAtivo.media)} l={`média mensal (${anoAtivo.meses} meses)`} cor="#1F9BD4" />
          <Mini v={BRL.format(anoAtivo.total / 12)} l="por banca/mês (÷12)" cor="#8A2BAE" small />
          <Mini
            v={variacao === null ? "—" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(1)}%`}
            l={anoAnt ? `vs ${(anoSel as number) - 1}` : "sem base anterior"}
            cor={variacao === null ? "#6E5C82" : variacao > 0 ? "#C0392B" : "#2E8B57"}
          />
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          {anos.map((y) => {
            const r = resumoAno(y);
            return (
              <button key={y} onClick={() => setAnoSel(y)} className="rounded-2xl border border-line bg-white p-3 text-left hover:border-brand" style={{ borderTop: `4px solid ${CORES[anos.indexOf(y) % CORES.length]}` }}>
                <b className="block text-lg font-extrabold text-navy">{BRL.format(r.total)}</b>
                <span className="text-[12px] text-muted">{y} · média {brlK(r.media)}/mês</span>
              </button>
            );
          })}
        </div>
      )}

      {/* gráfico */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="mb-2 text-[12.5px] text-muted">
          {anoSel === "todos"
            ? "Comparativo mês a mês entre os anos — clique em um ano acima para isolar a linha."
            : `Ano ${anoSel} · ${serieLabel} — clique em “Todos os anos” para comparar.`}
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução mensal de despesas de utilidades">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={L} y1={py(t)} x2={W - R} y2={py(t)} stroke="#eef" strokeWidth={1} />
              <text x={L - 6} y={py(t) + 3} textAnchor="end" fontSize={10.5} fill="#6E5C82">{brlK(t)}</text>
            </g>
          ))}
          {MESES.map((m, i) => (
            <text key={m} x={px(i)} y={H - 12} textAnchor="middle" fontSize={10.5} fill="#6E5C82">{m}</text>
          ))}
          {desenho.map((d) => {
            const pts = d.vals.map((v, i) => ({ i, v })).filter((p) => p.v > 0);
            const path = pts.map((p, k) => `${k === 0 ? "M" : "L"} ${px(p.i)} ${py(p.v)}`).join(" ");
            const isolado = anoSel !== "todos";
            return (
              <g key={d.ano}>
                <path d={path} fill="none" stroke={d.cor} strokeWidth={isolado ? 3 : 2.2} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p) => (
                  <g key={p.i}>
                    <circle cx={px(p.i)} cy={py(p.v)} r={isolado ? 3.6 : 3} fill={d.cor} />
                    {isolado && <text x={px(p.i)} y={py(p.v) - 8} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={d.cor}>{brlK(p.v)}</text>}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Mini({ v, l, cor, small }: { v: string; l: string; cor: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3" style={{ borderTop: `4px solid ${cor}` }}>
      <b className={`block font-extrabold ${small ? "text-lg" : "text-xl"}`} style={{ color: cor }}>{v}</b>
      <span className="text-[12px] text-muted">{l}</span>
    </div>
  );
}
