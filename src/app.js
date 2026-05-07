import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";
import { apiRateLimit } from "./middlewares/rate-limit.middleware.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(apiRateLimit);

app.use("/api/v1", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
