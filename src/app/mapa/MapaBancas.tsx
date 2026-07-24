"use client";

import { useMemo, useState } from "react";
import type { Banca, Segmento } from "@/lib/types";
import { STATUS_LABEL, STATUS_COLOR, PAVIMENTO_LABEL, type Pavimento } from "@/lib/types";

const PAVS: Pavimento[] = ["terreo", "pav1", "pav2"];

export default function MapaBancas({
  bancas,
  segmentos,
}: {
  bancas: Banca[];
  segmentos: Segmento[];
}) {
  const [seg, setSeg] = useState<string>("todos");

  const filtros = useMemo(
    () => [{ id: "todos", nome: "Todos" }, ...segmentos.map((s) => ({ id: s.id, nome: s.nome }))],
    [segmentos]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.id}
            onClick={() => setSeg(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
              seg === f.id
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {f.nome}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-4 text-[13px] text-muted">
        {(["ocupada", "vaga", "aguardando_sorteio", "em_regularizacao"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {PAVS.map((pav) => {
        const doPav = bancas.filter((b) => b.pavimento === pav);
        if (doPav.length === 0) return null;
        return (
          <div key={pav}>
            <div className="mb-3 mt-6 flex items-center gap-2.5 font-extrabold text-navy">
              <span className="h-[3px] w-5 rounded bg-accent" />
              {PAVIMENTO_LABEL[pav]}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))" }}>
              {doPav.map((b) => {
                const hidden = seg !== "todos" && b.segmento_id !== seg;
                if (hidden) return null;
                const cor = STATUS_COLOR[b.status];
                const dark = b.status === "vaga";
                return (
                  <div
                    key={b.id}
                    title={`Banca ${b.numero} — ${STATUS_LABEL[b.status]}`}
                    className="flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-bold"
                    style={{ background: cor, color: dark ? "#3a4351" : "#fff" }}
                  >
                    {b.numero}
                    <small className="text-[8.5px] font-semibold uppercase opacity-80">
                      {b.status === "ocupada"
                        ? b.segmento?.nome?.slice(0, 6) ?? ""
                        : STATUS_LABEL[b.status].split(" ")[0]}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
