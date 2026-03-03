"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown, ChevronRight } from "lucide-react";

const ORIENTACOES: { grupo: string; itens: { label: string; href: string }[] }[] = [
  {
    grupo: "Seus Direitos e Informações",
    itens: [
      { label: "Conheça seus Direitos", href: "#" },
      { label: "Pré-natal do Parceiro", href: "#" },
    ],
  },
  {
    grupo: "A Gestação",
    itens: [
      { label: "A descoberta da gravidez", href: "#" },
      { label: "Os 3 primeiros meses de gestação", href: "#" },
      { label: "Como seu bebê está se formando?", href: "#" },
      { label: "Do 4º ao 6º mês", href: "#" },
      { label: "Do 7º ao 9º mês - hora de fazer o ninho", href: "#" },
    ],
  },
  {
    grupo: "Preparação para o Parto",
    itens: [
      { label: "Preparando para nascer", href: "#" },
      { label: "Prematuro", href: "#" },
      { label: "O parto está a cada dia mais perto", href: "#" },
      { label: "Seu útero já está se preparando para o parto", href: "#" },
      { label: "Trabalho de parto", href: "#" },
      { label: "O que você pode fazer para favorecer seu parto", href: "#" },
      { label: "Posições para o trabalho de parto e parto vaginal", href: "#" },
      { label: "Parto e nascimento", href: "#" },
      { label: "Medos e anseios sobre o parto", href: "#" },
    ],
  },
  {
    grupo: "Cuidados na Gravidez",
    itens: [
      { label: "Cuidados importantes na gravidez", href: "#" },
      { label: "Alimentação saudável e ganho de peso", href: "#" },
      { label: "Sexo na gestação", href: "#" },
      { label: "Atenção para situações e sintomas", href: "#" },
      { label: "Sinais de alerta - procure o serviço de saúde", href: "#" },
    ],
  },
  {
    grupo: "Pré-natal e Exames",
    itens: [
      { label: "Acompanhamento do pré-natal", href: "#" },
      { label: "Exames e vacinas do pré-natal", href: "#" },
    ],
  },
  {
    grupo: "Após o Nascimento",
    itens: [
      { label: "O primeiro encontro: o nascimento", href: "#" },
      { label: "Primeiros cuidados com o recém-nascido", href: "#" },
      { label: "Puerpério - você também precisa de cuidados", href: "#" },
      { label: "Contracepção", href: "#" },
      { label: "Consulta pós-parto", href: "#" },
    ],
  },
  {
    grupo: "Amamentação e Perda Gestacional",
    itens: [
      { label: "Amamentação", href: "#" },
      { label: "Vantagens da amamentação", href: "#" },
      { label: "Perda gestacional", href: "#" },
    ],
  },
];

/**
 * Página inicial do perfil Gestante (requisitos item 8).
 * Olá, Nome (ou Nome Social se principal); menu Orientações; SAIR.
 */
export default function GestanteHomePage() {
  const router = useRouter();
  const [nomeExibido, setNomeExibido] = useState<string>("");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("gestante");
      if (raw) {
        const g = JSON.parse(raw) as { nomeCompleto?: string; nomeSocial?: string; nomeSocialPrincipal?: boolean };
        const nome = g.nomeSocialPrincipal && g.nomeSocial?.trim()
          ? g.nomeSocial.trim()
          : (g.nomeCompleto?.trim() ?? "Gestante");
        setNomeExibido(nome);
        return;
      }
    } catch (_) {}
    setNomeExibido("Gestante");
  }, []);

  function handleSair() {
    try {
      sessionStorage.removeItem("gestante");
    } catch (_) {}
    router.push("/gestante/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              Olá, {nomeExibido || "…"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Programa Mãe Salvador — sua área de orientações
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Orientações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ORIENTACOES.map((bloco) => (
              <div key={bloco.grupo} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
                  onClick={() => setMenuAberto(menuAberto === bloco.grupo ? null : bloco.grupo)}
                >
                  {bloco.grupo}
                  {menuAberto === bloco.grupo ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                </button>
                {menuAberto === bloco.grupo && (
                  <ul className="border-t divide-y bg-background/80">
                    {bloco.itens.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="block px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={handleSair}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:underline text-white/80">
              Voltar ao perfil de acesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
