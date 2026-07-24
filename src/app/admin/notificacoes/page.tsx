"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarTextoNotificacao } from "@/lib/notificacaoTexto";
import { gerarNotificacaoPDF, type Agente } from "@/lib/notificacaoPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";

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
  emitida: "Emitida", cumprida: "Cumprida", encaminhada: "Encaminhada", expirada: "Expirada",
};
const STATUS_PILL: Record<string, string> = {
  emitida: "bg-[#fbf1d6] text-[#8a6a0f]", cumprida: "bg-[#e5f3ea] text-ok",
  encaminhada: "bg-[#e9edf3] text-wait", expirada: "bg-[#fbe4e1] text-bad",
};

type Banca = { id: string; numero: string };
type Notif = {
  id: string; destinatario: string; tipo: string; numero: number;
  assunto: string | null; descricao: string | null; prazo: string | null;
  status: string; base_legal: string | null; numero_oficial: string | null; created_at: string;
  banca: { numero: string } | null; permissionario: { nome: string } | null;
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
  const [filtro, setFiltro] = useState("todos");
  const [salvando, setSalvando] = useState(false);
  const [permNome, setPermNome] = useState<string | null>(null);
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);

  const [form, setForm] = useState({
    destinatario: "permissionario", tipo: "irregularidade", origem: "concessionaria",
    banca_id: "", numero: "1", numero_oficial: "", assunto: "", descricao: "", base_legal: "", prazo: "",
  });

  const carregar = useCallback(async () => {
    const { data } = await sb
      .from("notificacao")
      .select("id,destinatario,tipo,numero,assunto,descricao,prazo,status,base_legal,numero_oficial,created_at,banca(numero),permissionario(nome)")
      .order("created_at", { ascending: false })
      .limit(100);
    setLista((data as unknown as Notif[]) ?? []);
  }, []);

  useEffect(() => {
    sb.from("banca").select("id,numero").then(({ data }) => {
      const rows = (data as Banca[]) ?? [];
      rows.sort((a, b) => Number(a.numero) - Number(b.numero));
      setBancas(rows);
    });
    sb.from("agente_publico")
      .select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo")
      .eq("ativo", true)
      .then(({ data }) => {
        const rows = (data as (Agente & { id: string; papel: string })[]) ?? [];
        setGestor(rows.find((r) => r.papel === "gestor_shopping") ?? null);
        setSecretario(rows.find((r) => r.papel === "secretario") ?? null);
      });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => {
        const url = (data?.valor as { url?: string } | null)?.url;
        setLogo(await carregarLogo(url));
      });
    carregar();
  }, [carregar]);

  // nome do permissionário da banca selecionada (para texto/PDF)
  useEffect(() => {
    if (form.destinatario !== "permissionario" || !form.banca_id) {
      setPermNome(null);
      return;
    }
    sb.from("permissionario").select("nome").eq("banca_id", form.banca_id).maybeSingle()
      .then(({ data }) => setPermNome((data as { nome: string } | null)?.nome ?? null));
  }, [form.banca_id, form.destinatario]);

  const bancaSel = bancas.find((b) => b.id === form.banca_id);

  const dados = useMemo(
    () => ({
      tipo: form.tipo, destinatario: form.destinatario,
      bancaNumero: bancaSel?.numero, permissionarioNome: permNome,
      prazo: form.prazo, assunto: form.assunto, descricao: form.descricao, baseLegal: form.base_legal,
    }),
    [form, bancaSel, permNome]
  );

  const preview = gerarTextoNotificacao(dados);

  async function emitir(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const payload: Record<string, unknown> = {
      destinatario: form.destinatario, tipo: form.tipo, origem: form.origem,
      numero: Number(form.numero) || 1, numero_oficial: form.numero_oficial || null,
      assunto: form.assunto || null, descricao: form.descricao || null,
      base_legal: form.base_legal || null, prazo: form.prazo || null, status: "emitida",
      gestor_id: gestor?.id ?? null, secretario_id: secretario?.id ?? null,
    };
    if (form.destinatario === "permissionario" && form.banca_id) payload.banca_id = form.banca_id;
    const { error } = await sb.from("notificacao").insert(payload);
    setSalvando(false);
    if (!error) {
      setForm({ ...form, assunto: "", descricao: "", base_legal: "", prazo: "", banca_id: "", numero_oficial: "" });
      carregar();
    }
  }

  function gerarPDF() {
    gerarNotificacaoPDF({ ...dados, numeroOficial: form.numero_oficial, gestor, secretario, logo });
  }

  function pdfDaLinha(n: Notif) {
    gerarNotificacaoPDF({
      tipo: n.tipo, destinatario: n.destinatario,
      bancaNumero: n.banca?.numero, permissionarioNome: n.permissionario?.nome,
      prazo: n.prazo, assunto: n.assunto, descricao: n.descricao, baseLegal: n.base_legal,
      numeroOficial: n.numero_oficial, gestor, secretario, logo,
    });
  }

  async function marcar(id: string, status: string) {
    await sb.from("notificacao").update({ status }).eq("id", id);
    carregar();
  }

  const filtrada = lista.filter((n) => filtro === "todos" || n.destinatario === filtro);
  const semAgentes = !gestor || !secretario;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* form */}
      <form onSubmit={emitir} className="h-max rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-extrabold text-navy">Emitir notificação</h2>

        <Campo label="Destinatário">
          <select className="inp" value={form.destinatario} onChange={(e) => setForm({ ...form, destinatario: e.target.value })}>
            {DESTINATARIOS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </Campo>

        {form.destinatario === "permissionario" && (
          <Campo label="Banca">
            <select className="inp" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
              <option value="">Selecione a banca…</option>
              {bancas.map((b) => <option key={b.id} value={b.id}>Banca {b.numero}</option>)}
            </select>
          </Campo>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Campo label="Tipo">
            <select className="inp" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </Campo>
          <Campo label="Nº (1–3)">
            <input type="number" min={1} max={3} className="inp" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          </Campo>
          <Campo label="Nº ofício">
            <input className="inp" placeholder="012" value={form.numero_oficial} onChange={(e) => setForm({ ...form, numero_oficial: e.target.value })} />
          </Campo>
        </div>

        <Campo label="Assunto">
          <input className="inp" value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} placeholder="Ex.: exposição de mercadoria em corredor" />
        </Campo>
        <Campo label="Descrição (detalhe da irregularidade / pedido)">
          <textarea className="inp min-h-[60px]" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Base legal">
            <input className="inp" value={form.base_legal} onChange={(e) => setForm({ ...form, base_legal: e.target.value })} placeholder="auto pelo Decreto" />
          </Campo>
          <Campo label="Prazo">
            <input type="date" className="inp" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
          </Campo>
        </div>

        <div className="mt-1 flex gap-2">
          <button disabled={salvando} className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-60">
            {salvando ? "Emitindo…" : "Emitir"}
          </button>
          <button type="button" onClick={gerarPDF} className="rounded-lg border border-navy px-4 py-2.5 font-bold text-navy">
            Gerar PDF
          </button>
        </div>
        {semAgentes && (
          <p className="mt-2 text-[12px] text-bad">
            Cadastre o Gestor e o Secretário em “Agentes &amp; Portarias” para as assinaturas saírem no PDF.
          </p>
        )}
      </form>

      {/* prévia + lista */}
      <div className="grid gap-5">
        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">Prévia — texto do Decreto</h3>
          <div className="space-y-2 text-[13.5px] leading-relaxed text-ink">
            {preview.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {[{ v: "todos", l: "Todas" }, ...DESTINATARIOS].map((o) => (
              <button key={o.v} onClick={() => setFiltro(o.v)}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${filtro === o.v ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"}`}>
                {o.l}
              </button>
            ))}
          </div>

          {filtrada.length === 0 ? (
            <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma notificação registrada ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-left text-xs text-white">
                    <th className="p-3">Destino</th><th className="p-3">Tipo / Assunto</th><th className="p-3">Nº</th>
                    <th className="p-3">Status</th><th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map((n) => (
                    <tr key={n.id} className="border-t border-line align-top">
                      <td className="p-3">
                        <b className="text-navy">
                          {n.destinatario === "permissionario" ? `Banca ${n.banca?.numero ?? "—"}`
                            : n.destinatario === "administradora" ? "Administradora" : "Poder público"}
                        </b>
                        {n.permissionario?.nome && <span className="block text-[12px] text-muted">{n.permissionario.nome}</span>}
                      </td>
                      <td className="p-3">
                        <span className="capitalize">{n.tipo}</span>
                        {n.assunto && <span className="block text-[12px] text-muted">{n.assunto}</span>}
                      </td>
                      <td className="p-3">{n.numero}/3</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${STATUS_PILL[n.status] ?? ""}`}>
                          {STATUS_LABEL[n.status] ?? n.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => pdfDaLinha(n)} className="text-left text-[12px] font-semibold text-brand">PDF</button>
                          {n.status === "emitida" && (
                            <button onClick={() => marcar(n.id, "cumprida")} className="text-left text-[12px] font-semibold text-ok">✓ cumprir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        :global(.inp) {
          width: 100%; border: 1px solid #eae2f2; border-radius: 9px;
          padding: 9px 11px; font-size: 14px; margin-bottom: 12px; background: #fff;
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
