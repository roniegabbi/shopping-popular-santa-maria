import Link from "next/link";
import { getBancas, countBy } from "@/lib/data";
import { getSiteConfig, cfgUrl, HOME_CARDS } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [bancas, cfg] = await Promise.all([getBancas(), getSiteConfig()]);
  const total = bancas.length;
  const ocupadas = countBy(bancas, "ocupada");
  const vagas = countBy(bancas, "vaga") + countBy(bancas, "aguardando_sorteio");

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy to-brand py-16 text-white">
        <div className="container-page">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
            Espaço público de comércio popular
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
            O comércio popular de Santa Maria tem um lugar para{" "}
            <em className="text-gold not-italic">prosperar</em>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#e7dcf3]">
            Bancas em espaço público na Praça Saldanha Marinho, com processo de ocupação
            transparente, sorteio público e acompanhamento do Conselho Gestor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/participar" className="rounded-xl bg-accent px-5 py-3 font-bold hover:brightness-95">
              Quero uma banca
            </Link>
            <Link href="/mapa" className="rounded-xl border border-white/35 bg-white/10 px-5 py-3 font-bold hover:bg-white/20">
              Ver mapa de bancas
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="-mt-9 grid grid-cols-2 overflow-hidden rounded-2xl border border-line shadow-soft md:grid-cols-4">
          {[
            [total, "bancas no total"],
            [ocupadas, "bancas ocupadas"],
            [vagas, "vagas para sorteio"],
            ["3", "níveis (térreo + 2)"],
          ].map(([n, l], i) => (
            <div key={i} className="border-r border-line bg-white p-5 text-center last:border-r-0">
              <b className="block text-3xl font-extrabold text-navy">{n}</b>
              <span className="mt-1 block text-[12.5px] text-muted">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="py-14">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold text-navy">Por que o Shopping Independência?</h2>
          <p className="mt-1 max-w-2xl text-muted">
            Um equipamento público que organizou camelôs, ambulantes e artesãos em um espaço digno,
            com regras claras e gestão compartilhada.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {HOME_CARDS.map((c) => {
              const img = cfgUrl(cfg, c.key);
              return (
                <div key={c.key} className="overflow-hidden rounded-2xl border border-line bg-white">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={c.titulo} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-[#F1EAF8] text-4xl">
                      {c.icon}
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-bold text-navy">{c.titulo}</h3>
                    <p className="mt-1 text-sm text-muted">{c.texto}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
