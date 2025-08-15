import { Type, InjectionToken } from "@packages/common/interfaces";

export class InstanceWrapper<T = any> {
  // 唯一标识 token（类、字符串或符号）
  public token: InjectionToken;

  // 对应的类构造函数（useClass）或 factory 函数
  public metatype: Type<T> | Function;

  // 缓存的实例
  public instance: T | null = null;

  public inject?: InjectionToken[] | null = null;

  constructor(options: {
    token: InjectionToken;
    metatype: Type<T> | Function;
    instance?: T | null;
    inject?: InjectionToken[];
  }) {
    this.token = options.token;
    this.metatype = options.metatype;
    this.instance = options.instance || null;
    this.inject = options.inject || null;
  }
}
