import { Module } from "@packages/common/decorators/modules";
import { LoggerService } from "../Logger/logger.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { LoggerModule } from "example/Logger/logger.module";

@Module({
  imports: [LoggerModule],
  controllers: [UserController],
  providers: [
    {
      provide: "customUserService",
      useClass: UserService,
    },
  ],
})
export default class UserModule {}
