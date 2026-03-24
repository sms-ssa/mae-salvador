import { NextRequest, NextResponse } from "next/server";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";
import { insertGestanteCadastro } from "@/lib/repositories/gestante.repository";
import { hashSenha } from "@/lib/senha";

const DDD_VALIDOS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

function onlyDigits(s: string | null | undefined, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
}

function isDddValido(ddd: string): boolean {
  return DDD_VALIDOS.has(ddd);
}

function toDate(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  if (!v) return null;
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return null;
}

function toSmallInt(s: string | null | undefined): number | null {
  const v = (s ?? "").trim();
  if (v === "") return null;
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < 0) return null;
  if (n > 32767) return 32767;
  return n;
}

/**
 * POST /api/gestante/cadastrar
 * Body JSON: dados do formulário de cadastro da gestante (camelCase).
 * Insere em gestante_cadastro e retorna { ok: true, id } ou erro.
 */
export async function POST(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, erro: "Banco de dados não configurado (APP_DATABASE_URL)." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, erro: "Corpo da requisição inválido (JSON)." },
      { status: 400 }
    );
  }

  const cpfRaw = onlyDigits(String(body.cpf ?? ""), 11);
  const cnsRaw = onlyDigits(String(body.cns ?? ""), 15);
  const nomeCompleto = String(body.nomeCompleto ?? "").trim();
  const nomeMae = String(body.nomeMae ?? "").trim() || null;
  const nomePai = String(body.nomePai ?? "").trim() || null;
  const dataNascimento = toDate(String(body.dataNascimento ?? ""));
  // Campo legado (pergunta de segurança) removido do formulário.
  const municipioNascimento = null;
  const telefone = onlyDigits(String(body.telefone ?? ""), 11);
  const telefoneAlternativoRaw = String(body.telefoneAlternativo ?? "").trim();
  const telefoneResidencialRaw = String(body.telefoneResidencial ?? "").trim();
  const telefoneAlternativo = telefoneAlternativoRaw || null;
  const telefoneResidencial = telefoneResidencialRaw || null;
  const email = String(body.email ?? "").trim() || null;
  const temWhatsapp = Boolean(body.temWhatsapp);
  const nomeSocial = String(body.nomeSocial ?? "").trim() || null;
  const nomeSocialPrincipal = Boolean(body.nomeSocialPrincipal);
  const identidadeGenero = String(body.identidadeGenero ?? "").trim() || null;
  const orientacaoSexual = String(body.orientacaoSexual ?? "").trim() || null;
  const racaCor = (String(body.racaCor ?? "").trim() || null) as "BRANCA" | "PARDA" | "PRETA" | "AMARELA" | "INDIGENA" | null;
  const sexo = (String(body.sexo ?? "").trim() || null) as "FEMININO" | "MASCULINO" | "INDETERMINADO" | null;
  const possuiDeficiencia = Boolean(body.possuiDeficiencia);
  const deficiencia = String(body.deficiencia ?? "").trim() || null;
  const senha = String(body.senha ?? "").trim();
  const tipoLogradouro = String(body.tipoLogradouro ?? "").trim() || null;
  const logradouro = String(body.logradouro ?? "").trim();
  const numero = String(body.numero ?? "").trim();
  const complemento = String(body.complemento ?? "").trim() || null;
  const bairro = String(body.bairro ?? "").trim();
  const cepRaw = onlyDigits(String(body.cep ?? ""), 8);
  const municipio = String(body.municipio ?? "").trim() || null;
  const pontoReferencia = String(body.pontoReferencia ?? "").trim() || null;
  const distritoSanitarioId = String(body.distritoId ?? "").trim() || null;
  const descobrimentoGestacao = String(body.descobrimento ?? "").trim();
  const programaSocialIds = Array.isArray(body.programaSocialIds)
    ? body.programaSocialIds.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const nis = String(body.nis ?? "").trim() || null;
  const planoSaude = (String(body.planoSaude ?? "").trim() || null) as "sim" | "nao" | null;
  const manterAcompanhamentoUbs = (String(body.manterAcompanhamentoUbs ?? "").trim() || null) as "sim" | "nao" | null;
  const ubsId = String(body.ubsId ?? "").trim() || null;
  const dum = toDate(String(body.dum ?? ""));
  const gestacoesPrevias = toSmallInt(String(body.gestacoesPrevias ?? ""));
  const partosNormal = toSmallInt(String(body.partosNormal ?? ""));
  const partosCesareo = toSmallInt(String(body.partosCesareo ?? ""));
  const abortos = toSmallInt(String(body.abortos ?? ""));
  const alergias = String(body.alergias ?? "").trim() || null;
  const doencasConhecidas = String(body.doencasConhecidas ?? "").trim() || null;
  const medicacoesEmUso = String(body.medicacoesEmUso ?? "").trim() || null;
  const origemCadastro = String(body.origemCadastro ?? "manual").trim() === "cip" ? "cip" : "manual";

  const cpfValido = cpfRaw.length === 11;
  const cnsValido = cnsRaw.length === 15;
  // Se o usuário preencheu parte do CPF/CNS, não devemos aceitar.
  // Isso evita gravar CPF/CNS truncados quando o outro campo está correto.
  if (cpfRaw.length > 0 && cpfRaw.length !== 11) {
    return NextResponse.json(
      { ok: false, erro: "CPF deve conter 11 dígitos." },
      { status: 400 }
    );
  }
  if (cnsRaw.length > 0 && cnsRaw.length !== 15) {
    return NextResponse.json(
      { ok: false, erro: "CNS deve conter 15 dígitos." },
      { status: 400 }
    );
  }
  if (!cpfValido && !cnsValido) {
    return NextResponse.json(
      { ok: false, erro: "Informe CPF (11 dígitos) ou Cartão Nacional de Saúde (15 dígitos)." },
      { status: 400 }
    );
  }
  const cpfInserir = cpfValido ? cpfRaw : "";
  if (senha && (senha.length < 6 || senha.length > 15)) {
    return NextResponse.json(
      { ok: false, erro: "A senha deve ter entre 6 e 15 caracteres." },
      { status: 400 }
    );
  }
  if (!nomeCompleto) {
    return NextResponse.json(
      { ok: false, erro: "Nome completo é obrigatório." },
      { status: 400 }
    );
  }
  if (nomeCompleto.length > 70) {
    return NextResponse.json(
      { ok: false, erro: "Nome completo deve ter no máximo 70 caracteres." },
      { status: 400 }
    );
  }
  if (!dataNascimento) {
    return NextResponse.json(
      { ok: false, erro: "Data de nascimento é obrigatória." },
      { status: 400 }
    );
  }
  if (telefone.length !== 11 || telefone[2] !== "9") {
    return NextResponse.json(
      { ok: false, erro: "Telefone celular principal é obrigatório (DDD + 9 dígitos, iniciando com 9)." },
      { status: 400 }
    );
  }
  const dddPrincipal = telefone.slice(0, 2);
  if (!isDddValido(dddPrincipal)) {
    return NextResponse.json(
      { ok: false, erro: "DDD do telefone celular principal inválido." },
      { status: 400 }
    );
  }
  if (telefoneAlternativo) {
    const telAltDigits = onlyDigits(telefoneAlternativo, 11);
    if (telAltDigits.length !== 11 || telAltDigits[2] !== "9" || !isDddValido(telAltDigits.slice(0, 2))) {
      return NextResponse.json(
        { ok: false, erro: "Telefone celular alternativo inválido (DDD válido + 9 dígitos)." },
        { status: 400 }
      );
    }
  }
  if (telefoneResidencial) {
    const telResDigits = onlyDigits(telefoneResidencial, 10);
    if (telResDigits.length !== 10 || !/^[2-5]/.test(telResDigits.slice(2)) || !isDddValido(telResDigits.slice(0, 2))) {
      return NextResponse.json(
        { ok: false, erro: "Telefone residencial inválido (DDD válido + 8 dígitos)." },
        { status: 400 }
      );
    }
  }
  if (email && (email.length > 100 || !email.includes("@") || !email.includes("."))) {
    return NextResponse.json(
      { ok: false, erro: "E-mail inválido." },
      { status: 400 }
    );
  }
  if (!logradouro || !numero || !bairro || cepRaw.length !== 8) {
    return NextResponse.json(
      { ok: false, erro: "Endereço completo (logradouro, número ou S/N, bairro, CEP 8 dígitos) é obrigatório." },
      { status: 400 }
    );
  }
  const validDescobrimento = ["teste-rapido", "beta-hcg", "atraso-menstrual"].includes(descobrimentoGestacao);
  if (!validDescobrimento) {
    return NextResponse.json(
      { ok: false, erro: "Como descobriu a gestação é obrigatório." },
      { status: 400 }
    );
  }
  if (!programaSocialIds.length) {
    return NextResponse.json(
      { ok: false, erro: "Programa social é obrigatório." },
      { status: 400 }
    );
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (programaSocialIds.some((id) => !uuidRegex.test(id))) {
    return NextResponse.json(
      { ok: false, erro: "Programa social inválido." },
      { status: 400 }
    );
  }
  const pool = getAppPool();
  const programasRes = await pool.query<{ id: string; codigo: string }>(
    `SELECT id, codigo FROM programa_social WHERE id = ANY($1::uuid[])`,
    [programaSocialIds],
  );
  const programasSelecionados = programasRes.rows;
  if (programasSelecionados.length !== new Set(programaSocialIds).size) {
    return NextResponse.json(
      { ok: false, erro: "Programa social inválido." },
      { status: 400 }
    );
  }
  const codigosPrograma = programasSelecionados.map((p) => p.codigo);
  if (codigosPrograma.includes("nenhum") && codigosPrograma.length > 1) {
    return NextResponse.json(
      { ok: false, erro: "Programa social inválido." },
      { status: 400 }
    );
  }
  if (codigosPrograma.includes("bolsa-familia")) {
    const nisDigits = onlyDigits(nis ?? "", 11);
    if (nisDigits.length !== 11) {
      return NextResponse.json(
        { ok: false, erro: "NIS é obrigatório para Bolsa Família (11 dígitos)." },
        { status: 400 }
      );
    }
  }
  if (dum) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataDum = new Date(dum);
    dataDum.setHours(0, 0, 0, 0);
    const diasAtras = Math.round((hoje.getTime() - dataDum.getTime()) / (24 * 60 * 60 * 1000));
    if (diasAtras < 7 || diasAtras > 294) {
      return NextResponse.json(
        { ok: false, erro: "Data da última menstruação deve estar entre 7 e 294 dias atrás." },
        { status: 400 }
      );
    }
  }
  const senhaHash = senha ? hashSenha(senha) : null;
  const racaCorDb = racaCor && ["BRANCA", "PARDA", "PRETA", "AMARELA", "INDIGENA"].includes(racaCor) ? racaCor : null;
  const sexoDb = sexo && ["FEMININO", "MASCULINO", "INDETERMINADO"].includes(sexo) ? sexo : null;

  try {
    const id = await insertGestanteCadastro(pool, {
      cpf: cpfInserir,
      cns: cnsRaw || null,
      nomeCompleto,
      nomeMae,
      nomePai,
      dataNascimento,
      municipioNascimento,
      telefone,
      temWhatsapp,
      email,
      telefoneAlternativo,
      telefoneResidencial,
      nomeSocial,
      nomeSocialPrincipal,
      identidadeGenero,
      orientacaoSexual,
      racaCor: racaCorDb,
      sexo: sexoDb,
      possuiDeficiencia,
      deficiencia,
      tipoLogradouro,
      logradouro,
      numero,
      complemento,
      bairro,
      cep: cepRaw,
      municipio,
      pontoReferencia,
      distritoSanitarioId,
      descobrimentoGestacao,
      dum,
      // Coluna legado (texto) permanece por compatibilidade com bases
      // que ainda têm CHECK de valor único. Os múltiplos programas são
      // persistidos na tabela de vínculo por IDs.
      programaSocial: codigosPrograma.includes("nenhum")
        ? "nenhum"
        : (codigosPrograma[0] ?? "nenhum"),
      programaSocialIds: programasSelecionados.map((p) => p.id),
      nis,
      planoSaude,
      manterAcompanhamentoUbs,
      ubsId,
      gestacoesPrevias,
      partosNormal,
      partosCesareo,
      abortos,
      alergias,
      doencasConhecidas,
      medicacoesEmUso,
      origemCadastro,
      senhaHash,
    });
    if (id === null) {
      return NextResponse.json(
        { ok: false, erro: ubsId ? "UBS de vinculação não encontrada. Selecione uma UBS válida." : "Erro ao salvar cadastro." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("idx_gestante_cadastro_cpf")) {
      return NextResponse.json(
        { ok: false, erro: "O cadastro deste usuário já existe. Faça login ou use Esqueceu Senha." },
        { status: 409 }
      );
    }
    console.error("[API gestante/cadastrar]", e);
    return NextResponse.json(
      { ok: false, erro: "Erro ao salvar cadastro. Tente novamente." },
      { status: 500 }
    );
  }
}
