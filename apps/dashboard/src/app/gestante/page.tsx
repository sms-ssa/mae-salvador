"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown, ChevronRight, Menu } from "lucide-react";

const ORIENTACOES: { grupo: string; itens: { label: string; href: string }[] }[] = [
  {
    grupo: "Seus direitos",
    itens: [
      { label: "Conheça seus Direitos", href: "#" },
      { label: "Pré-natal do Parceiro", href: "#" },
    ],
  },
  {
    grupo: "Gestação",
    itens: [
      { label: "A descoberta da gravidez", href: "#" },
      { label: "Os 3 primeiros meses de gestação", href: "#" },
      { label: "Como seu bebê está se formando?", href: "#" },
      { label: "Do 4º ao 6º mês", href: "#" },
      { label: "Do 7º ao 9º mês - hora de fazer o ninho", href: "#" },
    ],
  },
  {
    grupo: "Preparação para parto",
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
    grupo: "Cuidados na gravidez",
    itens: [
      { label: "Cuidados importantes na gravidez", href: "#" },
      { label: "Alimentação saudável e ganho de peso", href: "#" },
      { label: "Sexo na gestação", href: "#" },
      { label: "Atenção para situações e sintomas", href: "#" },
      { label: "Sinais de alerta - procure o serviço de saúde", href: "#" },
    ],
  },
  {
    grupo: "Pré-natal e exames",
    itens: [
      { label: "Acompanhamento do pré-natal", href: "#" },
      { label: "Exames e vacinas do pré-natal", href: "#" },
    ],
  },
  {
    grupo: "Após nascimento",
    itens: [
      { label: "O primeiro encontro: o nascimento", href: "#" },
      { label: "Primeiros cuidados com o recém-nascido", href: "#" },
      { label: "Puerpério - você também precisa de cuidados", href: "#" },
      { label: "Contracepção", href: "#" },
      { label: "Consulta pós-parto", href: "#" },
    ],
  },
  {
    grupo: "Amamentação",
    itens: [
      { label: "Amamentação", href: "#" },
      { label: "Vantagens da amamentação", href: "#" },
      { label: "Perda gestacional", href: "#" },
    ],
  },
];

/**
 * Portal Gestante (doc): Olá Nome/Nome social; menu lateral Orientações (submenus); Sair.
 */
export default function GestanteHomePage() {
  const router = useRouter();
  const [nomeExibido, setNomeExibido] = useState<string>("");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("gestante");
      if (!raw) {
        router.replace("/gestante/login");
        return;
      }
      const g = JSON.parse(raw) as { nomeCompleto?: string; nomeSocial?: string; nomeSocialPrincipal?: boolean };
      const nome = g.nomeSocialPrincipal && g.nomeSocial?.trim()
        ? g.nomeSocial.trim()
        : (g.nomeCompleto?.trim() ?? "Gestante");
      setNomeExibido(nome);
    } catch (_) {
      router.replace("/gestante/login");
    }
    setCarregado(true);
  }, [router]);

  function handleSair() {
    try {
      sessionStorage.removeItem("gestante");
    } catch (_) {}
    router.push("/gestante/login");
  }

  if (!carregado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)]">
        <p className="text-white/80">Carregando…</p>
      </div>
    );
  }

  const sidebar = (
    <aside className="flex flex-col w-full sm:w-64 sm:flex-shrink-0 h-full bg-white/95 backdrop-blur shadow-xl border-r border-white/20">
      <div className="p-4 border-b border-muted/50">
        <h2 className="font-semibold text-lg text-foreground">Orientações</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {ORIENTACOES.map((bloco) => (
          <div key={bloco.grupo} className="border-b border-muted/30 last:border-0">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
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
              <ul className="bg-muted/20 pb-2">
                {bloco.itens.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="block px-4 py-2 pl-6 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-muted/50">
        <Button variant="outline" className="w-full" onClick={handleSair}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
        <p className="mt-2 text-center">
          <Link href="/login" className="text-xs text-muted-foreground hover:underline">
            Voltar ao perfil de acesso
          </Link>
        </p>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] flex flex-col sm:flex-row">
      {/* Botão abrir menu no mobile */}
      <div className="sm:hidden fixed top-4 left-4 z-20">
        <Button
          variant="secondary"
          size="icon"
          className="bg-white/90 shadow-md"
          onClick={() => setSidebarAberta((b) => !b)}
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Overlay mobile quando sidebar aberta */}
      {sidebarAberta && (
        <button
          type="button"
          className="sm:hidden fixed inset-0 bg-black/40 z-10"
          onClick={() => setSidebarAberta(false)}
          aria-label="Fechar menu"
        />
      )}

      {/* Menu lateral (doc: "Menu lateral") */}
      <div
        className={`
          fixed sm:relative inset-y-0 left-0 z-20 transform transition-transform duration-200 ease-out
          ${sidebarAberta ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
        `}
      >
        {sidebar}
      </div>

      {/* Área principal: Olá, Nome */}
      <main className="flex-1 flex items-start justify-center p-4 pt-16 sm:pt-8 min-h-screen">
        <div className="w-full max-w-xl mt-8 sm:mt-16">
          <div className="bg-white/95 backdrop-blur shadow-2xl rounded-xl border-0 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Olá, {nomeExibido || "…"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Programa Mãe Salvador — sua área de orientações
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
