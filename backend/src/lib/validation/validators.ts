import { SimplexProblem, Coefficient, Operator } from '../../types/types';

export type ValidationResult = true | 'SIN_SOLUCION' | 'ENTRADA_INVALIDA';

/**
 * Valida un problema de programación lineal
 * @param problem - Problema a validar
 * @returns true si es válido, 'SIN_SOLUCION' si es infactible, 'ENTRADA_INVALIDA' si tiene errores de formato
 */
export function validateProblem(problem: SimplexProblem): ValidationResult {
  // Validar estructura básica
  if (!problem.objective || !problem.constraints || problem.constraints.length === 0) {
    return 'ENTRADA_INVALIDA';
  }

  // Solo soportamos 2 variables
  if (problem.variables.length !== 2) {
    return 'ENTRADA_INVALIDA';
  }

  // Detectar infactibilidad obvia
  if (hasObviousInfeasibility(problem)) {
    return 'SIN_SOLUCION';
  }

  // Detectar contradicciones entre restricciones
  if (hasDirectContradictions(problem)) {
    return 'SIN_SOLUCION';
  }

  return true;
}

/**
 * Detecta infactibilidad obvia en restricciones
 * Ejemplo: -x1 -x2 >= 5 es imposible si todas las variables son no negativas
 */
function hasObviousInfeasibility(problem: SimplexProblem): boolean {
  for (const constraint of problem.constraints) {
    // Si RHS es negativo y todos los coeficientes son positivos/cero
    if (constraint.rightSide < 0) {
      const allNonNegative = constraint.coefficients.every(coef => coef.value >= 0);
      if (allNonNegative) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detecta contradicciones directas entre restricciones con los mismos coeficientes
 * Ejemplo: 2x1 + 3x2 <= 5 y 2x1 + 3x2 >= 10
 */
export function hasDirectContradictions(problem: SimplexProblem): boolean {
  const groupedConstraints = groupConstraintsByCoefficients(problem);

  for (const group of groupedConstraints.values()) {
    if (hasContradictionInGroup(group)) {
      return true;
    }
  }

  return false;
}

interface ConstraintGroup {
  leq: number[];  // valores de RHS para restricciones <=
  geq: number[];  // valores de RHS para restricciones >=
  eq: number[];   // valores de RHS para restricciones =
}

/**
 * Agrupa restricciones por sus coeficientes normalizados
 */
function groupConstraintsByCoefficients(problem: SimplexProblem): Map<string, ConstraintGroup> {
  const groups = new Map<string, ConstraintGroup>();

  for (const constraint of problem.constraints) {
    const key = createCoefficientsKey(problem.variables, constraint.coefficients);
    const group = getOrCreateGroup(groups, key);
    addConstraintToGroup(group, constraint.operator, constraint.rightSide);
  }

  return groups;
}

/**
 * Crea una clave única para un conjunto de coeficientes
 */
function createCoefficientsKey(variables: string[], coefficients: Coefficient[]): string {
  const vector = coefficientVector(variables, coefficients);
  return vector.map(v => v.toFixed(8)).join('|');
}

/**
 * Convierte lista de coeficientes a vector ordenado según variables
 */
export function coefficientVector(vars: string[], coefs: Coefficient[]): number[] {
  const vec = new Array(vars.length).fill(0);
  for (const coef of coefs) {
    const idx = vars.indexOf(coef.variable);
    if (idx >= 0) {
      vec[idx] = coef.value;
    }
  }
  return vec;
}

/**
 * Obtiene o crea un grupo de restricciones
 */
function getOrCreateGroup(groups: Map<string, ConstraintGroup>, key: string): ConstraintGroup {
  let group = groups.get(key);
  if (!group) {
    group = { leq: [], geq: [], eq: [] };
    groups.set(key, group);
  }
  return group;
}

/**
 * Añade una restricción a su grupo correspondiente
 */
function addConstraintToGroup(group: ConstraintGroup, operator: Operator, rhs: number): void {
  switch (operator) {
    case '<=':
      group.leq.push(rhs);
      break;
    case '>=':
      group.geq.push(rhs);
      break;
    case '=':
      group.eq.push(rhs);
      break;
  }
}

/**
 * Verifica si un grupo de restricciones tiene contradicciones
 */
function hasContradictionInGroup(group: ConstraintGroup): boolean {
  const minLEQ = group.leq.length > 0 ? Math.min(...group.leq) : Number.POSITIVE_INFINITY;
  const maxGEQ = group.geq.length > 0 ? Math.max(...group.geq) : Number.NEGATIVE_INFINITY;

  // Verificar igualdades fuera del rango permitido
  for (const eqValue of group.eq) {
    if (eqValue > minLEQ || eqValue < maxGEQ) {
      return true;
    }
  }

  // Verificar rango incompatible entre <= y >=
  return maxGEQ > minLEQ;
}
