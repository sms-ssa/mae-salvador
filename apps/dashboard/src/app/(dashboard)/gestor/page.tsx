"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge } from "@/features/gestante/components";
import {
  Users, Calendar, Syringe, ClipboardCheck, TrendingUp, TrendingDown,
  CreditCard, BarChart3, ShieldAlert, Eye, Pill, HeartPulse, Baby, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import {
  MOCK_KPIS, MOCK_DADOS_UBS, MOCK_TENDENCIA_MENSAL, DISTRITOS_SANITARIOS,
  MOCK_GESTANTES, MOCK_TRANSCARD, MOCK_CASOS_SIFILIS, MOCK_INDICADORES_PREVINE,
  MOCK_CONSULTAS, MOCK_MEDICACOES, MOCK_VACINAS,
  UBS_LIST, EQUIPES, RACAS_CORES,
} from "@mae-salvador/shared";

const CHART_COLORS = [
  "oklch(0.50 0.16 255)", // blue (primary)
  "oklch(0.67 0.14 30)",  // coral
  "oklch(0.76 0.14 80)",  // amber
  "oklch(0.62 0.12 200)", // sky
  "oklch(0.54 0.07 325)", // mauve
];

const RISK_PIE_DATA = [
  { name: "Risco Habitual", value: MOCK_KPIS.distribuicaoRisco.habitual, fill: "oklch(0.58 0.14 255)" },
  { name: "Alto Risco", value: MOCK_KPIS.distribuicaoRisco.alto, fill: "oklch(0.60 0.18 25)" },
];

/* ── Helpers ─────────────────────────────────────── */

function fmt(iso: string) { return new Date(iso).toLocaleDateString("pt-BR"); }

function getDistritoNome(id: string) {
  return DISTRITOS_SANITARIOS.find((d) => d.id === id)?.nome ?? id;
}

function getUbsNome(id: string) {
  return UBS_LIST.find((u) => u.id === id)?.nome ?? id;
}

function getGestanteNome(id: string) {
  return MOCK_GESTANTES.find((g) => g.id === id)?.nomeCompleto ?? id;
}

function getEquipeNome(id: string) {
  return EQUIPES.find((e) => e.id === id)?.nome ?? id;
}

function getRacaLabel(v: string) {
  return RACAS_CORES.find((r) => r.value === v)?.label ?? v;
}

function getIdade(dataNascimento: string): number {
  const today = new Date();
  const birth = new Date(dataNascimento);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getTrimestre(ig: number): 1 | 2 | 3 {
  if (ig <= 13) return 1;
  if (ig <= 27) return 2;
  return 3;
}

function getProfilaxia(gestanteId: string): string[] {
  const meds = MOCK_MEDICACOES.filter((m) => m.gestanteId === gestanteId && m.ativa);
  const p: string[] = [];
  if (meds.some((m) => m.nome.toLowerCase().includes("fólico"))) p.push("Ác. Fólico");
  if (meds.some((m) => m.nome.toLowerCase().includes("ferroso"))) p.push("Sulf. Ferroso");
  if (meds.some((m) => m.nome.toLowerCase().includes("aas") || m.nome.toLowerCase().includes("aspirina"))) p.push("AAS");
  if (meds.some((m) => m.nome.toLowerCase().includes("cálcio"))) p.push("Cálcio");
  return p;
}

function getIgAtDate(dum: string, date: string): number {
  return Math.round((new Date(date).getTime() - new Date(dum).getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function getVacStatus(gestanteId: string, nomeVacina: string): string {
  const vac = MOCK_VACINAS.find((v) => v.gestanteId === gestanteId && v.nome === nomeVacina);
  if (!vac) return "—";
  if (vac.status === "aplicada") return "✓";
  if (vac.status === "atrasada") return "⚠";
  return "⏳";
}

function KPICard({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; trend?: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-600" />}
              {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Indicator({ label, value, target }: { label: string; value: number; target: number }) {
  const met = value >= target;
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${met ? "text-emerald-700" : "text-amber-700"}`}>{value}%</p>
      <p className="text-[10px] text-muted-foreground">meta: {target}%</p>
    </div>
  );
}

/* ── Computed data ───────────────────────────────── */

// Programa Mãe Salvador
const transcardAtivos = MOCK_TRANSCARD.filter((t) => t.situacao === "ativo").length;
const transcardPendentes = MOCK_TRANSCARD.filter((t) => t.situacao === "pendente").length;
const transcardRecusas = MOCK_TRANSCARD.filter((t) => t.recusouTranscard).length;
const etapaCounts = [1, 2, 3].map((e) => ({
  name: `Etapa ${e}`,
  value: MOCK_TRANSCARD.filter((t) => t.etapaAtual === e).length,
}));
const ETAPA_PIE_COLORS = [CHART_COLORS[0], CHART_COLORS[3], CHART_COLORS[1]];

const gestantesBolsaFamilia = MOCK_GESTANTES.filter((g) => g.bolsaFamilia).length;
const pctBolsaFamilia = Math.round((gestantesBolsaFamilia / MOCK_GESTANTES.length) * 100);
const encaminhadasCras = MOCK_TRANSCARD.filter((t) => t.encaminhadaCras).length;
const recusaramEnxoval = MOCK_TRANSCARD.filter((t) => t.recusouKitEnxoval).length;

// Sífilis
const sifilisRecente = MOCK_CASOS_SIFILIS.filter((c) => c.classificacao === "recente").length;
const sifilisTardia = MOCK_CASOS_SIFILIS.filter((c) => c.classificacao === "tardia").length;
const sifilisIndet = MOCK_CASOS_SIFILIS.filter((c) => c.classificacao === "indeterminada").length;
const tratConcluido = MOCK_CASOS_SIFILIS.filter((c) => c.tratamentoConcluido).length;
const parceiroTratado = MOCK_CASOS_SIFILIS.filter((c) => c.parceiroTratado).length;
const SIFILIS_PIE = [
  { name: "Recente", value: sifilisRecente, fill: CHART_COLORS[0] },
  { name: "Tardia", value: sifilisTardia, fill: CHART_COLORS[1] },
  ...(sifilisIndet > 0 ? [{ name: "Indeterminada", value: sifilisIndet, fill: CHART_COLORS[2] }] : []),
];

// Quadrimestres list
const QUADRIMESTRES = MOCK_INDICADORES_PREVINE[0].valores.map((v) => v.quadrimestre);

/* ── Page ────────────────────────────────────────── */

export default function GestorPage() {
  const [quadrimestre, setQuadrimestre] = useState(QUADRIMESTRES[QUADRIMESTRES.length - 1]);

  // ── Visão Geral filters ──
  const [vgDistrito, setVgDistrito] = useState("todos");
  const [vgUnidade, setVgUnidade] = useState("todos");
  const [vgEquipe, setVgEquipe] = useState("todos");
  const [vgTrimestre, setVgTrimestre] = useState("todos");
  const [vgRaca, setVgRaca] = useState("todos");

  const vgUbsOpts = vgDistrito !== "todos" ? UBS_LIST.filter((u) => u.distritoSanitarioId === vgDistrito) : UBS_LIST;
  const vgEqOpts = vgUnidade !== "todos" ? EQUIPES.filter((e) => e.ubsId === vgUnidade) : vgDistrito !== "todos" ? EQUIPES.filter((e) => vgUbsOpts.some((u) => u.id === e.ubsId)) : EQUIPES;

  const vg = useMemo(() => {
    return MOCK_GESTANTES.filter((g) => {
      if (!g.ativa) return false;
      if (vgDistrito !== "todos" && g.endereco.distritoSanitarioId !== vgDistrito) return false;
      if (vgUnidade !== "todos" && g.ubsId !== vgUnidade) return false;
      if (vgEquipe !== "todos" && g.equipeId !== vgEquipe) return false;
      if (vgTrimestre !== "todos" && getTrimestre(g.idadeGestacionalSemanas) !== Number(vgTrimestre)) return false;
      if (vgRaca !== "todos" && g.racaCor !== vgRaca) return false;
      return true;
    });
  }, [vgDistrito, vgUnidade, vgEquipe, vgTrimestre, vgRaca]);

  const vgN = Math.max(vg.length, 1);
  const vgMenores18 = vg.filter((g) => getIdade(g.dataNascimento) < 18).length;
  const vg35mais = vg.filter((g) => getIdade(g.dataNascimento) >= 35).length;
  const vgAltoRisco = Math.round((vg.filter((g) => g.riscoGestacional === "alto").length / vgN) * 100);
  const vgBolsaFam = Math.round((vg.filter((g) => g.bolsaFamilia).length / vgN) * 100);
  const vgTranscard = Math.round((vg.filter((g) => MOCK_TRANSCARD.some((t) => t.gestanteId === g.id && t.situacao === "ativo")).length / vgN) * 100);
  const vgProfilaxia = vg.filter((g) => MOCK_MEDICACOES.some((m) => m.gestanteId === g.id && m.ativa)).length;

  const agravoCounts: Record<string, number> = {};
  vg.forEach((g) => g.fatoresRisco.forEach((f) => { agravoCounts[f] = (agravoCounts[f] ?? 0) + 1; }));
  const topAgravos = Object.entries(agravoCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);

  const vgTriData = [1, 2, 3].map((t) => ({ name: `${t}° Tri`, value: vg.filter((g) => getTrimestre(g.idadeGestacionalSemanas) === t).length }));
  const TRI_COLORS = [CHART_COLORS[0], CHART_COLORS[3], CHART_COLORS[1]];

  const vgDistritoData = DISTRITOS_SANITARIOS.map((d) => ({
    name: d.nome.length > 16 ? d.nome.slice(0, 16) + "…" : d.nome,
    count: vg.filter((g) => g.endereco.distritoSanitarioId === d.id).length,
  })).filter((d) => d.count > 0);

  const vgConsultaDist = (() => {
    const c = vg.map((g) => MOCK_CONSULTAS.filter((x) => x.gestanteId === g.id && x.status === "realizada").length);
    return [
      { range: "0", count: c.filter((n) => n === 0).length },
      { range: "1–3", count: c.filter((n) => n >= 1 && n <= 3).length },
      { range: "4–6", count: c.filter((n) => n >= 4 && n <= 6).length },
      { range: "7+", count: c.filter((n) => n >= 7).length },
    ];
  })();

  const vgRacaData = RACAS_CORES.map((r) => ({ name: r.label, count: vg.filter((g) => g.racaCor === r.value).length })).filter((d) => d.count > 0);

  // ── Programa Mãe Salvador filters ──
  const [msDistrito, setMsDistrito] = useState("todos");
  const [msUnidade, setMsUnidade] = useState("todos");
  const [msEquipe, setMsEquipe] = useState("todos");
  const [msStatus, setMsStatus] = useState("todos");

  const msUbsOpts = msDistrito !== "todos" ? UBS_LIST.filter((u) => u.distritoSanitarioId === msDistrito) : UBS_LIST;
  const msEqOpts = msUnidade !== "todos" ? EQUIPES.filter((e) => e.ubsId === msUnidade) : msDistrito !== "todos" ? EQUIPES.filter((e) => msUbsOpts.some((u) => u.id === e.ubsId)) : EQUIPES;

  const ms = useMemo(() => {
    return MOCK_TRANSCARD.filter((tc) => {
      const g = MOCK_GESTANTES.find((x) => x.id === tc.gestanteId);
      if (!g) return false;
      if (msDistrito !== "todos" && g.endereco.distritoSanitarioId !== msDistrito) return false;
      if (msUnidade !== "todos" && g.ubsId !== msUnidade) return false;
      if (msEquipe !== "todos" && g.equipeId !== msEquipe) return false;
      if (msStatus !== "todos" && tc.situacao !== msStatus) return false;
      return true;
    });
  }, [msDistrito, msUnidade, msEquipe, msStatus]);

  const msN = Math.max(ms.length, 1);
  const msAtivos = ms.filter((t) => t.situacao === "ativo").length;
  const msInconsistencias = ms.filter((t) => t.situacao === "inconsistencia").length;
  const msSemCpf = Math.round((ms.filter((t) => !t.cpf || t.cpf.trim() === "").length / msN) * 100);
  const msRecusaTc = Math.round((ms.filter((t) => t.recusouTranscard).length / msN) * 100);
  const msRecusaEnx = Math.round((ms.filter((t) => t.recusouKitEnxoval).length / msN) * 100);
  const msBolsaFam = ms.filter((t) => MOCK_GESTANTES.find((x) => x.id === t.gestanteId)?.bolsaFamilia).length;
  const msCras = ms.filter((t) => t.encaminhadaCras).length;
  const msVinc180 = ms.filter((t) => (new Date().getTime() - new Date(t.dataVinculacao).getTime()) / 86400000 < 180).length;
  const msEtapaCounts = [1, 2, 3].map((e) => ({ name: `Etapa ${e}`, value: ms.filter((t) => t.etapaAtual === e).length }));

  // ── Indicadores MS filters ──
  const [indDistrito, setIndDistrito] = useState("todos");
  const [indUnidade, setIndUnidade] = useState("todos");
  const [indEquipe, setIndEquipe] = useState("todos");

  const indUbsOpts = indDistrito !== "todos" ? UBS_LIST.filter((u) => u.distritoSanitarioId === indDistrito) : UBS_LIST;
  const indEqOpts = indUnidade !== "todos" ? EQUIPES.filter((e) => e.ubsId === indUnidade) : indDistrito !== "todos" ? EQUIPES.filter((e) => indUbsOpts.some((u) => u.id === e.ubsId)) : EQUIPES;

  const ind = useMemo(() => {
    return MOCK_GESTANTES.filter((g) => {
      if (!g.ativa) return false;
      if (indDistrito !== "todos" && g.endereco.distritoSanitarioId !== indDistrito) return false;
      if (indUnidade !== "todos" && g.ubsId !== indUnidade) return false;
      if (indEquipe !== "todos" && g.equipeId !== indEquipe) return false;
      return true;
    });
  }, [indDistrito, indUnidade, indEquipe]);

  // ── Sífilis filters ──
  const [sifDistrito, setSifDistrito] = useState("todos");
  const [sifUnidade, setSifUnidade] = useState("todos");
  const [sifEquipe, setSifEquipe] = useState("todos");
  const [sifTrimestre, setSifTrimestre] = useState("todos");
  const [sifRaca, setSifRaca] = useState("todos");

  const sifUbsOpts = sifDistrito !== "todos" ? UBS_LIST.filter((u) => u.distritoSanitarioId === sifDistrito) : UBS_LIST;
  const sifEqOpts = sifUnidade !== "todos" ? EQUIPES.filter((e) => e.ubsId === sifUnidade) : sifDistrito !== "todos" ? EQUIPES.filter((e) => sifUbsOpts.some((u) => u.id === e.ubsId)) : EQUIPES;

  const sif = useMemo(() => {
    return MOCK_CASOS_SIFILIS.filter((c) => {
      const g = MOCK_GESTANTES.find((x) => x.id === c.gestanteId);
      if (!g) return false;
      if (sifDistrito !== "todos" && g.endereco.distritoSanitarioId !== sifDistrito) return false;
      if (sifUnidade !== "todos" && g.ubsId !== sifUnidade) return false;
      if (sifEquipe !== "todos" && g.equipeId !== sifEquipe) return false;
      if (sifTrimestre !== "todos" && getTrimestre(g.idadeGestacionalSemanas) !== Number(sifTrimestre)) return false;
      if (sifRaca !== "todos" && g.racaCor !== sifRaca) return false;
      return true;
    });
  }, [sifDistrito, sifUnidade, sifEquipe, sifTrimestre, sifRaca]);

  const sifN = Math.max(sif.length, 1);
  const sifConcluido = sif.filter((c) => c.tratamentoConcluido).length;
  const sifParceiro = sif.filter((c) => c.parceiroTratado).length;
  const sifAdequado = sif.filter((c) => c.tratamentoConcluido && c.parceiroTratado).length;
  const sifInadequado = sif.filter((c) => c.tratamentoConcluido && !c.parceiroTratado).length;
  const sifEmTrat = sif.filter((c) => c.tratamentoIniciado && !c.tratamentoConcluido).length;
  const sifNaoIniciaram = sif.filter((c) => !c.tratamentoIniciado).length;

  const sifTratPie = [
    { name: "Adequado", value: sifAdequado, fill: "oklch(0.58 0.14 150)" },
    { name: "Inadequado", value: sifInadequado, fill: CHART_COLORS[1] },
    { name: "Em tratamento", value: sifEmTrat, fill: CHART_COLORS[2] },
    { name: "Não iniciaram", value: sifNaoIniciaram, fill: CHART_COLORS[4] },
  ].filter((d) => d.value > 0);

  const sifClassPie = [
    { name: "Recente", value: sif.filter((c) => c.classificacao === "recente").length, fill: CHART_COLORS[0] },
    { name: "Tardia", value: sif.filter((c) => c.classificacao === "tardia").length, fill: CHART_COLORS[1] },
    { name: "Indeterminada", value: sif.filter((c) => c.classificacao === "indeterminada").length, fill: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);

  const sifDistritoData = DISTRITOS_SANITARIOS.map((d) => ({
    name: d.nome.length > 16 ? d.nome.slice(0, 16) + "…" : d.nome,
    count: sif.filter((c) => MOCK_GESTANTES.find((x) => x.id === c.gestanteId)?.endereco.distritoSanitarioId === d.id).length,
  })).filter((d) => d.count > 0);

  const sifUbsCounts: Record<string, number> = {};
  sif.forEach((c) => { const u = MOCK_GESTANTES.find((x) => x.id === c.gestanteId)?.ubsId; if (u) sifUbsCounts[u] = (sifUbsCounts[u] ?? 0) + 1; });
  const sifTopUbs = Object.entries(sifUbsCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ name: getUbsNome(id), count }));

  const sifInadUbs: Record<string, number> = {};
  sif.filter((c) => !c.tratamentoConcluido || !c.parceiroTratado).forEach((c) => { const u = MOCK_GESTANTES.find((x) => x.id === c.gestanteId)?.ubsId; if (u) sifInadUbs[u] = (sifInadUbs[u] ?? 0) + 1; });
  const sifTopInad = Object.entries(sifInadUbs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ name: getUbsNome(id), count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Indicadores e relatórios do pré-natal — Salvador</p>
      </div>

      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="visao-geral"><Eye className="w-3.5 h-3.5 mr-1.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="mae-salvador"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Programa Mãe Salvador</TabsTrigger>
          <TabsTrigger value="indicadores"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Indicadores MS</TabsTrigger>
          <TabsTrigger value="sifilis"><ShieldAlert className="w-3.5 h-3.5 mr-1.5" />Sífilis na Gestação</TabsTrigger>
        </TabsList>

        {/* ══════════ TAB 1: Visão Geral ══════════ */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={vgDistrito} onValueChange={(v) => { setVgDistrito(v); setVgUnidade("todos"); setVgEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Distrito" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Distritos</SelectItem>
                {DISTRITOS_SANITARIOS.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vgUnidade} onValueChange={(v) => { setVgUnidade(v); setVgEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Unidades</SelectItem>
                {vgUbsOpts.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vgEquipe} onValueChange={setVgEquipe}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Equipes</SelectItem>
                {vgEqOpts.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vgTrimestre} onValueChange={setVgTrimestre}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Trimestre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1° Trimestre</SelectItem>
                <SelectItem value="2">2° Trimestre</SelectItem>
                <SelectItem value="3">3° Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vgRaca} onValueChange={setVgRaca}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Raça/Cor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {RACAS_CORES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Gestantes em Acompanhamento" value={vg.length.toLocaleString("pt-BR")} subtitle="ativas no filtro" icon={Users} />
            <KPICard title="Gestantes < 18 anos" value={String(vgMenores18)} subtitle="menores de idade" icon={Baby} />
            <KPICard title="Gestantes ≥ 35 anos" value={String(vg35mais)} subtitle="idade avançada" icon={Users} />
            <KPICard title="Prescrições (Profilaxia)" value={String(vgProfilaxia)} subtitle={`de ${vg.length} gestantes`} icon={Pill} />
          </div>

          {/* KPI Cards Row 2 — percentages */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Alto Risco" value={`${vgAltoRisco}%`} subtitle="classificadas" icon={HeartPulse} />
            <KPICard title="Acompanhamento PNAR" value={`${Math.round((vg.filter((g) => g.riscoGestacional === "alto").length / vgN) * 80)}%`} subtitle="estimativa" icon={ShieldAlert} />
            <KPICard title="Bolsa Família" value={`${vgBolsaFam}%`} subtitle="beneficiárias" icon={Users} />
            <KPICard title="Transcard Ativo" value={`${vgTranscard}%`} subtitle="vinculadas" icon={CreditCard} />
          </div>

          {/* Top 2 agravos */}
          {topAgravos.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Principais Agravos Associados à Gestação</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {topAgravos.map(([agravo, count], i) => (
                    <div key={agravo} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white" style={{ backgroundColor: CHART_COLORS[i] }}>{i + 1}°</div>
                      <div>
                        <p className="text-sm font-medium">{agravo}</p>
                        <p className="text-xs text-muted-foreground">{Math.round((count / vgN) * 100)}% das gestantes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts: Trimestre pie + Distrito bar */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gestações por Trimestre</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={vgTriData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                      {vgTriData.map((_, i) => <Cell key={i} fill={TRI_COLORS[i]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gestações por Distrito Sanitário</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={vgDistritoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={120} />
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Gestantes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts: Raça bar + Consultas distribution */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gestações por Raça/Cor</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vgRacaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} name="Gestantes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por N° de Consultas Pré-natal</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vgConsultaDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="Gestantes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts: Consultas/Mês + Risco pie */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Consultas por Mês</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={MOCK_TENDENCIA_MENSAL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                    <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="consultas" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Consultas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Risco</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={RISK_PIE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} ${value}%`} fontSize={11}>
                      {RISK_PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Previne Brasil summary */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Indicadores Previne Brasil</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Indicator label="Início precoce (≤12 sem)" value={MOCK_KPIS.inicioPrecoce} target={80} />
                <Indicator label="7+ consultas" value={MOCK_KPIS.seteMaisConsultas} target={70} />
                <Indicator label="Cobertura dTpa" value={MOCK_KPIS.coberturaVacinalDtpa} target={85} />
                <Indicator label="Exames 1º trimestre" value={MOCK_KPIS.examesPrimeiroTrimestre} target={80} />
              </div>
            </CardContent>
          </Card>

          {/* Trend line */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução do Início Precoce</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={MOCK_TENDENCIA_MENSAL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                  <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[60, 80]} unit="%" />
                  <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="inicioPrecoce" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4 }} name="Início precoce %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* UBS table */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Desempenho por UBS</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UBS</TableHead>
                    <TableHead>Distrito</TableHead>
                    <TableHead className="text-right">Gestantes</TableHead>
                    <TableHead className="text-right">Consultas/mês</TableHead>
                    <TableHead className="text-right">Início precoce</TableHead>
                    <TableHead className="text-right">Cobertura vacinal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DADOS_UBS.map((ubs) => (
                    <TableRow key={ubs.ubsId}>
                      <TableCell className="font-medium">{ubs.ubsNome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getDistritoNome(ubs.distrito)}</TableCell>
                      <TableCell className="text-right">{ubs.gestantesAtivas}</TableCell>
                      <TableCell className="text-right">{ubs.consultasMes}</TableCell>
                      <TableCell className="text-right">
                        <span className={ubs.inicioPrecoce >= 75 ? "text-emerald-700" : ubs.inicioPrecoce >= 65 ? "text-amber-700" : "text-red-700"}>{ubs.inicioPrecoce}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={ubs.coberturaVacinal >= 80 ? "text-emerald-700" : ubs.coberturaVacinal >= 70 ? "text-amber-700" : "text-red-700"}>{ubs.coberturaVacinal}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Nominal list */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Lista Nominal de Gestantes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Distrito</TableHead>
                    <TableHead className="hidden lg:table-cell">UBS</TableHead>
                    <TableHead className="hidden lg:table-cell">Equipe</TableHead>
                    <TableHead>Raça/Cor</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>IG</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead className="hidden md:table-cell">Bolsa Família</TableHead>
                    <TableHead className="hidden xl:table-cell">Profilaxia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vg.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        <Link href={`/gestante/${g.id}`} className="hover:underline text-primary">{g.nomeCompleto}</Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getDistritoNome(g.endereco.distritoSanitarioId)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{getUbsNome(g.ubsId)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{getEquipeNome(g.equipeId)}</TableCell>
                      <TableCell className="text-sm">{getRacaLabel(g.racaCor)}</TableCell>
                      <TableCell className="text-sm">{getIdade(g.dataNascimento)}</TableCell>
                      <TableCell>{g.idadeGestacionalSemanas} sem</TableCell>
                      <TableCell><RiskBadge risco={g.riscoGestacional} /></TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{g.bolsaFamilia ? <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Sim</Badge> : "Não"}</TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{getProfilaxia(g.id).join(", ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {vg.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma gestante encontrada para os filtros selecionados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════ TAB 2: Programa Mãe Salvador ══════════ */}
        <TabsContent value="mae-salvador" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={msDistrito} onValueChange={(v) => { setMsDistrito(v); setMsUnidade("todos"); setMsEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Distrito" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Distritos</SelectItem>
                {DISTRITOS_SANITARIOS.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={msUnidade} onValueChange={(v) => { setMsUnidade(v); setMsEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Unidades</SelectItem>
                {msUbsOpts.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={msEquipe} onValueChange={setMsEquipe}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Equipes</SelectItem>
                {msEqOpts.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={msStatus} onValueChange={setMsStatus}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Status Cartão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="inconsistencia">Inconsistência</SelectItem>
                <SelectItem value="recusado">Recusado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Transcards Vinculados" value={String(ms.length)} subtitle="no filtro" icon={CreditCard} />
            <KPICard title="Ativos" value={String(msAtivos)} subtitle={`de ${ms.length}`} icon={ClipboardCheck} trend="up" />
            <KPICard title="Inconsistências" value={String(msInconsistencias)} subtitle="cartões" icon={AlertTriangle} />
            <KPICard title="Nova Vinc. < 180 dias" value={String(msVinc180)} subtitle="vinculações recentes" icon={Calendar} />
          </div>

          {/* KPI Cards Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard title="Sem CPF" value={`${msSemCpf}%`} subtitle="dos vinculados" icon={Users} />
            <KPICard title="Recusaram Transcard" value={`${msRecusaTc}%`} subtitle="das gestantes" icon={CreditCard} />
            <KPICard title="Recusaram Kit Enxoval" value={`${msRecusaEnx}%`} subtitle="das gestantes" icon={Baby} />
            <KPICard title="Bolsa Família" value={String(msBolsaFam)} subtitle={`de ${ms.length}`} icon={Users} />
            <KPICard title="Encaminhadas CRAS" value={String(msCras)} subtitle="referenciadas" icon={Users} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Etapa distribution */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Etapa</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={msEtapaCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={12}>
                      {msEtapaCounts.map((_, i) => <Cell key={i} fill={ETAPA_PIE_COLORS[i]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary stats */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Resumo do Programa</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Indicator label="Pendentes" value={Math.round((ms.filter((t) => t.situacao === "pendente").length / msN) * 100)} target={0} />
                  <Indicator label="Recusas Transcard" value={msRecusaTc} target={0} />
                  <Indicator label="Recusas Kit Enxoval" value={msRecusaEnx} target={0} />
                  <Indicator label="Bolsa Família" value={Math.round((msBolsaFam / msN) * 100)} target={100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nominal list */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Lista Nominal — Vinculações Transcard</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gestante</TableHead>
                    <TableHead className="hidden md:table-cell">CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Distrito</TableHead>
                    <TableHead className="hidden lg:table-cell">Unidade</TableHead>
                    <TableHead className="hidden lg:table-cell">Equipe</TableHead>
                    <TableHead>Nº Transcard</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="hidden md:table-cell">Vinculação</TableHead>
                    <TableHead className="hidden md:table-cell">&lt;180d</TableHead>
                    <TableHead className="hidden xl:table-cell">N° Vinc.</TableHead>
                    <TableHead className="hidden lg:table-cell">CRAS (IG)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ms.map((tc) => {
                    const g = MOCK_GESTANTES.find((x) => x.id === tc.gestanteId);
                    const vinc180 = (new Date().getTime() - new Date(tc.dataVinculacao).getTime()) / 86400000 < 180;
                    const nVinc = MOCK_TRANSCARD.filter((t) => t.gestanteId === tc.gestanteId).length;
                    return (
                      <TableRow key={tc.id}>
                        <TableCell className="font-medium">
                          <Link href={`/gestante/${tc.gestanteId}`} className="hover:underline text-primary">{getGestanteNome(tc.gestanteId)}</Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">{tc.cpf || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{g ? getDistritoNome(g.endereco.distritoSanitarioId) : "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{g ? getUbsNome(g.ubsId) : "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{g ? getEquipeNome(g.equipeId) : "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{tc.numeroTranscard}</TableCell>
                        <TableCell>
                          <Badge variant={tc.situacao === "ativo" ? "default" : tc.situacao === "pendente" ? "secondary" : "destructive"} className="text-xs">
                            {tc.situacao === "inconsistencia" ? "Inconsistente" : tc.situacao.charAt(0).toUpperCase() + tc.situacao.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{tc.etapaAtual}/3</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmt(tc.dataVinculacao)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {vinc180 ? <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Sim</Badge> : "Não"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center">{nVinc}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {tc.encaminhadaCras
                            ? <span>{g && tc.dataEncaminhamentoCras ? `Sim (${getIgAtDate(g.dum, tc.dataEncaminhamentoCras)} sem)` : "Sim"}</span>
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {ms.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhuma vinculação encontrada para os filtros selecionados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════ TAB 3: Indicadores MS ══════════ */}
        <TabsContent value="indicadores" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={indDistrito} onValueChange={(v) => { setIndDistrito(v); setIndUnidade("todos"); setIndEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Distrito" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Distritos</SelectItem>
                {DISTRITOS_SANITARIOS.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={indUnidade} onValueChange={(v) => { setIndUnidade(v); setIndEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Unidades</SelectItem>
                {indUbsOpts.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={indEquipe} onValueChange={setIndEquipe}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Equipes</SelectItem>
                {indEqOpts.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={quadrimestre} onValueChange={setQuadrimestre}>
              <SelectTrigger className="w-52 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUADRIMESTRES.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Indicators grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MOCK_INDICADORES_PREVINE.map((ip) => {
              const val = ip.valores.find((v) => v.quadrimestre === quadrimestre)?.valor ?? 0;
              return <Indicator key={ip.id} label={ip.nome} value={val} target={ip.meta} />;
            })}
          </div>

          {/* Evolution chart */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução dos Indicadores por Quadrimestre</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={QUADRIMESTRES.map((q) => {
                  const row: Record<string, string | number> = { quadrimestre: q };
                  MOCK_INDICADORES_PREVINE.slice(0, 4).forEach((ip) => {
                    row[ip.nome.slice(0, 25)] = ip.valores.find((v) => v.quadrimestre === q)?.valor ?? 0;
                  });
                  return row;
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                  <XAxis dataKey="quadrimestre" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                  <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                  {MOCK_INDICADORES_PREVINE.slice(0, 4).map((ip, i) => (
                    <Bar key={ip.id} dataKey={ip.nome.slice(0, 25)} fill={CHART_COLORS[i]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Full indicator table */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Detalhamento — {quadrimestre}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_INDICADORES_PREVINE.map((ip, idx) => {
                    const val = ip.valores.find((v) => v.quadrimestre === quadrimestre)?.valor ?? 0;
                    const met = val >= ip.meta;
                    return (
                      <TableRow key={ip.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{ip.nome}</TableCell>
                        <TableCell className="text-right">
                          <span className={met ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>{val}%</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{ip.meta}%</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={met ? "default" : "secondary"} className="text-xs">{met ? "Atingida" : "Abaixo"}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Nominal list */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Lista Nominal — Indicadores por Gestante</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Distrito</TableHead>
                    <TableHead className="hidden lg:table-cell">Unidade</TableHead>
                    <TableHead className="hidden lg:table-cell">Equipe</TableHead>
                    <TableHead>IG 1ª cons.</TableHead>
                    <TableHead>Cons. PN</TableHead>
                    <TableHead className="hidden md:table-cell">Afer. PA</TableHead>
                    <TableHead className="hidden md:table-cell">Afer. Peso</TableHead>
                    <TableHead className="hidden xl:table-cell">Vis. ACS</TableHead>
                    <TableHead className="hidden xl:table-cell">Puerp. cons.</TableHead>
                    <TableHead className="hidden xl:table-cell">Puerp. vis.</TableHead>
                    <TableHead className="hidden xl:table-cell">Odonto</TableHead>
                    <TableHead className="hidden md:table-cell">dTpa</TableHead>
                    <TableHead className="hidden md:table-cell">Influenza</TableHead>
                    <TableHead className="hidden xl:table-cell">COVID</TableHead>
                    <TableHead className="hidden xl:table-cell">VSR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ind.map((g) => {
                    const consR = MOCK_CONSULTAS.filter((c) => c.gestanteId === g.id && c.status === "realizada");
                    const ig1a = consR.length > 0 ? Math.min(...consR.map((c) => c.idadeGestacionalSemanas)) : null;
                    const numPA = consR.filter((c) => c.pressaoSistolica != null).length;
                    const numPeso = consR.filter((c) => c.pesoKg != null).length;
                    const vDtpa = getVacStatus(g.id, "dTpa");
                    const vInflu = getVacStatus(g.id, "Influenza");
                    const vacClr = (s: string) => s === "✓" ? "text-emerald-700" : s === "⚠" ? "text-red-600" : s === "⏳" ? "text-amber-600" : "text-muted-foreground";
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">
                          <Link href={`/gestante/${g.id}`} className="hover:underline text-primary">{g.nomeCompleto}</Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getDistritoNome(g.endereco.distritoSanitarioId)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{getUbsNome(g.ubsId)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{getEquipeNome(g.equipeId)}</TableCell>
                        <TableCell className="text-sm">{ig1a != null ? `${ig1a} sem` : "—"}</TableCell>
                        <TableCell className="text-sm text-center">{consR.length}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-center">{numPA}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-center">{numPeso}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center text-muted-foreground">—</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center text-muted-foreground">—</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center text-muted-foreground">—</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center text-muted-foreground">—</TableCell>
                        <TableCell className={`hidden md:table-cell text-sm text-center ${vacClr(vDtpa)}`}>{vDtpa}</TableCell>
                        <TableCell className={`hidden md:table-cell text-sm text-center ${vacClr(vInflu)}`}>{vInflu}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center text-muted-foreground">—</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-center text-muted-foreground">—</TableCell>
                      </TableRow>
                    );
                  })}
                  {ind.length === 0 && (
                    <TableRow><TableCell colSpan={16} className="text-center py-8 text-muted-foreground">Nenhuma gestante encontrada para os filtros selecionados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════ TAB 4: Sífilis na Gestação ══════════ */}
        <TabsContent value="sifilis" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={sifDistrito} onValueChange={(v) => { setSifDistrito(v); setSifUnidade("todos"); setSifEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Distrito" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Distritos</SelectItem>
                {DISTRITOS_SANITARIOS.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sifUnidade} onValueChange={(v) => { setSifUnidade(v); setSifEquipe("todos"); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Unidades</SelectItem>
                {sifUbsOpts.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sifEquipe} onValueChange={setSifEquipe}>
              <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Equipes</SelectItem>
                {sifEqOpts.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sifTrimestre} onValueChange={setSifTrimestre}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Trimestre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1° Trimestre</SelectItem>
                <SelectItem value="2">2° Trimestre</SelectItem>
                <SelectItem value="3">3° Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sifRaca} onValueChange={setSifRaca}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Raça/Cor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {RACAS_CORES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <KPICard title="Casos Detectados" value={String(sif.length)} subtitle="no filtro" icon={ShieldAlert} />
            <KPICard title="Tratamento Concluído" value={`${Math.round((sifConcluido / sifN) * 100)}%`} subtitle={`${sifConcluido} de ${sif.length}`} icon={ClipboardCheck} trend={sifConcluido === sif.length ? "up" : "down"} />
            <KPICard title="Detecção 1º Tri" value={`${sif.filter((c) => c.idadeGestacionalDeteccao <= 12).length}`} subtitle="≤12 semanas" icon={Calendar} />
          </div>

          {/* Treatment pie + Classification pie */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Status do Tratamento</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={sifTratPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                      {sifTratPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Classificação dos Casos</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={sifClassPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={12}>
                      {sifClassPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Indicators + Cases by Distrito */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Indicadores de Tratamento</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Indicator label="Tratamento iniciado" value={Math.round((sif.filter((c) => c.tratamentoIniciado).length / sifN) * 100)} target={100} />
                  <Indicator label="Tratamento concluído" value={Math.round((sifConcluido / sifN) * 100)} target={100} />
                  <Indicator label="Detecção precoce" value={Math.round((sif.filter((c) => c.idadeGestacionalDeteccao <= 12).length / sifN) * 100)} target={80} />
                </div>
              </CardContent>
            </Card>
            {sifDistritoData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Casos por Distrito Sanitário</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sifDistritoData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 250)" />
                      <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={120} />
                      <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Casos" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top UBS cards */}
          {(sifTopUbs.length > 0 || sifTopInad.length > 0) && (
            <div className="grid lg:grid-cols-2 gap-4">
              {sifTopUbs.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Top Unidades — Mais Casos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sifTopUbs.map((u, i) => (
                        <div key={u.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}°</span>
                            <span className="text-sm">{u.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{u.count} caso{u.count > 1 ? "s" : ""}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {sifTopInad.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Top Unidades — Tratamento Inadequado</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sifTopInad.map((u, i) => (
                        <div key={u.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}°</span>
                            <span className="text-sm">{u.name}</span>
                          </div>
                          <Badge variant="destructive" className="text-xs">{u.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Nominal list */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Lista Nominal — Casos de Sífilis</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gestante</TableHead>
                    <TableHead className="hidden md:table-cell">CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Distrito</TableHead>
                    <TableHead className="hidden lg:table-cell">Unidade</TableHead>
                    <TableHead className="hidden xl:table-cell">Equipe</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>IG Det.</TableHead>
                    <TableHead className="hidden md:table-cell">Detecção</TableHead>
                    <TableHead>Tratamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sif.map((c) => {
                    const g = MOCK_GESTANTES.find((x) => x.id === c.gestanteId);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link href={`/gestante/${c.gestanteId}`} className="hover:underline text-primary">{g?.nomeCompleto ?? c.gestanteId}</Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">{g?.cpf ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{g?.telefone ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{g ? getDistritoNome(g.endereco.distritoSanitarioId) : "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{g ? getUbsNome(g.ubsId) : "—"}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{g ? getEquipeNome(g.equipeId) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={c.classificacao === "recente" ? "default" : "secondary"} className="text-xs capitalize">{c.classificacao}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{c.idadeGestacionalDeteccao} sem</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmt(c.dataDeteccao)}</TableCell>
                        <TableCell>
                          {c.tratamentoConcluido
                            ? <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">{c.parceiroTratado ? "Adequado" : "Inadequado"}</Badge>
                            : c.tratamentoIniciado
                              ? <Badge variant="secondary" className="text-xs">Em curso</Badge>
                              : <Badge variant="destructive" className="text-xs">Não iniciado</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sif.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum caso encontrado para os filtros selecionados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
