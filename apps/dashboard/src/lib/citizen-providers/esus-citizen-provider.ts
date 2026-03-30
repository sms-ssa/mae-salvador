/**
 * Provider de cidadão que consulta o banco PostgreSQL do e-SUS (PEC).
 * Tabela principal: tb_cidadao; JOIN tb_raca_cor para raça/cor.
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

    const buildQuery = (activeOnly: boolean) => `
      SELECT
        c.nu_cns,
        c.nu_cpf,
        c.no_cidadao AS nome_civil,
        c.no_social,
        r.no_raca_cor AS raca_cor,
        c.tp_identidade_genero,
        c.tp_orientacao_sexual,
        c.no_mae AS nomemae,
        c.no_pai AS nomepai,
        c.dt_nascimento AS datanascimento,
        c.no_sexo AS sexo,
        c.nu_telefone_celular AS telefonecelular,
        c.nu_telefone_residencial AS telefoneresidencial,
        c.ds_email AS email,
        c.ds_logradouro AS logradouro,
        c.nu_numero AS numero,
        c.no_bairro AS bairro,
        c.ds_cep AS cep,
        c.ds_complemento AS complemento,
        loc.no_localidade AS municipio
      FROM tb_cidadao c
      LEFT JOIN tb_raca_cor r ON c.co_raca_cor = r.co_raca_cor
      LEFT JOIN tb_localidade loc ON c.co_localidade_endereco::bigint = loc.co_localidade
      WHERE ${activeOnly ? "c.st_ativo = 1" : "TRUE"}
        AND (
          (length($1) = 11 AND replace(replace(replace(coalesce(c.nu_cpf, ''), '.', ''), '-', ''), ' ', '') = $1)
          OR
          (length($1) = 15 AND replace(replace(replace(coalesce(c.nu_cns, ''), '.', ''), '-', ''), ' ', '') = $1)
        )
      LIMIT 1
    `;

    const tryQuery = async (activeOnly: boolean): Promise<Record<string, unknown> | undefined> => {
      const query = buildQuery(activeOnly);
      const result = await pool.query(query, [doc]);
      return result.rows?.[0] as Record<string, unknown> | undefined;
    };

    try {
      // 1) tenta somente ativos
      let row: Record<string, unknown> | undefined = await tryQuery(true);
      // 2) se não achou, tenta também inativos (alguns cadastros podem estar fora de "st_ativo = 1")
      if (!row) {
        row = await tryQuery(false);
      }
      if (!row) return null;

      const get = (key: string) => row[key] ?? row[key.toLowerCase()];
      const dto: CitizenDto = {
        cpf: trim(get("nu_cpf")) ?? undefined,
        cns: trim(get("nu_cns")) ?? undefined,
        nomeCompleto: trim(get("nome_civil")) ?? undefined,
        nomeSocial: trim(get("no_social")) ?? undefined,
        racaCor: trim(get("raca_cor")) ?? undefined,
        identidadeGenero: trim(get("tp_identidade_genero")) ?? undefined,
        orientacaoSexual: trim(get("tp_orientacao_sexual")) ?? undefined,
        nomeMae: trim(get("nomemae")) ?? undefined,
        nomePai: trim(get("nomepai")) ?? undefined,
        dataNascimento: toISODate(get("datanascimento")) ?? undefined,
        sexo: trim(get("sexo")) ?? undefined,
        telefoneCelular: trim(get("telefonecelular")) ?? undefined,
        telefoneResidencial: trim(get("telefoneresidencial")) ?? undefined,
        email: trim(get("email")) ?? undefined,
        logradouro: trim(get("logradouro")) ?? undefined,
        numero: trim(get("numero")) ?? undefined,
        bairro: trim(get("bairro")) ?? undefined,
        cep: trim(get("cep")) ?? undefined,
        complemento: trim(get("complemento")) ?? undefined,
        municipio: trim(get("municipio")) ?? undefined,
      };
      return dto;
    } catch {
      return null;
    }
  },
};

function normalizeForILike(s: string): string {
  // Remove espaços repetidos para melhorar correspondência aproximada.
  return s.trim().replace(/\s{2,}/g, " ");
}

function normalizeSqlExpr(expr: string): string {
  return `translate(upper(${expr}), 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC')`;
}

/**
 * Busca cidadão na PEC (e-SUS) por nome e data de nascimento.
 * - Retorna `null` se não configurado, não encontrar ou der erro.
 *
 * Observação: a correspondência de nome é aproximada via `ILIKE` (match parcial).
 */
