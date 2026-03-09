# Skills para agente AI — Projeto Mãe Salvador

Documento gerado a partir da análise da estrutura e do código do repositório. Objetivo: definir **skills reutilizáveis** para um agente de IA trabalhar de forma segura e alinhada às convenções do projeto.

---

## Resumo da arquitetura

| Aspecto | Padrão usado |
|--------|----------------|
| **Estrutura** | Monorepo npm workspaces (`apps/dashboard`, `apps/mobile`, `packages/shared`) |
| **Dashboard** | Next.js 16 (App Router), API Routes em `src/app/api/`, lógica em `src/lib/` |
| **Backend** | Sem framework (Nest/Express); API = handlers Next.js + SQL direto via `pg` |
| **Banco** | PostgreSQL; pool singleton em `getAppPool()`; migrations SQL numeradas em `database/migrations/` |
| **Integrações** | Provider pattern: `ICitizenProvider` (e-SUS, SOAP); orquestrador `CitizenLookupService` |
| **Shared** | Tipos/DTOs e constantes em `@mae-salvador/shared`; camelCase (JSON/TS), snake_case (PostgreSQL) |
| **DI** | Não há container; import direto de serviços e `getAppPool()` |

---

## Skills priorizadas (ordem de importância)

1. **Criar novo endpoint de API** — mais frequente; padrão bem definido.
2. **Criar nova migration SQL** — evita quebrar schema e ordem de execução.
3. **Adicionar/alterar tipos e DTOs no shared** — impacto em dashboard e mobile.
4. **Criar nova página ou fluxo no dashboard** — rotas, layout, auth.
5. **Criar ou estender serviço em `lib/`** — reutilizar padrão de providers e DB.
6. **Adicionar variável de ambiente** — .env e documentação.
7. **Padrões de logging e tratamento de erros em API** — consistência e diagnóstico.
8. **Escrever testes** — garantir regras de negócio e contratos de API (quando o runner estiver configurado).

---

# Detalhamento das skills

---

## 1. Criar novo endpoint de API

### Nome
**Criar endpoint de API (Next.js App Router)**

### Propósito
Expor um novo recurso HTTP (GET/POST/etc.) no dashboard, seguindo as convenções de request/response, uso de DB e tratamento de erros do projeto.

### Quando o agente deve usar
- Usuário pede "criar API para X", "endpoint para Y", "rota POST/GET para Z".
- Precisa expor nova funcionalidade backend para o frontend ou para o mobile.

### Inputs necessários
- Método HTTP (GET, POST, PUT, DELETE).
- Caminho lógico (ex.: `gestante/atualizar`, `profissional/listar`).
- Descrição do que o endpoint faz e do formato do body/query (se aplicável).
- Se usa banco: sim/não; se usa integração externa (CNS, e-SUS): sim/não.

### Processo passo a passo

1. **Definir caminho físico**  
   - Um segmento por recurso: `apps/dashboard/src/app/api/<recurso>/<acao>/route.ts`.  
   - Ex.: `api/gestante/cadastrar/route.ts`, `api/cns/buscar/route.ts`.

2. **Criar o arquivo `route.ts`**  
   - Exportar função com nome do método: `export async function GET(request: NextRequest)` ou `POST`, etc.  
   - Importar: `NextRequest`, `NextResponse` de `"next/server"`.  
   - Se usar DB: `getAppPool`, `isAppDatabaseConfigured` de `@/lib/db`.  
   - Se usar senha: `hashSenha`/`verificarSenha` de `@/lib/senha`.  
   - Tipos/DTOs de `@mae-salvador/shared` quando aplicável.

3. **Checagem de configuração**  
   - Se o endpoint depende de banco: no início do handler,  
     `if (!isAppDatabaseConfigured()) return NextResponse.json({ ok: false, erro: "..." }, { status: 503 });`  
   - Se depende de integração (ex.: CNS): checar config (ex.: `isCnsFederalConfigured()`) e retornar 503 ou 400 com mensagem clara.

