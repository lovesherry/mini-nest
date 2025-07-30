export type Constructor<T = any> = new (...args: any[]) => T;

export type Token = string | symbol | Constructor;
export interface ClassProvider {
  provide: Token;
  useClass: Constructor;
}

export interface ValueProvider {
  provide: Token;
  useValue: any;
}

export interface FactoryProvider {
  provide: Token;
  useFactory: (...args: any[]) => any;
  inject?: Token[];
}

export interface ExistingProvider {
  provide: Token;
  useExisting: Token;
}

export type Provider =
  | Constructor
  | ClassProvider
  | ValueProvider
  | FactoryProvider
  | ExistingProvider;
