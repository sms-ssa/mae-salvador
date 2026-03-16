/**
 * Validações para login do perfil Gestante (CPF ou CNS).
 * Conforme documento de requisitos: 11 dígitos = CPF, 15 dígitos = CNS.
 */

import { validateCNS } from "@/lib/validateCNS";

function apenasDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export function validarCPF(cpf: string): string | null {
  const d = apenasDigitos(cpf);
  if (d.length !== 11) return "CPF deve conter 11 dígitos.";
  if (/^(\d)\1{10}$/.test(d)) return "CPF inválido.";
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(d[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(d[9], 10)) return "CPF inválido.";
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(d[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(d[10], 10)) return "CPF inválido.";
  return null;
}

export function validarCNS(cns: string): string | null {
  const d = apenasDigitos(cns);
  if (d.length !== 15) return "CNS deve conter 15 dígitos.";
  if (!validateCNS(d)) return "CNS inválido.";
  return null;
}

/**
 * Valida CPF ou CNS (campo único no login).
 * 11 dígitos → CPF; 15 dígitos → CNS.
 * Retorna mensagem de erro ou null se válido.
 */
export function validarCpfOuCns(valor: string): string | null {
  const d = apenasDigitos(valor);
  if (d.length === 0) return null;
  if (d.length === 11) return validarCPF(valor);
  if (d.length === 15) return validarCNS(valor);
  return "CPF ou CNS inválido.";
}
