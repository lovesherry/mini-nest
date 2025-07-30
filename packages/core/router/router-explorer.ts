import type { Express } from "express";
import { RequestMethod, RouteParamMetadata } from "@packages/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from "@packages/common/constants";
import { exchangeKeyForValue } from "./route-params-factory";
import { Container } from "../injector/container";

type TRequestMethod = "get" | "post" | "put" | "delete";

type RouteParamsMeta = {
  [key: string]: RouteParamMetadata;
};
export class RouterExplorer {
  constructor(private app: Express, private container: Container) {}

  public registerController(ControllerClass: new () => any) {
    const instance: any = this.container.resolve(ControllerClass);
    const prototype = ControllerClass.prototype;
    const prefix: string =
      Reflect.getMetadata(PATH_METADATA, ControllerClass) || "";

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
        Reflect.getMetadata(ROUTE_ARGS_METADATA, ControllerClass, methodName) ||
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
          ControllerClass.name
        }.${methodName}`
      );
    }
  }
}
