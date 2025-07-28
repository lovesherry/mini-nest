import { app } from "@packages/platform-express";
import { RouterExplorer } from "./router";

export class NestFactory {
  static create(controller: any) {
    const routerExplorer = new RouterExplorer(app);
    routerExplorer.registerController(controller);
    return app;
  }
}
