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
		/**
		 * @swagger
		 * /problems/solve:
		 *   post:
		 *     tags: [Simplex]
		 *     summary: Resuelve un problema sin guardarlo
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: '#/components/schemas/SimplexProblem'
		 *     responses:
		 *       200:
		 *         description: Problema resuelto exitosamente
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: '#/components/schemas/SimplexSolution'
		 *       400:
		 *         description: Error en los datos de entrada
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: '#/components/schemas/Error'
		 */
		this.router.post(
			'/solve',
			this.middleware.validateCreateProblem.bind(this.middleware), 
			this.controller.solveUnsavedProblem.bind(this.controller) 
		);

		/**
		 * @swagger
		 * /problems/{id}/iterations:
		 *   get:
		 *     tags: [Simplex]
		 *     summary: Obtiene las iteraciones de un problema
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: integer
		 *     responses:
		 *       200:
		 *         description: Iteraciones obtenidas
		 *       404:
		 *         description: Problema no encontrado
		 */
		this.router.get(
			'/:id/iterations',
			this.middleware.validateGetProblem.bind(this.middleware),
			this.controller.getIterationsByProblemId.bind(this.controller)
		);

		/**
		 * @swagger
		 * /problems/{id}/solve:
		 *   post:
		 *     tags: [Simplex]
		 *     summary: Resuelve un problema guardado
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: integer
		 *     responses:
		 *       200:
		 *         description: Problema resuelto
		 *         content:
		 *           application/json:
		 *             schema:
		 *               $ref: '#/components/schemas/SimplexSolution'
		 */
		this.router.post(
			'/:id/solve',
			this.middleware.validateGetProblem.bind(this.middleware),
			this.controller.solveProblemById.bind(this.controller)
		);

		/**
		 * @swagger
		 * /problems:
		 *   post:
		 *     tags: [Simplex]
		 *     summary: Crea un nuevo problema
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             $ref: '#/components/schemas/SimplexProblem'
		 *     responses:
		 *       201:
		 *         description: Problema creado
		 */
		this.router.post(
			'/',
			this.middleware.validateCreateProblem.bind(this.middleware),
			this.controller.createProblem.bind(this.controller)
		);

		/**
		 * @swagger
		 * /problems:
		 *   get:
		 *     tags: [Simplex]
		 *     summary: Obtiene todos los problemas
		 *     responses:
		 *       200:
		 *         description: Lista de problemas
		 */
		this.router.get(
			'/',
			this.controller.getProblems.bind(this.controller)
		);

		/**
		 * @swagger
		 * /problems/{id}:
		 *   get:
		 *     tags: [Simplex]
		 *     summary: Obtiene un problema por ID
		 *     parameters:
		 *       - name: id
		 *         in: path
		 *         required: true
		 *         schema:
		 *           type: integer
		 *     responses:
		 *       200:
		 *         description: Problema encontrado
		 *       404:
		 *         description: Problema no encontrado
		 */
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
