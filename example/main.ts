import { NestFactory } from "@packages/core";
import UserModule from "./User/user.module";

async function bootstrap() {
  const app = NestFactory.create(UserModule);
  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server listening on port ${process.env.PORT ?? 3000}`);
  });
}
bootstrap();
