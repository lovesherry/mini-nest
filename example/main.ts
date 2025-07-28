import { NestFactory } from "@packages/core";
import { AppController } from "./app.controller";

async function bootstrap() {
  const app = NestFactory.create(AppController);
  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server listening on port ${process.env.PORT ?? 3000}`);
  });
}
bootstrap();
