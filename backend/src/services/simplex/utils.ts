import { SimplexError, SimplexSolution } from '../../types/types';

export function round(value: number, decimals = 6): number {
  return +value.toFixed(decimals);
}

export function roundSolution(result: SimplexSolution | SimplexError, decimals = 6): SimplexSolution | SimplexError {
  if ('type' in result) return result;
  const roundedVars = new Map<string, number>(
    Array.from(result.variables.entries()).map(([k, v]) => [k, +v.toFixed(decimals)])
  );
  return { ...result, variables: roundedVars, objectiveValue: +result.objectiveValue.toFixed(decimals) };
}