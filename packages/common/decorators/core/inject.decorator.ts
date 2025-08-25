import {
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from "@packages/common/constants";
import { InjectionToken } from "@packages/common/interfaces";

export function Inject(
  token?: InjectionToken
): PropertyDecorator & ParameterDecorator {
  return (target: object, key: string | symbol | undefined, index?: number) => {
    let type = token || Reflect.getMetadata("design:type", target, key!);

    if (typeof index === "number") {
      // 方法参数装饰器，主要是为了方法（包括contructor）参数的注入
      let dependencies =
        Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

      dependencies = [...dependencies, { index, param: type }];
      Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, dependencies, target);
      return;
    }
    // 属性装饰器，主要是为了 provider 实例化的时候绑定属性
    let properties =
      Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) || [];

    properties = [...properties, { key, type }];
    Reflect.defineMetadata(
      PROPERTY_DEPS_METADATA,
      properties,
      target.constructor
    );
  };
}
