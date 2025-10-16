import { RouterExplorer } from "./router";
import { Container } from "./injector/container";
import { Type } from "@packages/common/interfaces";
import createHttpServer from "@packages/platform-express";
import { Module } from "./injector/module";
import { InternalCoreModule } from "./internal-core-module";

type IEntryNestModule = Type<any>;

export class NestFactory {
  static async create(moduleCls: IEntryNestModule) {
    const httpServer = createHttpServer();
    // 创建DI容器
    const container = new Container();

    // 先注册核心模块
    container.addModule(InternalCoreModule);

    // 1. 递归扫描模块（构建模块依赖图）；
    // 参考源码：dependenciesScanner.scanForModules
    this.scanModules(moduleCls, container);

    // 2. 注册模块的 providers/controllers/exports
    // 参考源码：dependenciesScanner.scanModulesForDependencies
    this.registerModules(container);

    // 绑定全局模块的 providers 到其他模块
    this.bindGlobalModules(container);

    // 3. 实例化所有依赖
    // 参考源码：instanceLoader.createInstances
    await container.createInstancesOfDependencies();

    // 4. 注册路由（入口模块）
    const routerExplorer = new RouterExplorer(httpServer, container);
    routerExplorer.registerAllRoutes();

    return httpServer;
  }

  // 递归扫描模块，构建模块依赖关系（仅添加模块）
  private static scanModules(moduleCls: Type<any>, container: Container) {
    container.addModule(moduleCls);
    const imports = Reflect.getMetadata("imports", moduleCls) || [];
    for (const importedModule of imports) {
      this.scanModules(importedModule, container);
    }
  }

  // 遍历所有模块，注册 providers/controllers/exports 到 Module 实例
  private static registerModules(container: Container) {
    const modules = container.getModules();
    modules.forEach((moduleRef) => {
      const moduleClass = moduleRef.metatype;

      const imports = Reflect.getMetadata("imports", moduleClass) || [];
      for (const c of imports) {
        const importedModule = container.getModule(c);
        importedModule && moduleRef.addImport(importedModule);
      }

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

  private static bindGlobalModules(container: Container) {
    const modules = container.getModules();
    const globalModules = container.getGlobalModules();
    if (globalModules.size === 0) return;

    modules.forEach((moduleRef) => {
      if (globalModules.has(moduleRef)) {
        return;
      }
      globalModules.forEach((globalModuleRef) => {
        moduleRef.addImport(globalModuleRef);
      });
    });
  }
}
