import { Scope } from "@packages/common";
import { SCOPE_OPTIONS_METADATA } from "@packages/common/constants";
import { Type } from "@packages/common/interfaces";

export function getClassScope(provider: Type<unknown>): Scope {
  const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
  return metadata && metadata.scope;
}
