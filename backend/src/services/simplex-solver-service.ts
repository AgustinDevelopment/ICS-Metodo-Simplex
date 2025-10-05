import { SimplexProblem, SimplexSolution, SimplexTableau, SimplexError, Coefficient, Operator } from '../types/types';
// Delegaciones hacia módulos especializados en simplex
import { createInitialTableau as createInitialTableauFn, findPivotColumn as findPivotColumnFn, findPivotRow as findPivotRowFn, iterate as iterateFn, runSimplex as runSimplexFn, toMaximizationRow } from './simplex/tableau';
import { buildPhaseITableau as buildPhaseITableauFn, pivotOutArtificial as pivotOutArtificialFn, buildPhaseIISimplexTableau as buildPhaseIISimplexTableauFn, isPhaseIFeasible } from './simplex/phases';
import { validateProblem as validateProblemFn, normalizeToLEAndMax as normalizeToLEAndMaxFn, hasDirectContradictions as hasDirectContradictionsFn, coefficientVector as coefficientVectorFn, canUseStandardForm } from './simplex/preprocess';
import { solveByVertexEnumeration as solveByVertexEnumerationFn } from './simplex/vertex-enumeration';
import { round as roundFn, roundSolution as roundSolutionFn, cloneDeepTableau } from './simplex/utils';
import { DEFAULT_MAX_ITERATIONS, PHASE1_MAX_ITERATIONS, DEFAULT_DECIMALS, EPS } from './simplex/constants';

// Servicio principal que orquesta validación, construcción de tableaus y resolución por Simplex.
export class SimplexSolverService {

  /*
   * Valida el problema de entrada.
   * Retorna: true (válido), 'SIN_SOLUCION' (inviable) o false (inválido).
   */
  validateProblem(problem: SimplexProblem): true | 'SIN_SOLUCION' | false {
  return validateProblemFn(problem);
  }

  /*
   * Construye la tabla inicial del método Simplex en forma estándar.
   * Incluye variables de holgura/exceso y la fila objetivo con el signo adecuado.
   */
  createInitialTableau(problem: SimplexProblem): SimplexTableau {
  return createInitialTableauFn(problem);
  }

  /*
   * Resuelve el problema aplicando:
   * - Validación e inviabilidad temprana.
   * - Normalización a <= cuando es posible.
   * - Fase I (si se requieren artificiales) y Fase II.
   * - Iteraciones de Simplex hasta óptimo o condición de parada.
   * Además cruza con enumeración 2D para mejorar exactitud en casos pequeños.
   */
  solve(problem: SimplexProblem): SimplexSolution | SimplexError {
    // Validar el problema
    const validacion = this.validateProblem(problem);
    if (validacion === false) {
      return { message: 'Problema no válido para el método simplex', type: 'ENTRADA_INVALIDA' };
    }
    if (validacion === 'SIN_SOLUCION') {
      return { message: 'El problema no tiene solución posible (restricciones incompatibles)', type: 'SIN_SOLUCION' };
    }

  const normalized = this.normalizeToLEAndMax(problem);
  const canStandard = canUseStandardForm(normalized);
    let currentTableau: SimplexTableau;
    if (canStandard) {
  currentTableau = this.createInitialTableau(normalized);
      // Si es minimización, invertimos la fila objetivo para usar la misma regla de pivoteo
      if (normalized.objective.type === 'min') {
        toMaximizationRow(currentTableau);
      }
    } else {
      // Fase I (detección de inviabilidad con variables artificiales)
      const phaseI = this.buildPhaseITableau(problem);
      if (phaseI) {
  const { tableau: t1 } = this.runSimplex(phaseI.tableau, PHASE1_MAX_ITERATIONS);
        if (!isPhaseIFeasible(t1)) {
          return { message: 'El problema no tiene solución posible (Fase I)', type: 'SIN_SOLUCION' };
        }
  this.pivotOutArtificial(t1, phaseI.artificialCols);
  currentTableau = this.buildPhaseIISimplexTableau(problem, t1);
      } else {
  currentTableau = this.createInitialTableau(problem);
        if (problem.objective.type === 'min') {
          toMaximizationRow(currentTableau);
         }
       }
     }
     // Nota: la inversión para 'min' ya se contempla arriba o en buildPhaseIISimplexTableau.
    const iterations: SimplexTableau[] = [cloneDeepTableau(currentTableau)];
     const MAX_ITERATIONS = DEFAULT_MAX_ITERATIONS;
     let iteration = 0;

     while (iteration < MAX_ITERATIONS) {
  const pivotColumn = this.findPivotColumn(currentTableau);

      if (pivotColumn === -1) {
        // Solución óptima (respecto del tableau construido) encontrada
        break;
      }

  const pivotRow = this.findPivotRow(currentTableau, pivotColumn);

      if (pivotRow === -1) {
        // No acotado respecto a este tableau
        return { message: 'El problema no tiene solución acotada', type: 'NO_ACOTADA' };
      }

  // Swap entre variable entrante y saliente
      const entering = currentTableau.nonBasis[pivotColumn];
      const leaving = currentTableau.basis[pivotRow];
      currentTableau.basis[pivotRow] = entering;
      currentTableau.nonBasis[pivotColumn] = leaving;

      // Iteración Simplex
  currentTableau = this.iterate(currentTableau, pivotRow, pivotColumn);

      iterations.push(cloneDeepTableau(currentTableau));
      iteration++;
    }

    if (iteration === MAX_ITERATIONS) {
      return { message: 'El algoritmo no convergió', type: 'ENTRADA_INVALIDA' };
    }

    // Extraer solución
    const variables = new Map<string, number>();
    const numVars = problem.variables.length;
    for (const varName of problem.variables) variables.set(varName, 0);

    for (let i = 0; i < currentTableau.basis.length; i++) {
      const varIndex = currentTableau.basis[i];
      if (varIndex < numVars) {
        variables.set(problem.variables[varIndex], currentTableau.matrix[i][currentTableau.matrix[0].length - 1]);
      }
    }

    // Valor objetivo: evaluar directamente la función objetivo sobre las variables
    let objectiveValue = 0;
    for (const coef of problem.objective.coefficients) {
      const val = variables.get(coef.variable) ?? 0;
      objectiveValue += coef.value * val;
    }

    // Cross-check 2D: si enumeración encuentra mejor solución finita, la usamos (no afecta NO_ACOTADA)
    if (problem.variables.length === 2) {
  const enumRes = this.solveByVertexEnumeration(problem);
      if (enumRes && !('type' in enumRes)) {
        const better = problem.objective.type === 'max'
          ? enumRes.objectiveValue > objectiveValue + EPS
          : enumRes.objectiveValue < objectiveValue - EPS;
  if (better) return this.roundSolution(enumRes, DEFAULT_DECIMALS);
      }
    }

  return this.roundSolution({ optimal: true, bounded: true, variables, objectiveValue, iterations }, DEFAULT_DECIMALS);
  }

