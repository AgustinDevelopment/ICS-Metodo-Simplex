import { Request, Response } from 'express';

export class SimplexSolverController {
  async createProblem(req: Request, res: Response) {
    res.status(201).json({ msg: 'Problema creado' });
  }

  async getProblems(req: Request, res: Response) {
    res.status(200).json({ msg: 'Lista de problemas', problems: [] });
  }

  async getProblemById(req: Request, res: Response) {
    res.status(200).json({ msg: 'Problema obtenido', problem: null });
  }

  async updateProblem(req: Request, res: Response) {
    res.status(200).json({ msg: 'Problema actualizado' });
  }

  async deleteProblem(req: Request, res: Response) {
    res.status(200).json({ msg: 'Problema eliminado' });
  }
}
