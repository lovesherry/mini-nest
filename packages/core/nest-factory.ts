import { app } from "@packages/platform-express";
import { RouterExplorer } from "./router";
import { Container } from "./injector/container";

export class NestFactory {
  static create(controller: any, providers: any[] = []) {
    const instance = new Container();
    instance.register(providers);
    const routerExplorer = new RouterExplorer(app, instance);
    routerExplorer.registerController(controller);

    return app;
  }
}