  /*
   * Enumeración de vértices (solo 2 variables) para obtener solución exacta en 2D.
   * Útil como verificación y para casos donde Simplex estándar puede ser ambiguo.
   */
  private solveByVertexEnumeration(problem: SimplexProblem): SimplexSolution | SimplexError | null {
  return solveByVertexEnumerationFn(problem);
  }

  /* Redondeo simple y helper para redondear estructuras de resultados. */
  private round(value: number, decimals = 6): number { return roundFn(value, decimals); }

  private roundSolution(result: SimplexSolution | SimplexError, decimals = 6): SimplexSolution | SimplexError {
  return roundSolutionFn(result, decimals);
  }

  /*
   * Normaliza restricciones a "<=" (si eran ">=") multiplicando por -1.
   * La función objetivo no se toca aquí; se ajusta más adelante si es minimización.
   */
  private normalizeToLEAndMax(problem: SimplexProblem): SimplexProblem {
  return normalizeToLEAndMaxFn(problem);
  }

  /*
   * Construye el tableau de Fase II a partir del final de Fase I y la función objetivo original.
   * La fila objetivo queda en forma reducida respecto de la base actual.
   */
  private buildPhaseIISimplexTableau(problem: SimplexProblem, phaseITableau: SimplexTableau): SimplexTableau {
  return buildPhaseIISimplexTableauFn(problem, phaseITableau);
  }

  /*
   * Ejecuta iteraciones de Simplex sobre un tableau dado hasta alcanzar óptimo o límite de iteraciones.
   */
  private runSimplex(start: SimplexTableau, maxIterations: number): { tableau: SimplexTableau } {
  return runSimplexFn(start, maxIterations);
  }

  /*
   * Construye el tableau de Fase I cuando se necesitan variables artificiales.
   * Si no se necesitan, devuelve null.
   */
  private buildPhaseITableau(problem: SimplexProblem): { tableau: SimplexTableau, artificialCols: number[], rowArtificial: (number|null)[] } | null {
  return buildPhaseITableauFn(problem);
  }

  /*
   * Intenta pivotear variables artificiales fuera de la base usando columnas no artificiales disponibles.
   */
  private pivotOutArtificial(tableau: SimplexTableau, artificialCols: number[]): void {
  pivotOutArtificialFn(tableau, artificialCols);
  }

  /*
   * Selección de columna pivote (coeficiente más negativo en la fila objetivo).
   */
  private findPivotColumn(tableau: SimplexTableau): number {
  return findPivotColumnFn(tableau);
  }

  /*
   * Selección de fila pivote mediante test del cociente mínimo.
   */
  private findPivotRow(tableau: SimplexTableau, pivotColumn: number): number {
  return findPivotRowFn(tableau, pivotColumn);
  }

  /*
   * Una iteración de pivoteo (normaliza fila pivote y elimina columna pivote del resto).
   */
  private iterate(tableau: SimplexTableau, pivotRow: number, pivotColumn: number): SimplexTableau {
  return iterateFn(tableau, pivotRow, pivotColumn);
  }

  /*
   * Detección de contradicciones directas entre restricciones con el mismo lado izquierdo.
   */
  private hasDirectContradictions(problem: SimplexProblem): boolean {
  return hasDirectContradictionsFn(problem);
  }

  /*
   * Convierte lista de coeficientes a vector alineado con el orden de variables.
   */
  private coefficientVector(vars: string[], coefs: Coefficient[]): number[] {
  return coefficientVectorFn(vars, coefs);
  }
}