"use client";

import { useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import { cpfComErro } from "@/lib/cpf";

const sb = createSupabase();

const STATUS_PERM = [
  { v: "ativo", l: "Ativo" },
  { v: "falecido", l: "Falecido" },
  { v: "inadimplente", l: "Inadimplente" },
  { v: "nao_recadastrado", l: "Não recadastrado" },
  { v: "em_cassacao", l: "Em cassação" },
  { v: "desligado", l: "Desligado" },
];

type F = {
  nome: string; cpf: string; rg: string; endereco: string; bairro: string; cidade: string;
  data_autorizacao: string; mei: boolean; status: string; pendencias: string; auxNome: string; auxCpf: string;
};

export default function PermEditModal({ bancaId, numero, onClose, onSaved }: {
  bancaId: string; numero: string; onClose: () => void; onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [permId, setPermId] = useState<string | null>(null);
  const [auxId, setAuxId] = useState<string | null>(null);
  const [f, setF] = useState<F>({
    nome: "", cpf: "", rg: "", endereco: "", bairro: "", cidade: "Santa Maria",
    data_autorizacao: "", mei: false, status: "ativo", pendencias: "", auxNome: "", auxCpf: "",
  });

  useEffect(() => {
    (async () => {
      const { data: p } = await sb.from("permissionario").select("*").eq("banca_id", bancaId).maybeSingle();
      if (p) {
        setPermId(p.id);
        const { data: a } = await sb.from("auxiliar").select("id,nome,cpf").eq("permissionario_id", p.id).maybeSingle();
        setAuxId((a as { id: string } | null)?.id ?? null);
        setF({
          nome: p.nome ?? "", cpf: p.cpf ?? "", rg: p.rg ?? "", endereco: p.endereco ?? "", bairro: p.bairro ?? "",
          cidade: p.cidade ?? "Santa Maria", data_autorizacao: p.data_autorizacao ?? "", mei: !!p.mei,
          status: p.status ?? "ativo", pendencias: p.pendencias ?? "",
          auxNome: (a as { nome?: string } | null)?.nome ?? "", auxCpf: (a as { cpf?: string } | null)?.cpf ?? "",
        });
      }
      setLoading(false);
    })();
  }, [bancaId]);

  async function salvar() {
    if (!f.nome.trim()) { setMsg("Informe o nome do permissionário."); return; }
    setSaving(true); setMsg(null);
    const payload = {
      nome: f.nome.trim(), cpf: f.cpf || null, rg: f.rg || null, endereco: f.endereco || null,
      bairro: f.bairro || null, cidade: f.cidade || null, data_autorizacao: f.data_autorizacao || null,
      mei: f.mei, status: f.status, pendencias: f.pendencias || null,
    };
    let pid = permId;
    if (permId) {
      await sb.from("permissionario").update(payload).eq("id", permId);
    } else {
      const { data } = await sb.from("permissionario").insert({ ...payload, banca_id: bancaId }).select("id").maybeSingle();
      pid = (data as { id: string } | null)?.id ?? null;
    }
    if (f.auxNome.trim() && pid) {
      if (auxId) await sb.from("auxiliar").update({ nome: f.auxNome.trim(), cpf: f.auxCpf || null }).eq("id", auxId);
      else await sb.from("auxiliar").insert({ permissionario_id: pid, banca_id: bancaId, nome: f.auxNome.trim(), cpf: f.auxCpf || null, status: "pendente" });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(20,10,30,.55)] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-navy">Banca {numero} — cadastro do permissionário</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted">×</button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-muted">Carregando…</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Campo label="Nome completo"><input className="inp" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
              <Campo label="Status">
                <select className="inp" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                  {STATUS_PERM.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </Campo>
              <Campo label={<>CPF {cpfComErro(f.cpf) && <span className="text-bad">⚠ inválido</span>}</>}>
                <input className="inp" value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} placeholder="000.000.000-00" />
              </Campo>
              <Campo label="RG"><input className="inp" value={f.rg} onChange={(e) => setF({ ...f, rg: e.target.value })} /></Campo>
              <Campo label="Endereço"><input className="inp" value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></Campo>
              <Campo label="Bairro"><input className="inp" value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })} /></Campo>
              <Campo label="Cidade"><input className="inp" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></Campo>
              <Campo label="Data da autorização"><input type="date" className="inp" value={f.data_autorizacao} onChange={(e) => setF({ ...f, data_autorizacao: e.target.value })} /></Campo>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={f.mei} onChange={(e) => setF({ ...f, mei: e.target.checked })} /> É Microempreendedor Individual (MEI)
            </label>

            <Campo label="Pendências / observações"><textarea className="inp min-h-[54px]" value={f.pendencias} onChange={(e) => setF({ ...f, pendencias: e.target.value })} /></Campo>

            <div className="mt-4 rounded-xl border border-line bg-[#F7F3FB] p-3">
              <p className="mb-2 text-[12.5px] font-bold text-navy">Auxiliar (1 por banca)</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Campo label="Nome do auxiliar"><input className="inp" value={f.auxNome} onChange={(e) => setF({ ...f, auxNome: e.target.value })} /></Campo>
                <Campo label={<>CPF do auxiliar {cpfComErro(f.auxCpf) && <span className="text-bad">⚠</span>}</>}>
                  <input className="inp" value={f.auxCpf} onChange={(e) => setF({ ...f, auxCpf: e.target.value })} />
                </Campo>
              </div>
            </div>

            {msg && <p className="mt-3 text-[13px] font-semibold text-bad">{msg}</p>}
            <div className="mt-4 flex gap-2">
              <button disabled={saving} onClick={salvar} className="rounded-lg bg-accent px-5 py-2.5 font-bold text-white disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={onClose} className="rounded-lg border border-line px-5 py-2.5 font-semibold text-muted">Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>
      {children}
    </label>
  );
}
