import { Module } from "@packages/common/decorators/modules";
import { LoggerService } from "../Logger/logger.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: "Logger",
      useClass: LoggerService,
    },
  ],
})
export default class UserModule {}
