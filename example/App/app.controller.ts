import { Controller, Get } from "@packages/common";

@Controller()
export class AppController {
  @Get("/")
  getHello(): string {
    return "Hello World!";
  }
}
