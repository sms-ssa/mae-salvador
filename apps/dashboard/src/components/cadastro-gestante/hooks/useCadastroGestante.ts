"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mapPacienteBaseFederalToDadosCadastro } from "@mae-salvador/shared";
import {
  type FormCadastroGestante,
  validarStep1,
  validarStep2,
  validarStep3,
  validarStep4,
  getFaltando,
  getErrosStep1,
  validarDum,
} from "../validators/validacoesCadastroGestante";

const CNS_PACIENTE_KEY = "cnsPaciente";
const DADOS_PACIENTE_BUSCA_ALT_KEY = "dadosPacienteBuscaAlt";

/** Forma do objeto retornado por mapPacienteBaseFederalToDadosCadastro (evita erro de tipo se o shared estiver em cache). */
interface DadosPrefillFromFederal {
  cpf?: string;
  cns?: string;
  nomeCompleto?: string;
  nomeSocial?: string;
  nomeMae?: string;
  nomePai?: string;
  dataNascimento?: string;
  sexo?: string;
  racaCor?: string;
  identidadeGenero?: string;
  orientacaoSexual?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  email?: string;
  telefoneCelular?: string;
}

/** Valores aceitos pelos selects de Raça/Cor e Sexo no formulário (precisam bater com StepDadosPessoais). */
const RACA_COR_SELECT_VALUES = ["BRANCA", "PARDA", "PRETA", "AMARELA", "INDIGENA"];
const SEXO_SELECT_VALUES = ["FEMININO", "MASCULINO", "INDETERMINADO"];

function normalizeRacaCorForSelect(value: unknown): string {
  const s = typeof value === "string" ? value : value != null ? String(value) : "";
  if (!s.trim()) return "";
  const v = s.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return RACA_COR_SELECT_VALUES.includes(v) ? v : "";
}

function normalizeSexoForSelect(value: unknown): string {
  const s = typeof value === "string" ? value : value != null ? String(value) : "";
  if (!s.trim()) return "";
  const v = s.trim().toUpperCase();
  return SEXO_SELECT_VALUES.includes(v) ? v : "";
}

function formatCpfValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCepValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

const INITIAL_FORM: FormCadastroGestante = {
  cpf: "",
  cns: "",
  nomeCompleto: "",
  nomeSocial: "",
  nomeSocialPrincipal: false,
  nomeMae: "",
  nomeMaeIgnorada: false,
  nomePai: "",
  nomePaiIgnorado: false,
  dataNascimento: "",
  municipioNascimento: "",
  racaCor: "",
  sexo: "",
  possuiDeficiencia: false,
  deficienciaTipos: [],
  deficiencia: "",
  identidadeGenero: "",
  orientacaoSexual: "",
  ddd: "",
  celularPrincipal: "",
  telefoneAlternativo: "",
  temWhatsappAlternativo: false,
  dddResidencial: "",
  telefoneResidencial: "",
  email: "",
  temWhatsapp: false,
  tipoLogradouro: "",
  logradouro: "",
  numero: "",
  numeroSemNumero: false,
  complemento: "",
  bairro: "",
  cep: "",
  municipio: "",
  pontoReferencia: "",
  distritoId: "",
  ubsId: "",
  descobrimento: "",
  programaSocial: "",
  nis: "",
  planoSaude: "",
  manterAcompanhamentoUbs: "",
  dum: "",
  gestacoesPrevias: "",
  partosCesareo: "",
  partosNormal: "",
  abortos: "",
  alergias: "",
  doencasConhecidas: "",
  medicacoesEmUso: "",
  senha: "",
  senhaConfirma: "",
};

export type ConfirmacaoData =
  | null
  | { tipo: "prenatal_existente"; unidade: string; mensagem: string }
  | { tipo: "unidades_proximas"; distritoNome?: string; unidades: { nome: string; cnes?: string; distanciaKm: string }[] };

