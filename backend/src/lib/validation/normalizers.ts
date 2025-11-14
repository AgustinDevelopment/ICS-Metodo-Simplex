import { SimplexProblem, Operator } from '../../types/types';

/**
 * Normaliza restricciones >= a forma <=
 * Multiplica por -1 ambos lados de la desigualdad
 * @param problem - Problema a normalizar
 * @returns Problema con restricciones normalizadas
 */
export function normalizeToLEAndMax(problem: SimplexProblem): SimplexProblem {
  const normalizedConstraints = problem.constraints.map(constraint => {
    if (constraint.operator === '>=') {
      return {
        operator: '<=' as Operator,
        rightSide: -constraint.rightSide,
        coefficients: constraint.coefficients.map(coef => ({
          variable: coef.variable,
          value: -coef.value,
        })),
      };
    }
    return constraint;
  });

  return {
    ...problem,
    constraints: normalizedConstraints,
  };
}

/**
 * Verifica si el problema puede usar forma estándar directamente
 * Requisitos: todas las restricciones son <= con RHS >= 0
 * @param problem - Problema a verificar (debe estar normalizado)
 * @returns true si puede usar forma estándar
 */
export function canUseStandardForm(problem: SimplexProblem): boolean {
  return problem.constraints.every(
    constraint => constraint.operator === '<=' && constraint.rightSide >= 0
  );
}
