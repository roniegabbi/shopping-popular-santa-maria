"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import MoedaInput from "../../_components/MoedaInput";
import { BRL, moedaParaNumero } from "@/lib/moeda";

const sb = createSupabase();
const STATUS: Record<string, string> = { em_aberto: "Em aberto", paga: "Paga", em_atraso: "Em atraso", contestada: "Contestada" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const hoje = new Date();
const ANOS = [hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

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
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: "agua",
    mes: String(hoje.getMonth() + 1),
    ano: String(hoje.getFullYear()),
    valor: "",
    consumo: "",
    vencimento: "",
    status: "em_aberto",
  });

  const carregar = useCallback(async () => {
    const { data } = await sb.from("conta_utilidade")
      .select("id,tipo,competencia,valor,consumo,unidade,vencimento,status,fornecedor")
      .order("competencia", { ascending: false }).limit(400);
    setContas((data as Conta[]) ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const valorNum = moedaParaNumero(form.valor);
    if (!valorNum) { setMsg("Informe o valor da conta (ex.: 2.000,00)."); return; }
    const competencia = `${form.ano}-${String(Number(form.mes)).padStart(2, "0")}-01`;
    const unidade = form.tipo === "agua" ? "m³" : "kWh";
    const fornecedor = form.tipo === "agua" ? "Corsan" : "RGE";
    const dados = {
      tipo: form.tipo, competencia, valor: valorNum,
      consumo: form.consumo ? Number(form.consumo) : null, unidade,
      vencimento: form.vencimento || null, status: form.status, fornecedor,
    };
    const { error } = editId
      ? await sb.from("conta_utilidade").update(dados).eq("id", editId)
      : await sb.from("conta_utilidade").insert(dados);
    if (error) { setMsg("Erro ao salvar: " + error.message); return; }
    setMsg(`${editId ? "Conta atualizada" : "Conta lançada"}: ${form.tipo === "agua" ? "Água" : "Energia"} · ${MESES[Number(form.mes) - 1]}/${form.ano} · ${BRL.format(valorNum)}.`);
    setForm({ ...form, valor: "", consumo: "", vencimento: "" });
    setEditId(null);
    carregar();
  }

  function editar(c: Conta) {
    const d = new Date(c.competencia);
    setForm({
      tipo: c.tipo, mes: String(d.getMonth() + 1), ano: String(d.getFullYear()),
      valor: Number(c.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      consumo: c.consumo != null ? String(c.consumo) : "", vencimento: c.vencimento ?? "", status: c.status,
    });
    setEditId(c.id);
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelarEdicao() {
    setEditId(null);
    setForm({ ...form, valor: "", consumo: "", vencimento: "" });
    setMsg(null);
  }
  async function excluir(id: string) {
    if (!confirm("Excluir esta conta?")) return;
    await sb.from("conta_utilidade").delete().eq("id", id);
    if (editId === id) setEditId(null);
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
        <h3 className="mb-1 font-extrabold text-navy">{editId ? "Editar conta" : "Lançar conta"}</h3>
        <p className="mb-4 text-[13px] text-muted">Escolha o tipo, o mês/ano de referência e informe o valor da fatura.</p>

        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Tipo de conta">
            <select className="inp" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="agua">Água — Corsan</option>
              <option value="energia">Energia — RGE</option>
            </select>
          </Campo>
          <Campo label="Mês de referência">
            <select className="inp" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="Ano">
            <select className="inp" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })}>
              {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Campo>

          <Campo label="Valor da fatura (R$)">
            <MoedaInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} />
          </Campo>
          <Campo label={`Consumo (${form.tipo === "agua" ? "m³" : "kWh"}) — opcional`}>
            <input type="number" step="0.01" className="inp" placeholder={form.tipo === "agua" ? "Ex.: 320" : "Ex.: 5400"} value={form.consumo} onChange={(e) => setForm({ ...form, consumo: e.target.value })} />
          </Campo>
          <Campo label="Vencimento — opcional">
            <input type="date" className="inp" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
          </Campo>

          <Campo label="Situação">
            <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="em_aberto">Em aberto</option>
              <option value="paga">Paga</option>
              <option value="em_atraso">Em atraso</option>
              <option value="contestada">Contestada</option>
            </select>
          </Campo>
        </div>

        {msg && <p className="mt-3 text-[13px] font-semibold text-navy">{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-accent px-5 py-2.5 font-bold text-white">{editId ? "Salvar alterações" : "Lançar conta"}</button>
          {editId && <button type="button" onClick={cancelarEdicao} className="rounded-lg border border-line px-5 py-2.5 font-semibold text-muted">Cancelar</button>}
        </div>
      </form>

      {contas.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma conta lançada. Use o formulário acima para registrar as faturas de água e energia.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Tipo</th><th className="p-3">Competência</th><th className="p-3">Consumo</th><th className="p-3">Valor</th><th className="p-3">Venc.</th><th className="p-3">Situação</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="p-3 font-bold" style={{ color: c.tipo === "agua" ? "#1F9BD4" : "#C8961E" }}>{c.tipo === "agua" ? "Água" : "Energia"}<span className="block text-[11px] font-normal text-muted">{c.fornecedor}</span></td>
                  <td className="p-3">{MESES[new Date(c.competencia).getMonth()]}/{new Date(c.competencia).getFullYear()}</td>
                  <td className="p-3">{c.consumo != null ? `${c.consumo} ${c.unidade ?? ""}` : "—"}</td>
                  <td className="p-3 font-semibold">{BRL.format(Number(c.valor || 0))}</td>
                  <td className="p-3">{c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${c.status === "paga" ? "bg-[#e5f3ea] text-ok" : c.status === "em_atraso" ? "bg-[#fbe4e1] text-bad" : "bg-[#fbf1d6] text-[#8a6a0f]"}`}>{STATUS[c.status] ?? c.status}</span></td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => editar(c)} className="text-left text-[12px] font-semibold text-brand">editar</button>
                      {c.status !== "paga" && <button onClick={() => pagar(c.id)} className="text-left text-[12px] font-semibold text-ok">marcar paga</button>}
                      <button onClick={() => excluir(c.id)} className="text-left text-[12px] font-semibold text-bad">excluir</button>
                    </div>
                  </td>
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>
      {children}
    </label>
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
