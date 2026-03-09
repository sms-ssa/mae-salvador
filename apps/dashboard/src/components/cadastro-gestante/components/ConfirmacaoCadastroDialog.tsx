import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConfirmacaoData } from "../hooks/useCadastroGestante";

interface ConfirmacaoCadastroDialogProps {
  open: boolean;
  confirmacaoData: ConfirmacaoData;
  loading: boolean;
  onClose: () => void;
  onAcessar: () => void;
}

export function ConfirmacaoCadastroDialog({
  open,
  confirmacaoData,
  loading,
  onClose,
  onAcessar,
}: ConfirmacaoCadastroDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Cadastro realizado!</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando informações...</p>
        ) : confirmacaoData?.tipo === "prenatal_existente" ? (
          <p className="text-sm text-muted-foreground">
            {confirmacaoData.mensagem ||
              (confirmacaoData.unidade
                ? `Existe pré-natal em andamento na unidade ${confirmacaoData.unidade}. Conclua o acompanhamento lá.`
                : "Existe pré-natal em andamento. Conclua o acompanhamento na unidade em que foi iniciado.")}
          </p>
        ) : confirmacaoData?.tipo === "unidades_proximas" && confirmacaoData.unidades.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Você pode acessar o sistema com seu CPF/CNS e a senha definida. Procure uma das unidades abaixo para iniciar seu pré-natal.
            </p>
            {confirmacaoData.distritoNome && (
              <p className="text-xs font-medium text-muted-foreground">
                Unidades no seu distrito ({confirmacaoData.distritoNome}):
              </p>
            )}
            <ul className="text-sm space-y-1 list-disc list-inside">
              {confirmacaoData.unidades.map((u, i) => (
                <li key={i}>
                  {u.nome}
                  {u.distanciaKm && u.distanciaKm !== "—" ? ` — ${u.distanciaKm} km` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você pode acessar o sistema com seu CPF/CNS e a senha definida. Procure a unidade de saúde para iniciar seu pré-natal.
          </p>
        )}
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
          <Button onClick={onAcessar}>
            Acessar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
