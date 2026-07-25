import { createSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TIPO: Record<string, string> = { cadastramento: "Cadastramento", realocacao: "Realocação" };
const STATUS: Record<string, string> = { aberto: "Aberto", homologado: "Homologado", encerrado: "Encerrado" };
const REPRES: Record<string, string> = { poder_publico: "Poder público", concessionaria: "Concessionária", comerciantes: "Comerciantes" };

type Sorteio = { edital: string | null; tipo: string; status: string; realizado_em: string | null; validade_ate: string | null; resultado: string | null };
type Ata = { data: string | null; titulo: string | null; resumo: string | null };
type Membro = { nome: string; representacao: string; cargo: string | null };

export default async function TransparenciaPage() {
  const sb = createSupabase();
  const [{ data: sorteios }, { data: atas }, { data: membros }] = await Promise.all([
    sb.from("sorteio").select("edital,tipo,status,realizado_em,validade_ate,resultado").order("created_at", { ascending: false }),
    sb.from("ata").select("data,titulo,resumo").eq("publico", true).order("data", { ascending: false }),
    sb.from("conselho_gestor").select("nome,representacao,cargo").order("representacao"),
  ]);
  const S = (sorteios as Sorteio[]) ?? [];
  const A = (atas as Ata[]) ?? [];
  const M = (membros as Membro[]) ?? [];
  const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

  return (
    <>
      <section className="bg-gradient-to-br from-navy to-brand py-12 text-white">
        <div className="container-page">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">Portal da transparência</span>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Transparência do Shopping Independência</h1>
          <p className="mt-2 max-w-2xl text-[#e7dcf3]">Editais, resultados de sorteio e atas do Conselho Gestor, publicados para acompanhamento da comunidade.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-page grid gap-10">
          <div>
            <h2 className="mb-4 text-2xl font-extrabold text-navy">Editais e sorteios</h2>
            {S.length === 0 ? <p className="text-muted">Nenhum edital publicado no momento.</p> : (
              <div className="grid gap-3">
                {S.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-navy">{s.edital}</b>
                      <span className="rounded-full bg-[#F1EAF8] px-2.5 py-1 text-[11.5px] font-bold text-navy">{TIPO[s.tipo] ?? s.tipo}</span>
                      <span className="rounded-full bg-[#eef2f7] px-2.5 py-1 text-[11.5px] font-bold text-muted">{STATUS[s.status] ?? s.status}</span>
                      {s.realizado_em && <span className="text-[12.5px] text-muted">sorteio em {dt(s.realizado_em)}</span>}
                    </div>
                    {s.resultado && <p className="mt-1 text-sm text-muted">{s.resultado}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-extrabold text-navy">Atas do Conselho Gestor</h2>
            {A.length === 0 ? <p className="text-muted">Nenhuma ata publicada no momento.</p> : (
              <div className="grid gap-2">
                {A.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="mt-0.5 shrink-0 rounded-lg bg-navy px-2.5 py-1 text-[12px] font-bold text-white">{dt(a.data)}</span>
                    <div>
                      <b className="text-navy">{a.titulo ?? "Reunião"}</b>
                      {a.resumo && <p className="text-sm text-muted">{a.resumo}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {M.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-extrabold text-navy">Conselho Gestor</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {["poder_publico", "concessionaria", "comerciantes"].map((r) => (
                  <div key={r} className="rounded-2xl border border-line bg-white p-4">
                    <h3 className="font-bold text-navy">{REPRES[r]}</h3>
                    <ul className="mt-2 grid gap-1 text-sm text-muted">
                      {M.filter((m) => m.representacao === r).map((m, i) => <li key={i}>{m.nome}{m.cargo ? ` — ${m.cargo}` : ""}</li>)}
                      {M.filter((m) => m.representacao === r).length === 0 && <li>—</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
