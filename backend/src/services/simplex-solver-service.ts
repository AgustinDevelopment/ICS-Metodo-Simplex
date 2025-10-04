import { SimplexProblem, SimplexSolution, SimplexTableau, SimplexError, Coefficient, Operator } from '../types/types';

export class SimplexSolverService {

  /* Valida el problema antes de resolverlo
   * Devuelve 'true' si es válido, 'SIN_SOLUCION' si es inviable, o 'false' si es inválido.
   */
  validateProblem(problem: SimplexProblem): true | 'SIN_SOLUCION' | false {
    // Validación básica
    if (!problem.objective || !problem.constraints || problem.constraints.length === 0) {
      return false;
    }
    // Para esta implementación inicial requerimos exactamente 2 variables
    if (problem.variables.length !== 2) {
      return false;
    }
    // Validación básica de inviabilidad: si alguna restricción tiene lado derecho negativo y todos sus coeficientes >= 0
    for (const constraint of problem.constraints) {
      if (constraint.rightSide < 0) {
        const allPositive = constraint.coefficients.every(coef => coef.value >= 0);
        if (allPositive) {
          return 'SIN_SOLUCION';
        }
      }
    }

    // NUEVO: detectar contradicciones directas entre restricciones con el mismo lado izquierdo
    if (this.hasDirectContradictions(problem)) {
      return 'SIN_SOLUCION';
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
    const validacion = this.validateProblem(problem);
    if (validacion === false) {
      return { message: 'Problema no válido para el método simplex', type: 'ENTRADA_INVALIDA' };
    }
    if (validacion === 'SIN_SOLUCION') {
      return { message: 'El problema no tiene solución posible (restricciones incompatibles)', type: 'SIN_SOLUCION' };
    }

    // Atajo robusto para 2 variables: enumeración de vértices (geometría en R^2)
    if (problem.variables.length === 2) {
      const byEnum = this.solveByVertexEnumeration(problem);
      if (byEnum) return this.roundSolution(byEnum, 6);
    }

    // Camino rápido: si podemos transformar todo a "<=" y a max, evitamos Fase I
    const normalized = this.normalizeToLEAndMax(problem);
    const canStandard = normalized.constraints.every(c => c.operator === '<=');
    let currentTableau: SimplexTableau;
    if (canStandard) {
      currentTableau = this.createInitialTableau(normalized);
    } else {
      // FASE I (detección robusta de inviabilidad mediante variables artificiales)
      const phaseI = this.buildPhaseITableau(problem);
      if (phaseI) {
        const { tableau: t1 } = this.runSimplex(phaseI.tableau, 200);
        const lastRow = t1.matrix.length - 1;
        const eps = 1e-9;
        const phaseIObjective = t1.matrix[lastRow][t1.matrix[0].length - 1]; // valor de -w
        if (phaseIObjective < -eps) {
          return { message: 'El problema no tiene solución posible (Fase I)', type: 'SIN_SOLUCION' };
        }
        this.pivotOutArtificial(t1, phaseI.artificialCols);
        currentTableau = this.buildPhaseIISimplexTableau(problem, t1);
      } else {
        currentTableau = this.createInitialTableau(problem);
        if (problem.objective.type === 'min') {
          const lastRowStd = currentTableau.matrix.length - 1;
          for (let j = 0; j < currentTableau.matrix[0].length; j++) {
            currentTableau.matrix[lastRowStd][j] = -currentTableau.matrix[lastRowStd][j];
          }
        }
      }
    }
  // Nota: la inversión de la fila objetivo para 'min' ya se hace
  // - en el branch sin Fase I (más arriba), o
  // - dentro de buildPhaseIISimplexTableau cuando hubo Fase I.
    const iterations: SimplexTableau[] = [JSON.parse(JSON.stringify(currentTableau))];
    const MAX_ITERATIONS = 100;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const pivotColumn = this.findPivotColumn(currentTableau);

      if (pivotColumn === -1) {
        // Solución óptima (respecto del tableau construido) encontrada
        break;
      }

      const pivotRow = this.findPivotRow(currentTableau, pivotColumn);

      if (pivotRow === -1) {
        // Problema no acotado
        return { message: 'El problema no tiene solución acotada', type: 'NO_ACOTADA' };
      }

      // BUGFIX: swap correcto entre variable entrante y saliente
      const entering = currentTableau.nonBasis[pivotColumn];
      const leaving = currentTableau.basis[pivotRow];
      currentTableau.basis[pivotRow] = entering;
      currentTableau.nonBasis[pivotColumn] = leaving;

      // Iteración Simplex
      currentTableau = this.iterate(currentTableau, pivotRow, pivotColumn);

      iterations.push(JSON.parse(JSON.stringify(currentTableau)));
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

  return this.roundSolution({ optimal: true, bounded: true, variables, objectiveValue, iterations }, 6);
  }

  // Resolver LP de 2 variables por enumeración de vértices del polígono factible
  private solveByVertexEnumeration(problem: SimplexProblem): SimplexSolution | SimplexError | null {
    const [v1, v2] = problem.variables;
    const eps = 1e-9;

    // Funciones auxiliares
    const getCoeff = (coefs: Coefficient[], name: string) => (coefs.find(c => c.variable === name)?.value ?? 0);
    const feasible = (x: number, y: number) => {
      // No negatividad estándar
      if (x < -eps || y < -eps) return false;
      for (const cons of problem.constraints) {
        const a = getCoeff(cons.coefficients, v1);
        const b = getCoeff(cons.coefficients, v2);
        const lhs = a * x + b * y;
        if (cons.operator === '<=') { if (lhs - cons.rightSide > eps) return false; }
        else if (cons.operator === '>=') { if (cons.rightSide - lhs > eps) return false; }
        else { if (Math.abs(lhs - cons.rightSide) > 1e-7) return false; }
      }
      return true;
    };
    const intersect = (a1:number,b1:number,c1:number,a2:number,b2:number,c2:number): [number,number] | null => {
      const det = a1*b2 - a2*b1;
      if (Math.abs(det) < eps) return null; // paralelas
      const x = (c1*b2 - c2*b1) / det;
      const y = (a1*c2 - a2*c1) / det;
      if (!isFinite(x) || !isFinite(y)) return null;
      return [x,y];
    };

    // Construir candidatos: intersecciones de todas las rectas de restricciones (como igualdad)
    const lines: Array<{a:number,b:number,c:number}> = [];
    for (const cons of problem.constraints) {
      const a = getCoeff(cons.coefficients, v1);
      const b = getCoeff(cons.coefficients, v2);
      const c = cons.rightSide;
      lines.push({a,b,c});
      // Intersecciones con ejes
      if (Math.abs(a) > eps) lines.push({a:1,b:0,c:0});
      if (Math.abs(b) > eps) lines.push({a:0,b:1,c:0});
    }
    // Asegurar ejes presentes
    lines.push({a:1,b:0,c:0});
    lines.push({a:0,b:1,c:0});

    const candidates = new Set<string>();
    const addPt = (x:number,y:number) => {
      if (!isFinite(x) || !isFinite(y)) return;
      const kx = Math.abs(x) < eps ? 0 : x;
      const ky = Math.abs(y) < eps ? 0 : y;
      candidates.add(`${kx.toFixed(10)}|${ky.toFixed(10)}`);
    };

    for (let i=0;i<lines.length;i++){
      for (let j=i+1;j<lines.length;j++){
        const p = intersect(lines[i].a,lines[i].b,lines[i].c, lines[j].a,lines[j].b,lines[j].c);
        if (p) addPt(p[0],p[1]);
      }
    }
    // También evaluar origen por si acaso
    addPt(0,0);

    let bestValue = problem.objective.type === 'max' ? -Infinity : Infinity;
    let best: {x:number,y:number} | null = null;
    const evalObj = (x:number,y:number) => {
      const c1 = getCoeff(problem.objective.coefficients, v1);
      const c2 = getCoeff(problem.objective.coefficients, v2);
      return c1*x + c2*y;
    };

    for (const key of candidates) {
      const [xs,ys] = key.split('|');
      const x = parseFloat(xs); const y = parseFloat(ys);
      if (!feasible(x,y)) continue;
      const val = evalObj(x,y);
      if (problem.objective.type === 'max') {
        if (val > bestValue + eps) { bestValue = val; best = {x,y}; }
      } else {
        if (val < bestValue - eps) { bestValue = val; best = {x,y}; }
      }
    }

    if (!best) {
      // No se encontró ningún punto factible
      return { message: 'El problema no tiene solución posible (2D)', type: 'SIN_SOLUCION' };
    }

    // Devolver solución
    const variables = new Map<string, number>([[v1, best.x],[v2, best.y]]);
    return { optimal: true, bounded: true, variables, objectiveValue: bestValue, iterations: [] };
  }

  // --- Utilidades de redondeo ---
  private round(value: number, decimals = 6): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  private roundSolution(result: SimplexSolution | SimplexError, decimals = 6): SimplexSolution | SimplexError {
    if ('type' in result) return result;
    const roundedVars = new Map<string, number>();
    result.variables.forEach((v, k) => {
      roundedVars.set(k, this.round(v, decimals));
    });
    return {
      optimal: result.optimal,
      bounded: result.bounded,
      variables: roundedVars,
      objectiveValue: this.round(result.objectiveValue, decimals),
      iterations: result.iterations
    };
    }

  // Convierte todas las restricciones a "<=" (multiplicando por -1 si eran ">=") y convierte min a max
  private normalizeToLEAndMax(problem: SimplexProblem): SimplexProblem {
    const constraints: { operator: Operator; rightSide: number; coefficients: Coefficient[] }[] = problem.constraints.map(c => {
      if (c.operator === '>=') {
        return {
          operator: '<=' as Operator,
          rightSide: -c.rightSide,
          coefficients: c.coefficients.map(k => ({ variable: k.variable, value: -k.value }))
        };
      }
      return { operator: c.operator, rightSide: c.rightSide, coefficients: c.coefficients };
    });
    const objective = problem.objective.type === 'min'
      ? { type: 'max' as const, coefficients: problem.objective.coefficients.map(k => ({ variable: k.variable, value: -k.value })) }
      : { type: problem.objective.type, coefficients: problem.objective.coefficients };
    return { ...problem, constraints, objective };
  }

  // Construye la fila objetivo original sobre la base resultante de Fase I, y elimina artificiales
  private buildPhaseIISimplexTableau(problem: SimplexProblem, phaseITableau: SimplexTableau): SimplexTableau {
    // Clonar el tableau de Fase I
    const tableau: SimplexTableau = JSON.parse(JSON.stringify(phaseITableau));
    const rows = tableau.matrix.length;
    const cols = tableau.matrix[0].length;
    const lastRow = rows - 1;

    // Detectar columnas artificiales por heurística: aquellas que tienen 1 en exactamente una fila y 0 en el resto,
    // y no corresponden a variables de decisión (por nombre no lo sabemos aquí). Para simplificar, mantendremos todas
    // las columnas y solo reconstruiremos la fila objetivo original, lo cual es suficiente para 2 variables.

    // Inicializar fila objetivo con costos originales en columnas de variables de decisión
    const objectiveRow = new Array(cols).fill(0);
    for (const coef of problem.objective.coefficients) {
      const varIndex = problem.variables.indexOf(coef.variable);
      if (varIndex >= 0) {
        objectiveRow[varIndex] = problem.objective.type === 'max' ? -coef.value : coef.value;
      }
    }

    // Limpiar respecto a la base: forzar a 0 los coeficientes de variables básicas
    for (let i = 0; i < tableau.basis.length; i++) {
      const b = tableau.basis[i];
      const factor = objectiveRow[b];
      if (Math.abs(factor) > 1e-12) {
        for (let j = 0; j < cols; j++) {
          objectiveRow[j] -= factor * tableau.matrix[i][j];
        }
      }
    }

    // Para minimización, invertimos la fila objetivo para usar misma regla de pivoteo (coeficientes negativos avanzan)
    if (problem.objective.type === 'min') {
      for (let j = 0; j < cols; j++) objectiveRow[j] = -objectiveRow[j];
    }

    tableau.matrix[lastRow] = objectiveRow;
    tableau.objectiveRow = [...objectiveRow];
    return tableau;
  }

  // Ejecuta iteraciones de simplex sobre un tableau dado
  private runSimplex(start: SimplexTableau, maxIterations: number): { tableau: SimplexTableau } {
    let tableau = JSON.parse(JSON.stringify(start)) as SimplexTableau;
    let it = 0;
    while (it < maxIterations) {
      const pivotColumn = this.findPivotColumn(tableau);
      if (pivotColumn === -1) break; // óptimo
      const pivotRow = this.findPivotRow(tableau, pivotColumn);
      if (pivotRow === -1) break; // no acotado respecto a este tableau (dejamos que el caller decida)
      // swap base
      const entering = tableau.nonBasis[pivotColumn];
      const leaving = tableau.basis[pivotRow];
      tableau.basis[pivotRow] = entering;
      tableau.nonBasis[pivotColumn] = leaving;
      // iteración
      tableau = this.iterate(tableau, pivotRow, pivotColumn);
      it++;
    }
    return { tableau };
  }

  // Construye un tableau de Fase I (si se necesitan artificiales). Si no se necesitan, retorna null.
  private buildPhaseITableau(problem: SimplexProblem): { tableau: SimplexTableau, artificialCols: number[], rowArtificial: (number|null)[] } | null {
    const n = problem.variables.length;
    const m = problem.constraints.length;
    const rows = m + 1;

    // Determinar columnas extra necesarias
    const slackCols: number[] = [];
    const artificialCols: number[] = [];
    const surplusCols: number[] = [];
    let colIndex = n;

    // Primera pasada: asignar índices de columnas adicionales por restricción
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
      } else { // '=' 
        rowArtificial[i] = colIndex; artificialCols.push(colIndex); colIndex++;
      }
    }

