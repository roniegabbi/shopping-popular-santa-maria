"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";
import type { Agente } from "@/lib/notificacaoPdf";
import { gerarFichaVistoria, gerarOficioVistoria, type ItemVistoria } from "@/lib/vistoriaPdf";
import VistoriaChart from "./VistoriaChart";

const sb = createSupabase();
const hojeISO = () => new Date().toISOString().slice(0, 10);

const CHECKLIST_BANCA = [
  "Integridade estrutural do estande/módulo",
  "Instalações elétricas sem modificação irregular (art. 17, I)",
  "Climatização/ar-condicionado sem intervenção indevida (art. 17, II)",
  "Mercadorias dentro dos limites do estande (art. 5º e 17, V)",
  "Higiene e conservação do espaço (art. 16, II)",
  "Placa de identificação afixada (art. 15)",
  "Ramo de atividade conforme o autorizado (art. 17, III e VI)",
  "Banca em funcionamento regular (art. 6º)",
  "Ausência de materiais proibidos/inflamáveis (art. 17, X a XIV)",
];
const CHECKLIST_GERAL = [
  "Estrutura predial — paredes, piso, teto e cobertura",
  "Instalações elétricas comuns e quadros de distribuição",
  "Sistema de climatização / ar-condicionado central (art. 17, II)",
  "Elevadores em funcionamento e com manutenção",
  "Sanitários e instalações hidráulicas",
  "Iluminação das áreas comuns e de circulação",
  "Sinalização, editais e mapas afixados (art. 7º, §2º)",
  "Extintores e segurança contra incêndio",
  "Limpeza e coleta de lixo (art. 7º, §7º e §8º)",
  "Segurança patrimonial física/remota (art. 7º, §6º)",
  "Ponto de recepção com atendimento presencial (art. 7º, §5º)",
  "Áreas de circulação desobstruídas",
];
const checklistPara = (tipo: string) => (tipo === "banca" ? CHECKLIST_BANCA : CHECKLIST_GERAL);
const TIPO_LABEL: Record<string, string> = { banca: "Estande/módulo", geral: "Vistoria geral do Shopping", estrutural: "Estrutural / predial", area_comum: "Área comum" };
const NOTAS = [
  { v: "1", l: "1", c: "#C0392B", t: "Crítico" },
  { v: "2", l: "2", c: "#E07B39", t: "Ruim" },
  { v: "3", l: "3", c: "#C8961E", t: "Regular" },
  { v: "4", l: "4", c: "#4C9A4C", t: "Bom" },
  { v: "5", l: "5", c: "#2E8B57", t: "Ótimo" },
];
const NA = { v: "na", l: "N/A", c: "#6E5C82", t: "Não se aplica" };
const ESCALA = [...NOTAS, NA];
const notaCor = (v: string) => ESCALA.find((n) => n.v === v)?.c ?? "#6E5C82";
function media(itens: ItemVistoria[]): number | null {
  const nums = itens.map((i) => Number(i.situacao)).filter((n) => n >= 1 && n <= 5);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

type Banca = { id: string; numero: string };
type Vist = {
  id: string; numero: number; ano: number; data: string; tipo: string; banca_id: string | null;
  status: string; resultado: string | null; itens: ItemVistoria[]; observacoes: string | null;
  banca: { numero: string } | null;
};

export default function VistoriasPage() {
  return (
    <AdminGuard active="vistorias" title="Vistorias — ficha técnica e checklist">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [lista, setLista] = useState<Vist[]>([]);
  const [gestor, setGestor] = useState<(Agente & { id: string }) | null>(null);
  const [secretario, setSecretario] = useState<(Agente & { id: string }) | null>(null);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [form, setForm] = useState({ tipo: "banca", banca_id: "", data: hojeISO() });
  const [aberta, setAberta] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<{ itens: ItemVistoria[]; observacoes: string }>({ itens: [], observacoes: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data } = await sb.from("vistoria").select("id,numero,ano,data,tipo,banca_id,status,resultado,itens,observacoes,banca(numero)").order("numero", { ascending: false });
    setLista((data as unknown as Vist[]) ?? []);
  }, []);

  useEffect(() => {
    sb.from("banca").select("id,numero").then(({ data }) => {
      const rows = (data as Banca[]) ?? [];
      rows.sort((a, b) => Number(a.numero) - Number(b.numero));
      setBancas(rows);
    });
    sb.from("permissionario").select("nome,banca_id").not("banca_id", "is", null).then(({ data }) => {
      const m: Record<string, string> = {};
      for (const p of (data as { nome: string; banca_id: string }[]) ?? []) m[p.banca_id] = p.nome;
      setNomes(m);
    });
    sb.from("agente_publico").select("id,nome,cargo,papel,portaria_numero,portaria_data,ativo").eq("ativo", true).then(({ data }) => {
      const ags = (data as (Agente & { id: string; papel: string })[]) ?? [];
      setGestor(ags.find((x) => x.papel === "gestor_shopping") ?? null);
      setSecretario(ags.find((x) => x.papel === "secretario") ?? null);
    });
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
    carregar();
  }, [carregar]);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (form.tipo === "banca" && !form.banca_id) { setMsg("Selecione a banca."); return; }
    const itens: ItemVistoria[] = checklistPara(form.tipo).map((label) => ({ label, situacao: "pendente", obs: "" }));
    const { error } = await sb.from("vistoria").insert({
      tipo: form.tipo, banca_id: form.tipo === "banca" ? form.banca_id : null, data: form.data, status: "aberta", itens,
    });
    if (error) { setMsg("Erro: " + error.message); return; }
    setMsg("Vistoria aberta. Gere a Ficha (PDF) para levar a campo.");
    setForm({ ...form, banca_id: "" });
    carregar();
  }

  function preencher(v: Vist) {
    if (aberta === v.id) { setAberta(null); return; }
    setAberta(v.id);
    const base = (v.itens && v.itens.length ? v.itens : checklistPara(v.tipo).map((label) => ({ label, situacao: "pendente", obs: "" })));
    setRascunho({ itens: base.map((i) => ({ ...i, obs: i.obs ?? "" })), observacoes: v.observacoes ?? "" });
  }

  async function salvar(v: Vist) {
    const itens = rascunho.itens;
    const temNC = itens.some((i) => i.situacao === "1" || i.situacao === "2");
    const completo = itens.every((i) => i.situacao !== "pendente");
    const resultado = temNC ? "irregular" : completo ? "conforme" : null;
    await sb.from("vistoria").update({ itens, observacoes: rascunho.observacoes || null, resultado, status: completo ? "realizada" : "aberta" }).eq("id", v.id);
    setAberta(null);
    carregar();
  }

  async function excluir(v: Vist) {
    if (!confirm(`Excluir a vistoria nº ${v.numero}/${v.ano}?`)) return;
    await sb.from("vistoria").delete().eq("id", v.id);
    carregar();
  }

  const dados = (v: Vist, itens?: ItemVistoria[]) => ({
    numero: v.numero, ano: v.ano, data: v.data, tipo: v.tipo,
    banca: v.banca?.numero ?? null, permissionario: v.banca_id ? nomes[v.banca_id] ?? null : null,
    itens: itens ?? v.itens ?? [], observacoes: v.observacoes, gestor, secretario, logo,
  });

  const avaliadas = lista.filter((v) => media(v.itens ?? []) !== null);
  const pontos = [...avaliadas].sort((a, b) => a.data.localeCompare(b.data))
    .map((v) => ({ data: v.data, media: media(v.itens ?? [])!, rotulo: v.tipo === "banca" ? `Banca ${v.banca?.numero ?? ""}` : TIPO_LABEL[v.tipo] }));
  const geral = lista.filter((v) => v.tipo !== "banca").sort((a, b) => b.data.localeCompare(a.data))[0];
  const diasDesdeGeral = geral ? Math.round((Date.now() - new Date(geral.data + "T00:00:00").getTime()) / 86400000) : null;
  const vistoriaVencida = diasDesdeGeral === null || diasDesdeGeral > 30;

  return (
    <div className="grid gap-5">
      <p className="rounded-2xl border border-[#f0d3ba] bg-[#fff3e9] p-3 text-[13px] text-[#9a4a12]">
        Abra a vistoria e gere a <b>Ficha Técnica (PDF)</b> numerada para levar a campo. Na volta, avalie cada item na
        escala <b>1 a 5</b> (1 Crítico · 2 Ruim · 3 Regular · 4 Bom · 5 Ótimo) ou <b>N/A</b>. Itens com nota <b>≤ 2</b> viram
        irregularidade e permitem emitir a notificação — ao permissionário (uso) ou à concessionária (estrutura, art. 7º §4º).
      </p>

      <form onSubmit={abrir} className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-extrabold text-navy">Abrir vistoria</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Tipo">
            <select className="inp" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="banca">Estande/módulo (banca)</option>
              <option value="geral">Vistoria geral do Shopping</option>
              <option value="estrutural">Estrutural / predial</option>
              <option value="area_comum">Área comum</option>
            </select>
          </Campo>
          {form.tipo === "banca" && (
            <Campo label="Banca">
              <select className="inp" value={form.banca_id} onChange={(e) => setForm({ ...form, banca_id: e.target.value })}>
                <option value="">Selecione…</option>
                {bancas.map((b) => <option key={b.id} value={b.id}>Banca {b.numero}</option>)}
              </select>
            </Campo>
          )}
          <Campo label="Data"><input type="date" className="inp" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Campo>
        </div>
        {msg && <p className="mt-3 text-[13px] font-semibold text-navy">{msg}</p>}
        <button className="mt-4 rounded-lg bg-accent px-5 py-2.5 font-bold text-white">Abrir vistoria</button>
      </form>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-3" style={vistoriaVencida ? { borderColor: "#e6b8b3", background: "#fbeceb" } : { borderColor: "#bfe0cc", background: "#eefaf1" }}>
        <span className="text-[13px] font-semibold" style={{ color: vistoriaVencida ? "#8a2a20" : "#1e6b3f" }}>
          {diasDesdeGeral === null
            ? "Nenhuma vistoria geral do Shopping registrada ainda."
            : `Última vistoria geral do Shopping: há ${diasDesdeGeral} dia(s).`}
        </span>
        {vistoriaVencida && <span className="rounded-full bg-[#20242B] px-2 py-0.5 text-[11px] font-bold text-white">vistoria recomendada (30 dias)</span>}
        <span className="ml-auto text-[11.5px] text-muted">Periodicidade de 30 dias é boa prática de gestão — o Decreto não fixa intervalo.</span>
      </div>

      {avaliadas.length >= 2 && <VistoriaChart pontos={pontos} />}

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Nenhuma vistoria registrada.</p>
      ) : (
        <div className="grid gap-3">
          {lista.map((v) => {
            const resCor = v.resultado === "irregular" ? "#C0392B" : v.resultado === "conforme" ? "#2E8B57" : "#C8961E";
            const resLbl = v.resultado === "irregular" ? "Irregular" : v.resultado === "conforme" ? "Conforme" : "Em aberto";
            return (
              <div key={v.id} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeft: `5px solid ${resCor}` }}>
                <div className="flex flex-wrap items-center gap-3">
                  <b className="text-navy">Vistoria nº {String(v.numero).padStart(3, "0")}/{v.ano}</b>
                  <span className="text-[13px] text-muted">{new Date(v.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  <span className="text-[12.5px] text-muted">{v.tipo === "banca" ? `Banca ${v.banca?.numero ?? "—"}${v.banca_id && nomes[v.banca_id] ? ` · ${nomes[v.banca_id]}` : ""}` : TIPO_LABEL[v.tipo]}</span>
                  <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: resCor + "22", color: resCor }}>{resLbl}</span>
                  {(() => { const m = media(v.itens ?? []); return m !== null ? <span className="text-[12.5px] font-bold" style={{ color: notaCor(String(Math.round(m))) }}>média {m.toFixed(1)}/5</span> : null; })()}
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button onClick={() => gerarFichaVistoria(dados(v))} className="text-[12.5px] font-semibold text-brand">Ficha (PDF)</button>
                    <button onClick={() => preencher(v)} className="text-[12.5px] font-semibold text-navy">{aberta === v.id ? "Fechar" : "Preencher"}</button>
                    {v.resultado === "irregular" && <button onClick={() => gerarOficioVistoria(dados(v))} className="text-[12.5px] font-semibold text-bad">Notificar (PDF)</button>}
                    <button onClick={() => excluir(v)} className="text-[12.5px] font-semibold text-muted">Excluir</button>
                  </div>
                </div>

                {aberta === v.id && (
                  <div className="mt-3 grid gap-2 border-t border-line pt-3">
                    {rascunho.itens.map((it, i) => (
                      <div key={i} className="grid gap-1.5 rounded-xl border border-line p-2.5 md:grid-cols-[1fr_auto]">
                        <span className="text-[12.5px] text-navy">{it.label}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ESCALA.map((s) => (
                            <button key={s.v} type="button" title={s.t}
                              onClick={() => setRascunho((r) => ({ ...r, itens: r.itens.map((x, j) => j === i ? { ...x, situacao: s.v } : x) }))}
                              className="grid h-7 min-w-[28px] place-items-center rounded-lg px-1.5 text-[11.5px] font-bold"
                              style={it.situacao === s.v ? { background: s.c, color: "#fff" } : { border: "1px solid #eae2f2", color: "#6E5C82" }}>
                              {s.l}
                            </button>
                          ))}
                          <input placeholder="observação" value={it.obs ?? ""}
                            onChange={(e) => setRascunho((r) => ({ ...r, itens: r.itens.map((x, j) => j === i ? { ...x, obs: e.target.value } : x) }))}
                            className="w-40 rounded-lg border border-line px-2 py-1 text-[12px]" />
                        </div>
                      </div>
                    ))}
                    <label className="mt-1 block"><span className="mb-1 block text-[12.5px] font-bold text-navy">Observações gerais</span>
                      <textarea value={rascunho.observacoes} onChange={(e) => setRascunho((r) => ({ ...r, observacoes: e.target.value }))} className="w-full rounded-lg border border-line px-2 py-1.5 text-[13px]" rows={2} />
                    </label>
                    <button onClick={() => salvar(v)} className="w-max rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">Salvar checklist</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`:global(.inp){width:100%;border:1px solid #eae2f2;border-radius:9px;padding:9px 11px;font-size:14px;background:#fff;}`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-[12.5px] font-bold text-navy">{label}</span>{children}</label>);
}
