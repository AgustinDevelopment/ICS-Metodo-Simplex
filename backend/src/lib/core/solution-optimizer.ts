/**
 * Optimización de soluciones
 * Responsabilidad: Mejorar soluciones con enumeración de vértices
 */

import { SimplexProblem, SimplexSolution } from '../../types/types';
import { solveByVertexEnumeration } from '../solvers';
import { roundSolution, DEFAULT_DECIMALS, EPS } from '../../utils';

export class SolutionOptimizerService {
  tryVertexEnumeration(problem: SimplexProblem): SimplexSolution | null {
    if (problem.variables.length !== 2) {
      return null;
    }

    const enumResult = solveByVertexEnumeration(problem);
    if (enumResult && !('type' in enumResult)) {
      return roundSolution(enumResult, DEFAULT_DECIMALS) as SimplexSolution;
    }

    return null;
  }

  crossCheckWith2D(
    problem: SimplexProblem,
    currentSolution: SimplexSolution
  ): SimplexSolution | null {
    if (problem.variables.length !== 2) {
      return null;
    }

    const enumResult = solveByVertexEnumeration(problem);

    if (!enumResult || 'type' in enumResult) {
      return null;
    }

    const isBetter =
      problem.objective.type === 'max'
        ? enumResult.objectiveValue > currentSolution.objectiveValue + EPS
        : enumResult.objectiveValue < currentSolution.objectiveValue - EPS;

    if (isBetter) {
      const improvedSolution: SimplexSolution = {
        optimal: enumResult.optimal,
        bounded: enumResult.bounded,
        variables: enumResult.variables,
        objectiveValue: enumResult.objectiveValue,
        iterations: currentSolution.iterations,
      };
      return roundSolution(improvedSolution, DEFAULT_DECIMALS) as SimplexSolution;
    }

    return null;
  }
}
