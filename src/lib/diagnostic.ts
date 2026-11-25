/**
 * Calculadoras del Centro de Diagnóstico (lógica pura, con pruebas). Mismas fórmulas del mockup:
 * - Horas perdidas: colaboradores × horas manuales por semana × semanas laborales; costo = horas × tarifa.
 * - Ahorro en costos: facturación × nivel de fricción; horas recuperables/mes = ahorro ÷ costo hora ÷ 12.
 */
export interface HoursInput {
  team: number;
  hours: number;
  rate: number;
  weeks?: number;
}

const atLeast1 = (n: number) => Math.max(1, Number(n) || 0);

export function hoursLost({ team, hours, rate, weeks = 48 }: HoursInput) {
  const annualHours = atLeast1(team) * atLeast1(hours) * weeks;
  return { annualHours, annualCost: annualHours * atLeast1(rate) };
}

export function costSavings(revenue: number, friction: number, hourCost = 24) {
  const savings = Math.round((Number(revenue) || 0) * (Number(friction) || 0));
  return { savings, monthlyHours: Math.round(savings / hourCost / 12) };
}

/** Formato del mockup: 4,320 h · $77,760 */
export const fmtNumber = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtMoney = (n: number, symbol = '$') => `${symbol}${fmtNumber(n)}`;
