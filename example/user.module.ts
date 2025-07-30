import { LoggerService } from "./Logger/logger.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

export const providers = [
  UserController,
  UserService,
  {
    provide: "Logger",
    useClass: LoggerService,
  },
];
