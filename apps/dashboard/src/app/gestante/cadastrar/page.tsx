"use client";

import { Suspense } from "react";
import { CadastroGestanteForm } from "@/components/cadastro-gestante/CadastroGestanteForm";

/**
 * Cadastro da gestante no fluxo "Criar conta" (sem login).
 * Acessível após pesquisa-cidadao; não usa o layout (dashboard) que exige usuário logado.
 * Se veio com ?fromCns=1 e há dados em sessionStorage (cnsPaciente), o formulário pré-preenche.
 */
export default function CadastrarGestantePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center text-muted-foreground">Carregando...</div>}>
      <CadastroGestanteForm />
    </Suspense>
  );
}
