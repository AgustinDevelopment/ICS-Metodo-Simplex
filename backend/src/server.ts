import express, { Application } from 'express';
import cors from 'cors';

import { SimplexSolverController } from './controllers/simplex-solver-controller';
import { SimplexSolverMiddleware } from './middlewares/simplex-solver-middleware';
import { SimplexSolverRouter } from './routes/simplex-solver-router';

export class Server {
  private app: Application = express();
  private port: number = Number(process.env.PORT) || 3000;

  constructor() {
    this.setMiddlewares();
    this.setRouters();
  }

  private setMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setRouters(): void {
    const controller = new SimplexSolverController();
    const middleware = new SimplexSolverMiddleware();
    const simplexSolverRouter = new SimplexSolverRouter({ controller, middleware });

    this.app.use('/problems', simplexSolverRouter.router);
  }

  public run(): void {
    this.app.listen(this.port, () => {
      console.log(`Servidor corriendo en http://localhost:${this.port}`);
    });
  }
}
