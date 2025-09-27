import { Request, Response, NextFunction } from 'express';

export class SimplexSolverMiddleware {
  async validateCreateProblem(req: Request, res: Response, next: NextFunction) {
    return next();
  }

  async validateUpdateProblem(req: Request, res: Response, next: NextFunction) {
    return next();
  }

  async validateGetProblem(req: Request, res: Response, next: NextFunction) {
    return next();
  }

  async validateDeleteProblem(req: Request, res: Response, next: NextFunction) {
    return next();
  }
}
