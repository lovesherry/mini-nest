import { RouterExplorer } from "./router";
import { Container } from "./injector/container";
import { Type } from "@packages/common/interfaces";
import createHttpServer from "@packages/platform-express";

type IEntryNestModule = Type<any>;

export class NestFactory {
  static create(moduleCls: IEntryNestModule) {
    const httpServer = createHttpServer();
    // 创建DI容器
    const container = new Container();
    // 从模块装饰器中取出 providers / controllers 元数据
    const providers = Reflect.getMetadata("providers", moduleCls) || [];
    const controllers = Reflect.getMetadata("controllers", moduleCls) || [];
    // 注册providers
    container.registerProviders(providers);
    // 注册controllers
    container.registerControllers(controllers);

    const routerExplorer = new RouterExplorer(httpServer, container);
    // 注册controllers
    controllers.forEach((controller: Type<any>) => {
      routerExplorer.registerRoutes(controller);
    });

    return httpServer;
  }
}
