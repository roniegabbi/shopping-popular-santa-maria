"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();

const CLASSES = [
  { v: "acao_civil_publica", l: "Ação Civil Pública" },
  { v: "mandado_seguranca", l: "Mandado de Segurança" },
  { v: "cassacao_judicial", l: "Cassação (judicial)" },
  { v: "sorteio_judicial", l: "Sorteio (judicial)" },
  { v: "execucao_fiscal", l: "Execução Fiscal" },
  { v: "outro", l: "Outro" },
];
const STATUS = [
  { v: "ativo", l: "Ativo" },
  { v: "suspenso", l: "Suspenso" },
  { v: "sentenca", l: "Sentença" },
  { v: "recurso", l: "Recurso" },
  { v: "transitado_julgado", l: "Trânsito em julgado" },
  { v: "arquivado", l: "Arquivado" },
];
const classeL = (v: string) => CLASSES.find((c) => c.v === v)?.l ?? v;
const statusL = (v: string) => STATUS.find((c) => c.v === v)?.l ?? v;

type Proc = {
  id: string;
  numero_cnj: string | null;
  classe: string;
  vara: string | null;
  comarca: string | null;
  partes: string | null;
  objeto: string | null;
  status: string;
  data_distribuicao: string | null;
  ultima_movimentacao: string | null;
};
type Andamento = { id: string; data: string; descricao: string };

export default function JudicialPage() {
  return (
    <AdminGuard active="judicial" title="Judicial & ACP">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [lista, setLista] = useState<Proc[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [form, setForm] = useState({
    classe: "acao_civil_publica",
    numero_cnj: "",
    vara: "",
    comarca: "Santa Maria",
    partes: "",
    objeto: "",
    status: "ativo",
    data_distribuicao: "",
  });

  const carregar = useCallback(async () => {
    const { data } = await sb
      .from("processo_judicial")
      .select("id,numero_cnj,classe,vara,comarca,partes,objeto,status,data_distribuicao,ultima_movimentacao")
      .order("created_at", { ascending: false });
    setLista((data as Proc[]) ?? []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await sb.from("processo_judicial").insert({
      classe: form.classe,
      numero_cnj: form.numero_cnj || null,
      vara: form.vara || null,
      comarca: form.comarca || null,
      partes: form.partes || null,
      objeto: form.objeto || null,
      status: form.status,
      data_distribuicao: form.data_distribuicao || null,
    });
    setSalvando(false);
    if (!error) {
      setForm({ ...form, numero_cnj: "", vara: "", partes: "", objeto: "", data_distribuicao: "" });
      carregar();
    }
  }

  const ativos = lista.filter((p) => p.status === "ativo").length;
  const acps = lista.filter((p) => p.classe === "acao_civil_publica").length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3.5 md:grid-cols-3">
        <Kpi val={String(lista.length)} label="processos cadastrados" cls="text-navy" />
        <Kpi val={String(ativos)} label="ativos" cls="text-bad" />
        <Kpi val={String(acps)} label="ações civis públicas" cls="text-warn" />
      </div>

      <form onSubmit={criar} className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-extrabold text-navy">Cadastrar processo</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <select className="inp" value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })}>
            {CLASSES.map((c) => (
              <option key={c.v} value={c.v}>
                {c.l}
              </option>
            ))}
          </select>
          <input className="inp" placeholder="Nº CNJ" value={form.numero_cnj} onChange={(e) => setForm({ ...form, numero_cnj: e.target.value })} />
          <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
          <input className="inp" placeholder="Vara" value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} />
          <input className="inp" placeholder="Comarca" value={form.comarca} onChange={(e) => setForm({ ...form, comarca: e.target.value })} />
          <input type="date" className="inp" value={form.data_distribuicao} onChange={(e) => setForm({ ...form, data_distribuicao: e.target.value })} />
          <input className="inp md:col-span-3" placeholder="Partes (autor × réu)" value={form.partes} onChange={(e) => setForm({ ...form, partes: e.target.value })} />
          <textarea className="inp md:col-span-3 min-h-[60px]" placeholder="Objeto" value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} />
        </div>
        <button disabled={salvando} className="mt-3 rounded-lg bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-60">
          {salvando ? "Salvando…" : "Cadastrar processo"}
        </button>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
          Nenhum processo judicial cadastrado ainda.
        </p>
      ) : (
        <div className="grid gap-3">
          {lista.map((p) => (
            <ProcCard key={p.id} p={p} aberto={aberto === p.id} onToggle={() => setAberto(aberto === p.id ? null : p.id)} onChange={carregar} />
          ))}
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

function ProcCard({ p, aberto, onToggle, onChange }: { p: Proc; aberto: boolean; onToggle: () => void; onChange: () => void }) {
  const [andamentos, setAndamentos] = useState<Andamento[]>([]);
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!aberto) return;
    sb.from("andamento_judicial")
      .select("id,data,descricao")
      .eq("processo_judicial_id", p.id)
      .order("data", { ascending: false })
      .then(({ data }) => setAndamentos((data as Andamento[]) ?? []));
  }, [aberto, p.id]);

  async function addAndamento() {
    if (!desc.trim()) return;
    const hoje = new Date().toISOString().slice(0, 10);
    await sb.from("andamento_judicial").insert({ processo_judicial_id: p.id, data: hoje, descricao: desc });
    await sb.from("processo_judicial").update({ ultima_movimentacao: hoje }).eq("id", p.id);
    setDesc("");
    setAndamentos((a) => [{ id: crypto.randomUUID(), data: hoje, descricao: desc }, ...a]);
    onChange();
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#F1EAF8] px-2.5 py-1 text-[11.5px] font-bold text-navy">{classeL(p.classe)}</span>
        <b className="text-navy">{p.numero_cnj ?? "sem nº CNJ"}</b>
        <span className="text-[12px] text-muted">{[p.vara, p.comarca].filter(Boolean).join(" · ")}</span>
        <span className="ml-auto rounded-full bg-[#fbf1d6] px-2.5 py-1 text-[11.5px] font-bold text-[#8a6a0f]">{statusL(p.status)}</span>
        <button onClick={onToggle} className="text-[13px] font-semibold text-brand">
          {aberto ? "fechar" : "andamentos"}
        </button>
      </div>
      {p.objeto && <p className="mt-2 text-sm text-muted">{p.objeto}</p>}
      {p.partes && <p className="mt-1 text-[12px] text-muted">Partes: {p.partes}</p>}

      {aberto && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex gap-2">
            <input
              className="inp flex-1"
              placeholder="Nova movimentação…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <button onClick={addAndamento} className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">
              Registrar
            </button>
          </div>
          <ul className="mt-3 grid gap-2">
            {andamentos.length === 0 && <li className="text-[13px] text-muted">Sem movimentações.</li>}
            {andamentos.map((a) => (
              <li key={a.id} className="text-[13px]">
                <b className="text-navy">{new Date(a.data).toLocaleDateString("pt-BR")}</b> — {a.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}
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
