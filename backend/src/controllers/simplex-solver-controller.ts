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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);

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
      result.variables.forEach((value, key) => {
            variablesObj[key] = value;
        });

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

  private async saveIterations(problemId: number, iterations: any[]) {
    try {
      // Eliminar iteraciones anteriores de este problema
      await prisma.simplexIteration.deleteMany({
        where: { problemId }
      });

      // Guardar cada iteración
      for (let i = 0; i < iterations.length; i++) {
        const iteration = iterations[i];
        
        // Extraer las variables básicas del tableau
        const basicVariables: Record<string, number> = {};
        const matrix = iteration.matrix;
        const lastRow = matrix.length - 1;
        const lastCol = matrix[0].length - 1;
        
        // Las variables básicas están en la columna basis
        if (iteration.basis) {
          iteration.basis.forEach((varIndex: number, rowIndex: number) => {
            if (rowIndex < lastRow) {
              const varName = iteration.labels && iteration.labels[varIndex] 
                ? iteration.labels[varIndex] 
                : `x${varIndex}`;
              basicVariables[varName] = matrix[rowIndex][lastCol];
            }
          });
        }

        // El valor objetivo está en la última fila, última columna
        const objectiveValue = matrix[lastRow][lastCol];

        // Detectar variable que entra y sale (si no es la primera iteración)
        let enteringVar = null;
        let leavingVar = null;
        if (i > 0) {
          const prevIteration = iterations[i - 1];
          // Comparar basis para detectar cambios
          if (prevIteration.basis && iteration.basis) {
            for (let j = 0; j < iteration.basis.length; j++) {
              if (prevIteration.basis[j] !== iteration.basis[j]) {
                enteringVar = iteration.labels?.[iteration.basis[j]] || `x${iteration.basis[j]}`;
                leavingVar = prevIteration.labels?.[prevIteration.basis[j]] || `x${prevIteration.basis[j]}`;
                break;
              }
            }
          }
        }

        // Determinar si es óptima (última iteración)
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
      // No lanzamos error para no interrumpir la respuesta al usuario
    }
  }

  async getIterationsByProblemId(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
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

