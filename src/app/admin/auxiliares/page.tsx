"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { validaCPF, cpfComErro } from "@/lib/cpf";

const sb = createSupabase();

const STATUS_COR: Record<string, string> = { regular: "#2E8B57", pendente: "#C8961E", irregular: "#C0392B" };
const VINCULOS = ["auxiliar", "cônjuge", "filho(a)", "funcionário (MEI)", "outro"];

type Banca = { id: string; numero: string };
type Aux = {
  id: string; banca_id: string | null; permissionario_id: string | null;
  nome: string; cpf: string | null; vinculo: string | null; status: string;
  banca: { numero: string } | null; permissionario: { nome: string } | null;
};

export default function AuxiliaresPage() {
  return (
    <AdminGuard active="auxiliares" title="Auxiliares dos permissionários">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [lista, setLista] = useState<Aux[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "incompletos" | "irregular">("todos");
  const [msg, setMsg] = useState<string | null>(null);
  const vazio = { id: "", banca_id: "", nome: "", cpf: "", vinculo: "auxiliar", status: "pendente" };
  const [form, setForm] = useState(vazio);

  const carregar = useCallback(async () => {
    const { data } = await sb.from("auxiliar")
      .select("id,banca_id,permissionario_id,nome,cpf,vinculo,status,banca(numero),permissionario(nome)")
      .limit(1000);
    const rows = (data as unknown as Aux[]) ?? [];
    rows.sort((a, b) => Number(a.banca?.numero ?? 0) - Number(b.banca?.numero ?? 0));
    setLista(rows);
  }, []);

  useEffect(() => {
    sb.from("banca").select("id,numero").then(({ data }) => {
      const rows = (data as Banca[]) ?? [];
      rows.sort((a, b) => Number(a.numero) - Number(b.numero));
      setBancas(rows);
    });
    carregar();
  }, [carregar]);

  // conta auxiliares não-desligados por banca (para regra do art. 13)
  const porBanca = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of lista) if (a.banca_id && a.status !== "irregular") m[a.banca_id] = (m[a.banca_id] ?? 0) + 1;
    return m;
  }, [lista]);
  const bancasIrregulares = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of lista) if (a.banca_id) m[a.banca_id] = (m[a.banca_id] ?? 0) + 1;
    return lista.filter((a) => a.banca_id && m[a.banca_id] > 1).map((a) => a.banca?.numero).filter((v, i, arr) => v && arr.indexOf(v) === i);
  }, [lista]);

  const filtrados = useMemo(() => lista.filter((a) => {
    if (filtro === "incompletos" && validaCPF(a.cpf)) return false;
    if (filtro === "irregular" && a.status !== "irregular") return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return (a.nome ?? "").toLowerCase().includes(t) || (a.cpf ?? "").includes(q) || (a.banca?.numero ?? "").includes(q);
  }), [lista, q, filtro]);

  const kpis = {
    total: lista.length,
    regular: lista.filter((a) => a.status === "regular").length,
    incompletos: lista.filter((a) => !validaCPF(a.cpf)).length,
    irregular: lista.filter((a) => a.status === "irregular").length,
  };

  function editar(a: Aux) {
    setForm({ id: a.id, banca_id: a.banca_id ?? "", nome: a.nome ?? "", cpf: a.cpf ?? "", vinculo: a.vinculo ?? "auxiliar", status: a.status });
    setMsg(null);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!form.banca_id) { setMsg("Selecione a banca."); return; }
    if (!form.nome.trim()) { setMsg("Informe o nome do auxiliar."); return; }
    if (form.cpf && !validaCPF(form.cpf)) { setMsg("CPF inválido — confira os dígitos."); return; }

    // regra art. 13: 1 auxiliar por banca
    const outrosNaBanca = lista.filter((a) => a.banca_id === form.banca_id && a.id !== form.id && a.status !== "irregular").length;
    let status = form.status;
    if (outrosNaBanca >= 1 && status !== "irregular") {
      status = "irregular";
      setMsg("Atenção: esta banca já tem um auxiliar. Pelo art. 13 do Decreto só é permitido 1 — o registro foi marcado como IRREGULAR.");
    }

    const perm = await sb.from("permissionario").select("id").eq("banca_id", form.banca_id).maybeSingle();
    const payload = {
      banca_id: form.banca_id, permissionario_id: (perm.data as { id: string } | null)?.id ?? null,
      nome: form.nome.trim(), cpf: form.cpf || null, vinculo: form.vinculo, status,
    };
    const r = form.id
      ? await sb.from("auxiliar").update(payload).eq("id", form.id)
      : await sb.from("auxiliar").insert(payload);
    if (r.error) { setMsg("Erro ao salvar: " + r.error.message); return; }
    if (!msg) setMsg(form.id ? "Auxiliar atualizado." : "Auxiliar cadastrado.");
    setForm(vazio);
    carregar();
  }

  async function excluir(a: Aux) {
    if (!confirm(`Excluir o auxiliar ${a.nome} da banca ${a.banca?.numero}?`)) return;
    await sb.from("auxiliar").delete().eq("id", a.id);
    carregar();
  }

  return (
    <div className="grid gap-5">
      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        Art. 13 do Decreto nº 3/2025: cada permissionário pode ter <b>1 auxiliar</b>. Mais de um por banca é irregular
        (multa e, se reiterado, cassação). No recadastramento o auxiliar apresenta comprovante de residência e CTPS.
      </p>

      <div className="grid gap-3.5 md:grid-cols-4">
        <Kpi val={String(kpis.total)} label="auxiliares" cls="text-navy" />
        <Kpi val={String(kpis.regular)} label="regulares" cls="text-ok" />
        <Kpi val={String(kpis.incompletos)} label="sem CPF válido" cls="text-warn" />
        <Kpi val={String(kpis.irregular)} label="irregulares (art. 13)" cls="text-bad" />
      </div>

      {bancasIrregulares.length > 0 && (
        <p className="rounded-xl border border-[#e6b8b3] bg-[#fbeceb] p-3 text-[12.5px] text-[#8a2a20]">
          <b>Bancas com mais de um auxiliar (art. 13, §2º):</b> {bancasIrregulares.join(", ")}. Regularize mantendo apenas um.
        </p>
      )}

      <form onSubmit={salvar} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">{form.id ? "Editar auxiliar" : "Cadastrar auxiliar"}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Banca">
            <select className="inp" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
              <option value="">Selecione…</option>
              {bancas.map((b) => <option key={b.id} value={b.id}>Banca {b.numero}{porBanca[b.id] ? ` (já tem ${porBanca[b.id]})` : ""}</option>)}
            </select>
          </Campo>
          <Campo label="Nome do auxiliar"><input className="inp" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></Campo>
          <Campo label="CPF">
            <input className="inp" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
            {cpfComErro(form.cpf) && <span className="mt-1 block text-[11.5px] font-semibold text-bad">CPF inválido</span>}
          </Campo>
          <Campo label="Vínculo">
            <select className="inp" value={form.vinculo} onChange={(e) => setForm({ ...form, vinculo: e.target.value })}>
              {VINCULOS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Campo>
          <Campo label="Situação">
            <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pendente">Pendente (falta documento)</option>
              <option value="regular">Regular</option>
              <option value="irregular">Irregular</option>
            </select>
          </Campo>
        </div>
        {msg && <p className="mt-3 text-[13px] font-semibold text-navy">{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-accent px-5 py-2.5 font-bold text-white">{form.id ? "Salvar" : "Cadastrar"}</button>
          {form.id && <button type="button" onClick={() => { setForm(vazio); setMsg(null); }} className="rounded-lg border border-line px-4 py-2.5 font-semibold text-muted">Cancelar</button>}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input className="inp max-w-[240px]" placeholder="Buscar nome, CPF ou nº da banca…" value={q} onChange={(e) => setQ(e.target.value)} />
        {(["todos", "incompletos", "irregular"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${filtro === f ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"}`}>
            {f === "todos" ? "Todos" : f === "incompletos" ? "Sem CPF válido" : "Irregulares"}
          </button>
        ))}
        <span className="ml-auto text-[12.5px] text-muted">{filtrados.length} registro(s)</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Banca</th><th className="p-3">Permissionário (titular)</th><th className="p-3">Auxiliar</th>
              <th className="p-3">CPF</th><th className="p-3">Vínculo</th><th className="p-3">Situação</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="p-3 font-bold text-navy">{a.banca?.numero ?? "—"}</td>
                <td className="p-3 text-muted">{a.permissionario?.nome ?? "—"}</td>
                <td className="p-3">{a.nome}</td>
                <td className="p-3">
                  {a.cpf ? <span className={cpfComErro(a.cpf) ? "font-semibold text-bad" : ""}>{a.cpf}{cpfComErro(a.cpf) ? " ⚠" : ""}</span> : <span className="text-warn">— faltando</span>}
                </td>
                <td className="p-3 text-muted">{a.vinculo ?? "—"}</td>
                <td className="p-3">
                  <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize" style={{ background: (STATUS_COR[a.status] ?? "#888") + "22", color: STATUS_COR[a.status] ?? "#888" }}>{a.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => editar(a)} className="text-[12.5px] font-semibold text-brand">Editar</button>
                    <button onClick={() => excluir(a)} className="text-[12.5px] font-semibold text-bad">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-muted">Nenhum auxiliar encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}

function Kpi({ val, label, cls }: { val: string; label: string; cls: string }) {
  return (<div className="rounded-2xl border border-line bg-white p-4"><b className={`block text-2xl font-extrabold ${cls}`}>{val}</b><span className="text-[12.5px] text-muted">{label}</span></div>);
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>{children}</label>);
}
