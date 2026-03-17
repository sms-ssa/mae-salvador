/**
 * Serviço orquestrador da busca de cidadão: consulta primeiro o e-SUS (PostgreSQL),
 * se não encontrar consulta o CNS Federal (CADSUS SOAP). Retorna um único DTO para o frontend.
 */

import type { CitizenDto } from "@mae-salvador/shared";
import { esusCitizenProvider } from "./citizen-providers/esus-citizen-provider";
import { soapCitizenProvider } from "./citizen-providers/soap-citizen-provider";

function onlyDigits(s: string, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

/**
 * Busca cidadão por CPF (11 dígitos) ou CNS (15 dígitos).
 * 1) Tenta e-SUS (PostgreSQL); 2) Se não encontrar, tenta CNS Federal (CADSUS SOAP); 3) Retorna null se não encontrar em nenhum.
 * Logs no console indicam a origem dos dados.
 */
export async function getCitizenByCpfOrCns(
  document: string,
): Promise<CitizenDto | null> {
  const doc = onlyDigits(document, 15);
  if (doc.length !== 11 && doc.length !== 15) {
    return null;
  }
  let citizen: CitizenDto | null = null;
  try {
    citizen = await esusCitizenProvider.getCitizenByCpfOrCns(document);
    if (citizen != null) {
      return citizen;
    }
  } catch {}
  try {
    citizen = await soapCitizenProvider.getCitizenByCpfOrCns(document);
    if (citizen != null) {
      return citizen;
    }
  } catch {}

  return null;
}
