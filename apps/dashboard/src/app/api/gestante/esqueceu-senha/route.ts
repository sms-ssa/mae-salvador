import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";
import { hashSenha } from "@/lib/senha";

function onlyDigits(s: string, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

const challenges = new Map<
  string,
  {
    correctId: string;
    perguntaId: string;
    perguntaTexto: string;
    historicoPerguntas: string[];
    historicoTextos: string[];
  }
>();
/** Contagem de erros por CPF/CNS; ao atingir 3, bloqueia até o dia seguinte (doc Recuperação de Senha). */
const tokensRedefinir = new Map<string, { cpfCns: string; expires: number }>();

const TENTATIVAS_MAX = 3;
const TOKEN_VALIDADE_MS = 15 * 60 * 1000;

/** Retorna o início do próximo dia (00:00 UTC) para bloqueio "até o dia seguinte". */
function getProximoDiaUTCDate(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function isBloqueado(pool: Pool, cpfCns: string): Promise<boolean> {
  const res = await pool.query<{ tentativas: number; bloqueado_ate: Date | null }>(
    `SELECT tentativas, bloqueado_ate
       FROM gestante_esqueceu_senha_tentativas
      WHERE cpf_cns = $1
      LIMIT 1`,
    [cpfCns],
  );
  const row = res.rows[0];
  if (!row) return false;
  const bloqueadoAteMs = row.bloqueado_ate ? row.bloqueado_ate.getTime() : 0;
  if (bloqueadoAteMs > 0 && Date.now() >= bloqueadoAteMs) {
    await pool.query(
      `UPDATE gestante_esqueceu_senha_tentativas
          SET tentativas = 0, bloqueado_ate = NULL, atualizado_em = now()
        WHERE cpf_cns = $1`,
      [cpfCns],
    );
    return false;
  }
  return row.tentativas >= TENTATIVAS_MAX && bloqueadoAteMs > Date.now();
}

async function getTentativasRestantes(pool: Pool, cpfCns: string): Promise<number> {
  const res = await pool.query<{ tentativas: number; bloqueado_ate: Date | null }>(
    `SELECT tentativas, bloqueado_ate
       FROM gestante_esqueceu_senha_tentativas
      WHERE cpf_cns = $1
      LIMIT 1`,
    [cpfCns],
  );
  const row = res.rows[0];
  if (!row) return TENTATIVAS_MAX;
  const bloqueadoAteMs = row.bloqueado_ate ? row.bloqueado_ate.getTime() : 0;
  if (bloqueadoAteMs > 0 && Date.now() >= bloqueadoAteMs) return TENTATIVAS_MAX;
  return Math.max(TENTATIVAS_MAX - row.tentativas, 0);
}

async function registrarTentativaIncorreta(pool: Pool, cpfCns: string): Promise<number> {
  const now = Date.now();
  const res = await pool.query<{ tentativas: number; bloqueado_ate: Date | null }>(
    `INSERT INTO gestante_esqueceu_senha_tentativas (cpf_cns, tentativas, bloqueado_ate, atualizado_em)
     VALUES ($1, 1, NULL, now())
     ON CONFLICT (cpf_cns) DO UPDATE SET
       tentativas = CASE
         WHEN gestante_esqueceu_senha_tentativas.bloqueado_ate IS NOT NULL
              AND gestante_esqueceu_senha_tentativas.bloqueado_ate <= now()
           THEN 1
         ELSE gestante_esqueceu_senha_tentativas.tentativas + 1
       END,
       bloqueado_ate = CASE
         WHEN (
           CASE
             WHEN gestante_esqueceu_senha_tentativas.bloqueado_ate IS NOT NULL
                  AND gestante_esqueceu_senha_tentativas.bloqueado_ate <= now()
               THEN 1
             ELSE gestante_esqueceu_senha_tentativas.tentativas + 1
           END
        ) >= $2 THEN $3::timestamptz
         ELSE NULL
       END,
       atualizado_em = now()
     RETURNING tentativas, bloqueado_ate`,
    [cpfCns, TENTATIVAS_MAX, getProximoDiaUTCDate()],
  );
  const row = res.rows[0];
  if (!row) return 1;
  const bloqueadoAteMs = row.bloqueado_ate ? row.bloqueado_ate.getTime() : 0;
  if (bloqueadoAteMs > 0 && bloqueadoAteMs <= now) return 1;
  return row.tentativas;
}

async function resetarTentativas(pool: Pool, cpfCns: string): Promise<void> {
  await pool.query(
    `DELETE FROM gestante_esqueceu_senha_tentativas
      WHERE cpf_cns = $1`,
    [cpfCns],
  );
}

function gerarOpcoes(correta: string, tipo: string): { id: string; texto: string }[] {
  const opcoesFalsas: Record<string, string[]> = {
    nome: ["Ana Maria Santos", "Fernanda Oliveira", "Carla Souza Lima", "Patrícia Costa", "Juliana Ferreira"],
    nomeMae: ["Maria da Silva", "Ana Paula Oliveira", "Francisca Santos", "Tereza Costa", "Antônia Lima"],
    nomePai: ["José da Silva", "Carlos Oliveira", "Antônio Souza", "Roberto Lima", "João Ferreira"],
    data: ["1990-05-15", "1988-11-20", "1992-03-10", "1985-07-22", "1995-01-08"],
    municipioNascimento: ["SALVADOR", "FEIRA DE SANTANA", "CAMAÇARI", "LAURO DE FREITAS", "ILHEUS"],
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

type Pool = Awaited<ReturnType<typeof getAppPool>>;
async function obterNovaPergunta(
  pool: Pool,
  cpfCns: string,
  evitarPerguntaIds: string[] = [],
  evitarTextos: string[] = [],
): Promise<{ pergunta: string; opcoes: { id: string; texto: string }[]; correctId: string; perguntaId: string } | null> {
  const res = await pool.query<{ nome_completo: string; nome_mae: string | null; nome_pai: string | null; data_nascimento: Date | null; municipio_nascimento: string | null }>(
    `SELECT nome_completo, nome_mae, nome_pai, data_nascimento, municipio_nascimento FROM gestante_cadastro
     WHERE (LENGTH($1) = 11 AND REPLACE(REPLACE(REPLACE(COALESCE(cpf, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $1)
        OR (LENGTH($1) = 15 AND cns IS NOT NULL AND REPLACE(REPLACE(REPLACE(COALESCE(cns, '')::text, '.'::text, ''::text), '-'::text, ''::text), ' '::text, ''::text) = $1)
     LIMIT 1`,
    [cpfCns]
  );
  const row = res.rows[0];
  if (!row) return null;
  const tipos = [
    { id: "nome", pergunta: "Qual o nome completo cadastrado?", valor: row.nome_completo ?? "", tipoBase: "nome" },
    { id: "nome_alt", pergunta: "Informe o nome completo registrado.", valor: row.nome_completo ?? "", tipoBase: "nome" },
    { id: "nomeMae", pergunta: "Qual o nome da mãe?", valor: (row.nome_mae ?? "").trim(), tipoBase: "nomeMae" },
    { id: "nomeMae_alt", pergunta: "Informe o nome da mãe cadastrado.", valor: (row.nome_mae ?? "").trim(), tipoBase: "nomeMae" },
    { id: "nomePai", pergunta: "Qual o nome do pai?", valor: (row.nome_pai ?? "").trim(), tipoBase: "nomePai" },
    { id: "nomePai_alt", pergunta: "Informe o nome do pai cadastrado.", valor: (row.nome_pai ?? "").trim(), tipoBase: "nomePai" },
    { id: "data", pergunta: "Qual a data de nascimento?", valor: row.data_nascimento ? row.data_nascimento.toISOString().slice(0, 10) : "", tipoBase: "data" },
    { id: "data_alt", pergunta: "Informe a data de nascimento cadastrada.", valor: row.data_nascimento ? row.data_nascimento.toISOString().slice(0, 10) : "", tipoBase: "data" },
    { id: "municipioNascimento", pergunta: "Qual o município de nascimento?", valor: (row.municipio_nascimento ?? "").trim(), tipoBase: "municipioNascimento" },
    { id: "municipioNascimento_alt", pergunta: "Em qual município você nasceu?", valor: (row.municipio_nascimento ?? "").trim(), tipoBase: "municipioNascimento" },
  ].filter((t) => t.valor && t.valor !== "IGNORADA" && t.valor !== "IGNORADO");
  if (tipos.length === 0) return null;
  const tiposSemRepetir = tipos.filter(
    (t) => !evitarPerguntaIds.includes(t.id) && !evitarTextos.includes(t.pergunta),
  );
  const poolEscolha =
    tiposSemRepetir.length > 0
      ? tiposSemRepetir
      : tipos.filter((t) => t.id !== evitarPerguntaIds[evitarPerguntaIds.length - 1]);
  const poolFinal = poolEscolha.length > 0 ? poolEscolha : tipos;
  const escolhido = poolFinal[Math.floor(Math.random() * poolFinal.length)];
  const opcoes = gerarOpcoes(escolhido.valor, escolhido.tipoBase);
  const correctId = opcoes.find((o) => o.texto === escolhido.valor)!.id;
  return { pergunta: escolhido.pergunta, opcoes: opcoes.map((o) => ({ id: o.id, texto: o.texto })), correctId, perguntaId: escolhido.id };
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
  const pool = getAppPool();
  if (await isBloqueado(pool, cpfCns)) {
    return NextResponse.json(
      { erro: "Limite de tentativas alcançado. Tente novamente amanhã!" },
      { status: 429 }
    );
  }
  const nova = await obterNovaPergunta(pool, cpfCns);
  if (!nova) {
    return NextResponse.json(
      { erro: "Nenhum usuário localizado com o CPF ou CNS informado." },
      { status: 404 }
    );
  }
  challenges.set(cpfCns, {
    correctId: nova.correctId,
    perguntaId: nova.perguntaId,
    perguntaTexto: nova.pergunta,
    historicoPerguntas: [nova.perguntaId],
    historicoTextos: [nova.pergunta],
  });
  const tentativasRestantes = await getTentativasRestantes(pool, cpfCns);
  return NextResponse.json({
    pergunta: nova.pergunta,
    opcoes: nova.opcoes,
    tentativasRestantes,
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
    const pool = getAppPool();
    if (await isBloqueado(pool, cpfCns)) {
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
      const count = await registrarTentativaIncorreta(pool, cpfCns);
      challenges.delete(cpfCns);
      if (count >= TENTATIVAS_MAX) {
        return NextResponse.json(
          { ok: false, erro: "Limite de tentativas alcançado. Tente novamente amanhã!" },
          { status: 400 }
        );
      }
      const historico = Array.from(
        new Set([...(challenge.historicoPerguntas ?? []), challenge.perguntaId]),
      );
      const historicoTextos = Array.from(
        new Set([...(challenge.historicoTextos ?? []), challenge.perguntaTexto]),
      );
      const proxima = await obterNovaPergunta(pool, cpfCns, historico, historicoTextos);
      const tentativasRestantes = Math.max(TENTATIVAS_MAX - count, 0);
      if (proxima) {
        challenges.set(cpfCns, {
          correctId: proxima.correctId,
          perguntaId: proxima.perguntaId,
          perguntaTexto: proxima.pergunta,
          historicoPerguntas: [...historico, proxima.perguntaId],
          historicoTextos: [...historicoTextos, proxima.pergunta],
        });
        return NextResponse.json({
          ok: false,
          erro: "Resposta incorreta. Tente a próxima pergunta.",
          proximaPergunta: true,
          pergunta: proxima.pergunta,
          opcoes: proxima.opcoes,
          tentativasRestantes,
        }, { status: 400 });
      }
      return NextResponse.json(
        { ok: false, erro: "Resposta incorreta. Tente novamente.", tentativasRestantes },
        { status: 400 }
      );
    }
    await resetarTentativas(pool, cpfCns);
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
