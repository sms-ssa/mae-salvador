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
import { mapCadSusCodigoTipoLogradouro } from "@/lib/logradouro-type-mapper";

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

type RacaCorSoapCodigo = "01" | "02" | "03" | "04" | "05" | "99";

const RACA_COR_SOAP_MAP: Record<RacaCorSoapCodigo, string> = {
  "01": "BRANCA",
  "02": "PRETA",
  "03": "PARDA",
  "04": "AMARELA",
  "05": "INDIGENA",
  "99": "SEM INFORMACAO",
};

function normalizarRacaCorSoap(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const v = valor.trim();
  if (!v) return undefined;

  // Aceita código "1" ou "01".
  const digits = v.replace(/\D/g, "");
  const codigo = digits.length === 1 ? `0${digits}` : digits.slice(0, 2);
  if (codigo in RACA_COR_SOAP_MAP) {
    return RACA_COR_SOAP_MAP[codigo as RacaCorSoapCodigo];
  }

  // Se já vier descritivo, normaliza para o padrão do formulário.
  const norm = v
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (norm.includes("BRANCA")) return "BRANCA";
  if (norm.includes("PRETA")) return "PRETA";
  if (norm.includes("PARDA")) return "PARDA";
  if (norm.includes("AMARELA")) return "AMARELA";
  if (norm.includes("INDIGENA")) return "INDIGENA";
  if (norm.includes("SEM INFORMACAO")) return "SEM INFORMACAO";
  return undefined;
}

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

function buildSoapEnvelopeNomeDataNascimento(
  nome: string,
  dataNascimento: string,
): string {
  const nomeLimpo = nome.trim();
  const dataIso = dataNascimento.trim().slice(0, 10);
  const dataSoap = `${dataIso}T00:00:00`;
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "  <soap:Body>",
    `    <ns:PesquisarPacientePorNomeDataNascimento xmlns:ns="${CNS_NAMESPACE}">`,
    `      <nome>${escapeXml(nomeLimpo)}</nome>`,
    `      <dataNascimento>${escapeXml(dataSoap)}</dataNascimento>`,
    "    </ns:PesquisarPacientePorNomeDataNascimento>",
    "  </soap:Body>",
    "</soap:Envelope>",
  ].join("\n");
}

