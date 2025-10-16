import { Type, InjectionToken } from "@packages/common/interfaces";
import { ContextId } from "../interfaces";
import { STATIC_CONTEXT } from "./constants";
import { Scope } from "@packages/common";
import { uid } from "uid";

const INSTANCE_METADATA_SYMBOL = Symbol.for("instance_metadata:cache");
const INSTANCE_ID_SYMBOL = Symbol.for("instance_metadata:id");
interface InstanceMetadataStore {
  dependencies?: InstanceWrapper[];
  properties?: PropertyMetadata[];
}

interface PropertyMetadata {
  key: symbol | string;
  wrapper: InstanceWrapper;
}
export interface InstancePerContext<T> {
  instance: T;
  isResolved?: boolean;
  isPending?: boolean;
  donePromise?: Promise<unknown>;
}

export class InstanceWrapper<T = any> {
  // 唯一标识 token（类、字符串或符号）
  public readonly token!: InjectionToken;
  // 对应的类构造函数（useClass）或 factory 函数
  public metatype!: Type<T> | Function | null;
  public inject?: InjectionToken[] | null = null;

  public scope: Scope = Scope.DEFAULT;
  private readonly values = new WeakMap<ContextId, InstancePerContext<T>>();

  private readonly [INSTANCE_METADATA_SYMBOL]: InstanceMetadataStore = {};

  private isTreeStatic: boolean | undefined;

  public readonly [INSTANCE_ID_SYMBOL]: string;

  constructor(
    options: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>> = {}
  ) {
    const { instance, isResolved, scope, ...rest } = options;
    Object.assign(this, rest);
    if (scope !== undefined) {
      this.scope = scope;
    }
    this.setInstanceByContextId(STATIC_CONTEXT, {
      instance: instance as T,
      isResolved,
    });
    this[INSTANCE_ID_SYMBOL] =
      options[INSTANCE_ID_SYMBOL] ?? this.generateUuid();
  }

  set instance(value: T) {
    this.values.set(STATIC_CONTEXT, { instance: value });
  }
  get instance(): T {
    const instancePerContext = this.getInstanceByContextId(STATIC_CONTEXT);
    return instancePerContext.instance;
  }

  get isTransient(): boolean {
    return this.scope === Scope.TRANSIENT;
  }
  get id(): string {
    return this[INSTANCE_ID_SYMBOL];
  }
  private generateUuid(): string {
    return uid(21);
  }

  public setInstanceByContextId(
    contextId: ContextId,
    value: InstancePerContext<T>
  ) {
    this.values.set(contextId, value);
  }

  public getInstanceByContextId(
    contextId: ContextId,
    inquirerId?: string
  ): InstancePerContext<T> {
    const instancePerContext = this.values.get(contextId);
    return instancePerContext
      ? instancePerContext
      : contextId === STATIC_CONTEXT
      ? {
          instance: null as T,
          isResolved: true,
          isPending: false,
        }
      : this.cloneStaticInstance(contextId);
  }

  private cloneStaticInstance(contextId: ContextId): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    if (this.isDependencyTreeStatic()) {
      return staticInstance;
    }
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined!,
      isResolved: false,
      isPending: false,
    };
    if (this.metatype?.prototype) {
      instancePerContext.instance = Object.create(this.metatype!.prototype);
    }
    this.setInstanceByContextId(contextId, instancePerContext);
    return instancePerContext;
  }

  public addPropertiesMetadata(key: symbol | string, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].properties) {
      this[INSTANCE_METADATA_SYMBOL].properties = [];
    }
    this[INSTANCE_METADATA_SYMBOL].properties.push({
      key,
      wrapper,
    });
  }
  public addCtorMetadata(index: number, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].dependencies) {
      this[INSTANCE_METADATA_SYMBOL].dependencies = [];
    }
    this[INSTANCE_METADATA_SYMBOL].dependencies[index] = wrapper;
  }
  private introspectDepsAttribute(
    callback: (
      collection: InstanceWrapper[],
      lookupRegistry: string[]
    ) => boolean,
    lookupRegistry: string[] = []
  ): boolean {
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
      return false;
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL]);

    const { dependencies, properties } = this[INSTANCE_METADATA_SYMBOL];

    let introspectionResult = dependencies
      ? callback(dependencies, lookupRegistry)
      : false;

    if (introspectionResult || !properties) {
      return introspectionResult;
    }
    introspectionResult = properties
      ? callback(
          properties.map((item) => item.wrapper),
          lookupRegistry
        )
      : false;
    if (introspectionResult) {
      return introspectionResult;
    }
    return false;
  }
  public isDependencyTreeStatic(lookupRegistry: string[] = []): boolean {
    if (this.isTreeStatic !== undefined) {
      return this.isTreeStatic;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeStatic = false;
      return this.isTreeStatic;
    }
    this.isTreeStatic = !this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) => !item.isDependencyTreeStatic(registry)
        ),
      lookupRegistry
    );
    return this.isTreeStatic;
  }

  public isStatic(
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined
  ): boolean {
    const isInquirerRequestScoped =
      inquirer && !inquirer.isDependencyTreeStatic();
    const isStaticTransient = this.isTransient && !isInquirerRequestScoped;

    return (
      this.isDependencyTreeStatic() &&
      contextId === STATIC_CONTEXT &&
      (!this.isTransient ||
        (isStaticTransient && !!inquirer && !inquirer.isTransient))
    );
  }

  public isInRequestScope(
    contextId: ContextId,
    inquirer?: InstanceWrapper
  ): boolean {
    const isDependencyTreeStatic = this.isDependencyTreeStatic();

    return (
      !isDependencyTreeStatic &&
      contextId !== STATIC_CONTEXT &&
      (!this.isTransient || (this.isTransient && !!inquirer))
    );
  }
}
