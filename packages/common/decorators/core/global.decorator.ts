import "reflect-metadata";

/**
 * @Global() 装饰器
 *
 * 用于将模块标记为全局模块。
 * 被标记为全局的模块，其 providers 将自动在所有其他模块中可用，
 * 无需手动在 imports 中引入。
 */
export function Global(): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata("global", true, target);
  };
}