export function useCadastroGestante() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormCadastroGestante>(INITIAL_FORM);
  const [erroEnvio, setErroEnvio] = useState("");
  const [erroNotificacao, setErroNotificacao] = useState("");
  const [erroCep, setErroCep] = useState("");
  const [erroDum, setErroDum] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cepBuscando, setCepBuscando] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [confirmacaoCarregando, setConfirmacaoCarregando] = useState(false);
  const [confirmacaoData, setConfirmacaoData] = useState<ConfirmacaoData>(null);
  const [pacienteLocalizado, setPacienteLocalizado] = useState(false);
  const lastAutoCepLookupRef = useRef<string>("");

  const updateField = useCallback(<K extends keyof FormCadastroGestante>(key: K, value: FormCadastroGestante[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "nomeMaeIgnorada") {
        next.nomeMae = value ? "IGNORADA" : "";
      }
      if (key === "nomePaiIgnorado") {
        next.nomePai = value ? "IGNORADO" : "";
      }
      if (key === "distritoId") {
        next.ubsId = "";
      }
      if (key === "numeroSemNumero" && value) {
        next.numero = "";
      }
      if (key === "possuiDeficiencia" && !value) {
        next.deficienciaTipos = [];
        next.deficiencia = "";
      }
      return next;
    });
    if (key === "cep") setErroCep("");
    if (key === "dum") setErroDum("");
    if (key === "senha" || key === "senhaConfirma") setErroSenha("");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromCns = searchParams.get("fromCns") === "1";
    const fromDados = searchParams.get("fromDados") === "1";
    if (fromCns) {
      const raw = sessionStorage.getItem(CNS_PACIENTE_KEY);
      if (!raw) return;
      try {
        const paciente = JSON.parse(raw) as Parameters<typeof mapPacienteBaseFederalToDadosCadastro>[0];
        sessionStorage.removeItem(CNS_PACIENTE_KEY);
        const dados = mapPacienteBaseFederalToDadosCadastro(paciente) as DadosPrefillFromFederal;
        const telFederal = dados.telefoneCelular;
        const dddFederal = telFederal && String(telFederal).replace(/\D/g, "").length >= 2 ? String(telFederal).replace(/\D/g, "").slice(0, 2) : "";
        const celularFederal = telFederal && String(telFederal).replace(/\D/g, "").length > 2 ? String(telFederal).replace(/\D/g, "").slice(2, 11) : "";
        const racaCorVal = normalizeRacaCorForSelect(dados.racaCor);
        const sexoVal = normalizeSexoForSelect(dados.sexo);
        setPacienteLocalizado(true);
        setForm((prev) => ({
          ...prev,
          cpf: dados.cpf ? formatCpfValue(dados.cpf) : prev.cpf,
          cns: dados.cns ?? prev.cns,
          nomeCompleto: dados.nomeCompleto ?? prev.nomeCompleto,
          nomeSocial: dados.nomeSocial ?? prev.nomeSocial,
          nomeMae: dados.nomeMae ?? prev.nomeMae,
          nomePai: dados.nomePai ?? prev.nomePai,
          dataNascimento: dados.dataNascimento ?? prev.dataNascimento,
          sexo: sexoVal || prev.sexo,
          racaCor: racaCorVal || prev.racaCor,
          identidadeGenero: dados.identidadeGenero ?? prev.identidadeGenero,
          orientacaoSexual: dados.orientacaoSexual ?? prev.orientacaoSexual,
          ddd: dddFederal || prev.ddd,
          celularPrincipal: celularFederal || prev.celularPrincipal,
          email: dados.email ?? prev.email,
          logradouro: dados.logradouro ?? prev.logradouro,
          numero: dados.numero && (dados.numero?.toUpperCase() === "S/N" || dados.numero === "s/n") ? "" : (dados.numero ?? prev.numero),
          numeroSemNumero: !!(dados.numero && (dados.numero?.toUpperCase() === "S/N" || dados.numero === "s/n")),
          complemento: dados.complemento ?? prev.complemento,
          bairro: dados.bairro ?? prev.bairro,
          cep: dados.cep ? formatCepValue(dados.cep) : prev.cep,
          municipio: dados.municipio ?? prev.municipio,
        }));
      } catch {
        sessionStorage.removeItem(CNS_PACIENTE_KEY);
      }
      return;
    }
    if (fromDados) {
      const raw = sessionStorage.getItem(DADOS_PACIENTE_BUSCA_ALT_KEY);
      if (!raw) return;
      try {
        const dados = JSON.parse(raw) as { nomeCompleto?: string; nomeMae?: string; dataNascimento?: string };
        sessionStorage.removeItem(DADOS_PACIENTE_BUSCA_ALT_KEY);
        setForm((prev) => ({
          ...prev,
          nomeCompleto: dados.nomeCompleto ?? prev.nomeCompleto,
          nomeMae: dados.nomeMae ?? prev.nomeMae,
          dataNascimento: dados.dataNascimento ?? prev.dataNascimento,
        }));
      } catch {
        sessionStorage.removeItem(DADOS_PACIENTE_BUSCA_ALT_KEY);
      }
    }
  }, [searchParams]);

  const canSubmitStep1 = validarStep1(form);
  const canSubmitStep2 = validarStep2(form);
  const canSubmitStep3 = validarStep3(form);
  const canSubmitStep4 = validarStep4(form);
  const faltando = getFaltando(etapa, form);
  const errosStep1 = getErrosStep1(form);

  const handleCancelar = useCallback(() => {
    router.push("/gestante/login");
  }, [router]);

  const handleVoltar = useCallback(() => {
    setEtapa((e) => (e > 1 ? (e - 1) as 1 | 2 | 3 | 4 : e));
  }, []);

  const handleContinuar = useCallback(() => {
    setErroNotificacao("");
    if (etapa === 1 && !canSubmitStep1) return;
    if (etapa === 2 && !canSubmitStep2) return;
    if (etapa === 3 && !canSubmitStep3) return;
    if (etapa < 4) setEtapa((e) => (e + 1) as 1 | 2 | 3 | 4);
  }, [etapa, canSubmitStep1, canSubmitStep2, canSubmitStep3]);

  const pesquisarCep = useCallback(async (opts?: { force?: boolean }) => {
    const force = opts?.force ?? true;
    const digits = form.cep.replace(/\D/g, "").trim();
    setErroCep("");
    if (digits.length !== 8) {
      setErroCep("CEP inválido.");
      return;
    }
    setCepBuscando(true);
    try {
      const res = await fetch(`/api/cep/buscar?cep=${digits}`);
      const data = (await res.json()) as { ok?: boolean; erro?: string; tipoLogradouro?: string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (!res.ok || !data.ok) {
        setErroCep(data.erro ?? "CEP não localizado. Entre em contato com a unidade de saúde.");
        setCepBuscando(false);
        return;
      }
      const tipoLogradouro = (data.tipoLogradouro ?? "").trim();
      const logradouro = (data.logradouro ?? "").trim();
      const bairro = (data.bairro ?? "").trim();
      const localidade = (data.localidade ?? "").trim();
      setForm((prev) => ({
        ...prev,
        tipoLogradouro: force ? tipoLogradouro : (prev.tipoLogradouro || tipoLogradouro),
        logradouro: force ? logradouro : (prev.logradouro || logradouro),
        bairro: force ? bairro : (prev.bairro || bairro),
        municipio: force ? localidade : (prev.municipio || localidade),
      }));
    } catch {
      setErroCep("CEP não localizado. Entre em contato com a unidade de saúde.");
    }
    setCepBuscando(false);
  }, [form.cep]);

  useEffect(() => {
    if (!pacienteLocalizado) return;
    const digits = form.cep.replace(/\D/g, "").trim();
    if (digits.length !== 8) return;
    if (lastAutoCepLookupRef.current === digits) return;
    if (form.tipoLogradouro || form.logradouro || form.bairro || form.municipio) return;
    lastAutoCepLookupRef.current = digits;
    void pesquisarCep({ force: false });
  }, [pacienteLocalizado, form.cep, form.tipoLogradouro, form.logradouro, form.bairro, form.municipio, pesquisarCep]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (etapa !== 4 || !canSubmitStep4 || enviando) return;
      setErroEnvio("");
      setErroSenha("");
      setErroDum("");
      const dumErr = form.dum.trim() ? validarDum(form.dum) : null;
      if (dumErr) {
        setErroDum(dumErr);
        return;
      }
      if (form.programaSocial === "bolsa-familia" && form.nis.replace(/\D/g, "").length !== 11) {
        setErroEnvio("NIS é obrigatório para Bolsa Família (11 dígitos).");
        return;
      }
      const senhaTrim = form.senha.trim();
      const confirmaTrim = form.senhaConfirma.trim();
      if (senhaTrim.length < 6 || senhaTrim.length > 15) {
        setErroSenha("A senha deve ter o mínimo de 6 e máximo de 15 caracteres");
        return;
      }
      if (senhaTrim !== confirmaTrim) {
        setErroSenha("As senhas não coincidem");
        return;
      }
      setEnviando(true);
      const cpfDig = form.cpf.replace(/\D/g, "").slice(0, 11);
      const cnsDig = form.cns.replace(/\D/g, "").slice(0, 15);
      const cepDigits = form.cep.replace(/\D/g, "").slice(0, 8);
      const deficienciaVal =
        form.possuiDeficiencia && (form.deficienciaTipos.length > 0 || form.deficiencia.trim())
          ? [...form.deficienciaTipos, form.deficiencia.trim()].filter(Boolean).join("; ")
          : undefined;
      const dddP = form.ddd.replace(/\D/g, "").slice(0, 2);
      const celP = form.celularPrincipal.replace(/\D/g, "").slice(0, 9);
      const telefoneCompleto = dddP.length === 2 && celP.length === 9 ? dddP + celP : "";
      const payload = {
        cpf: cpfDig.length === 11 ? cpfDig : "",
        cns: cnsDig.length === 15 ? cnsDig : undefined,
        nomeCompleto: form.nomeCompleto.trim().slice(0, 70),
        nomeMae: form.nomeMaeIgnorada ? "IGNORADA" : form.nomeMae.trim() || undefined,
        nomePai: form.nomePaiIgnorado ? "IGNORADO" : form.nomePai.trim() || undefined,
        dataNascimento: form.dataNascimento.trim() || undefined,
        municipioNascimento: form.municipioNascimento.trim() || undefined,
        telefone: telefoneCompleto,
        telefoneAlternativo: form.telefoneAlternativo.replace(/\D/g, "").slice(0, 11) || undefined,
        temWhatsappAlternativo: form.temWhatsappAlternativo,
        telefoneResidencial: (() => {
          const dddR = form.dddResidencial.replace(/\D/g, "").slice(0, 2);
          const numR = form.telefoneResidencial.replace(/\D/g, "").slice(0, 8);
          if (dddR.length === 2 && numR.length === 8) return dddR + numR;
          return numR ? form.telefoneResidencial.replace(/\D/g, "").slice(0, 8) : undefined;
        })(),
        email: form.email.trim() || undefined,
        temWhatsapp: form.temWhatsapp,
        nomeSocial: form.nomeSocial.trim() || undefined,
        nomeSocialPrincipal: form.nomeSocialPrincipal,
        racaCor: form.racaCor.trim() || undefined,
        sexo: form.sexo.trim() || undefined,
        possuiDeficiencia: form.possuiDeficiencia,
        deficiencia: deficienciaVal,
        identidadeGenero: form.identidadeGenero.trim() || undefined,
        orientacaoSexual: form.orientacaoSexual.trim() || undefined,
        tipoLogradouro: form.tipoLogradouro.trim() || undefined,
        logradouro: form.logradouro.trim(),
        numero: form.numeroSemNumero ? "S/N" : form.numero.trim(),
        complemento: form.complemento.trim() || undefined,
        bairro: form.bairro.trim(),
        cep: cepDigits,
        municipio: form.municipio.trim() || undefined,
        pontoReferencia: form.pontoReferencia.trim() || undefined,
        descobrimento: form.descobrimento || undefined,
        programaSocial: form.programaSocial || "nenhum",
        nis: form.nis.trim() || undefined,
        planoSaude: form.planoSaude || undefined,
        manterAcompanhamentoUbs: form.manterAcompanhamentoUbs || undefined,
        ubsId: undefined,
        dum: form.dum.trim() || undefined,
        gestacoesPrevias: form.gestacoesPrevias.trim() || undefined,
        partosNormal: form.partosNormal.trim() || undefined,
        partosCesareo: form.partosCesareo.trim() || undefined,
        abortos: form.abortos.trim() || undefined,
        alergias: form.alergias.trim() || undefined,
        doencasConhecidas: form.doencasConhecidas.trim() || undefined,
        medicacoesEmUso: form.medicacoesEmUso.trim() || undefined,
        origemCadastro: searchParams.get("fromCns") === "1" ? "cip" : "manual",
        senha: senhaTrim || undefined,
      };
      try {
        const res = await fetch("/api/gestante/cadastrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErroEnvio(data.erro ?? "Erro ao cadastrar. Tente novamente.");
          setEnviando(false);
          return;
        }
        const id = data.id ?? null;
        setConfirmacaoData(null);
        setConfirmacaoCarregando(true);
        setMostrarConfirmacao(true);
        if (id) {
          try {
            const confRes = await fetch(`/api/gestante/confirmacao?cadastroId=${encodeURIComponent(id)}`);
            const confData = await confRes.json().catch(() => ({}));
            if (confData.ok && confData.tipo) {
              if (confData.tipo === "prenatal_existente") {
                setConfirmacaoData({
                  tipo: "prenatal_existente",
                  unidade: confData.unidade ?? "",
                  mensagem: confData.mensagem ?? "",
                });
              } else {
                setConfirmacaoData({
                  tipo: "unidades_proximas",
                  distritoNome: confData.distritoNome,
                  unidades: Array.isArray(confData.unidades) ? confData.unidades : [],
                });
              }
            }
          } finally {
            setConfirmacaoCarregando(false);
          }
        } else {
          setConfirmacaoCarregando(false);
        }
      } catch {
        setErroEnvio("Erro de conexão. Tente novamente.");
      }
      setEnviando(false);
    },
    [etapa, canSubmitStep4, enviando, form, searchParams]
  );

  const fecharConfirmacao = useCallback((acessar: boolean) => {
    setMostrarConfirmacao(false);
    if (acessar) {
      try {
        const g = { nomeCompleto: form.nomeCompleto.trim(), nomeSocial: form.nomeSocial.trim() || null, nomeSocialPrincipal: form.nomeSocialPrincipal };
        sessionStorage.setItem("gestante", JSON.stringify(g));
      } catch {}
      window.location.href = "/gestante";
    } else {
      window.location.href = "/gestante/login";
    }
  }, [form.nomeCompleto, form.nomeSocial, form.nomeSocialPrincipal]);

  return {
    etapa,
    setEtapa,
    form,
    updateField,
    erros: {
      cep: erroCep,
      dum: erroDum,
      senha: erroSenha,
      envio: erroEnvio,
      notificacao: erroNotificacao,
      setErroCep,
      setErroDum,
    },
    errosStep1,
    loading: { enviando, cepBuscando, confirmacaoCarregando: confirmacaoCarregando },
    canSubmitStep1,
    canSubmitStep2,
    canSubmitStep3,
    canSubmitStep4,
    faltando,
    handleContinuar,
    handleVoltar,
    handleCancelar,
    handleSubmit,
    pesquisarCep,
    mostrarConfirmacao,
    confirmacaoData,
    confirmacaoCarregando,
    fecharConfirmacao,
    pacienteLocalizado,
  };
}
