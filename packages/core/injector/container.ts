import { SELF_DECLARED_DEPS_METADATA } from "@packages/common/constants";
import { Constructor, Provider, Token } from "./types";
import { InjectionToken, Type } from "@packages/common/interfaces";
import { Module } from "./module";

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

  /**
   * 依赖解析，限定在指定模块内查找
   */
  public resolve<T>(token: InjectionToken, moduleRef: Module): T {
    const { wrapper, module: foundModule } =
      this.findInstanceWrapper(token, moduleRef) || {};
    if (!wrapper || !foundModule) {
      return null as any;
    }
    if (wrapper.instance) {
      return wrapper.instance as T;
    }
    // Class provider
    if (
      wrapper.metatype &&
      typeof wrapper.metatype === "function" &&
      !wrapper.isAlias &&
      !wrapper.inject
    ) {
      return this.instantiateClassProvider(wrapper, foundModule);
    }
    // Factory provider
    if (
      wrapper.metatype &&
      typeof wrapper.metatype === "function" &&
      Array.isArray(wrapper.inject)
    ) {
      return this.instantiateFactoryProvider(wrapper, foundModule);
    }
    // Value provider
    if (wrapper.metatype === null && wrapper.instance !== undefined) {
      return this.instantiateValueProvider(wrapper, foundModule);
    }
    // Alias provider (useExisting)
    if (wrapper.isAlias && Array.isArray(wrapper.inject)) {
      return this.resolveAliasProvider(wrapper, foundModule);
    }
    return null as any;
  }

  /**
   * 在当前模块和其 imports 的 exports 中递归查找 InstanceWrapper
   */
  private findInstanceWrapper(
    token: InjectionToken,
    moduleRef: Module
  ): { wrapper: any; module: Module } | null {
    // 查找 providers 和 controllers
    let wrapper =
      moduleRef.providers.get(token) ??
      moduleRef.controllers.get(token as Type);
    if (wrapper) {
      return { wrapper, module: moduleRef };
    }
    // 递归 imports（只在 exports 中声明的 token）
    for (const importedModule of moduleRef.imports) {
      if (importedModule.exports.has(token)) {
        const found = this.findInstanceWrapper(token, importedModule);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 实例化 class provider（useClass/class本身），并缓存实例
   */
  private instantiateClassProvider<T>(wrapper: any, moduleRef: Module): T {
    const args = this.resolveConstructorParams(wrapper.metatype, moduleRef);
    const instance = new wrapper.metatype(...args);
    wrapper.instance = instance;
    return instance;
  }

  /**
   * 实例化 factory provider（useFactory），并缓存实例
   */
  private instantiateFactoryProvider<T>(wrapper: any, moduleRef: Module): T {
    const injectTokens: InjectionToken[] = wrapper.inject || [];
    const deps = injectTokens.map((token) => this.resolve(token, moduleRef));
    const instance = wrapper.metatype(...deps);
    wrapper.instance = instance;
    return instance;
  }

  /**
   * 获取 value provider（useValue），直接返回已有 instance
   */
  private instantiateValueProvider<T>(wrapper: any, _moduleRef: Module): T {
    // value provider 的 instance 已经存储，直接返回
    return wrapper.instance;
  }

  /**
   * 处理 useExisting (alias) provider
   */
  private resolveAliasProvider<T>(wrapper: any, moduleRef: Module): T {
    // useExisting 的 inject 是 [existingToken]
    const existingToken = wrapper.inject[0];
    const instance = this.resolve(existingToken, moduleRef);
    wrapper.instance = instance;
    return wrapper.instance;
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
      return this.resolve(token, moduleRef);
    });
  }
}
