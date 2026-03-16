function onlyDigits(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

/**
 * Valida o Cartão Nacional de Saúde (CNS).
 *
 * Regras:
 * - Deve ter exatamente 15 dígitos.
 * - Tipo 1 (inicia com 1 ou 2): derivado de CPF (11 dígitos) + sufixo "000"/"001" + DV.
 * - Tipo 2 (inicia com 7, 8 ou 9): soma ponderada dos 15 dígitos (pesos 15..1) deve ser divisível por 11.
 */
export function validateCNS(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 15) return false;

  const first = d.charCodeAt(0) - 48;
  if (first === 1 || first === 2) {
    // Regra oficial (CNS iniciado com 1 ou 2):
    // - Considera os 11 primeiros dígitos (PIS/PASEP/CPF derivado)
    // - Calcula soma ponderada com pesos 15..5
    // - Calcula DV conforme regra, gerando sufixo "000" ou "001" e um dígito final.
    const base11 = d.slice(0, 11);
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += (base11.charCodeAt(i) - 48) * (15 - i);
    }
    let dv = 11 - (sum % 11);
    if (dv === 11) dv = 0;

    let expected: string;
    if (dv === 10) {
      // Ajuste: quando DV = 10, soma-se 2 e usa sufixo 001
      const sum2 = sum + 2;
      let dv2 = 11 - (sum2 % 11);
      if (dv2 === 11) dv2 = 0;
      expected = `${base11}001${dv2}`;
    } else {
      expected = `${base11}000${dv}`;
    }
    return d === expected;
  }

  if (first === 7 || first === 8 || first === 9) {
    // Regra: pesos 15..1 e soma divisível por 11
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += (d.charCodeAt(i) - 48) * (15 - i);
    }
    return sum % 11 === 0;
  }

  return false;
}

