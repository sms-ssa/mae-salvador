"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge } from "@/features/gestante/components";
import { Search, ChevronRight } from "lucide-react";
import { MOCK_GESTANTES, MOCK_CONSULTAS, MOCK_PROFISSIONAIS, UBS_LIST } from "@mae-salvador/shared";
import type { RiscoGestacional } from "@mae-salvador/shared";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function PainelPage() {
  const [search, setSearch] = useState("");
  const [riscoFilter, setRiscoFilter] = useState<string>("todos");

  const gestantes = useMemo(() => {
    return MOCK_GESTANTES.filter((g) => {
      const matchSearch =
        search === "" ||
        g.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
        g.cpf.includes(search);
      const matchRisco = riscoFilter === "todos" || g.riscoGestacional === riscoFilter;
      return matchSearch && matchRisco && g.ativa;
    });
  }, [search, riscoFilter]);

  function getUbsNome(ubsId: string) {
    return UBS_LIST.find((u) => u.id === ubsId)?.nome ?? ubsId;
  }

  function getUltimaConsulta(gestanteId: string) {
    const consultas = MOCK_CONSULTAS
      .filter((c) => c.gestanteId === gestanteId && c.status === "realizada")
      .sort((a, b) => b.data.localeCompare(a.data));
    return consultas[0]?.data;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel de Gestantes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {gestantes.length} gestante{gestantes.length !== 1 ? "s" : ""} ativa{gestantes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={riscoFilter} onValueChange={setRiscoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os riscos</SelectItem>
            <SelectItem value="habitual">Risco Habitual</SelectItem>
            <SelectItem value="alto">Alto Risco</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead>IG (sem)</TableHead>
                <TableHead className="hidden sm:table-cell">DPP</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="hidden lg:table-cell">UBS</TableHead>
                <TableHead className="hidden md:table-cell">Última consulta</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestantes.map((g) => (
                <TableRow key={g.id} className="group">
                  <TableCell>
                    <Link href={`/gestante/${g.id}`} className="font-medium hover:text-primary transition-colors">
                      {g.nomeCompleto}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm font-mono">
                    {g.cpf}
                  </TableCell>
                  <TableCell className="font-semibold">{g.idadeGestacionalSemanas}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(g.dpp)}
                  </TableCell>
                  <TableCell>
                    <RiskBadge risco={g.riscoGestacional} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {getUbsNome(g.ubsId)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {getUltimaConsulta(g.id) ? formatDate(getUltimaConsulta(g.id)!) : "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/gestante/${g.id}`}>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {gestantes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma gestante encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
