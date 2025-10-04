import { Coefficient, Operator, SimplexProblem } from '../../types/types';

// Valida el problema. Retorna: true (válido), 'SIN_SOLUCION' (inviable) o false (inválido)
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

// Detección de contradicciones directas
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

export function coefficientVector(vars: string[], coefs: Coefficient[]): number[] {
  const vec = new Array(vars.length).fill(0);
  for (const c of coefs) {
    const idx = vars.indexOf(c.variable);
    if (idx >= 0) vec[idx] = c.value;
  }
  return vec;
}

// Convierte todas las restricciones a "<=" (multiplicando por -1 si eran ">=")
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