import { Badge } from "@/components/ui/badge";

const ETAPAS = [
  { num: 1, titulo: "Dados Pessoais" },
  { num: 2, titulo: "Contatos e Endereço" },
  { num: 3, titulo: "Gestação e Perfil Social" },
  { num: 4, titulo: "Senha de Acesso" },
] as const;

interface StepHeaderProps {
  etapa: 1 | 2 | 3 | 4;
}

export function StepHeader({ etapa }: StepHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b">
      <p className="text-sm font-medium text-muted-foreground">
        {ETAPAS[etapa - 1].titulo}
      </p>
      <Badge variant="outline">
        Página {etapa} de 4
      </Badge>
    </div>
  );
}
