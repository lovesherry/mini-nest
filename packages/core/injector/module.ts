import {
  ClassProvider,
  ExistingProvider,
  FactoryProvider,
  InjectionToken,
  Provider,
  Type,
  ValueProvider,
} from "@packages/common/interfaces";
import { InstanceWrapper } from "../instance-wrapper";

export class Module {
  private _providers = new Map<InjectionToken, InstanceWrapper>();
  private _controllers = new Map<Type, InstanceWrapper>();
  private _exports = new Set<InjectionToken>();
  private _imports = new Set<Module>();

  constructor(public metatype: Type<any>) {}

  get controllers() {
    return this._controllers;
  }

  get providers() {
    return this._providers;
  }

  get imports() {
    return this._imports;
  }

  get exports() {
    return this._exports;
  }

  public addImport(module: Module) {
    this._imports.add(module);
  }

  public addProvider(provider: Provider) {
    // Custom provider
    if (this.isCustomProvider(provider)) {
      return this.addCustomProvider(provider);
    }
    // provider is a class
    this._providers.set(
      provider as InjectionToken,
      new InstanceWrapper({
        token: provider as InjectionToken,
        metatype: provider as Type,
        instance: null,
      })
    );
    return provider;
  }

  public addController(controller: Type) {
    this._controllers.set(
      controller,
      new InstanceWrapper({
        token: controller,
        metatype: controller,
        instance: null,
      })
    );
  }

  public addExportedProviderOrModule(exported: Provider | string | symbol) {
    if ((exported as any).provide) {
      return this._exports.add((exported as any).provide);
    }
    this._exports.add(exported as InjectionToken);
  }

  private isCustomProvider(
    provider: Provider
  ): provider is
    | ClassProvider
    | ValueProvider
    | FactoryProvider
    | ExistingProvider {
    return !!(provider && (provider as any).provide);
  }

  private addCustomProvider(
    provider: ClassProvider | ValueProvider | FactoryProvider | ExistingProvider
  ) {
    if (this.isCustomClass(provider)) {
      const { provide, useClass } = provider;
      this._providers.set(
        provide,
        new InstanceWrapper({
          token: provide,
          metatype: useClass,
          instance: null,
        })
      );
    } else if (this.isCustomValue(provider)) {
      const { provide, useValue } = provider;
      this._providers.set(
        provide,
        new InstanceWrapper({
          token: provide,
          metatype: null as any,
          instance: useValue,
        })
      );
    } else if (this.isCustomFactory(provider)) {
      const { provide, useFactory, inject = [] } = provider;
      this._providers.set(
        provide,
        new InstanceWrapper({
          token: provide,
          metatype: useFactory as any,
          instance: null,
          inject,
        })
      );
    } else if (this.isCustomUseExisting(provider)) {
      const { provide, useExisting } = provider;
      this._providers.set(
        provide,
        new InstanceWrapper({
          token: provide,
          metatype: (instance: any) => instance,
          instance: null,
          inject: [useExisting],
        })
      );
    }
    return (provider as any).provide;
  }

  private isCustomClass(provider: any): provider is ClassProvider {
    return provider && provider.useClass !== undefined;
  }
  private isCustomValue(provider: any): provider is ValueProvider {
    return provider && provider.useValue !== undefined;
  }
  private isCustomFactory(provider: any): provider is FactoryProvider {
    return provider && provider.useFactory !== undefined;
  }
  private isCustomUseExisting(provider: any): provider is ExistingProvider {
    return provider && provider.useExisting !== undefined;
  }
}
