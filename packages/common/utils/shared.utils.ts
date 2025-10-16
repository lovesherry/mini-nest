export const isUndefined = (obj: any): obj is undefined =>
  typeof obj === "undefined";
export const isNil = (val: any): val is null | undefined =>
  isUndefined(val) || val === null;
export const isObject = (fn: any): fn is object =>
  !isNil(fn) && typeof fn === "object";

export const isSymbol = (val: any): val is symbol => typeof val === "symbol";
export const isString = (val: any): val is string => typeof val === "string";
