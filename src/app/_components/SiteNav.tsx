"use client";

import { useState } from "react";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/mapa", label: "Mapa de Bancas" },
  { href: "/participar", label: "Como Participar" },
  { href: "/indicadores", label: "Indicadores" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="ml-auto hidden items-center gap-1 md:flex">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-[#F1EAF8] hover:text-navy">
            {n.label}
          </Link>
        ))}
        <Link href="/participar" className="ml-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:brightness-95">
          Quero participar
        </Link>
      </nav>

      <button
        aria-label="Abrir menu"
        onClick={() => setOpen((o) => !o)}
        className="ml-auto grid h-10 w-10 place-items-center rounded-lg bg-navy text-lg text-white md:hidden"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-line bg-white p-3 shadow-lg md:hidden">
          <nav className="container-page grid gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-semibold text-navy hover:bg-[#F1EAF8]">
                {n.label}
              </Link>
            ))}
            <Link href="/participar" onClick={() => setOpen(false)} className="mt-1 rounded-lg bg-accent px-3 py-3 text-center text-[15px] font-bold text-white">
              Quero participar
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
