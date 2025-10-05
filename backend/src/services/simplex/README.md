# Módulos de Simplex (backend)

Este directorio contiene la implementación modular del método Simplex y utilidades relacionadas. La clase orquestadora es `SimplexSolverService`, que delega en estos módulos.

## Flujo de resolución (alto nivel)
1. Preprocesar/validar el problema
   - `validateProblem` detecta entradas inválidas o inviables obvias.
   - `normalizeToLEAndMax` lleva restricciones ">=" a "<=" multiplicando por -1.
   - `canUseStandardForm` indica si puede armarse el tableau estándar directo (todas "<=" y RHS ≥ 0).
2. Construir tableau inicial
   - `createInitialTableau` arma la matriz aumentada con holguras/excesos.
   - Si la función objetivo es de minimización, `toMaximizationRow` invierte la fila para usar la misma regla de pivoteo.
3. Fase I (si hace falta)
   - `buildPhaseITableau` crea el tableau con variables artificiales cuando no es posible forma estándar directa.
   - Ejecutar iteraciones (`runSimplex`), verificar `isPhaseIFeasible` (valor de -w ≈ 0 o mayor).
   - `pivotOutArtificial` intenta retirar artificiales de la base.
   - `buildPhaseIISimplexTableau` arma el tableau de Fase II con la función objetivo original (forma reducida).
4. Iterar Simplex
   - `findPivotColumn`, `findPivotRow`, `iterate`, `runSimplex`.
   - Opcional: `runSimplexWithHistory` devuelve historial de tableaux para depurar.
5. Postproceso
   - Lectura de variables básicas del RHS.
   - `roundSolution` redondea salida para presentación.
   - En 2D, `solveByVertexEnumeration` contrasta solución por enumeración de vértices.

## Archivos y responsabilidades
- `preprocess.ts`
  - `validateProblem`, `hasDirectContradictions`, `normalizeToLEAndMax`
  - `coefficientVector`, `canUseStandardForm`
- `phases.ts`
  - `buildPhaseITableau`, `pivotOutArtificial`, `buildPhaseIISimplexTableau`
  - `isPhaseIFeasible` (chequea factibilidad tras Fase I)
- `tableau.ts`
  - `createInitialTableau`, `findPivotColumn`, `findPivotRow`, `iterate`, `runSimplex`
  - `toMaximizationRow` (convierte fila objetivo de min→max)
  - `runSimplexWithHistory` (trace de tableaux para debugging)
- `vertex-enumeration.ts`
  - `solveByVertexEnumeration` (solo 2 variables; contraste rápido de solución)
- `utils.ts`
  - `round`, `roundSolution`, `cloneDeepTableau`
- `constants.ts`
  - `EPS`, `MIN_EPS`, `DEFAULT_DECIMALS`, `DEFAULT_MAX_ITERATIONS`, `PHASE1_MAX_ITERATIONS`
- `index.ts` (opcional)
  - Barrel para exportar desde un único punto, si se desea.

## Notas de diseño
- Tolerancias numéricas y decimales están centralizadas en `constants.ts` para coherencia.
- Homologación aplicada: todas las comparaciones numéricas (antes con 1e-9, 1e-12, 1e-7, etc.) usan ahora `EPS` o `MIN_EPS` según el caso. Ajustando todo en un único lugar para calibrar la estabilidad numérica sin tocar múltiples archivos.
- La lógica de Fase I/Fase II se mantiene fuera del servicio; el servicio solo orquesta.
- Las funciones están documentadas con comentarios breves en español y sin etiquetas JSDoc.

## Depuración rápida
- Para inspeccionar pasos de Simplex, usar `runSimplexWithHistory(tableau, maxIter)` y loguear `history`.
- Para mantener retrocompatibilidad, el servicio expone por defecto `solve(...)` (sin historia).
