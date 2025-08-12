import { Type } from "../type.interface";
import { InjectionToken } from "./injection-token.interface";

export interface InstanceWrapper<T = any> {
  token: InjectionToken;
  metatype: Type<T>;
  instance: T | null;
  inject?: InjectionToken[];
  isAlias?: boolean;
}
