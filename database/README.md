# Migrations — Programa Mãe Salvador

Migrations SQL para o banco da aplicação (PostgreSQL).

## Onde fica o .env

Use **um único arquivo** em **`apps/dashboard/.env`**. O Next.js (dashboard) e o script `run-migrations.js` leem daí. Exemplo:

- `apps/dashboard/.env` — `APP_DATABASE_URL`, `CNS_FEDERAL_URL`, `CNS_FEDERAL_USER`, `CNS_FEDERAL_PASSWORD`

Copie de `.env.example` na raiz (ou crie com essas variáveis).

## Pré-requisitos

- **PostgreSQL**: servidor instalado e acessível (banco criado, ex.: `mae_salvador`).
- **Para rodar as migrations**: use **psql** (cliente no PATH) **ou** o script Node abaixo (quando `psql` não estiver instalado/no PATH).

## Aplicar (ordem obrigatória)

**Git Bash / Linux / macOS (bash):** use `$APP_DATABASE_URL` (não `$env:...`).
```bash
# Carregar .env (opcional)
export $(grep -v '^#' .env | xargs)

psql "$APP_DATABASE_URL" -f database/migrations/001_gestante_cadastro.sql
psql "$APP_DATABASE_URL" -f database/migrations/002_tabelas_dominio.sql
psql "$APP_DATABASE_URL" -f database/migrations/003_gestante_cadastro_fks.sql
```

**Windows (PowerShell):** use `$env:APP_DATABASE_URL`.
```powershell
# Defina a URL (ou use a do seu .env)
$env:APP_DATABASE_URL = "postgresql://usuario:senha@localhost:5432/mae_salvador"

psql $env:APP_DATABASE_URL -f database/migrations/001_gestante_cadastro.sql
psql $env:APP_DATABASE_URL -f database/migrations/002_tabelas_dominio.sql
psql $env:APP_DATABASE_URL -f database/migrations/003_gestante_cadastro_fks.sql
```

**URL explícita (qualquer SO):**
```bash
psql postgresql://usuario:senha@localhost:5432/mae_salvador -f database/migrations/001_gestante_cadastro.sql
psql postgresql://usuario:senha@localhost:5432/mae_salvador -f database/migrations/002_tabelas_dominio.sql
psql postgresql://usuario:senha@localhost:5432/mae_salvador -f database/migrations/003_gestante_cadastro_fks.sql
```

**Quando `psql` não está no PATH (usa Node + pacote `pg`):**
```bash
# Na raiz do projeto; .env já deve ter APP_DATABASE_URL
cd apps/dashboard && node ../../database/run-migrations.js
```

## Limpar e reconstruir (dropar tabelas)

Para remover todas as tabelas e rodar as migrations de novo (banco limpo):

```bash
npm run db:drop
npm run db:migrate
```

Ou com psql: `psql "$APP_DATABASE_URL" -f database/drop-tables.sql` (depois rode as migrations).

## Ordem

1. `001_gestante_cadastro.sql` — Tabela `gestante_cadastro` (cadastro da gestante, origem manual ou CIP).
2. `002_tabelas_dominio.sql` — Tabelas de domínio: identidade_genero, orientacao_sexual, distrito_sanitario, ubs, descobrimento_gestacao, programa_social, plano_saude_opcao (opções do formulário).
3. `003_gestante_cadastro_fks.sql` — Colunas FK em `gestante_cadastro` para normalizar os campos do formulário (identidade_genero_id, orientacao_sexual_id, distrito_sanitario_id, descobrimento_gestacao_id, programa_social_id, plano_saude_id, ubs_id).

## Schema

O pool da aplicação é configurado em `apps/dashboard/src/lib/db.ts` via `APP_DATABASE_URL`. Não persista dados brutos da Base Federal; use o mapeamento em `@mae-salvador/shared` (`mapPacienteBaseFederalToDadosCadastro`) e grave apenas o modelo local.
