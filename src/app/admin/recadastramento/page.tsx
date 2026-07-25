"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { gerarNotificacaoPDF, type Agente } from "@/lib/notificacaoPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";

const sb = createSupabase();

const hoje = new Date();
const anoAtual = hoje.getFullYear();
function competencias() {
  const out: { v: string; l: string }[] = [];
  for (let y = anoAtual + 1; y >= 2022; y--) {
    out.push({ v: `${y}-2`, l: `2º semestre ${y}` });
    out.push({ v: `${y}-1`, l: `1º semestre ${y}` });
  }
  return out;
}

type Perm = { id: string; nome: string; banca_id: string; banca: { numero: string } | null };
type Rec = { id: string; banca_id: string; compareceu: boolean; pendencias: string | null; tipo: string };

export default function RecadPage() {
  return (
    <AdminGuard active="recadastramento" title="Recadastramento semestral">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const semDefault = `${anoAtual}-${hoje.getMonth() < 6 ? 1 : 2}`;
  const [comp, setComp] = useState(semDefault);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [recs, setRecs] = useState<Record<string, Rec>>({});
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [q, setQ] = useState("");

  const carregarRecs = useCallback(async (competencia: string) => {
    const { data } = await sb.from("recadastramento").select("id,banca_id,compareceu,pendencias,tipo").eq("competencia", competencia);
    const map: Record<string, Rec> = {};
    for (const r of (data as Rec[]) ?? []) map[r.banca_id] = r;
    setRecs(map);
  }, []);

  useEffect(() => {
    sb.from("permissionario").select("id,nome,banca_id,banca(numero)").not("banca_id", "is", null)
      .then(({ data }) => {
        const rows = ((data as unknown as Perm[]) ?? []).filter((p) => p.banca);
        rows.sort((a, b) => Number(a.banca?.numero) - Number(b.banca?.numero));
        setPerms(rows);
      });
    sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true).then(({ data }) => {
      const ags = (data as (Agente & { id: string; papel: string })[]) ?? [];
      setGestor(ags.find((x) => x.papel === "gestor_shopping") ?? null);
      setSecretario(ags.find((x) => x.papel === "secretario") ?? null);
    });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
  }, []);

  useEffect(() => { carregarRecs(comp); }, [comp, carregarRecs]);

  async function marcar(p: Perm, compareceu: boolean) {
    const existente = recs[p.banca_id];
    const payload = {
      banca_id: p.banca_id, permissionario_id: p.id, competencia: comp,
      compareceu, data: new Date().toISOString().slice(0, 10), tipo: "ordinario",
    };
    if (existente) await sb.from("recadastramento").update({ compareceu, data: payload.data }).eq("id", existente.id);
    else await sb.from("recadastramento").insert(payload);
    carregarRecs(comp);
  }
  async function setPend(bancaId: string, pendencias: string) {
    const ex = recs[bancaId];
    if (ex) await sb.from("recadastramento").update({ pendencias }).eq("id", ex.id);
  }

  async function notificar(p: Perm) {
    const banca = p.banca?.numero;
    const assunto = `Convocação para recadastramento — ${comp}`;
    const base = "Art. 12 do Decreto";
    await sb.from("notificacao").insert({
      destinatario: "permissionario", tipo: "recadastramento", origem: "concessionaria",
      banca_id: p.banca_id, numero: 1, assunto, base_legal: base, status: "emitida",
      gestor_id: gestor?.id ?? null, secretario_id: secretario?.id ?? null,
    });
    gerarNotificacaoPDF({ tipo: "recadastramento", destinatario: "permissionario", bancaNumero: banca, permissionarioNome: p.nome, assunto, baseLegal: base, gestor, secretario, logo });
  }

  const filtrados = useMemo(() => perms.filter((p) => !q || (p.banca?.numero ?? "").includes(q) || p.nome.toLowerCase().includes(q.toLowerCase())), [perms, q]);
  const compareceram = perms.filter((p) => recs[p.banca_id]?.compareceu).length;
  const marcados = perms.filter((p) => recs[p.banca_id]).length;
  const faltantes = marcados - compareceram;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[13px] font-bold text-navy">Semestre:</label>
        <select className="inp max-w-[220px]" value={comp} onChange={(e) => setComp(e.target.value)}>
          {competencias().map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <input className="inp max-w-[200px]" placeholder="Buscar nº ou nome…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3.5 md:grid-cols-4">
        <Kpi val={String(perms.length)} label="permissionários" cls="text-navy" />
        <Kpi val={String(compareceram)} label="compareceram" cls="text-ok" />
        <Kpi val={String(faltantes)} label="registrados como faltantes" cls="text-warn" />
        <Kpi val={String(perms.length - marcados)} label="ainda não registrados" cls="text-muted" />
      </div>

      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        Marque quem <b>compareceu</b> ao recadastramento do semestre. Para os faltantes, use “Notificar” (art. 12 do Decreto) —
        a ausência em 2 recadastramentos consecutivos enseja procedimento de cassação.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Banca</th><th className="p-3">Permissionário</th><th className="p-3">Comparecimento</th><th className="p-3">Pendências</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const rec = recs[p.banca_id];
              const compareceu = rec?.compareceu === true;
              const faltou = rec && rec.compareceu === false;
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="p-3 font-bold text-navy">{p.banca?.numero}</td>
                  <td className="p-3">{p.nome}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => marcar(p, true)} className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ${compareceu ? "bg-ok text-white" : "border border-line text-muted"}`}>Compareceu</button>
                      <button onClick={() => marcar(p, false)} className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ${faltou ? "bg-bad text-white" : "border border-line text-muted"}`}>Faltou</button>
                    </div>
                  </td>
                  <td className="p-3">
                    <input defaultValue={rec?.pendencias ?? ""} onBlur={(e) => setPend(p.banca_id, e.target.value)} placeholder="—" className="w-full rounded-lg border border-line px-2 py-1 text-[12.5px]" />
                  </td>
                  <td className="p-3">
                    <button onClick={() => notificar(p)} className="text-[12px] font-semibold text-brand">Notificar + PDF</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`:global(.inp){border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
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
