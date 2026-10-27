import { Sequelize } from "sequelize";
import type { Dialect } from "sequelize";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function databaseDialect(): Dialect {
  const dialect = process.env.DB_DIALECT;

  switch (dialect) {
    case "mysql":
    case "postgres":
    case "sqlite":
    case "mariadb":
    case "mssql":
    case "db2":
    case "snowflake":
    case "oracle":
      return dialect;
    default:
      throw new Error(`Unsupported or missing DB_DIALECT: ${dialect}`);
  }
}

const sequelize = new Sequelize(
  requiredEnvironmentVariable("DB_NAME"),
  requiredEnvironmentVariable("DB_USER"),
  requiredEnvironmentVariable("DB_PASSWORD"),
  {
    host: process.env.DB_HOST,
    dialect: databaseDialect(),
  },
);

export default sequelize;
