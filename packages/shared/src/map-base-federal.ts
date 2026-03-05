/**
 * Mapeamento: Base Federal (CNS/CADWEB) → dados locais do cadastro da gestante.
 *
 * Regras:
 * - Não persistir dados federais diretamente; apenas normalizar e preencher
 *   o subconjunto de campos que a base federal fornece (dados demográficos + endereço).
 * - CPF/CNS: apenas dígitos (11 / 15).
 * - Data: normalizar para ISO date (YYYY-MM-DD).
 * - Sexo: texto livre da federal → enum Sexo (FEMININO, MASCULINO, INDETERMINADO).
 */

import type { PacienteBaseFederal, DadosPessoaisFromFederal, Sexo, CitizenDto } from "./types";

function trim(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function onlyDigits(s: string | null | undefined, maxLength: number): string {
  const d = (s ?? "").replace(/\D/g, "").slice(0, maxLength);
  return d;
}

/** Normaliza data para ISO date (YYYY-MM-DD). */
function toISODate(s: string | null | undefined): string | undefined {
  const v = trim(s);
  if (!v) return undefined;
  if (v.includes("T")) return v.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{8}$/.test(v))
    return `${v.slice(4, 8)}-${v.slice(2, 4)}-${v.slice(0, 2)}`;
  return v.length >= 10 ? v.slice(0, 10) : undefined;
}

/** Mapeia texto de sexo da base federal para enum Sexo. */
function mapSexo(s: string | null | undefined): Sexo | undefined {
  const v = trim(s).toUpperCase();
  if (!v) return undefined;
  if (v.includes("FEMININO") || v === "F") return "FEMININO";
  if (v.includes("MASCULINO") || v === "M") return "MASCULINO";
  if (v.includes("INDETERMINADO")) return "INDETERMINADO";
  return undefined;
}

/**
 * Converte a resposta da Base Federal (paciente) no subconjunto de dados
 * do cadastro local que pode ser pré-preenchido (dados pessoais + endereço).
 *
 * Campos que NÃO vêm da federal e devem ser preenchidos no formulário:
 * - telefone, temWhatsapp, email
 * - distritoSanitarioId
 * - racaCor, identidadeGenero, orientacaoSexual, possuiDeficiencia, deficiencia
 * - descobrimentoGestacao, dum, programaSocial, nis, ubsId, etc.
 */
export function mapPacienteBaseFederalToDadosCadastro(
  paciente: PacienteBaseFederal | null | undefined
): Partial<DadosPessoaisFromFederal> {
  if (!paciente) return {};

  const cpf = onlyDigits(paciente.cpf, 11);
  const cns = onlyDigits(paciente.cns, 15);
  const nomeCompleto = trim(paciente.nome);
  const nomeMae = trim(paciente.nomeMae) || undefined;
  const nomePai = trim(paciente.nomePai) || undefined;
  const dataNascimento = toISODate(paciente.dataNascimento);
  const sexo = mapSexo(paciente.sexo);
  const logradouro = trim(paciente.logradouro);
  const numero = trim(paciente.numero);
  const complemento = trim(paciente.complemento) || undefined;
  const bairro = trim(paciente.bairro);
  const cep = onlyDigits(paciente.cep, 8);

  const out: Partial<DadosPessoaisFromFederal> = {};

  if (cpf.length === 11) out.cpf = cpf;
  if (cns.length === 15) out.cns = cns;
  if (nomeCompleto) out.nomeCompleto = nomeCompleto.slice(0, 70);
  if (nomeMae) out.nomeMae = nomeMae.slice(0, 70);
  if (nomePai) out.nomePai = nomePai.slice(0, 70);
  if (dataNascimento) out.dataNascimento = dataNascimento;
  if (sexo) out.sexo = sexo;
  if (logradouro) out.logradouro = logradouro.slice(0, 200);
  if (numero) out.numero = numero.slice(0, 20);
  if (complemento) out.complemento = complemento.slice(0, 50);
  if (bairro) out.bairro = bairro.slice(0, 100);
  if (cep.length === 8) out.cep = cep;

  return out;
}

/**
 * Converte CitizenDto (e-SUS ou SOAP) para PacienteBaseFederal.
 * Mantém o contrato da API /api/cns/buscar para o frontend usar mapPacienteBaseFederalToDadosCadastro.
 */
export function citizenDtoToPacienteBaseFederal(
  dto: CitizenDto | null | undefined
): PacienteBaseFederal | null {
  if (!dto) return null;
  const trim = (s: string | null | undefined) => (s ?? "").trim() || undefined;
  return {
    cpf: trim(dto.cpf) ?? undefined,
    cns: trim(dto.cns) ?? undefined,
    nome: trim(dto.nomeCompleto) ?? undefined,
    nomeMae: trim(dto.nomeMae) ?? undefined,
    nomePai: trim(dto.nomePai) ?? undefined,
    dataNascimento: trim(dto.dataNascimento) ?? undefined,
    sexo: trim(dto.sexo) ?? undefined,
    logradouro: trim(dto.logradouro) ?? undefined,
    numero: trim(dto.numero) ?? undefined,
    complemento: trim(dto.complemento) ?? undefined,
    bairro: trim(dto.bairro) ?? undefined,
    cep: trim(dto.cep) ?? undefined,
    emails: trim(dto.email) ?? undefined,
    ddd: trim(dto.telefoneCelular)?.slice(0, 2) ?? undefined,
  };
}
