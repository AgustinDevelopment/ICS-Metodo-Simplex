import { Request, Response, NextFunction } from 'express';
import { simplexProblemSchema, updateProblemSchema } from '../schemas/request-schema';
import { ZodError } from 'zod';
import { SimplexProblem } from '../types/types';

export class SimplexSolverMiddleware {
  private handleValidationError(error: unknown, res: Response) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.issues
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }

  async validateCreateProblem(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = simplexProblemSchema.parse(req.body);
      return next();
    } catch (error) {
      return this.handleValidationError(error, res);
    }
  }

  async validateUpdateProblem(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = updateProblemSchema.parse(req.body);
      return next();
    } catch (error) {
      return this.handleValidationError(error, res);
    }
  }

  private validateIdParam(req: Request, res: Response, next: NextFunction) {
    const id = Number.parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    return next();
  }

  async validateGetProblem(req: Request, res: Response, next: NextFunction) {
    return this.validateIdParam(req, res, next);
  }

  async validateDeleteProblem(req: Request, res: Response, next: NextFunction) {
    return this.validateIdParam(req, res, next);
  }

  validateSimplexInput(problem: SimplexProblem): boolean {
    if (problem.variables.length < 2) {
      return false;
    }

    if (problem.constraints.length === 0) {
      return false;
    }

    const validVariables = new Set(problem.variables);
    
    for (const constraint of problem.constraints) {
      for (const coef of constraint.coefficients) {
        if (!validVariables.has(coef.variable)) {
          return false;
        }
      }
    }

    for (const coef of problem.objective.coefficients) {
      if (!validVariables.has(coef.variable)) {
        return false;
      }
    }

    return true;
  }
}
