import { getBancas, countBy } from "@/lib/data";
import { PAVIMENTO_LABEL, type Pavimento } from "@/lib/types";

export const dynamic = "force-dynamic";

function Bars({ rows }: { rows: { label: string; val: number; color?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.val), 1);
  return (
    <div className="mt-3.5 space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[130px_1fr_44px] items-center gap-3">
          <span className="text-[13.5px] font-semibold text-muted">{r.label}</span>
          <div className="h-4 overflow-hidden rounded-full bg-[#F1EAF8]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.val / max) * 100}%`, background: r.color ?? "#8A2BAE" }}
            />
          </div>
          <b className="text-right text-sm text-navy">{r.val}</b>
        </div>
      ))}
    </div>
  );
}

export default async function IndicadoresPage() {
  const bancas = await getBancas();
  const total = bancas.length;
  const ocupadas = countBy(bancas, "ocupada");
  const vagas = countBy(bancas, "vaga");
  const wait = countBy(bancas, "aguardando_sorteio");
  const taxa = total ? Math.round((ocupadas / total) * 100) : 0;

  const pavRows = (["terreo", "pav1", "pav2"] as Pavimento[]).map((p) => ({
    label: PAVIMENTO_LABEL[p],
    val: bancas.filter((b) => b.pavimento === p && b.status === "ocupada").length,
  }));

  const segMap = new Map<string, { label: string; color: string; val: number }>();
  for (const b of bancas) {
    if (b.status !== "ocupada" || !b.segmento) continue;
    const cur = segMap.get(b.segmento.id) ?? { label: b.segmento.nome, color: b.segmento.cor, val: 0 };
    cur.val += 1;
    segMap.set(b.segmento.id, cur);
  }
  const segRows = [...segMap.values()].sort((a, b) => b.val - a.val);

  return (
    <section className="py-14">
      <div className="container-page">
        <h1 className="text-2xl font-extrabold text-navy">Indicadores</h1>
        <p className="mb-6 mt-1 max-w-2xl text-muted">
          Números agregados de ocupação — atualizados a partir da base de gestão, sem expor dados
          pessoais.
        </p>

        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line md:grid-cols-4">
          {[
            [ocupadas, "ocupadas"],
            [vagas, "vagas"],
            [wait, "aguardando sorteio"],
            [`${taxa}%`, "taxa de ocupação"],
          ].map(([n, l], i) => (
            <div key={i} className="border-r border-line bg-white p-5 text-center last:border-r-0">
              <b className="block text-3xl font-extrabold text-navy">{n}</b>
              <span className="mt-1 block text-[12.5px] text-muted">{l}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="font-bold text-navy">Ocupação por pavimento</h3>
            <Bars rows={pavRows} />
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="font-bold text-navy">Bancas por segmento</h3>
            <Bars rows={segRows} />
          </div>
        </div>
      </div>
    </section>
  );
}
