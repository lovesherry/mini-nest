import express, { Express } from "express";

function createHttpServer(): Express {
  const app = express();
  app.use(express.json());
  return app;
}

export default createHttpServer;
