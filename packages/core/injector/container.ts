import {
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from "@packages/common/constants";
import { Token } from "./types";
import { InjectionToken, Type } from "@packages/common/interfaces";
import { Module } from "./module";
import { InstanceWrapper } from "../instance-wrapper";

export class Container {
  private modules = new Map<Type, Module>();

  addModule(moduleClass: Type): Module {
    if (!this.modules.has(moduleClass)) {
      this.modules.set(moduleClass, new Module(moduleClass));
    }
    return this.modules.get(moduleClass)!;
  }

  getModules() {
    return this.modules;
  }

  getModule(moduleClass: Type) {
    return this.modules.get(moduleClass);
  }

  /**
   * 在当前模块和其 imports 的 exports 中递归查找 InstanceWrapper
   */
  private findInstanceWrapper(
    token: InjectionToken,
    moduleRef: Module,
    isNested = false
  ): { wrapper: InstanceWrapper; module: Module } | null {
    // 1️⃣ 如果不是递归调用，先查当前模块的 providers/controllers
    if (!isNested) {
      const wrapper =
        moduleRef.providers.get(token) ??
        moduleRef.controllers.get(token as Type);
      if (wrapper) {
        return { wrapper, module: moduleRef };
      }
    } else {
      // 额外判断：当前模块自己是否同时在 providers 和 exports 中有 token
      if (moduleRef.providers.has(token) && moduleRef.exports.has(token)) {
        return { wrapper: moduleRef.providers.get(token)!, module: moduleRef };
      }
    }

    // 2️⃣ 遍历 imports
    for (const importedModule of moduleRef.imports) {
      if (
        importedModule.providers.has(token) &&
        importedModule.exports.has(token)
      ) {
        return {
          wrapper: importedModule.providers.get(token)!,
          module: importedModule,
        };
      }

      const nestedModules = [...importedModule.imports].filter((m) =>
        importedModule.exports.has(m.metatype)
      );

      for (const nestedModule of nestedModules) {
        const found = this.findInstanceWrapper(token, nestedModule, true);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * 实例化 class / normal  provider（useClass/class本身），并缓存实例
   */
  private instantiateProvider<T>(wrapper: any, moduleRef: Module): T {
    const args = this.resolveConstructorParams(wrapper.metatype, moduleRef);
    const instance = new wrapper.metatype(...args);
    wrapper.instance = instance;
    return instance;
  }

  /**
   * 实例化 factory provider（useFactory），并缓存实例
   */
  private instantiateFactoryAndExistingProvider<T>(
    wrapper: any,
    moduleRef: Module
  ): T {
    const injectTokens: InjectionToken[] = wrapper.inject || [];
    const deps = injectTokens.map((token) =>
      this.resolveSingleParam(token, moduleRef)
    );
    const instance = wrapper.metatype(...deps);
    // 新增：工厂产出的对象如果是类实例，也做属性注入
    if (instance && wrapper.metatype && typeof instance === "object") {
      this.applyProperties(instance, instance.constructor as Type, moduleRef);
    }
    wrapper.instance = instance;
    return instance;
  }

  /**
   * 解析构造函数参数依赖
   */
  private resolveConstructorParams(metatype: any, moduleRef: Module): any[] {
    const paramTypes: InjectionToken[] =
      Reflect.getMetadata("design:paramtypes", metatype) || [];
    const injectTokens: { index: number; param: Token }[] =
      Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, metatype) || [];
    return paramTypes.map((paramType, index) => {
      const override = injectTokens.find((dep) => dep.index === index);
      const token = override ? override.param : paramType;
      return this.resolveSingleParam(token, moduleRef);
    });
  }

  /**
   * 解析单个依赖参数，优先在当前模块查找，找不到则递归查找 imports
   */
  private resolveSingleParam(token: InjectionToken, moduleRef: Module) {
    const found = this.findInstanceWrapper(token, moduleRef);
    if (found) {
      const { wrapper, module } = found;
      if (!wrapper.instance) {
        this.loadProvider(wrapper, module);
      }
      return wrapper.instance;
    }
    return null;
  }

  /**
   * 通过调用 resolve 方法实例化所有模块中的 providers 和 controllers
   * 模拟 Nest 的 InstanceLoader.createInstancesOfDependencies
   */
  public async createInstancesOfDependencies() {
    for (const module of this.modules.values()) {
      for (const instanceWrapper of module.providers.values()) {
        this.loadProvider(instanceWrapper, module);
      }
      for (const instanceWrapper of module.controllers.values()) {
        this.loadProvider(instanceWrapper, module);
      }
    }
  }

  /**
   * 加载 provider，实例化并注入属性
   */
  private loadProvider(wrapper: InstanceWrapper, moduleRef: Module) {
    if (wrapper.instance) {
      return;
    }
    if (
      wrapper.metatype &&
      typeof wrapper.metatype === "function" &&
      Array.isArray(wrapper.inject)
    ) {
      this.instantiateFactoryAndExistingProvider(wrapper, moduleRef);
    } else if (wrapper.metatype && typeof wrapper.metatype === "function") {
      const instance = this.instantiateProvider(wrapper, moduleRef);
      this.applyProperties(instance, wrapper.metatype as Type, moduleRef);
    }
  }

  /**
   * 注入属性依赖
   */
  private applyProperties(instance: any, metatype: Type, moduleRef: Module) {
    const properties: Array<{ key: string; type: InjectionToken }> =
      Reflect.getMetadata(PROPERTY_DEPS_METADATA, metatype) || [];
    for (const { key, type: token } of properties) {
      const resolved = this.resolveSingleParam(token, moduleRef);
      instance[key] = resolved;
    }
  }
}
