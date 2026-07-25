"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";

const sb = createSupabase();

type Dados = {
  total: number; ocupada: number; emCassacao: number; falecidos: number; naoRecad: number;
  inadBancas: number; recadPct: number | null; conselho: number; gestor: number; secretario: number;
  atasPub: number; sorteios: number; infraAreas: number; infraCriticas: number; procCassacao: number;
};

const FAIXAS = [
  { min: 0, label: "Inicial", cor: "#C0392B" },
  { min: 25, label: "Em estruturação", cor: "#C55A11" },
  { min: 45, label: "Em consolidação", cor: "#C8961E" },
  { min: 65, label: "Consolidado", cor: "#1F9BD4" },
  { min: 82, label: "Referência", cor: "#2E8B57" },
];
const nivel = (s: number) => [...FAIXAS].reverse().find((f) => s >= f.min) ?? FAIXAS[0];

export default function MaturidadeIndex() {
  const [d, setD] = useState<Dados | null>(null);

  useEffect(() => {
    (async () => {
      const cnt = (t: string, col?: string, val?: string) => {
        let q = sb.from(t).select("*", { count: "exact", head: true });
        if (col && val) q = q.eq(col, val);
        return q;
      };
      const [tot, ocu, cas, fal, nrec, cons, ges, sec, sor, iar, icr, pcas] = await Promise.all([
        cnt("banca"), cnt("banca", "status", "ocupada"), cnt("banca", "status", "em_cassacao"),
        cnt("permissionario", "status", "falecido"), cnt("permissionario", "status", "nao_recadastrado"),
        cnt("conselho_gestor"),
        sb.from("agente_publico").select("*", { count: "exact", head: true }).eq("ativo", true).eq("papel", "gestor_shopping"),
        sb.from("agente_publico").select("*", { count: "exact", head: true }).eq("ativo", true).eq("papel", "secretario"),
        cnt("sorteio"),
        cnt("infraestrutura_area"), cnt("infraestrutura_area", "status", "critico"),
        sb.from("processo").select("*", { count: "exact", head: true }).eq("tipo", "cassacao"),
      ]);
      const { data: atasP } = await sb.from("ata").select("id").eq("publico", true);
      const { data: pags } = await sb.from("pagamento").select("banca_id").in("status", ["em_atraso", "protestado"]);
      const inadBancas = new Set(((pags as { banca_id: string }[]) ?? []).map((p) => p.banca_id)).size;
      const { data: recs } = await sb.from("recadastramento").select("competencia,compareceu");
      const rm = new Map<string, { c: number; t: number }>();
      for (const r of (recs as { competencia: string; compareceu: boolean }[]) ?? []) {
        const cur = rm.get(r.competencia) ?? { c: 0, t: 0 }; cur.t++; if (r.compareceu) cur.c++; rm.set(r.competencia, cur);
      }
      const ult = [...rm.entries()].sort((a, b) => a[0].localeCompare(b[0])).pop();
      const recadPct = ult ? (100 * ult[1].c) / ult[1].t : null;

      setD({
        total: tot.count ?? 0, ocupada: ocu.count ?? 0, emCassacao: cas.count ?? 0,
        falecidos: fal.count ?? 0, naoRecad: nrec.count ?? 0, inadBancas,
        recadPct, conselho: cons.count ?? 0, gestor: ges.count ?? 0, secretario: sec.count ?? 0,
        atasPub: (atasP ?? []).length, sorteios: sor.count ?? 0,
        infraAreas: iar.count ?? 0, infraCriticas: icr.count ?? 0, procCassacao: pcas.count ?? 0,
      });
    })();
  }, []);

  const dims = useMemo(() => {
    if (!d) return [];
    const cap = (n: number) => Math.max(0, Math.min(100, n));
    const pct = (n: number, den: number) => (den > 0 ? (n / den) * 100 : 0);
    const casosCassacao = d.emCassacao + d.falecidos;
    return [
      { k: "ocupacao", l: "Regularização da ocupação", base: "art. 5º e 6º", peso: 20,
        score: cap(pct(d.ocupada, d.total)),
        nota: `${d.ocupada}/${d.total} bancas ocupadas` },
      { k: "cassacao", l: "Tratamento de óbitos → cassação", base: "art. 18 e 19", peso: 20,
        score: cap(pct(d.procCassacao, casosCassacao || 1)),
        nota: `${d.procCassacao} processo(s) para ${casosCassacao} caso(s)` },
      { k: "recad", l: "Cadastro e recadastramento", base: "art. 12", peso: 15,
        score: cap(d.recadPct ?? 0),
        nota: d.recadPct !== null ? `${d.recadPct.toFixed(1)}% no último semestre` : "sem registro" },
      { k: "adimplencia", l: "Adimplência financeira", base: "art. 14", peso: 15,
        score: cap(100 - pct(d.inadBancas, d.total)),
        nota: `${d.inadBancas} banca(s) inadimplente(s)` },
      { k: "governanca", l: "Governança e Conselho Gestor", base: "conselho e portarias", peso: 15,
        score: cap(((d.conselho > 0 ? 100 : 0) + (d.gestor > 0 ? 100 : 0) + (d.secretario > 0 ? 100 : 0)) / 3),
        nota: `${d.conselho > 0 ? "conselho ok" : "sem conselho"} · ${d.gestor > 0 ? "gestor ok" : "sem gestor"} · ${d.secretario > 0 ? "secretário ok" : "sem secretário"}` },
      { k: "transparencia", l: "Transparência e atos", base: "editais e atas", peso: 10,
        score: cap(((d.sorteios > 0 ? 100 : 0) + (d.atasPub > 0 ? 100 : 0)) / 2),
        nota: `${d.sorteios} edital(is) · ${d.atasPub} ata(s) pública(s)` },
      { k: "infra", l: "Infraestrutura predial", base: "conservação", peso: 5,
        score: cap(d.infraAreas > 0 ? 100 - pct(d.infraCriticas, d.infraAreas) : 100),
        nota: `${d.infraCriticas} área(s) crítica(s) de ${d.infraAreas}` },
    ];
  }, [d]);

  const score = useMemo(() => Math.round(dims.reduce((s, x) => s + x.score * x.peso, 0) / 100), [dims]);
  const nv = nivel(score);

  if (!d) return <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Calculando índice de maturidade…</div>;

  const gargalos = [...dims].filter((x) => x.score < 60).sort((a, b) => a.score * a.peso - b.score * b.peso).slice(0, 3);

  // termômetro
  const H = 210, topY = 18, botY = 176, tubX = 34, tubW = 22;
  const fillTop = botY - (score / 100) * (botY - topY);

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 rounded-2xl border border-line bg-white p-5 md:grid-cols-[220px_1fr]">
        <div className="flex items-center gap-4">
          <svg viewBox={`0 0 120 ${H}`} width="120" height={H} role="img" aria-label={`Termômetro de maturidade: ${score} de 100`}>
            {[0, 25, 50, 75, 100].map((t) => {
              const y = botY - (t / 100) * (botY - topY);
              return (<g key={t}><line x1={tubX + tubW + 6} y1={y} x2={tubX + tubW + 12} y2={y} stroke="#c9c2d6" strokeWidth={1} /><text x={tubX + tubW + 16} y={y + 3} fontSize={9.5} fill="#6E5C82">{t}</text></g>);
            })}
            <rect x={tubX} y={topY} width={tubW} height={botY - topY} rx={tubW / 2} fill="#eee7f5" stroke="#d9cfe8" />
            <rect x={tubX} y={fillTop} width={tubW} height={botY - fillTop} rx={tubW / 2} fill={nv.cor} />
            <circle cx={tubX + tubW / 2} cy={botY + 16} r={20} fill={nv.cor} />
            <rect x={tubX + tubW / 2 - 6} y={botY - 4} width={12} height={20} fill={nv.cor} />
          </svg>
          <div>
            <b className="block text-4xl font-extrabold" style={{ color: nv.cor }}>{score}</b>
            <span className="text-[12px] text-muted">de 100</span>
            <span className="mt-1 block rounded-full px-2.5 py-1 text-center text-[12px] font-bold" style={{ background: nv.cor + "22", color: nv.cor }}>{nv.label}</span>
          </div>
        </div>

        <div>
          <h4 className="mb-1 font-bold text-navy">Índice de Maturidade — Shopping Independência</h4>
          <p className="text-[12.5px] text-muted">Média ponderada de 7 dimensões de gestão e conformidade legal (Decreto de Normas de Funcionamento), calculada a partir dos dados vigentes.</p>
          {gargalos.length > 0 && (
            <div className="mt-3">
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted">Prioridades para evoluir</span>
              <div className="mt-1.5 grid gap-1.5">
                {gargalos.map((g) => (
                  <div key={g.k} className="flex items-center gap-2 rounded-lg border border-line p-2" style={{ borderLeft: `4px solid ${nivel(g.score).cor}` }}>
                    <b className="text-[12.5px] text-navy">{g.l}</b>
                    <span className="text-[11.5px] text-muted">{g.nota}</span>
                    <span className="ml-auto text-[12px] font-bold" style={{ color: nivel(g.score).cor }}>{Math.round(g.score)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2.5">
        {dims.map((x) => {
          const cor = nivel(x.score).cor;
          return (
            <div key={x.k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-white p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <b className="text-[13.5px] text-navy">{x.l}</b>
                <span className="text-[11px] text-muted">{x.base} · peso {x.peso}%</span>
              </div>
              <b className="text-right text-[15px] font-extrabold" style={{ color: cor }}>{Math.round(x.score)}</b>
              <div className="col-span-2 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eef]">
                  <div className="h-full rounded-full" style={{ width: `${x.score}%`, background: cor }} />
                </div>
                <span className="w-max shrink-0 text-[11.5px] text-muted">{x.nota}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
