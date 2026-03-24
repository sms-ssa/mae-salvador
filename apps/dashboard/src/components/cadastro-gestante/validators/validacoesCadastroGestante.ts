/**
 * Validações do cadastro de gestante por etapa.
 * Usado pelo useCadastroGestante e pelos steps para mensagens de erro.
 */

import { validarCPF, validarCNS } from "@/lib/validacoes-login";

const DDD_VALIDOS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

export function isDddValido(ddd: string): boolean {
  return DDD_VALIDOS.has(onlyDigits(ddd, 2));
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Caracteres permitidos em nome (doc: letras romano, acentos, apóstrofo, espaço; vedado espaço duplo). */
export function caracteresNomeValidos(s: string): boolean {
  if (!s.trim()) return true;
  if (/\s\s/.test(s)) return false;
  return /^[\p{L}\s']+$/u.test(s);
}

/** DUM: não pode ser menor que 7 dias nem maior que 294 dias (doc. Página 3). */
export function validarDum(data: string): string | null {
  const d = data.trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataDum = new Date(d);
  dataDum.setHours(0, 0, 0, 0);
  const diasAtras = Math.round((hoje.getTime() - dataDum.getTime()) / (24 * 60 * 60 * 1000));
  if (diasAtras < 7) return "Data da última menstruação não pode ser menor que 7 dias atrás.";
  if (diasAtras > 294) return "Data da última menstruação não pode ser maior que 294 dias atrás.";
  return null;
}

export interface FormCadastroGestante {
  cpf: string;
  cns: string;
  nomeCompleto: string;
  nomeSocial: string;
  nomeSocialPrincipal: boolean;
  nomeMae: string;
  nomeMaeIgnorada: boolean;
  nomePai: string;
  nomePaiIgnorado: boolean;
  dataNascimento: string;
  racaCor: string;
  sexo: string;
  possuiDeficiencia: boolean | null;
  deficienciaTipos: string[];
  deficiencia: string;
  identidadeGenero: string;
  orientacaoSexual: string;
  ddd: string;
  celularPrincipal: string;
  dddAlternativo: string;
  celularAlternativo: string;
  temWhatsappAlternativo: boolean;
  dddResidencial: string;
  telefoneResidencial: string;
  email: string;
  temWhatsapp: boolean;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  numeroSemNumero: boolean;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  pontoReferencia: string;
  distritoId: string;
  ubsId: string;
  descobrimento: string;
  programaSocial: string[];
  nis: string;
  planoSaude: string;
  manterAcompanhamentoUbs: string;
  dum: string;
  gestacoesPrevias: string;
  partosCesareo: string;
  partosNormal: string;
  abortos: string;
  alergias: string;
  doencasConhecidas: string;
  medicacoesEmUso: string;
  senha: string;
  senhaConfirma: string;
  declaracaoCiencia: boolean;
}

function onlyDigits(s: string, max: number): string {
  return (s ?? "").replace(/\D/g, "").slice(0, max);
}

function calcAgeYears(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const today = new Date();
  const tY = today.getFullYear();
  const tM = today.getMonth() + 1;
  const tD = today.getDate();
  let age = tY - y;
  if (tM < m || (tM === m && tD < d)) age -= 1;
  return age;
}

export function validarStep1(form: FormCadastroGestante): boolean {
  const cpfDigits = onlyDigits(form.cpf, 11);
  const cnsDigits = onlyDigits(form.cns, 15);
  const temCpfOuCns = cpfDigits.length === 11 || cnsDigits.length === 15;
  if (!temCpfOuCns) return false;
  // Mesmo quando CPF ou CNS não são obrigatórios, se o usuário digitar
  // parte do número devemos exigir preenchimento completo para evitar
  // gravar dados incorretos (ex.: 10 dígitos no CPF).
  if (cpfDigits.length > 0 && cpfDigits.length !== 11) return false;
  if (cnsDigits.length > 0 && cnsDigits.length !== 15) return false;

  if (cpfDigits.length === 11 && validarCPF(form.cpf)) return false;
  if (cnsDigits.length === 15 && validarCNS(form.cns)) return false;
  if (!form.nomeCompleto.trim() || form.nomeCompleto.trim().length > 70) return false;
  if (!caracteresNomeValidos(form.nomeCompleto) || !caracteresNomeValidos(form.nomeSocial) || !caracteresNomeValidos(form.nomeMae) || !caracteresNomeValidos(form.nomePai)) return false;
  if (!form.nomeMaeIgnorada && !form.nomeMae.trim()) return false;
  if (!form.nomePaiIgnorado && !form.nomePai.trim()) return false;
  if (!form.dataNascimento.trim()) return false;
  const d = form.dataNascimento.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  if (new Date(d).getTime() > new Date().setHours(0, 0, 0, 0)) return false;
  const age = calcAgeYears(d);
  if (age == null || age < 9 || age > 60) return false;
  if (!form.racaCor.trim() || !form.sexo.trim()) return false;
  if (form.possuiDeficiencia == null) return false;
  if (form.possuiDeficiencia && !form.deficienciaTipos.length) return false;
  return true;
}

export function validarStep2(form: FormCadastroGestante): boolean {
  const dddDig = onlyDigits(form.ddd, 2);
  const celDig = onlyDigits(form.celularPrincipal, 9);
  const dddAltDig = onlyDigits(form.dddAlternativo, 2);
  const celAltDig = onlyDigits(form.celularAlternativo, 9);
  const dddResDig = onlyDigits(form.dddResidencial, 2);
  const residencialDig = onlyDigits(form.telefoneResidencial, 8);
  if ((dddDig.length > 0 && dddDig.length !== 2) || (celDig.length > 0 && celDig.length !== 9)) return false;
  if ((dddAltDig.length > 0 && dddAltDig.length !== 2) || (celAltDig.length > 0 && celAltDig.length !== 9)) return false;
  if ((dddResDig.length > 0 && dddResDig.length !== 2) || (residencialDig.length > 0 && residencialDig.length !== 8)) return false;
  const telefonePrincipalOk = dddDig.length === 2 && isDddValido(dddDig) && celDig.length === 9 && celDig[0] === "9";
  const telefoneAlternativoOk = dddAltDig.length === 2 && isDddValido(dddAltDig) && celAltDig.length === 9 && celAltDig[0] === "9";
  const telefoneResidencialOk = dddResDig.length === 2 && isDddValido(dddResDig) && residencialDig.length === 8 && /^[2-5]/.test(residencialDig);
  if (!telefonePrincipalOk && !telefoneResidencialOk) return false;
  if (form.temWhatsapp && !telefonePrincipalOk) return false;
  if (form.temWhatsappAlternativo && !telefoneAlternativoOk) return false;
  if (form.email.trim() && (form.email.length > 100 || !form.email.includes("@") || !form.email.includes("."))) return false;
  if (onlyDigits(form.cep, 8).length !== 8) return false;
  if (!form.logradouro.trim() || !form.bairro.trim() || !form.municipio.trim() || !form.tipoLogradouro.trim()) return false;
  if (!form.numeroSemNumero && (!form.numero.trim() || onlyDigits(form.numero, 7).length === 0)) return false;
  return true;
}

export function validarStep3(form: FormCadastroGestante): boolean {
  if (!form.descobrimento || !Array.isArray(form.programaSocial) || form.programaSocial.length === 0) return false;
  const dumOk = !form.dum.trim() || validarDum(form.dum) === null;
  if (!dumOk) return false;
  const nisDig = onlyDigits(form.nis, 11);
  if (form.programaSocial.includes("bolsa-familia") && nisDig.length !== 11) return false;
  return true;
}

export function validarStep4(form: FormCadastroGestante): boolean {
  const s = form.senha.trim();
  const c = form.senhaConfirma.trim();
  return s.length >= 6 && s.length <= 15 && s === c && form.declaracaoCiencia === true;
}

/** Retorna erros inline para exibição nos campos (step 1). */
export function getErrosStep1(
  form: FormCadastroGestante,
): {
  cpf?: string;
  cns?: string;
  nomeCompleto?: string;
  nomeSocial?: string;
  nomeMae?: string;
  nomePai?: string;
  dataNascimento?: string;
} {
  const cpfDigits = onlyDigits(form.cpf, 11);
  const cnsDigits = onlyDigits(form.cns, 15);
  const cpfValido = cpfDigits.length === 11 ? validarCPF(form.cpf) : null;
  const cnsValido = cnsDigits.length === 15 ? validarCNS(form.cns) : null;
  const cpfIncompleto =
    cpfDigits.length > 0 && cpfDigits.length !== 11
      ? "CPF deve conter 11 dígitos."
      : null;
  const cnsIncompleto =
    cnsDigits.length > 0 && cnsDigits.length !== 15
      ? "CNS deve conter 15 dígitos."
      : null;
  const dataNascValida = (() => {
    const d = form.dataNascimento.trim();
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (new Date(d).getTime() > new Date().setHours(0, 0, 0, 0)) return false;
    const age = calcAgeYears(d);
    return age != null && age >= 9 && age <= 60;
  })();
  return {
    cpf: cpfIncompleto ?? (cpfDigits.length === 11 && cpfValido ? cpfValido : undefined),
    cns: cnsIncompleto ?? (cnsDigits.length === 15 && cnsValido ? cnsValido : undefined),
    nomeCompleto: form.nomeCompleto.trim() && !caracteresNomeValidos(form.nomeCompleto) ? "Existem caracteres inválidos" : undefined,
    nomeSocial:
      form.nomeSocial.trim() && !caracteresNomeValidos(form.nomeSocial)
        ? "Existem caracteres inválidos"
        : undefined,
    nomeMae:
      !form.nomeMaeIgnorada &&
      form.nomeMae.trim() &&
      !caracteresNomeValidos(form.nomeMae)
        ? "Existem caracteres inválidos"
        : undefined,
    nomePai:
      !form.nomePaiIgnorado &&
      form.nomePai.trim() &&
      !caracteresNomeValidos(form.nomePai)
        ? "Existem caracteres inválidos"
        : undefined,
    dataNascimento:
      form.dataNascimento.trim() && !dataNascValida
        ? "idade permitida: de 9 a 60 anos"
        : undefined,
  };
}

/** Lista o que falta na etapa atual (mensagem de ajuda). */
export function getFaltando(etapa: 1 | 2 | 3 | 4, form: FormCadastroGestante): string[] {
  const faltando: string[] = [];
  const cpfDigits = onlyDigits(form.cpf, 11);
  const cnsDigits = onlyDigits(form.cns, 15);
  const temCpfOuCns = cpfDigits.length === 11 || cnsDigits.length === 15;
  const cpfValido = cpfDigits.length === 11 ? validarCPF(form.cpf) : null;
  const cnsValido = cnsDigits.length === 15 ? validarCNS(form.cns) : null;
  const nomesValidos = caracteresNomeValidos(form.nomeCompleto) && caracteresNomeValidos(form.nomeSocial) && caracteresNomeValidos(form.nomeMae) && caracteresNomeValidos(form.nomePai);
  const dataNascValida = (() => {
    const d = form.dataNascimento.trim();
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    return new Date(d).getTime() <= new Date().setHours(0, 0, 0, 0);
  })();
  const dddDig = onlyDigits(form.ddd, 2);
  const celDig = onlyDigits(form.celularPrincipal, 9);
  const dddAltDig = onlyDigits(form.dddAlternativo, 2);
  const celAltDig = onlyDigits(form.celularAlternativo, 9);
  const dddResDig = onlyDigits(form.dddResidencial, 2);
  const residencialDig = onlyDigits(form.telefoneResidencial, 8);
  const telefonePrincipalOk = dddDig.length === 2 && isDddValido(dddDig) && celDig.length === 9 && celDig[0] === "9";
  const telefoneAlternativoOk = dddAltDig.length === 2 && isDddValido(dddAltDig) && celAltDig.length === 9 && celAltDig[0] === "9";
  const telefoneResidencialOk = dddResDig.length === 2 && isDddValido(dddResDig) && residencialDig.length === 8 && /^[2-5]/.test(residencialDig);
  const temCelularOuResidencial = telefonePrincipalOk || telefoneResidencialOk;
  const emailOk =
    !form.email.trim() ||
    (form.email.length <= 100 && form.email.includes("@") && form.email.includes("."));
  const dumOk = !form.dum.trim() || validarDum(form.dum) === null;
  const nisDig = onlyDigits(form.nis, 11);
  const nisOk = !form.programaSocial.includes("bolsa-familia") || nisDig.length === 11;
  const senhaTrim = form.senha.trim();
  const senhaConfirmaTrim = form.senhaConfirma.trim();

  if (etapa === 1) {
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) faltando.push("CPF (11 dígitos)");
    if (cnsDigits.length > 0 && cnsDigits.length !== 15) faltando.push("CNS (15 dígitos)");
    if (!temCpfOuCns) faltando.push("CPF (11 dígitos) ou CNS (15 dígitos)");
    else if (cpfDigits.length === 11 && cpfValido) faltando.push("CPF inválido");
    else if (cnsDigits.length === 15 && cnsValido) faltando.push("CNS inválido");
    if (!form.nomeCompleto.trim()) faltando.push("Nome completo");
    if (!nomesValidos && form.nomeCompleto.trim()) faltando.push("Existem caracteres inválidos nos nomes");
    if (!form.nomeMaeIgnorada && !form.nomeMae.trim()) faltando.push("Nome da Mãe (ou marque Ignorada)");
    if (!form.nomePaiIgnorado && !form.nomePai.trim()) faltando.push("Nome do Pai (ou marque Ignorado)");
    if (!form.dataNascimento.trim()) faltando.push("Data de nascimento");
    if (form.dataNascimento.trim() && !dataNascValida) faltando.push("Data inválida");
    if (!form.racaCor.trim()) faltando.push("Raça/Cor");
    if (!form.sexo.trim()) faltando.push("Sexo");
    if (form.possuiDeficiencia == null) faltando.push("Possui Deficiência");
    if (
      form.possuiDeficiencia === true &&
      !form.deficienciaTipos.length
    ) {
      faltando.push("Deficiência (selecione ao menos um tipo)");
    }
  }
  if (etapa === 2) {
    if (dddDig.length > 0 && dddDig.length !== 2) faltando.push("DDD principal (2 dígitos)");
    if (dddDig.length === 2 && !isDddValido(dddDig)) faltando.push("DDD principal inválido");
    if (celDig.length > 0 && celDig.length !== 9) faltando.push("Celular principal (9 dígitos)");
    if (dddAltDig.length > 0 && dddAltDig.length !== 2) faltando.push("DDD alternativo (2 dígitos)");
    if (dddAltDig.length === 2 && !isDddValido(dddAltDig)) faltando.push("DDD alternativo inválido");
    if (celAltDig.length > 0 && celAltDig.length !== 9) faltando.push("Celular alternativo (9 dígitos)");
    if (dddResDig.length > 0 && dddResDig.length !== 2) faltando.push("DDD residencial (2 dígitos)");
    if (dddResDig.length === 2 && !isDddValido(dddResDig)) faltando.push("DDD residencial inválido");
    if (residencialDig.length > 0 && residencialDig.length !== 8) faltando.push("Telefone residencial (8 dígitos)");
    if (!temCelularOuResidencial) faltando.push("Telefone Celular Principal ou Telefone Residencial (DDD + número)");
    if (form.temWhatsapp && !telefonePrincipalOk) faltando.push("WhatsApp principal exige DDD + celular principal válidos");
    if (form.temWhatsappAlternativo && !telefoneAlternativoOk) faltando.push("WhatsApp alternativo exige DDD + celular alternativo válidos");
    if (!emailOk) faltando.push("E-mail inválido");
    if (onlyDigits(form.cep, 8).length !== 8) faltando.push("CEP (8 dígitos)");
    if (!form.logradouro.trim()) faltando.push("Nome do Logradouro");
    if (!form.numeroSemNumero && !form.numero.trim()) faltando.push("Número (ou marque S/N)");
    if (!form.numeroSemNumero && form.numero.trim() && !/^\d{1,7}$/.test(form.numero.trim())) faltando.push("Número (somente dígitos, até 7)");
    if (!form.bairro.trim()) faltando.push("Bairro");
    if (!form.municipio.trim()) faltando.push("Município de Residência");
    if (!form.tipoLogradouro.trim()) faltando.push("Tipo de Logradouro");
  }
  if (etapa === 3) {
    if (!form.descobrimento) faltando.push("Como descobriu a gestação");
    if (!Array.isArray(form.programaSocial) || form.programaSocial.length === 0) faltando.push("Programa social");
    if (!nisOk) faltando.push("NIS (11 dígitos, obrigatório para Bolsa Família)");
    if (!dumOk) faltando.push("DUM inválida (entre 7 e 294 dias atrás)");
  }
  if (etapa === 4) {
    if (senhaTrim.length < 6 || senhaTrim.length > 15) faltando.push("Senha entre 6 e 15 caracteres");
    if (senhaTrim !== senhaConfirmaTrim && senhaConfirmaTrim) faltando.push("As senhas não coincidem");
    if (!senhaTrim) faltando.push("Crie uma senha");
    if (!senhaConfirmaTrim) faltando.push("Confirme a senha");
    if (!form.declaracaoCiencia) faltando.push("Declaração de ciência");
  }
  return faltando;
}
