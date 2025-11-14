/**
 * Formateadores de resultados del Simplex
 * Transformaciones y normalización de soluciones
 */

import { SimplexError, SimplexSolution } from '../types/types';
import { round } from './math-helpers';
import { DEFAULT_DECIMALS } from './constants';

/**
 * Redondea los valores de una solución Simplex
 * @param result - Solución o error a redondear
 * @param decimals - Cantidad de decimales
 * @returns Solución redondeada o error sin modificar
 */
export function roundSolution(
  result: SimplexSolution | SimplexError,
  decimals = DEFAULT_DECIMALS
): SimplexSolution | SimplexError {
  if ('type' in result) {
    return result;
  }

  const roundedVars = new Map<string, number>(
    Array.from(result.variables.entries()).map(([key, value]) => [
      key,
      round(value, decimals),
    ])
  );

  return {
    optimal: result.optimal,
    bounded: result.bounded,
    variables: roundedVars,
    objectiveValue: round(result.objectiveValue, decimals),
    iterations: result.iterations,
  };
}
