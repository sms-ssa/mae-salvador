import { NextRequest, NextResponse } from "next/server";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function onlyDigits(s: string, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

/**
 * Verifica se já existe cadastro na base local (gestante_cadastro).
 * - GET ?cpf=xxx (11 dígitos) → verifica por CPF
 * - GET ?cns=xxx (15 dígitos) → verifica por CNS
 * - POST body { nomeCompleto, nomeMae?, dataNascimento? } → verifica por dados do paciente
 * Retorna { existe: boolean }.
 */
export async function GET(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json({ existe: false });
  }
  const cpf = onlyDigits(request.nextUrl.searchParams.get("cpf") ?? "", 11);
  const cns = onlyDigits(request.nextUrl.searchParams.get("cns") ?? "", 15);

  try {
    const pool = getAppPool();

    if (cpf.length === 11) {
      const res = await pool.query<{ id: string }>(
        `SELECT id FROM gestante_cadastro
         WHERE cpf = $1 OR REPLACE(REPLACE(REPLACE(COALESCE(cpf, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $1
         LIMIT 1`,
        [cpf]
      );
      return NextResponse.json({ existe: res.rows.length > 0 });
    }

    if (cns.length === 15) {
      const res = await pool.query<{ id: string }>(
        `SELECT id FROM gestante_cadastro
         WHERE cns IS NOT NULL AND (cns = $1 OR REPLACE(REPLACE(REPLACE(COALESCE(cns, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $1)
         LIMIT 1`,
        [cns]
      );
      return NextResponse.json({ existe: res.rows.length > 0 });
    }
  } catch (e) {
    const err = e as Error & { code?: string };
    console.error("[API gestante/verificar GET]", e);
    const raw = typeof err.message === "string" ? err.message : String(e);
    const code = typeof err.code === "string" ? err.code : "";
    const isDbError =
      /does not exist|relation|ECONNREFUSED|connect|ENOTFOUND|ETIMEDOUT|timeout|password|authentication|pg_hba|SSL|database|APP_DATABASE_URL/i.test(
        raw + " " + code
      );
    const msg = isDbError
      ? "Banco de dados não disponível ou tabelas não criadas. Na raiz do projeto execute: npm run db:migrate. Detalhe: " +
        raw
      : process.env.NODE_ENV === "development"
        ? raw
        : "Erro ao verificar cadastro. Tente novamente.";
    return NextResponse.json({ existe: false, erro: msg }, { status: 500 });
  }

  return NextResponse.json({ existe: false });
}

export async function POST(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json({ existe: false });
  }
  let body: { nomeCompleto?: string; nomeMae?: string; dataNascimento?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ existe: false });
  }
  const nomeCompleto = String(body.nomeCompleto ?? "").trim();
  const nomeMae = String(body.nomeMae ?? "").trim();
  const dataNasc = String(body.dataNascimento ?? "").trim().slice(0, 10);

  if (!nomeCompleto) {
    return NextResponse.json({ existe: false });
  }

  try {
    const pool = getAppPool();
    let query = `
      SELECT id FROM gestante_cadastro
      WHERE TRIM(COALESCE(nome_completo, '')) ILIKE $1
    `;
    const params: string[] = [nomeCompleto];
    if (nomeMae) {
      params.push(nomeMae);
      query += ` AND TRIM(COALESCE(nome_mae, '')) ILIKE $${params.length}`;
    }
    if (dataNasc && /^\d{4}-\d{2}-\d{2}$/.test(dataNasc)) {
      params.push(dataNasc);
      query += ` AND data_nascimento::text = $${params.length}`;
    }
    query += " LIMIT 1";

    const res = await pool.query<{ id: string }>(query, params);
    return NextResponse.json({ existe: res.rows.length > 0 });
  } catch (e) {
    const err = e as Error & { code?: string };
    console.error("[API gestante/verificar POST]", e);
    const raw = typeof err.message === "string" ? err.message : String(e);
    const code = typeof err.code === "string" ? err.code : "";
    const isDbError =
      /does not exist|relation|ECONNREFUSED|connect|ENOTFOUND|ETIMEDOUT|timeout|password|authentication|pg_hba|SSL|database|APP_DATABASE_URL/i.test(
        raw + " " + code
      );
    const msg = isDbError
      ? "Banco de dados não disponível ou tabelas não criadas. Na raiz do projeto execute: npm run db:migrate. Detalhe: " +
        raw
      : process.env.NODE_ENV === "development"
        ? raw
        : "Erro ao verificar cadastro. Tente novamente.";
    return NextResponse.json({ existe: false, erro: msg }, { status: 500 });
  }
}
