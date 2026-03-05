/**
 * Provider de cidadão que consulta o banco PostgreSQL do e-SUS (PEC).
 * Tabela principal: ta_cidadao.
 * Não altera o provider SOAP existente; implementa ICitizenProvider para o orquestrador.
 */

import { Pool } from "pg";
import type { CitizenDto } from "@mae-salvador/shared";
import type { ICitizenProvider } from "./types";

let _esusPool: Pool | null = null;

function getEsusPool(): Pool | null {
  const url = process.env.ESUS_DATABASE_URL?.trim();
  if (!url || !url.startsWith("postgres")) return null;
  if (!_esusPool) {
    _esusPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return _esusPool;
}

/** Só tenta conectar ao e-SUS se a connection string PostgreSQL estiver definida. */
export function isEsusConfigured(): boolean {
  const url = process.env.ESUS_DATABASE_URL?.trim();
  return Boolean(url && url.startsWith("postgres"));
}

function onlyDigits(s: string, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

function toISODate(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function trim(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

/**
 * EsusCitizenProvider: busca cidadão no banco PostgreSQL do e-SUS por CPF (11 dígitos) ou CNS (15 dígitos).
 * Retorna null se não configurado, não encontrar ou der erro (fallback no SOAP).
 */
export const esusCitizenProvider: ICitizenProvider = {
  async getCitizenByCpfOrCns(document: string): Promise<CitizenDto | null> {
    if (!isEsusConfigured()) return null;

    const doc = onlyDigits(document, 15);
    if (doc.length !== 11 && doc.length !== 15) return null;

    const pool = getEsusPool();
    if (!pool) return null;

    try {
      // PostgreSQL: LIMIT 1, REPLACE/COALESCE, parâmetro $1
      // nu_cns = Cartão Nacional de Saúde (CNS), usado para preencher o formulário
      const query = `
        SELECT
          c.nu_cpf AS cpf,
          c.nu_cns AS cns,
          c.no_cidadao AS nomecompleto,
          c.no_mae AS nomemae,
          c.no_pai AS nomepai,
          c.dt_nascimento AS datanascimento,
          c.no_sexo AS sexo,
          c.nu_telefone_celular AS telefonecelular,
          c.ds_email AS email,
          c.ds_logradouro AS logradouro,
          c.nu_numero AS numero,
          c.no_bairro AS bairro,
          c.ds_cep AS cep,
          c.ds_complemento AS complemento,
          c.co_localidade_endereco AS municipio
        FROM ta_cidadao c
        WHERE (
          (length($1) = 11 AND replace(replace(replace(coalesce(c.nu_cpf, ''), '.', ''), '-', ''), ' ', '') = $1)
          OR
          (length($1) = 15 AND replace(replace(replace(coalesce(c.nu_cns, ''), '.', ''), '-', ''), ' ', '') = $1)
        )
        LIMIT 1
      `;

      const result = await pool.query(query, [doc]);
      const row = result.rows?.[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      // pg retorna colunas em minúsculo por padrão
      const get = (key: string) => row[key] ?? row[key.toLowerCase()];
      const dto: CitizenDto = {
        cpf: trim(get("cpf")) ?? undefined,
        cns: trim(get("cns")) ?? undefined,
        nomeCompleto: trim(get("nomecompleto")) ?? undefined,
        nomeMae: trim(get("nomemae")) ?? undefined,
        nomePai: trim(get("nomepai")) ?? undefined,
        dataNascimento: toISODate(get("datanascimento")) ?? undefined,
        sexo: trim(get("sexo")) ?? undefined,
        telefoneCelular: trim(get("telefonecelular")) ?? undefined,
        email: trim(get("email")) ?? undefined,
        logradouro: trim(get("logradouro")) ?? undefined,
        numero: trim(get("numero")) ?? undefined,
        bairro: trim(get("bairro")) ?? undefined,
        cep: trim(get("cep")) ?? undefined,
        complemento: trim(get("complemento")) ?? undefined,
        municipio: trim(get("municipio")) ?? undefined,
      };
      return dto;
    } catch (e) {
      return null;
    }
  },
};
