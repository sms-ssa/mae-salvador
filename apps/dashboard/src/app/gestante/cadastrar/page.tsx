"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Check, Phone, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UBS_LIST, DISTRITOS_SANITARIOS, mapPacienteBaseFederalToDadosCadastro } from "@mae-salvador/shared";
import type { DescobrimentoGestacao, ProgramaSocial } from "@mae-salvador/shared";

const CNS_PACIENTE_KEY = "cnsPaciente";
const DADOS_PACIENTE_BUSCA_ALT_KEY = "dadosPacienteBuscaAlt";

/** Opções de deficiência (doc. Cadastro Gestante Página 1: Se SIM, habilitar checkboxes). */
const DEFICIENCIA_OPCOES = [
  { value: "Física", id: "def-fisica" },
  { value: "Auditiva", id: "def-auditiva" },
  { value: "Visual", id: "def-visual" },
  { value: "Intelectual", id: "def-intelectual" },
  { value: "TEA", id: "def-tea" },
  { value: "Fibromialgia", id: "def-fibromialgia" },
] as const;

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

/**
 * Cadastro da gestante no fluxo "Criar conta" (sem login).
 * Acessível após pesquisa-cidadao; não usa o layout (dashboard) que exige usuário logado.
 * Se veio com ?fromCns=1 e há dados em sessionStorage (cnsPaciente), pré-preenche o formulário.
 */
