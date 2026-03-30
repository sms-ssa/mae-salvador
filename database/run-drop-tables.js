/**
 * Remove todas as tabelas do schema (gestante_cadastro, ubs, domínios).
 * Use antes de rodar as migrations de novo para reconstruir do zero.
 * Lê APP_DATABASE_URL do .env (apps/dashboard/.env ou raiz).
 *
 * Na raiz: npm run db:drop
 */

const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

const envPath = join(__dirname, "..", "apps", "dashboard", ".env");
const envPathRoot = join(__dirname, "..", ".env");
const pathToLoad = existsSync(envPath) ? envPath : envPathRoot;
if (existsSync(pathToLoad)) {
  const env = readFileSync(pathToLoad, "utf8");
  env.split(/\r?\n/).forEach((line) => {
    const trimmed = line.replace(/\r$/, "").trim();
    const m = trimmed.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
      process.env[key] = val;
    }
  });
}

async function main() {
  const pg = require("pg");
  const url = process.env.APP_DATABASE_URL;
  if (!url?.trim()) {
    console.error("APP_DATABASE_URL não encontrada. Configure o .env.");
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, "drop-tables.sql"), "utf8");
  const client = new pg.Client({ connectionString: url });

  try {
    await client.connect();
    await client.query(sql);
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
