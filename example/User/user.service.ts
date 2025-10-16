import { UserInfo } from "../types";
import { LoggerService } from "../Logger/logger.service";
import { Inject, Injectable, Scope } from "@packages/common";
import { REQUEST } from "@packages/core";
@Injectable({
  scope: Scope.REQUEST,
})
export class UserService {
  @Inject(LoggerService)
  private loggerService!: LoggerService;
  constructor(@Inject(REQUEST) private request: Request) {}

  async getUserInfo(id: string): Promise<UserInfo> {
    console.log("Id:", (this.request as any).params.id);
    this.loggerService.log(`getUserInfo: ${id}`);
    return {
      id,
      name: "Sherry",
      age: 18,
    };
  }
}
