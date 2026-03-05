import type { CitizenDto } from "@mae-salvador/shared";

/**
 * Interface comum para providers de cidadão (e-SUS ou SOAP).
 * Permite orquestrar a busca: e-SUS primeiro, depois CADSUS SOAP.
 */
export type ICitizenProvider = {
  getCitizenByCpfOrCns(document: string): Promise<CitizenDto | null>;
};
