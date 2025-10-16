import { NestFactory } from "@packages/core";
import { AppModule } from "./App/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server listening on port ${process.env.PORT ?? 3000}`);
  });
}
bootstrap();
