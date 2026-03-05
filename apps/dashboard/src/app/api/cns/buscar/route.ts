import { NextRequest, NextResponse } from "next/server";
import {
  pesquisarPacientePorCpf,
  pesquisarPacientePorCns,
  isCnsFederalConfigured,
} from "@/lib/cns-federal";

/**
 * GET /api/cns/buscar?cpf=... ou ?cns=...
 *
 * Consulta dados do cidadão na Base Federal do CNS (CADWEB/PEC).
 * - cpf: 11 dígitos → PesquisarPacientePorCPF
 * - cns: 15 dígitos → PesquisarPacientePorCNS (busca alternativa)
 *
 * Resposta: ResultadoPesquisaBaseFederal (sucesso, paciente?, mensagem?).
 * Use mapPacienteBaseFederalToDadosCadastro(@mae-salvador/shared) para pré-preencher o cadastro.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf")?.trim();
  const cns = searchParams.get("cns")?.trim();

  if (!isCnsFederalConfigured()) {
    return NextResponse.json({
      cnsConfigurado: false,
      sucesso: false,
      paciente: null,
      mensagem:
        "Integração CNS Federal não configurada. Defina CNS_FEDERAL_USER e CNS_FEDERAL_PASSWORD no .env",
    });
  }

  if (cns && cns.replace(/\D/g, "").length === 15) {
    try {
      const resultado = await pesquisarPacientePorCns(cns);
      return NextResponse.json({
        cnsConfigurado: true,
        ...resultado,
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

  if (!cpf || !cpf.trim()) {
    return NextResponse.json({
      cnsConfigurado: true,
      sucesso: false,
      paciente: null,
      mensagem: "Informe o parâmetro cpf ou cns na query string.",
    });
  }

  try {
    const resultado = await pesquisarPacientePorCpf(cpf);
    return NextResponse.json({
      cnsConfigurado: true,
      ...resultado,
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
