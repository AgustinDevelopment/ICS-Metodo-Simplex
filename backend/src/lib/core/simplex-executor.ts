/**
 * Ejecución del algoritmo Simplex
 * Responsabilidad: Ejecutar el bucle principal del Simplex
 */

import { SimplexProblem, SimplexError, SimplexTableau } from '../../types/types';
import { findPivotColumn, findPivotRow, iterate } from '../operations';
import { DEFAULT_MAX_ITERATIONS, EPS, cloneDeep } from '../../utils';

export interface SimplexExecutionResult {
  tableau: SimplexTableau;
  iterations: SimplexTableau[];
}

export class SimplexExecutorService {
  execute(
    startTableau: SimplexTableau,
    problem: SimplexProblem
  ): SimplexExecutionResult | SimplexError {
    let current = startTableau;
    const iterations: SimplexTableau[] = [cloneDeep(current)];
    let iterationCount = 0;

    while (iterationCount < DEFAULT_MAX_ITERATIONS) {
      const pivotColumn = findPivotColumn(current);

      if (pivotColumn === -1) {
        break;
      }

      const pivotRow = findPivotRow(current, pivotColumn);

      if (pivotRow === -1) {
        if (this.isUnbounded(current, problem)) {
          return {
            message: 'El problema no tiene solución acotada',
            type: 'NO_ACOTADA',
          } as SimplexError;
        }
        break;
      }

      const entering = pivotColumn;
      const leaving = current.basis[pivotRow];
      current.basis[pivotRow] = entering;

      const nbIdx = current.nonBasis.indexOf(entering);
      if (nbIdx !== -1) {
        current.nonBasis[nbIdx] = leaving;
      }

      current = iterate(current, pivotRow, pivotColumn);
      iterations.push(cloneDeep(current));
      iterationCount++;
    }

    if (iterationCount === DEFAULT_MAX_ITERATIONS) {
      return {
        message: 'El algoritmo no convergió',
        type: 'ENTRADA_INVALIDA',
      } as SimplexError;
    }

    return { tableau: current, iterations };
  }

  private isUnbounded(tableau: SimplexTableau, problem: SimplexProblem): boolean {
    const objectiveRow = tableau.matrix[tableau.matrix.length - 1];
    const numOriginalVars = problem.variables.length;
    return objectiveRow.slice(0, numOriginalVars).some((v: number) => v < -EPS);
  }
}
