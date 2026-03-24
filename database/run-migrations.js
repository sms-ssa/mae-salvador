/**
 * Executa as migrations SQL usando o cliente pg (Node).
 * Use quando psql não estiver no PATH.
 *
 * Na raiz do projeto (com .env configurado):
 *   cd apps/dashboard && node ../../database/run-migrations.js
 *
 * Ou: set APP_DATABASE_URL=... e node database/run-migrations.js (a partir de apps/dashboard)
 */

const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

// Carregar .env: apps/dashboard/.env (onde o Next.js do dashboard lê) ou raiz
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
    console.error("APP_DATABASE_URL não encontrada.");
    console.error("Arquivo .env verificado:", pathToLoad);
    console.error("Confira se em apps/dashboard/.env existe a linha: APP_DATABASE_URL=postgresql://...");
    process.exit(1);
  }

  // Criar o banco se não existir (conecta em 'postgres' para criar)
  try {
    const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1];
    if (dbName && dbName !== "postgres") {
      const urlPostgres = url.replace(/\/([^/?]+)(\?|$)/, "/postgres$2");
      const admin = new pg.Client({ connectionString: urlPostgres });
      await admin.connect();
      const r = await admin.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );
      if (r.rows.length === 0) {
        const safeName = '"' + dbName.replace(/"/g, '""') + '"';
        await admin.query("CREATE DATABASE " + safeName);
        console.log("Banco criado:", dbName);
      }
      await admin.end();
    }
  } catch (err) {
    console.error("Não foi possível criar o banco. Crie manualmente: CREATE DATABASE mae_salvador;");
    console.error("Erro:", err.message);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  const migrations = [
    "001_gestante_cadastro.sql",
    "002_tabelas_dominio.sql",
    "003_gestante_cadastro_fks.sql",
    "004_cadastro_gestante_contatos_endereco.sql",
    "005_gestante_municipio_nascimento.sql",
    "006_gestante_esqueceu_senha_tentativas.sql",
    "007_gestante_programa_social_multiplos.sql",
    "008_gestante_cadastro_programa_social_ids.sql",
  ];

  try {
    await client.connect();
    const dir = join(__dirname, "migrations");
    for (const file of migrations) {
      const sql = readFileSync(join(dir, file), "utf8");
      console.log(`Executando ${file}...`);
      await client.query(sql);
      console.log(`  OK: ${file}`);
    }
    console.log("Migrations concluídas.");
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
