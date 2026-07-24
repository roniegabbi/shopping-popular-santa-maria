"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();

const DESTINATARIOS = [
  { v: "permissionario", l: "Permissionário" },
  { v: "administradora", l: "Administradora (concessionária)" },
  { v: "poder_publico", l: "Poder público" },
];
const TIPOS = [
  { v: "irregularidade", l: "Irregularidade" },
  { v: "inadimplencia", l: "Inadimplência" },
  { v: "recadastramento", l: "Recadastramento" },
  { v: "cassacao", l: "Cassação" },
  { v: "recolhimento", l: "Recolhimento" },
];
const STATUS_LABEL: Record<string, string> = {
  emitida: "Emitida",
  cumprida: "Cumprida",
  encaminhada: "Encaminhada",
  expirada: "Expirada",
};
const STATUS_PILL: Record<string, string> = {
  emitida: "bg-[#fbf1d6] text-[#8a6a0f]",
  cumprida: "bg-[#e5f3ea] text-ok",
  encaminhada: "bg-[#e9edf3] text-wait",
  expirada: "bg-[#fbe4e1] text-bad",
};

type Banca = { id: string; numero: string };
type Notif = {
  id: string;
  destinatario: string;
  tipo: string;
  numero: number;
  assunto: string | null;
  prazo: string | null;
  status: string;
  base_legal: string | null;
  created_at: string;
  banca: { numero: string } | null;
  permissionario: { nome: string } | null;
};

export default function NotificacoesPage() {
  return (
    <AdminGuard active="notificacoes" title="Notificações">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [lista, setLista] = useState<Notif[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    destinatario: "permissionario",
    tipo: "irregularidade",
    origem: "concessionaria",
    banca_id: "",
    numero: "1",
    assunto: "",
    descricao: "",
    base_legal: "",
    prazo: "",
  });

  const carregar = useCallback(async () => {
    const { data } = await sb
      .from("notificacao")
      .select(
        "id,destinatario,tipo,numero,assunto,prazo,status,base_legal,created_at,banca(numero),permissionario(nome)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setLista((data as unknown as Notif[]) ?? []);
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

  async function emitir(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const payload: Record<string, unknown> = {
      destinatario: form.destinatario,
      tipo: form.tipo,
      origem: form.origem,
      numero: Number(form.numero) || 1,
      assunto: form.assunto || null,
      descricao: form.descricao || null,
      base_legal: form.base_legal || null,
      prazo: form.prazo || null,
      status: "emitida",
    };
    if (form.destinatario === "permissionario" && form.banca_id) payload.banca_id = form.banca_id;
    const { error } = await sb.from("notificacao").insert(payload);
    setSalvando(false);
    if (!error) {
      setForm({ ...form, assunto: "", descricao: "", base_legal: "", prazo: "", banca_id: "" });
      carregar();
    }
  }

  async function marcar(id: string, status: string) {
    await sb.from("notificacao").update({ status }).eq("id", id);
    carregar();
  }

  const filtrada = lista.filter((n) => filtro === "todos" || n.destinatario === filtro);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* form */}
      <form onSubmit={emitir} className="h-max rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-extrabold text-navy">Emitir notificação</h2>

        <Campo label="Destinatário">
          <select
            className="input"
            value={form.destinatario}
            onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
          >
            {DESTINATARIOS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </Campo>

        {form.destinatario === "permissionario" && (
          <Campo label="Banca">
            <select
              className="input"
              value={form.banca_id}
              onChange={(e) => setForm({ ...form, banca_id: e.target.value })}
            >
              <option value="">Selecione a banca…</option>
              {bancas.map((b) => (
                <option key={b.id} value={b.id}>
                  Banca {b.numero}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tipo">
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Nº (1–3)">
            <input
              type="number"
              min={1}
              max={3}
              className="input"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
            />
          </Campo>
        </div>

        <Campo label="Origem">
          <select className="input" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
            <option value="concessionaria">Concessionária</option>
            <option value="poder_publico">Poder público</option>
          </select>
        </Campo>

        <Campo label="Assunto">
          <input
            className="input"
            value={form.assunto}
            onChange={(e) => setForm({ ...form, assunto: e.target.value })}
            placeholder="Ex.: exposição de mercadoria em corredor"
          />
        </Campo>

        <Campo label="Descrição">
          <textarea
            className="input min-h-[70px]"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Base legal">
            <input
              className="input"
              value={form.base_legal}
              onChange={(e) => setForm({ ...form, base_legal: e.target.value })}
              placeholder="Art. 17, V"
            />
          </Campo>
          <Campo label="Prazo">
            <input type="date" className="input" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
          </Campo>
        </div>

        <button
          disabled={salvando}
          className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-60"
        >
          {salvando ? "Emitindo…" : "Emitir notificação"}
        </button>
      </form>

      {/* lista */}
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {[{ v: "todos", l: "Todas" }, ...DESTINATARIOS].map((o) => (
            <button
              key={o.v}
              onClick={() => setFiltro(o.v)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                filtro === o.v ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>

        {filtrada.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
            Nenhuma notificação registrada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-left text-xs text-white">
                  <th className="p-3">Destino</th>
                  <th className="p-3">Tipo / Assunto</th>
                  <th className="p-3">Nº</th>
                  <th className="p-3">Prazo</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map((n) => (
                  <tr key={n.id} className="border-t border-line align-top">
                    <td className="p-3">
                      <b className="text-navy">
                        {n.destinatario === "permissionario"
                          ? `Banca ${n.banca?.numero ?? "—"}`
                          : n.destinatario === "administradora"
                          ? "Administradora"
                          : "Poder público"}
                      </b>
                      {n.permissionario?.nome && (
                        <span className="block text-[12px] text-muted">{n.permissionario.nome}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="capitalize">{n.tipo}</span>
                      {n.assunto && <span className="block text-[12px] text-muted">{n.assunto}</span>}
                      {n.base_legal && <span className="block text-[11px] text-muted">{n.base_legal}</span>}
                    </td>
                    <td className="p-3">{n.numero}/3</td>
                    <td className="p-3">{n.prazo ? new Date(n.prazo).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${STATUS_PILL[n.status] ?? ""}`}>
                        {STATUS_LABEL[n.status] ?? n.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {n.status === "emitida" && (
                        <div className="flex gap-2">
                          <button onClick={() => marcar(n.id, "cumprida")} className="text-[12px] font-semibold text-ok">
                            ✓ cumprir
                          </button>
                          <button onClick={() => marcar(n.id, "encaminhada")} className="text-[12px] font-semibold text-wait">
                            encaminhar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid #eae2f2;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 14px;
          margin-bottom: 12px;
          background: #fff;
        }
      `}</style>
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
