import { Request, Response, NextFunction } from 'express';
import { simplexProblemSchema, updateProblemSchema } from '../schemas/request-schema';
import { ZodError } from 'zod';
import { SimplexProblem } from '../types/types';

export class SimplexSolverMiddleware {
  async validateCreateProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = simplexProblemSchema.parse(req.body);
      req.body = validatedData;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.issues
        });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async validateUpdateProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = updateProblemSchema.parse(req.body);
      req.body = validatedData;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.issues
        });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async validateGetProblem(req: Request, res: Response, next: NextFunction) {
    const id = Number.parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    return next();
  }

  async validateDeleteProblem(req: Request, res: Response, next: NextFunction) {
    const id = Number.parseInt(req.params.id);
    if (Number.isNaN(id)) {
      // Log the error for delete operation
      console.error(`Delete operation failed: Invalid ID format (${req.params.id})`);
      return res.status(400).json({ message: 'Invalid ID format for delete operation' });
    }
    return next();
  }

  validateSimplexInput(problem: SimplexProblem): boolean {
    // Validar que haya al menos 2 variables
    if (problem.variables.length < 2) {
      return false;
    }

    // Validar que haya al menos una restricción
    if (problem.constraints.length === 0) {
      return false;
    }

    // Validar que todas las restricciones usen las mismas variables
    const validVariables = new Set(problem.variables);
    
    for (const constraint of problem.constraints) {
      for (const coef of constraint.coefficients) {
        if (!validVariables.has(coef.variable)) {
          return false;
        }
      }
    }

    // Validar la función objetivo
    for (const coef of problem.objective.coefficients) {
      if (!validVariables.has(coef.variable)) {
        return false;
      }
    }

    return true;
  }
}
