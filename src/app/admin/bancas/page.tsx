"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { STATUS_LABEL, STATUS_COLOR, type BancaStatus } from "@/lib/types";
import { gerarRelatorioCadastroBancas, type ItemCadastro } from "@/lib/relatorioSituacoesPdf";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";
import type { Agente } from "@/lib/notificacaoPdf";
import { cpfComErro } from "@/lib/cpf";

const sb = createSupabase();
const STATUSES: BancaStatus[] = ["ocupada", "vaga", "aguardando_sorteio", "em_regularizacao", "em_cassacao", "lacrada"];
const PAVL: Record<string, string> = { terreo: "Térreo", pav1: "1º Pav.", pav2: "2º Pav." };

type Row = { id: string; numero: string; pavimento: string; status: BancaStatus; segmento_id: string | null };
type Seg = { id: string; nome: string };
type PermInfo = { permId: string; nome: string; status: string; cpf: string | null; rg: string | null; endereco: string | null; bairro: string | null; auxiliar: string | null };

export default function BancasPage() {
  return (
    <AdminGuard active="bancas" title="Bancas — situação e segmento">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [rows, setRows] = useState<Row[]>([]);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [perm, setPerm] = useState<Record<string, PermInfo>>({});
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("todos");

  const carregar = useCallback(async () => {
    const { data } = await sb.from("banca").select("id,numero,pavimento,status,segmento_id");
    const rs = (data as Row[]) ?? [];
    rs.sort((a, b) => Number(a.numero) - Number(b.numero));
    setRows(rs);
    const { data: ps } = await sb.from("permissionario").select("id,banca_id,nome,status,cpf,rg,endereco,bairro");
    const { data: auxs } = await sb.from("auxiliar").select("permissionario_id,nome");
    const auxMap: Record<string, string> = {};
    for (const a of (auxs as { permissionario_id: string; nome: string }[]) ?? []) if (a.permissionario_id && !auxMap[a.permissionario_id]) auxMap[a.permissionario_id] = a.nome;
    const map: Record<string, PermInfo> = {};
    for (const p of (ps as { id: string; banca_id: string | null; nome: string; status: string; cpf: string | null; rg: string | null; endereco: string | null; bairro: string | null }[]) ?? [])
      if (p.banca_id) map[p.banca_id] = { permId: p.id, nome: p.nome, status: p.status, cpf: p.cpf, rg: p.rg, endereco: p.endereco, bairro: p.bairro, auxiliar: auxMap[p.id] ?? null };
    setPerm(map);
  }, []);

  useEffect(() => {
    sb.from("segmento").select("id,nome").order("ordem").then(({ data }) => setSegs((data as Seg[]) ?? []));
    sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true).then(({ data }) => {
      const ags = (data as (Agente & { id: string; papel: string })[]) ?? [];
      setGestor(ags.find((x) => x.papel === "gestor_shopping") ?? null);
      setSecretario(ags.find((x) => x.papel === "secretario") ?? null);
    });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
    carregar();
  }, [carregar]);

  function gerarRelatorio() {
    const porStatus = new Map<BancaStatus, ItemCadastro[]>();
    STATUSES.forEach((s) => porStatus.set(s, []));
    rows.forEach((r) => {
      const p = perm[r.id];
      porStatus.get(r.status)?.push({
        banca: r.numero,
        nome: p?.nome ?? (r.status === "vaga" || r.status === "aguardando_sorteio" ? "(banca vaga)" : "—"),
        cpf: p?.cpf ?? null,
        cpfInvalido: cpfComErro(p?.cpf),
        rg: p?.rg ?? null,
        endereco: p?.endereco ?? null,
        bairro: p?.bairro ?? null,
        auxiliar: p?.auxiliar ?? null,
      });
    });
    const secoes = STATUSES.filter((s) => (porStatus.get(s)?.length ?? 0) > 0).map((s) => ({ titulo: STATUS_LABEL[s], itens: porStatus.get(s)! }));
    gerarRelatorioCadastroBancas({ secoes, titulo: "RELATÓRIO DE CADASTRO DAS BANCAS — SHOPPING INDEPENDÊNCIA", arquivo: "Relatorio_Bancas", gestor, secretario, logo });
  }

  async function setStatus(id: string, status: string) {
    await sb.from("banca").update({ status }).eq("id", id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: status as BancaStatus } : r)));
  }
  async function setSeg(id: string, segmento_id: string) {
    const v = segmento_id || null;
    await sb.from("banca").update({ segmento_id: v }).eq("id", id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, segmento_id: v } : r)));
  }

  const filtered = useMemo(
    () => rows.filter((r) => (fStatus === "todos" || r.status === fStatus) && (!q || r.numero.includes(q))),
    [rows, fStatus, q]
  );
  const cpfErros = rows.filter((r) => cpfComErro(perm[r.id]?.cpf)).length;

  return (
    <div className="grid gap-5">
      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        Altere aqui a <b>situação</b> e o <b>segmento</b> de cada banca. A cor no mapa público muda automaticamente
        assim que a página é recarregada.
      </p>

      {cpfErros > 0 && (
        <p className="rounded-2xl border border-[#f0c0c0] bg-[#fbe4e1] p-3 text-[13px] font-semibold text-bad">
          ⚠ {cpfErros} CPF(s) com erro de validação — veja o ícone ⚠ na coluna Permissionário. Passe o mouse para ver o CPF.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input className="inp max-w-[160px]" placeholder="Buscar nº…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="inp max-w-[240px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <span className="self-center text-[13px] text-muted">{filtered.length} banca(s)</span>
        <button onClick={gerarRelatorio} className="ml-auto rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy2">
          Relatório geral (PDF)
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-navy text-left text-xs text-white">
              <th className="p-3">Banca</th><th className="p-3">Pavimento</th><th className="p-3">Permissionário</th><th className="p-3">Situação</th><th className="p-3">Segmento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="p-3 font-bold text-navy">{r.numero}</td>
                <td className="p-3">{PAVL[r.pavimento] ?? r.pavimento}</td>
                <td className="p-3">
                  {perm[r.id]?.nome ?? "—"}
                  {cpfComErro(perm[r.id]?.cpf) && (
                    <span title={`CPF inválido: ${perm[r.id]?.cpf}`} className="ml-1 cursor-help font-bold text-bad">⚠</span>
                  )}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-2">
                    <i className="h-3 w-3 shrink-0 rounded" style={{ background: STATUS_COLOR[r.status] }} />
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="rounded-lg border border-line px-2 py-1 text-[12.5px] font-semibold text-navy">
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </span>
                </td>
                <td className="p-3">
                  <select value={r.segmento_id ?? ""} onChange={(e) => setSeg(r.id, e.target.value)} className="rounded-lg border border-line px-2 py-1 text-[12.5px]">
                    <option value="">—</option>
                    {segs.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`:global(.inp){border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}
