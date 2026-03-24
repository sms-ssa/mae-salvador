/**
 * Repositório de acesso a dados de gestante (cadastro).
 * Encapsula queries SQL e mapeamento; usado pelas API Routes.
 */

import type { Pool } from "pg";

export interface GestanteCadastroInsertParams {
  cpf: string;
  cns: string | null;
  nomeCompleto: string;
  nomeMae: string | null;
  nomePai: string | null;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  telefone: string;
  temWhatsapp: boolean;
  email: string | null;
  telefoneAlternativo: string | null;
  telefoneResidencial: string | null;
  nomeSocial: string | null;
  nomeSocialPrincipal: boolean;
  identidadeGenero: string | null;
  orientacaoSexual: string | null;
  racaCor: string | null;
  sexo: string | null;
  possuiDeficiencia: boolean;
  deficiencia: string | null;
  tipoLogradouro: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cep: string;
  municipio: string | null;
  pontoReferencia: string | null;
  distritoSanitarioId: string | null;
  descobrimentoGestacao: string;
  dum: string | null;
  programaSocial: string;
  programaSocialIds: string[];
  nis: string | null;
  planoSaude: string | null;
  manterAcompanhamentoUbs: string | null;
  ubsId: string | null;
  gestacoesPrevias: number | null;
  partosNormal: number | null;
  partosCesareo: number | null;
  abortos: number | null;
  alergias: string | null;
  doencasConhecidas: string | null;
  medicacoesEmUso: string | null;
  origemCadastro: "manual" | "cip";
  senhaHash: string | null;
}

/**
 * Resolve códigos de distrito e UBS para UUIDs e insere registro em gestante_cadastro.
 * Retorna o id do registro criado ou null em caso de falha.
 * @throws Não lança; erros de constraint (ex.: duplicate) devem ser tratados pelo caller.
 */
export async function insertGestanteCadastro(
  pool: Pool,
  params: GestanteCadastroInsertParams
): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const distritoRow = params.distritoSanitarioId
      ? await client.query<{ id: string }>(
          "SELECT id FROM distrito_sanitario WHERE codigo = $1",
          [params.distritoSanitarioId]
        )
      : { rows: [] };
    let ubsUuid: string | null = null;
    if (params.ubsId) {
      const ubsRow = await client.query<{ id: string }>(
        "SELECT id FROM ubs WHERE codigo = $1",
        [params.ubsId]
      );
      ubsUuid = ubsRow.rows[0]?.id ?? null;
      if (!ubsUuid) {
        await client.query("ROLLBACK");
        return null;
      }
    }
    const distritoUuid = distritoRow.rows[0]?.id ?? null;

    const res = await client.query<{ id: string }>(
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
        params.cpf,
        params.cns,
        params.nomeCompleto,
        params.nomeMae,
        params.nomePai,
        params.dataNascimento,
        params.municipioNascimento,
        params.telefone,
        params.temWhatsapp,
        params.email,
        params.telefoneAlternativo,
        params.telefoneResidencial,
        params.nomeSocial,
        params.nomeSocialPrincipal,
        params.identidadeGenero,
        params.orientacaoSexual,
        params.racaCor,
        params.sexo,
        params.possuiDeficiencia,
        params.deficiencia,
        params.tipoLogradouro,
        params.logradouro,
        params.numero,
        params.complemento,
        params.bairro,
        params.cep,
        params.municipio,
        params.pontoReferencia,
        distritoUuid,
        params.descobrimentoGestacao,
        params.dum,
        params.programaSocial,
        params.nis,
        params.planoSaude,
        params.manterAcompanhamentoUbs,
        ubsUuid,
        params.gestacoesPrevias,
        params.partosNormal,
        params.partosCesareo,
        params.abortos,
        params.alergias,
        params.doencasConhecidas,
        params.medicacoesEmUso,
        params.origemCadastro,
        params.senhaHash,
      ]
    );
    const cadastroId = res.rows[0]?.id ?? null;
    if (!cadastroId) {
      await client.query("ROLLBACK");
      return null;
    }
    if (params.programaSocialIds.length > 0) {
      await client.query(
        `INSERT INTO gestante_cadastro_programa_social (gestante_cadastro_id, programa_social_id)
       SELECT $1::uuid, UNNEST($2::uuid[])`,
        [cadastroId, params.programaSocialIds],
      );
    }
    await client.query("COMMIT");
    return cadastroId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
