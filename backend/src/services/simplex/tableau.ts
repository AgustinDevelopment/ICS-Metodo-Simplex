import { SimplexProblem, SimplexTableau } from '../../types/types';

export function createInitialTableau(problem: SimplexProblem): SimplexTableau {
  const numConstraints = problem.constraints.length;
  const numVars = problem.variables.length;
  const numSlackVars = numConstraints;
  const totalVars = numVars + numSlackVars;

  const matrix: number[][] = [];
  for (let i = 0; i <= numConstraints; i++) matrix.push(new Array(totalVars + 1).fill(0));

  for (let i = 0; i < numConstraints; i++) {
    const constraint = problem.constraints[i];
    for (const coef of constraint.coefficients) {
      const varIndex = problem.variables.indexOf(coef.variable);
      if (varIndex !== -1) matrix[i][varIndex] = coef.value;
    }
    matrix[i][numVars + i] = constraint.operator === '<=' ? 1 : -1;
    matrix[i][totalVars] = constraint.rightSide;
  }

  const isMaximization = problem.objective.type === 'max';
  const objectiveMultiplier = isMaximization ? -1 : 1;
  for (const coef of problem.objective.coefficients) {
    const varIndex = problem.variables.indexOf(coef.variable);
    if (varIndex !== -1) matrix[numConstraints][varIndex] = objectiveMultiplier * coef.value;
  }

  const basis: number[] = [];
  for (let i = 0; i < numConstraints; i++) basis.push(numVars + i);

  const nonBasis: number[] = [];
  for (let i = 0; i < numVars; i++) nonBasis.push(i);

  const objectiveRow = [...matrix[numConstraints]];

  return { matrix, basis, nonBasis, objectiveRow };
}

export function findPivotColumn(tableau: SimplexTableau): number {
  const objectiveRow = tableau.matrix[tableau.matrix.length - 1];
  const lastColIndex = objectiveRow.length - 1;
  let minValue = 0;
  let minIndex = -1;
  for (let j = 0; j < lastColIndex; j++) {
    if (objectiveRow[j] < minValue) {
      minValue = objectiveRow[j];
      minIndex = j;
    }
  }
  return minIndex;
}

export function findPivotRow(tableau: SimplexTableau, pivotColumn: number): number {
  const lastColIndex = tableau.matrix[0].length - 1;
  let minRatio = Infinity;
  let minIndex = -1;
  for (let i = 0; i < tableau.matrix.length - 1; i++) {
    if (tableau.matrix[i][pivotColumn] > 0) {
      const ratio = tableau.matrix[i][lastColIndex] / tableau.matrix[i][pivotColumn];
      if (ratio >= 0 && ratio < minRatio) {
        minRatio = ratio;
        minIndex = i;
      }
    }
  }
  return minIndex;
}

export function iterate(tableau: SimplexTableau, pivotRow: number, pivotColumn: number): SimplexTableau {
  const numRows = tableau.matrix.length;
  const numCols = tableau.matrix[0].length;
  const pivotValue = tableau.matrix[pivotRow][pivotColumn];

  for (let j = 0; j < numCols; j++) tableau.matrix[pivotRow][j] /= pivotValue;

  for (let i = 0; i < numRows; i++) {
    if (i !== pivotRow) {
      const factor = tableau.matrix[i][pivotColumn];
      for (let j = 0; j < numCols; j++) {
        tableau.matrix[i][j] -= factor * tableau.matrix[pivotRow][j];
      }
    }
  }
  return tableau;
}

export function runSimplex(start: SimplexTableau, maxIterations: number): { tableau: SimplexTableau } {
  let tableau: SimplexTableau = JSON.parse(JSON.stringify(start));
  let it = 0;
  while (it < maxIterations) {
    const pivotColumn = findPivotColumn(tableau);
    if (pivotColumn === -1) break;
    const pivotRow = findPivotRow(tableau, pivotColumn);
    if (pivotRow === -1) break;
    const entering = tableau.nonBasis[pivotColumn];
    const leaving = tableau.basis[pivotRow];
    tableau.basis[pivotRow] = entering;
    tableau.nonBasis[pivotColumn] = leaving;
    tableau = iterate(tableau, pivotRow, pivotColumn);
    it++;
  }
  return { tableau };
}