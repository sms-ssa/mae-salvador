/**
 * Integração com a Base Federal do CNS (Cartão Nacional de Saúde).
 * Serviço legado (WCF/SOAP): PesquisarPacientePorCPF.
 *
 * - SOAP 1.1
 * - Endpoint: CNS_FEDERAL_URL
 * - Autenticação: HTTP Basic (CNS_FEDERAL_USER, CNS_FEDERAL_PASSWORD)
 * - Retorno tipado com PacienteBaseFederal do shared (não persiste dados federais).
 */

import type {
  PacienteBaseFederal,
  ResultadoPesquisaBaseFederal,
} from "@mae-salvador/shared";

const DEFAULT_CNS_URL =
  "http://177.20.6.29:8181/JAXWebserviceCnsMS/ServicoCns";

function getConfig(): {
  url: string;
  user: string;
  password: string;
  configured: boolean;
} {
  const url = process.env.CNS_FEDERAL_URL?.trim() || DEFAULT_CNS_URL;
  const user = process.env.CNS_FEDERAL_USER?.trim() ?? "";
  const password = process.env.CNS_FEDERAL_PASSWORD ?? "";
  return {
    url,
    user,
    password,
    configured: Boolean(user && password),
  };
}

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

const CNS_NAMESPACE = "http://servicos.nti.sms.salvador.ba.br/";

function normalizarCns(cns: string): string {
  return (cns ?? "").replace(/\D/g, "").slice(0, 15);
}

function buildSoapEnvelope(cpf: string): string {
  const cpfLimpo = normalizarCpf(cpf);
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "  <soap:Body>",
    `    <ns:PesquisarPacientePorCPF xmlns:ns="${CNS_NAMESPACE}">`,
    `      <cpf>${escapeXml(cpfLimpo)}</cpf>`,
    "    </ns:PesquisarPacientePorCPF>",
    "  </soap:Body>",
    "</soap:Envelope>",
  ].join("\n");
}

function buildSoapEnvelopeCns(cns: string): string {
  const cnsLimpo = normalizarCns(cns);
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "  <soap:Body>",
    `    <ns:PesquisarPacientePorCNS xmlns:ns="${CNS_NAMESPACE}">`,
    `      <cns>${escapeXml(cnsLimpo)}</cns>`,
    "    </ns:PesquisarPacientePorCNS>",
    "  </soap:Body>",
    "</soap:Envelope>",
  ].join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractSoapBody(xml: string): string | null {
  const match =
    xml.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/i) ??
    xml.match(/<Body[^>]*>([\s\S]*?)<\/Body>/i);
  return match ? match[1].trim() : null;
}

function parseSoapFault(xml: string): string | null {
  const faultMatch =
    xml.match(
      /<soap:Fault>[\s\S]*?<faultstring[^>]*>([^<]+)<\/faultstring>/i
    ) ?? xml.match(/<Fault>[\s\S]*?<faultstring[^>]*>([^<]+)<\/faultstring>/i);
  return faultMatch ? faultMatch[1].trim() : null;
}

function parsePacienteFromBody(bodyXml: string): PacienteBaseFederal {
  const raw: Record<string, string> = {};
  const tagRegex = /<([^>\s/]+)[^>]*>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(bodyXml)) !== null) {
    const [, tag, value] = m;
    const key = tag
      .replace(/(.)([A-Z])/g, "$1_$2")
      .toLowerCase()
      .replace(/^_/, "");
    const trimmed = value.trim();
    raw[tag] = trimmed;
    raw[key] = trimmed;
  }
  const get = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && v !== "") return v;
    }
    return null;
  };
  const dataNasc = get("dataNascimento", "DataNascimento", "data_nascimento");
  const dataNascNorm = dataNasc
    ? dataNasc.includes("T")
      ? dataNasc.slice(0, 10)
      : dataNasc.slice(0, 10)
    : null;

  const cnsValor = get(
    "cns",
    "CNS",
    "nu_cns",
    "nuCns",
    "nuCNS",
    "nu_cns",
    "numeroCns",
    "numeroCns",
    "numero_cns",
    "numeroCNS",
    "numero_c_n_s",
    "numero_cns",
    "numCns",
    "num_cns",
    "NuCns",
    "NuCNS",
    "numcns",
  );
  const cnsFinal =
    cnsValor && cnsValor.trim() && cnsValor.trim() !== "-3"
      ? cnsValor
      : null;
  return {
    cpf: get("cpf", "CPF") ?? undefined,
    cns: cnsFinal ?? undefined,
    nome: get("nome", "Nome", "nomePaciente") ?? undefined,
    nomeMae: get("nomeMae", "NomeMae", "nome_mae") ?? undefined,
    nomePai: get("nomePai", "NomePai", "nome_pai") ?? undefined,
    dataNascimento: (dataNascNorm ?? dataNasc) ?? undefined,
    sexo: get("sexo", "Sexo") ?? undefined,
    logradouro: get("logradouro", "Logradouro") ?? undefined,
    numero: get("numero", "Numero") ?? undefined,
    complemento: get("complemento", "Complemento") ?? undefined,
    bairro: get("bairro", "Bairro") ?? undefined,
    cep: get("cep", "Cep", "CEP") ?? undefined,
    emails: get("emails", "Emails") ?? undefined,
    ddd: get("ddd", "DDD") ?? undefined,
  };
}

