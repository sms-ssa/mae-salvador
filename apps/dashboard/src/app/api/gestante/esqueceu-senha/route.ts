import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";
import { hashSenha } from "@/lib/senha";

function onlyDigits(s: string, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

const challenges = new Map<string, { correctId: string; perguntaId: string }>();
const tentativasErradas = new Map<string, number>();
const tokensRedefinir = new Map<string, { cpfCns: string; expires: number }>();

const TENTATIVAS_MAX = 3;
const TOKEN_VALIDADE_MS = 15 * 60 * 1000;

function gerarOpcoes(correta: string, tipo: string): { id: string; texto: string }[] {
  const opcoesFalsas: Record<string, string[]> = {
    nome: ["Ana Maria Santos", "Fernanda Oliveira", "Carla Souza Lima", "Patrícia Costa", "Juliana Ferreira"],
    nomeMae: ["Maria da Silva", "Ana Paula Oliveira", "Francisca Santos", "Tereza Costa", "Antônia Lima"],
    data: ["1990-05-15", "1988-11-20", "1992-03-10", "1985-07-22", "1995-01-08"],
  };
  const falsas = (opcoesFalsas[tipo] ?? opcoesFalsas.nome).filter((x) => x !== correta);
  while (falsas.length < 2) falsas.push(`Opção ${falsas.length + 1}`);
  const todas = [correta, falsas[0], falsas[1]];
  for (let i = todas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [todas[i], todas[j]] = [todas[j], todas[i]];
  }
  return todas.map((texto) => ({ id: randomBytes(8).toString("hex"), texto }));
}

/**
 * GET /api/gestante/esqueceu-senha?cpfCns=...
 * Retorna pergunta e 3 opções (uma correta). Armazena qual opção é a correta para verificação.
 */
export async function GET(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }
  const cpfCns = onlyDigits(request.nextUrl.searchParams.get("cpfCns") ?? "", 15);
  if (cpfCns.length !== 11 && cpfCns.length !== 15) {
    return NextResponse.json(
      { erro: "Informe CPF (11 dígitos) ou CNS (15 dígitos)." },
      { status: 400 }
    );
  }
  const tentativas = tentativasErradas.get(cpfCns) ?? 0;
  if (tentativas >= TENTATIVAS_MAX) {
    return NextResponse.json(
      { erro: "Limite de tentativas alcançado. Tente novamente amanhã!" },
      { status: 429 }
    );
  }
  const pool = getAppPool();
  const res = await pool.query<{ nome_completo: string; nome_mae: string | null; data_nascimento: Date | null }>(
    `SELECT nome_completo, nome_mae, data_nascimento FROM gestante_cadastro
     WHERE (LENGTH($1) = 11 AND REPLACE(REPLACE(REPLACE(COALESCE(cpf, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $1)
        OR (LENGTH($1) = 15 AND cns IS NOT NULL AND REPLACE(REPLACE(REPLACE(COALESCE(cns, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $1)
     LIMIT 1`,
    [cpfCns]
  );
  const row = res.rows[0];
  if (!row) {
    return NextResponse.json(
      { erro: "Nenhum usuário localizado com o CPF ou CNS informado." },
      { status: 404 }
    );
  }
  const tipos = [
    { id: "nome", pergunta: "Qual o nome completo cadastrado?", valor: row.nome_completo ?? "" },
    { id: "nomeMae", pergunta: "Qual o nome da mãe?", valor: (row.nome_mae ?? "").trim() },
    {
      id: "data",
      pergunta: "Qual a data de nascimento?",
      valor: row.data_nascimento ? row.data_nascimento.toISOString().slice(0, 10) : "",
    },
  ].filter((t) => t.valor && t.valor !== "IGNORADA" && t.valor !== "IGNORADO");
  if (tipos.length === 0) {
    return NextResponse.json(
      { erro: "Não foi possível gerar pergunta de segurança. Procure a unidade de saúde." },
      { status: 400 }
    );
  }
  const escolhido = tipos[Math.floor(Math.random() * tipos.length)];
  const opcoes = gerarOpcoes(escolhido.valor, escolhido.id);
  const correctId = opcoes.find((o) => o.texto === escolhido.valor)!.id;
  challenges.set(cpfCns, { correctId, perguntaId: escolhido.id });
  return NextResponse.json({
    pergunta: escolhido.pergunta,
    opcoes: opcoes.map((o) => ({ id: o.id, texto: o.texto })),
  });
}

