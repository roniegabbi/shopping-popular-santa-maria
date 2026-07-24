"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();
const TIPO: Record<string, string> = { cadastramento: "Cadastramento", realocacao: "Realocação" };
const STATUS: Record<string, string> = { aberto: "Aberto", homologado: "Homologado", encerrado: "Encerrado" };

type Sorteio = {
  id: string; edital: string | null; tipo: string; validade_ate: string | null;
  status: string; realizado_em: string | null; resultado: string | null;
};

export default function SorteiosPage() {
  return (
    <AdminGuard active="sorteios" title="Sorteios & Editais">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [lista, setLista] = useState<Sorteio[]>([]);
  const [vagas, setVagas] = useState(0);
  const [aguardando, setAguardando] = useState(0);
  const [form, setForm] = useState({ edital: "", tipo: "cadastramento", validade_ate: "", realizado_em: "", resultado: "" });

  const carregar = useCallback(async () => {
    const { data } = await sb.from("sorteio").select("id,edital,tipo,validade_ate,status,realizado_em,resultado").order("created_at", { ascending: false });
    setLista((data as Sorteio[]) ?? []);
    const { count: v } = await sb.from("banca").select("*", { count: "exact", head: true }).eq("status", "vaga");
    const { count: a } = await sb.from("banca").select("*", { count: "exact", head: true }).eq("status", "aguardando_sorteio");
    setVagas(v ?? 0); setAguardando(a ?? 0);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.edital) return;
    await sb.from("sorteio").insert({
      edital: form.edital, tipo: form.tipo, validade_ate: form.validade_ate || null,
      realizado_em: form.realizado_em || null, resultado: form.resultado || null,
      status: form.realizado_em ? "homologado" : "aberto",
    });
    setForm({ edital: "", tipo: "cadastramento", validade_ate: "", realizado_em: "", resultado: "" });
    carregar();
  }
  async function mudarStatus(id: string, status: string) { await sb.from("sorteio").update({ status }).eq("id", id); carregar(); }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3.5 md:grid-cols-3">
        <Kpi val={String(vagas)} label="bancas vagas (para sorteio)" cls="text-navy" />
        <Kpi val={String(aguardando)} label="aguardando sorteio" cls="text-sky" />
        <Kpi val={String(lista.filter((s) => s.status === "aberto").length)} label="editais abertos" cls="text-warn" />
      </div>

      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        O sorteio público ocorre quando há, no mínimo, 2 bancas vagas (art. 9º). Cadastre o edital (validade de 2 anos)
        e registre o resultado após a realização.
      </p>

      <form onSubmit={criar} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">Novo edital / sorteio</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Edital (nº / identificação)"><input className="inp" value={form.edital} onChange={(e) => setForm({ ...form, edital: e.target.value })} placeholder="Ex.: Edital 01/2025" /></Campo>
          <Campo label="Tipo">
            <select className="inp" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="cadastramento">Cadastramento (novos)</option>
              <option value="realocacao">Realocação (superiores → térreo)</option>
            </select>
          </Campo>
          <Campo label="Validade do edital"><input type="date" className="inp" value={form.validade_ate} onChange={(e) => setForm({ ...form, validade_ate: e.target.value })} /></Campo>
          <Campo label="Data do sorteio (se realizado)"><input type="date" className="inp" value={form.realizado_em} onChange={(e) => setForm({ ...form, realizado_em: e.target.value })} /></Campo>
          <Campo label="Resultado / observações"><input className="inp" value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} placeholder="Contemplados, bancas sorteadas…" /></Campo>
        </div>
        <button className="mt-4 rounded-lg bg-accent px-5 py-2.5 font-bold text-white">Cadastrar</button>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhum edital/sorteio cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Edital</th><th className="p-3">Tipo</th><th className="p-3">Validade</th><th className="p-3">Realizado</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="border-t border-line align-top">
                  <td className="p-3"><b className="text-navy">{s.edital}</b>{s.resultado && <span className="block text-[12px] text-muted">{s.resultado}</span>}</td>
                  <td className="p-3">{TIPO[s.tipo] ?? s.tipo}</td>
                  <td className="p-3">{s.validade_ate ? new Date(s.validade_ate).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3">{s.realizado_em ? new Date(s.realizado_em).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${s.status === "homologado" ? "bg-[#e5f3ea] text-ok" : s.status === "encerrado" ? "bg-[#e9edf3] text-wait" : "bg-[#fbf1d6] text-[#8a6a0f]"}`}>{STATUS[s.status] ?? s.status}</span></td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {s.status !== "homologado" && <button onClick={() => mudarStatus(s.id, "homologado")} className="text-left text-[12px] font-semibold text-ok">homologar</button>}
                      {s.status !== "encerrado" && <button onClick={() => mudarStatus(s.id, "encerrado")} className="text-left text-[12px] font-semibold text-wait">encerrar</button>}
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
  return (<label className="block"><span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>{children}</label>);
}
function Kpi({ val, label, cls }: { val: string; label: string; cls: string }) {
  return (<div className="rounded-2xl border border-line bg-white p-4"><b className={`block text-2xl font-extrabold ${cls}`}>{val}</b><span className="text-[12.5px] text-muted">{label}</span></div>);
}
