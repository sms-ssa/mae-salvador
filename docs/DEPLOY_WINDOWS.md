# Deploy no servidor Windows — Programa Mãe Salvador MVP

Passo a passo para colocar o projeto em produção em um servidor Windows, usando Git e (opcionalmente) FTP, incluindo criação do banco e tabelas.

---

## 1. Pré-requisitos no servidor Windows

Instale no servidor:

| Item | Versão sugerida | Onde obter |
|------|-----------------|------------|
| **Node.js** | 20 LTS ou 22 LTS | https://nodejs.org/ (instalador Windows) |
| **npm** | Vem com Node | — |
| **PostgreSQL** | 14 ou 15 | https://www.postgresql.org/download/windows/ |
| **Git** | Última estável | https://git-scm.com/download/win |

- Abra um novo **PowerShell** ou **CMD** após instalar e confira:
  ```powershell
  node -v
  npm -v
  git --version
  psql --version
  ```
- Se `psql` não estiver no PATH, você pode rodar as migrations pelo script Node (passo 6).

---

## 2. Acesso ao projeto via Git

No servidor, escolha a pasta onde o projeto ficará (ex.: `C:\inetpub\mae-salvador` ou `D:\apps\mae-salvador-mvp`).

**Se ainda não clonou:**

```powershell
cd C:\caminho\da\pasta
git clone https://github.com/sms-ssa/mae-salvador.git mae-salvador-mvp
cd mae-salvador-mvp
```

**Se já clonou (atualizar código):**

```powershell
cd C:\caminho\da\pasta\mae-salvador-mvp
git fetch origin
git pull origin main
```

(Ajuste `main` para o nome da branch que você usa, se for outra.)

---

## 3. Variáveis de ambiente (.env)

O dashboard e o script de migrations leem o `.env` de **`apps/dashboard/.env`** (ou da raiz do projeto como fallback). **Não** commite o `.env` no Git; crie/edite apenas no servidor.

1. Na raiz do projeto, copie o exemplo:
   ```powershell
   copy .env.example apps\dashboard\.env
   ```

2. Edite `apps\dashboard\.env` e preencha com os valores de **produção**:

```env
# ── Base Federal (CNS) ────────────────────────────────────────
CNS_FEDERAL_URL=http://177.20.6.29:8181/JAXWebserviceCnsMS/ServicoCns
CNS_FEDERAL_USER=SeuUsuarioProducao
CNS_FEDERAL_PASSWORD=SuaSenhaProducao

# ── Banco da aplicação (PostgreSQL no servidor) ───────────────
APP_DATABASE_URL=postgresql://usuario:senha@localhost:5432/mae_salvador?schema=public

# ── Banco e-SUS (se usar) ─────────────────────────────────────
ESUS_DATABASE_URL=postgresql://usuario:senha@localhost:5432/esus

# ── CIP (SQL Server) — opcional; deixe vazio para desativar ───
CIP_DATABASE_SERVER=172.22.16.19
CIP_DATABASE_NAME=DB_CIP_DEV
CIP_DATABASE_USER=usr_cip_dml
CIP_DATABASE_PASSWORD=SuaSenha
CIP_DATABASE_TRUST_CERTIFICATE=false
```

- Troque `usuario`, `senha`, `localhost` e nome do banco conforme o PostgreSQL do servidor.
- Se não usar e-SUS ou CIP, pode comentar ou omitir as variáveis correspondentes.

---

## 4. Instalação de dependências

Na **raiz** do projeto (monorepo com workspaces):

```powershell
cd C:\caminho\da\pasta\mae-salvador-mvp
npm install
```

Isso instala dependências da raiz, de `apps/dashboard`, `apps/mobile` e `packages/shared`.

---

## 5. Banco de dados PostgreSQL

### 5.1 Criar o banco (se ainda não existir)

No PostgreSQL do servidor, crie o banco e um usuário com permissão:

- **Opção A — pgAdmin ou outra ferramenta gráfica:**  
  Crie um banco chamado `mae_salvador` e um usuário com permissão total nesse banco.

- **Opção B — linha de comando (psql):**
  ```powershell
  psql -U postgres
  ```
  No prompt:
  ```sql
  CREATE USER seu_usuario WITH PASSWORD 'sua_senha';
  CREATE DATABASE mae_salvador OWNER seu_usuario;
  \q
  ```

Use o mesmo `usuario` e `senha` em `APP_DATABASE_URL` no `.env`.

---

## 6. Executar migrations (criar tabelas)

As tabelas são criadas pelos arquivos em `database/migrations/`, nesta ordem:

1. `001_gestante_cadastro.sql` — tabela principal de cadastro da gestante  
2. `002_tabelas_dominio.sql` — tabelas de domínio (identidade_genero, orientacao_sexual, distrito_sanitario, ubs, etc.)  
3. `003_gestante_cadastro_fks.sql` — FKs e normalização em `gestante_cadastro`

**Forma recomendada (Node; não exige `psql` no PATH):**

Na raiz do projeto, com `apps/dashboard/.env` já configurado (incluindo `APP_DATABASE_URL`):

```powershell
cd C:\caminho\da\pasta\mae-salvador-mvp
npm run db:migrate
```

Esse comando roda `node database/run-migrations.js`, que:

- Lê `APP_DATABASE_URL` do `.env` (de `apps/dashboard/.env` ou raiz)
- Cria o banco `mae_salvador` se não existir (conectando em `postgres`)
- Executa as três migrations na ordem acima

**Alternativa com psql (se estiver no PATH):**

