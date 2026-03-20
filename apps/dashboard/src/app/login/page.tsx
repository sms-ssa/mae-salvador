"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth, type Papel } from "@/lib/auth-context";
import { ClipboardList, BarChart3, UserCircle } from "lucide-react";

/** Perfis de acesso conforme documento de requisitos (item 1). */
const PERFIS: { tipo: "gestante" | "profissional" | "gestao"; label: string; desc: string; icon: React.ElementType }[] = [
  { tipo: "gestante", label: "Gestante", desc: "Acessar sua caderneta e acompanhamento", icon: UserCircle },
  { tipo: "profissional", label: "Profissional de Saúde", desc: "Acompanhamento pré-natal e gestão local", icon: ClipboardList },
  { tipo: "gestao", label: "Gestão", desc: "Distrito Sanitário e Nível Central", icon: BarChart3 },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  function handlePerfil(tipo: "gestante" | "profissional" | "gestao") {
    if (tipo === "gestante") {
      router.push("/gestante/login");
      return;
    }
    const papel: Papel = tipo === "gestao" ? "gestor" : "profissional";
    login(papel);
    router.push(tipo === "gestao" ? "/gestor" : "/painel");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_255)] via-[oklch(0.30_0.10_255)] to-[oklch(0.18_0.05_260)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-65 h-65 rounded-2xl bg-white/10 backdrop-blur-sm mb-5 ring-1 ring-white/10">
            <Image
              src="/prefeitura_salvador.jpg"
              alt="Prefeitura de Salvador"
              width={220}
              height={220}
              className="rounded-xl object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Programa Mãe Salvador
          </h1>
        </div>

        {/* Perfil de Acesso (requisitos: quadro "Perfil de Acesso") */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/20 p-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
          <h2 className="text-center font-semibold text-foreground mb-1">Perfil de Acesso</h2>
          <p className="text-sm text-muted-foreground text-center mb-5">
            Selecione o perfil de acesso para continuar
          </p>
          <div className="space-y-2.5">
            {PERFIS.map(({ tipo, label, desc, icon: Icon }) => (
              <button
                key={tipo}
                onClick={() => handlePerfil(tipo)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border bg-white hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 text-left group cursor-pointer"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          MVP &mdash; Demonstração &middot; v0.1
        </p>
      </div>
    </div>
  );
}
