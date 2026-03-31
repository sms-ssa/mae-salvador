import { NextRequest, NextResponse } from "next/server";
import { citizenDtoToPacienteBaseFederal } from "@mae-salvador/shared";
import { isCnsFederalConfigured } from "@/lib/cns-federal";
import { getCitizenByCpfOrCnsWithDiagnostics } from "@/lib/citizen-lookup-service";

/**
 * GET /api/cns/buscar?cpf=... ou ?cns=...
 *
 * Busca cidadão: 1) e-SUS (PostgreSQL), 2) CADSUS SOAP se não encontrar.
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

  // Mesmo sem CNS Federal configurado, ainda podemos buscar no e-SUS (PostgreSQL).
  // A integração CADSUS SOAP pode falhar internamente e será tratada pelo serviço.
  const cnsConfigurado = isCnsFederalConfigured();

  try {
    const { citizen, esusIndisponivel, cadwebIndisponivel } =
      await getCitizenByCpfOrCnsWithDiagnostics(doc);
    const paciente = citizenDtoToPacienteBaseFederal(citizen);
    if (paciente) {
      return NextResponse.json({
        cnsConfigurado,
        sucesso: true,
        paciente,
        fontesIndisponiveis: false,

        citizen,
      });
    }
    if (esusIndisponivel && cadwebIndisponivel) {
      return NextResponse.json({
        cnsConfigurado,
        sucesso: false,
        paciente: null,
        fontesIndisponiveis: true,
        mensagem:
          "No momento não foi possível conectar com o eSUS PEC e o CadSUS. Tente novamente mais tarde!",
      });
    }
    return NextResponse.json({
      cnsConfigurado,
      sucesso: false,
      paciente: null,
      fontesIndisponiveis: false,
      mensagem: cnsConfigurado
        ? "Cidadão não encontrado na base e-SUS nem no CADSUS."
        : "Cidadão não encontrado na base e-SUS. (Integração CNS Federal não configurada.)",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        cnsConfigurado,
        sucesso: false,
        paciente: null,
        fontesIndisponiveis: false,
        mensagem: message,
      },
      { status: 500 },
    );
  }
}
