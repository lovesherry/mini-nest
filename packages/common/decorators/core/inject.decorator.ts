import { SELF_DECLARED_DEPS_METADATA } from "@packages/common/constants";
type Constructor<T = any> = new (...args: any[]) => T;

export function Inject(
  token: string | symbol | Constructor
): ParameterDecorator {
  return (target, propertyKey, index) => {
    let dependencies =
      Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];
    dependencies = [...dependencies, { index, param: token }];
    Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, dependencies, target);
  };
}
