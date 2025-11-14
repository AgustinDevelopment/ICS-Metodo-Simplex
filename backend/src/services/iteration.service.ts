/**
 * Servicio para gestión de iteraciones del Simplex
 * Responsabilidad: Guardar y procesar iteraciones del algoritmo
 */

import prisma from '../config/database';

export class IterationService {
  /**
   * Guarda las iteraciones de un problema en la base de datos
   */
  async saveIterations(problemId: number, iterations: any[]): Promise<void> {
    try {
      // Eliminar iteraciones previas
      await prisma.simplexIteration.deleteMany({
        where: { problemId }
      });

      // Guardar nuevas iteraciones
      for (let i = 0; i < iterations.length; i++) {
        const iteration = iterations[i];
        const basicVariables = this.extractBasicVariables(iteration);
        
        const matrix = iteration.matrix;
        const lastRow = matrix.length - 1;
        const lastCol = matrix[0].length - 1;
        const objectiveValue = matrix[lastRow][lastCol];

        const { enteringVar, leavingVar } = i > 0
          ? this.detectEnteringAndLeavingVars(iteration, iterations[i - 1])
          : { enteringVar: null, leavingVar: null };

        const isOptimal = i === iterations.length - 1;

        await prisma.simplexIteration.create({
          data: {
            problemId,
            iterationNumber: i + 1,
            tableau: iteration.matrix,
            basicVariables,
            objectiveValue,
            enteringVar,
            leavingVar,
            isOptimal
          }
        });
      }
    } catch (error) {
      console.error('Error saving iterations:', error);
      throw error;
    }
  }

  /**
   * Obtiene las iteraciones de un problema
   */
  async getIterationsByProblemId(problemId: number) {
    return await prisma.simplexIteration.findMany({
      where: { problemId },
      orderBy: { iterationNumber: 'asc' }
    });
  }

  /**
   * Extrae las variables básicas de una iteración
   */
  private extractBasicVariables(iteration: any): Record<string, number> {
    const basicVariables: Record<string, number> = {};
    const matrix = iteration.matrix;
    const lastRow = matrix.length - 1;
    const lastCol = matrix[0].length - 1;
    
    if (!iteration.basis) {
      return basicVariables;
    }

    for (let rowIndex = 0; rowIndex < iteration.basis.length; rowIndex++) {
      if (rowIndex >= lastRow) {
        continue;
      }
      
      const varIndex = iteration.basis[rowIndex];
      const varName = this.getVariableName(iteration.labels, varIndex);
      basicVariables[varName] = matrix[rowIndex][lastCol];
    }

    return basicVariables;
  }

  /**
   * Obtiene el nombre de una variable
   */
  private getVariableName(labels: string[] | undefined, varIndex: number): string {
    return labels?.[varIndex] ?? `x${varIndex}`;
  }

  /**
   * Detecta las variables que entran y salen de la base
   */
  private detectEnteringAndLeavingVars(
    currentIteration: any, 
    prevIteration: any
  ): { enteringVar: string | null; leavingVar: string | null } {
    if (!prevIteration.basis || !currentIteration.basis) {
      return { enteringVar: null, leavingVar: null };
    }

    for (let j = 0; j < currentIteration.basis.length; j++) {
      if (prevIteration.basis[j] !== currentIteration.basis[j]) {
        const enteringVar = this.getVariableName(
          currentIteration.labels, 
          currentIteration.basis[j]
        );
        const leavingVar = this.getVariableName(
          prevIteration.labels, 
          prevIteration.basis[j]
        );
        return { enteringVar, leavingVar };
      }
    }

    return { enteringVar: null, leavingVar: null };
  }
}
