import { RouterExplorer } from "./router";
import { Container } from "./injector/container";
import { Type } from "@packages/common/interfaces";
import createHttpServer from "@packages/platform-express";
import { Module } from "./injector/module";

type IEntryNestModule = Type<any>;

export class NestFactory {
  static create(moduleCls: IEntryNestModule) {
    const httpServer = createHttpServer();
    // 创建DI容器
    const container = new Container();

    // 1. 递归扫描模块（构建模块依赖图）
    this.scanModules(moduleCls, container);

    // 2. 填充 providers/controllers/exports
    this.registerModules(container);

    // 3. 注册路由（入口模块）
    const routerExplorer = new RouterExplorer(httpServer, container);
    routerExplorer.registerAllRoutes();
    console.log(container.getModules());

    return httpServer;
  }

  private static scanModules(
    moduleCls: Type<any>,
    container: Container
  ): Module {
    const moduleRef = container.addModule(moduleCls);
    const imports = Reflect.getMetadata("imports", moduleCls) || [];

    for (const importedModule of imports) {
      const importedRef = this.scanModules(importedModule, container);
      moduleRef.addImport(importedRef);
    }

    return moduleRef;
  }

  private static registerModules(container: Container) {
    container.getModules().forEach((moduleRef) => {
      const moduleClass = moduleRef.metatype;

      const providers = Reflect.getMetadata("providers", moduleClass) || [];
      for (const p of providers) {
        moduleRef.addProvider(p);
      }

      const controllers = Reflect.getMetadata("controllers", moduleClass) || [];
      for (const c of controllers) {
        moduleRef.addController(c);
      }

      const exportsList = Reflect.getMetadata("exports", moduleClass) || [];
      for (const e of exportsList) {
        moduleRef.addExportedProviderOrModule(e);
      }
    });
  }
}