export async function getCitizenByNomeAndDataNascimento(params: {
  nomeCompleto: string;
  nomeMae?: string;
  dataNascimento?: string;
}): Promise<CitizenDto | null> {
  const { nomeCompleto, nomeMae, dataNascimento } = params;
  if (!isEsusConfigured()) return null;

  const nomeNorm = normalizeForILike(nomeCompleto);
  if (!nomeNorm) return null;

  const pool = getEsusPool();
  if (!pool) return null;

  const runQuery = async (activeOnly: boolean) => {
    const where: string[] = [activeOnly ? "c.st_ativo = 1" : "TRUE"];
    const queryParams: unknown[] = [];
    let idx = 1;

    const nomeParam = `$${idx}`;
    where.push(
      `${normalizeSqlExpr("c.no_cidadao")} ILIKE '%' || ${normalizeSqlExpr(
        nomeParam,
      )} || '%'`,
    );
    queryParams.push(nomeNorm);
    idx += 1;

    if (dataNascimento && /^\d{4}-\d{2}-\d{2}$/.test(dataNascimento.trim())) {
      where.push(`c.dt_nascimento::date = $${idx}::date`);
      queryParams.push(dataNascimento.trim());
      idx += 1;
    }

    if (nomeMae && nomeMae.trim()) {
      const maeNorm = normalizeForILike(nomeMae);
      const maeParam = `$${idx}`;
      where.push(
        `${normalizeSqlExpr("c.no_mae")} ILIKE '%' || ${normalizeSqlExpr(
          maeParam,
        )} || '%'`,
      );
      queryParams.push(maeNorm);
      idx += 1;
    }

    const query = `
      SELECT
        c.nu_cns,
        c.nu_cpf,
        c.no_cidadao AS nome_civil,
        c.no_social,
        r.no_raca_cor AS raca_cor,
        c.tp_identidade_genero,
        c.tp_orientacao_sexual,
        c.no_mae AS nomemae,
        c.no_pai AS nomepai,
        c.dt_nascimento AS datanascimento,
        c.no_sexo AS sexo,
        c.nu_telefone_celular AS telefonecelular,
        c.nu_telefone_residencial AS telefoneresidencial,
        c.ds_email AS email,
        c.ds_logradouro AS logradouro,
        c.nu_numero AS numero,
        c.no_bairro AS bairro,
        c.ds_cep AS cep,
        c.ds_complemento AS complemento,
        loc.no_localidade AS municipio
      FROM tb_cidadao c
      LEFT JOIN tb_raca_cor r ON c.co_raca_cor = r.co_raca_cor
      LEFT JOIN tb_localidade loc ON c.co_localidade_endereco::bigint = loc.co_localidade
      WHERE ${where.join(" AND ")}
      LIMIT 1
    `;
    const result = await pool.query(query, queryParams);
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    const get = (key: string) => row[key] ?? row[key.toLowerCase()];
    const dto: CitizenDto = {
      cpf: trim(get("nu_cpf")) ?? undefined,
      cns: trim(get("nu_cns")) ?? undefined,
      nomeCompleto: trim(get("nome_civil")) ?? undefined,
      nomeSocial: trim(get("no_social")) ?? undefined,
      racaCor: trim(get("raca_cor")) ?? undefined,
      identidadeGenero: trim(get("tp_identidade_genero")) ?? undefined,
      orientacaoSexual: trim(get("tp_orientacao_sexual")) ?? undefined,
      nomeMae: trim(get("nomemae")) ?? undefined,
      nomePai: trim(get("nomepai")) ?? undefined,
      dataNascimento: toISODate(get("datanascimento")) ?? undefined,
      sexo: trim(get("sexo")) ?? undefined,
      telefoneCelular: trim(get("telefonecelular")) ?? undefined,
      telefoneResidencial: trim(get("telefoneresidencial")) ?? undefined,
      email: trim(get("email")) ?? undefined,
      logradouro: trim(get("logradouro")) ?? undefined,
      numero: trim(get("numero")) ?? undefined,
      bairro: trim(get("bairro")) ?? undefined,
      cep: trim(get("cep")) ?? undefined,
      complemento: trim(get("complemento")) ?? undefined,
      municipio: trim(get("municipio")) ?? undefined,
    };

    return dto;
  };

  try {
    const ativo = await runQuery(true);
    if (ativo) return ativo;
    return await runQuery(false);
  } catch {
    return null;
  }
}
