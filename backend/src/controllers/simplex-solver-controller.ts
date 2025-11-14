import { Request, Response } from 'express';
import { SimplexSolverService } from '../services/simplex-solver.service';
import { ProblemService } from '../services/problem.service';
import { IterationService } from '../services/iteration.service';
import { SimplexProblem, SimplexSolution, SimplexError } from '../types/types';

type SimplexResult = SimplexSolution | SimplexError;

export class SimplexSolverController {
  private readonly problemService = new ProblemService();
  private readonly iterationService = new IterationService();

  constructor(private readonly simplexService: SimplexSolverService) {}

  async createProblem(req: Request, res: Response) {
    try {
      const problem = await this.problemService.createProblem({
        name: req.body.name,
        objective: req.body.objective,
        constraints: req.body.constraints,
        variables: req.body.variables
      });
      res.status(201).json({ msg: 'Problema creado', problem });
    } catch (error) {
      console.error('Error creating problem:', error);
      res.status(500).json({ msg: 'Error al crear el problema' });
    }
  }

  async getProblems(req: Request, res: Response) {
    try {
      const problems = await this.problemService.getAllProblems();
      res.status(200).json({ msg: 'Lista de problemas', problems });
    } catch (error) {
      console.error('Error getting problems:', error);
      res.status(500).json({ msg: 'Error al obtener los problemas' });
    }
  }

  async getProblemById(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);
      const problem = await this.problemService.getProblemById(id);
      
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
      const problem = await this.problemService.updateProblem(id, {
        name: req.body.name,
        objective: req.body.objective,
        constraints: req.body.constraints,
        variables: req.body.variables
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
      await this.problemService.deleteProblem(id);
      res.status(200).json({ msg: 'Problema eliminado' });
    } catch (error) {
      console.error('Error deleting problem:', error);
      res.status(500).json({ msg: 'Error al eliminar el problema' });
    }
  }

  async solveUnsavedProblem(req: Request, res: Response) {
    try {
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

      const problemData = await this.problemService.getProblemById(id);
      if (!problemData) return res.status(404).json({ msg: 'Problema no encontrado' });

      const problem = this.problemService.toDomain(problemData);
      const result = this.simplexService.solve(problem);

      if (!('type' in result) && result.iterations && result.iterations.length > 0) {
        await this.iterationService.saveIterations(problemData.id, result.iterations);
      }

      return this.processSolutionResult(res, problemData.name, result, problemData.id);
    
    } catch (error) {
      console.error('Error solving problem:', error);
      return res.status(500).json({ msg: 'Error al resolver el problema' });
    }
  }
      
  private processSolutionResult(res: Response, problemName: string, result: SimplexResult, problemId?: number) {
        if ('type' in result) {
            return res.status(400).json({
                msg: `El problema '${problemName}' no pudo ser resuelto: ${result.message}`,
                status: result.type,
            });
        } 

      const variablesObj: Record<string, number> = {};
      for (const [key, value] of result.variables) {
        variablesObj[key] = value;
      }

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

  async getIterationsByProblemId(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id);
      
      const iterations = await this.iterationService.getIterationsByProblemId(id);

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

