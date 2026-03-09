"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  ShieldCheck,
  Printer,
  Send,
  Upload,
  XCircle,
  Package,
  Building2,
  Check,
} from "lucide-react";
import { TRANSCARD_DISPONIVEIS } from "@mae-salvador/shared";
import type { TranscardVinculacao, Gestante, EtapaMaeSalvador } from "@mae-salvador/shared";

interface TranscardTabProps {
  gestante: Gestante;
  vinculacao: TranscardVinculacao | undefined;
  consultasRealizadas: number;
  testesRapidosFeitos: boolean;
  vacinasAtualizadas: boolean;
}

const ETAPA_LABELS: Record<EtapaMaeSalvador, { titulo: string; descricao: string }> = {
  1: {
    titulo: "1ª Etapa",
    descricao: "1ª consulta de pré-natal registrada",
  },
  2: {
    titulo: "2ª Etapa",
    descricao: "2+ consultas + testes rápidos ou sorologias realizados",
  },
  3: {
    titulo: "3ª Etapa",
    descricao: "4+ consultas + cartão vacinal atualizado",
  },
};

function SituacaoBadge({ situacao }: { situacao: TranscardVinculacao["situacao"] }) {
  const styles = {
    ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inconsistencia: "bg-amber-50 text-amber-700 border-amber-200",
    pendente: "bg-blue-50 text-blue-700 border-blue-200",
    recusado: "bg-red-50 text-red-700 border-red-200",
  };
  const labels = {
    ativo: "Ativo",
    inconsistencia: "Inconsistência",
    pendente: "Pendente",
    recusado: "Recusado",
  };
  return (
    <Badge variant="outline" className={`text-xs ${styles[situacao]}`}>
      {labels[situacao]}
    </Badge>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function TranscardTab({
  gestante,
  vinculacao,
  consultasRealizadas,
  testesRapidosFeitos,
  vacinasAtualizadas,
}: TranscardTabProps) {
  const [selectedTranscard, setSelectedTranscard] = useState("");
  const [recusouTranscard, setRecusouTranscard] = useState(vinculacao?.recusouTranscard ?? false);
  const [recusouKitEnxoval, setRecusouKitEnxoval] = useState(vinculacao?.recusouKitEnxoval ?? false);
  const [encaminhadaCras, setEncaminhadaCras] = useState(vinculacao?.encaminhadaCras ?? false);
  const [lgpdSent, setLgpdSent] = useState(false);
  const [vinculacaoSalva, setVinculacaoSalva] = useState(false);

  const disponveis = TRANSCARD_DISPONIVEIS[gestante.ubsId] ?? [];

  // Compute etapas progress
  const etapa1 = consultasRealizadas >= 1;
  const etapa2 = consultasRealizadas >= 2 && testesRapidosFeitos;
  const etapa3 = consultasRealizadas >= 4 && vacinasAtualizadas;

  const hasExistingVinculacao = !!vinculacao;

  function handleVincular() {
    setVinculacaoSalva(true);
    setTimeout(() => setVinculacaoSalva(false), 3000);
  }

  function handleSendLgpd() {
    setLgpdSent(true);
    setTimeout(() => setLgpdSent(false), 3000);
  }

  return (
    <div className="space-y-4">
      {/* Existing vinculação or new */}
      {hasExistingVinculacao ? (
        <>
          {/* Current Transcard status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Cartão Transcard
                </CardTitle>
                <SituacaoBadge situacao={vinculacao.situacao} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Nº Transcard</p>
                  <p className="font-mono font-semibold">{vinculacao.numeroTranscard}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">CPF Vinculado</p>
                  <p className="font-mono">{vinculacao.cpf}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data de Vinculação</p>
                  <p>{fmt(vinculacao.dataVinculacao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Consentimento LGPD</p>
                  <Badge
                    variant="outline"
                    className={`text-xs mt-0.5 ${
                      vinculacao.lgpdConsentimento === "pendente"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {vinculacao.lgpdConsentimento === "assinado-digital"
                      ? "Assinado (digital)"
                      : vinculacao.lgpdConsentimento === "assinado-fisico"
                        ? "Assinado (físico)"
                        : "Pendente"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Etapas do Mãe Salvador */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Etapas do Programa Mãe Salvador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([1, 2, 3] as EtapaMaeSalvador[]).map((etapa) => {
                  const completed =
                    etapa === 1 ? etapa1 : etapa === 2 ? etapa2 : etapa3;
                  const isCurrent = vinculacao.etapaAtual === etapa;
                  return (
                    <div
                      key={etapa}
                      className={`rounded-lg border p-3 transition-colors ${
                        completed
                          ? "bg-emerald-50/70 border-emerald-200"
                          : isCurrent
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/30 border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold">
                          {ETAPA_LABELS[etapa].titulo}
                        </p>
                        {completed && (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {ETAPA_LABELS[etapa].descricao}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* LGPD consent actions (if pending) */}
          {vinculacao.lgpdConsentimento === "pendente" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Termo LGPD — Consentimento Pendente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  A gestante precisa assinar o termo de liberação de dados LGPD para ativação do
                  Transcard.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendLgpd}
                    disabled={lgpdSent}
                  >
                    {lgpdSent ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Link enviado!
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Enviar link via WhatsApp / App
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Imprimir termo para assinatura
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">Upload do termo assinado fisicamente</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf,.jpg,.png" className="text-xs" />
                    <Button size="sm" variant="secondary">
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions / Flags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ações e Sinalizações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRecusouTranscard(!recusouTranscard)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    recusouTranscard
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Recusou Transcard
                </button>
                <button
                  type="button"
                  onClick={() => setRecusouKitEnxoval(!recusouKitEnxoval)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    recusouKitEnxoval
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Recusou Kit Enxoval
                </button>
                <button
                  type="button"
                  onClick={() => setEncaminhadaCras(!encaminhadaCras)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    encaminhadaCras
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Encaminhada ao CRAS
                </button>
              </div>
              {encaminhadaCras && vinculacao.dataEncaminhamentoCras && (
                <p className="text-xs text-muted-foreground">
                  Encaminhada em {fmt(vinculacao.dataEncaminhamentoCras)}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* New vinculação form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Vincular Transcard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Selecione um número de Transcard disponível para vincular ao CPF da gestante.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">CPF da Gestante</Label>
                  <Input value={gestante.cpf} disabled className="font-mono bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Nº Transcard Disponível</Label>
                  <Select
                    value={selectedTranscard}
                    onValueChange={setSelectedTranscard}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {disponveis.length > 0 ? (
                        disponveis.map((num) => (
                          <SelectItem key={num} value={num}>
                            {num}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>
                          Nenhum cartão disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-medium">Termo de Consentimento LGPD</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendLgpd}
                    disabled={lgpdSent}
                  >
                    {lgpdSent ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Link enviado!
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Enviar link via WhatsApp / App
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Imprimir termo
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Upload do termo assinado</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf,.jpg,.png" className="text-xs" />
                    <Button size="sm" variant="secondary">
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRecusouTranscard(!recusouTranscard)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    recusouTranscard
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Gestante recusou Transcard
                </button>
                <button
                  type="button"
                  onClick={() => setRecusouKitEnxoval(!recusouKitEnxoval)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    recusouKitEnxoval
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Recusou Kit Enxoval
                </button>
                <button
                  type="button"
                  onClick={() => setEncaminhadaCras(!encaminhadaCras)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    encaminhadaCras
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Encaminhar ao CRAS
                </button>
              </div>

              <div className="flex justify-end pt-2">
                {vinculacaoSalva ? (
                  <Button disabled className="bg-emerald-600">
                    <Check className="w-4 h-4 mr-1.5" />
                    Vinculação realizada!
                  </Button>
                ) : (
                  <Button
                    onClick={handleVincular}
                    disabled={!selectedTranscard && !recusouTranscard}
                  >
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    Vincular Transcard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {!gestante.cpf && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-amber-800">
                  <strong>Atenção:</strong> Esta gestante não possui CPF cadastrado.
                  Encaminhe ao CRAS para obter o documento antes de vincular o Transcard.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
