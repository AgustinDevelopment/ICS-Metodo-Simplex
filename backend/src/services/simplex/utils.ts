// Utilidades compartidas para manejo de precisión y resultados de Simplex.
import { SimplexError, SimplexSolution } from '../../types/types';

/*
 * Redondea un número a 'decimals' decimales (por defecto 6).
 */
export function round(value: number, decimals = 6): number {
  return +value.toFixed(decimals);
}

/*
 * Redondea los valores de la solución (variables y valor objetivo) respetando errores.
 */
export function roundSolution(result: SimplexSolution | SimplexError, decimals = 6): SimplexSolution | SimplexError {
  if ('type' in result) return result;
  const roundedVars = new Map<string, number>(
    Array.from(result.variables.entries()).map(([k, v]) => [k, +v.toFixed(decimals)])
  );
  return { ...result, variables: roundedVars, objectiveValue: +result.objectiveValue.toFixed(decimals) };
}

/*
 * Clona profundamente un tableau (uso acotado) mediante JSON.
 */
export function cloneDeepTableau<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}