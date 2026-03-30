import { NextRequest, NextResponse } from "next/server";
import type { CitizenDto, PacienteBaseFederal } from "@mae-salvador/shared";
import { citizenDtoToPacienteBaseFederal } from "@mae-salvador/shared";
import {
  isCnsFederalConfigured,
  pesquisarPacientePorNomeDataNascimento,
  pesquisarPacientePorNomeNomeMae,
} from "@/lib/cns-federal";
import { getCitizenByNomeAndDataNascimento } from "@/lib/citizen-providers/esus-citizen-provider";

/**
 * GET /api/cns/buscar-por-dados?nome=...&nomeMae=...&dataNascimento=...
 *
 * Busca por dados demográficos:
 * 1) PEC (e-SUS - PostgreSQL)
 * 2) CADWEB/CNS Federal (SOAP) quando não encontrar no e-SUS
 * Retorna CitizenDto para pré-preencher o cadastro quando encontrado.
 */

function pacienteFederalToCitizenDto(
  paciente: PacienteBaseFederal | null | undefined,
): CitizenDto | null {
  if (!paciente) return null;
  const trim = (v: string | null | undefined): string | undefined => {
    const s = (v ?? "").trim();
    return s ? s : undefined;
  };
  return {
    cpf: trim(paciente.cpf),
    cns: trim(paciente.cns),
    nomeCompleto: trim(paciente.nome),
    nomeSocial: trim(paciente.nomeSocial),
    nomeMae: trim(paciente.nomeMae),
    nomePai: trim(paciente.nomePai),
    dataNascimento: trim(paciente.dataNascimento),
    sexo: trim(paciente.sexo),
    racaCor: trim(paciente.racaCor),
    identidadeGenero: trim(paciente.identidadeGenero),
    orientacaoSexual: trim(paciente.orientacaoSexual),
    telefoneCelular: trim(paciente.telefoneCelular),
    telefoneResidencial: trim(paciente.telefoneResidencial),
    email: trim(paciente.emails),
    logradouro: trim(paciente.logradouro),
    tipoLogradouro: trim(paciente.tipoLogradouro),
    numero: trim(paciente.numero),
    complemento: trim(paciente.complemento),
    bairro: trim(paciente.bairro),
    cep: trim(paciente.cep),
    municipio: trim(paciente.municipio),
  };
}

function isMensagemAcessoIndisponivel(mensagem: string | undefined): boolean {
  const m = (mensagem ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!m) return false;
  return (
    m.includes("ERRO DE CONEXAO") ||
    m.includes("HTTP ") ||
    m.includes("SOAP") ||
    m.includes("BODY NAO ENCONTRADO") ||
    m.includes("NAO CONFIGURADA")
  );
}

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
    let esusIndisponivel = false;
    let cadwebIndisponivel = false;
    let citizen: CitizenDto | null = null;
    try {
      citizen = await getCitizenByNomeAndDataNascimento({
        nomeCompleto,
        nomeMae: nomeMae || undefined,
        dataNascimento: dataNascimento || undefined,
      });
    } catch {
      esusIndisponivel = true;
    }

    if (citizen) {
      const paciente = citizenDtoToPacienteBaseFederal(citizen);
      return NextResponse.json({
        cnsConfigurado,
        sucesso: true,
        paciente,
        fontesIndisponiveis: false,
        citizen,
      });
    }

    // Fallback CADWEB/CNS Federal: tenta por Nome+Data e/ou Nome+Nome da Mãe
    if (cnsConfigurado) {
      if (dataNascimento) {
        const byNomeData = await pesquisarPacientePorNomeDataNascimento(
          nomeCompleto,
          dataNascimento,
        );
        if (byNomeData.sucesso && byNomeData.paciente) {
          const citizenFederal = pacienteFederalToCitizenDto(byNomeData.paciente);
          return NextResponse.json({
            cnsConfigurado,
            sucesso: true,
            paciente: byNomeData.paciente,
            fontesIndisponiveis: false,
            citizen: citizenFederal,
          });
        }
        if (isMensagemAcessoIndisponivel(byNomeData.mensagem)) {
          cadwebIndisponivel = true;
        }
      }

      if (nomeMae) {
        const byNomeMae = await pesquisarPacientePorNomeNomeMae(
          nomeCompleto,
          nomeMae,
        );
        if (byNomeMae.sucesso && byNomeMae.paciente) {
          const citizenFederal = pacienteFederalToCitizenDto(byNomeMae.paciente);
          return NextResponse.json({
            cnsConfigurado,
            sucesso: true,
            paciente: byNomeMae.paciente,
            fontesIndisponiveis: false,
            citizen: citizenFederal,
          });
        }
        if (isMensagemAcessoIndisponivel(byNomeMae.mensagem)) {
          cadwebIndisponivel = true;
        }
      }
    }

    if (esusIndisponivel && (cadwebIndisponivel || !cnsConfigurado)) {
      return NextResponse.json({
        cnsConfigurado,
        sucesso: false,
        paciente: null,
        fontesIndisponiveis: true,
        mensagem:
          "No momento, não foi possível acessar o e-SUS PEC e o CadWeb. Verifique sua conexão e tente novamente em alguns minutos.",
      });
    }

    return NextResponse.json({
      cnsConfigurado,
      sucesso: false,
      paciente: null,
      fontesIndisponiveis: false,
      mensagem:
        "Cidadão não localizado na PEC nem no CADWEB com os dados informados.",
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
