import { NextRequest, NextResponse } from "next/server";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";
import { verificarSenha } from "@/lib/senha";

function onlyDigits(s: string, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

/**
 * POST /api/gestante/login
 * Body: { cpfCns: string, senha: string }
 * Retorna { ok: true, gestante: { id, nomeCompleto, nomeSocial, nomeSocialPrincipal } } ou { ok: false, erro }.
 */
export async function POST(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, erro: "Serviço indisponível." },
      { status: 503 }
    );
  }
  let body: { cpfCns?: string; senha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, erro: "Dados inválidos." },
      { status: 400 }
    );
  }
  const cpfCns = onlyDigits(String(body.cpfCns ?? ""), 15);
  const senha = String(body.senha ?? "").trim();
  if (!cpfCns) {
    return NextResponse.json(
      { ok: false, erro: "Nenhum usuário localizado com o CPF ou CNS informado. Crie sua conta" },
      { status: 401 }
    );
  }
  if (!senha) {
    return NextResponse.json(
      { ok: false, erro: "Senha é obrigatória." },
      { status: 400 }
    );
  }
  const pool = getAppPool();
  const cpfNorm = cpfCns.length === 11 ? cpfCns : null;
  const cnsNorm = cpfCns.length === 15 ? cpfCns : null;
  const res = await pool.query<{
    id: string;
    nome_completo: string;
    nome_social: string | null;
    nome_social_principal: boolean;
    senha_hash: string | null;
  }>(
    `SELECT id, nome_completo, nome_social, nome_social_principal, senha_hash
     FROM gestante_cadastro
     WHERE (LENGTH($1::text) = 11 AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = $1)
        OR (LENGTH($1::text) = 15 AND REPLACE(REPLACE(REPLACE(cns, '.', ''), '-', ''), ' ', '') = $1)
     LIMIT 1`,
    [cpfCns]
  );
  const row = res.rows[0];
  if (!row) {
    return NextResponse.json(
      { ok: false, erro: "Nenhum usuário localizado com o CPF ou CNS informado. Crie sua conta" },
      { status: 401 }
    );
  }
  if (!row.senha_hash) {
    return NextResponse.json(
      { ok: false, erro: "Conta sem senha definida. Use Esqueceu Senha ou crie uma nova conta." },
      { status: 401 }
    );
  }
  if (!verificarSenha(senha, row.senha_hash)) {
    return NextResponse.json(
      { ok: false, erro: "Senha incorreta. Tente novamente." },
      { status: 401 }
    );
  }
  return NextResponse.json({
    ok: true,
    gestante: {
      id: row.id,
      nomeCompleto: row.nome_completo,
      nomeSocial: row.nome_social,
      nomeSocialPrincipal: row.nome_social_principal,
    },
  });
}
