"use client";

type Ponto = { data: string; media: number; rotulo: string };

const cor = (v: number) => (v <= 2 ? "#C0392B" : v < 3 ? "#E07B39" : v < 4 ? "#C8961E" : "#2E8B57");
const dt = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export default function VistoriaChart({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length < 2) {
    return <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">Registre ao menos duas vistorias avaliadas para ver a tendência.</p>;
  }
  const W = 720, H = 240, L = 34, R = 14, T = 16, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const n = pontos.length;
  const px = (i: number) => L + (i / (n - 1)) * pw;
  const py = (v: number) => T + ph - ((v - 1) / 4) * ph;
  const path = pontos.map((p, i) => `${i ? "L" : "M"} ${px(i)} ${py(p.media)}`).join(" ");
  const delta = pontos[n - 1].media - pontos[0].media;
  const trend = delta > 0.1 ? "melhorando" : delta < -0.1 ? "piorando" : "estável";
  const trendCor = delta > 0.1 ? "#2E8B57" : delta < -0.1 ? "#C0392B" : "#6E5C82";
  const passo = n > 9 ? Math.ceil(n / 9) : 1;

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-navy">Evolução das médias de vistoria (1 a 5)</span>
        <span className="text-[12.5px] font-bold" style={{ color: trendCor }}>
          Tendência: {trend} ({delta >= 0 ? "+" : ""}{delta.toFixed(1)})
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico da evolução das médias de vistoria">
        {[1, 2, 3, 4, 5].map((t) => (
          <g key={t}>
            <line x1={L} y1={py(t)} x2={W - R} y2={py(t)} stroke="#eef" strokeWidth={1} />
            <text x={L - 5} y={py(t) + 3} textAnchor="end" fontSize={10} fill="#6E5C82">{t}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#8A2BAE" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(p.media)} r={3.4} fill={cor(p.media)} />
            {i % passo === 0 && <text x={px(i)} y={H - 12} textAnchor="middle" fontSize={9.5} fill="#6E5C82">{dt(p.data)}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
