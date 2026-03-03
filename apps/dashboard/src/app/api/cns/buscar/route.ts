import { NextRequest, NextResponse } from "next/server";
import {
  pesquisarPacientePorCpf,
  isCnsFederalConfigured,
} from "@/lib/cns-federal";

/**
 * GET /api/cns/buscar?cpf=...
 *
 * Consulta dados do cidadão na Base Federal do CNS (PesquisarPacientePorCPF).
 * CPF pode ser enviado com ou sem formatação.
 *
 * Resposta: ResultadoPesquisaBaseFederal (sucesso, paciente?, mensagem?).
 * Use mapPacienteBaseFederalToDadosCadastro(@mae-salvador/shared) para pré-preencher o cadastro.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf");

  if (!isCnsFederalConfigured()) {
    return NextResponse.json({
      cnsConfigurado: false,
      sucesso: false,
      paciente: null,
      mensagem:
        "Integração CNS Federal não configurada. Defina CNS_FEDERAL_USER e CNS_FEDERAL_PASSWORD no .env",
    });
  }

  if (!cpf || !cpf.trim()) {
    return NextResponse.json({
      cnsConfigurado: true,
      sucesso: false,
      paciente: null,
      mensagem: "Informe o parâmetro cpf na query string.",
    });
  }

  try {
    console.log("[CNS API] Busca recebida, CPF:", cpf.trim().replace(/\d(?=\d{4})/g, "*"));
    const resultado = await pesquisarPacientePorCpf(cpf.trim());
    console.log("[CNS API] Resultado base federal:", {
      sucesso: resultado.sucesso,
      temPaciente: Boolean(resultado.paciente),
      mensagem: resultado.mensagem,
    });
    if (resultado.paciente) {
      console.log("[CNS API] Dados do usuário retornados da base federal:", resultado.paciente);
    }
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
