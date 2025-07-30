import "reflect-metadata";
import { NestFactory } from "@packages/core";
import { UserController } from "./user.controller";
import { providers } from "./user.module";

async function bootstrap() {
  // 还没有引入 module 概念，暂时手动传递一下
  const app = NestFactory.create(UserController, providers);
  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server listening on port ${process.env.PORT ?? 3000}`);
  });
}
bootstrap();
