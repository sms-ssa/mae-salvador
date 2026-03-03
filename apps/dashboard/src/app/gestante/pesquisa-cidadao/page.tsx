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

/**
 * Pesquisa do(a) Cidadão(ã) (requisitos itens 3 e 4).
 * CPF → Pesquisar; "Não Possui" → busca alternativa (CNS ou Dados do Paciente).
 */
export default function PesquisaCidadaoPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [erroCpf, setErroCpf] = useState("");
  const [naoPossui, setNaoPossui] = useState(false);
  const [buscaAlternativa, setBuscaAlternativa] = useState<"cns" | "dados" | "">("");
  const [cnsAlt, setCnsAlt] = useState("");
  const [erroCns, setErroCns] = useState("");
  const [nomeCompletoAlt, setNomeCompletoAlt] = useState("");
  const [nomeMaeAlt, setNomeMaeAlt] = useState("");
  const [dataNascAlt, setDataNascAlt] = useState("");
  const [erroDados, setErroDados] = useState("");
  const [notificacao, setNotificacao] = useState("");
  const [cadastroJaExiste, setCadastroJaExiste] = useState(false);
  const [carregando, setCarregando] = useState(false);

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
      const verificarRes = await fetch(`/api/gestante/verificar?cpf=${encodeURIComponent(dig)}`);
      const verificarData = await verificarRes.json().catch(() => ({}));
      if (verificarRes.ok && verificarData.existe) {
        setCadastroJaExiste(true);
        setNotificacao("Cadastro já existe com este CPF. Faça login ou use Esqueceu Senha.");
        setCarregando(false);
        return;
      }
      if (!verificarRes.ok) {
        setNotificacao(verificarData.erro ?? "Erro ao verificar cadastro. Tente novamente.");
        setCarregando(false);
        return;
      }
      const res = await fetch(`/api/cns/buscar?cpf=${encodeURIComponent(dig)}`);
      const data = await res.json();
      if (data.sucesso && data.paciente) {
        try {
          sessionStorage.setItem("cnsPaciente", JSON.stringify(data.paciente));
        } catch (_) {}
        router.push("/gestante/cadastrar?fromCns=1");
        setCarregando(false);
        return;
      }
      setNotificacao("Cidadão(ã) não localizado(a) na base federal. Use a busca alternativa abaixo.");
      setBuscaAlternativa("dados");
    } catch (_) {
      router.push("/gestante/cadastrar");
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
      const verificarRes = await fetch(`/api/gestante/verificar?cns=${encodeURIComponent(dig)}`);
      const verificarData = await verificarRes.json().catch(() => ({}));
      if (verificarData.existe) {
        setCadastroJaExiste(true);
        setNotificacao("Cadastro já existe com este CNS. Faça login ou use Esqueceu Senha.");
      } else {
        router.push("/gestante/cadastrar");
      }
    } catch (_) {
      router.push("/gestante/cadastrar");
    }
    setCarregando(false);
  }

  async function pesquisarAlternativaDados() {
    setErroDados("");
    setNotificacao("");
    setCadastroJaExiste(false);
    if (!nomeCompletoAlt.trim()) {
      setErroDados("É necessário preencher o Nome Completo");
      return;
    }
    if (!validarNome(nomeCompletoAlt)) {
      setErroDados("Existem caracteres inválidos");
      return;
    }
    if (!nomeMaeAlt.trim() && !dataNascAlt.trim()) {
      setErroDados("É necessário preencher Nome da Mãe e/ou Data de Nascimento");
      return;
    }
    if (nomeMaeAlt.trim() && !validarNome(nomeMaeAlt)) {
      setErroDados("Existem caracteres inválidos");
      return;
    }
    const hoje = new Date().toISOString().slice(0, 10);
    if (dataNascAlt && dataNascAlt >= hoje) {
      setErroDados("Data inválida");
      return;
    }
    setCarregando(true);
    try {
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
        setCadastroJaExiste(true);
        setNotificacao("Cadastro já existe com estes dados. Faça login ou use Esqueceu Senha.");
      } else {
        router.push("/gestante/cadastrar");
      }
    } catch (_) {
      router.push("/gestante/cadastrar");
    }
    setCarregando(false);
  }

  function irParaCadastroManual() {
    router.push("/gestante/cadastrar");
  }

  const mostrarBuscaAlternativa = naoPossui || notificacao;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pesquisa do(a) Cidadão(ã)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe o CPF para localizar ou use a opção abaixo para cadastro manual.
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
                  <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
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
                    setBuscaAlternativa("dados");
                    setNotificacao("");
                  } else {
                    setBuscaAlternativa("");
                  }
                }}
                className="rounded border-input"
              />
              <Label htmlFor="nao-possui" className="cursor-pointer text-sm font-normal">
                Não Possui (CPF)
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
                      onChange={() => setBuscaAlternativa("cns")}
                      className="rounded-full"
                    />
                    <span className="text-sm">Cartão Nacional de Saúde</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="alt"
                      checked={buscaAlternativa === "dados"}
                      onChange={() => setBuscaAlternativa("dados")}
                      className="rounded-full"
                    />
                    <span className="text-sm">Dados do Paciente</span>
                  </label>
                </div>

                {buscaAlternativa === "cns" && (
                  <div className="space-y-2">
                    <Label htmlFor="cns-alt">CNS (15 dígitos)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cns-alt"
                        type="text"
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="15 dígitos"
                        value={cnsAlt}
                        onChange={(e) => {
                          setCnsAlt(e.target.value.replace(/\D/g, "").slice(0, 15));
                          setErroCns("");
                        }}
                        className={erroCns ? "border-destructive" : ""}
                      />
                      <Button type="button" size="icon" onClick={pesquisarAlternativaCns} disabled={carregando}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    {erroCns && <p className="text-sm text-destructive">{erroCns}</p>}
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
                          setNomeCompletoAlt(e.target.value.slice(0, 70));
                          setErroDados("");
                        }}
                        className={erroDados ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mae-alt">Nome da Mãe</Label>
                      <Input
                        id="mae-alt"
                        maxLength={70}
                        placeholder="Até 70 caracteres"
                        value={nomeMaeAlt}
                        onChange={(e) => {
                          setNomeMaeAlt(e.target.value.slice(0, 70));
                          setErroDados("");
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nasc-alt">Data de Nascimento</Label>
                      <Input
                        id="nasc-alt"
                        type="date"
                        value={dataNascAlt}
                        onChange={(e) => {
                          setDataNascAlt(e.target.value);
                          setErroDados("");
                        }}
                      />
                    </div>
                    {erroDados && <p className="text-sm text-destructive">{erroDados}</p>}
                    <Button type="button" onClick={pesquisarAlternativaDados} className="w-full" disabled={carregando}>
                      {carregando ? "Pesquisando…" : "Pesquisar"}
                    </Button>
                  </div>
                )}

                <Button type="button" variant="outline" className="w-full" onClick={irParaCadastroManual}>
                  Seguir para cadastro manual
                </Button>
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
