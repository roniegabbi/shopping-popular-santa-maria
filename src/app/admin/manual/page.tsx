"use client";

import { useEffect, useState } from "react";
import { createSupabase } from "@/lib/supabase";
import AdminGuard from "../_components/AdminGuard";
import { carregarLogo, type Logo } from "@/lib/pdfPreview";
import { gerarManualPDF } from "@/lib/manualPdf";
import { MANUAL, MANUAL_VERSAO } from "@/lib/manualConteudo";

const sb = createSupabase();

export default function ManualPage() {
  return (
    <AdminGuard active="manual" title="Manual de Uso da Plataforma">
      <Body />
    </AdminGuard>
  );
}

function Body() {
  const [logo, setLogo] = useState<Logo | null>(null);

  useEffect(() => {
    sb.from("site_config").select("valor").eq("chave", "logo_prefeitura").maybeSingle()
      .then(async ({ data }) => setLogo(await carregarLogo((data?.valor as { url?: string } | null)?.url)));
  }, []);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-navy to-brand p-5 text-white">
        <div>
          <h2 className="text-xl font-extrabold">Guia de capacitação da equipe</h2>
          <p className="mt-1 text-[13px] text-[#e7dcf3]">Como usar cada módulo da plataforma, passo a passo, com a base legal do Decreto nº 3/2025. Versão {MANUAL_VERSAO}.</p>
        </div>
        <button onClick={() => gerarManualPDF({ logo })} className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand hover:brightness-95">
          Baixar Manual em PDF (A4)
        </button>
      </div>

      <div className="grid gap-4">
        {MANUAL.map((s) => (
          <section key={s.n} className="rounded-2xl border border-line bg-white p-5">
            <h3 className="flex items-baseline gap-2 text-[16px] font-extrabold text-navy">
              <span className="rounded-md bg-[#F1EAF8] px-2 py-0.5 text-[13px] text-brand">{s.n}</span>
              {s.titulo}
            </h3>
            {s.intro && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.intro}</p>}
            {s.passos && s.passos.length > 0 && (
              <ul className="mt-3 grid gap-1.5">
                {s.passos.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] text-navy">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="text-center text-[12px] text-muted">
        Dúvidas ou sugestões de melhoria do manual: registre com a equipe de gestão do Shopping Independência.
      </p>
    </div>
  );
}
