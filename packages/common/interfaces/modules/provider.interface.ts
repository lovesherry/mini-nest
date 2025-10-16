import { Scope } from "@packages/common/enums";
import { Type } from "../type.interface";
import { InjectionToken } from "./injection-token.interface";

export type Provider<T = any> =
  | Type<any>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

export interface ClassProvider<T = any> {
  provide: InjectionToken;
  useClass: Type<T>;
  scope?: Scope;
}

export interface ValueProvider<T = any> {
  provide: InjectionToken;
  useValue: T;
  scope?: Scope;
}

export interface FactoryProvider<T = any> {
  provide: InjectionToken;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject?: Array<InjectionToken>;
  scope?: Scope;
}

export interface ExistingProvider<T = any> {
  provide: InjectionToken;
  useExisting: any;
  scope?: Scope;
}
