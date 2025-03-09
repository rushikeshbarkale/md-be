const { Pool } = require("pg");

// require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

const isProduction = process.env.ENV_TYPE === "production";

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // Required for Render
        },
      }
    : {
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
      }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
};
