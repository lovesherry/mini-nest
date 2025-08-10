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
}

export interface ValueProvider<T = any> {
  provide: InjectionToken;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: InjectionToken;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject?: Array<InjectionToken>;
}

export interface ExistingProvider<T = any> {
  provide: InjectionToken;
  useExisting: any;
}
