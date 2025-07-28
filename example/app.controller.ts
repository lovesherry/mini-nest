import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@packages/common";
import type { Response } from "express";

@Controller()
export class AppController {
  @Get("/:id")
  getHello(
    @Query("name") name: string,
    @Param("id") paramId: string,
    @Query() query: object,
    @Param() params: object
  ): string {
    return "Hello World!";
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
