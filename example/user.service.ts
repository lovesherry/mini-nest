import { UserInfo } from "./types";
import type { LoggerService } from "./Logger/logger.service";
import { Inject } from "@packages/common";

export class UserService {
  constructor(@Inject("Logger") private loggerService: LoggerService) {}
  async getUserInfo(id: string): Promise<UserInfo> {
    this.loggerService.log(`getUserInfo: ${id}`);
    return {
      id,
      name: "Sherry",
      age: 18,
    };
  }
}
