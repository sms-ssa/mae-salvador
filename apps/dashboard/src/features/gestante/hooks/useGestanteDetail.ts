"use client";

import { useMemo } from "react";
import {
  MOCK_GESTANTES,
  MOCK_CONSULTAS,
  MOCK_EXAMES,
  MOCK_VACINAS,
  MOCK_MEDICACOES,
  MOCK_TRANSCARD,
  MOCK_ATIVIDADES_EDUCATIVAS,
  MOCK_VISITAS_MATERNIDADE,
  MOCK_PROFISSIONAIS,
  UBS_LIST,
} from "@mae-salvador/shared";
import type { Gestante } from "@mae-salvador/shared";

export function formatGestanteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function useGestanteDetail(gestanteId: string | undefined) {
  return useMemo(() => {
    if (!gestanteId) {
      return {
        gestante: null,
        consultas: [],
        exames: [],
        vacinas: [],
        medicacoes: [],
        transcard: undefined,
        atividades: [],
        visitas: [],
        consultasRealizadas: 0,
        testesRapidosFeitos: false,
        vacinasAtualizadas: false,
        getUbsNome: (_: string) => "",
        getProfNome: (_: string) => "",
        fmt: formatGestanteDate,
      };
    }

    const gestante = MOCK_GESTANTES.find((g) => g.id === gestanteId) ?? null;
    const consultas = MOCK_CONSULTAS.filter((c) => c.gestanteId === gestanteId).sort((a, b) =>
      b.data.localeCompare(a.data)
    );
    const exames = MOCK_EXAMES.filter((e) => e.gestanteId === gestanteId).sort((a, b) =>
      b.dataSolicitacao.localeCompare(a.dataSolicitacao)
    );
    const vacinas = MOCK_VACINAS.filter((v) => v.gestanteId === gestanteId);
    const medicacoes = MOCK_MEDICACOES.filter((m) => m.gestanteId === gestanteId);
    const transcard = MOCK_TRANSCARD.find((t) => t.gestanteId === gestanteId);
    const atividades = MOCK_ATIVIDADES_EDUCATIVAS.filter((a) => a.gestanteId === gestanteId).sort(
      (a, b) => b.data.localeCompare(a.data)
    );
    const visitas = MOCK_VISITAS_MATERNIDADE.filter((v) => v.gestanteId === gestanteId).sort((a, b) =>
      b.data.localeCompare(a.data)
    );

    const consultasRealizadas = consultas.filter((c) => c.status === "realizada").length;
    const testesRapidosFeitos =
      exames.some(
        (e) => e.nome.toLowerCase().includes("sífilis") && e.status === "resultado-disponivel"
      ) &&
      exames.some((e) => e.nome.toLowerCase().includes("hiv") && e.status === "resultado-disponivel");
    const vacinasAtualizadas = vacinas.filter((v) => v.status === "aplicada").length >= 2;

    function getUbsNome(ubsId: string): string {
      return UBS_LIST.find((u) => u.id === ubsId)?.nome ?? ubsId;
    }

    function getProfNome(profId: string): string {
      return MOCK_PROFISSIONAIS.find((p) => p.id === profId)?.nomeCompleto ?? profId;
    }

    return {
      gestante,
      consultas,
      exames,
      vacinas,
      medicacoes,
      transcard,
      atividades,
      visitas,
      consultasRealizadas,
      testesRapidosFeitos,
      vacinasAtualizadas,
      getUbsNome,
      getProfNome,
      fmt: formatGestanteDate,
    };
  }, [gestanteId]);
}
