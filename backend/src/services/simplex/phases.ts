// Utilidades de fases del método Simplex: construir Fase I, sacar artificiales y armar Fase II.
import { SimplexProblem, SimplexTableau } from '../../types/types';
import { iterate } from './tableau';
import { MIN_EPS, EPS } from './constants';

// =====================
// Helpers internos
// =====================

function computeAuxiliaryColumns(problem: SimplexProblem) {
  const n = problem.variables.length;
  const m = problem.constraints.length;

  const rowSlack: (number | null)[] = new Array(m).fill(null);
  const rowArtificial: (number | null)[] = new Array(m).fill(null);
  const rowSurplus: (number | null)[] = new Array(m).fill(null);
  const artificialCols: number[] = [];

  let colIndex = n;
  for (let i = 0; i < m; i++) {
    const op = problem.constraints[i].operator;
    if (op === '<=') {
      rowSlack[i] = colIndex; colIndex++;
    } else if (op === '>=') {
      rowSurplus[i] = colIndex; colIndex++;
      rowArtificial[i] = colIndex; artificialCols.push(colIndex); colIndex++;
    } else { // '=' o caso general
      rowArtificial[i] = colIndex; artificialCols.push(colIndex); colIndex++;
    }
  }

  const cols = colIndex + 1; // + RHS
  const rows = m + 1; // + fila objetivo
  return { rows, cols, rowSlack, rowArtificial, rowSurplus, artificialCols };
}

function buildConstraintMatrix(problem: SimplexProblem, rows: number, cols: number,
  rowSlack: (number | null)[], rowSurplus: (number | null)[], rowArtificial: (number | null)[]) {
  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const m = problem.constraints.length;

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
  return matrix;
}

function buildPhaseIObjectiveRow(matrix: number[][], rows: number, cols: number,
  artificialCols: number[], rowArtificial: (number | null)[]) {
  // Inicializar fila objetivo con -1 en columnas artificiales
  for (const aCol of artificialCols) matrix[rows - 1][aCol] = -1;

  // Sumar filas que contienen artificiales para lograr forma inicial factible
  const m = rows - 1;
  for (let i = 0; i < m; i++) {
    if (rowArtificial[i] !== null) {
      for (let j = 0; j < cols; j++) matrix[rows - 1][j] += matrix[i][j];
    }
  }

  // FIX: invertir signo para que la fila represente -w (RHS ≈ -∑b en la BFS inicial)
  for (let j = 0; j < cols; j++) {
    matrix[rows - 1][j] = -matrix[rows - 1][j];
  }
}

function buildInitialBasis(rowSlack: (number | null)[], rowArtificial: (number | null)[]) {
  const basis: number[] = [];
  const m = rowSlack.length;
  for (let i = 0; i < m; i++) {
    if (rowSlack[i] !== null) basis.push(rowSlack[i]!);
    else if (rowArtificial[i] !== null) basis.push(rowArtificial[i]!);
    else basis.push(0);
  }
  return basis;
}

function buildNonBasis(cols: number, basis: number[]) {
  const nonBasis: number[] = [];
  for (let j = 0; j < cols - 1; j++) { // todas menos RHS
    if (!basis.includes(j)) nonBasis.push(j);
  }
  return nonBasis;
}

/*
 * Determina si la Fase I es factible (valor -w en RHS cercano a 0 o mayor).
 */
export function isPhaseIFeasible(phaseITableau: SimplexTableau): boolean {
  const lastRow = phaseITableau.matrix.length - 1;
  const rhs = phaseITableau.matrix[0].length - 1;
  const value = phaseITableau.matrix[lastRow][rhs];
  return value >= -EPS; // tolerancia pequeña centralizada
}

/*
 * Construye el tableau de Fase I para el problema dado.
 * Devuelve null si no se necesitan variables artificiales (no hace falta Fase I).
 * Retorna: { tableau, artificialCols, rowArtificial } o null si no hay artificiales.
 */
export function buildPhaseITableau(problem: SimplexProblem): { tableau: SimplexTableau, artificialCols: number[], rowArtificial: (number|null)[] } | null {
  const { rows, cols, rowSlack, rowArtificial, rowSurplus, artificialCols } = computeAuxiliaryColumns(problem);
  if (artificialCols.length === 0) return null;

  const matrix = buildConstraintMatrix(problem, rows, cols, rowSlack, rowSurplus, rowArtificial);
  buildPhaseIObjectiveRow(matrix, rows, cols, artificialCols, rowArtificial);

  const basis = buildInitialBasis(rowSlack, rowArtificial);
  const nonBasis = buildNonBasis(cols, basis);
  const objectiveRow = [...matrix[rows - 1]];
  return { tableau: { matrix, basis, nonBasis, objectiveRow }, artificialCols, rowArtificial };
}

/*
 * Intenta pivotear las variables artificiales para sacarlas de la base
 * una vez finalizada la Fase I.
 * Parámetros: tableau de Fase I y las columnas artificiales.
 */
export function pivotOutArtificial(tableau: SimplexTableau, artificialCols: number[]): void {
  const cols = tableau.matrix[0].length - 1;
  const isArtificial = (col: number) => artificialCols.includes(col);

  const findEnteringCol = (rowIdx: number): number => {
    for (let j = 0; j < cols; j++) {
      if (!isArtificial(j) && Math.abs(tableau.matrix[rowIdx][j]) > EPS) return j;
    }
    return -1;
  };

  for (let i = 0; i < tableau.basis.length; i++) {
    const b = tableau.basis[i];
    if (!isArtificial(b)) continue;
    const enterCol = findEnteringCol(i);
    if (enterCol === -1) continue;
    tableau.basis[i] = enterCol;
    const idxNB = tableau.nonBasis.indexOf(enterCol);
    if (idxNB !== -1) tableau.nonBasis[idxNB] = b;
    iterate(tableau, i, enterCol);
  }
}

/*
 * Construye el tableau de Fase II usando la función objetivo original
 * y la base actual, llevando la fila objetivo a forma reducida.
 * Retorna un nuevo tableau listo para continuar con Simplex.
 */
export function buildPhaseIISimplexTableau(problem: SimplexProblem, phaseITableau: SimplexTableau): SimplexTableau {
  const tableau: SimplexTableau = JSON.parse(JSON.stringify(phaseITableau));
  const rows = tableau.matrix.length;
  const cols = tableau.matrix[0].length;
  const lastRow = rows - 1;

  const objectiveRow = new Array(cols).fill(0);
  for (const coef of problem.objective.coefficients) {
    const varIndex = problem.variables.indexOf(coef.variable);
    if (varIndex >= 0) {
      // Siempre armar como maximización (costes reducidos negativos buscados)
      objectiveRow[varIndex] = -coef.value;
    }
  }

  for (let i = 0; i < tableau.basis.length; i++) {
    const b = tableau.basis[i];
    const factor = objectiveRow[b];
    if (Math.abs(factor) > MIN_EPS) {
      for (let j = 0; j < cols; j++) {
        objectiveRow[j] -= factor * tableau.matrix[i][j];
      }
    }
  }

  tableau.matrix[lastRow] = objectiveRow;
  tableau.objectiveRow = [...objectiveRow];
  return tableau;
}