function buildSoapEnvelopeNomeNomeMae(nome: string, nomeMae: string): string {
  const nomeLimpo = nome.trim();
  const nomeMaeLimpo = nomeMae.trim();
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "  <soap:Body>",
    `    <ns:PesquisarPacientePorNomeNomeMae xmlns:ns="${CNS_NAMESPACE}">`,
    `      <nome>${escapeXml(nomeLimpo)}</nome>`,
    `      <nomeMae>${escapeXml(nomeMaeLimpo)}</nomeMae>`,
    "    </ns:PesquisarPacientePorNomeNomeMae>",
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
  // Importante: o SOAP pode repetir tags com o mesmo nome (ex.: <numero> para
  // endereço e também <numero> para CNS). O parser atual sobrescrevia o
  // valor e perdia o "CNS número definitivo". Por isso guardamos todas
  // as ocorrências.
  const raw: Record<string, string[]> = {};
  const tagRegex = /<([^>\s/]+)[^>]*>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(bodyXml)) !== null) {
    const [, tag, value] = m;
    const key = tag
      .replace(/(.)([A-Z])/g, "$1_$2")
      .toLowerCase()
      .replace(/^_/, "");
    const trimmed = value.trim();
    if (!raw[tag]) raw[tag] = [];
    if (!raw[key]) raw[key] = [];
    raw[tag].push(trimmed);
    raw[key].push(trimmed);
  }
  const get = (...keys: string[]): string | null => {
    for (const k of keys) {
      const values = raw[k];
      const v = values?.find((x) => x != null && x !== "");
      if (v != null && v !== "") return v;
    }
    return null;
  };
  const getAll = (...keys: string[]): string[] => {
    const out: string[] = [];
    for (const k of keys) {
      const values = raw[k];
      if (!values) continue;
      for (const v of values) {
        if (v != null && v !== "") out.push(v);
      }
    }
    return out;
  };

  const extractBlocks = (xml: string, tagName: string): string[] => {
    const re = new RegExp(
      `<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`,
      "gi",
    );
    const out: string[] = [];
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(xml)) !== null) {
      out.push(mm[1]);
    }
    return out;
  };

  const firstTagValue = (xml: string, ...tags: string[]): string | null => {
    for (const t of tags) {
      const re = new RegExp(
        `<(?:\\w+:)?${t}\\b[^>]*>([^<]*)<\\/(?:\\w+:)?${t}>`,
        "i",
      );
      const m = xml.match(re);
      const v = m?.[1]?.trim();
      if (v) return v;
    }
    return null;
  };
  const dataNasc = get("dataNascimento", "DataNascimento", "data_nascimento");
  const dataNascNorm = dataNasc
    ? dataNasc.includes("T")
      ? dataNasc.slice(0, 10)
      : dataNasc.slice(0, 10)
    : null;

  // --- CNS (prioriza blocos <cns><numero>...</numero><tipo>...</tipo></cns>) ---
  const cnsBlocks = extractBlocks(bodyXml, "cns");
  const cnsEntries = cnsBlocks.map((b) => ({
    numero: firstTagValue(b, "numero"),
    tipo: firstTagValue(b, "tipo"),
  }));
  const cnsDefinitivo =
    cnsEntries.find((e) => {
      const num = (e.numero ?? "").replace(/\D/g, "");
      const tipo = (e.tipo ?? "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return (
        num.length === 15 &&
        (tipo.includes("DEFINIT") || tipo.includes("DEFINIT"))
      );
    }) ??
    cnsEntries.find((e) => (e.numero ?? "").replace(/\D/g, "").length === 15) ??
    null;

  const cnsCandidates = getAll(
    "cns",
    "CNS",
    "nu_cns",
    "nuCns",
    "nuCNS",
    "numeroCns",
    "numero_cns",
    "numeroCNS",
    "numCns",
    "num_cns",
    "NuCns",
    "NuCNS",
    "numcns",
  );
  const cnsValor =
    cnsDefinitivo?.numero ??
    cnsCandidates.find((v) => v.replace(/\D/g, "").length === 15) ??
    null;
  const cnsFinal = cnsValor && cnsValor.trim() !== "-3" ? cnsValor : null;

  // --- Endereço (prioriza bloco <endereco>) ---
  const enderecoBlocks = extractBlocks(bodyXml, "endereco");
  const endereco = enderecoBlocks.length > 0 ? enderecoBlocks[0] : null;
  const numeroEndereco = endereco ? firstTagValue(endereco, "numero") : null;
  const logradouroEndereco = endereco
    ? firstTagValue(endereco, "logradouro")
    : null;
  const bairroEndereco = endereco ? firstTagValue(endereco, "bairro") : null;
  const complementoEndereco = endereco
    ? firstTagValue(endereco, "complemento")
    : null;
  const cepEndereco = endereco ? firstTagValue(endereco, "cep") : null;
  const municipioEndereco = endereco
    ? firstTagValue(endereco, "municipioResidencia")
    : null;
  const codigoTipoLogradouroEndereco = endereco
    ? firstTagValue(endereco, "codigoTipoLogradouro")
    : null;
  const tipoLogradouroEndereco = mapCadSusCodigoTipoLogradouro(
    codigoTipoLogradouroEndereco,
    logradouroEndereco,
  );

  // --- Telefones (prioriza blocos <telefones>) ---
  const telefoneBlocks = extractBlocks(bodyXml, "telefones");
  const telefones = telefoneBlocks
    .map((b) => ({
      ddd: firstTagValue(b, "ddd"),
      numero: firstTagValue(b, "numero"),
      tipo: firstTagValue(b, "tipo"),
    }))
    .filter((t) => !!(t.numero && t.numero.trim() && t.numero.trim() !== "-3"));

  const celularFromLista =
    telefones.find((t) => {
      const tipo = (t.tipo ?? "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return tipo.includes("CEL");
    }) ??
    telefones.find((t) => (t.numero ?? "").replace(/\D/g, "").length === 9) ??
    null;

  const residencialFromLista =
    telefones.find((t) => {
      const tipo = (t.tipo ?? "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return tipo.includes("RES");
    }) ??
    telefones.find((t) => (t.numero ?? "").replace(/\D/g, "").length === 8) ??
    null;

  const montarTelefone = (t: { ddd: string | null; numero: string | null } | null): string | null => {
    if (!t?.numero) return null;
    const num = t.numero.replace(/\D/g, "");
    const ddd = (t.ddd ?? "").replace(/\D/g, "");
    if (!num) return null;
    if (ddd && (num.length === 8 || num.length === 9)) return `${ddd}${num}`;
    return num;
  };

  const telefoneCelularRaw = montarTelefone(celularFromLista) ?? get(
    "telefoneCelular",
    "TelefoneCelular",
    "telefone_celular",
    "nuTelefoneCelular",
    "nu_telefone_celular",
    "celular",
    "phone",
    "foneCelular",
    "fone_celular",
  );
  const telefoneResidencialRaw = montarTelefone(residencialFromLista) ?? get(
    "telefoneResidencial",
    "TelefoneResidencial",
    "telefone_residencial",
    "nuTelefoneResidencial",
    "nu_telefone_residencial",
    "foneResidencial",
    "fone_residencial",
  );

  const telefoneCelular =
    telefoneCelularRaw && telefoneCelularRaw.trim() !== "-3" ? telefoneCelularRaw : null;
  const telefoneResidencial =
    telefoneResidencialRaw && telefoneResidencialRaw.trim() !== "-3"
      ? telefoneResidencialRaw
      : null;

  return {
    cpf: get("cpf", "CPF") ?? undefined,
    cns: cnsFinal ?? undefined,
    nome: get("nome", "Nome", "nomePaciente") ?? undefined,
    nomeMae: get("nomeMae", "NomeMae", "nome_mae") ?? undefined,
    nomePai: get("nomePai", "NomePai", "nome_pai") ?? undefined,
    dataNascimento: (dataNascNorm ?? dataNasc) ?? undefined,
    sexo: get("sexo", "Sexo") ?? undefined,
    racaCor: normalizarRacaCorSoap(
      get("racaCor", "RacaCor", "raca_cor", "codigoRacaCor", "codigo_raca_cor"),
    ),
    logradouro: logradouroEndereco ?? get("logradouro", "Logradouro") ?? undefined,
    numero: numeroEndereco ?? undefined,
    complemento: complementoEndereco ?? get("complemento", "Complemento") ?? undefined,
    bairro: bairroEndereco ?? get("bairro", "Bairro") ?? undefined,
    cep: cepEndereco ?? get("cep", "Cep", "CEP") ?? undefined,
    municipio: municipioEndereco ?? get("municipio", "Municipio") ?? undefined,
    tipoLogradouro: tipoLogradouroEndereco,
    emails: get("emails", "Emails") ?? undefined,
    ddd: get("ddd", "DDD") ?? undefined,
    telefoneCelular: telefoneCelular ?? undefined,
    telefoneResidencial: telefoneResidencial ?? undefined,
  };
}

function hasPacienteMinimo(
  paciente: PacienteBaseFederal | null | undefined,
): paciente is PacienteBaseFederal {
  if (!paciente) return false;
  const cpf = (paciente.cpf ?? "").replace(/\D/g, "");
  const cns = (paciente.cns ?? "").replace(/\D/g, "");
  const nome = (paciente.nome ?? "").trim();
  return (cpf.length === 11 || cns.length === 15) && nome.length > 0;
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
  if (!hasPacienteMinimo(paciente)) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "Cidadão não encontrado na base federal para o CPF informado.",
    };
  }

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
  if (!hasPacienteMinimo(paciente)) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "Cidadão não encontrado na base federal para o CNS informado.",
    };
  }

  return {
    sucesso: true,
    paciente,
  };
}

