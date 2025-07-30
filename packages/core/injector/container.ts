import { SELF_DECLARED_DEPS_METADATA } from "@packages/common/constants";
import { Constructor, Provider, Token } from "./types";

export class Container {
  private providers = new Map<Token, Provider>();
  private instances = new Map<Token, any>();

  register(providers: Provider[]) {
    for (const provider of providers) {
      if (typeof provider === "function") {
        this.providers.set(provider, provider);
      } else {
        this.providers.set(provider.provide, provider);
      }
    }
  }

  resolve<T>(token: Token): T | null {
    // 已缓存
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    const provider = this.providers.get(token);

    if (!provider) {
      // 用户定义了找不到映射关系的变量，返回null
      return null;
    }

    let instance: any;

    if (typeof provider === "function") {
      instance = this.instantiateClass(provider);
    } else if ("useClass" in provider) {
      instance = this.instantiateClass(provider.useClass);
    } else if ("useValue" in provider) {
      instance = provider.useValue;
    } else if ("useFactory" in provider) {
      const deps = (provider.inject || []).map((dep) => this.resolve(dep));
      instance = provider.useFactory(...deps);
    } else if ("useExisting" in provider) {
      instance = this.resolve(provider.useExisting);
    }

    this.instances.set(token, instance);
    return instance;
  }

  private instantiateClass<T>(target: Constructor<T>): T {
    const paramTypes: Token[] =
      Reflect.getMetadata("design:paramtypes", target) || [];
    const injectTokens: { index: number; param: Token }[] =
      Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];
    const args = paramTypes.map((paramType, index) => {
      const override = injectTokens.find((dep) => dep.index === index);
      const token = override ? override.param : paramType;
      return this.resolve(token);
    });

    return new target(...args);
  }
}
