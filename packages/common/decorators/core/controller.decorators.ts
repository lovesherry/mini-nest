import { PATH_METADATA } from "@packages/common/constants";

export function Controller(prefix = ""): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(PATH_METADATA, prefix, target);
  };
}
