// Preprocesamiento y validaciones para problemas de PL antes de correr Simplex.
import { Coefficient, Operator, SimplexProblem } from '../../types/types';

/*
 * Valida el problema.
 * - true: válido
 * - 'SIN_SOLUCION': inviabilidad evidente
 * - false: formato inválido
 */
export function validateProblem(problem: SimplexProblem): true | 'SIN_SOLUCION' | false {
  if (!problem.objective || !problem.constraints || problem.constraints.length === 0) {
    return false;
  }
  if (problem.variables.length !== 2) {
    return false;
  }
  for (const constraint of problem.constraints) {
    if (constraint.rightSide < 0) {
      const allPositive = constraint.coefficients.every(coef => coef.value >= 0);
      if (allPositive) {
        return 'SIN_SOLUCION';
      }
    }
  }
  if (hasDirectContradictions(problem)) {
    return 'SIN_SOLUCION';
  }
  return true;
}

/*
 * Detecta contradicciones directas entre restricciones equivalentes (mismos coeficientes).
 * Ejemplo: a<=b y a>=c con c>b; o a=rhs fuera de [maxGEQ, minLEQ].
 */
export function hasDirectContradictions(problem: SimplexProblem): boolean {
  type Bucket = { leq: number[]; geq: number[]; eq: number[]; };
  const map = new Map<string, Bucket>();

  for (const cons of problem.constraints) {
    const vec = coefficientVector(problem.variables, cons.coefficients);
    const key = vec.map(v => v.toFixed(8)).join('|');

    if (!map.has(key)) map.set(key, { leq: [], geq: [], eq: [] });
    const bucket = map.get(key)!;

    if (cons.operator === '<=') bucket.leq.push(cons.rightSide);
    else if (cons.operator === '>=') bucket.geq.push(cons.rightSide);
    else bucket.eq.push(cons.rightSide);
  }

  for (const bucket of map.values()) {
    const minLEQ = bucket.leq.length ? Math.min(...bucket.leq) : +Infinity;
    const maxGEQ = bucket.geq.length ? Math.max(...bucket.geq) : -Infinity;

    for (const rhsEq of bucket.eq) {
      if (rhsEq > minLEQ || rhsEq < maxGEQ) return true;
    }
    if (maxGEQ > minLEQ) return true;
  }
  return false;
}

/*
 * Convierte lista de coeficientes a un vector ordenado según la lista de variables.
 */
export function coefficientVector(vars: string[], coefs: Coefficient[]): number[] {
  const vec = new Array(vars.length).fill(0);
  for (const c of coefs) {
    const idx = vars.indexOf(c.variable);
    if (idx >= 0) vec[idx] = c.value;
  }
  return vec;
}

/*
 * Normaliza restricciones a la forma "<=" y mantiene el resto intacto.
 * Útil para heurísticas y uniformidad de entradas.
 */
export function normalizeToLEAndMax(problem: SimplexProblem): SimplexProblem {
  const constraints: { operator: Operator; rightSide: number; coefficients: Coefficient[] }[] =
    problem.constraints.map(c => {
      if (c.operator === '>=') {
        return {
          operator: '<=',
          rightSide: -c.rightSide,
          coefficients: c.coefficients.map(k => ({ variable: k.variable, value: -k.value }))
        };
      }
      return { operator: c.operator, rightSide: c.rightSide, coefficients: c.coefficients };
    });
  return { ...problem, constraints } as SimplexProblem;
}

/*
 * Indica si puede usarse la forma estándar directamente (todas <= y RHS >= 0).
 * Se recomienda llamar con el problema ya normalizado a <=.
 */
export function canUseStandardForm(problem: SimplexProblem): boolean {
  return problem.constraints.every(c => c.operator === '<=' && c.rightSide >= 0);
}