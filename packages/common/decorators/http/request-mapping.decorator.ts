import { METHOD_METADATA, PATH_METADATA } from "@packages/common/constants";
import { RequestMethod } from "@packages/common/enums";

const requestMapping = (metadata: {
  [PATH_METADATA]: string;
  [METHOD_METADATA]: RequestMethod;
}): MethodDecorator => {
  const path = metadata[PATH_METADATA];
  const method = metadata[METHOD_METADATA];
  return (target, key, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);
  };
};
const createMappingDecorator = (method: RequestMethod = RequestMethod.GET) => {
  return (path: string = ""): MethodDecorator =>
    requestMapping({
      [PATH_METADATA]: path,
      [METHOD_METADATA]: method,
    });
};
export const Get = createMappingDecorator(RequestMethod.GET);
export const Post = createMappingDecorator(RequestMethod.POST);
