import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'secret_key_dev',
  JWT_EXPIRES_IN: Number(process.env.JWT_EXPIRES_IN) || 3600,
};