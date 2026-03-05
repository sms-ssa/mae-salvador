import { NextRequest, NextResponse } from "next/server";
import { citizenDtoToPacienteBaseFederal } from "@mae-salvador/shared";
import { isCnsFederalConfigured } from "@/lib/cns-federal";
import { getCitizenByCpfOrCns } from "@/lib/citizen-lookup-service";

/**
 * GET /api/cns/buscar?cpf=... ou ?cns=...
 *
 * Busca cidadão: 1) e-SUS (SQL Server), 2) CADSUS SOAP se não encontrar.
 * Resposta: ResultadoPesquisaBaseFederal (sucesso, paciente?, mensagem?).
 * Use mapPacienteBaseFederalToDadosCadastro(@mae-salvador/shared) para pré-preencher o cadastro.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf")?.trim();
  const cns = searchParams.get("cns")?.trim();

  const doc = cns && cns.replace(/\D/g, "").length === 15 ? cns : cpf;
  if (!doc?.trim()) {
    return NextResponse.json({
      cnsConfigurado: isCnsFederalConfigured(),
      sucesso: false,
      paciente: null,
      mensagem: "Informe o parâmetro cpf ou cns na query string.",
    });
  }

  if (!isCnsFederalConfigured()) {
    return NextResponse.json({
      cnsConfigurado: false,
      sucesso: false,
      paciente: null,
      mensagem:
        "Integração CNS Federal não configurada. Defina CNS_FEDERAL_USER e CNS_FEDERAL_PASSWORD no .env",
    });
  }

  try {
    const citizen = await getCitizenByCpfOrCns(doc);
    const paciente = citizenDtoToPacienteBaseFederal(citizen);
    if (paciente) {
      return NextResponse.json({
        cnsConfigurado: true,
        sucesso: true,
        paciente,
      });
    }
    return NextResponse.json({
      cnsConfigurado: true,
      sucesso: false,
      paciente: null,
      mensagem: "Cidadão não encontrado na base e-SUS nem no CADSUS.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        cnsConfigurado: true,
        sucesso: false,
        paciente: null,
        mensagem: message,
      },
      { status: 500 }
    );
  }
}
