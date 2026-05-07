import app from "./app.js";
import "./config/db.js";
import { env } from "./config/env.js";
app.listen(env.port, () => console.log(`Server running on :${env.port}`));
