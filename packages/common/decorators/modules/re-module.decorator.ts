import { ModuleMetadata } from "@packages/common/interfaces";

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target) => {
    for (const property in metadata) {
      if (Object.hasOwnProperty.call(metadata, property)) {
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }
  };
}