4. **Leitura de input**  
   - GET: `const { searchParams } = new URL(request.url);` e `searchParams.get("nome")`.  
   - POST/PUT: `body = await request.json()` dentro de try/catch; em caso de falha retornar 400 com mensagem "Corpo da requisição inválido (JSON).".

5. **Validação e normalização**  
   - Extrair e normalizar campos (trim, onlyDigits quando for CPF/CNS/telefone, toDate para datas).  
   - Validar obrigatórios e formatos; retornar `NextResponse.json({ ok: false, erro: "..." }, { status: 400 })` em caso de erro.

6. **Lógica de negócio**  
   - Usar `getAppPool()` para queries; preferir parâmetros ($1, $2...) para evitar SQL injection.  
   - Se houver serviço em `lib/` (ex.: `getCitizenByCpfOrCns`), importar e usar em vez de duplicar lógica na rota.

7. **Resposta de sucesso**  
   - `return NextResponse.json({ ok: true, ...dados })` (status 200 padrão).  
   - Manter contrato estável (ex.: `{ ok: true, id }` para criação).

8. **Tratamento de erros**  
   - Try/catch em volta da lógica que acessa DB ou serviços.  
   - Em catch: `console.error("[API <recurso>/<acao>]", e);`  
   - Retornar mensagem genérica ao cliente (ex.: "Erro ao processar. Tente novamente.") com status 500.  
   - Se detectar conflito (duplicate key, unique): status 409 e mensagem amigável (ex.: "Cadastro já existe.").

### Saída esperada
- Arquivo `apps/dashboard/src/app/api/<recurso>/<acao>/route.ts` criado ou atualizado.  
- Endpoint acessível em `GET/POST .../api/<recurso>/<acao>`.  
- Comportamento alinhado aos demais endpoints (503 quando config ausente, 400 para validação, 409 para conflito, 500 com log).

### Arquivos tipicamente envolvidos
- `apps/dashboard/src/app/api/**/route.ts`
- `apps/dashboard/src/lib/db.ts`
- `apps/dashboard/src/lib/senha.ts`
- `packages/shared/src/types.ts` (se novos tipos forem necessários)

### Verificações de segurança
- Não expor detalhes internos (stack trace, queries) na resposta JSON.  
- Não construir SQL com concatenação de string; usar sempre parâmetros.  
- Validar e limitar tamanho/caracteres de inputs (ex.: onlyDigits, trim, max length).  
- Manter checagem de `isAppDatabaseConfigured()` (ou equivalente) para evitar 500 quando .env não está configurado.

---

## 2. Criar nova migration SQL

### Nome
**Criar migration SQL (PostgreSQL)**

### Propósito
Adicionar ou alterar schema do banco (tabelas, índices, FKs, colunas) de forma versionada e reproduzível, sem quebrar a ordem de execução nem ambientes já migrados.

### Quando o agente deve usar
- Usuário pede "criar tabela X", "adicionar coluna Y", "migration para Z", "alterar banco".
- Nova funcionalidade exige novas tabelas ou mudança de estrutura.

### Inputs necessários
- Descrição da mudança (nova tabela, novas colunas, FKs, índices).  
- Nomes das tabelas/colunas (preferir snake_case no banco).  
- Se alterar tabela existente: nome da tabela e se a migration é destrutiva (DROP, etc.).

### Processo passo a passo

1. **Numerar a migration**  
   - Listar arquivos em `database/migrations/` (ex.: 001 a 005).  
   - Próximo número: `006`.  
   - Nome do arquivo: `NNN_descricao_curta.sql` (ex.: `006_profissional.sql`).

2. **Escrever o SQL**  
   - Cabeçalho em comentário: programa, número, descrição, comando de execução (psql ou run-migrations.js).  
   - Usar `CREATE TABLE IF NOT EXISTS` para tabelas novas.  
   - Para colunas: tipos compatíveis com o uso no app (UUID, TEXT, DATE, BOOLEAN, INTEGER/SMALLINT).  
   - CHECK e UNIQUE quando fizer sentido (ex.: enums limitados).  
   - FKs: preferir adicionar em migration dedicada (como 003) se referenciar tabelas de domínio (ubs, distrito_sanitario).  
   - Comentários no SQL para colunas não óbvias.

