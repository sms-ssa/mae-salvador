"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { FormCadastroGestante } from "../validators/validacoesCadastroGestante";
import { formatCep, formatPhone } from "../validators/validacoesCadastroGestante";

interface StepContatoEnderecoProps {
  form: FormCadastroGestante;
  updateField: <K extends keyof FormCadastroGestante>(key: K, value: FormCadastroGestante[K]) => void;
  erroCep: string;
  cepBuscando: boolean;
  onPesquisarCep: () => void;
}

export function StepContatoEndereco({
  form,
  updateField,
  erroCep,
  cepBuscando,
  onPesquisarCep,
}: StepContatoEnderecoProps) {
  return (
    <>
      <Card className="bg-muted/30 border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Contatos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ddd">DDD <span className="text-red-500">*</span></Label>
              <Input
                id="ddd"
                placeholder="71"
                value={form.ddd}
                onChange={(e) => updateField("ddd", e.target.value.replace(/\D/g, "").slice(0, 2))}
                maxLength={2}
                inputMode="numeric"
              />
              <p className="text-[10px] text-muted-foreground">2 dígitos</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Telefone celular principal <span className="text-red-500">*</span></Label>
              <Input
                id="celular"
                placeholder="99999-9999"
                value={form.celularPrincipal}
                onChange={(e) => updateField("celularPrincipal", e.target.value.replace(/\D/g, "").slice(0, 9))}
                maxLength={9}
                inputMode="numeric"
              />
              <p className="text-[10px] text-muted-foreground">9 dígitos, inicia com 9</p>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer h-9">
                <input
                  type="checkbox"
                  checked={form.temWhatsapp}
                  onChange={(e) => updateField("temWhatsapp", e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm">WhatsApp</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tel-alt">Telefone celular alternativo</Label>
              <Input
                id="tel-alt"
                placeholder="(71) 99999-9999"
                value={form.telefoneAlternativo}
                onChange={(e) => updateField("telefoneAlternativo", formatPhone(e.target.value))}
                maxLength={15}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer h-9">
                <input
                  type="checkbox"
                  checked={form.temWhatsappAlternativo}
                  onChange={(e) => updateField("temWhatsappAlternativo", e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm">Também é WhatsApp</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ddd-res">DDD (residencial)</Label>
              <Input
                id="ddd-res"
                placeholder="71"
                value={form.dddResidencial}
                onChange={(e) => updateField("dddResidencial", e.target.value.replace(/\D/g, "").slice(0, 2))}
                maxLength={2}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel-res">Telefone residencial</Label>
              <Input
                id="tel-res"
                placeholder="3333-4444"
                value={form.telefoneResidencial}
                onChange={(e) => updateField("telefoneResidencial", e.target.value.replace(/\D/g, "").slice(0, 8))}
                maxLength={8}
                inputMode="numeric"
              />
              <p className="text-[10px] text-muted-foreground">8 dígitos, inicia com 2 a 5</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Deve conter @ e ponto</p>
            {form.email.trim() && !form.email.includes("@") && (
              <p className="text-xs text-destructive">E-mail deve conter @ e ponto.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Endereço <span className="text-red-500 text-xs font-normal">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => { updateField("cep", formatCep(e.target.value)); }}
                  maxLength={9}
                  className={erroCep ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onPesquisarCep}
                  disabled={cepBuscando || form.cep.replace(/\D/g, "").length !== 8}
                  title="Pesquisar CEP"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {erroCep && <p className="text-sm text-destructive">{erroCep}</p>}
              <p className="text-[10px] text-muted-foreground">8 dígitos. Busca na base de CEP (ViaCEP).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipio">Município</Label>
              <Input
                id="municipio"
                placeholder="Preenchido pela busca CEP"
                value={form.municipio}
                onChange={(e) => updateField("municipio", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo-logradouro">Tipo de logradouro</Label>
              <Select value={form.tipoLogradouro} onValueChange={(v) => updateField("tipoLogradouro", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rua">Rua</SelectItem>
                  <SelectItem value="Avenida">Avenida</SelectItem>
                  <SelectItem value="Praça">Praça</SelectItem>
                  <SelectItem value="Travessa">Travessa</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logradouro">Logradouro <span className="text-red-500">*</span></Label>
              <Input
                id="logradouro"
                placeholder="Nome do logradouro"
                value={form.logradouro}
                onChange={(e) => updateField("logradouro", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro <span className="text-red-500">*</span></Label>
            <Input
              id="bairro"
              placeholder="Bairro"
              value={form.bairro}
              onChange={(e) => updateField("bairro", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="numero">Número <span className="text-red-500">*</span></Label>
                <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.numeroSemNumero}
                    onChange={(e) => updateField("numeroSemNumero", e.target.checked)}
                    className="rounded border-input"
                  />
                  S/N
                </label>
              </div>
              <Input
                id="numero"
                placeholder="Nº"
                value={form.numero}
                onChange={(e) => updateField("numero", e.target.value)}
                disabled={form.numeroSemNumero}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                placeholder="Apto, Bloco..."
                value={form.complemento}
                onChange={(e) => updateField("complemento", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ponto-ref">Ponto de referência</Label>
            <Input
              id="ponto-ref"
              placeholder="Ex.: próximo ao mercado, prédio azul"
              value={form.pontoReferencia}
              onChange={(e) => updateField("pontoReferencia", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
