"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Info } from "lucide-react";
import { validarCPF, validarCNS } from "@/lib/validacoes-login";

const RE_NOME = /^[A-Za-zÀ-ÿ\s']+$/;

function validarNome(nome: string): boolean {
  if (!nome.trim()) return false;
  if (/\s{2,}/.test(nome)) return false;
  return RE_NOME.test(nome.replace(/\s/g, " "));
}

function isFontesIndisponiveis(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const value = (data as { fontesIndisponiveis?: unknown }).fontesIndisponiveis;
  return value === true;
}

/**
 * Pesquisa do(a) Cidadão(ã) (requisitos itens 3 e 4).
 * CPF → Pesquisar; "Não Possui" → busca alternativa (CNS ou Dados do Paciente).
 */
export default function PesquisaCidadaoPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [erroCpf, setErroCpf] = useState("");
  const [naoPossui, setNaoPossui] = useState(false);
  const [buscaAlternativa, setBuscaAlternativa] = useState<
    "cns" | "dados" | ""
  >("");
  const [cnsAlt, setCnsAlt] = useState("");
  const [erroCns, setErroCns] = useState("");
  const [nomeCompletoAlt, setNomeCompletoAlt] = useState("");
  const [nomeMaeAlt, setNomeMaeAlt] = useState("");
  const [dataNascAlt, setDataNascAlt] = useState("");
  const [erroDados, setErroDados] = useState("");
  const [erroNomeCompleto, setErroNomeCompleto] = useState("");
  const [erroNomeMae, setErroNomeMae] = useState("");
  const [erroDataNasc, setErroDataNasc] = useState("");
  const [notificacao, setNotificacao] = useState("");
  const [cadastroJaExiste, setCadastroJaExiste] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function limparCamposBuscaAlternativa() {
    setCnsAlt("");
    setErroCns("");
    setNomeCompletoAlt("");
    setNomeMaeAlt("");
    setDataNascAlt("");
    setErroDados("");
    setErroNomeCompleto("");
    setErroNomeMae("");
    setErroDataNasc("");
  }

  async function pesquisarPorCpf() {
    setErroCpf("");
    setNotificacao("");
    setCadastroJaExiste(false);
    const dig = cpf.replace(/\D/g, "");
    if (dig.length !== 11) {
      setErroCpf("CPF inválido");
      return;
    }
    const err = validarCPF(cpf);
    if (err) {
      setErroCpf("CPF inválido");
      return;
    }
    setCarregando(true);
    try {
      const verificarRes = await fetch(
        `/api/gestante/verificar?cpf=${encodeURIComponent(dig)}`,
      );
      const verificarData = await verificarRes.json().catch(() => ({}));
      if (verificarRes.ok && verificarData.existe) {
        try {
          sessionStorage.setItem(
            "gestante_login_flash",
            "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
          );
        } catch {}
        router.push("/gestante/login");
        setCarregando(false);
        return;
      }
      if (!verificarRes.ok) {
        setNotificacao(
          verificarData.erro ?? "Erro ao verificar cadastro. Tente novamente.",
        );
        setCarregando(false);
        return;
      }
      const res = await fetch(`/api/cns/buscar?cpf=${encodeURIComponent(dig)}`);
      const data = await res.json().catch(() => ({}));
      if (isFontesIndisponiveis(data)) {
        setNotificacao(
          data?.mensagem ??
            "No momento, não foi possível acessar o e-SUS PEC e o CadWeb. Tente novamente em alguns minutos.",
        );
        setBuscaAlternativa("cns");
        setCarregando(false);
        return;
      }
      if (!res.ok) {
        setNotificacao(
          data?.mensagem ??
            "Erro ao consultar a base federal. Tente novamente.",
        );
        setBuscaAlternativa("cns");
        setCarregando(false);
        return;
      }
      const paciente = data?.paciente;
      const cpfDefinitivo =
        paciente?.cpf != null ? String(paciente.cpf).replace(/\D/g, "") : "";
      const cnsDefinitivo =
        paciente?.cns != null ? String(paciente.cns).replace(/\D/g, "") : "";
      const temPacienteValido =
        data?.sucesso &&
        paciente &&
        typeof paciente === "object" &&
        (cpfDefinitivo.length === 11 || cnsDefinitivo.length === 15);
      if (temPacienteValido) {
        try {
          sessionStorage.setItem(
            "cnsPaciente",
            JSON.stringify(data.paciente ?? data.citizen),
          );
        } catch {}
        router.push("/gestante/cadastrar?fromCns=1");
        setCarregando(false);
        return;
      }
      setNotificacao(
        "Cidadão(ã) não localizado(a) no e-SUS PEC nem no CadSUS pelo CPF. Use a busca alternativa abaixo.",
      );
      setBuscaAlternativa("cns");
    } catch {
      setNotificacao(
        "Cidadão(ã) não localizado(a) no e-SUS PEC nem no CadSUS pelo CPF. Use a busca alternativa abaixo.",
      );
      setBuscaAlternativa("cns");
    }
    setCarregando(false);
  }

  async function pesquisarAlternativaCns() {
    setErroCns("");
    setNotificacao("");
    setCadastroJaExiste(false);
    const dig = cnsAlt.replace(/\D/g, "");
    if (!dig) {
      setErroCns("CNS é obrigatório");
      return;
    }
    if (dig.length !== 15) {
      setErroCns("CNS inválido");
      return;
    }
    const err = validarCNS(cnsAlt);
    if (err) {
      setErroCns("CNS inválido");
      return;
    }
    setCarregando(true);
    try {
      const verificarRes = await fetch(
        `/api/gestante/verificar?cns=${encodeURIComponent(dig)}`,
      );
      const verificarData = await verificarRes.json().catch(() => ({}));
      if (verificarData.existe) {
        try {
          sessionStorage.setItem(
            "gestante_login_flash",
            "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
          );
        } catch {}
        router.push("/gestante/login");
        setCarregando(false);
        return;
      }

      // Primeiro localiza na base federal; depois verifica se já existe usuário
      // no portal também pelo CPF retornado (caso o cadastro local esteja
      // associado ao CPF e o campo de CNS esteja vazio).
      const res = await fetch(`/api/cns/buscar?cns=${encodeURIComponent(dig)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotificacao(
          data?.mensagem ??
            "Erro ao consultar as bases. Tente novamente.",
        );
        setBuscaAlternativa("cns");
        setCarregando(false);
        return;
      }
      if (isFontesIndisponiveis(data)) {
        setNotificacao(
          data?.mensagem ??
            "No momento, não foi possível acessar o e-SUS PEC e o CadWeb. Tente novamente em alguns minutos.",
        );
        setBuscaAlternativa("cns");
        setCarregando(false);
        return;
      }
      if (data?.sucesso && data?.paciente) {
        const payload = data.paciente ?? data.citizen;
        try {
          sessionStorage.setItem("cnsPaciente", JSON.stringify(payload));
        } catch {}

        const cpfEncontrado =
          payload?.cpf != null
            ? String(payload.cpf).replace(/\D/g, "").slice(0, 11)
            : "";
        const cnsEncontrado =
          payload?.cns != null
            ? String(payload.cns).replace(/\D/g, "").slice(0, 15)
            : "";

        // Se não houver identificador completo, não desabilite CPF/CNS.
        if (cpfEncontrado.length !== 11 && cnsEncontrado.length !== 15) {
          router.push("/gestante/cadastrar");
          setCarregando(false);
          return;
        }

        // Verifica existência no portal (primeiro por CPF; se não tiver, por CNS).
        if (cpfEncontrado.length === 11) {
          const verificarCpfRes = await fetch(
            `/api/gestante/verificar?cpf=${encodeURIComponent(cpfEncontrado)}`,
          );
          const verificarCpfData = await verificarCpfRes
            .json()
            .catch(() => ({}));
          if (verificarCpfData?.existe) {
            try {
              sessionStorage.setItem(
                "gestante_login_flash",
                "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
              );
            } catch {}
            router.push("/gestante/login");
            setCarregando(false);
            return;
          }
        } else if (cnsEncontrado.length === 15) {
          const verificarCnsRes = await fetch(
            `/api/gestante/verificar?cns=${encodeURIComponent(cnsEncontrado)}`,
          );
          const verificarCnsData = await verificarCnsRes
            .json()
            .catch(() => ({}));
          if (verificarCnsData?.existe) {
            try {
              sessionStorage.setItem(
                "gestante_login_flash",
                "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
              );
            } catch {}
            router.push("/gestante/login");
            setCarregando(false);
            return;
          }
        }

        router.push("/gestante/cadastrar?fromCns=1");
        setCarregando(false);
        return;
      }
      // CNS não localizado no e-SUS nem no CadWeb: cadastro manual (não abrir busca por dados).
      try {
        sessionStorage.setItem(
          "dadosPacienteBuscaAlt",
          JSON.stringify({ cns: dig }),
        );
      } catch {}
      router.push("/gestante/cadastrar?fromDados=1&naoEncontrado=1");
      setCarregando(false);
      return;
    } catch {
      setNotificacao(
        "Não foi possível concluir a busca por CNS neste momento. Tente novamente.",
      );
      setBuscaAlternativa("cns");
    }
    setCarregando(false);
  }

  async function pesquisarAlternativaDados() {
    setErroDados("");
    setErroNomeCompleto("");
    setErroNomeMae("");
    setErroDataNasc("");
    setNotificacao("");
    setCadastroJaExiste(false);
    let hasError = false;
    if (!nomeCompletoAlt.trim()) {
      setErroNomeCompleto("É necessário preencher o Nome Completo");
      hasError = true;
    } else if (!validarNome(nomeCompletoAlt)) {
      setErroNomeCompleto("Existem caracteres inválidos");
      hasError = true;
    }
    if (nomeMaeAlt.trim() && !validarNome(nomeMaeAlt)) {
      setErroNomeMae("Existem caracteres inválidos");
      hasError = true;
    }
    if (!nomeMaeAlt.trim() && !dataNascAlt.trim()) {
      setErroNomeMae(
        "É necessário preencher Nome da Mãe e/ou Data de Nascimento",
      );
      hasError = true;
    }
    const hoje = new Date().toISOString().slice(0, 10);
    if (dataNascAlt && dataNascAlt >= hoje) {
      setErroDataNasc("Data inválida");
      hasError = true;
    }
    if (hasError) return;
    setCarregando(true);
    try {
      // 1) Buscar na base federal (PEC/e-SUS) primeiro para pré-preencher os dados.
      const nome = nomeCompletoAlt.trim();
      const nomeMae = nomeMaeAlt.trim();
      const dataNascimento = dataNascAlt.trim();

      const qs = new URLSearchParams({
        nome,
        nomeMae: nomeMae || "",
        dataNascimento: dataNascimento || "",
      });

      const buscaRes = await fetch(
        `/api/cns/buscar-por-dados?${qs.toString()}`,
      );
      const buscaData = await buscaRes.json().catch(() => ({}));
      if (isFontesIndisponiveis(buscaData)) {
        setNotificacao(
          buscaData?.mensagem ??
            "No momento, não foi possível acessar o e-SUS PEC e o CadWeb. Tente novamente em alguns minutos.",
        );
        setBuscaAlternativa("dados");
        setCarregando(false);
        return;
      }

      if (buscaRes.ok && buscaData?.sucesso && buscaData?.citizen) {
        const citizen = buscaData.citizen as {
          cpf?: string | null;
          cns?: string | null;
        };

        const cpfEncontrado = citizen?.cpf
          ? String(citizen.cpf).replace(/\D/g, "").slice(0, 11)
          : "";
        const cnsEncontrado = citizen?.cns
          ? String(citizen.cns).replace(/\D/g, "").slice(0, 15)
          : "";

        // `fromCns=1` desabilita edição de CPF/CNS; então só usamos quando
        // retornou ao menos um identificador válido.
        if (cpfEncontrado.length !== 11 && cnsEncontrado.length !== 15) {
          try {
            sessionStorage.setItem(
              "dadosPacienteBuscaAlt",
              JSON.stringify({
                nomeCompleto: nomeCompletoAlt.trim(),
                nomeMae: nomeMaeAlt.trim() || undefined,
                dataNascimento: dataNascAlt.trim() || undefined,
              }),
            );
          } catch {}
          router.push("/gestante/cadastrar?fromDados=1");
          setCarregando(false);
          return;
        }

        // 2) Se já existir usuário local (por CPF/CNS), direciona para login.
        if (cpfEncontrado.length === 11) {
          const verificarCpfRes = await fetch(
            `/api/gestante/verificar?cpf=${encodeURIComponent(cpfEncontrado)}`,
          );
          const verificarCpfData = await verificarCpfRes
            .json()
            .catch(() => ({}));
          if (verificarCpfData?.existe) {
            try {
              sessionStorage.setItem(
                "gestante_login_flash",
                "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
              );
            } catch {}
            router.push("/gestante/login");
            setCarregando(false);
            return;
          }
        } else if (cnsEncontrado.length === 15) {
          const verificarCnsRes = await fetch(
            `/api/gestante/verificar?cns=${encodeURIComponent(cnsEncontrado)}`,
          );
          const verificarCnsData = await verificarCnsRes
            .json()
            .catch(() => ({}));
          if (verificarCnsData?.existe) {
            try {
              sessionStorage.setItem(
                "gestante_login_flash",
                "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
              );
            } catch {}
            router.push("/gestante/login");
            setCarregando(false);
            return;
          }
        }

        // 3) Caso não exista no portal, encaminha para o cadastro pré-preenchido.
        try {
          sessionStorage.setItem("cnsPaciente", JSON.stringify(citizen));
        } catch {}
        router.push("/gestante/cadastrar?fromCns=1");
        setCarregando(false);
        return;
      }

      // 4) Fallback: busca local para evitar duplicidade e, se não existir, cadastra manualmente
      // com os dados fornecidos no formulário.
      const verificarRes = await fetch("/api/gestante/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCompleto: nomeCompletoAlt.trim(),
          nomeMae: nomeMaeAlt.trim() || undefined,
          dataNascimento: dataNascAlt.trim() || undefined,
        }),
      });
      const verificarData = await verificarRes.json().catch(() => ({}));
      if (verificarData.existe) {
        try {
          sessionStorage.setItem(
            "gestante_login_flash",
            "Já existe um usuário com o CPF/CNS informado. Acesse sua conta",
          );
        } catch {}
        router.push("/gestante/login");
      } else {
        try {
          sessionStorage.setItem(
            "dadosPacienteBuscaAlt",
            JSON.stringify({
              nomeCompleto: nomeCompletoAlt.trim(),
              nomeMae: nomeMaeAlt.trim() || undefined,
              dataNascimento: dataNascAlt.trim() || undefined,
            }),
          );
        } catch {}
        router.push("/gestante/cadastrar?fromDados=1&naoEncontrado=1");
      }
    } catch {
      setNotificacao(
        "Não foi possível concluir a busca neste momento. Tente novamente.",
      );
      setBuscaAlternativa("dados");
    }
    setCarregando(false);
  }

  const mostrarBuscaAlternativa = naoPossui || notificacao;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pesquisa do(a) Cidadão(ã)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe o CPF para localizar o(a) cidadão(ã).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificacao && (
              <div
                role="alert"
                className={`rounded-md border px-3 py-2.5 text-sm flex gap-3 ${
                  cadastroJaExiste
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }`}
              >
                {cadastroJaExiste && (
                  <Info
                    className="h-4 w-4 shrink-0 text-primary mt-0.5"
                    aria-hidden
                  />
                )}
                <div className="min-w-0 space-y-2">
                  <p className="font-medium leading-snug">{notificacao}</p>
                  {cadastroJaExiste && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <Link
                        href="/gestante/login"
                        className="text-sm font-medium text-primary hover:underline underline-offset-2"
                      >
                        Fazer login
                      </Link>
                      <Link
                        href="/gestante/esqueceu-senha"
                        className="text-sm font-medium text-primary hover:underline underline-offset-2"
                      >
                        Esqueceu Senha?
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <div className="flex gap-2">
                <Input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="11 dígitos"
                  value={cpf}
                  onChange={(e) => {
                    setCpf(e.target.value.replace(/\D/g, "").slice(0, 11));
                    setErroCpf("");
                    setNotificacao("");
                    setCadastroJaExiste(false);
                  }}
                  className={erroCpf ? "border-destructive" : ""}
                  disabled={naoPossui}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={pesquisarPorCpf}
                  disabled={naoPossui || carregando}
                  title={carregando ? "Pesquisando…" : "Pesquisar"}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {erroCpf && <p className="text-sm text-destructive">{erroCpf}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="nao-possui"
                checked={naoPossui}
                onChange={(e) => {
                  setNaoPossui(e.target.checked);
                  if (e.target.checked) {
                    limparCamposBuscaAlternativa();
                    setBuscaAlternativa("cns");
                    setNotificacao("");
                  } else {
                    limparCamposBuscaAlternativa();
                    setBuscaAlternativa("");
                  }
                }}
                className="rounded border-input"
              />
              <Label
                htmlFor="nao-possui"
                className="cursor-pointer text-sm font-normal"
              >
                não sabe/não possui (CPF)
              </Label>
            </div>

            {mostrarBuscaAlternativa && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <p className="text-sm font-medium">Busca alternativa</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="alt"
                      checked={buscaAlternativa === "cns"}
                      onChange={() => {
                        limparCamposBuscaAlternativa();
                        setBuscaAlternativa("cns");
                      }}
                      className="rounded-full"
                    />
                    <span className="text-sm">Cartão Nacional de Saúde</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="alt"
                      checked={buscaAlternativa === "dados"}
                      onChange={() => {
                        limparCamposBuscaAlternativa();
                        setBuscaAlternativa("dados");
                      }}
                      className="rounded-full"
                    />
                    <span className="text-sm">Dados do(a) Cidadão(ã)</span>
                  </label>
                </div>

                {buscaAlternativa === "cns" && (
                  <div className="space-y-2">
                    <Label htmlFor="cns-alt">CNS</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cns-alt"
                        type="text"
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="15 dígitos"
                        value={cnsAlt}
                        onChange={(e) => {
                          setCnsAlt(
                            e.target.value.replace(/\D/g, "").slice(0, 15),
                          );
                          setErroCns("");
                        }}
                        className={erroCns ? "border-destructive" : ""}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={pesquisarAlternativaCns}
                        disabled={carregando}
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    {erroCns && (
                      <p className="text-sm text-destructive">{erroCns}</p>
                    )}
                  </div>
                )}

                {buscaAlternativa === "dados" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="nome-alt">Nome Completo</Label>
                      <Input
                        id="nome-alt"
                        maxLength={70}
                        placeholder="Até 70 caracteres"
                        value={nomeCompletoAlt}
                        onChange={(e) => {
                          const v = e.target.value
                            .replace(/\s{2,}/g, " ")
                            .slice(0, 70);
                          setNomeCompletoAlt(v);
                          setErroNomeCompleto("");
                        }}
                        className={erroNomeCompleto ? "border-destructive" : ""}
                      />
                      {erroNomeCompleto && (
                        <p className="text-sm text-destructive">
                          {erroNomeCompleto}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mae-alt">Nome da Mãe</Label>
                      <Input
                        id="mae-alt"
                        maxLength={70}
                        placeholder="Até 70 caracteres"
                        value={nomeMaeAlt}
                        onChange={(e) => {
                          const v = e.target.value
                            .replace(/\s{2,}/g, " ")
                            .slice(0, 70);
                          setNomeMaeAlt(v);
                          setErroNomeMae("");
                        }}
                        className={erroNomeMae ? "border-destructive" : ""}
                      />
                      {erroNomeMae && (
                        <p className="text-sm text-destructive">
                          {erroNomeMae}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nasc-alt">Data de Nascimento</Label>
                      <Input
                        id="nasc-alt"
                        type="date"
                        value={dataNascAlt}
                        onChange={(e) => {
                          setDataNascAlt(e.target.value);
                          setErroDataNasc("");
                        }}
                        className={erroDataNasc ? "border-destructive" : ""}
                      />
                      {erroDataNasc && (
                        <p className="text-sm text-destructive">
                          {erroDataNasc}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={pesquisarAlternativaDados}
                      className="w-full"
                      disabled={carregando}
                    >
                      {carregando ? "Pesquisando…" : "Pesquisar"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" className="w-full" asChild>
              <Link href="/gestante/login">Cancelar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
