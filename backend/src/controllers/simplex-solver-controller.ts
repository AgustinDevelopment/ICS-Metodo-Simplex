import { Request, Response } from 'express';
import { SimplexSolverService } from '../services/simplex-solver-service';
import { SimplexProblem } from '../types/types';
import prisma from '../config/database';

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

  async solveProblem(problem: SimplexProblem) {
    if (!this.simplexService.validateProblem(problem)) {
      throw new Error('Invalid problem format');
    }
    return this.simplexService.solve(problem);
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

      const solution = this.simplexService.solve(problem);

      if ('type' in solution) {
        // Es un error
        return res.status(400).json({
          msg: solution.message,
          status: solution.type
        });
      }

      // Convertir Map a objeto para JSON
      const variablesObj: Record<string, number> = {};
      solution.variables.forEach((value, key) => { variablesObj[key] = value; });

      return res.status(200).json({
        msg: 'Problema resuelto correctamente',
        problem: { id: problemData.id, name: problemData.name },
        solution: {
          variables: variablesObj,
          objectiveValue: solution.objectiveValue,
          status: solution.optimal ? 'OPTIMA' : solution.bounded ? 'FACTIBLE' : 'NO_ACOTADA'
        }
      });
    } catch (error) {
      console.error('Error solving problem:', error);
      return res.status(500).json({ msg: 'Error al resolver el problema' });
    }
  }

}
