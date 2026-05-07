import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export const hashPassword = async (value) => {
  return bcrypt.hash(value, env.bcrypt.saltRounds);
};

export const comparePassword = async (value, hash) => {
  return bcrypt.compare(value, hash);
};
