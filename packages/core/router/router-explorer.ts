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
    const wrapper = moduleRef.controllers.get(controllerClass);
    if (!wrapper || !wrapper.instance) return;
    const instance = wrapper.instance;
    const prototype = controllerClass.prototype;
    const prefix: string =
      Reflect.getMetadata(PATH_METADATA, controllerClass) || "";

    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => typeof prototype[name] === "function" && name !== "constructor"
    );

    for (const methodName of methodNames) {
      const handler = prototype[methodName];
      const routePath: string = Reflect.getMetadata(PATH_METADATA, handler);
      const requestMethod = RequestMethod[
        Reflect.getMetadata(METHOD_METADATA, handler)
      ].toLocaleLowerCase() as TRequestMethod;

      if (!routePath || !requestMethod) continue; // 忽略非路由方法

      const fullPath =
        prefix + (routePath.startsWith("/") ? routePath : "/" + routePath);
      const paramMeta: RouteParamsMeta =
        Reflect.getMetadata(ROUTE_ARGS_METADATA, controllerClass, methodName) ||
        [];

      this.app[requestMethod](fullPath, async (req, res, next) => {
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
          const result = await instance[methodName](...args);
          res.send(result);
        } catch (e) {
          next(e);
        }
      });

      console.log(
        `[Route Registered] ${requestMethod.toUpperCase()} ${fullPath} -> ${
          controllerClass.name
        }.${methodName}`
      );
    }
  }
}
