import { SimplexProblem, SimplexTableau } from '../../types/types';
import { iterate } from './tableau';

export function buildPhaseITableau(problem: SimplexProblem): { tableau: SimplexTableau, artificialCols: number[], rowArtificial: (number|null)[] } | null {
  const n = problem.variables.length;
  const m = problem.constraints.length;
  const rows = m + 1;

  const slackCols: number[] = [];
  const artificialCols: number[] = [];
  const surplusCols: number[] = [];
  let colIndex = n;

  const rowSlack: (number | null)[] = new Array(m).fill(null);
  const rowArtificial: (number | null)[] = new Array(m).fill(null);
  const rowSurplus: (number | null)[] = new Array(m).fill(null);

  for (let i = 0; i < m; i++) {
    const op = problem.constraints[i].operator;
    if (op === '<=') {
      rowSlack[i] = colIndex; slackCols.push(colIndex); colIndex++;
    } else if (op === '>=') {
      rowSurplus[i] = colIndex; surplusCols.push(colIndex); colIndex++;
      rowArtificial[i] = colIndex; artificialCols.push(colIndex); colIndex++;
    } else {
      rowArtificial[i] = colIndex; artificialCols.push(colIndex); colIndex++;
    }
  }

  const cols = colIndex + 1;
  if (artificialCols.length === 0) return null;

  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < m; i++) {
    const cons = problem.constraints[i];
    for (const coef of cons.coefficients) {
      const idx = problem.variables.indexOf(coef.variable);
      if (idx >= 0) matrix[i][idx] = coef.value;
    }
    if (rowSlack[i] !== null) matrix[i][rowSlack[i]!] = 1;
    if (rowSurplus[i] !== null) matrix[i][rowSurplus[i]!] = -1;
    if (rowArtificial[i] !== null) matrix[i][rowArtificial[i]!] = 1;
    matrix[i][cols - 1] = cons.rightSide;
  }

  for (const aCol of artificialCols) matrix[rows - 1][aCol] = -1;

  for (let i = 0; i < m; i++) {
    const aCol = rowArtificial[i];
    if (aCol !== null) {
      for (let j = 0; j < cols; j++) {
        matrix[rows - 1][j] += matrix[i][j];
      }
    }
  }

  const basis: number[] = [];
  for (let i = 0; i < m; i++) {
    if (rowSlack[i] !== null) basis.push(rowSlack[i]!);
    else if (rowArtificial[i] !== null) basis.push(rowArtificial[i]!);
    else basis.push(0);
  }

  const nonBasis: number[] = [];
  for (let j = 0; j < cols - 1; j++) {
    if (!basis.includes(j)) nonBasis.push(j);
  }

  const objectiveRow = [...matrix[rows - 1]];
  return { tableau: { matrix, basis, nonBasis, objectiveRow }, artificialCols, rowArtificial };
}

export function pivotOutArtificial(tableau: SimplexTableau, artificialCols: number[]): void {
  const rows = tableau.matrix.length - 1;
  const cols = tableau.matrix[0].length - 1;
  const isArtificial = (col: number) => artificialCols.includes(col);

  for (let i = 0; i < tableau.basis.length; i++) {
    const b = tableau.basis[i];
    if (isArtificial(b)) {
      let enterCol = -1;
      for (let j = 0; j < cols; j++) {
        if (!isArtificial(j) && Math.abs(tableau.matrix[i][j]) > 1e-9) {
          enterCol = j; break;
        }
      }
      if (enterCol !== -1) {
        tableau.basis[i] = enterCol;
        const idxNB = tableau.nonBasis.indexOf(enterCol);
        if (idxNB !== -1) tableau.nonBasis[idxNB] = b;
        iterate(tableau, i, enterCol);
      }
    }
  }
}

export function buildPhaseIISimplexTableau(problem: SimplexProblem, phaseITableau: SimplexTableau): SimplexTableau {
  const tableau: SimplexTableau = JSON.parse(JSON.stringify(phaseITableau));
  const rows = tableau.matrix.length;
  const cols = tableau.matrix[0].length;
  const lastRow = rows - 1;

  const objectiveRow = new Array(cols).fill(0);
  for (const coef of problem.objective.coefficients) {
    const varIndex = problem.variables.indexOf(coef.variable);
    if (varIndex >= 0) {
      objectiveRow[varIndex] = problem.objective.type === 'max' ? -coef.value : coef.value;
    }
  }

  for (let i = 0; i < tableau.basis.length; i++) {
    const b = tableau.basis[i];
    const factor = objectiveRow[b];
    if (Math.abs(factor) > 1e-12) {
      for (let j = 0; j < cols; j++) {
        objectiveRow[j] -= factor * tableau.matrix[i][j];
      }
    }
  }

  if (problem.objective.type === 'min') {
    for (let j = 0; j < cols; j++) objectiveRow[j] = -objectiveRow[j];
  }

  tableau.matrix[lastRow] = objectiveRow;
  tableau.objectiveRow = [...objectiveRow];
  return tableau;
}