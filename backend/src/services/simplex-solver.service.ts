import { SimplexProblem, SimplexSolution, SimplexError } from '../types/types';
import {
  ProblemValidatorService,
  TableauPreparationService,
  SimplexExecutorService,
  SolutionExtractorService,
  SolutionOptimizerService,
} from '../lib/core';

/**
 * Servicio principal del algoritmo Simplex
 * Responsabilidad: Orquestar el flujo de resolución
 */
export class SimplexSolverService {
  private readonly validator = new ProblemValidatorService();
  private readonly tableauPreparation = new TableauPreparationService();
  private readonly executor = new SimplexExecutorService();
  private readonly solutionExtractor = new SolutionExtractorService();
  private readonly optimizer = new SolutionOptimizerService();

  /**
   * Resuelve un problema de programación lineal
   * @param problem - Problema a resolver
   * @returns Solución óptima o error
   */
  solve(problem: SimplexProblem): SimplexSolution | SimplexError {
    const validationError = this.validator.validate(problem);
    if (validationError) {
      return validationError;
    }

    const preparation = this.tableauPreparation.prepare(problem);
    if ('type' in preparation) {
      return preparation;
    }

    const result = this.executor.execute(preparation.tableau, problem);
    if ('type' in result) {
      return this.optimizer.tryVertexEnumeration(problem) ?? result;
    }

    const allIterations = preparation.phaseIIterations
      ? [...preparation.phaseIIterations, ...result.iterations]
      : result.iterations;

    const solution = this.solutionExtractor.extract(
      result.tableau,
      problem,
      allIterations
    );

    if (problem.variables.length === 2) {
      return this.optimizer.crossCheckWith2D(problem, solution) ?? solution;
    }

    return solution;
  }
}
