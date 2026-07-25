"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();
const hojeISO = () => new Date().toISOString().slice(0, 10);

type Banca = { id: string; numero: string };
type Fech = { id: string; banca_id: string; data: string; observacao: string | null; banca: { numero: string } | null };

export default function FrequenciaPage() {
  return (
    <AdminGuard active="frequencia" title="Frequência — bancas fechadas (art. 6º)">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [fechs, setFechs] = useState<Fech[]>([]);
  const [agentes, setAgentes] = useState<{ gestor?: string; secretario?: string }>({});
  const [form, setForm] = useState({ banca_id: "", data: hojeISO(), observacao: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await sb.from("banca_fechamento").select("id,banca_id,data,observacao,banca(numero)").order("data", { ascending: false }).limit(500);
    setFechs((data as unknown as Fech[]) ?? []);
  }, []);

  useEffect(() => {
    sb.from("banca").select("id,numero").then(({ data }) => {
      const rows = (data as Banca[]) ?? [];
      rows.sort((a, b) => Number(a.numero) - Number(b.numero));
      setBancas(rows);
    });
    sb.from("agente_publico").select("id,papel,ativo").eq("ativo", true).then(({ data }) => {
      const ags = (data as { id: string; papel: string }[]) ?? [];
      setAgentes({ gestor: ags.find((a) => a.papel === "gestor_shopping")?.id, secretario: ags.find((a) => a.papel === "secretario")?.id });
    });
    carregar();
  }, [carregar]);

  // dias fechados nos últimos 30 dias, por banca
  const resumo = useMemo(() => {
    const limite = new Date(); limite.setDate(limite.getDate() - 30); limite.setHours(0, 0, 0, 0);
    const m = new Map<string, { numero: string; dias: Set<string> }>();
    for (const f of fechs) {
      if (new Date(f.data + "T00:00:00") < limite) continue;
      const cur = m.get(f.banca_id) ?? { numero: f.banca?.numero ?? "—", dias: new Set<string>() };
      cur.dias.add(f.data); m.set(f.banca_id, cur);
    }
    return [...m.entries()].map(([banca_id, v]) => ({ banca_id, numero: v.numero, dias: v.dias.size }))
      .sort((a, b) => b.dias - a.dias);
  }, [fechs]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!form.banca_id) { setMsg("Selecione a banca."); return; }
    if (!form.data) { setMsg("Informe a data."); return; }
    const { error } = await sb.from("banca_fechamento").insert({ banca_id: form.banca_id, data: form.data, observacao: form.observacao || null });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg("Ocorrência de fechamento registrada.");
    setForm({ ...form, observacao: "" });
    carregar();
  }

  async function excluir(f: Fech) {
    if (!confirm(`Excluir o registro de ${new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR")} da banca ${f.banca?.numero}?`)) return;
    await sb.from("banca_fechamento").delete().eq("id", f.id);
    carregar();
  }

  async function abrirCassacao(banca_id: string, numero: string) {
    if (!confirm(`Abrir procedimento de cassação da banca ${numero} por banca fechada (art. 6º)?`)) return;
    const { data: perm } = await sb.from("permissionario").select("id").eq("banca_id", banca_id).maybeSingle();
    const jaTem = await sb.from("processo").select("id", { count: "exact", head: true }).eq("banca_id", banca_id).eq("tipo", "cassacao");
    if ((jaTem.count ?? 0) > 0) { setMsg(`A banca ${numero} já possui processo de cassação.`); return; }
    await sb.from("processo").insert({
      banca_id, permissionario_id: (perm as { id: string } | null)?.id ?? null, tipo: "cassacao", status: "aberto",
      gatilho: "Banca fechada (art. 6º)", base_legal: "Art. 6º do Decreto", aberto_em: new Date().toISOString(),
      ciencia_em: hojeISO(), prazo_defesa: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    });
    await sb.from("banca").update({ status: "em_cassacao" }).eq("id", banca_id);
    await sb.from("notificacao").insert({
      destinatario: "permissionario", tipo: "cassacao", origem: "poder_publico", banca_id, numero: 1,
      assunto: "Instauração de procedimento de cassação — Banca fechada (art. 6º)", base_legal: "Art. 6º do Decreto",
      status: "emitida", gestor_id: agentes.gestor ?? null, secretario_id: agentes.secretario ?? null,
    });
    setMsg(`Processo de cassação aberto para a banca ${numero}. Gere o caderno de instauração no módulo Cassações.`);
  }

  return (
    <div className="grid gap-5">
      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        Art. 6º do Decreto: a ausência injustificada de atividade por <b>10 dias (úteis) — consecutivos ou alternados — em 30 dias</b>
        enseja apuração e cassação. Registre aqui cada dia em que a banca for constatada fechada; o sistema conta e alerta ao atingir o gatilho.
      </p>

      <form onSubmit={registrar} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">Registrar dia de banca fechada</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Banca">
            <select className="inp" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
              <option value="">Selecione…</option>
              {bancas.map((b) => <option key={b.id} value={b.id}>Banca {b.numero}</option>)}
            </select>
          </Campo>
          <Campo label="Data"><input type="date" className="inp" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Campo>
          <Campo label="Observação (opcional)"><input className="inp" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="ex.: constatado pela concessionária" /></Campo>
        </div>
        {msg && <p className="mt-3 text-[13px] font-semibold text-navy">{msg}</p>}
        <button className="mt-4 rounded-lg bg-accent px-5 py-2.5 font-bold text-white">Registrar</button>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Bancas fechadas nos últimos 30 dias</h3>
        {resumo.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhum fechamento registrado nos últimos 30 dias.</p>
        ) : (
          <div className="grid gap-2.5">
            {resumo.map((r) => {
              const cor = r.dias >= 10 ? "#C0392B" : r.dias >= 7 ? "#C8961E" : "#2E8B57";
              return (
                <div key={r.banca_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3" style={{ borderLeft: `6px solid ${cor}` }}>
                  <b className="text-navy">Banca {r.numero}</b>
                  <span className="text-[13px] font-semibold" style={{ color: cor }}>{r.dias} dia(s) fechada(s) em 30 dias</span>
                  {r.dias >= 10 && <span className="rounded-full bg-[#20242B] px-2 py-0.5 text-[11px] font-bold text-white">gatilho art. 6º</span>}
                  {r.dias >= 10 && <button onClick={() => abrirCassacao(r.banca_id, r.numero)} className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-[12.5px] font-semibold text-white">Abrir cassação</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Últimos registros</h3>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="bg-navy text-left text-xs text-white"><th className="p-3">Banca</th><th className="p-3">Data</th><th className="p-3">Observação</th><th className="p-3"></th></tr></thead>
            <tbody>
              {fechs.slice(0, 60).map((f) => (
                <tr key={f.id} className="border-t border-line">
                  <td className="p-3 font-bold text-navy">{f.banca?.numero ?? "—"}</td>
                  <td className="p-3">{new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 text-muted">{f.observacao ?? "—"}</td>
                  <td className="p-3"><button onClick={() => excluir(f)} className="text-[12.5px] font-semibold text-bad">Excluir</button></td>
                </tr>
              ))}
              {fechs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-sm text-muted">Nenhum registro.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>{children}</label>);
}
