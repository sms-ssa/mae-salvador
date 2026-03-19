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
import type { FormCadastroGestante } from "../validators/validacoesCadastroGestante";
import {
  formatCpf,
  caracteresNomeValidos,
} from "../validators/validacoesCadastroGestante";

const DEFICIENCIA_OPCOES = [
  { value: "Física", id: "def-fisica" },
  { value: "Auditiva", id: "def-auditiva" },
  { value: "Visual", id: "def-visual" },
  { value: "Intelectual", id: "def-intelectual" },
  { value: "Transtorno do Espectro Autista", id: "def-tea" },
  { value: "Fibromialgia", id: "def-fibromialgia" },
] as const;

interface StepDadosPessoaisProps {
  form: FormCadastroGestante;
  updateField: <K extends keyof FormCadastroGestante>(
    key: K,
    value: FormCadastroGestante[K],
  ) => void;
  erros: {
    cpf?: string;
    cns?: string;
    nomeCompleto?: string;
    dataNascimento?: string;
  };
  pacienteLocalizado?: boolean;
}

export function StepDadosPessoais({
  form,
  updateField,
  erros,
  pacienteLocalizado,
}: StepDadosPessoaisProps) {
  const cpfDigits = form.cpf.replace(/\D/g, "").slice(0, 11);
  const cnsDigits = form.cns.replace(/\D/g, "").slice(0, 15);
  const dataNascValida = (() => {
    const d = form.dataNascimento.trim();
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    return new Date(d).getTime() <= new Date().setHours(0, 0, 0, 0);
  })();
  const idadeForaDoIntervalo =
    typeof erros.dataNascimento === "string" &&
    erros.dataNascimento.includes("Idade deve estar entre 9 e 60 anos");

  return (
    <Card className="bg-muted/30 border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Dados Pessoais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">
              CPF <span className="text-red-500">*</span>{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (obrigatório se CNS vazio)
              </span>
            </Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => updateField("cpf", formatCpf(e.target.value))}
              maxLength={14}
              className={
                cpfDigits.length === 11 && erros.cpf ? "border-destructive" : ""
              }
              disabled={pacienteLocalizado}
            />
            {erros.cpf && (
              <p className="text-sm text-destructive">{erros.cpf}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cns">
              Cartão Nacional de Saúde <span className="text-red-500">*</span>{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (obrigatório se CPF vazio)
              </span>
            </Label>
            <Input
              id="cns"
              placeholder="Cartão Nacional de Saúde"
              value={form.cns}
              onChange={(e) =>
                updateField(
                  "cns",
                  e.target.value.replace(/\D/g, "").slice(0, 15),
                )
              }
              maxLength={15}
              className={
                cnsDigits.length === 15 && erros.cns ? "border-destructive" : ""
              }
              disabled={pacienteLocalizado}
            />
            {erros.cns && (
              <p className="text-sm text-destructive">{erros.cns}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">
            Nome completo <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nome"
            placeholder="Nome completo da gestante (até 70 caracteres)"
            value={form.nomeCompleto}
            onChange={(e) =>
              updateField("nomeCompleto", e.target.value.slice(0, 70))
            }
            maxLength={70}
            className={
              form.nomeCompleto.trim() &&
              !caracteresNomeValidos(form.nomeCompleto)
                ? "border-destructive"
                : ""
            }
          />
          {erros.nomeCompleto && (
            <p className="text-sm text-destructive">{erros.nomeCompleto}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="nome-social">Nome social</Label>
            <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.nomeSocialPrincipal}
                onChange={(e) =>
                  updateField("nomeSocialPrincipal", e.target.checked)
                }
                className="rounded"
              />
              Principal
            </label>
          </div>
          <Input
            id="nome-social"
            placeholder="Nome social (se aplicável)"
            value={form.nomeSocial}
            onChange={(e) =>
              updateField("nomeSocial", e.target.value.slice(0, 70))
            }
            maxLength={70}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="nome-mae">
              Nome da Mãe <span className="text-red-500">*</span>
            </Label>
            <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.nomeMaeIgnorada}
                onChange={(e) =>
                  updateField("nomeMaeIgnorada", e.target.checked)
                }
                className="rounded"
              />
              Ignorada
            </label>
          </div>
          <Input
            id="nome-mae"
            placeholder="Até 70 caracteres"
            value={form.nomeMae}
            onChange={(e) =>
              updateField("nomeMae", e.target.value.slice(0, 70))
            }
            maxLength={70}
            disabled={form.nomeMaeIgnorada}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="nome-pai">
              Nome do Pai <span className="text-red-500">*</span>
            </Label>
            <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.nomePaiIgnorado}
                onChange={(e) =>
                  updateField("nomePaiIgnorado", e.target.checked)
                }
                className="rounded"
              />
              Ignorado
            </label>
          </div>
          <Input
            id="nome-pai"
            placeholder="Até 70 caracteres"
            value={form.nomePai}
            onChange={(e) =>
              updateField("nomePai", e.target.value.slice(0, 70))
            }
            maxLength={70}
            disabled={form.nomePaiIgnorado}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Raça/Cor <span className="text-red-500">*</span>
            </Label>
            <Select
              key={`racaCor-${form.racaCor}`}
              value={form.racaCor || undefined}
              onValueChange={(v) => updateField("racaCor", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRANCA">Branca</SelectItem>
                <SelectItem value="PARDA">Parda</SelectItem>
                <SelectItem value="PRETA">Preta</SelectItem>
                <SelectItem value="AMARELA">Amarela</SelectItem>
                <SelectItem value="INDIGENA">Indígena</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Sexo <span className="text-red-500">*</span>
            </Label>
            <Select
              key={`sexo-${form.sexo}`}
              value={form.sexo || undefined}
              onValueChange={(v) => updateField("sexo", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FEMININO">Feminino</SelectItem>
                <SelectItem value="MASCULINO">Masculino</SelectItem>
                <SelectItem value="INDETERMINADO">Indeterminado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Possui Deficiência?<span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="deficiencia"
                checked={form.possuiDeficiencia === true}
                onChange={() => updateField("possuiDeficiencia", true)}
              />
              <span className="text-sm">Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="deficiencia"
                checked={form.possuiDeficiencia === false}
                onChange={() => updateField("possuiDeficiencia", false)}
              />
              <span className="text-sm">Não</span>
            </label>
          </div>
          {form.possuiDeficiencia == null && (
            <p className="text-xs text-muted-foreground">
              Selecione uma opção para continuar.
            </p>
          )}
          {form.possuiDeficiencia && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Selecione o(s) tipo(s):
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {DEFICIENCIA_OPCOES.map((op) => (
                  <label
                    key={op.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      id={op.id}
                      checked={form.deficienciaTipos.includes(op.value)}
                      onChange={(e) => {
                        if (e.target.checked)
                          updateField("deficienciaTipos", [
                            ...form.deficienciaTipos,
                            op.value,
                          ]);
                        else
                          updateField(
                            "deficienciaTipos",
                            form.deficienciaTipos.filter((v) => v !== op.value),
                          );
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{op.value}</span>
                  </label>
                ))}
              </div>
              <Input
                placeholder="Outras (descreva se necessário)"
                value={form.deficiencia}
                onChange={(e) => updateField("deficiencia", e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Identidade de gênero</Label>
            <Select
              key={`identidadeGenero-${form.identidadeGenero}`}
              value={form.identidadeGenero || undefined}
              onValueChange={(v) => updateField("identidadeGenero", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mulher-cis">Mulher cisgênero</SelectItem>
                <SelectItem value="homem-cis">Homem cisgênero</SelectItem>
                <SelectItem value="mulher-trans">Mulher transgênero</SelectItem>
                <SelectItem value="homem-trans">Homem transgênero</SelectItem>
                <SelectItem value="travesti">Travesti</SelectItem>
                <SelectItem value="pessoa-nao-binaria">
                  Pessoa não-binária
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Orientação sexual</Label>
            <Select
              key={`orientacaoSexual-${form.orientacaoSexual}`}
              value={form.orientacaoSexual || undefined}
              onValueChange={(v) => updateField("orientacaoSexual", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heterossexual">Heterossexual</SelectItem>
                <SelectItem value="gay">Gay</SelectItem>
                <SelectItem value="lesbica">Lésbica</SelectItem>
                <SelectItem value="bissexual">Bissexual</SelectItem>
                <SelectItem value="pansexual">Pansexual</SelectItem>
                <SelectItem value="assexual">Assexual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nascimento">
              Data de nascimento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nascimento"
              type="date"
              value={form.dataNascimento}
              onChange={(e) => updateField("dataNascimento", e.target.value)}
              className={
                form.dataNascimento.trim() && !dataNascValida
                  ? "border-destructive"
                  : ""
              }
            />
            {erros.dataNascimento && (
              <p className="text-sm text-destructive">{erros.dataNascimento}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
