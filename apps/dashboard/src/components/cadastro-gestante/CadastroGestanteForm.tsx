"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCadastroGestante } from "./hooks/useCadastroGestante";
import { StepHeader } from "./components/StepHeader";
import { StepNavigation } from "./components/StepNavigation";
import { ConfirmacaoCadastroDialog } from "./components/ConfirmacaoCadastroDialog";
import { StepDadosPessoais } from "./steps/StepDadosPessoais";
import { StepContatoEndereco } from "./steps/StepContatoEndereco";
import { StepGestacaoPerfil } from "./steps/StepGestacaoPerfil";
import { StepSenha } from "./steps/StepSenha";

/**
 * Formulário de cadastro de gestante em 4 etapas.
 * Controla apenas a etapa atual, renderiza steps e navegação.
 */
export function CadastroGestanteForm() {
  const {
    etapa,
    form,
    updateField,
    erros,
    errosStep1,
    loading,
    canSubmitStep1,
    canSubmitStep2,
    canSubmitStep3,
    canSubmitStep4,
    faltando,
    exigeConfirmacaoMunicipio,
    respostaMunicipioForaSalvador,
    setRespostaMunicipioForaSalvador,
    handleCancelarCadastroPorMunicipio,
    handleContinuar,
    handleVoltar,
    handleCancelar,
    handleSubmit,
    pesquisarCep,
    mostrarConfirmacao,
    confirmacaoData,
    confirmacaoCarregando,
    fecharConfirmacao,
    pacienteLocalizado,
    programasSociaisDisponiveis,
  } = useCadastroGestante();

  const canSubmit =
    (etapa === 1 && canSubmitStep1) ||
    (etapa === 2 && canSubmitStep2) ||
    (etapa === 3 && canSubmitStep3) ||
    (etapa === 4 && canSubmitStep4);

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
            <StepHeader etapa={etapa} />

            <form onSubmit={handleSubmit} className="space-y-6">
              {erros.notificacao && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {erros.notificacao}
                </p>
              )}
              {etapa === 1 && (
                <StepDadosPessoais
                  form={form}
                  updateField={updateField}
                  erros={errosStep1}
                  pacienteLocalizado={pacienteLocalizado}
                />
              )}
              {etapa === 2 && (
                <StepContatoEndereco
                  form={form}
                  updateField={updateField}
                  erroCep={erros.cep}
                  cepBuscando={loading.cepBuscando}
                  onPesquisarCep={pesquisarCep}
                  exibirCriticaMunicipio={exigeConfirmacaoMunicipio}
                  respostaMunicipioForaSalvador={respostaMunicipioForaSalvador}
                  onResponderCriticaMunicipio={setRespostaMunicipioForaSalvador}
                  onCancelarCadastroPorMunicipio={
                    handleCancelarCadastroPorMunicipio
                  }
                />
              )}
              {etapa === 3 && (
                <StepGestacaoPerfil
                  form={form}
                  updateField={updateField}
                  erroDum={erros.dum}
                  programasSociais={programasSociaisDisponiveis}
                />
              )}
              {etapa === 4 && (
                <StepSenha
                  form={form}
                  updateField={updateField}
                  erroSenha={erros.senha}
                />
              )}

              {erros.envio && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {erros.envio}
                </p>
              )}
              {!canSubmit && !loading.enviando && faltando.length > 0 && (
                <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  Para continuar, preencha: <strong>{faltando.join("; ")}</strong>
                </p>
              )}

              <StepNavigation
                etapa={etapa}
                canSubmitStep1={canSubmitStep1}
                canSubmitStep2={canSubmitStep2}
                canSubmitStep3={canSubmitStep3}
                canSubmitStep4={canSubmitStep4}
                enviando={loading.enviando}
                onVoltar={handleVoltar}
                onCancelar={handleCancelar}
                onContinuar={handleContinuar}
              />
            </form>
          </CardContent>
        </Card>
      </div>

      <ConfirmacaoCadastroDialog
        open={mostrarConfirmacao}
        confirmacaoData={confirmacaoData}
        loading={confirmacaoCarregando}
        onClose={() => fecharConfirmacao(false)}
        onAcessar={() => fecharConfirmacao(true)}
      />
    </div>
  );
}
