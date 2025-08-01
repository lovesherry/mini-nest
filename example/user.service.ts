import { UserInfo } from "./types";
import type { LoggerService } from "./Logger/logger.service";
import { Inject, Injectable } from "@packages/common";

@Injectable()
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
