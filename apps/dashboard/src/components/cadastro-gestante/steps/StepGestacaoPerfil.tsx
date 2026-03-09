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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { FormCadastroGestante } from "../validators/validacoesCadastroGestante";

interface StepGestacaoPerfilProps {
  form: FormCadastroGestante;
  updateField: <K extends keyof FormCadastroGestante>(key: K, value: FormCadastroGestante[K]) => void;
  erroDum: string;
}

export function StepGestacaoPerfil({ form, updateField, erroDum }: StepGestacaoPerfilProps) {
  return (
    <>
      <Card className="bg-muted/30 border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Dados da gestação atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Como descobriu a gestação <span className="text-red-500">*</span></Label>
              <Select
                value={form.descobrimento}
                onValueChange={(v) => updateField("descobrimento", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teste-rapido">Teste rápido</SelectItem>
                  <SelectItem value="beta-hcg">Beta-HCG (Sangue)</SelectItem>
                  <SelectItem value="atraso-menstrual">Atraso Menstrual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dum">Data da última menstruação (DUM)</Label>
              <Input
                id="dum"
                type="date"
                value={form.dum}
                onChange={(e) => updateField("dum", e.target.value)}
                className={erroDum ? "border-destructive" : ""}
                aria-invalid={!!erroDum}
              />
              {erroDum && <p className="text-sm text-destructive">{erroDum}</p>}
            </div>
          </div>

          <Separator />

          <p className="text-sm font-medium text-foreground">Perfil social</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Programa social <span className="text-red-500">*</span></Label>
              <Select
                value={form.programaSocial}
                onValueChange={(v) => updateField("programaSocial", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="bolsa-familia">Bolsa Família</SelectItem>
                  <SelectItem value="bpc-loas">BPC/LOAS</SelectItem>
                  <SelectItem value="aluguel-social">Aluguel Social</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.programaSocial === "bolsa-familia" && (
              <div className="space-y-2">
                <Label htmlFor="nis">NIS <span className="text-red-500">*</span></Label>
                <Input
                  id="nis"
                  placeholder="11 dígitos"
                  value={form.nis}
                  onChange={(e) => updateField("nis", e.target.value.replace(/\D/g, "").slice(0, 11))}
                  maxLength={11}
                  inputMode="numeric"
                  className={form.programaSocial === "bolsa-familia" && form.nis.replace(/\D/g, "").length > 0 && form.nis.replace(/\D/g, "").length !== 11 ? "border-destructive" : ""}
                />
                <p className="text-[10px] text-muted-foreground">Obrigatório para Bolsa Família (11 dígitos).</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano de saúde ou particular?</Label>
              <Select
                value={form.planoSaude}
                onValueChange={(v) => updateField("planoSaude", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.planoSaude === "sim" && (
              <div className="space-y-2">
                <Label>Deseja manter acompanhamento na UBS?</Label>
                <Select
                  value={form.manterAcompanhamentoUbs}
                  onValueChange={(v) => updateField("manterAcompanhamentoUbs", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Antecedentes</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal">Facultativo</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gestacoes">Gestações prévias</Label>
              <Input
                id="gestacoes"
                type="number"
                min={0}
                max={99}
                placeholder="0"
                value={form.gestacoesPrevias}
                onChange={(e) => updateField("gestacoesPrevias", e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
              <p className="text-[10px] text-muted-foreground">Até 2 dígitos</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partos-cesareo">Partos cesáreos</Label>
              <Input
                id="partos-cesareo"
                type="number"
                min={0}
                max={99}
                placeholder="0"
                value={form.partosCesareo}
                onChange={(e) => updateField("partosCesareo", e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
              <p className="text-[10px] text-muted-foreground">Até 2 dígitos</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partos-normal">Partos normais</Label>
              <Input
                id="partos-normal"
                type="number"
                min={0}
                max={99}
                placeholder="0"
                value={form.partosNormal}
                onChange={(e) => updateField("partosNormal", e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
              <p className="text-[10px] text-muted-foreground">Até 2 dígitos</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="abortos">Abortos</Label>
              <Input
                id="abortos"
                type="number"
                min={0}
                max={99}
                placeholder="0"
                value={form.abortos}
                onChange={(e) => updateField("abortos", e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
              <p className="text-[10px] text-muted-foreground">Até 2 dígitos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Informações de Saúde</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal">Facultativo</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Alergias conhecidas?</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="alergias"
                  checked={form.alergias === "sim"}
                  onChange={() => updateField("alergias", "sim")}
                  className="rounded-full"
                />
                <span className="text-sm">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="alergias"
                  checked={form.alergias !== "sim" && (form.alergias === "nao" || !form.alergias)}
                  onChange={() => updateField("alergias", "nao")}
                  className="rounded-full"
                />
                <span className="text-sm">Não</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Doenças conhecidas (antecedentes)?</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="doencas"
                  checked={form.doencasConhecidas === "sim"}
                  onChange={() => updateField("doencasConhecidas", "sim")}
                  className="rounded-full"
                />
                <span className="text-sm">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="doencas"
                  checked={form.doencasConhecidas !== "sim" && (form.doencasConhecidas === "nao" || !form.doencasConhecidas)}
                  onChange={() => updateField("doencasConhecidas", "nao")}
                  className="rounded-full"
                />
                <span className="text-sm">Não</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Medicações em uso?</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="medicacoes"
                  checked={form.medicacoesEmUso === "sim"}
                  onChange={() => updateField("medicacoesEmUso", "sim")}
                  className="rounded-full"
                />
                <span className="text-sm">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="medicacoes"
                  checked={form.medicacoesEmUso !== "sim" && (form.medicacoesEmUso === "nao" || !form.medicacoesEmUso)}
                  onChange={() => updateField("medicacoesEmUso", "nao")}
                  className="rounded-full"
                />
                <span className="text-sm">Não</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