export function isCnsFederalConfigured(): boolean {
  return getConfig().configured;
}

export async function pesquisarPacientePorNomeDataNascimento(
  nome: string,
  dataNascimento: string,
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

  const nomeLimpo = (nome ?? "").trim();
  const dataLimpa = (dataNascimento ?? "").trim().slice(0, 10);
  if (!nomeLimpo) {
    return { sucesso: false, paciente: null, mensagem: "Nome é obrigatório." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "Data de nascimento inválida.",
    };
  }

  const soapEnvelope = buildSoapEnvelopeNomeDataNascimento(nomeLimpo, dataLimpa);
  const basicAuth = Buffer.from(`${user}:${password}`, "utf-8").toString(
    "base64",
  );
  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
    Authorization: `Basic ${basicAuth}`,
    SOAPAction: '""',
  };

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: soapEnvelope });
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
  if (fault) return { sucesso: false, paciente: null, mensagem: fault };
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
      /<PesquisarPacientePorNomeDataNascimentoResponse[^>]*>([\s\S]*?)<\/PesquisarPacientePorNomeDataNascimentoResponse>/i,
    ) ?? bodyXml.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
  const inner = responseTag ? responseTag[1].trim() : bodyXml;
  const paciente = parsePacienteFromBody(inner);
  if (!hasPacienteMinimo(paciente)) {
    return {
      sucesso: false,
      paciente: null,
      mensagem:
        "Cidadão não encontrado na base federal para nome e data de nascimento informados.",
    };
  }
  return { sucesso: true, paciente };
}

export async function pesquisarPacientePorNomeNomeMae(
  nome: string,
  nomeMae: string,
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

  const nomeLimpo = (nome ?? "").trim();
  const nomeMaeLimpo = (nomeMae ?? "").trim();
  if (!nomeLimpo || !nomeMaeLimpo) {
    return {
      sucesso: false,
      paciente: null,
      mensagem: "Nome e nome da mãe são obrigatórios.",
    };
  }

  const soapEnvelope = buildSoapEnvelopeNomeNomeMae(nomeLimpo, nomeMaeLimpo);
  const basicAuth = Buffer.from(`${user}:${password}`, "utf-8").toString(
    "base64",
  );
  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
    Authorization: `Basic ${basicAuth}`,
    SOAPAction: '""',
  };

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: soapEnvelope });
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
  if (fault) return { sucesso: false, paciente: null, mensagem: fault };
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
      /<PesquisarPacientePorNomeNomeMaeResponse[^>]*>([\s\S]*?)<\/PesquisarPacientePorNomeNomeMaeResponse>/i,
    ) ?? bodyXml.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
  const inner = responseTag ? responseTag[1].trim() : bodyXml;
  const paciente = parsePacienteFromBody(inner);
  if (!hasPacienteMinimo(paciente)) {
    return {
      sucesso: false,
      paciente: null,
      mensagem:
        "Cidadão não encontrado na base federal para nome e nome da mãe informados.",
    };
  }
  return { sucesso: true, paciente };
}
