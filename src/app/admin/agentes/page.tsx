"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";

const sb = createSupabase();

const PAPEIS = [
  { v: "gestor_shopping", l: "Gestor(a) do Shopping" },
  { v: "secretario", l: "Secretário(a) (SMDE&I)" },
  { v: "fiscal", l: "Fiscal / Licenciamento" },
  { v: "outro", l: "Outro" },
];
const papelL = (v: string) => PAPEIS.find((p) => p.v === v)?.l ?? v;

type Agente = {
  id: string;
  nome: string;
  cargo: string;
  papel: string;
  portaria_numero: string | null;
  portaria_data: string | null;
  ativo: boolean;
};

export default function AgentesPage() {
  return (
    <AdminGuard active="agentes" title="Agentes Públicos & Portarias">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [lista, setLista] = useState<Agente[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cargo: "",
    papel: "gestor_shopping",
    portaria_numero: "",
    portaria_data: "",
  });

  const carregar = useCallback(async () => {
    const { data } = await sb
      .from("agente_publico")
      .select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo")
      .order("papel");
    setLista((data as Agente[]) ?? []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.cargo) return;
    setSalvando(true);
    const { error } = await sb.from("agente_publico").insert({
      nome: form.nome,
      cargo: form.cargo,
      papel: form.papel,
      portaria_numero: form.portaria_numero || null,
      portaria_data: form.portaria_data || null,
    });
    setSalvando(false);
    if (!error) {
      setForm({ nome: "", cargo: "", papel: form.papel, portaria_numero: "", portaria_data: "" });
      carregar();
    }
  }

  async function remover(id: string) {
    await sb.from("agente_publico").delete().eq("id", id);
    carregar();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={salvar} className="h-max rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-extrabold text-navy">Cadastrar agente</h2>
        <Campo label="Papel">
          <select className="inp" value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
            {PAPEIS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.l}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Nome completo">
          <input className="inp" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Campo>
        <Campo label="Cargo (como assina)">
          <input
            className="inp"
            placeholder="Ex.: Secretário de Desenvolvimento Econômico e Inovação"
            value={form.cargo}
            onChange={(e) => setForm({ ...form, cargo: e.target.value })}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Portaria nº">
            <input className="inp" value={form.portaria_numero} onChange={(e) => setForm({ ...form, portaria_numero: e.target.value })} />
          </Campo>
          <Campo label="Data da portaria">
            <input type="date" className="inp" value={form.portaria_data} onChange={(e) => setForm({ ...form, portaria_data: e.target.value })} />
          </Campo>
        </div>
        <button disabled={salvando} className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-60">
          {salvando ? "Salvando…" : "Cadastrar agente"}
        </button>
        <p className="mt-3 text-[12px] text-muted">
          Base: art. 20 do Decreto — a fiscalização é designada por Portaria (1 servidor da pasta gestora e 1 de
          licenciamento/fiscalização). Gestor e Secretário assinam as notificações.
        </p>
      </form>

      <div>
        {lista.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
            Nenhum agente cadastrado. Cadastre ao menos o Gestor e o Secretário para assinar as notificações.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-left text-xs text-white">
                  <th className="p-3">Papel</th>
                  <th className="p-3">Nome / Cargo</th>
                  <th className="p-3">Portaria</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id} className="border-t border-line align-top">
                    <td className="p-3">
                      <span className="rounded-full bg-[#F1EAF8] px-2.5 py-1 text-[11.5px] font-bold text-navy">{papelL(a.papel)}</span>
                    </td>
                    <td className="p-3">
                      <b className="text-navy">{a.nome}</b>
                      <span className="block text-[12px] text-muted">{a.cargo}</span>
                    </td>
                    <td className="p-3 text-[13px]">
                      {a.portaria_numero ? (
                        <>
                          nº {a.portaria_numero}
                          {a.portaria_data && (
                            <span className="block text-[12px] text-muted">
                              {new Date(a.portaria_data).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <button onClick={() => remover(a.id)} className="text-[12px] font-semibold text-bad">
                        remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border: 1px solid #eae2f2;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 14px;
          background: #fff;
          margin-bottom: 12px;
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