/**
 * POST /api/gestante/esqueceu-senha
 * Body: { etapa: "verificar" | "redefinir", cpfCns?, opcaoId?, token?, novaSenha?, confirmaSenha? }
 */
export async function POST(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }
  let body: { etapa?: string; cpfCns?: string; opcaoId?: string; token?: string; novaSenha?: string; confirmaSenha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const etapa = body.etapa ?? "";

  if (etapa === "verificar") {
    const cpfCns = onlyDigits(String(body.cpfCns ?? ""), 15);
    const opcaoId = String(body.opcaoId ?? "").trim();
    if (!cpfCns || !opcaoId) {
      return NextResponse.json({ ok: false, erro: "CPF/CNS e opção são obrigatórios." }, { status: 400 });
    }
    const tentativas = tentativasErradas.get(cpfCns) ?? 0;
    if (tentativas >= TENTATIVAS_MAX) {
      return NextResponse.json(
        { ok: false, erro: "Limite de tentativas alcançado. Tente novamente amanhã!" },
        { status: 429 }
      );
    }
    const challenge = challenges.get(cpfCns);
    if (!challenge) {
      return NextResponse.json({ ok: false, erro: "Solicite uma nova pergunta (informe CPF/CNS novamente)." }, { status: 400 });
    }
    if (opcaoId !== challenge.correctId) {
      const nova = tentativas + 1;
      tentativasErradas.set(cpfCns, nova);
      challenges.delete(cpfCns);
      return NextResponse.json(
        { ok: false, erro: nova >= TENTATIVAS_MAX ? "Limite de tentativas alcançado. Tente novamente amanhã!" : "Resposta incorreta. Tente novamente." },
        { status: 400 }
      );
    }
    tentativasErradas.delete(cpfCns);
    challenges.delete(cpfCns);
    const token = randomBytes(24).toString("hex");
    tokensRedefinir.set(token, { cpfCns, expires: Date.now() + TOKEN_VALIDADE_MS });
    return NextResponse.json({ ok: true, token });
  }

  if (etapa === "redefinir") {
    const token = String(body.token ?? "").trim();
    const novaSenha = String(body.novaSenha ?? "").trim();
    const confirma = String(body.confirmaSenha ?? "").trim();
    if (!token || !novaSenha) {
      return NextResponse.json({ ok: false, erro: "Token e nova senha são obrigatórios." }, { status: 400 });
    }
    if (novaSenha.length < 6 || novaSenha.length > 15) {
      return NextResponse.json({ ok: false, erro: "A senha deve ter entre 6 e 15 caracteres." }, { status: 400 });
    }
    if (novaSenha !== confirma) {
      return NextResponse.json({ ok: false, erro: "As senhas não coincidem." }, { status: 400 });
    }
    const dados = tokensRedefinir.get(token);
    if (!dados) {
      return NextResponse.json({ ok: false, erro: "Link expirado. Solicite novamente." }, { status: 400 });
    }
    if (Date.now() > dados.expires) {
      tokensRedefinir.delete(token);
      return NextResponse.json({ ok: false, erro: "Link expirado. Solicite novamente." }, { status: 400 });
    }
    tokensRedefinir.delete(token);
    const pool = getAppPool();
    const senhaHash = hashSenha(novaSenha);
    await pool.query(
      `UPDATE gestante_cadastro SET senha_hash = $1, atualizado_em = now()
       WHERE (LENGTH($2) = 11 AND REPLACE(REPLACE(REPLACE(COALESCE(cpf, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $2)
          OR (LENGTH($2) = 15 AND cns IS NOT NULL AND REPLACE(REPLACE(REPLACE(COALESCE(cns, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $2)`,
      [senhaHash, dados.cpfCns]
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: "Etapa inválida." }, { status: 400 });
}
