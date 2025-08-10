import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@packages/common";
import type { Response } from "express";
import { UserInfo } from "../types";
import { UserService } from "./user.service";

@Controller()
export class UserController {
  constructor(private userService: UserService, ad: string) {}

  @Get("/user/:id")
  async getUserInfo(@Param("id") userId: string): Promise<UserInfo> {
    return await this.userService.getUserInfo(userId);
  }

  @Post("/addUser")
  addUser(
    @Body("name") name: string,
    @Body() body: object,
    @Res() res: Response,
    @Req() req: Request
  ) {
    res.setHeader("content-type", "application/json");
    return {
      name,
      id: 1,
    };
  }
}
