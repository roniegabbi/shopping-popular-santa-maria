/** Valida o CPF pelos dígitos verificadores. Retorna false para vazio/nulo. */
export function validaCPF(cpf?: string | null): boolean {
  if (!cpf) return false;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10], 10);
}

/** true quando há um CPF preenchido mas inválido (para sinalizar erro). */
export function cpfComErro(cpf?: string | null): boolean {
  return !!cpf && !validaCPF(cpf);
}
