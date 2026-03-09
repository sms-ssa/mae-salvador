import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StepNavigationProps {
  etapa: 1 | 2 | 3 | 4;
  canSubmitStep1: boolean;
  canSubmitStep2: boolean;
  canSubmitStep3: boolean;
  canSubmitStep4: boolean;
  enviando: boolean;
  onVoltar: () => void;
  onCancelar: () => void;
  onContinuar: () => void;
}

export function StepNavigation({
  etapa,
  canSubmitStep1,
  canSubmitStep2,
  canSubmitStep3,
  canSubmitStep4,
  enviando,
  onVoltar,
  onCancelar,
  onContinuar,
}: StepNavigationProps) {
  const continuarDisabled =
    etapa === 1 ? !canSubmitStep1 : etapa === 2 ? !canSubmitStep2 : !canSubmitStep3;

  return (
    <div className="flex flex-wrap gap-3 justify-between pt-2">
      <div className="flex gap-2">
        {etapa > 1 && (
          <Button type="button" variant="outline" onClick={onVoltar} size="lg">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancelar} size="lg">
          Cancelar
        </Button>
      </div>
      <div>
        {etapa < 4 ? (
          <Button
            type="button"
            onClick={onContinuar}
            disabled={continuarDisabled}
            size="lg"
          >
            Continuar
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!canSubmitStep4 || enviando}
            size="lg"
          >
            {enviando ? "Salvando…" : "Finalizar Cadastro"}
          </Button>
        )}
      </div>
    </div>
  );
}
