"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();

const SIT: Record<string, { l: string; c: string }> = {
  ocupada: { l: "Ocupada", c: "#2E8B57" },
  vaga: { l: "Vaga", c: "#6E5C82" },
  aguardando_sorteio: { l: "Aguardando sorteio", c: "#1F9BD4" },
  em_regularizacao: { l: "Em regularização", c: "#C8961E" },
  em_cassacao: { l: "Em cassação", c: "#C0392B" },
};
const sitInfo = (s: string) => SIT[s] ?? { l: s, c: "#888" };

type Banca = { id: string; numero: string; status: string; segmento: { nome: string } | null };

export default function MapaPage() {
  return (
    <AdminGuard active="mapa" title="Painel Bancas">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [titular, setTitular] = useState<Record<string, string>>({});
  const [aux, setAux] = useState<Record<string, string>>({});
  const [seg, setSeg] = useState<string>("todos");
  const [sit, setSit] = useState<string>("todas");
  const [q, setQ] = useState("");

  const carregar = useCallback(async () => {
    const { data: bs } = await sb.from("banca").select("id,numero,status,segmento(nome)");
    const rows = ((bs as unknown as Banca[]) ?? []).sort((a, b) => Number(a.numero) - Number(b.numero));
    setBancas(rows);
    const { data: perms } = await sb.from("permissionario").select("nome,banca_id").not("banca_id", "is", null);
    const tp: Record<string, string> = {};
    for (const p of (perms as { nome: string; banca_id: string }[]) ?? []) tp[p.banca_id] = p.nome;
    setTitular(tp);
    const { data: auxs } = await sb.from("auxiliar").select("nome,banca_id").not("banca_id", "is", null);
    const ap: Record<string, string> = {};
    for (const a of (auxs as { nome: string; banca_id: string }[]) ?? []) if (!ap[a.banca_id]) ap[a.banca_id] = a.nome;
    setAux(ap);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const segmentos = useMemo(() => {
    const s = new Set<string>();
    for (const b of bancas) if (b.segmento?.nome) s.add(b.segmento.nome);
    return [...s].sort();
  }, [bancas]);

  const contagem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bancas) m[b.status] = (m[b.status] ?? 0) + 1;
    return m;
  }, [bancas]);

  const filtradas = useMemo(() => bancas.filter((b) => {
    if (seg !== "todos" && b.segmento?.nome !== seg) return false;
    if (sit !== "todas" && b.status !== sit) return false;
    if (q) {
      const t = q.toLowerCase();
      if (!(b.numero.includes(q) || (titular[b.id] ?? "").toLowerCase().includes(t) || (aux[b.id] ?? "").toLowerCase().includes(t))) return false;
    }
    return true;
  }), [bancas, seg, sit, q, titular, aux]);

  return (
    <div className="grid gap-5">
      {/* legenda / contadores por situação (clicáveis) */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSit("todas")} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${sit === "todas" ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"}`}>
          Todas ({bancas.length})
        </button>
        {Object.entries(SIT).map(([k, v]) => (
          <button key={k} onClick={() => setSit(k)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
            style={sit === k ? { background: v.c, borderColor: v.c, color: "#fff" } : { borderColor: "#eae2f2", background: "#fff", color: "#6E5C82" }}>
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: sit === k ? "#fff" : v.c }} />
            {v.l} ({contagem[k] ?? 0})
          </button>
        ))}
      </div>

      {/* filtros: segmento + busca */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[13px] font-bold text-navy">Segmento:</label>
        <select className="inp max-w-[220px]" value={seg} onChange={(e) => setSeg(e.target.value)}>
          <option value="todos">Todos os segmentos</option>
          {segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="inp max-w-[240px]" placeholder="Buscar nº, permissionário ou auxiliar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="ml-auto text-[12.5px] text-muted">{filtradas.length} banca(s)</span>
      </div>

      {/* grade de cards */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
        {filtradas.map((b) => {
          const s = sitInfo(b.status);
          return (
            <div key={b.id} className="overflow-hidden rounded-xl border p-2" style={{ background: s.c + "26", borderColor: s.c + "80" }}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[13.5px] font-extrabold text-navy"><span className="text-[9.5px] font-semibold text-muted">Banca </span>{b.numero}</span>
                <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold" style={{ color: s.c }}>{s.l}</span>
              </div>
              <p className="mt-1 truncate text-[9.5px] font-semibold uppercase tracking-wide text-muted">{b.segmento?.nome ?? "sem segmento"}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight text-navy" title={titular[b.id] ?? ""}
                 style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {titular[b.id] ?? "—"}
              </p>
              <p className="truncate text-[10px] text-muted" title={aux[b.id] ?? ""}>aux: {aux[b.id] ?? "—"}</p>
            </div>
          );
        })}
        {filtradas.length === 0 && <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma banca com esses filtros.</p>}
      </div>

      <style jsx>{`:global(.inp){border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}
