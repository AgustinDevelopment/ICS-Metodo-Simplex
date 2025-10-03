import { SimplexProblem, SimplexSolution, SimplexTableau, SimplexError, Coefficient, Operator } from '../types/types';

export class SimplexSolverService {
  /**
   * Valida el problema antes de resolverlo
   */
  validateProblem(problem: SimplexProblem): boolean {
    // Validación básica
    if (!problem.objective || !problem.constraints || problem.constraints.length === 0) {
      return false;
    }
    
    // Para esta implementación inicial requerimos exactamente 2 variables
    if (problem.variables.length !== 2) {
      return false;
    }
    
    return true;
  }

  /**
   * Crea la tabla inicial del método Simplex
   */
  createInitialTableau(problem: SimplexProblem): SimplexTableau {
    // Establecemos el formato estándar para el método simplex
    const numConstraints = problem.constraints.length;
    const numVars = problem.variables.length;
    const numSlackVars = numConstraints;
    const totalVars = numVars + numSlackVars;
    
    // Construimos la matriz aumentada
    // [coeficientes de restricciones | variables de holgura | términos independientes]
    const matrix: number[][] = [];
    
    // Inicializar la matriz con ceros
    for (let i = 0; i <= numConstraints; i++) {
      matrix.push(new Array(totalVars + 1).fill(0));
    }
    
    // Llenar las filas con las restricciones
    for (let i = 0; i < numConstraints; i++) {
      const constraint = problem.constraints[i];
      
      // Coeficientes de variables de decisión
      for (const coef of constraint.coefficients) {
        const varIndex = problem.variables.indexOf(coef.variable);
        if (varIndex !== -1) {
          matrix[i][varIndex] = coef.value;
        }
      }
      
      // Variable de holgura (1 en su posición correspondiente)
      matrix[i][numVars + i] = constraint.operator === '<=' ? 1 : -1;
      
      // Término independiente
      matrix[i][totalVars] = constraint.rightSide;
    }
    
    // Fila para la función objetivo (negativa para maximización)
    const isMaximization = problem.objective.type === 'max';
    const objectiveMultiplier = isMaximization ? -1 : 1;
    
    for (const coef of problem.objective.coefficients) {
      const varIndex = problem.variables.indexOf(coef.variable);
      if (varIndex !== -1) {
        matrix[numConstraints][varIndex] = objectiveMultiplier * coef.value;
      }
    }
    
    // Preparar los índices de variables básicas y no básicas
    const basis: number[] = [];
    for (let i = 0; i < numConstraints; i++) {
      basis.push(numVars + i); // Variables de holgura inicialmente en la base
    }
    
    const nonBasis: number[] = [];
    for (let i = 0; i < numVars; i++) {
      nonBasis.push(i); // Variables de decisión inicialmente fuera de la base
    }
    
    // Extraer la fila objetivo para guardarla por separado
    const objectiveRow = [...matrix[numConstraints]];
    
    return {
      matrix,
      basis,
      nonBasis,
      objectiveRow
    };
  }

  /**
   * Resuelve el problema usando el método Simplex
   */
  solve(problem: SimplexProblem): SimplexSolution | SimplexError {
    // Validar el problema
    if (!this.validateProblem(problem)) {
      return {
        message: 'Problema no válido para el método simplex',
        type: 'INVALID_INPUT'
      };
    }
    
    // Crear la tabla inicial
    let currentTableau = this.createInitialTableau(problem);
    const iterations: SimplexTableau[] = [JSON.parse(JSON.stringify(currentTableau))]; // Guardar copia de la tabla inicial
    
    // Iterar hasta encontrar solución óptima o determinar que no hay solución
    const MAX_ITERATIONS = 100; // Límite de seguridad para evitar bucles infinitos
    let iteration = 0;
    
    while (iteration < MAX_ITERATIONS) {
      // Verificar si la solución actual es óptima
      const pivotColumn = this.findPivotColumn(currentTableau);
      if (pivotColumn === -1) {
        // Todos los coeficientes son no positivos, solución óptima encontrada
        break;
      }
      
      // Encontrar la fila pivot
      const pivotRow = this.findPivotRow(currentTableau, pivotColumn);
      if (pivotRow === -1) {
        // No hay restricción en la dirección de crecimiento, problema no acotado
        return {
          message: 'El problema no tiene solución acotada',
          type: 'UNBOUNDED'
        };
      }
      
      // Actualizar la base
      currentTableau.basis[pivotRow] = currentTableau.nonBasis[pivotColumn];
      currentTableau.nonBasis[pivotColumn] = currentTableau.basis[pivotRow];
      
      // Realizar la iteración
      currentTableau = this.iterate(currentTableau, pivotRow, pivotColumn);
      
      // Guardar una copia de la iteración actual
      iterations.push(JSON.parse(JSON.stringify(currentTableau)));
      
      iteration++;
    }
    
    if (iteration === MAX_ITERATIONS) {
      return {
        message: 'El algoritmo no convergió en el número máximo de iteraciones',
        type: 'INVALID_INPUT'
      };
    }
    
    // Extraer la solución
    const variables = new Map<string, number>();
    const numVars = problem.variables.length;
    
    // Inicializar todas las variables a cero
    for (const varName of problem.variables) {
      variables.set(varName, 0);
    }
    
    // Asignar valores a las variables básicas
    for (let i = 0; i < currentTableau.basis.length; i++) {
      const varIndex = currentTableau.basis[i];
      if (varIndex < numVars) {
        variables.set(problem.variables[varIndex], currentTableau.matrix[i][currentTableau.matrix[0].length - 1]);
      }
    }
    
    // Calcular el valor de la función objetivo
    let objectiveValue = currentTableau.matrix[currentTableau.matrix.length - 1][currentTableau.matrix[0].length - 1];
    if (problem.objective.type === 'max') {
      objectiveValue = -objectiveValue; // Revertir el signo para maximización
    }
    
    return {
      optimal: true,
      bounded: true,
      variables,
      objectiveValue,
      iterations
    };
  }

  /**
   * Encuentra la columna pivot
   */
  private findPivotColumn(tableau: SimplexTableau): number {
    const objectiveRow = tableau.matrix[tableau.matrix.length - 1];
    const lastColIndex = objectiveRow.length - 1;
    
    // Buscar el coeficiente más negativo en la fila objetivo
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

  /**
   * Encuentra la fila pivot
   */
  private findPivotRow(tableau: SimplexTableau, pivotColumn: number): number {
    const lastColIndex = tableau.matrix[0].length - 1;
    let minRatio = Infinity;
    let minIndex = -1;
    
    // Calcular el ratio mínimo positivo
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

  /**
   * Realiza una iteración del método Simplex
   */
  private iterate(tableau: SimplexTableau, pivotRow: number, pivotColumn: number): SimplexTableau {
    const numRows = tableau.matrix.length;
    const numCols = tableau.matrix[0].length;
    const pivotValue = tableau.matrix[pivotRow][pivotColumn];
    
    // Normalizar la fila pivot
    for (let j = 0; j < numCols; j++) {
      tableau.matrix[pivotRow][j] /= pivotValue;
    }
    
    // Actualizar las demás filas
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
}