import { Request, Response } from 'express';
import { SimplexSolverService } from '../services/simplex-solver-service';
import { SimplexProblem, SimplexSolution, SimplexError } from '../types/types';
import prisma from '../config/database';

type SimplexResult = SimplexSolution | SimplexError;

export class SimplexSolverController {
  constructor(private readonly simplexService: SimplexSolverService) {}

  async createProblem(req: Request, res: Response) {
    try {
      const problem = await prisma.problem.create({
        data: {
          name: req.body.name,
          objectiveFunction: req.body.objective,
          constraints: req.body.constraints,
          variables: req.body.variables
        }
      });
      res.status(201).json({ msg: 'Problema creado', problem });
    } catch (error) {
      console.error('Error creating problem:', error);
      res.status(500).json({ msg: 'Error al crear el problema' });
    }
  }

  async getProblems(req: Request, res: Response) {
    try {
      const problems = await prisma.problem.findMany();
      res.status(200).json({ msg: 'Lista de problemas', problems });
    } catch (error) {
      console.error('Error getting problems:', error);
      res.status(500).json({ msg: 'Error al obtener los problemas' });
    }
  }

  async getProblemById(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);
      const problem = await prisma.problem.findUnique({
        where: { id }
      });
      
      if (!problem) {
        return res.status(404).json({ msg: 'Problema no encontrado' });
      }
      
      res.status(200).json({ msg: 'Problema obtenido', problem });
    } catch (error) {
      console.error('Error getting problem:', error);
      res.status(500).json({ msg: 'Error al obtener el problema' });
    }
  }

  async updateProblem(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);
      const problem = await prisma.problem.update({
        where: { id },
        data: {
          name: req.body.name,
          objectiveFunction: req.body.objective,
          constraints: req.body.constraints,
          variables: req.body.variables
        }
      });
      res.status(200).json({ msg: 'Problema actualizado', problem });
    } catch (error) {
      console.error('Error updating problem:', error);
      res.status(500).json({ msg: 'Error al actualizar el problema' });
    }
  }

  async deleteProblem(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);
      await prisma.problem.delete({
        where: { id }
      });
      res.status(200).json({ msg: 'Problema eliminado' });
    } catch (error) {
      console.error('Error deleting problem:', error);
      res.status(500).json({ msg: 'Error al eliminar el problema' });
    }
  }

  async solveUnsavedProblem(req: Request, res: Response) {
    try {
      // Crear un problema a partir del request sin persistirlo en DB
      const problem: SimplexProblem = req.body as SimplexProblem; 
      const result = this.simplexService.solve(problem) ;
    
      return this.processSolutionResult(res, problem.name || 'Problema no guardado', result);

      
    } catch (error) {
      console.error('Error solving unsaved problem:', error);
      res.status(500).json({msg: 'Error interno al resolver el problema no guardado'});
    }
  }

  async solveProblemById(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);

      const problemData = await prisma.problem.findUnique({ where: { id } });
      if (!problemData) return res.status(404).json({ msg: 'Problema no encontrado' });

      const problem: SimplexProblem = {
        name: problemData.name,
        objective: typeof problemData.objectiveFunction === 'string' ? JSON.parse(problemData.objectiveFunction) : problemData.objectiveFunction,
        constraints: typeof problemData.constraints === 'string' ? JSON.parse(problemData.constraints) : problemData.constraints,
        variables: typeof problemData.variables === 'string' ? JSON.parse(problemData.variables) : problemData.variables
      };

      const result = this.simplexService.solve(problem);

      // Si la solución es exitosa y tiene iteraciones, guardarlas en la base de datos
      if (!('type' in result) && result.iterations) {
        await this.saveIterations(problemData.id, result.iterations);
      }

      return this.processSolutionResult(res, problemData.name, result, problemData.id);
    
    } catch (error) {
      console.error('Error solving problem:', error);
      return res.status(500).json({ msg: 'Error al resolver el problema' });
    }
  }
      
  private processSolutionResult(res: Response, problemName: string, result: SimplexResult, problemId?: number) {
        // Es un error (NO_ACOTADA, SIN_SOLUCION, ENTRADA_INVALIDA) ---
        if ('type' in result) {
            return res.status(400).json({
                msg: `El problema '${problemName}' no pudo ser resuelto: ${result.message}`,
                status: result.type,
            });
        } 

      // Convertir Map a objeto para respuesta JSON
      const variablesObj: Record<string, number> = {};
      for (const [key, value] of result.variables) {
        variablesObj[key] = value;
      }

        // Determinar el status basado en las propiedades de la solución
        let solutionStatus: string;
        if (result.optimal) {
            solutionStatus = 'OPTIMAL';
        } else if (result.bounded) {
            solutionStatus = 'FEASIBLE';
        } else {
            solutionStatus = 'UNBOUNDED';
        }

        return res.status(200).json({
            msg: 'Problema resuelto correctamente',
            problem: {
                id: problemId,
                name: problemName
            },
            solution: {
                variables: variablesObj,
                objectiveValue: result.objectiveValue,
                status: solutionStatus
            }
        });
    }

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

  private getVariableName(labels: string[] | undefined, varIndex: number): string {
    return labels?.[varIndex] ?? `x${varIndex}`;
  }

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

  private async saveIterations(problemId: number, iterations: any[]) {
    try {
      await prisma.simplexIteration.deleteMany({
        where: { problemId }
      });

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
    }
  }

  async getIterationsByProblemId(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);
      
      const iterations = await prisma.simplexIteration.findMany({
        where: { problemId: id },
        orderBy: { iterationNumber: 'asc' }
      });

      if (iterations.length === 0) {
        return res.status(404).json({ msg: 'No se encontraron iteraciones para este problema' });
      }

      res.status(200).json({
        msg: 'Iteraciones obtenidas',
        iterations
      });
    } catch (error) {
      console.error('Error getting iterations:', error);
      res.status(500).json({ msg: 'Error al obtener las iteraciones' });
    }
  }
}