```powershell
$env:APP_DATABASE_URL = "postgresql://usuario:senha@localhost:5432/mae_salvador"
psql $env:APP_DATABASE_URL -f database\migrations\001_gestante_cadastro.sql
psql $env:APP_DATABASE_URL -f database\migrations\002_tabelas_dominio.sql
psql $env:APP_DATABASE_URL -f database\migrations\003_gestante_cadastro_fks.sql
```

Após rodar, as tabelas (ex.: `gestante_cadastro`, `identidade_genero`, `ubs`, etc.) estarão criadas e a aplicação poderá usá-las.

---

## 7. Build para produção

Na raiz do projeto:

```powershell
cd C:\caminho\da\pasta\mae-salvador-mvp
npm run shared:build
npm run build --workspace=apps/dashboard
```

Ou, de forma equivalente:

```powershell
npm run shared:build
cd apps\dashboard
npm run build
cd ..\..
```

O build do dashboard gera a pasta `apps/dashboard/.next` pronta para `next start`.

---

## 8. Rodar a aplicação em produção

### 8.1 Teste rápido (porta 3000)

```powershell
cd C:\caminho\da\pasta\mae-salvador-mvp\apps\dashboard
npm run start
```

O dashboard ficará em `http://localhost:3000`. Interrompa com Ctrl+C quando for configurar um servidor permanente.

### 8.2 Manter rodando (recomendado no Windows)

Para manter o Node rodando após fechar o terminal e reiniciar após falhas, use um gerenciador de processos.

**Opção A — PM2 (recomendado)**

1. Instale globalmente:
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```
2. Na raiz do projeto, inicie o dashboard:
   ```powershell
   cd C:\caminho\da\pasta\mae-salvador-mvp
   pm2 start apps/dashboard/package.json --name "mae-salvador-dashboard" -- start
   ```
3. Salve a lista de processos e (opcional) configure para iniciar com o Windows:
   ```powershell
   pm2 save
   pm2-startup install
   ```

**Opção B — Serviço Windows (NSSM ou similar)**

- Use NSSM ou outro utilitário para criar um serviço que execute:
  - **Comando:** `node.exe`
  - **Argumentos:** `node_modules\next\dist\bin\next` `start`
  - **Diretório de trabalho:** `C:\caminho\da\pasta\mae-salvador-mvp\apps\dashboard`

Garanta que o serviço tenha acesso ao mesmo `.env` (ex.: definindo o diretório de trabalho em `apps/dashboard`).

---

## 9. Porta e firewall

- Por padrão o Next.js usa a porta **3000**. Para outra porta:
  ```powershell
  $env:PORT=8080
  npm run start
  ```
  (ou defina `PORT=8080` no `.env` ou no gerenciador de processos.)

- No **Firewall do Windows**, libere a porta escolhida (ex.: 3000 ou 8080) para acesso externo, se necessário.

---

## 10. Publicar na web (IIS como proxy reverso)

Se quiser que o site seja acessado por um domínio ou pela porta 80/443 no IIS:

1. Instale o **URL Rewrite** e o **Application Request Routing (ARR)** no IIS.
2. Crie um **Site** ou um **Application** no IIS apontando para uma pasta (pode ser vazia ou estática).
3. Crie uma regra de **Reverse Proxy** para encaminhar as requisições para `http://localhost:3000` (ou a porta que o `next start` estiver usando).

Assim, o IIS recebe o tráfego e repassa para o Node; o Node continua rodando com PM2 ou como serviço.

---

## 11. FTP (atualizar apenas arquivos)

Se você usa FTP apenas para enviar arquivos (e não para rodar o app):

- O **código** e o **build** devem estar no servidor (via Git + build no servidor, como nos passos 2 e 7).
- Não é recomendável fazer o build na sua máquina e subir a pasta `.next` por FTP: o caminho e o ambiente podem ser diferentes. O ideal é **git pull** no servidor e **npm run build** lá.
- Use o FTP para arquivos estáticos extras ou para backup, se fizer sentido; a aplicação em si deve rodar a partir do repositório clonado no servidor.

---

## 12. Checklist rápido

- [ ] Node.js, npm, Git e PostgreSQL instalados no servidor  
- [ ] Projeto clonado/atualizado via Git  
- [ ] `apps/dashboard/.env` criado e preenchido (APP_DATABASE_URL, CNS_*, CIP_* se usar)  
- [ ] `npm install` na raiz  
- [ ] Banco `mae_salvador` criado no PostgreSQL  
- [ ] `npm run db:migrate` executado (tabelas criadas)  
- [ ] `npm run shared:build` e build do dashboard (`npm run build --workspace=apps/dashboard`)  
- [ ] Dashboard rodando com `npm run start` (ou PM2/serviço)  
- [ ] Firewall/IIS configurados se for acesso externo  

---

## 13. Resumo dos comandos (em ordem)

```powershell
cd C:\caminho\da\pasta\mae-salvador-mvp
git pull origin main
copy .env.example apps\dashboard\.env
# Editar apps\dashboard\.env com dados de produção
npm install
npm run db:migrate
npm run shared:build
npm run build --workspace=apps/dashboard
cd apps\dashboard
npm run start
```

Para uso com PM2, após o primeiro build:

```powershell
pm2 start apps/dashboard/package.json --name "mae-salvador-dashboard" -- start
pm2 save
```

Com isso você tem o passo a passo completo até a construção das tabelas e tudo que precisa para rodar o Programa Mãe Salvador no servidor Windows.
