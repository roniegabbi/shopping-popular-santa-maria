import { createSupabase } from "./supabase";
import type { Banca, Segmento, BancaStatus } from "./types";

export async function getSegmentos(): Promise<Segmento[]> {
  const sb = createSupabase();
  const { data } = await sb.from("segmento").select("*").order("ordem");
  return (data as Segmento[]) ?? [];
}

export async function getBancas(): Promise<Banca[]> {
  const sb = createSupabase();
  const { data } = await sb
    .from("banca")
    .select("id,numero,pavimento,status,segmento_id,segmento(id,nome,cor,ordem)")
    .order("numero");
  // numero é texto; ordena numericamente
  const rows = (data as unknown as Banca[]) ?? [];
  return rows.sort((a, b) => Number(a.numero) - Number(b.numero));
}

export async function getStatusCounts(): Promise<Record<string, number>> {
  const bancas = await getBancas();
  return bancas.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
}

export function countBy(bancas: Banca[], status: BancaStatus): number {
  return bancas.filter((b) => b.status === status).length;
}
