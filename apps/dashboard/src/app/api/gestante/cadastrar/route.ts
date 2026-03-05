import { NextRequest, NextResponse } from "next/server";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";
import { hashSenha } from "@/lib/senha";

function onlyDigits(s: string | null | undefined, maxLen: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, maxLen);
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
  const municipioNascimento = String(body.municipioNascimento ?? "").trim() || null;
  const telefone = onlyDigits(String(body.telefone ?? ""), 11);
  const telefoneAlternativo = String(body.telefoneAlternativo ?? "").trim() || null;
  const telefoneResidencial = String(body.telefoneResidencial ?? "").trim() || null;
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
  const programaSocial = String(body.programaSocial ?? "").trim() || "nenhum";
  const nis = String(body.nis ?? "").trim() || null;
  const planoSaude = (String(body.planoSaude ?? "").trim() || null) as "sim" | "nao" | null;
  const manterAcompanhamentoUbs = (String(body.manterAcompanhamentoUbs ?? "").trim() || null) as "sim" | "nao" | null;
  const ubsId = String(body.ubsId ?? "").trim();
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
  if (email && (!email.includes("@") || !email.includes("."))) {
    return NextResponse.json(
      { ok: false, erro: "E-mail deve conter @ e ponto." },
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
  const validPrograma = ["nenhum", "bolsa-familia", "bpc-loas", "aluguel-social", "outros"].includes(programaSocial);
  if (!validPrograma) {
    return NextResponse.json(
      { ok: false, erro: "Programa social inválido." },
      { status: 400 }
    );
  }
  if (programaSocial === "bolsa-familia") {
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
  if (!ubsId) {
    return NextResponse.json(
      { ok: false, erro: "UBS de vinculação é obrigatória." },
      { status: 400 }
    );
  }

  const pool = getAppPool();
  try {
    // Formulário envia códigos (ex.: "ds-01", "ubs-001"); após migration 003 as colunas são UUID (FK)
    const distritoRow = distritoSanitarioId
      ? await pool.query<{ id: string }>("SELECT id FROM distrito_sanitario WHERE codigo = $1", [distritoSanitarioId])
      : { rows: [] };
    const ubsRow = await pool.query<{ id: string }>("SELECT id FROM ubs WHERE codigo = $1", [ubsId]);
    const distritoUuid = distritoRow.rows[0]?.id ?? null;
    const ubsUuid = ubsRow.rows[0]?.id ?? null;
    if (!ubsUuid) {
      return NextResponse.json(
        { ok: false, erro: "UBS de vinculação não encontrada. Selecione uma UBS válida." },
        { status: 400 }
      );
    }

    const senhaHash = senha ? hashSenha(senha) : null;
    const racaCorDb = racaCor && ["BRANCA", "PARDA", "PRETA", "AMARELA", "INDIGENA"].includes(racaCor) ? racaCor : null;
    const sexoDb = sexo && ["FEMININO", "MASCULINO", "INDETERMINADO"].includes(sexo) ? sexo : null;

    const res = await pool.query(
      `INSERT INTO gestante_cadastro (
        cpf, cns, nome_completo, nome_mae, nome_pai, data_nascimento, municipio_nascimento,
        telefone, tem_whatsapp, email, telefone_alternativo, telefone_residencial,
        nome_social, nome_social_principal, identidade_genero, orientacao_sexual,
        raca_cor, sexo, possui_deficiencia, deficiencia,
        tipo_logradouro, logradouro, numero, complemento, bairro, cep, municipio, ponto_referencia, distrito_sanitario_id,
        descobrimento_gestacao, dum, programa_social, nis, plano_saude, manter_acompanhamento_ubs,
        ubs_id, gestacoes_previas, partos_normal, partos_cesareo, abortos,
        alergias, doencas_conhecidas, medicacoes_em_uso, origem_cadastro, senha_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
      ) RETURNING id`,
      [
        cpfInserir,
        cnsRaw || null,
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
        racaCorDb,
        sexoDb,
        possuiDeficiencia,
        deficiencia,
        tipoLogradouro,
        logradouro,
        numero,
        complemento,
        bairro,
        cepRaw,
        municipio,
        pontoReferencia,
        distritoUuid,
        descobrimentoGestacao,
        dum,
        programaSocial,
        nis,
        planoSaude,
        manterAcompanhamentoUbs,
        ubsUuid,
        gestacoesPrevias,
        partosNormal,
        partosCesareo,
        abortos,
        alergias,
        doencasConhecidas,
        medicacoesEmUso,
        origemCadastro,
        senhaHash,
      ]
    );
    const id = res.rows[0]?.id ?? null;
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
