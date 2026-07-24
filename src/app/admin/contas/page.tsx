"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, string> = { em_aberto: "Em aberto", paga: "Paga", em_atraso: "Em atraso", contestada: "Contestada" };

type Conta = {
  id: string; tipo: string; competencia: string; valor: number; consumo: number | null;
  unidade: string | null; vencimento: string | null; status: string; fornecedor: string | null;
};

export default function ContasPage() {
  return (
    <AdminGuard active="contas" title="Contas — água e energia">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [form, setForm] = useState({ tipo: "agua", competencia: "", valor: "", consumo: "", vencimento: "", status: "em_aberto" });

  const carregar = useCallback(async () => {
    const { data } = await sb.from("conta_utilidade")
      .select("id,tipo,competencia,valor,consumo,unidade,vencimento,status,fornecedor")
      .order("competencia", { ascending: false }).limit(400);
    setContas((data as Conta[]) ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.competencia) return;
    const unidade = form.tipo === "agua" ? "m³" : "kWh";
    const fornecedor = form.tipo === "agua" ? "Corsan" : "RGE";
    await sb.from("conta_utilidade").insert({
      tipo: form.tipo, competencia: form.competencia + "-01", valor: Number(form.valor || 0),
      consumo: form.consumo ? Number(form.consumo) : null, unidade, vencimento: form.vencimento || null,
      status: form.status, fornecedor,
    });
    setForm({ ...form, competencia: "", valor: "", consumo: "", vencimento: "" });
    carregar();
  }

  async function pagar(id: string) { await sb.from("conta_utilidade").update({ status: "paga" }).eq("id", id); carregar(); }

  const resumo = useMemo(() => {
    const agua = contas.filter((c) => c.tipo === "agua").reduce((s, c) => s + Number(c.valor || 0), 0);
    const energia = contas.filter((c) => c.tipo === "energia").reduce((s, c) => s + Number(c.valor || 0), 0);
    const atraso = contas.filter((c) => c.status === "em_atraso");
    return { agua, energia, atrasoN: atraso.length, atrasoV: atraso.reduce((s, c) => s + Number(c.valor || 0), 0) };
  }, [contas]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3.5 md:grid-cols-4">
        <Kpi val={BRL.format(resumo.agua)} label="água (acumulado)" cls="text-sky" />
        <Kpi val={BRL.format(resumo.energia)} label="energia (acumulado)" cls="text-warn" />
        <Kpi val={BRL.format(resumo.agua + resumo.energia)} label="total utilidades" cls="text-navy" />
        <Kpi val={`${resumo.atrasoN} · ${BRL.format(resumo.atrasoV)}`} label="contas em atraso" cls="text-bad" />
      </div>

      <form onSubmit={registrar} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">Lançar conta</h3>
        <div className="grid gap-3 md:grid-cols-6">
          <select className="inp" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="agua">Água (Corsan)</option><option value="energia">Energia (RGE)</option>
          </select>
          <input type="month" className="inp" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} />
          <input type="number" step="0.01" placeholder="Valor R$" className="inp" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <input type="number" step="0.01" placeholder={form.tipo === "agua" ? "Consumo m³" : "Consumo kWh"} className="inp" value={form.consumo} onChange={(e) => setForm({ ...form, consumo: e.target.value })} />
          <input type="date" className="inp" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
          <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="em_aberto">Em aberto</option><option value="paga">Paga</option><option value="em_atraso">Em atraso</option><option value="contestada">Contestada</option>
          </select>
        </div>
        <button className="mt-3 rounded-lg bg-accent px-4 py-2.5 font-bold text-white">Lançar conta</button>
      </form>

      {contas.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma conta lançada. Use o formulário acima para registrar as faturas de água e energia.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead><tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Tipo</th><th className="p-3">Competência</th><th className="p-3">Consumo</th><th className="p-3">Valor</th><th className="p-3">Venc.</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="p-3 font-bold" style={{ color: c.tipo === "agua" ? "#1F9BD4" : "#C8961E" }}>{c.tipo === "agua" ? "Água" : "Energia"}<span className="block text-[11px] font-normal text-muted">{c.fornecedor}</span></td>
                  <td className="p-3">{new Date(c.competencia).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}</td>
                  <td className="p-3">{c.consumo != null ? `${c.consumo} ${c.unidade ?? ""}` : "—"}</td>
                  <td className="p-3">{BRL.format(Number(c.valor || 0))}</td>
                  <td className="p-3">{c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${c.status === "paga" ? "bg-[#e5f3ea] text-ok" : c.status === "em_atraso" ? "bg-[#fbe4e1] text-bad" : "bg-[#fbf1d6] text-[#8a6a0f]"}`}>{STATUS[c.status] ?? c.status}</span></td>
                  <td className="p-3">{c.status !== "paga" && <button onClick={() => pagar(c.id)} className="text-[12px] font-semibold text-ok">marcar paga</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}

function Kpi({ val, label, cls }: { val: string; label: string; cls: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <b className={`block text-xl font-extrabold ${cls}`}>{val}</b>
      <span className="text-[12.5px] text-muted">{label}</span>
    </div>
  );
}
