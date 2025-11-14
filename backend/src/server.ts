import express, { Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import { SimplexSolverController } from './controllers/simplex-solver-controller';
import { SimplexSolverMiddleware } from './middlewares/simplex-solver-middleware';
import { SimplexSolverRouter } from './routes/simplex-solver-router';
import { SimplexSolverService } from './services/simplex-solver.service';

export class Server {
  private readonly app: Application = express();
  private readonly port: number = Number(process.env.PORT) || 3000;

  constructor() {
    this.setMiddlewares();
    this.setRouters();
    this.setSwagger();
  }

  private setMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setRouters(): void {
    const simplexService = new SimplexSolverService();
    const controller = new SimplexSolverController(simplexService);
    const middleware = new SimplexSolverMiddleware();
    const simplexSolverRouter = new SimplexSolverRouter({ controller, middleware });

    this.app.use('/problems', simplexSolverRouter.router);
  }

  private setSwagger(): void {
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('📚 Swagger disponible en http://localhost:' + this.port + '/api-docs');
  }

  public run(): void {
    this.app.listen(this.port, () => {
      console.log(`Servidor corriendo en http://localhost:${this.port}`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

const serverInstance = new Server();
export const app = serverInstance.getApp();

if (require.main === module) {
  serverInstance.run();
}


