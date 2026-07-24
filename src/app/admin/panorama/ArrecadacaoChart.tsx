"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";

const sb = createSupabase();
const brl = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${Math.round(v)}`);
const MESABR = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Rep = { competencia: string; ano: number; mes: number; valor_cobrado: number; valor_recebido: number; inadimplencia: number; inadimplencia_pct: number };

export default function ArrecadacaoChart() {
  const [dados, setDados] = useState<Rep[]>([]);

  useEffect(() => {
    sb.from("repasse_mensal")
      .select("competencia,ano,mes,valor_cobrado,valor_recebido,inadimplencia,inadimplencia_pct")
      .order("competencia", { ascending: true })
      .then(({ data }) => setDados((data as Rep[]) ?? []));
  }, []);

  const { W, H, L, T, ph, pw, max, px, py, ticks, series, ultimo } = useMemo(() => {
    const W = 760, H = 320, L = 52, R = 14, T = 16, B = 44;
    const pw = W - L - R, ph = H - T - B;
    const n = Math.max(dados.length, 1);
    const max = Math.max(1, ...dados.map((d) => Number(d.valor_cobrado || 0)));
    const px = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * pw);
    const py = (v: number) => T + ph - (v / max) * ph;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
    const series = [
      { key: "valor_cobrado", label: "Cobrado", cor: "#3D1A5B" },
      { key: "valor_recebido", label: "Recebido", cor: "#2E8B57" },
      { key: "inadimplencia", label: "Inadimplência", cor: "#E6188D" },
    ] as const;
    const ultimo = dados[dados.length - 1];
    return { W, H, L, T, ph, pw, max, px, py, ticks, series, ultimo };
  }, [dados]);

  if (dados.length === 0) {
    return <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Sem série de repasses.</div>;
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <i className="h-2.5 w-4 rounded" style={{ background: s.cor }} />
            {s.label}
          </span>
        ))}
        {ultimo && (
          <span className="ml-auto text-[12.5px] text-muted">
            Último ({MESABR[ultimo.mes]}/{ultimo.ano}): inadimplência{" "}
            <b className="text-bad">{(Number(ultimo.inadimplencia_pct || 0) * 100).toFixed(1)}%</b>
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Arrecadação mensal: cobrado, recebido e inadimplência">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} y1={py(t)} x2={W - 14} y2={py(t)} stroke="#eef" strokeWidth={1} />
            <text x={L - 6} y={py(t) + 3} textAnchor="end" fontSize={10.5} fill="#6E5C82">{brl(t)}</text>
          </g>
        ))}
        {dados.map((d, i) =>
          d.mes === 1 ? (
            <text key={d.competencia} x={px(i)} y={H - 24} textAnchor="middle" fontSize={10.5} fill="#6E5C82">{d.ano}</text>
          ) : null
        )}
        {series.map((s) => {
          const path = dados
            .map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(Number(d[s.key] || 0))}`)
            .join(" ");
          return <path key={s.key} d={path} fill="none" stroke={s.cor} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />;
        })}
      </svg>
    </div>
  );
}