3. **Registrar no script de migrations**  
   - Abrir `database/run-migrations.js`.  
   - No array `migrations`, adicionar o novo arquivo na ordem:  
     `"006_profissional.sql"` (ou o nome escolhido).  
   - Não reordenar nem remover itens existentes.

4. **Documentar**  
   - Se houver dependência (ex.: tabela X deve existir antes), garantir que a migration que cria X esteja antes no array.  
   - Em `database/README.md`, atualizar lista de migrations se houver seção que as enumera.

### Saída esperada
- Novo arquivo `database/migrations/NNN_nome.sql`.  
- Entrada correspondente no array `migrations` de `database/run-migrations.js`.  
- Migrations executáveis na ordem sem erro (incluindo `npm run db:migrate` ou `cd apps/dashboard && node ../../database/run-migrations.js`).

### Arquivos tipicamente envolvidos
- `database/migrations/*.sql`
- `database/run-migrations.js`
- `database/README.md`

### Verificações de segurança
- Não usar `DROP TABLE` ou `ALTER TABLE ... DROP COLUMN` sem que o usuário tenha explicitamente pedido mudança destrutiva.  
- Não alterar ordem das migrations já usadas em outros ambientes.  
- Garantir idempotência quando possível (ex.: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).  
- Testar mentalmente ou em ambiente de dev: rodar a nova migration após as existentes.

---

## 3. Adicionar ou alterar tipos e DTOs no shared

### Nome
**Tipos e DTOs no pacote shared**

### Propósito
Manter contratos de dados (tipos, enums, interfaces) centralizados para dashboard e mobile, garantindo consistência e um único ponto de verdade.

### Quando o agente deve usar
- Novo recurso exige novo tipo, enum ou interface (ex.: Profissional, Unidade).  
- Alteração de contrato de API ou de formulário que afeta ambos os apps.  
- Definição de DTOs para integração (ex.: Base Federal, e-SUS).

### Inputs necessários
- Nome do tipo/enum/interface.  
- Campos e tipos (TypeScript).  
- Se for enum: lista de valores.  
- Se for usado em API: alinhar com JSON (camelCase) e, se necessário, com DB (snake_case documentado ou mapeado no app).

### Processo passo a passo

1. **Abrir `packages/shared/src/types.ts`**  
   - Adicionar tipos próximos aos existentes (enums juntos, interfaces de domínio juntas, DTOs de integração juntos).  
   - Manter estilo do arquivo: comentários JSDoc quando ajudar (ex.: "Sexo (documento de requisitos)").

2. **Convenções de nomenclatura**  
   - Enums/types: PascalCase (ex.: `RiscoGestacional`, `StatusConsulta`).  
   - Valores de enum em minúsculo com hífen quando for caso (ex.: `"habitual" | "alto"`).  
   - Campos em interfaces: camelCase (ex.: `nomeCompleto`, `dataNascimento`).  
   - Para compatibilidade com DB: no app (dashboard) fazer o mapeamento camelCase ↔ snake_case na camada de API ou serviço.

3. **Export**  
   - Verificar se `packages/shared/src/index.ts` exporta `types` (já existe `export * from "./types";`).  
   - Novos tipos em `types.ts` ficam automaticamente disponíveis via `@mae-salvador/shared`.

4. **Constantes**  
   - Se forem listas fixas (ex.: opções de select), considerar `packages/shared/src/constants.ts` e exportar no `index.ts`.

5. **Build**  
   - Após alteração: `npm run build` no pacote shared (ou via workspace).  
   - Dashboard usa `transpilePackages: ["@mae-salvador/shared"]`; mudanças em tipos são refletidas no build do app.

### Saída esperada
- Tipos/interfaces/enums em `packages/shared/src/types.ts` (ou constantes em `constants.ts`).  
- Export via `index.ts`.  
- Uso consistente no dashboard (e mobile, se aplicável) sem duplicar definições.

### Arquivos tipicamente envolvidos
- `packages/shared/src/types.ts`
- `packages/shared/src/constants.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/map-base-federal.ts` (se for mapeamento Base Federal → cadastro)

