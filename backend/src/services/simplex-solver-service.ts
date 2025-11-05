import { SimplexProblem, SimplexSolution, SimplexTableau, SimplexError, Coefficient } from '../types/types';
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
    const earlyError = this.validateOrError(problem);
    if (earlyError) return earlyError;

    const prepared = this.prepareInitialTableauOrError(problem);
    if ('type' in (prepared as SimplexError)) return prepared as SimplexError;
    const { tableau: startTableau } = prepared as { tableau: SimplexTableau; normalized: SimplexProblem };

    const loop = this.simplexLoop(startTableau, DEFAULT_MAX_ITERATIONS);
    if ('type' in (loop as SimplexError)) {
      const twoDFallback = this.tryTwoDFallback(problem);
      return twoDFallback ?? (loop as SimplexError);
    }
    const { tableau: finalTableau, iterations } = loop as { tableau: SimplexTableau; iterations: SimplexTableau[] };

    const variables = this.extractVariablesFromTableau(finalTableau, problem);
    const objectiveValue = this.evaluateObjectiveValue(problem, variables);

    // Usar cross-check 2D para mejorar precisión pero mantener las iteraciones
    if (problem.variables.length === 2) {
      const better2D = this.crossCheck2DOrBetter(problem, objectiveValue);
      if (better2D && 'variables' in better2D) {
        // Retornar la solución 2D mejorada PERO con las iteraciones del simplex
        return this.roundSolution({ 
          optimal: true, 
          bounded: true, 
          variables: better2D.variables, 
          objectiveValue: better2D.objectiveValue, 
          iterations 
        }, DEFAULT_DECIMALS);
      }
    }

    return this.roundSolution({ optimal: true, bounded: true, variables, objectiveValue, iterations }, DEFAULT_DECIMALS);
  }

  private tryTwoDDirect(problem: SimplexProblem): SimplexSolution | SimplexError | null {
    if (problem.variables.length !== 2) return null;
    const enumRes = this.solveByVertexEnumeration(problem);
    if (!enumRes) return null;
    if ('type' in enumRes) return enumRes;
    return this.roundSolution(enumRes, DEFAULT_DECIMALS) as SimplexSolution;
  }

  private tryTwoDFallback(problem: SimplexProblem): SimplexSolution | null {
    if (problem.variables.length !== 2) return null;
    const enumRes = this.solveByVertexEnumeration(problem);
    if (enumRes && !('type' in enumRes)) return this.roundSolution(enumRes, DEFAULT_DECIMALS) as SimplexSolution;
    return null;
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

  // ======================
  // Helpers extraídos (nuevo)
  // ======================

  private validateOrError(problem: SimplexProblem): SimplexError | null {
    const validacion = this.validateProblem(problem);
    if (validacion === false) {
      return { message: 'Problema no válido para el método simplex', type: 'ENTRADA_INVALIDA' };
    }
    if (validacion === 'SIN_SOLUCION') {
      return { message: 'El problema no tiene solución posible (restricciones incompatibles)', type: 'SIN_SOLUCION' };
    }
    return null;
  }

  private prepareInitialTableauOrError(problem: SimplexProblem): { tableau: SimplexTableau; normalized: SimplexProblem } | SimplexError {
    const normalized = this.normalizeToLEAndMax(problem);
    const canStandardForm = canUseStandardForm(normalized);

    if (canStandardForm) {
      const t = this.createInitialTableau(normalized);
      if (normalized.objective.type === 'min') toMaximizationRow(t);
      return { tableau: t, normalized };
    }

    const phaseI = this.buildPhaseITableau(problem);
    if (phaseI) {
      const { tableau: t1 } = this.runSimplex(phaseI.tableau, PHASE1_MAX_ITERATIONS);
      if (!isPhaseIFeasible(t1)) {
        return { message: 'El problema no tiene solución posible (Fase I)', type: 'SIN_SOLUCION' };
      }
      this.pivotOutArtificial(t1, phaseI.artificialCols);
      const t2 = this.buildPhaseIISimplexTableau(problem, t1);
      return { tableau: t2, normalized: normalized };
    }

    const t = this.createInitialTableau(problem);
    if (problem.objective.type === 'min') toMaximizationRow(t);
    return { tableau: t, normalized };
  }

  private simplexLoop(start: SimplexTableau, maxIterations: number): { tableau: SimplexTableau; iterations: SimplexTableau[] } | SimplexError {
    let current = start;
    const iterations: SimplexTableau[] = [cloneDeepTableau(current)];
    let it = 0;

    while (it < maxIterations) {
      const pivotColumn = this.findPivotColumn(current);
      if (pivotColumn === -1) break;

      const pivotRow = this.findPivotRow(current, pivotColumn);
      if (pivotRow === -1) {
        const obj = current.matrix[current.matrix.length - 1];
        const last = obj.length - 1;
        const anyNegative = obj.slice(0, last).some(v => v < -EPS);
        if (anyNegative) {
          return { message: 'El problema no tiene solución acotada', type: 'NO_ACOTADA' };
        }
        break; // óptimo alcanzado: no hay columnas elegibles con coste reducido negativo
      }

      {
        const entering = pivotColumn; // índice de columna absoluto
        const leaving = current.basis[pivotRow];
        current.basis[pivotRow] = entering;
        const nbIdx = current.nonBasis.indexOf(entering);
        if (nbIdx !== -1) current.nonBasis[nbIdx] = leaving;
      }

      current = this.iterate(current, pivotRow, pivotColumn);
      iterations.push(cloneDeepTableau(current));
      it++;
    }

    if (it === maxIterations) {
      return { message: 'El algoritmo no convergió', type: 'ENTRADA_INVALIDA' };
    }
    return { tableau: current, iterations };
  }

  private extractVariablesFromTableau(tableau: SimplexTableau, problem: SimplexProblem): Map<string, number> {
    const variables = new Map<string, number>();
    const numVars = problem.variables.length;
    for (const v of problem.variables) variables.set(v, 0);

    for (let i = 0; i < tableau.basis.length; i++) {
      const varIndex = tableau.basis[i];
      if (varIndex < numVars) {
        const rhs = tableau.matrix[i][tableau.matrix[0].length - 1];
        variables.set(problem.variables[varIndex], rhs);
      }
    }
    return variables;
  }

  private evaluateObjectiveValue(problem: SimplexProblem, variables: Map<string, number>): number {
    let value = 0;
    for (const coef of problem.objective.coefficients) {
      value += coef.value * (variables.get(coef.variable) ?? 0);
    }
    return value;
  }

  private crossCheck2DOrBetter(problem: SimplexProblem, currentObjectiveValue: number): SimplexSolution | null {
    const enumRes = this.solveByVertexEnumeration(problem);
    if (enumRes && !('type' in enumRes)) {
      const better = problem.objective.type === 'max'
        ? enumRes.objectiveValue > currentObjectiveValue + EPS
        : enumRes.objectiveValue < currentObjectiveValue - EPS;
      if (better) return this.roundSolution(enumRes, DEFAULT_DECIMALS) as SimplexSolution;
    }
    return null;
  }
}