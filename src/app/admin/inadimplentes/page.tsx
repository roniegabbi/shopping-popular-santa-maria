"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Banca = { id: string; numero: string };
type Pag = {
  id: string;
  competencia: string;
  taxa: number;
  condominio: number;
  vencimento: string | null;
  status: string;
  banca_id: string;
  banca: { numero: string } | null;
  permissionario: { nome: string } | null;
};

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
  const [form, setForm] = useState({
    banca_id: "",
    competencia: "",
    taxa: "",
    condominio: "",
    vencimento: "",
    status: "em_atraso",
  });

  const carregar = useCallback(async () => {
    const { data } = await sb
      .from("pagamento")
      .select("id,competencia,taxa,condominio,vencimento,status,banca_id,banca(numero),permissionario(nome)")
      .in("status", ["em_atraso", "protestado"])
      .order("vencimento", { ascending: true })
      .limit(500);
    setPagas((data as unknown as Pag[]) ?? []);
  }, []);

  useEffect(() => {
    sb.from("banca")
      .select("id,numero")
      .then(({ data }) => {
        const rows = (data as Banca[]) ?? [];
        rows.sort((a, b) => Number(a.numero) - Number(b.numero));
        setBancas(rows);
      });
    carregar();
  }, [carregar]);

  // agrupa por banca
  const grupos = useMemo(() => {
    const m = new Map<string, { numero: string; nome: string | null; cotas: number; total: number; protesto: boolean }>();
    for (const p of pagas) {
      const key = p.banca_id;
      const cur = m.get(key) ?? { numero: p.banca?.numero ?? "—", nome: p.permissionario?.nome ?? null, cotas: 0, total: 0, protesto: false };
      cur.cotas += 1;
      cur.total += Number(p.taxa || 0) + Number(p.condominio || 0);
      if (p.status === "protestado") cur.protesto = true;
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.cotas - a.cotas);
  }, [pagas]);

  const totalDevido = grupos.reduce((s, g) => s + g.total, 0);
  const risco = grupos.filter((g) => g.cotas > 3).length; // gatilho de cassação (art. 14 §3)

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.banca_id || !form.competencia) return;
    setSalvando(true);
    const { error } = await sb.from("pagamento").insert({
      banca_id: form.banca_id,
      competencia: form.competencia + "-01",
      taxa: Number(form.taxa || 0),
      condominio: Number(form.condominio || 0),
      vencimento: form.vencimento || null,
      status: form.status,
    });
    setSalvando(false);
    if (!error) {
      setForm({ ...form, competencia: "", taxa: "", condominio: "", vencimento: "" });
      carregar();
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3.5 md:grid-cols-3">
        <Kpi val={String(grupos.length)} label="bancas inadimplentes" cls="text-bad" />
        <Kpi val={BRL.format(totalDevido)} label="total em atraso" cls="text-navy" />
        <Kpi val={String(risco)} label="acima de 3 cotas (risco de cassação)" cls="text-warn" />
      </div>

      <form onSubmit={registrar} className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-extrabold text-navy">Registrar competência / cobrança</h2>
        <div className="grid gap-3 md:grid-cols-6">
          <select className="inp md:col-span-2" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
            <option value="">Banca…</option>
            {bancas.map((b) => (
              <option key={b.id} value={b.id}>
                Banca {b.numero}
              </option>
            ))}
          </select>
          <input type="month" className="inp" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} />
          <input type="number" step="0.01" placeholder="Taxa" className="inp" value={form.taxa} onChange={(e) => setForm({ ...form, taxa: e.target.value })} />
          <input type="number" step="0.01" placeholder="Condomínio" className="inp" value={form.condominio} onChange={(e) => setForm({ ...form, condominio: e.target.value })} />
          <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="em_atraso">Em atraso</option>
            <option value="protestado">Protestado</option>
            <option value="pago">Pago</option>
            <option value="em_dia">Em dia</option>
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input type="date" className="inp max-w-[200px]" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
          <button disabled={salvando} className="rounded-lg bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-60">
            {salvando ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>

      {grupos.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
          Nenhuma inadimplência registrada. Use o formulário acima para lançar competências em atraso.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs text-white">
                <th className="p-3">Banca</th>
                <th className="p-3">Permissionário</th>
                <th className="p-3">Cotas em atraso</th>
                <th className="p-3">Total devido</th>
                <th className="p-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="p-3 font-bold text-navy">Banca {g.numero}</td>
                  <td className="p-3">{g.nome ?? "—"}</td>
                  <td className="p-3">
                    {g.cotas}
                    {g.cotas > 3 && <span className="ml-2 rounded-full bg-[#fbe4e1] px-2 py-0.5 text-[11px] font-bold text-bad">cassação</span>}
                  </td>
                  <td className="p-3">{BRL.format(g.total)}</td>
                  <td className="p-3">
                    {g.protesto ? (
                      <span className="rounded-full bg-[#fbe4e1] px-2.5 py-1 text-[11.5px] font-bold text-bad">Protestado</span>
                    ) : (
                      <span className="rounded-full bg-[#fbf1d6] px-2.5 py-1 text-[11.5px] font-bold text-[#8a6a0f]">Em atraso</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border: 1px solid #eae2f2;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 14px;
          background: #fff;
        }
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
