import { NextRequest, NextResponse } from "next/server";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";
import { UBS_LIST } from "@mae-salvador/shared";

/**
 * GET /api/gestante/confirmacao?cadastroId=xxx
 *
 * Conforme doc Confirmação de Cadastro:
 * 1) Verificar se existe pré-natal nos últimos 9 meses (sem integração → não existe).
 * 2) Se não existe pré-natal → verificar cadastro individual (sem integração → assumir existe).
 * 3) Retornar opções de unidade mais próxima do endereço (por distrito do cadastro).
 *
 * Resposta:
 * - tipo "prenatal_existente": { unidade, mensagem } — concluir acompanhamento na unidade informada.
 * - tipo "unidades_proximas": { distritoNome, unidades: [{ nome, cnes?, distanciaKm }] } — exibir lista para iniciar pré-natal.
 */
export async function GET(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, erro: "Banco de dados não configurado." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const cadastroId = searchParams.get("cadastroId")?.trim();
  if (!cadastroId) {
    return NextResponse.json(
      { ok: false, erro: "Parâmetro cadastroId é obrigatório." },
      { status: 400 }
    );
  }

  const pool = getAppPool();
  try {
    const cadastroRow = await pool.query<{ distrito_codigo: string; distrito_nome: string }>(
      `SELECT d.codigo AS distrito_codigo, d.nome AS distrito_nome
       FROM gestante_cadastro g
       LEFT JOIN distrito_sanitario d ON d.id = g.distrito_sanitario_id
       WHERE g.id = $1`,
      [cadastroId]
    );
    const row = cadastroRow.rows[0];
    if (!row) {
      return NextResponse.json(
        { ok: false, erro: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    const distritoCodigo = row.distrito_codigo ?? "";
    const distritoNome = row.distrito_nome ?? "";

    // MVP: sem integração pré-natal/cadastro individual → sempre retornar unidades do distrito
    const unidadesDoDistrito = UBS_LIST.filter(
      (u) => u.distritoSanitarioId === distritoCodigo
    ).map((u) => ({
      id: u.id,
      nome: u.nome,
      cnes: u.cnes ?? undefined,
      distanciaKm: "—" as string, // Sem geolocalização: exibir "—" conforme doc
    }));

    // Se o distrito não tiver UBS na lista estática, retornar todas (fallback)
    const unidades =
      unidadesDoDistrito.length > 0
        ? unidadesDoDistrito
        : UBS_LIST.map((u) => ({
            id: u.id,
            nome: u.nome,
            cnes: u.cnes ?? undefined,
            distanciaKm: "—" as string,
          }));

    return NextResponse.json({
      ok: true,
      tipo: "unidades_proximas",
      distritoNome: distritoNome || undefined,
      unidades,
    });
  } catch (e) {
    console.error("[API gestante/confirmacao]", e);
    return NextResponse.json(
      { ok: false, erro: "Erro ao buscar dados de confirmação." },
      { status: 500 }
    );
  }
}
