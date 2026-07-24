import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSiteConfig, cfgUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shopping Popular · Shopping Independência — Santa Maria",
  description:
    "Vitrine e gestão do Shopping Independência, espaço público de comércio popular de Santa Maria/RS. Iniciativa da SMDE&I.",
};

const NAV = [
  { href: "/", label: "Início" },
  { href: "/mapa", label: "Mapa de Bancas" },
  { href: "/participar", label: "Como Participar" },
  { href: "/indicadores", label: "Indicadores" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();
  const logo = cfgUrl(cfg, "logo_prefeitura");
  return (
    <html lang="pt-BR">
      <body>
        <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
          <div className="container-page flex h-16 items-center gap-5">
            <Link href="/" className="flex items-center gap-3">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Prefeitura de Santa Maria" className="h-9 w-auto" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-lg font-extrabold text-white">
                  SI
                </span>
              )}
              <span className="font-extrabold leading-tight text-navy">
                Shopping Popular
                <small className="block text-[11px] font-medium text-muted">
                  Prefeitura de Santa Maria · SMDE&amp;I
                </small>
              </span>
            </Link>
            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-[#F1EAF8] hover:text-navy"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/participar"
                className="ml-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
              >
                Quero participar
              </Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-4 bg-navy py-9 text-sm text-[#c7d3e8]">
          <div className="container-page flex flex-wrap justify-between gap-5">
            <div className="max-w-xl">
              <b className="text-white">Shopping Popular — Shopping Independência</b>
              <br />
              Prefeitura de Santa Maria/RS · Secretaria de Desenvolvimento Econômico e Inovação
              <p className="mt-2 text-xs text-[#8ea3c6]">
                Base legal: Contrato de Concessão (Lic. 06/2009) · Lei 6.486/2020 · Decreto de
                Normas de Funcionamento · IN 01/2021/SMDET · Pareceres PGM 307/2020, 80/2022 e
                33/2024.
              </p>
            </div>
            <div>
              <b className="text-white">Praça Saldanha Marinho</b>
              <br />
              Centro · Santa Maria/RS
              <br />
              <Link href="/admin" className="text-white">
                🔒 Acesso restrito
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
