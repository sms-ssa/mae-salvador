"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validarCpfOuCns } from "@/lib/validacoes-login";

/**
 * Perfil de acesso Gestante (requisitos item 2).
 * Quadro "Gestante" com login ou criar conta.
 */
export default function GestanteLoginPage() {
  const router = useRouter();
  const [cpfCns, setCpfCns] = useState("");
  const [senha, setSenha] = useState("");
  const [erroCpfCns, setErroCpfCns] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [notificacao, setNotificacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Mensagem ao redirecionar da Pesquisa do Cidadão (já existe usuário com CPF/CNS)
  useEffect(() => {
    try {
      const flash = sessionStorage.getItem("gestante_login_flash");
      if (flash) {
        sessionStorage.removeItem("gestante_login_flash");
        setNotificacao(flash);
      }
    } catch (_) {}
  }, []);

  async function handleEntrar() {
    setErroCpfCns("");
    setErroSenha("");
    setNotificacao("");
    setCarregando(true);

    const cpfCnsTrim = cpfCns.trim();
    const senhaTrim = senha.trim();

    // CPF ou CNS obrigatório
    if (!cpfCnsTrim) {
      setErroCpfCns("CPF ou CNS é obrigatório");
      setCarregando(false);
      return;
    }

    const dig = cpfCnsTrim.replace(/\D/g, "");
    if (dig.length !== 11 && dig.length !== 15) {
      setErroCpfCns("CPF ou CNS inválido");
      setCarregando(false);
      return;
    }
    const errCpfCns = validarCpfOuCns(cpfCnsTrim);
    if (errCpfCns) {
      setErroCpfCns("CPF ou CNS inválido");
      setCarregando(false);
      return;
    }

    // Senha obrigatória
    if (!senhaTrim) {
      setErroSenha("Senha é obrigatória");
      setCarregando(false);
      return;
    }

    try {
      const res = await fetch("/api/gestante/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpfCns: dig, senha: senhaTrim }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotificacao(data.erro ?? "Erro ao entrar. Tente novamente.");
        setCarregando(false);
        return;
      }
      if (data.ok && data.gestante) {
        try {
          sessionStorage.setItem("gestante", JSON.stringify(data.gestante));
        } catch (_) {}
        router.push("/gestante");
        return;
      }
      setNotificacao("Erro ao entrar. Tente novamente.");
    } catch (_) {
      setNotificacao("Erro de conexão. Tente novamente.");
    }
    setCarregando(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 ring-1 ring-white/10">
            <Image
              src="/prefeitura_salvador.jpg"
              alt="Prefeitura de Salvador"
              width={80}
              height={80}
              className="rounded-xl object-cover"
            />
          </div>
          <p className="text-sm text-white/70">Programa Mãe Salvador</p>
          <p className="text-sm text-white/50 mt-1">
            SMS &mdash; Caderneta Digital
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur shadow-2xl shadow-black/20 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Gestante</CardTitle>
            <p className="text-sm text-muted-foreground">
              Faça login ou crie uma conta para acessar
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificacao && (
              <div
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {notificacao}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cpf-cns">CPF ou CNS</Label>
              <Input
                id="cpf-cns"
                type="text"
                inputMode="numeric"
                maxLength={15}
                placeholder="11 ou 15 dígitos"
                value={cpfCns}
                onChange={(e) => {
                  setCpfCns(e.target.value.replace(/\D/g, "").slice(0, 15));
                  setErroCpfCns("");
                }}
                className={erroCpfCns ? "border-destructive" : ""}
                aria-invalid={!!erroCpfCns}
                aria-describedby={erroCpfCns ? "erro-cpf-cns" : undefined}
              />
              {erroCpfCns && (
                <p id="erro-cpf-cns" className="text-sm text-destructive">
                  {erroCpfCns}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                maxLength={15}
                placeholder="Até 15 caracteres"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value.slice(0, 15));
                  setErroSenha("");
                }}
                className={erroSenha ? "border-destructive" : ""}
                aria-invalid={!!erroSenha}
                aria-describedby={erroSenha ? "erro-senha" : undefined}
              />
              {erroSenha && (
                <p id="erro-senha" className="text-sm text-destructive">
                  {erroSenha}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/gestante/esqueceu-senha"
                className="text-sm text-primary hover:underline"
              >
                Esqueceu Senha?
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/gestante/pesquisa-cidadao")}
              >
                Criar conta
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleEntrar}
                disabled={carregando}
              >
                {carregando ? "Entrando…" : "Entrar"}
              </Button>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Voltar ao perfil de acesso
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
