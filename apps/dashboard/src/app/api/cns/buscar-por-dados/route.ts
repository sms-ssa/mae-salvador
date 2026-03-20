import { NextRequest, NextResponse } from "next/server";
import { citizenDtoToPacienteBaseFederal } from "@mae-salvador/shared";
import { isCnsFederalConfigured } from "@/lib/cns-federal";
import { getCitizenByNomeAndDataNascimento } from "@/lib/citizen-providers/esus-citizen-provider";

/**
 * GET /api/cns/buscar-por-dados?nome=...&nomeMae=...&dataNascimento=...
 *
 * Busca na PEC (e-SUS - PostgreSQL) por dados demográficos.
 * Retorna CitizenDto para pré-preencher o cadastro quando encontrado.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nomeCompleto = searchParams.get("nome")?.trim() ?? "";
  const nomeMae = searchParams.get("nomeMae")?.trim() ?? "";
  const dataNascimento = searchParams.get("dataNascimento")?.trim() ?? "";

  if (!nomeCompleto) {
    return NextResponse.json({
      cnsConfigurado: isCnsFederalConfigured(),
      sucesso: false,
      paciente: null,
      mensagem: "Informe o parâmetro nome na query string.",
    });
  }

  const cnsConfigurado = isCnsFederalConfigured();

  try {
    const citizen = await getCitizenByNomeAndDataNascimento({
      nomeCompleto,
      nomeMae: nomeMae || undefined,
      dataNascimento: dataNascimento || undefined,
    });
    if (citizen) {
      const paciente = citizenDtoToPacienteBaseFederal(citizen);
      return NextResponse.json({
        cnsConfigurado,
        sucesso: true,
        paciente,
        citizen,
      });
    }

    return NextResponse.json({
      cnsConfigurado,
      sucesso: false,
      paciente: null,
      mensagem: "Cidadão não localizado na PEC com os dados informados.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        cnsConfigurado,
        sucesso: false,
        paciente: null,
        mensagem: message,
      },
      { status: 500 },
    );
  }
}
