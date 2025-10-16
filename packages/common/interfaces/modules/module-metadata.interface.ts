import { Type } from "../type.interface";
import { Provider } from "./provider.interface";

export interface ModuleMetadata {
  controllers?: Type<any>[];
  providers?: Provider[];
  imports?: Type<any>[];
  exports?: Array<Type<any> | Provider>;
}
