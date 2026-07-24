export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata a entrada bruta (dígitos) como moeda BR: "200000" -> "2.000,00". */
export function formatarMoeda(bruto: string): string {
  const digitos = bruto.replace(/\D/g, "");
  const cents = digitos ? parseInt(digitos, 10) : 0;
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte a string formatada de volta para número: "2.000,00" -> 2000. */
export function moedaParaNumero(v: string): number {
  return v ? Number(v.replace(/\./g, "").replace(",", ".")) : 0;
}
