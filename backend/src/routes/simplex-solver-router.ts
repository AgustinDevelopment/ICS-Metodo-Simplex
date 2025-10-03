import { SimplexSolverController } from '../controllers/simplex-solver-controller';
import { SimplexSolverMiddleware } from '../middlewares/simplex-solver-middleware';
import { BaseRouter } from '../utils/base-router';

interface SimplexSolverRouterProps {
	controller: SimplexSolverController;
	middleware: SimplexSolverMiddleware;
}

export class SimplexSolverRouter extends BaseRouter<SimplexSolverController> {
	private readonly middleware: SimplexSolverMiddleware;

	constructor({ controller, middleware }: SimplexSolverRouterProps) {
		super(controller);
		this.middleware = middleware;
	}

	protected setRoutes(): void {
		this.router.post(
			'/',
			(req, res, next) => this.middleware.validateCreateProblem(req, res, next),
			(req, res) => this.controller.createProblem(req, res)
		);

		this.router.get(
			'/',
			(req, res) => this.controller.getProblems(req, res)
		);

		this.router.get(
			'/:id',
			(req, res, next) => this.middleware.validateGetProblem(req, res, next),
			(req, res) => this.controller.getProblemById(req, res)
		);

		this.router.put(
			'/:id',
			(req, res, next) => this.middleware.validateUpdateProblem(req, res, next),
			(req, res) => this.controller.updateProblem(req, res)
		);

		this.router.delete(
			'/:id',
			(req, res, next) => this.middleware.validateDeleteProblem(req, res, next),
			(req, res) => this.controller.deleteProblem(req, res)
		);

		this.router.post(
			'/:id/solve',
			(req, res, next) => this.middleware.validateGetProblem(req, res, next),
			(req, res) => this.controller.solveProblemById(req, res)
		);
	}
}
