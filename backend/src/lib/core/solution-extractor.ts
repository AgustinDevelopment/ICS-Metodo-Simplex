/**
 * Extracción de soluciones
 * Responsabilidad: Extraer variables y valores del tableau
 */

import { SimplexProblem, SimplexSolution, SimplexTableau } from '../../types/types';
import { roundSolution, DEFAULT_DECIMALS } from '../../utils';

export class SolutionExtractorService {
  extract(
    tableau: SimplexTableau,
    problem: SimplexProblem,
    iterations: SimplexTableau[]
  ): SimplexSolution {
    const variables = this.extractVariables(tableau, problem);
    const objectiveValue = this.calculateObjectiveValue(problem, variables);

    const solution: SimplexSolution = {
      optimal: true,
      bounded: true,
      variables,
      objectiveValue,
      iterations,
    };

    return roundSolution(solution, DEFAULT_DECIMALS) as SimplexSolution;
  }

  private extractVariables(tableau: SimplexTableau, problem: SimplexProblem): Map<string, number> {
    const variables = new Map<string, number>();
    const numVars = problem.variables.length;

    for (const variable of problem.variables) {
      variables.set(variable, 0);
    }

    for (let i = 0; i < tableau.basis.length; i++) {
      const varIndex = tableau.basis[i];
      if (varIndex < numVars) {
        const rhs = tableau.matrix[i][tableau.matrix[0].length - 1];
        variables.set(problem.variables[varIndex], rhs);
      }
    }

    return variables;
  }

  private calculateObjectiveValue(
    problem: SimplexProblem,
    variables: Map<string, number>
  ): number {
    let value = 0;
    for (const coef of problem.objective.coefficients) {
      value += coef.value * (variables.get(coef.variable) ?? 0);
    }
    return value;
  }
}
