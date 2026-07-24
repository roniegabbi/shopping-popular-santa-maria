"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();
const REPRES = [
  { v: "poder_publico", l: "Poder público" },
  { v: "concessionaria", l: "Concessionária" },
  { v: "comerciantes", l: "Comerciantes" },
];
const repL = (v: string) => REPRES.find((r) => r.v === v)?.l ?? v;

type Membro = { id: string; nome: string; representacao: string; cargo: string | null; mandato_inicio: string | null; mandato_fim: string | null };
type Ata = { id: string; data: string | null; titulo: string | null; resumo: string | null; publico: boolean };

export default function ConselhoPage() {
  return (
    <AdminGuard active="conselho" title="Conselho Gestor">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [atas, setAtas] = useState<Ata[]>([]);
  const [fm, setFm] = useState({ nome: "", representacao: "poder_publico", cargo: "", mandato_inicio: "", mandato_fim: "" });
  const [fa, setFa] = useState({ data: "", titulo: "", resumo: "", publico: true });

  const carregar = useCallback(async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      sb.from("conselho_gestor").select("id,nome,representacao,cargo,mandato_inicio,mandato_fim").order("representacao"),
      sb.from("ata").select("id,data,titulo,resumo,publico").order("data", { ascending: false }),
    ]);
    setMembros((m as Membro[]) ?? []);
    setAtas((a as Ata[]) ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function addMembro(e: React.FormEvent) {
    e.preventDefault();
    if (!fm.nome) return;
    await sb.from("conselho_gestor").insert({
      nome: fm.nome, representacao: fm.representacao, cargo: fm.cargo || null,
      mandato_inicio: fm.mandato_inicio || null, mandato_fim: fm.mandato_fim || null,
    });
    setFm({ ...fm, nome: "", cargo: "" });
    carregar();
  }
  async function delMembro(id: string) { await sb.from("conselho_gestor").delete().eq("id", id); carregar(); }

  async function addAta(e: React.FormEvent) {
    e.preventDefault();
    if (!fa.titulo && !fa.data) return;
    await sb.from("ata").insert({ data: fa.data || null, titulo: fa.titulo || null, resumo: fa.resumo || null, publico: fa.publico });
    setFa({ data: "", titulo: "", resumo: "", publico: true });
    carregar();
  }
  async function delAta(id: string) { await sb.from("ata").delete().eq("id", id); carregar(); }

  const cont = (r: string) => membros.filter((m) => m.representacao === r).length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3.5 md:grid-cols-3">
        {REPRES.map((r) => (
          <div key={r.v} className="rounded-2xl border border-line bg-white p-4">
            <b className="block text-2xl font-extrabold text-navy">{cont(r.v)}<span className="text-sm font-normal text-muted"> / 3</span></b>
            <span className="text-[12.5px] text-muted">{r.l}</span>
          </div>
        ))}
      </div>

      {/* membros */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <form onSubmit={addMembro} className="h-max rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-3 font-extrabold text-navy">Adicionar membro</h3>
          <Campo label="Representação">
            <select className="inp" value={fm.representacao} onChange={(e) => setFm({ ...fm, representacao: e.target.value })}>
              {REPRES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </Campo>
          <Campo label="Nome"><input className="inp" value={fm.nome} onChange={(e) => setFm({ ...fm, nome: e.target.value })} /></Campo>
          <Campo label="Cargo / função"><input className="inp" value={fm.cargo} onChange={(e) => setFm({ ...fm, cargo: e.target.value })} /></Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Mandato — início"><input type="date" className="inp" value={fm.mandato_inicio} onChange={(e) => setFm({ ...fm, mandato_inicio: e.target.value })} /></Campo>
            <Campo label="Mandato — fim"><input type="date" className="inp" value={fm.mandato_fim} onChange={(e) => setFm({ ...fm, mandato_fim: e.target.value })} /></Campo>
          </div>
          <button className="w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-white">Adicionar</button>
          <p className="mt-2 text-[11.5px] text-muted">Composição: 3 poder público + 3 concessionária + 3 comerciantes; mandato de 2 anos (art. 8º).</p>
        </form>

        <div className="grid gap-2">
          {membros.length === 0 ? <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhum membro cadastrado.</p> :
            membros.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                <span className="rounded-full bg-[#F1EAF8] px-2.5 py-1 text-[11.5px] font-bold text-navy">{repL(m.representacao)}</span>
                <div className="flex-1">
                  <b className="text-navy">{m.nome}</b>
                  <span className="block text-[12px] text-muted">{[m.cargo, m.mandato_inicio && `mandato ${new Date(m.mandato_inicio).toLocaleDateString("pt-BR")}${m.mandato_fim ? ` a ${new Date(m.mandato_fim).toLocaleDateString("pt-BR")}` : ""}`].filter(Boolean).join(" · ")}</span>
                </div>
                <button onClick={() => delMembro(m.id)} className="text-[12px] font-semibold text-bad">remover</button>
              </div>
            ))}
        </div>
      </div>

      {/* atas */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <form onSubmit={addAta} className="h-max rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-3 font-extrabold text-navy">Registrar ata / reunião</h3>
          <Campo label="Data"><input type="date" className="inp" value={fa.data} onChange={(e) => setFa({ ...fa, data: e.target.value })} /></Campo>
          <Campo label="Título"><input className="inp" value={fa.titulo} onChange={(e) => setFa({ ...fa, titulo: e.target.value })} placeholder="Ex.: Reunião ordinária 1º tri" /></Campo>
          <Campo label="Resumo / deliberações"><textarea className="inp min-h-[70px]" value={fa.resumo} onChange={(e) => setFa({ ...fa, resumo: e.target.value })} /></Campo>
          <label className="mb-2 flex items-center gap-2 text-sm text-navy"><input type="checkbox" checked={fa.publico} onChange={(e) => setFa({ ...fa, publico: e.target.checked })} /> Publicar na vitrine (transparência)</label>
          <button className="w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-white">Registrar ata</button>
        </form>

        <div className="grid gap-2">
          {atas.length === 0 ? <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma ata registrada.</p> :
            atas.map((a) => (
              <div key={a.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center gap-2">
                  <b className="text-navy">{a.titulo ?? "Reunião"}</b>
                  {a.data && <span className="text-[12px] text-muted">{new Date(a.data).toLocaleDateString("pt-BR")}</span>}
                  {a.publico && <span className="rounded-full bg-[#e5f3ea] px-2 py-0.5 text-[10.5px] font-bold text-ok">público</span>}
                  <button onClick={() => delAta(a.id)} className="ml-auto text-[12px] font-semibold text-bad">remover</button>
                </div>
                {a.resumo && <p className="mt-1 text-[13px] text-muted">{a.resumo}</p>}
              </div>
            ))}
        </div>
      </div>

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;margin-bottom:10px;}`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>{children}</label>);
}
