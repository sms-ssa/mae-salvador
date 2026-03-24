"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Alteração de Senha (requisitos item 7).
 * Pergunta com dados chave, até 3 tentativas, depois campos nova senha.
 */
export default function GestanteEsqueceuSenhaPage() {
  const router = useRouter();
  const [cpfCns, setCpfCns] = useState("");
  const [etapa, setEtapa] = useState<"cpf" | "pergunta" | "senha">("cpf");
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState<{ id: string; texto: string }[]>([]);
  const [token, setToken] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [notificacao, setNotificacao] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tentativasRestantes, setTentativasRestantes] = useState<number>(3);

  async function handleBuscarPergunta() {
    setNotificacao("");
    const dig = cpfCns.replace(/\D/g, "");
    if (dig.length !== 11 && dig.length !== 15) {
      setNotificacao("Informe CPF (11 dígitos) ou CNS (15 dígitos).");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch(`/api/gestante/esqueceu-senha?cpfCns=${encodeURIComponent(dig)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotificacao(data.erro ?? "Erro ao carregar pergunta.");
        setCarregando(false);
        return;
      }
      setPergunta(data.pergunta ?? "");
      setOpcoes(data.opcoes ?? []);
      setTentativasRestantes(
        typeof data.tentativasRestantes === "number"
          ? data.tentativasRestantes
          : 3,
      );
      setEtapa("pergunta");
    } catch (_) {
      setNotificacao("Erro de conexão.");
    }
    setCarregando(false);
  }

  async function handleResponder(opcaoId: string) {
    setNotificacao("");
    const dig = cpfCns.replace(/\D/g, "");
    setCarregando(true);
    try {
      const res = await fetch("/api/gestante/esqueceu-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: "verificar", cpfCns: dig, opcaoId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.token) {
        setToken(data.token);
        setEtapa("senha");
      } else {
        setNotificacao(data.erro ?? "Resposta incorreta. Tente novamente.");
        if (typeof data.tentativasRestantes === "number") {
          setTentativasRestantes(data.tentativasRestantes);
        }
        if (data.erro?.includes("Limite")) {
          setEtapa("cpf");
        } else if (data.proximaPergunta && data.pergunta && data.opcoes) {
          setPergunta(data.pergunta);
          setOpcoes(data.opcoes);
        }
      }
    } catch (_) {
      setNotificacao("Erro de conexão.");
    }
    setCarregando(false);
  }

  async function handleRedefinir() {
    setErroSenha("");
    if (novaSenha.length < 6 || novaSenha.length > 15) {
      setErroSenha("A senha deve ter o mínimo de 6 e máximo de 15 caracteres");
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setErroSenha("As senhas não coincidem");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch("/api/gestante/esqueceu-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapa: "redefinir",
          token,
          novaSenha,
          confirmaSenha,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setNotificacao("Senha alterada com sucesso! Redirecionando para o login…");
        setTimeout(() => router.push("/gestante/login"), 1500);
      } else {
        setErroSenha(data.erro ?? "Erro ao redefinir senha.");
      }
    } catch (_) {
      setErroSenha("Erro de conexão.");
    }
    setCarregando(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Alteração de Senha</CardTitle>
            <p className="text-sm text-muted-foreground">
              {etapa === "cpf" && "Informe seu CPF ou CNS para receber uma pergunta de segurança."}
              {etapa === "pergunta" &&
                `Responda à pergunta abaixo (${tentativasRestantes} tentativa(s) restante(s)).`}
              {etapa === "senha" && "Crie uma nova senha (6 a 15 caracteres)."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificacao && (
              <div
                className={`rounded-md px-3 py-2 text-sm ${
                  notificacao.includes("sucesso") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-destructive/10 text-destructive border border-destructive/30"
                }`}
              >
                {notificacao}
              </div>
            )}

            {etapa === "cpf" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cpf-cns">CPF ou CNS</Label>
                  <Input
                    id="cpf-cns"
                    type="text"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="11 ou 15 dígitos"
                    value={cpfCns}
                    onChange={(e) => setCpfCns(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  />
                </div>
                <Button className="w-full" onClick={handleBuscarPergunta} disabled={carregando}>
                  {carregando ? "Carregando…" : "Continuar"}
                </Button>
              </>
            )}

            {etapa === "pergunta" && (
              <>
                <p className="font-medium">{pergunta}</p>
                <div className="space-y-2">
                  {opcoes.map((op) => (
                    <Button
                      key={op.id}
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleResponder(op.id)}
                      disabled={carregando}
                    >
                      {op.texto}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" className="w-full" onClick={() => { setEtapa("cpf"); setNotificacao(""); }}>
                  Voltar e informar outro CPF/CNS
                </Button>
              </>
            )}

            {etapa === "senha" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nova-senha">Nova senha</Label>
                  <Input
                    id="nova-senha"
                    type="password"
                    maxLength={15}
                    placeholder="6 a 15 caracteres"
                    value={novaSenha}
                    onChange={(e) => { setNovaSenha(e.target.value.slice(0, 15)); setErroSenha(""); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirma-senha">Confirme a senha</Label>
                  <Input
                    id="confirma-senha"
                    type="password"
                    maxLength={15}
                    placeholder="Repita a senha"
                    value={confirmaSenha}
                    onChange={(e) => { setConfirmaSenha(e.target.value.slice(0, 15)); setErroSenha(""); }}
                  />
                </div>
                {erroSenha && <p className="text-sm text-destructive">{erroSenha}</p>}
                <Button className="w-full" onClick={handleRedefinir} disabled={carregando}>
                  {carregando ? "Salvando…" : "Redefinir senha"}
                </Button>
              </>
            )}

            <div className="pt-2 border-t">
              <Link href="/gestante/login" className="text-sm text-primary hover:underline">
                ← Voltar ao login
              </Link>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="hover:underline">Perfil de acesso</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