### Verificações de segurança
- Não quebrar tipos já usados (adicionar campos opcionais em vez de remover obrigatórios, quando possível).  
- Manter compatibilidade com uso em API (camelCase no JSON).  
- Se alterar enums, verificar todos os usos (dashboard e mobile) para valores obsoletos.

---

## 4. Criar nova página ou fluxo no dashboard

### Nome
**Nova página ou fluxo no dashboard (Next.js App Router)**

### Propósito
Adicionar telas ou fluxos no painel (gestor/profissional), respeitando roteamento, layout com sidebar e autenticação.

### Quando o agente deve usar
- Usuário pede "página para X", "tela de listagem de Y", "fluxo de gestante/profissional".
- Nova funcionalidade que exige nova rota no dashboard.

### Inputs necessários
- Caminho da URL desejado (ex.: `/gestante/lista`, `/profissional/novo`).  
- Se a rota é pública ou protegida (ex.: dentro do layout autenticado).  
- Descrição do conteúdo (listagem, formulário, detalhe).

### Processo passo a passo

1. **Definir localização da rota**  
   - Rotas **autenticadas** (com sidebar): em `apps/dashboard/src/app/(dashboard)/<segmentos>/page.tsx`.  
   - Rotas **públicas** (ex.: login, gestante): em `apps/dashboard/src/app/<nome>/page.tsx` (ex.: `login/page.tsx`, `gestante/...`).  
   - Layout do grupo: `(dashboard)/layout.tsx` usa `useAuth()` e redireciona para `/login` se `!user`.

2. **Layout autenticado**  
   - Dentro de `(dashboard)`: o layout já fornece sidebar (`AppSidebar`), header com seletor de nível de acesso e `useAuth()`.  
   - Não duplicar checagem de auth em toda página; confiar no layout.  
   - Para nova página: criar `apps/dashboard/src/app/(dashboard)/<recurso>/page.tsx` (ou subpastas com seu `page.tsx`).

3. **Componentes**  
   - Componentes reutilizáveis em `apps/dashboard/src/components/`.  
   - UI base: Shadcn (Radix), Tailwind; tabelas com TanStack Table quando for listagem.

4. **Chamadas à API**  
   - Usar rotas relativas ao app: `/api/gestante/...`, `/api/cns/buscar`, etc.  
   - Tratar erros (403, 503) e exibir feedback (toast ou mensagem na tela).

5. **Navegação**  
   - Links com `next/link`; botões de ação que redirecionam com `useRouter().push(...)`.

### Saída esperada
- Arquivo(s) `page.tsx` (e opcionalmente `layout.tsx`) no caminho correto.  
- Rota acessível e, se for caso, protegida pelo layout com auth.  
- Estilo e componentes alinhados ao restante do dashboard.

### Arquivos tipicamente envolvidos
- `apps/dashboard/src/app/(dashboard)/**/page.tsx`
- `apps/dashboard/src/app/(dashboard)/layout.tsx`
- `apps/dashboard/src/components/**`
- `apps/dashboard/src/lib/auth-context.tsx`

### Verificações de segurança
- Rotas sensíveis apenas sob `(dashboard)` (ou checagem explícita de auth).  
- Não expor dados sensíveis no HTML; carregar via API quando necessário.  
- Manter sidebar e menu atualizados se a nova página fizer parte do fluxo principal.

---

## 5. Criar ou estender serviço em `lib/`

### Nome
**Serviço ou provider em lib (dashboard)**

### Propósito
Colocar lógica de negócio reutilizável (acesso a dados, integrações, orquestração) em `lib/`, mantendo API routes enxutas e testáveis.

### Quando o agente deve usar
- Nova integração (ex.: outro provider de cidadão).  
- Lógica complexa que não cabe no handler da API.  
- Reutilização da mesma regra em mais de um endpoint.

### Inputs necessários
- Nome do serviço ou provider.  
- Responsabilidade (ex.: "buscar cidadão por CPF", "validar UBS").  
- Dependências (DB, outros serviços, env).

### Processo passo a passo

