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
		this.setRoutes();
	}

	protected setRoutes(): void {
		this.router.post(
			'/solve',
			this.middleware.validateCreateProblem.bind(this.middleware), 
			this.controller.solveUnsavedProblem.bind(this.controller) 
		);

		this.router.get(
			'/:id/iterations',
			this.middleware.validateGetProblem.bind(this.middleware),
			this.controller.getIterationsByProblemId.bind(this.controller)
		);

		this.router.post(
			'/:id/solve',
			this.middleware.validateGetProblem.bind(this.middleware),
			this.controller.solveProblemById.bind(this.controller)
		);

		this.router.post(
			'/',
			this.middleware.validateCreateProblem.bind(this.middleware),
			this.controller.createProblem.bind(this.controller)
		);

		this.router.get(
			'/',
			this.controller.getProblems.bind(this.controller)
		);

		this.router.get(
			'/:id',
			this.middleware.validateGetProblem.bind(this.middleware),
			this.controller.getProblemById.bind(this.controller)
		);

		this.router.put(
			'/:id',
			this.middleware.validateUpdateProblem.bind(this.middleware),
			this.controller.updateProblem.bind(this.controller)
		);

		this.router.delete(
			'/:id',
			this.middleware.validateDeleteProblem.bind(this.middleware),
			this.controller.deleteProblem.bind(this.controller)
		);
	}
}
