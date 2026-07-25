"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";

const sb = createSupabase();
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const brlK = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v)}`);

type Conta = { tipo: string; competencia: string; valor: number };
type Serie = "total" | "agua" | "energia";
const CORSERIE: Record<Serie, string> = { total: "#3D1A5B", agua: "#1F9BD4", energia: "#C8961E" };

export default function SazonalidadeChart() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [serie, setSerie] = useState<Serie>("total");

  useEffect(() => {
    sb.from("conta_utilidade").select("tipo,competencia,valor").then(({ data }) => setContas((data as Conta[]) ?? []));
  }, []);

  // média histórica por mês: soma do mês / nº de anos que tiveram lançamento nesse mês
  const { medias, max, picoMes } = useMemo(() => {
    const soma = new Array(12).fill(0);
    const anosPorMes: Array<Set<number>> = Array.from({ length: 12 }, () => new Set());
    for (const c of contas) {
      if (serie === "agua" && c.tipo !== "agua") continue;
      if (serie === "energia" && c.tipo !== "energia") continue;
      const d = new Date(c.competencia);
      const m = d.getMonth();
      soma[m] += Number(c.valor || 0);
      anosPorMes[m].add(d.getFullYear());
    }
    const medias = soma.map((s, m) => (anosPorMes[m].size ? s / anosPorMes[m].size : 0));
    const max = Math.max(1, ...medias);
    const picoMes = medias.indexOf(Math.max(...medias));
    return { medias, max, picoMes };
  }, [contas, serie]);

  const temDados = medias.some((v) => v > 0);

  const W = 720, H = 240, L = 52, R = 14, T = 16, B = 30;
  const pw = W - L - R, ph = H - T - B;
  const bw = (pw / 12) * 0.62;
  const bx = (i: number) => L + (i / 12) * pw + (pw / 12 - bw) / 2;
  const by = (v: number) => T + ph - (v / max) * ph;
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["total", "agua", "energia"] as Serie[]).map((s) => (
          <button key={s} onClick={() => setSerie(s)}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${serie === s ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"}`}>
            {s === "total" ? "Total" : s === "agua" ? "Água" : "Energia"}
          </button>
        ))}
        {temDados && (
          <span className="ml-auto text-[12px] text-muted">
            Mês de pico: <b className="text-navy">{MESES[picoMes]}</b> · {brlK(medias[picoMes])}/mês (média histórica)
          </span>
        )}
      </div>

      {!temDados ? (
        <p className="text-sm text-muted">Sem lançamentos de utilidades para calcular a sazonalidade.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Média histórica de despesas por mês">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={L} y1={by(t)} x2={W - R} y2={by(t)} stroke="#eef" strokeWidth={1} />
              <text x={L - 6} y={by(t) + 3} textAnchor="end" fontSize={10.5} fill="#6E5C82">{brlK(t)}</text>
            </g>
          ))}
          {medias.map((v, i) => (
            <g key={i}>
              <rect x={bx(i)} y={by(v)} width={bw} height={T + ph - by(v)} rx={3}
                fill={i === picoMes ? "#C0392B" : CORSERIE[serie]} opacity={i === picoMes ? 1 : 0.85} />
              <text x={bx(i) + bw / 2} y={H - 12} textAnchor="middle" fontSize={10.5} fill="#6E5C82">{MESES[i]}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
