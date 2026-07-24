"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabase } from "@/lib/supabase";
import { HOME_CARDS } from "@/lib/site";

const sb = createSupabase();

type Item = { key: string; titulo: string; hint: string };

const ITENS: Item[] = [
  { key: "logo_prefeitura", titulo: "Logo da Prefeitura (cabeçalho)", hint: "PNG/SVG com fundo transparente · altura ~72px" },
  ...HOME_CARDS.map((c) => ({
    key: c.key,
    titulo: `Card — ${c.titulo}`,
    hint: "Imagem do card · proporção ~3:2 (ex.: 900×600)",
  })),
];

function UploadRow({ item }: { item: Item }) {
  const [url, setUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "erro">("idle");

  const carregar = useCallback(async () => {
    const { data } = await sb.from("site_config").select("valor").eq("chave", item.key).maybeSingle();
    const v = data?.valor as { url?: string } | null;
    setUrl(v?.url ?? null);
  }, [item.key]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviar(file: File) {
    setEstado("enviando");
    const ext = file.name.split(".").pop() || "png";
    const path = `identidade/${item.key}-${Date.now()}.${ext}`;
    const up = await sb.storage.from("midia").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (up.error) {
      setEstado("erro");
      return;
    }
    const { data: pub } = sb.storage.from("midia").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const { error } = await sb
      .from("site_config")
      .upsert({ chave: item.key, valor: { url: publicUrl } }, { onConflict: "chave" });
    if (error) {
      setEstado("erro");
      return;
    }
    setUrl(publicUrl);
    setEstado("ok");
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
      <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F1EAF8]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={item.titulo} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-muted">sem imagem</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-navy">{item.titulo}</p>
        <p className="text-[12px] text-muted">{item.hint}</p>
      </div>
      <label className="cursor-pointer rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy2">
        {estado === "enviando" ? "Enviando…" : "Enviar imagem"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
          }}
        />
      </label>
      {estado === "ok" && <span className="text-sm text-green">✓</span>}
      {estado === "erro" && <span className="text-sm text-bad">erro</span>}
    </div>
  );
}

export default function IdentidadeVisual() {
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Envie a logo da Prefeitura e as imagens dos cards da página inicial. As mudanças aparecem no
        site público após atualizar a página. Grava no Supabase Storage.
      </p>
      <div className="grid gap-3">
        {ITENS.map((it) => (
          <UploadRow key={it.key} item={it} />
        ))}
      </div>
    </div>
  );
}
