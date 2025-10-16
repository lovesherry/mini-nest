import type { Express } from "express";
import { RequestMethod, RouteParamMetadata } from "@packages/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from "@packages/common/constants";
import { exchangeKeyForValue } from "./route-params-factory";
import { Container } from "../injector/container";
import { Type } from "@packages/common/interfaces";
import { Module } from "../injector/module";
import { InstanceWrapper } from "../injector/instance-wrapper";
import { ContextId } from "../interfaces";

type TRequestMethod = "get" | "post" | "put" | "delete";

type RouteParamsMeta = {
  [key: string]: RouteParamMetadata;
};
export class RouterExplorer {
  constructor(private app: Express, private container: Container) {}

  public registerAllRoutes() {
    const modules = this.container.getModules();

    for (const [, moduleRef] of modules) {
      for (const [, wrapper] of moduleRef.controllers) {
        if (!wrapper.metatype) continue;
        this.registerRoutes(wrapper.metatype as Type<any>, moduleRef);
      }
    }
  }
  private registerRoutes(controllerClass: Type<any>, moduleRef: Module) {
    // 通过遍历原型方法注册路由
    // 参考源码：PathsExplorer.scanForPaths
    const wrapper = moduleRef.controllers.get(controllerClass);
    if (!wrapper) return;
    const prototype = controllerClass.prototype;
    const prefix: string =
      Reflect.getMetadata(PATH_METADATA, controllerClass) || "";

    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => typeof prototype[name] === "function" && name !== "constructor"
    );

    for (const methodName of methodNames) {
      const handler = prototype[methodName];
      const routePath: string = Reflect.getMetadata(PATH_METADATA, handler);
      const methodMeta = Reflect.getMetadata(METHOD_METADATA, handler);
      const requestMethod = RequestMethod[
        methodMeta
      ]?.toLocaleLowerCase() as TRequestMethod;
      if (!routePath || !requestMethod) continue; // 忽略非路由方法

      const fullPath =
        prefix + (routePath.startsWith("/") ? routePath : "/" + routePath);
      // 判断依赖树是否静态，决定 handler 的生成方式
      let routeHandler: (req: any, res: any, next: any) => Promise<void>;

      if (wrapper.isDependencyTreeStatic()) {
        // 单例，直接绑定
        routeHandler = this.createCallbackProxy(
          wrapper.instance,
          methodName,
          moduleRef
        );
      } else {
        // request-scope，每次请求生成新实例
        routeHandler = this.createRequestScopedHandler(
          wrapper,
          methodName,
          moduleRef,
          controllerClass
        );
      }

      this.app[requestMethod](fullPath, routeHandler);

      console.log(
        `[Route Registered] ${requestMethod.toUpperCase()} ${fullPath} -> ${
          controllerClass.name
        }.${methodName}`
      );
    }
  }

  /**
   * 创建用于绑定 controller 方法的回调
   */
  private createCallbackProxy(
    instance: object,
    methodName: string,
    moduleRef: Module
  ): (req: any, res: any, next: any) => Promise<void> {
    const controllerClass = instance.constructor as Type<any>;
    const paramMeta: RouteParamsMeta =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, controllerClass, methodName) ||
      [];

    return async (req: any, res: any, next: any): Promise<void> => {
      try {
        const args: any[] = [];
        for (const [key, value] of Object.entries(paramMeta)) {
          const [metaType, index] = key.split(":");
          args[Number(index)] = exchangeKeyForValue(
            Number(metaType),
            value.data,
            {
              req,
              res,
              next,
            }
          );
        }
        const result = await (instance as any)[methodName](...args);
        res.send(result);
      } catch (e) {
        next(e);
      }
    };
  }

  /**
   * 创建 request-scoped handler，每次请求创建新的 controller 实例
   */
  private createRequestScopedHandler(
    wrapper: InstanceWrapper,
    methodName: string,
    moduleRef: Module,
    controllerClass: Type<any>
  ): (req: any, res: any, next: any) => Promise<void> {
    const container = this.container;
    return async (req: any, res: any, next: any): Promise<void> => {
      try {
        // 每次请求生成新的 contextId
        const contextId: ContextId = { id: Date.now() };
        // 将请求对象注入 REQUEST provider
        container.registerRequestProvider(req, contextId);
        // 递归实例化 controller 及其依赖
        await container.loadProvider(wrapper, moduleRef, contextId);

        const contextInstance =
          wrapper.getInstanceByContextId(contextId).instance;

        // 绑定参数
        const paramMeta: RouteParamsMeta =
          Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            controllerClass,
            methodName
          ) || [];
        const args: any[] = [];
        for (const [key, value] of Object.entries(paramMeta)) {
          const [metaType, index] = key.split(":");
          args[Number(index)] = exchangeKeyForValue(
            Number(metaType),
            value.data,
            {
              req,
              res,
              next,
            }
          );
        }
        const result = await (contextInstance as any)[methodName](...args);
        res.send(result);
      } catch (e) {
        next(e);
      }
    };
  }
}
