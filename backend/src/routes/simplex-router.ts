import { Router } from 'express';
import { SimplexSolverController } from '../controllers/simplex-solver-controller';
import { SimplexSolverMiddleware } from '../middlewares/simplex-solver-middleware';

export function createSimplexRouter(controller: SimplexSolverController, middleware: SimplexSolverMiddleware) {
  const router = Router();

  // Resolver problema guardado por ID
  router.post(
    '/:id',
    (req, res, next) => middleware.validateGetProblem(req, res, next),
    (req, res) => controller.solveProblemById(req, res)
  );

  return router;
}