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
import type { UserService } from "./user.service";

@Controller("/user")
export class UserController {
  constructor(
    @Inject("customService") private userService: UserService,
    ad: string
  ) {}

  @Get(":id")
  async getUserInfo(@Param("id") userId: string): Promise<UserInfo> {
    return await this.userService.getUserInfo(userId);
  }

  @Post("add")
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
