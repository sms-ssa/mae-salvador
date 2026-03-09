# Project Brain — Mãe Salvador

Contexto principal do projeto para humanos e agentes de IA.

---

## System overview

**Mãe Salvador** é uma solução digital para acompanhamento pré-natal na rede pública de Salvador. Inclui:

- **Dashboard web (Next.js)** — Painel para profissionais e gestores: login por perfil, painel de gestantes, ficha da gestante (resumo, consultas, exames, vacinas, medicações, Transcard), registro de consulta, indicadores Previne Brasil. Consome API própria (Next.js API Routes) e PostgreSQL; integra com CNS/e-SUS para busca de cidadão.
- **App mobile (Expo)** — Caderneta digital da gestante: login (mock), resumo da gestação, caderneta (dados, consultas, exames, vacinas, medicações), cartão Mãe Salvador, notificações.
- **Pacote shared** — Tipos TypeScript, constantes (UBS, distritos, fatores de risco), mocks e mapeamentos (Base Federal → cadastro) usados por dashboard e mobile.
- **Database** — PostgreSQL; migrations SQL numeradas em `database/migrations/`; script Node `run-migrations.js`; variável `APP_DATABASE_URL` em `apps/dashboard/.env`.

O MVP usa dados mock no front; parte do fluxo gestante já persiste no banco (cadastro, login, verificação, confirmação, esqueceu-senha) e busca cidadão via e-SUS/CNS quando configurado.

---

## Frameworks used

| Camada | Tecnologia |
|--------|------------|
| **Monorepo** | npm workspaces (`apps/*`, `packages/*`) |
| **Dashboard** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/UI (Radix), Recharts, TanStack Table, react-hook-form, Zod |
| **Dashboard API** | Next.js API Routes (Route Handlers), `pg` (PostgreSQL) |
| **Mobile** | React Native, Expo SDK 54, expo-router, Zustand, TypeScript |
| **Shared** | TypeScript, Zod (tipos/validação) |
| **Banco** | PostgreSQL; migrations SQL manuais |
| **Deploy** | Vercel (dashboard); ver `docs/DEPLOY_WINDOWS.md` para Windows |

---

## Module responsibilities

| Módulo / pasta | Responsabilidade |
|----------------|------------------|
| **apps/dashboard** | App web do profissional/gestor: rotas (App Router), API Routes, UI (Shadcn, Tailwind), auth, integração CNS/e-SUS, persistência PostgreSQL |
| **apps/dashboard/src/app** | Rotas: `(dashboard)/` (área autenticada), `gestante/` (fluxo gestante), `login/`, `api/` (endpoints) |
| **apps/dashboard/src/components** | Componentes React: `ui/` (primitivos Shadcn), `app-sidebar`, `risk-badge`, `transcard-tab`, `providers` |
| **apps/dashboard/src/lib** | Serviços e infra: `db.ts` (pool PostgreSQL), `auth-context.tsx`, `senha.ts`, `citizen-lookup-service.ts`, `citizen-providers/` (e-SUS, SOAP), `cns-federal.ts`, `validacoes-login.ts`, `utils.ts` |
| **apps/dashboard/src/hooks** | Hooks globais (ex.: `use-mobile.ts`); auth via `useAuth()` em `lib/auth-context` |
| **apps/mobile** | App Expo da gestante: telas (expo-router), store Zustand, dados/orientações locais |
| **packages/shared** | Tipos, constantes, mocks, `map-base-federal`; export em `index.ts`; consumido por dashboard e mobile |
| **database** | Migrations SQL (`migrations/*.sql`), `run-migrations.js`, `run-drop-tables.js`; schema do app |

---

## Coding conventions

