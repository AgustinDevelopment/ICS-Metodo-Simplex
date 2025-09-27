import { Router } from 'express';

export abstract class BaseRouter<Controller> {
    public router: Router;
    protected readonly controller: Controller;

    constructor(controller: Controller) {
        this.router = Router();
        this.controller = controller;
        this.setRoutes();
    }

    protected abstract setRoutes(): void;
}