1. **Escolher entre serviço e provider**  
   - **Provider**: implementa interface existente (ex.: `ICitizenProvider` em `lib/citizen-providers/types.ts`) com método `getCitizenByCpfOrCns(document: string): Promise<CitizenDto | null>`.  
   - **Serviço orquestrador**: chama providers ou DB (ex.: `CitizenLookupService`).  
   - **Serviço utilitário**: funções puras ou que usam apenas `getAppPool()`/env.

2. **Localização**  
   - Novo provider: `apps/dashboard/src/lib/citizen-providers/<nome>-citizen-provider.ts` e export no `index.ts` do mesmo diretório.  
   - Novo serviço: `apps/dashboard/src/lib/<nome>-service.ts` ou `<nome>.ts`.

3. **Implementação**  
   - Usar `getAppPool()` de `@/lib/db` para SQL.  
   - Usar tipos de `@mae-salvador/shared`.  
   - Logging: prefixo entre colchetes (ex.: `console.error("[CitizenLookup]", e)`).  
   - Não fazer side-effect desnecessário; retornar dados ou lançar exceção para o caller tratar.

4. **Injeção / uso**  
   - Não há DI; o orquestrador (ex.: `citizen-lookup-service.ts`) importa os providers e os chama em sequência.  
   - Para adicionar novo provider: registrar no orquestrador (ex.: array de providers ou nova chamada após os existentes).

### Saída esperada
- Arquivo(s) em `apps/dashboard/src/lib/` (e em `citizen-providers/` se for provider).  
- Export e uso nos endpoints ou em outros serviços.  
- Logs e erros consistentes com o resto do projeto.

### Arquivos tipicamente envolvidos
- `apps/dashboard/src/lib/*.ts`
- `apps/dashboard/src/lib/citizen-providers/*.ts`
- `apps/dashboard/src/app/api/**/route.ts`

### Verificações de segurança
- Queries com parâmetros ($1, $2).  
- Não logar dados sensíveis (senha, token).  
- Tratar falhas de rede ou de integração e propagar de forma controlada (ex.: null ou throw).

---

## 6. Adicionar variável de ambiente

### Nome
**Variável de ambiente (.env)**

### Propósito
Documentar e usar novas configurações (URLs, credenciais, feature flags) sem hardcode, mantendo um único ponto de configuração (.env do dashboard).

### Quando o agente deve usar
- Nova integração exige URL ou chave.  
- Novo recurso opcional controlado por flag.  
- Documentação de variáveis já usadas no código.

### Inputs necessários
- Nome da variável (ex.: `NOVA_API_URL`).  
- Descrição e se é obrigatória ou opcional.  
- Onde é lida (ex.: apenas no dashboard, ou no script de migrations).

### Processo passo a passo

1. **Onde definir**  
   - O projeto usa **um** .env em `apps/dashboard/.env`.  
   - O `run-migrations.js` e o Next.js leem desse arquivo (ou raiz como fallback).  
   - Documentar no `.env.example` na **raiz** do repositório (sem valores reais).

2. **Uso no código**  
   - Acessar com `process.env.NOME_DA_VARIAVEL`.  
   - Para checar se está configurado: `Boolean(process.env.NOME_DA_VARIAVEL?.trim())`.  
   - Não commitar `.env`; apenas `.env.example` com chaves vazias ou placeholder.

3. **Documentação**  
   - Em `.env.example`: adicionar linha `NOME_DA_VARIAVEL=` com comentário opcional.  
   - Em `README.md` ou `docs/`: mencionar variáveis novas na seção de configuração, se relevante.

### Saída esperada
- Uso de `process.env.NOME_DA_VARIAVEL` no ponto necessário.  
- Entrada em `.env.example`.  
- Comportamento definido quando a variável está ausente (ex.: retornar 503 ou desabilitar feature).

### Arquivos tipicamente envolvidos
- `apps/dashboard/.env` (local, não versionado)
- `.env.example` (raiz)
- `README.md` ou `docs/`
- Código que lê a variável (API route ou `lib/`)

### Verificações de segurança
- Nunca commitar valores reais (senhas, tokens).  
- Em respostas de API, não retornar o valor da variável; apenas indicar se está configurada (ex.: `cnsConfigurado: true/false`).