- **Rotas:** App Router; uma pasta por rota; `page.tsx` e `layout.tsx`; API em `app/api/<recurso>/<acao>/route.ts` com export `GET`/`POST`/etc.
- **Nomenclatura:** Arquivos em kebab-case; componentes React em PascalCase; hooks com prefixo `use`; tipos/interfaces em PascalCase.
- **API:** Respostas JSON com `{ ok: boolean, ... }`; status 400 (validação), 401/403 (auth), 409 (conflito), 500 (erro), 503 (serviço indisponível). Log com prefixo `[API recurso/acao]` em `console.error`.
- **Banco:** snake_case nas colunas/tabelas; camelCase no TypeScript/JSON; pool via `getAppPool()` e `isAppDatabaseConfigured()` de `@/lib/db`.
- **Shared:** Tipos e DTOs em `packages/shared/src/types.ts`; constantes em `constants.ts`; export central em `index.ts`. CamelCase nos tipos.
- **Formulários:** react-hook-form + Zod quando aplicável; validação também no backend (API).
- **Estilo:** Tailwind; componentes base em Shadcn; evitar estilos inline exceto quando necessário.
- **Config:** Uma única `.env` em `apps/dashboard/.env`; documentar novas variáveis em `.env.example` na raiz.

---

## Critical components

Componentes e módulos sensíveis à alteração; mudanças aqui impactam fluxos centrais.

| Componente / arquivo | Motivo |
|----------------------|--------|
| **apps/dashboard/src/lib/db.ts** | Singleton do pool PostgreSQL; usado por todas as API e serviços que acessam o banco. |
| **apps/dashboard/src/lib/auth-context.tsx** | Estado global de autenticação e nível de acesso; usado pelo layout `(dashboard)` e pelas páginas protegidas. |
| **apps/dashboard/src/app/(dashboard)/layout.tsx** | Layout da área autenticada; redireciona para `/login` se não houver usuário; sidebar e seletor de nível. |
| **apps/dashboard/src/app/gestante/cadastrar/page.tsx** | Formulário de cadastro da gestante; muito grande (~1300+ linhas); concentra estado e validações; refatoração recomendada (ver `AI/architecture.md`). |
| **apps/dashboard/src/app/api/gestante/cadastrar/route.ts** | Endpoint de criação de cadastro; validações e INSERT; contrato consumido pelo front. |
| **apps/dashboard/src/lib/citizen-lookup-service.ts** | Orquestra busca de cidadão (e-SUS depois SOAP); usado por `api/cns/buscar` e fluxo de pesquisa/cadastro. |
| **apps/dashboard/src/lib/citizen-providers/** | Implementações de `ICitizenProvider`; integração com sistemas externos. |
| **apps/dashboard/src/lib/senha.ts** | Hash e verificação de senha; usado no login, cadastro e esqueceu-senha. |
| **packages/shared/src/types.ts** | Contratos de dados compartilhados; alterações afetam dashboard e mobile. |
| **packages/shared/src/constants.ts** | UBS, distritos, fatores de risco; usados em formulários e listas. |
| **database/migrations/** e **database/run-migrations.js** | Schema e ordem de execução; novas migrations devem ser registradas no array em `run-migrations.js`. |

---

## Important dependencies

- **Dashboard → shared:** `@mae-salvador/shared` para tipos, constantes, mocks e `map-base-federal`. Build do shared: `npm run shared:build`; dashboard usa `transpilePackages`.
- **API Routes → lib:** Handlers importam `getAppPool`, `isAppDatabaseConfigured`, `hashSenha`/`verificarSenha`, `getCitizenByCpfOrCns`, etc. de `@/lib/*`.
- **Páginas → components e lib:** Páginas usam `@/components/ui/*`, `RiskBadge`, `AppSidebar`, `TranscardTab` e `useAuth()`.
- **run-migrations.js:** Lê `.env` de `apps/dashboard/.env` (ou raiz); depende de `APP_DATABASE_URL` e do pacote `pg` (usado pelo dashboard; script usa require).
- **Mobile:** Consome `@mae-salvador/shared`; não depende do dashboard. Estado de auth em `store/auth-store.ts`.

Para mais detalhes de arquitetura, padrões e estratégia de migração, ver **`AI/architecture.md`**.