/**
 * Pesquisa paciente na Base Federal do CNS pelo CPF.
 *
 * @param cpf - CPF com ou sem formatação (apenas 11 dígitos são usados)
 * @returns Resultado tipado (PacienteBaseFederal) para mapeamento no cadastro local
 */
export async function pesquisarPacientePorCpf(
  cpf: string
): Promise<ResultadoPesquisaBaseFederal> {
  const { url, user, password, configured } = getConfig();

  if (!configured) {
    return {
      sucesso: false,
      paciente: null,
      mensagem:
        "Integração CNS Federal não configurada. Defina CNS_FEDERAL_USER e CNS_FEDERAL_PASSWORD.",
    };
  }

  const cpfNorm = normalizarCpf(cpf);
  if (cpfNorm.length !== 11) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "CPF deve conter 11 dígitos.",
    };
  }

  const soapEnvelope = buildSoapEnvelope(cpfNorm);
  const basicAuth = Buffer.from(`${user}:${password}`, "utf-8").toString(
    "base64"
  );

  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
    Authorization: `Basic ${basicAuth}`,
    SOAPAction: '""',
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: soapEnvelope,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sucesso: false,
      paciente: null,
      mensagem: `Erro de conexão com o serviço CNS: ${msg}`,
    };
  }

  const responseText = await res.text();

  if (!res.ok) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: `HTTP ${res.status}: ${responseText.slice(0, 500)}`,
    };
  }

  const fault = parseSoapFault(responseText);
  if (fault) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: fault,
    };
  }

  const bodyXml = extractSoapBody(responseText);
  if (!bodyXml) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "Resposta SOAP inválida: Body não encontrado.",
    };
  }

  const responseTag =
    bodyXml.match(
      /<PesquisarPacientePorCPFResponse[^>]*>([\s\S]*?)<\/PesquisarPacientePorCPFResponse>/i
    ) ?? bodyXml.match(/<return[^>]*>([\s\S]*?)<\/return>/i);

  const inner = responseTag ? responseTag[1].trim() : bodyXml;
  const paciente = parsePacienteFromBody(inner);

  return {
    sucesso: true,
    paciente,
  };
}

/**
 * Pesquisa paciente na Base Federal do CNS pelo CNS (15 dígitos).
 * Usado na busca alternativa quando o cidadão não é encontrado por CPF.
 *
 * @param cns - CNS com ou sem formatação (apenas 15 dígitos são usados)
 * @returns Resultado tipado para mapeamento no cadastro local
 */
export async function pesquisarPacientePorCns(
  cns: string
): Promise<ResultadoPesquisaBaseFederal> {
  const { url, user, password, configured } = getConfig();

  if (!configured) {
    return {
      sucesso: false,
      paciente: null,
      mensagem:
        "Integração CNS Federal não configurada. Defina CNS_FEDERAL_USER e CNS_FEDERAL_PASSWORD.",
    };
  }

  const cnsNorm = normalizarCns(cns);
  if (cnsNorm.length !== 15) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "CNS deve conter 15 dígitos.",
    };
  }

  const soapEnvelope = buildSoapEnvelopeCns(cnsNorm);
  const basicAuth = Buffer.from(`${user}:${password}`, "utf-8").toString(
    "base64"
  );

  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
    Authorization: `Basic ${basicAuth}`,
    SOAPAction: '""',
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: soapEnvelope,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sucesso: false,
      paciente: null,
      mensagem: `Erro de conexão com o serviço CNS: ${msg}`,
    };
  }

  const responseText = await res.text();

  if (!res.ok) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: `HTTP ${res.status}: ${responseText.slice(0, 500)}`,
    };
  }

  const fault = parseSoapFault(responseText);
  if (fault) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: fault,
    };
  }

  const bodyXml = extractSoapBody(responseText);
  if (!bodyXml) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "Resposta SOAP inválida: Body não encontrado.",
    };
  }

  const responseTag =
    bodyXml.match(
      /<PesquisarPacientePorCNSResponse[^>]*>([\s\S]*?)<\/PesquisarPacientePorCNSResponse>/i
    ) ?? bodyXml.match(/<PesquisarPacientePorCpfResponse[^>]*>([\s\S]*?)<\/PesquisarPacientePorCpfResponse>/i)
    ?? bodyXml.match(/<return[^>]*>([\s\S]*?)<\/return>/i);

  const inner = responseTag ? responseTag[1].trim() : bodyXml;
  const paciente = parsePacienteFromBody(inner);

  return {
    sucesso: true,
    paciente,
  };
}

export function isCnsFederalConfigured(): boolean {
  return getConfig().configured;
}