---

## 7. Logging e tratamento de erros em API

### Nome
**Padrões de logging e erro em API Routes**

### Propósito
Manter diagnóstico e experiência do usuário consistentes: log estruturado no servidor e mensagens genéricas ou amigáveis no cliente.

### Quando o agente deve usar
- Ao criar ou alterar qualquer handler em `app/api/**/route.ts`.  
- Ao revisar tratamento de exceções em serviços usados pelas APIs.

### Inputs necessários
- Contexto do endpoint (ex.: `gestante/cadastrar`, `cns/buscar`).  
- Tipos de falha esperados (validação, conflito, erro de DB, integração).

### Processo passo a passo

1. **Logging**  
   - Prefixo por contexto: `console.error("[API gestante/cadastrar]", e)`.  
   - Em serviços: `console.error("[CitizenLookup]", e)` ou `console.warn("[e-SUS]", ...)`.  
   - Não logar corpo completo de request com senha ou dados sensíveis.

2. **Respostas de erro**  
   - **400**: validação (body/query inválido); mensagem específica (ex.: "CPF ou CNS obrigatório").  
   - **401**: não autenticado (quando aplicável).  
   - **403**: sem permissão.  
   - **409**: conflito (ex.: duplicate key); mensagem amigável (ex.: "Cadastro já existe. Faça login ou use Esqueceu Senha.").  
   - **500**: erro inesperado; mensagem genérica ("Erro ao processar. Tente novamente."); detalhe só no log.  
   - **503**: serviço indisponível (ex.: DB ou integração não configurada).

3. **Try/catch**  
   - Envolver lógica que acessa DB ou serviços externos.  
   - No catch: log + `NextResponse.json({ ok: false, erro: "..." }, { status: ... })`.  
   - Detectar padrões de erro (ex.: mensagem do pg com "duplicate") para retornar 409.

### Saída esperada
- Handlers com try/catch e status adequados.  
- Logs com prefixo identificável.  
- Cliente não recebe stack trace nem mensagens internas.

### Arquivos tipicamente envolvidos
- `apps/dashboard/src/app/api/**/route.ts`
- `apps/dashboard/src/lib/**/*.ts`

### Verificações de segurança
- Não vazar stack ou queries na resposta.  
- Não logar senhas ou tokens.

---

## Padrões arquiteturais identificados

- **App Router (Next.js)**: rotas em `src/app/`, API em `src/app/api/`, um `route.ts` por segmento.  
- **Camada de serviço**: lógica em `src/lib/`; API handlers finos (validação → chamada a serviço/DB → resposta).  
- **Provider pattern**: `ICitizenProvider` com implementações (e-SUS, SOAP); orquestrador em `citizen-lookup-service.ts`.  
- **Sem repositório genérico**: SQL direto nos handlers ou em funções em `lib/` usando `getAppPool()`.  
- **Shared package**: tipos e constantes compartilhados; camelCase no TS/JSON, snake_case no PostgreSQL.  
- **Migrations versionadas**: SQL numerado; ordem fixa no `run-migrations.js`; um .env em `apps/dashboard/.env`.

---

## Prioridade final para o agente

| # | Skill | Motivo |
|---|--------|--------|
| 1 | Criar novo endpoint de API | Necessidade mais comum; padrão claro e bem estabelecido. |
| 2 | Criar nova migration SQL | Evita quebrar schema e ambientes; ordem e registro são críticos. |
| 3 | Tipos e DTOs no shared | Base para contratos entre front e API; impacto em dois apps. |
| 4 | Nova página ou fluxo no dashboard | Alta frequência; layout e auth já definidos. |
| 5 | Serviço ou provider em lib | Escalabilidade e reuso; alinhado ao provider pattern. |
| 6 | Variável de ambiente | Necessário para novas integrações e deploy. |
| 7 | Logging e tratamento de erros em API | Consistência e segurança em todas as novas rotas. |

Usar estas skills como checklist ao implementar ou revisar funcionalidades no repositório Mãe Salvador.
