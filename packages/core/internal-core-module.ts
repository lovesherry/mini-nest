// packages/core/internal-core-module.ts
import { Module, Global } from "@packages/common";
import { requestProvider } from "./request/request.provider";

@Global()
@Module({
  providers: [requestProvider],
  exports: [requestProvider],
})
export class InternalCoreModule {}
