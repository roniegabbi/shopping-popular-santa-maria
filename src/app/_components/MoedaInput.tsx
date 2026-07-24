"use client";

import { formatarMoeda } from "@/lib/moeda";

export default function MoedaInput({
  value,
  onChange,
  placeholder = "0,00",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-white px-3">
      <span className="mr-1 text-sm text-muted">R$</span>
      <input
        inputMode="numeric"
        className="w-full py-2.5 text-sm outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(formatarMoeda(e.target.value))}
      />
    </div>
  );
}
