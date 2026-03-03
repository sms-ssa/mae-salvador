/**
 * Pool PostgreSQL do banco da aplicação (Mãe Salvador).
 * Usado para persistência de gestante_cadastro e demais dados do programa.
 *
 * Variável de ambiente: APP_DATABASE_URL
 * Migrations: database/migrations/
 */

import { Pool } from "pg";

let _appPool: Pool | null = null;

export function getAppPool(): Pool {
  if (!_appPool) {
    const url = process.env.APP_DATABASE_URL;
    if (!url?.trim()) {
      throw new Error(
        "APP_DATABASE_URL não configurada. Defina no .env para usar persistência."
      );
    }
    _appPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return _appPool;
}

/** Verifica se o banco está configurado (sem criar o pool). */
export function isAppDatabaseConfigured(): boolean {
  return Boolean(process.env.APP_DATABASE_URL?.trim());
}
