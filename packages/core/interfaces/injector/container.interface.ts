import { InjectionToken } from "@packages/common/interfaces";

export interface PropertyDependency {
  key: symbol | string;
  name: InjectionToken;
  isOptional?: boolean;
  instance?: any;
}
