"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormCadastroGestante } from "../validators/validacoesCadastroGestante";

interface StepSenhaProps {
  form: FormCadastroGestante;
  updateField: <K extends keyof FormCadastroGestante>(key: K, value: FormCadastroGestante[K]) => void;
  erroSenha: string;
}

export function StepSenha({ form, updateField, erroSenha }: StepSenhaProps) {
  return (
    <Card className="bg-muted/30 border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Senha de Acesso</CardTitle>
        <p className="text-xs text-muted-foreground">
          Crie uma senha para acessar o sistema (6 a 15 caracteres). Obrigatório.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senha">Crie uma senha <span className="text-red-500">*</span></Label>
          <Input
            id="senha"
            type="password"
            maxLength={15}
            placeholder="6 a 15 caracteres"
            value={form.senha}
            onChange={(e) => updateField("senha", e.target.value.slice(0, 15))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha-confirma">Confirme a senha <span className="text-red-500">*</span></Label>
          <Input
            id="senha-confirma"
            type="password"
            maxLength={15}
            placeholder="Repita a senha"
            value={form.senhaConfirma}
            onChange={(e) => updateField("senhaConfirma", e.target.value.slice(0, 15))}
          />
        </div>
        {erroSenha && (
          <p className="text-sm text-destructive">{erroSenha}</p>
        )}
      </CardContent>
    </Card>
  );
}
