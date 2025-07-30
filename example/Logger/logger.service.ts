import { Injectable } from "@packages/common";

@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(message);
  }
}
