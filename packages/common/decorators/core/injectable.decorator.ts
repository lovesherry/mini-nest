import { INJECTABLE_WATERMARK } from "@packages/common/constants";

export function Injectable(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
  };
}
