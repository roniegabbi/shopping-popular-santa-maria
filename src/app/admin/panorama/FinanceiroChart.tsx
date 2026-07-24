"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";

const sb = createSupabase();
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const CORES = ["#3D1A5B", "#8A2BAE", "#F7901E", "#1F9BD4", "#2E8B57", "#C0392B", "#C8961E"];
const brl = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v)}`);

type Conta = { tipo: string; competencia: string; valor: number };
type Serie = "total" | "agua" | "energia";

export default function FinanceiroChart() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [serie, setSerie] = useState<Serie>("total");

  useEffect(() => {
    sb.from("conta_utilidade").select("tipo,competencia,valor").then(({ data }) => setContas((data as Conta[]) ?? []));
  }, []);

  // anos -> [12] valores
  const { anos, dados, max } = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const c of contas) {
      if (serie === "agua" && c.tipo !== "agua") continue;
      if (serie === "energia" && c.tipo !== "energia") continue;
      const d = new Date(c.competencia);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!map.has(y)) map.set(y, new Array(12).fill(0));
      map.get(y)![m] += Number(c.valor || 0);
    }
    const anos = [...map.keys()].sort();
    const dados = anos.map((y) => ({ ano: y, valores: map.get(y)! }));
    const max = Math.max(1, ...dados.flatMap((d) => d.valores));
    return { anos, dados, max };
  }, [contas, serie]);

  const W = 720, H = 300, L = 52, R = 14, T = 16, B = 36;
  const pw = W - L - R, ph = H - T - B;
  const px = (i: number) => L + (i / 11) * pw;
  const py = (v: number) => T + ph - (v / max) * ph;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  if (dados.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Sem lançamentos de utilidades ainda. Registre contas de água/energia em “Contas (água/energia)” para ver a evolução.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["total", "agua", "energia"] as Serie[]).map((s) => (
          <button
            key={s}
            onClick={() => setSerie(s)}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${serie === s ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"}`}
          >
            {s === "total" ? "Total" : s === "agua" ? "Água" : "Energia"}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-3">
          {dados.map((d, i) => (
            <span key={d.ano} className="inline-flex items-center gap-1.5 text-[12px] text-muted">
              <i className="h-2.5 w-4 rounded" style={{ background: CORES[i % CORES.length] }} />
              {d.ano}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução mensal de despesas de utilidades">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} y1={py(t)} x2={W - R} y2={py(t)} stroke="#eef" strokeWidth={1} />
            <text x={L - 6} y={py(t) + 3} textAnchor="end" fontSize={10.5} fill="#6E5C82">{brl(t)}</text>
          </g>
        ))}
        {MESES.map((m, i) => (
          <text key={m} x={px(i)} y={H - 14} textAnchor="middle" fontSize={10.5} fill="#6E5C82">{m}</text>
        ))}
        {dados.map((d, di) => {
          const cor = CORES[di % CORES.length];
          const pts = d.valores.map((v, i) => ({ i, v })).filter((p) => p.v > 0);
          const path = pts.map((p, k) => `${k === 0 ? "M" : "L"} ${px(p.i)} ${py(p.v)}`).join(" ");
          return (
            <g key={d.ano}>
              <path d={path} fill="none" stroke={cor} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p) => <circle key={p.i} cx={px(p.i)} cy={py(p.v)} r={3} fill={cor} />)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
