/* container.ts — 以 mini-nest 为基础、参考 NestJS 行为的实现
   目标：保持与现有 InstanceWrapper 兼容，支持 ContextId/Request scope 基础行为
*/

import {
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from "@packages/common/constants";
import { InjectionToken, Type } from "@packages/common/interfaces";
import { Module } from "./module";
import { InstanceWrapper } from "./instance-wrapper";
import { STATIC_CONTEXT } from "./constants";
import { ContextId, PropertyDependency } from "../interfaces";
import {
  isNil,
  isObject,
  isSymbol,
  isString,
} from "@packages/common/utils/shared.utils";
import { REQUEST } from "../request/request.provider";

/** 简单别名，和你的代码风格一致 */
export type InjectorDependency = InjectionToken;
export interface InjectorDependencyContext {
  key?: string | symbol;
  name?: Function | string | symbol;
  index?: number;
  dependencies?: InjectorDependency[];
}

export class Container {
  private modules = new Map<Type, Module>();
  private globalModules = new Set<Module>();
  private coreModuleRef?: Module;

  addModule(moduleClass: Type): Module {
    if (!this.modules.has(moduleClass)) {
      const mod = new Module(moduleClass);
      this.modules.set(moduleClass, mod);
      // 检查是否为全局模块
      if (Reflect.getMetadata("global", moduleClass)) {
        this.globalModules.add(mod);
      }
      // 检查是否为 InternalCoreModule
      if (moduleClass.name === "InternalCoreModule") {
        this.coreModuleRef = mod;
      }
    }
    return this.modules.get(moduleClass)!;
  }
  getGlobalModules(): Set<Module> {
    return this.globalModules;
  }

  getCoreModuleRef(): Module | undefined {
    return this.coreModuleRef;
  }

  getModules() {
    return this.modules;
  }

  getModule(moduleClass: Type) {
    return this.modules.get(moduleClass);
  }

  /**
   * resolveSingleParam
   * - 在当前 module 里优先查找 providers/controllers
   * - 否则通过 imports+exports 规则递归查找（通过 resolveSingleParam 的 isRecursive 标志区分）
   * - 找到后会把依赖关系元数据（ctor/property）记录到 hostWrapper 上（addCtor/prop metadata）
   */
  private async resolveSingleParam<T>(
    hostWrapper: InstanceWrapper<T>,
    token: Type<any> | string | symbol,
    moduleRef: Module,
    keyOrIndex: symbol | string | number,
    isRecursive = false
  ): Promise<{ wrapper: InstanceWrapper; module: Module } | null> {
    // 非递归：尝试在当前 module 直接命中（providers 或 controllers）
    if (!isRecursive) {
      const wrapper =
        moduleRef.providers.get(token) ??
        moduleRef.controllers.get(token as Type);
      if (wrapper) {
        this.addDependencyMetadata(hostWrapper, keyOrIndex, wrapper);
        return { wrapper, module: moduleRef };
      }
    } else {
      // 递归到子模块（只允许 exported provider 被访问）
      if (moduleRef.providers.has(token) && moduleRef.exports.has(token)) {
        const w = moduleRef.providers.get(token)!;
        this.addDependencyMetadata(hostWrapper, keyOrIndex, w);
        return { wrapper: w, module: moduleRef };
      }
    }

    // 递归 imports：寻找被导出的 providers 或继续深入被导出的 module
    for (const importedModule of moduleRef.imports) {
      // 直接命中并且被导出（imports 的导出规则）
      if (
        importedModule.providers.has(token) &&
        importedModule.exports.has(token)
      ) {
        const w = importedModule.providers.get(token)!;
        this.addDependencyMetadata(hostWrapper, keyOrIndex, w);
        return { wrapper: w, module: importedModule };
      }

      // 找到 importedModule 中那些在其 exports 中声明的 module，并递归到这些 module
      const nestedModules = [...importedModule.imports].filter((m) =>
        importedModule.exports.has(m.metatype)
      );

      for (const nestedModule of nestedModules) {
        const found = await this.resolveSingleParam(
          hostWrapper,
          token,
          nestedModule,
          keyOrIndex,
          true
        );
        if (found) return found;
      }
    }

    return null;
  }

  protected addDependencyMetadata(
    hostWrapper: InstanceWrapper,
    keyOrIndex: symbol | string | number,
    instanceWrapper: InstanceWrapper
  ) {
    if (isSymbol(keyOrIndex) || isString(keyOrIndex)) {
      hostWrapper.addPropertiesMetadata(keyOrIndex, instanceWrapper);
    } else {
      hostWrapper.addCtorMetadata(keyOrIndex as number, instanceWrapper);
    }
  }

  /**
   * 解析构造函数参数（递归主入口）
   * - 区分 factory provider（inject 存在）和普通 class provider（通过 design:paramtypes）
   * - resolveConstructorParams 负责递归查找依赖、并在找到具体 InstanceWrapper 后通过 callback 返回实例列表（instances）
   *
   * 注意：本函数不负责实际 new 实例，callback（通常指向 instantiateClass）负责创建
   */
  private async resolveConstructorParams<T>(
    hostWrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject: InjectionToken[] | undefined,
    callback: (args: unknown[]) => void | Promise<void>,
    contextId: ContextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const isFactoryProvider = !isNil(inject);
    const [dependencies] = isFactoryProvider
      ? this.getFactoryProviderDependencies(hostWrapper)
      : this.getClassDependencies(hostWrapper);

    let isResolved = true;

    const resolveParam = async (param: InjectionToken, index: number) => {
      // param 是 token（class 或 string/symbol）
      const found = await this.resolveSingleParam(
        hostWrapper,
        param as Type | string | symbol,
        moduleRef,
        index
      );
      if (!found) {
        // 未找到依赖（稍后上层会抛错或处理）
        return undefined;
      }
      // 只返回 instance 占位（具体实例的加载/创建在 resolveComponentHost/loadInstance 时完成）
      const { wrapper: foundWrapper, module: foundModule } = found;
      // 在这里不立即 new，返回 wrapper（instantiateClass 会在 callback 中被调用）
      // 但为了保持和原实现的调用签名，我们返回 wrapper 以便后续创建实例时使用
      return { wrapper: foundWrapper, module: foundModule };
    };

    // 并行查找 dependency wrappers（注意：返回的数组元素是 wrapper/module pair）
    const wrappers = await Promise.all(dependencies.map(resolveParam));

    // 将 wrappers 转换成实例列表：对每个 wrapper 取出其实例（如果已经创建）或 undefined 占位
    // 但真正实例化仍由 callback 触发（callback 接收的 instances 对应于构造函数参数实例）
    const instances = await Promise.all(
      wrappers.map(async (entry) => {
        if (!entry) return undefined;
        const { wrapper: depWrapper, module: depModule } = entry as {
          wrapper: InstanceWrapper;
          module: Module;
        };
        // Ensure the provider is loaded for STATIC context or request/transient if appropriate.
        // 这里调用 loadProvider 去保证依赖链被遍历、实例被创建或按 context 准备好
        await this.loadProvider(depWrapper, depModule, contextId, hostWrapper);
        // 取出 instance（按 contextId 与 inquirer 处理）
        const instanceHost = depWrapper.getInstanceByContextId(
          contextId,
          hostWrapper?.id
        );
        return instanceHost.instance;
      })
    );

    isResolved && (await callback(instances));
  }

  private getFactoryProviderDependencies<T>(
    wrapper: InstanceWrapper<T>
  ): [InjectorDependency[]] {
    return [wrapper.inject as any[]];
  }

  private getClassDependencies<T>(
    wrapper: InstanceWrapper<T>
  ): [InjectorDependency[]] {
    const ctorRef = wrapper.metatype as Type<any>;
    const paramtypes = [
      ...(Reflect.getMetadata(PARAMTYPES_METADATA, ctorRef) || []),
    ];
    const selfParams: any[] =
      Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, ctorRef) || [];
    selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
    return [paramtypes];
  }

  /**
   * instantiateClass
   * - 仅负责：当上下文允许（isInContext）时将实例构造出来（new）
   * - 不负责递归或查找依赖（resolveConstructorParams 已完成那部分工作）
   */
  private async instantiateClass(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    contextId: ContextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const { metatype, inject } = wrapper;
    const instanceHost = targetMetatype.getInstanceByContextId(
      contextId,
      inquirer?.id
    );
    const isInContext =
      wrapper.isStatic(contextId, inquirer) ||
      wrapper.isInRequestScope(contextId, inquirer);

    if (isNil(inject) && isInContext) {
      // 普通 class provider
      instanceHost.instance = new (metatype as Type<any>)(...instances);
    } else if (isInContext) {
      // factory provider (metatype 是 factory 函数)
      const factoryReturnValue = (targetMetatype.metatype as any as Function)(
        ...instances
      );
      instanceHost.instance = await factoryReturnValue;
    }
    instanceHost.isResolved = true;
    return instanceHost.instance;
  }

  /**
   * loadProvider -> loadInstance 的主入口（对外使用）
   */
  public async loadProvider(
    wrapper: InstanceWrapper,
    moduleRef: Module,
    contextId: ContextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<void> {
    let collection: Map<InjectionToken, InstanceWrapper>;
    if (moduleRef.providers.has(wrapper.token)) {
      collection = moduleRef.providers;
    } else if (moduleRef.controllers.has(wrapper.token as Type)) {
      collection = moduleRef.controllers;
    } else {
      collection = moduleRef.providers; // fallback, but probably error will be thrown in loadInstance
    }
    await this.loadInstance(
      wrapper,
      collection,
      moduleRef,
      contextId,
      inquirer
    );
  }

  /**
   * loadInstance
   * - 负责以正确顺序：解析 ctor params -> instantiateClass -> apply properties
   * - 以 wrapper.inject 存在与否判断是否为 factory provider（inject 用于 factory provider）
   */
  private async loadInstance<T>(
    wrapper: InstanceWrapper,
    collection: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
    contextId: ContextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ) {
    const inquirerId = inquirer?.id;
    const instanceHost = wrapper.getInstanceByContextId(contextId, inquirerId);
    if (instanceHost.isResolved) {
      return;
    }

    const targetWrapper = collection.get(wrapper.token);
    if (!targetWrapper) {
      throw new Error(
        `Provider ${String(wrapper.token)} not found in collection`
      );
    }

    // 构造回调：当 resolveConstructorParams 完成后（instances 提取完），会调用此回调去 new 实例
    const callback = async (instances: unknown[]) => {
      const properties = await this.resolveProperties(
        wrapper,
        moduleRef,
        wrapper.inject as InjectionToken[],
        contextId,
        inquirer
      );
      const instance = await this.instantiateClass(
        instances as any[],
        wrapper,
        targetWrapper,
        contextId,
        inquirer
      );
      this.applyProperties(instance, properties);
    };

    await this.resolveConstructorParams<T>(
      wrapper,
      moduleRef,
      wrapper.inject as InjectionToken[],
      callback,
      contextId,
      inquirer
    );
  }

  public applyProperties<T = any>(
    instance: T,
    properties: PropertyDependency[] = []
  ): void {
    if (!isObject(instance)) {
      return;
    }
    properties
      .filter((item) => !isNil(item.instance))
      .forEach((item) => ((instance as any)[item.key] = item.instance));
  }

  public async createInstancesOfDependencies(
    contextId: ContextId = STATIC_CONTEXT
  ) {
    // 遍历 modules，触发 providers/controllers 的加载（单例：在 STATIC_CONTEXT 下会实际实例化）
    for (const module of this.modules.values()) {
      for (const instanceWrapper of module.providers.values()) {
        await this.loadProvider(instanceWrapper, module, contextId);
      }
      for (const instanceWrapper of module.controllers.values()) {
        await this.loadProvider(instanceWrapper, module, contextId);
      }
    }
  }

  /**
   * resolveProperties: 解析属性注入（@Inject 在属性上的情形）
   * - 如果 wrapper.inject 非空（factory provider），就忽略属性注入（factory 使用 inject[]）
   * - 否则通过 reflect metadata 找到属性依赖并 resolve
   */
  private async resolveProperties<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject?: InjectionToken[],
    contextId: ContextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper
  ): Promise<PropertyDependency[]> {
    // factory providers 使用 inject[] 注入，属性注入由 factory 自己处理，返回空数组
    if (!isNil(inject)) {
      return [];
    }

    const properties = this.reflectProperties(wrapper.metatype as Type<any>);
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          // 查找 property 的 provider wrapper
          const paramWrapper = await this.resolveSingleParam(
            wrapper,
            item.name as string,
            moduleRef,
            item.key
          );
          if (!paramWrapper) return undefined;
          const { wrapper: depWrapper, module: depModule } = paramWrapper as {
            wrapper: InstanceWrapper;
            module: Module;
          };
          // 确保依赖被 load（按 context）
          await this.loadProvider(depWrapper, depModule, contextId, wrapper);
          const host = depWrapper.getInstanceByContextId(
            contextId,
            wrapper?.id
          );
          return host.instance;
        } catch (err) {
          if (!item.isOptional) throw err;
          return undefined;
        }
      })
    );

    return properties.map((item, index) => ({
      ...item,
      instance: instances[index],
    }));
  }

  private reflectProperties<T>(type: Type<T>): PropertyDependency[] {
    const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, type) || [];
    const optionalKeys: string[] =
      Reflect.getMetadata("optional:property_deps", type) || [];
    return properties.map((item: any) => ({
      ...item,
      name: item.type,
      isOptional: optionalKeys.includes(item.key),
    }));
  }

  /**
   * 将请求对象注入到 REQUEST provider 对应的 InstanceWrapper
   * @param request 当前请求对象
   * @param contextId 对应的请求 ContextId
   */
  public registerRequestProvider<T = any>(request: T, contextId: ContextId) {
    // 找到 coreModule 内的 REQUEST provider
    if (!this.coreModuleRef) {
      throw new Error("InternalCoreModule not registered in container");
    }
    const requestWrapper = this.coreModuleRef.providers.get(REQUEST);
    if (!requestWrapper) {
      throw new Error("REQUEST provider not found in InternalCoreModule");
    }
    requestWrapper.setInstanceByContextId(contextId, {
      instance: request,
      isResolved: true,
    });
  }
}
