import {
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from "@packages/common/constants";
import { InjectionToken } from "@packages/common/interfaces";

export function Inject(
  token?: InjectionToken
): PropertyDecorator & ParameterDecorator {
  const injectCallHasArguments = arguments.length > 0;

  return (target: object, key: string | symbol | undefined, index?: number) => {
    let type = token || Reflect.getMetadata("design:type", target, key!);

    if (typeof index === "number") {
      // 方法参数装饰器
      let dependencies =
        Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

      dependencies = [...dependencies, { index, param: type }];
      Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, dependencies, target);
      return;
    }
    // 属性装饰器
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