    const cols = colIndex + 1; // +1 por RHS
    // Si no hay artificiales, no hace falta Fase I
  if (artificialCols.length === 0) return null;

    const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

    // Llenar coeficientes de decisión
    for (let i = 0; i < m; i++) {
      const cons = problem.constraints[i];
      for (const coef of cons.coefficients) {
        const idx = problem.variables.indexOf(coef.variable);
        if (idx >= 0) matrix[i][idx] = coef.value;
      }
      // slack / surplus / artificial según corresponda
      if (rowSlack[i] !== null) matrix[i][rowSlack[i]!] = 1;
      if (rowSurplus[i] !== null) matrix[i][rowSurplus[i]!] = -1;
      if (rowArtificial[i] !== null) matrix[i][rowArtificial[i]!] = 1;
      // RHS
      matrix[i][cols - 1] = cons.rightSide;
    }

    // Fila objetivo de Fase I: maximizar -Σ a_i
    // => coeficiente -1 en columnas artificiales, 0 en resto
    for (const aCol of artificialCols) {
      matrix[rows - 1][aCol] = -1;
    }

    // Limpiar fila objetivo respecto a artificiales básicas (Row0 = Row0 + Row_b)
    for (let i = 0; i < m; i++) {
      const aCol = rowArtificial[i];
      if (aCol !== null) {
        // sumar fila i a la fila objetivo para anular coeficiente -1 en aCol
        for (let j = 0; j < cols; j++) {
          matrix[rows - 1][j] += matrix[i][j];
        }
      }
    }

