import {
  INJECTABLE_WATERMARK,
  SCOPE_OPTIONS_METADATA,
} from "@packages/common/constants";
import { Scope } from "@packages/common/enums";
interface Options {
  scope?: Scope;
}
export function Injectable(options?: Options): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
  };
}