function CadastrarGestanteContent() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Required fields
  const [cpf, setCpf] = useState("");
  const [cns, setCns] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [municipioNascimento, setMunicipioNascimento] = useState("");
  const [ddd, setDdd] = useState("");
  const [celularPrincipal, setCelularPrincipal] = useState("");
  const [telefoneAlternativo, setTelefoneAlternativo] = useState("");
  const [telefoneResidencial, setTelefoneResidencial] = useState("");
  const [email, setEmail] = useState("");
  const [temWhatsapp, setTemWhatsapp] = useState(false);

  // Optional identity
  const [nomeSocial, setNomeSocial] = useState("");
  const [nomeSocialPrincipal, setNomeSocialPrincipal] = useState(false);
  const [nomeMae, setNomeMae] = useState("");
  const [nomeMaeIgnorada, setNomeMaeIgnorada] = useState(false);
  const [nomePai, setNomePai] = useState("");
  const [nomePaiIgnorado, setNomePaiIgnorado] = useState(false);
  const [racaCor, setRacaCor] = useState("");
  const [sexo, setSexo] = useState("");
  const [possuiDeficiencia, setPossuiDeficiencia] = useState(false);
  const [deficienciaTipos, setDeficienciaTipos] = useState<string[]>([]);
  const [deficiencia, setDeficiencia] = useState("");
  const [identidadeGenero, setIdentidadeGenero] = useState("");
  const [orientacaoSexual, setOrientacaoSexual] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [idCadastro, setIdCadastro] = useState<string | null>(null);
  const [confirmacaoCarregando, setConfirmacaoCarregando] = useState(false);
  const [confirmacaoData, setConfirmacaoData] = useState<
    | null
    | { tipo: "prenatal_existente"; unidade: string; mensagem: string }
    | { tipo: "unidades_proximas"; distritoNome?: string; unidades: { nome: string; cnes?: string; distanciaKm: string }[] }
  >(null);

  // Address
  const [tipoLogradouro, setTipoLogradouro] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [numeroSemNumero, setNumeroSemNumero] = useState(false);
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [erroCep, setErroCep] = useState("");
  const [cepBuscando, setCepBuscando] = useState(false);
  const [distritoId, setDistritoId] = useState("");

  // Pregnancy info
  const [descobrimento, setDescobrimento] = useState<DescobrimentoGestacao | "">("");
  const [programaSocial, setProgramaSocial] = useState<ProgramaSocial | "">("");
  const [nis, setNis] = useState("");
  const [planoSaude, setPlanoSaude] = useState<"sim" | "nao" | "">("");
  const [manterAcompanhamentoUbs, setManterAcompanhamentoUbs] = useState<"sim" | "nao" | "">("");

  // UBS linkage
  const [ubsId, setUbsId] = useState("");

  // Optional obstetric
  const [dum, setDum] = useState("");
  const [erroDum, setErroDum] = useState("");
  const [gestacoesPrevias, setGestacoesPrevias] = useState("");
  const [partosCesareo, setPartosCesareo] = useState("");
  const [partosNormal, setPartosNormal] = useState("");
  const [abortos, setAbortos] = useState("");

  // Optional health
  const [alergias, setAlergias] = useState("");
  const [doencasConhecidas, setDoencasConhecidas] = useState("");
  const [medicacoesEmUso, setMedicacoesEmUso] = useState("");

  // Pré-preenche com dados da base federal (CNS) ou da busca alternativa (Dados do Paciente)
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
        const dados = mapPacienteBaseFederalToDadosCadastro(paciente);
        if (dados.cpf) setCpf(formatCpfValue(dados.cpf));
        if (dados.cns) setCns(dados.cns ?? "");
        if (dados.nomeCompleto) setNomeCompleto(dados.nomeCompleto);
        if (dados.nomeMae) setNomeMae(dados.nomeMae);
        if (dados.nomePai) setNomePai(dados.nomePai ?? "");
        if (dados.dataNascimento) setDataNascimento(dados.dataNascimento ?? "");
        if (dados.sexo) setSexo(dados.sexo);
        if (dados.logradouro) setLogradouro(dados.logradouro ?? "");
        const num = dados.numero ?? "";
        if (num && (num.toUpperCase() === "S/N" || num === "s/n")) setNumeroSemNumero(true);
        else if (num) setNumero(num);
        if (dados.complemento) setComplemento(dados.complemento ?? "");
        if (dados.bairro) setBairro(dados.bairro ?? "");
        if (dados.cep) setCep(formatCepValue(dados.cep ?? ""));
      } catch (_) {
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
        if (dados.nomeCompleto) setNomeCompleto(dados.nomeCompleto);
        if (dados.nomeMae) setNomeMae(dados.nomeMae);
        if (dados.dataNascimento) setDataNascimento(dados.dataNascimento);
      } catch (_) {
        sessionStorage.removeItem(DADOS_PACIENTE_BUSCA_ALT_KEY);
      }
    }
  }, [searchParams]);

  const ubsOptions = distritoId
    ? UBS_LIST.filter((u) => u.distritoSanitarioId === distritoId)
    : UBS_LIST;

  const cpfDigits = cpf.replace(/\D/g, "").slice(0, 11);
  const cnsDigits = cns.replace(/\D/g, "").slice(0, 15);
  const temCpfOuCns = cpfDigits.length === 11 || cnsDigits.length === 15;
  const dddDig = ddd.replace(/\D/g, "").slice(0, 2);
  const celDig = celularPrincipal.replace(/\D/g, "").slice(0, 9);
  const telefonePrincipalOk = dddDig.length === 2 && celDig.length === 9 && celDig[0] === "9";
  const emailOk = !email.trim() || (email.includes("@") && email.includes("."));

  /** DUM: não pode ser menor que 7 dias nem maior que 294 dias (doc. Página 3). */
  function validarDum(data: string): string | null {
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

  const dumOk = !dum.trim() || validarDum(dum) === null;
  const nisDig = nis.replace(/\D/g, "").slice(0, 11);
  const nisOk = programaSocial !== "bolsa-familia" || nisDig.length === 11;

  /** Lista o que falta para habilitar o botão Continuar (ajuda quando o usuário acha que preencheu tudo). */
  const faltando: string[] = [];
  if (!temCpfOuCns) faltando.push("CPF (11 dígitos) ou CNS (15 dígitos)");
  if (!nomeCompleto.trim()) faltando.push("Nome completo");
  if (!nomeMaeIgnorada && nomeMae.trim() === "") faltando.push("Nome da Mãe (ou marque Ignorada)");
  if (!nomePaiIgnorado && nomePai.trim() === "") faltando.push("Nome do Pai (ou marque Ignorado)");
  if (!dataNascimento.trim()) faltando.push("Data de nascimento");
  if (!telefonePrincipalOk) faltando.push("DDD (2 dígitos) e Celular principal (9 dígitos, começando com 9)");
  if (!emailOk) faltando.push("E-mail válido (com @ e ponto) ou deixe em branco");
  if (!logradouro.trim()) faltando.push("Logradouro");
  if (!numeroSemNumero && !numero.trim()) faltando.push("Número (ou marque S/N)");
  if (!bairro.trim()) faltando.push("Bairro");
  if (cep.replace(/\D/g, "").length !== 8) faltando.push("CEP (8 dígitos)");
  if (!descobrimento) faltando.push("Como descobriu a gestação");
  if (!programaSocial) faltando.push("Programa social");
  if (!nisOk) faltando.push("NIS (11 dígitos, obrigatório para Bolsa Família)");
  if (!dumOk) faltando.push("DUM: se informada, deve estar entre 7 e 294 dias atrás");
  if (!ubsId) faltando.push("UBS de Vinculação");

  const canSubmit =
    temCpfOuCns &&
    nomeCompleto.trim().length > 0 &&
    nomeCompleto.trim().length <= 70 &&
    (nomeMaeIgnorada || nomeMae.trim() !== "") &&
    (nomePaiIgnorado || nomePai.trim() !== "") &&
    dataNascimento.trim() !== "" &&
    telefonePrincipalOk &&
    emailOk &&
    logradouro.trim() !== "" &&
    (numeroSemNumero || numero.trim() !== "") &&
    bairro.trim() !== "" &&
    cep.replace(/\D/g, "").length === 8 &&
    descobrimento !== "" &&
    programaSocial !== "" &&
    dumOk &&
    nisOk &&
    ubsId !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || enviando) return;
    setErroEnvio("");
    setErroSenha("");
    setErroDum("");
    const dumErr = dum.trim() ? validarDum(dum) : null;
    if (dumErr) {
      setErroDum(dumErr);
      return;
    }
    if (programaSocial === "bolsa-familia" && nis.replace(/\D/g, "").length !== 11) {
      setErroEnvio("NIS é obrigatório para Bolsa Família (11 dígitos).");
      return;
    }
    const senhaTrim = senha.trim();
    const confirmaTrim = senhaConfirma.trim();
    if (senhaTrim.length > 0 || confirmaTrim.length > 0) {
      if (senhaTrim.length < 6 || senhaTrim.length > 15) {
        setErroSenha("A senha deve ter o mínimo de 6 e máximo de 15 caracteres");
        return;
      }
      if (senhaTrim !== confirmaTrim) {
        setErroSenha("As senhas não coincidem");
        return;
      }
    }
    setEnviando(true);
    const cpfDig = cpf.replace(/\D/g, "").slice(0, 11);
    const cnsDig = cns.replace(/\D/g, "").slice(0, 15);
    const cepDigits = cep.replace(/\D/g, "").slice(0, 8);
    const deficienciaVal =
      possuiDeficiencia && (deficienciaTipos.length > 0 || deficiencia.trim())
        ? [...deficienciaTipos, deficiencia.trim()].filter(Boolean).join("; ")
        : undefined;
    const dddP = ddd.replace(/\D/g, "").slice(0, 2);
    const celP = celularPrincipal.replace(/\D/g, "").slice(0, 9);
    const telefoneCompleto = dddP.length === 2 && celP.length === 9 ? dddP + celP : "";
    const payload = {
      cpf: cpfDig.length === 11 ? cpfDig : "",
      cns: cnsDig.length === 15 ? cnsDig : undefined,
      nomeCompleto: nomeCompleto.trim().slice(0, 70),
      nomeMae: nomeMaeIgnorada ? "IGNORADA" : nomeMae.trim() || undefined,
      nomePai: nomePaiIgnorado ? "IGNORADO" : nomePai.trim() || undefined,
      dataNascimento: dataNascimento.trim() || undefined,
      municipioNascimento: municipioNascimento.trim() || undefined,
      telefone: telefoneCompleto,
      telefoneAlternativo: telefoneAlternativo.replace(/\D/g, "").slice(0, 11) || undefined,
      telefoneResidencial: telefoneResidencial.replace(/\D/g, "").slice(0, 8) || undefined,
      email: email.trim() || undefined,
      temWhatsapp: temWhatsapp,
      nomeSocial: nomeSocial.trim() || undefined,
      nomeSocialPrincipal: nomeSocialPrincipal,
      racaCor: racaCor.trim() || undefined,
      sexo: sexo.trim() || undefined,
      possuiDeficiencia: possuiDeficiencia,
      deficiencia: deficienciaVal,
      identidadeGenero: identidadeGenero.trim() || undefined,
      orientacaoSexual: orientacaoSexual.trim() || undefined,
      tipoLogradouro: tipoLogradouro.trim() || undefined,
      logradouro: logradouro.trim(),
      numero: numeroSemNumero ? "S/N" : numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cep: cepDigits,
      municipio: municipio.trim() || undefined,
      pontoReferencia: pontoReferencia.trim() || undefined,
      distritoId: distritoId.trim() || undefined,
      descobrimento: descobrimento || undefined,
      programaSocial: programaSocial || "nenhum",
      nis: nis.trim() || undefined,
      planoSaude: planoSaude || undefined,
      manterAcompanhamentoUbs: manterAcompanhamentoUbs || undefined,
      ubsId: ubsId.trim(),
      dum: dum.trim() || undefined,
      gestacoesPrevias: gestacoesPrevias.trim() || undefined,
      partosNormal: partosNormal.trim() || undefined,
      partosCesareo: partosCesareo.trim() || undefined,
      abortos: abortos.trim() || undefined,
      alergias: alergias.trim() || undefined,
      doencasConhecidas: doencasConhecidas.trim() || undefined,
      medicacoesEmUso: medicacoesEmUso.trim() || undefined,
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
      setIdCadastro(id);
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
    } catch (_) {
      setErroEnvio("Erro de conexão. Tente novamente.");
    }
    setEnviando(false);
  }

  function fecharConfirmacao(acessar: boolean) {
    setMostrarConfirmacao(false);
    if (acessar) {
      try {
        const g = { nomeCompleto: nomeCompleto.trim(), nomeSocial: nomeSocial.trim() || null, nomeSocialPrincipal };
        sessionStorage.setItem("gestante", JSON.stringify(g));
      } catch (_) {}
      window.location.href = "/gestante";
    } else {
      window.location.href = "/gestante/login";
    }
  }

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  async function pesquisarCep() {
    const digits = cep.replace(/\D/g, "").trim();
    setErroCep("");
    if (digits.length !== 8) {
      setErroCep("CEP inválido.");
      return;
    }
    setCepBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (data.erro) {
        setErroCep("CEP não localizado.");
        setCepBuscando(false);
        return;
      }
      const localidade = (data.localidade ?? "").trim();
      const uf = (data.uf ?? "").trim();
      if (localidade.toUpperCase() !== "SALVADOR" || uf.toUpperCase() !== "BA") {
        setErroCep("CEP fora de Salvador.");
        setCepBuscando(false);
        return;
      }
      setLogradouro((data.logradouro ?? "").trim());
      setBairro((data.bairro ?? "").trim());
      setMunicipio(localidade);
      const log = (data.logradouro ?? "").trim();
      if (/^Rua\s/i.test(log)) setTipoLogradouro("Rua");
      else if (/^Avenida\s/i.test(log)) setTipoLogradouro("Avenida");
      else if (/^Praça\s/i.test(log)) setTipoLogradouro("Praça");
      else if (/^Travessa\s/i.test(log)) setTipoLogradouro("Travessa");
      else setTipoLogradouro("");
    } catch {
      setErroCep("CEP não localizado.");
    }
    setCepBuscando(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cadastro da Gestante
            </h1>
            <p className="text-sm text-white/80 mt-1">
              Preencha os dados para cadastrar uma nova gestante no programa
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Link href="/gestante/pesquisa-cidadao">Voltar</Link>
          </Button>
        </div>

        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── Dados Pessoais (doc. Cadastro Gestante Página 1) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">
                        CPF <span className="text-red-500">*</span> <span className="text-xs font-normal text-muted-foreground">(obrigatório se CNS vazio)</span>
                      </Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCpf(e.target.value))}
                        maxLength={14}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cns">
                        Cartão Nacional de Saúde <span className="text-red-500">*</span> <span className="text-xs font-normal text-muted-foreground">(obrigatório se CPF vazio)</span>
                      </Label>
                      <Input
                        id="cns"
                        placeholder="Cartão Nacional de Saúde"
                        value={cns}
                        onChange={(e) => setCns(e.target.value.replace(/\D/g, "").slice(0, 15))}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome">
                      Nome completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nome"
                      placeholder="Nome completo da gestante (até 70 caracteres)"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value.slice(0, 70))}
                      maxLength={70}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="nome-social">Nome social</Label>
                      <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nomeSocialPrincipal}
                          onChange={(e) => setNomeSocialPrincipal(e.target.checked)}
                          className="rounded"
                        />
                        Principal
                      </label>
                    </div>
                    <Input
                      id="nome-social"
                      placeholder="Nome social (se aplicável)"
                      value={nomeSocial}
                      onChange={(e) => setNomeSocial(e.target.value.slice(0, 70))}
                      maxLength={70}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="nome-mae">Nome da Mãe <span className="text-red-500">*</span></Label>
                      <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nomeMaeIgnorada}
                          onChange={(e) => {
                            setNomeMaeIgnorada(e.target.checked);
                            if (e.target.checked) setNomeMae("IGNORADA");
                            else setNomeMae("");
                          }}
                          className="rounded"
                        />
                        Ignorada
                      </label>
                    </div>
                    <Input
                      id="nome-mae"
                      placeholder="Até 70 caracteres"
                      value={nomeMae}
                      onChange={(e) => setNomeMae(e.target.value.slice(0, 70))}
                      maxLength={70}
                      disabled={nomeMaeIgnorada}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="nome-pai">Nome do Pai <span className="text-red-500">*</span></Label>
                      <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nomePaiIgnorado}
                          onChange={(e) => {
                            setNomePaiIgnorado(e.target.checked);
                            if (e.target.checked) setNomePai("IGNORADO");
                            else setNomePai("");
                          }}
                          className="rounded"
                        />
                        Ignorado
                      </label>
                    </div>
                    <Input
                      id="nome-pai"
                      placeholder="Até 70 caracteres"
                      value={nomePai}
                      onChange={(e) => setNomePai(e.target.value.slice(0, 70))}
                      maxLength={70}
                      disabled={nomePaiIgnorado}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Raça/Cor</Label>
                      <Select value={racaCor} onValueChange={setRacaCor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRANCA">Branca</SelectItem>
                          <SelectItem value="PARDA">Parda</SelectItem>
                          <SelectItem value="PRETA">Preta</SelectItem>
                          <SelectItem value="AMARELA">Amarela</SelectItem>
                          <SelectItem value="INDIGENA">Indígena</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <Select value={sexo} onValueChange={setSexo}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FEMININO">Feminino</SelectItem>
                          <SelectItem value="MASCULINO">Masculino</SelectItem>
                          <SelectItem value="INDETERMINADO">Indeterminado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Possui Deficiência?</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="deficiencia"
                          checked={possuiDeficiencia === true}
                          onChange={() => setPossuiDeficiencia(true)}
                        />
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="deficiencia"
                          checked={possuiDeficiencia === false}
                          onChange={() => { setPossuiDeficiencia(false); setDeficienciaTipos([]); setDeficiencia(""); }}
                        />
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                    {possuiDeficiencia && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Selecione o(s) tipo(s):</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          {DEFICIENCIA_OPCOES.map((op) => (
                            <label key={op.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                id={op.id}
                                checked={deficienciaTipos.includes(op.value)}
                                onChange={(e) => {
                                  if (e.target.checked) setDeficienciaTipos((prev) => [...prev, op.value]);
                                  else setDeficienciaTipos((prev) => prev.filter((v) => v !== op.value));
                                }}
                                className="rounded border-input"
                              />
                              <span className="text-sm">{op.value}</span>
                            </label>
                          ))}
                        </div>
                        <Input
                          placeholder="Outras (descreva se necessário)"
                          value={deficiencia}
                          onChange={(e) => setDeficiencia(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Identidade de gênero</Label>
                      <Select value={identidadeGenero} onValueChange={setIdentidadeGenero}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mulher-cis">Mulher cisgênero</SelectItem>
                          <SelectItem value="mulher-trans">Mulher transgênero</SelectItem>
                          <SelectItem value="homem-trans">Homem transgênero</SelectItem>
                          <SelectItem value="nao-binario">Não-binário</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                          <SelectItem value="prefere-nao-declarar">Prefere não declarar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Orientação sexual</Label>
                      <Select value={orientacaoSexual} onValueChange={setOrientacaoSexual}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="heterossexual">Heterossexual</SelectItem>
                          <SelectItem value="homossexual">Homossexual</SelectItem>
                          <SelectItem value="bissexual">Bissexual</SelectItem>
                          <SelectItem value="assexual">Assexual</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                          <SelectItem value="prefere-nao-declarar">Prefere não declarar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nascimento">Data de nascimento <span className="text-red-500">*</span></Label>
                      <Input
                        id="nascimento"
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="municipio-nascimento">Município de nascimento</Label>
                      <Input
                        id="municipio-nascimento"
                        placeholder="Ex.: Salvador, Feira de Santana"
                        value={municipioNascimento}
                        onChange={(e) => setMunicipioNascimento(e.target.value.slice(0, 100))}
                        maxLength={100}
                      />
                      <p className="text-[10px] text-muted-foreground">Usado na recuperação de senha (pergunta de segurança)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Contatos (doc. Cadastro Gestante Página 2) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Contatos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ddd">DDD <span className="text-red-500">*</span></Label>
                      <Input
                        id="ddd"
                        placeholder="71"
                        value={ddd}
                        onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 2))}
                        maxLength={2}
                        inputMode="numeric"
                      />
                      <p className="text-[10px] text-muted-foreground">2 dígitos</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="celular">Telefone celular principal <span className="text-red-500">*</span></Label>
                      <Input
                        id="celular"
                        placeholder="99999-9999"
                        value={celularPrincipal}
                        onChange={(e) => setCelularPrincipal(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        maxLength={9}
                        inputMode="numeric"
                      />
                      <p className="text-[10px] text-muted-foreground">9 dígitos, inicia com 9</p>
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer h-9">
                        <input
                          type="checkbox"
                          checked={temWhatsapp}
                          onChange={(e) => setTemWhatsapp(e.target.checked)}
                          className="rounded border-input"
                        />
                        <span className="text-sm">WhatsApp</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tel-alt">Telefone celular alternativo</Label>
                      <Input
                        id="tel-alt"
                        placeholder="(71) 99999-9999"
                        value={telefoneAlternativo}
                        onChange={(e) => setTelefoneAlternativo(formatPhone(e.target.value))}
                        maxLength={15}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tel-res">Telefone residencial</Label>
                      <Input
                        id="tel-res"
                        placeholder="3333-4444"
                        value={telefoneResidencial}
                        onChange={(e) => setTelefoneResidencial(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        maxLength={8}
                        inputMode="numeric"
                      />
                      <p className="text-[10px] text-muted-foreground">8 dígitos, inicia com 2 a 5</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemplo@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Deve conter @ e ponto</p>
                    {email.trim() && !email.includes("@") && (
                      <p className="text-xs text-destructive">E-mail deve conter @ e ponto.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Endereço (doc. Cadastro Gestante Página 2) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Endereço <span className="text-red-500 text-xs font-normal">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP <span className="text-red-500">*</span></Label>
                      <div className="flex gap-2">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={cep}
                          onChange={(e) => { setCep(formatCep(e.target.value)); setErroCep(""); }}
                          maxLength={9}
                          className={erroCep ? "border-destructive" : ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={pesquisarCep}
                          disabled={cepBuscando || cep.replace(/\D/g, "").length !== 8}
                          title="Pesquisar CEP"
                        >
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                      {erroCep && <p className="text-sm text-destructive">{erroCep}</p>}
                      <p className="text-[10px] text-muted-foreground">8 dígitos. Busca na base de CEP (ViaCEP).</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="municipio">Município</Label>
                      <Input
                        id="municipio"
                        placeholder="Preenchido pela busca CEP"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo-logradouro">Tipo de logradouro</Label>
                      <Select value={tipoLogradouro} onValueChange={setTipoLogradouro}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rua">Rua</SelectItem>
                          <SelectItem value="Avenida">Avenida</SelectItem>
                          <SelectItem value="Praça">Praça</SelectItem>
                          <SelectItem value="Travessa">Travessa</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logradouro">Logradouro <span className="text-red-500">*</span></Label>
                      <Input
                        id="logradouro"
                        placeholder="Nome do logradouro"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro <span className="text-red-500">*</span></Label>
                    <Input
                      id="bairro"
                      placeholder="Bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="numero">Número <span className="text-red-500">*</span></Label>
                        <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={numeroSemNumero}
                            onChange={(e) => {
                              setNumeroSemNumero(e.target.checked);
                              if (e.target.checked) setNumero("");
                            }}
                            className="rounded border-input"
                          />
                          S/N
                        </label>
                      </div>
                      <Input
                        id="numero"
                        placeholder="Nº"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        disabled={numeroSemNumero}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        placeholder="Apto, Bloco..."
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ponto-ref">Ponto de referência</Label>
                    <Input
                      id="ponto-ref"
                      placeholder="Ex.: próximo ao mercado, prédio azul"
                      value={pontoReferencia}
                      onChange={(e) => setPontoReferencia(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Distrito Sanitário</Label>
                      <Select value={distritoId} onValueChange={(v) => { setDistritoId(v); setUbsId(""); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o distrito" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISTRITOS_SANITARIOS.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        UBS de Vinculação <span className="text-red-500">*</span>
                      </Label>
                      <Select value={ubsId} onValueChange={setUbsId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a UBS" />
                        </SelectTrigger>
                        <SelectContent>
                          {ubsOptions.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Dados da gestação atual (doc. Cadastro Gestante Página 3) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dados da gestação atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Como descobriu a gestação <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={descobrimento}
                        onValueChange={(v) => setDescobrimento(v as DescobrimentoGestacao)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teste-rapido">Teste rápido</SelectItem>
                          <SelectItem value="beta-hcg">Beta-HCG (Sangue)</SelectItem>
                          <SelectItem value="atraso-menstrual">Atraso Menstrual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dum">Data da última menstruação (DUM)</Label>
                      <Input
                        id="dum"
                        type="date"
                        value={dum}
                        onChange={(e) => { setDum(e.target.value); setErroDum(""); }}
                        className={erroDum ? "border-destructive" : ""}
                        aria-invalid={!!erroDum}
                      />
                      {erroDum && <p className="text-sm text-destructive">{erroDum}</p>}
                      <p className="text-[10px] text-muted-foreground">Facultativo. Se informada: entre 7 e 294 dias atrás.</p>
                    </div>
                  </div>

                  <Separator />

                  <p className="text-sm font-medium text-foreground">Perfil social</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Programa social <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={programaSocial}
                        onValueChange={(v) => setProgramaSocial(v as ProgramaSocial)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Nenhum</SelectItem>
                          <SelectItem value="bolsa-familia">Bolsa Família</SelectItem>
                          <SelectItem value="bpc-loas">BPC/LOAS</SelectItem>
                          <SelectItem value="aluguel-social">Aluguel Social</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {programaSocial === "bolsa-familia" && (
                      <div className="space-y-2">
                        <Label htmlFor="nis">
                          NIS <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nis"
                          placeholder="11 dígitos"
                          value={nis}
                          onChange={(e) => setNis(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          maxLength={11}
                          inputMode="numeric"
                          className={programaSocial === "bolsa-familia" && nis.replace(/\D/g, "").length > 0 && nis.replace(/\D/g, "").length !== 11 ? "border-destructive" : ""}
                        />
                        <p className="text-[10px] text-muted-foreground">Obrigatório para Bolsa Família (11 dígitos).</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plano de saúde ou particular?</Label>
                      <Select
                        value={planoSaude}
                        onValueChange={(v) => setPlanoSaude(v as "sim" | "nao")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {planoSaude === "sim" && (
                      <div className="space-y-2">
                        <Label>Deseja manter acompanhamento na UBS?</Label>
                        <Select
                          value={manterAcompanhamentoUbs}
                          onValueChange={(v) => setManterAcompanhamentoUbs(v as "sim" | "nao")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Sim</SelectItem>
                            <SelectItem value="nao">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Antecedentes (doc. Cadastro Gestante Página 3) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Antecedentes</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Facultativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gestacoes">Gestações prévias</Label>
                      <Input
                        id="gestacoes"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={gestacoesPrevias}
                        onChange={(e) => setGestacoesPrevias(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partos-cesareo">Partos cesáreos</Label>
                      <Input
                        id="partos-cesareo"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={partosCesareo}
                        onChange={(e) => setPartosCesareo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partos-normal">Partos normais</Label>
                      <Input
                        id="partos-normal"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={partosNormal}
                        onChange={(e) => setPartosNormal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="abortos">Abortos</Label>
                      <Input
                        id="abortos"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={abortos}
                        onChange={(e) => setAbortos(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Saúde (Facultativo) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Informações de Saúde</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Facultativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="alergias">Alergias</Label>
                    <Input
                      id="alergias"
                      placeholder="Descreva alergias conhecidas"
                      value={alergias}
                      onChange={(e) => setAlergias(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doencas">Doenças conhecidas (antecedentes)</Label>
                    <Input
                      id="doencas"
                      placeholder="Diabetes, hipertensão, cardiopatia..."
                      value={doencasConhecidas}
                      onChange={(e) => setDoencasConhecidas(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicacoes">Medicações em uso</Label>
                    <Input
                      id="medicacoes"
                      placeholder="Medicamentos que faz uso atualmente"
                      value={medicacoesEmUso}
                      onChange={(e) => setMedicacoesEmUso(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Senha de Acesso (doc item 5 página 4) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Senha de Acesso</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Opcional. Defina uma senha para acessar o sistema depois (6 a 15 caracteres).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Crie uma senha</Label>
                    <Input
                      id="senha"
                      type="password"
                      maxLength={15}
                      placeholder="6 a 15 caracteres"
                      value={senha}
                      onChange={(e) => { setSenha(e.target.value.slice(0, 15)); setErroSenha(""); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha-confirma">Confirme a senha</Label>
                    <Input
                      id="senha-confirma"
                      type="password"
                      maxLength={15}
                      placeholder="Repita a senha"
                      value={senhaConfirma}
                      onChange={(e) => { setSenhaConfirma(e.target.value.slice(0, 15)); setErroSenha(""); }}
                    />
                  </div>
                  {erroSenha && (
                    <p className="text-sm text-destructive">{erroSenha}</p>
                  )}
                </CardContent>
              </Card>

              {/* ── Submit ── */}
              {erroEnvio && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {erroEnvio}
                </p>
              )}
              {!canSubmit && !enviando && faltando.length > 0 && (
                <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  Para continuar, preencha: <strong>{faltando.join("; ")}</strong>
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <Button
                  type="submit"
                  disabled={!canSubmit || enviando}
                  size="lg"
                >
                  {enviando ? "Salvando…" : "Continuar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={mostrarConfirmacao} onOpenChange={(open) => !open && fecharConfirmacao(false)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cadastro realizado!</DialogTitle>
          </DialogHeader>
          {confirmacaoCarregando ? (
            <p className="text-sm text-muted-foreground">Carregando informações...</p>
          ) : confirmacaoData?.tipo === "prenatal_existente" ? (
            <p className="text-sm text-muted-foreground">
              {confirmacaoData.mensagem ||
                (confirmacaoData.unidade
                  ? `Existe pré-natal em andamento na unidade ${confirmacaoData.unidade}. Conclua o acompanhamento lá.`
                  : "Existe pré-natal em andamento. Conclua o acompanhamento na unidade em que foi iniciado.")}
            </p>
          ) : confirmacaoData?.tipo === "unidades_proximas" && confirmacaoData.unidades.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Você pode acessar o sistema com seu CPF/CNS e a senha definida. Procure uma das unidades abaixo para iniciar seu pré-natal.
              </p>
              {confirmacaoData.distritoNome && (
                <p className="text-xs font-medium text-muted-foreground">
                  Unidades no seu distrito ({confirmacaoData.distritoNome}):
                </p>
              )}
              <ul className="text-sm space-y-1 list-disc list-inside">
                {confirmacaoData.unidades.map((u, i) => (
                  <li key={i}>
                    {u.nome}
                    {u.distanciaKm && u.distanciaKm !== "—" ? ` — ${u.distanciaKm} km` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você pode acessar o sistema com seu CPF/CNS e a senha definida. Procure a unidade de saúde para iniciar seu pré-natal.
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => fecharConfirmacao(false)} variant="outline">
              Fechar
            </Button>
            <Button onClick={() => fecharConfirmacao(true)}>
              Acessar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CadastrarGestantePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center text-muted-foreground">Carregando...</div>}>
      <CadastrarGestanteContent />
    </Suspense>
  );
}
