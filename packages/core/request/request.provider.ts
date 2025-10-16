// packages/core/request/request.provider.ts
import { Scope } from "@packages/common";
import { Provider } from "@packages/common/interfaces";

export const REQUEST = Symbol("REQUEST");

const noop = () => {};

export const requestProvider: Provider = {
  provide: REQUEST,
  scope: Scope.REQUEST,
  useFactory: noop,
  inject: [],
};
