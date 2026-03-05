/**
 * Provider de cidadão que usa o serviço SOAP CADSUS já existente (cns-federal).
 * Não altera o cns-federal; apenas implementa ICitizenProvider e mapeia para CitizenDto.
 */

import type { CitizenDto } from "@mae-salvador/shared";
import type { ICitizenProvider } from "./types";
import {
  pesquisarPacientePorCpf,
  pesquisarPacientePorCns,
  isCnsFederalConfigured,
} from "@/lib/cns-federal";

function trim(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
}

function toISODate(s: string | null | undefined): string | null {
  const v = trim(s);
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Converte PacienteBaseFederal (resposta SOAP) para CitizenDto. */
function pacienteToCitizenDto(p: {
  cpf?: string | null;
  cns?: string | null;
  nome?: string | null;
  nomeMae?: string | null;
  nomePai?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  emails?: string | null;
  ddd?: string | null;
}): CitizenDto {
  return {
    cpf: trim(p.cpf) ?? undefined,
    cns: trim(p.cns) ?? undefined,
    nomeCompleto: trim(p.nome) ?? undefined,
    nomeMae: trim(p.nomeMae) ?? undefined,
    nomePai: trim(p.nomePai) ?? undefined,
    dataNascimento: toISODate(p.dataNascimento) ?? undefined,
    sexo: trim(p.sexo) ?? undefined,
    logradouro: trim(p.logradouro) ?? undefined,
    numero: trim(p.numero) ?? undefined,
    complemento: trim(p.complemento) ?? undefined,
    bairro: trim(p.bairro) ?? undefined,
    cep: trim(p.cep) ?? undefined,
    email: trim(p.emails) ?? undefined,
    telefoneCelular: p.ddd ? `${trim(p.ddd)}` : undefined,
  };
}

/**
 * SoapCitizenProvider: usa o serviço SOAP CADSUS existente (pesquisarPacientePorCpf / pesquisarPacientePorCns).
 * Retorna null se não configurado ou não encontrar.
 */
export const soapCitizenProvider: ICitizenProvider = {
  async getCitizenByCpfOrCns(document: string): Promise<CitizenDto | null> {
    if (!isCnsFederalConfigured()) return null;

    const doc = document.replace(/\D/g, "");
    if (doc.length === 11) {
      const resultado = await pesquisarPacientePorCpf(document);
      if (!resultado.sucesso || !resultado.paciente) return null;
      return pacienteToCitizenDto(resultado.paciente);
    }
    if (doc.length === 15) {
      const resultado = await pesquisarPacientePorCns(document);
      if (!resultado.sucesso || !resultado.paciente) return null;
      return pacienteToCitizenDto(resultado.paciente);
    }
    return null;
  },
};
