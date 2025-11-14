/**
 * Preparación de tableaux
 * Responsabilidad: Crear tableaux iniciales y ejecutar Fase I
 */

import { SimplexProblem, SimplexError, SimplexTableau } from '../../types/types';
import { normalizeToLEAndMax, canUseStandardForm } from '../validation';
import {
  createInitialTableau,
  toMaximizationRow,
  findPivotColumn,
  findPivotRow,
  iterate,
  buildPhaseITableau,
  buildPhaseIISimplexTableau,
  isPhaseIFeasible,
  pivotOutArtificial,
} from '../operations';
import { PHASE1_MAX_ITERATIONS, cloneDeep } from '../../utils';

export interface TableauPreparation {
  tableau: SimplexTableau;
  normalized: SimplexProblem;
  phaseIIterations: SimplexTableau[] | null;
}

export class TableauPreparationService {
  prepare(problem: SimplexProblem): TableauPreparation | SimplexError {
    const normalized = normalizeToLEAndMax(problem);

    if (canUseStandardForm(normalized)) {
      return this.prepareStandardForm(normalized);
    }

    const phaseIResult = this.executePhaseI(problem);
    if (phaseIResult) {
      return phaseIResult;
    }

    return this.prepareBasic(problem);
  }

  private prepareStandardForm(normalized: SimplexProblem): TableauPreparation {
    const tableau = createInitialTableau(normalized);
    if (normalized.objective.type === 'min') {
      toMaximizationRow(tableau);
    }
    return { tableau, normalized, phaseIIterations: null };
  }

  private prepareBasic(problem: SimplexProblem): TableauPreparation {
    const tableau = createInitialTableau(problem);
    if (problem.objective.type === 'min') {
      toMaximizationRow(tableau);
    }
    return { tableau, normalized: problem, phaseIIterations: null };
  }

  private executePhaseI(problem: SimplexProblem): TableauPreparation | SimplexError | null {
    const phaseI = buildPhaseITableau(problem);
    if (!phaseI) return null;

    const phaseIIterations: SimplexTableau[] = [cloneDeep(phaseI.tableau)];
    let currentTableau = phaseI.tableau;
    let iterationCount = 0;

    while (iterationCount < PHASE1_MAX_ITERATIONS) {
      const pivotColumn = findPivotColumn(currentTableau);
      if (pivotColumn === -1) break;

      const pivotRow = findPivotRow(currentTableau, pivotColumn);
      if (pivotRow === -1) break;

      const entering = pivotColumn;
      const leaving = currentTableau.basis[pivotRow];
      currentTableau.basis[pivotRow] = entering;

      const nbIdx = currentTableau.nonBasis.indexOf(entering);
      if (nbIdx !== -1) {
        currentTableau.nonBasis[nbIdx] = leaving;
      }

      currentTableau = iterate(currentTableau, pivotRow, pivotColumn);
      phaseIIterations.push(cloneDeep(currentTableau));
      iterationCount++;
    }

    if (!isPhaseIFeasible(currentTableau)) {
      return {
        message: 'El problema no tiene solución posible (Fase I)',
        type: 'SIN_SOLUCION',
      } as SimplexError;
    }

    pivotOutArtificial(currentTableau, phaseI.artificialCols);
    const normalized = normalizeToLEAndMax(problem);
    const t2 = buildPhaseIISimplexTableau(problem, currentTableau);
    return { tableau: t2, normalized, phaseIIterations };
  }
}
