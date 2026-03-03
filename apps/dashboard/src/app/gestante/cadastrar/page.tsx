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
import { Check, Phone } from "lucide-react";
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
  const [telefone, setTelefone] = useState("");
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
  const [deficiencia, setDeficiencia] = useState("");
  const [identidadeGenero, setIdentidadeGenero] = useState("");
  const [orientacaoSexual, setOrientacaoSexual] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [idCadastro, setIdCadastro] = useState<string | null>(null);

  // Address
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
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
  const [gestacoesPrevias, setGestacoesPrevias] = useState("");
  const [partosCesareo, setPartosCesareo] = useState("");
  const [partosNormal, setPartosNormal] = useState("");
  const [abortos, setAbortos] = useState("");

  // Optional health
  const [alergias, setAlergias] = useState("");
  const [doencasConhecidas, setDoencasConhecidas] = useState("");
  const [medicacoesEmUso, setMedicacoesEmUso] = useState("");

  // Pré-preenche com dados da base federal (CNS) quando vier da pesquisa com paciente encontrado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromCns = searchParams.get("fromCns") === "1";
    if (!fromCns) return;
    const raw = sessionStorage.getItem(CNS_PACIENTE_KEY);
    if (!raw) return;
    try {
      const paciente = JSON.parse(raw) as Parameters<typeof mapPacienteBaseFederalToDadosCadastro>[0];
      sessionStorage.removeItem(CNS_PACIENTE_KEY);
      const dados = mapPacienteBaseFederalToDadosCadastro(paciente);
      if (dados.cpf) setCpf(formatCpfValue(dados.cpf));
      if (dados.cns) setCns(dados.cns);
      if (dados.nomeCompleto) setNomeCompleto(dados.nomeCompleto);
      if (dados.dataNascimento) setDataNascimento(dados.dataNascimento);
      if (dados.logradouro) setLogradouro(dados.logradouro);
      if (dados.numero) setNumero(dados.numero);
      if (dados.complemento) setComplemento(dados.complemento);
      if (dados.bairro) setBairro(dados.bairro);
      if (dados.cep) setCep(formatCepValue(dados.cep));
    } catch (_) {
      sessionStorage.removeItem(CNS_PACIENTE_KEY);
    }
  }, [searchParams]);

  const ubsOptions = distritoId
    ? UBS_LIST.filter((u) => u.distritoSanitarioId === distritoId)
    : UBS_LIST;

  const canSubmit =
    cpf.trim() !== "" &&
    nomeCompleto.trim() !== "" &&
    telefone.trim() !== "" &&
    logradouro.trim() !== "" &&
    numero.trim() !== "" &&
    bairro.trim() !== "" &&
    cep.trim() !== "" &&
    descobrimento !== "" &&
    programaSocial !== "" &&
    ubsId !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || enviando) return;
    setErroEnvio("");
    setErroSenha("");
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
    const cpfDigits = cpf.replace(/\D/g, "").slice(0, 11);
    const cepDigits = cep.replace(/\D/g, "").slice(0, 8);
    const payload = {
      cpf: cpfDigits,
      cns: cns.replace(/\D/g, "").slice(0, 15) || undefined,
      nomeCompleto: nomeCompleto.trim(),
      nomeMae: nomeMaeIgnorada ? "IGNORADA" : nomeMae.trim() || undefined,
      nomePai: nomePaiIgnorado ? "IGNORADO" : nomePai.trim() || undefined,
      dataNascimento: dataNascimento.trim() || undefined,
      telefone: telefone.trim(),
      temWhatsapp: temWhatsapp,
      nomeSocial: nomeSocial.trim() || undefined,
      nomeSocialPrincipal: nomeSocialPrincipal,
      racaCor: racaCor.trim() || undefined,
      sexo: sexo.trim() || undefined,
      possuiDeficiencia: possuiDeficiencia,
      deficiencia: possuiDeficiencia ? deficiencia.trim() || undefined : undefined,
      identidadeGenero: identidadeGenero.trim() || undefined,
      orientacaoSexual: orientacaoSexual.trim() || undefined,
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cep: cepDigits,
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
      setIdCadastro(data.id ?? null);
      setMostrarConfirmacao(true);
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
              {/* ── Identificação ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">
                        CPF <span className="text-red-500">*</span>
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
                      <Label htmlFor="cns">CNS</Label>
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
                      placeholder="Nome completo da gestante"
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
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
                      <Label htmlFor="nome-mae">Nome da Mãe</Label>
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
                      <Label htmlFor="nome-pai">Nome do Pai</Label>
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
                          onChange={() => { setPossuiDeficiencia(false); setDeficiencia(""); }}
                        />
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                    {possuiDeficiencia && (
                      <Input
                        placeholder="Descreva a(s) deficiência(s)"
                        value={deficiencia}
                        onChange={(e) => setDeficiencia(e.target.value)}
                        className="mt-2"
                      />
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
                      <Label htmlFor="nascimento">Data de nascimento</Label>
                      <Input
                        id="nascimento"
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">
                        Telefone <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="telefone"
                          placeholder="(71) 99999-9999"
                          value={telefone}
                          onChange={(e) => setTelefone(formatPhone(e.target.value))}
                          maxLength={15}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setTemWhatsapp(!temWhatsapp)}
                          className={`flex items-center gap-1.5 px-3 rounded-md border text-xs font-medium transition-colors shrink-0 ${
                            temWhatsapp
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Endereço ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Endereço <span className="text-red-500 text-xs font-normal">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="logradouro">Logradouro</Label>
                      <Input
                        id="logradouro"
                        placeholder="Rua, Avenida..."
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        placeholder="Nº"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        placeholder="Apto, Bloco..."
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        placeholder="Bairro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => setCep(formatCep(e.target.value))}
                        maxLength={9}
                      />
                    </div>
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

              {/* ── Dados da Gestação ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dados da Gestação</CardTitle>
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
                        onChange={(e) => setDum(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">Facultativo</p>
                    </div>
                  </div>

                  <Separator />

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
                          placeholder="Número de Identificação Social"
                          value={nis}
                          onChange={(e) => setNis(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          maxLength={11}
                        />
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

              {/* ── Histórico Obstétrico (Facultativo) ── */}
              <Card className="bg-muted/30 border-0 shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Histórico Obstétrico</CardTitle>
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
              <div className="flex gap-3 justify-end">
                <Button
                  type="submit"
                  disabled={!canSubmit || enviando}
                  size="lg"
                >
                  {enviando ? "Salvando…" : "Finalizar Cadastro"}
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
          <p className="text-sm text-muted-foreground">
            Você pode acessar o sistema com seu CPF/CNS e a senha definida. Procure a unidade de saúde para iniciar seu pré-natal.
          </p>
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