    // Base inicial
    const basis: number[] = [];
    for (let i = 0; i < m; i++) {
      if (rowSlack[i] !== null) basis.push(rowSlack[i]!);
      else if (rowArtificial[i] !== null) basis.push(rowArtificial[i]!);
      else basis.push(0); // fallback (no debería suceder)
    }
    // No base = el resto
    const nonBasis: number[] = [];
    for (let j = 0; j < cols - 1; j++) {
      if (!basis.includes(j)) nonBasis.push(j);
    }

    const objectiveRow = [...matrix[rows - 1]];

    return { tableau: { matrix, basis, nonBasis, objectiveRow }, artificialCols, rowArtificial };
  }

  // Intenta pivotear todas las artificiales fuera de la base usando cualquier columna no artificial disponible
  private pivotOutArtificial(tableau: SimplexTableau, artificialCols: number[]): void {
    const rows = tableau.matrix.length - 1;
    const cols = tableau.matrix[0].length - 1;
    const isArtificial = (col: number) => artificialCols.includes(col);
    for (let i = 0; i < tableau.basis.length; i++) {
      const b = tableau.basis[i];
      if (isArtificial(b)) {
        // buscar columna no artificial con coeficiente != 0 en esta fila
        let enterCol = -1;
        for (let j = 0; j < cols; j++) {
          if (!isArtificial(j) && Math.abs(tableau.matrix[i][j]) > 1e-9) {
            enterCol = j; break;
          }
        }
        if (enterCol !== -1) {
          // swap en estructuras
          const entering = tableau.nonBasis.includes(enterCol) ? tableau.nonBasis[tableau.nonBasis.indexOf(enterCol)] : enterCol;
          tableau.basis[i] = entering;
          // actualizar nonBasis: reemplazar enterCol por antiguo básico si procede
          const idxNB = tableau.nonBasis.indexOf(enterCol);
          if (idxNB !== -1) tableau.nonBasis[idxNB] = b;
          // hacer pivote
          this.iterate(tableau, i, enterCol);
        }
      }
    }
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

  // NUEVO: detección de contradicciones directas (rápida) para casos como x1+x2 >= 10 y x1+x2 <= 5
  private hasDirectContradictions(problem: SimplexProblem): boolean {
    // Normalizar cada restricción a un vector ordenado por problem.variables
    type Bucket = {
      leq: number[];  // RHS de restricciones <=
      geq: number[];  // RHS de restricciones >=
      eq: number[];   // RHS de restricciones =
    };

    const map = new Map<string, Bucket>();

    for (const cons of problem.constraints) {
      const vec = this.coefficientVector(problem.variables, cons.coefficients);
      const key = vec.map(v => v.toFixed(8)).join('|');

      if (!map.has(key)) {
        map.set(key, { leq: [], geq: [], eq: [] });
      }
      const bucket = map.get(key)!;

      if (cons.operator === '<=') bucket.leq.push(cons.rightSide);
      else if (cons.operator === '>=') bucket.geq.push(cons.rightSide);
      else bucket.eq.push(cons.rightSide);
    }

    for (const bucket of map.values()) {
      const minLEQ = bucket.leq.length ? Math.min(...bucket.leq) : +Infinity;
      const maxGEQ = bucket.geq.length ? Math.max(...bucket.geq) : -Infinity;

      // Si hay igualdad, su RHS debe estar entre los límites, si existen
      for (const rhsEq of bucket.eq) {
        if (rhsEq > minLEQ || rhsEq < maxGEQ) {
          return true; // igualdad fuera de los límites => inviable
        }
      }

      // Si no hay igualdad, pero los límites se cruzan, inviable
      if (maxGEQ > minLEQ) {
        return true;
      }
    }

    return false;
  }

  private coefficientVector(vars: string[], coefs: Coefficient[]): number[] {
    const vec = new Array(vars.length).fill(0);
    for (const c of coefs) {
      const idx = vars.indexOf(c.variable);
      if (idx >= 0) vec[idx] = c.value;
    }
    return vec;
  }
}