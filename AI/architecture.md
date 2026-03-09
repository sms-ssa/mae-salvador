# Análise de Arquitetura — Mãe Salvador (Dashboard Next.js)

Documento de diagnóstico e recomendações do ponto de vista de **Senior Frontend Architect** para monorepos React/Next.js em escala.

---

## 1. Diagnóstico arquitetural

### 1.1 Visão geral

O projeto é um **monorepo npm workspaces** com:

- **apps/dashboard** — Next.js 16 (App Router), painel profissional/gestor, API Routes e persistência PostgreSQL
- **apps/mobile** — Expo (React Native), app da gestante
- **packages/shared** — Tipos TypeScript, constantes, mocks e mapeamentos (Base Federal → cadastro)
- **database** — Migrations SQL numeradas, scripts Node para rodar migrations

O dashboard segue **App Router** com rotas em `src/app/`, API em `src/app/api/`, componentes em `src/components/` e lógica em `src/lib/`. Não há framework backend (Nest/Express); a “API” são handlers Next.js com SQL direto via `pg` e serviços em `lib/`.

**Conclusão:** Arquitetura **pragmática e funcional** para um MVP, com separação clara entre app/mobile/shared e entre UI (components) e lógica (lib). Porém há **falta de separação por domínio/feature**, **componentes muito grandes** e **pouca extração de hooks**, o que tende a dificultar manutenção e escalabilidade.

---

### 1.2 Separação de responsabilidade das pastas

| Área | Situação atual | Avaliação |
|------|----------------|-----------|
| **Rotas (App Router)** | `app/` com grupos `(dashboard)`, `gestante/`, `login/`, `api/` | ✅ Clara; convenção Next.js respeitada |
| **Componentes** | `components/` com `ui/` (Shadcn) + poucos de domínio (`risk-badge`, `app-sidebar`, `transcard-tab`) | ⚠️ Tudo no mesmo nível; sem distinção domain vs layout vs feature |
| **Lógica / serviços** | `lib/` com db, auth, citizen-providers, senha, utils | ✅ Serviços agrupados; ⚠️ sem camada “domain” ou “repositories” |
| **Hooks** | `hooks/` com apenas `use-mobile.ts`; `useAuth` no auth-context | ⚠️ Poucos hooks; lógica de formulário e filtros dentro das páginas |
| **API** | `app/api/<recurso>/<acao>/route.ts` | ✅ Um arquivo por endpoint; padrão consistente |

**Problema principal:** Não há **separação por feature/domínio**. Tudo que é “gestante” está espalhado entre `app/gestante/`, `app/(dashboard)/gestante/`, `app/api/gestante/` e componentes genéricos. Quem mantém o fluxo “gestante” precisa navegar por várias pastas.

---

### 1.3 Arquitetura de componentes

- **UI base:** Shadcn (Radix) em `components/ui/` — button, card, table, dialog, tabs, etc. Bem reutilizáveis.
- **Componentes de domínio:** `RiskBadge`, `AppSidebar`, `TranscardTab` — poucos, alguns grandes (ex.: `TranscardTab` ~400+ linhas).
- **Páginas:** Várias páginas concentram **muita lógica e estado**:
  - **`gestante/cadastrar/page.tsx`** — ~1300+ linhas, dezenas de `useState`, formulário gigante, validações e efeitos inline. **Problema crítico de maintainability.**
  - **`(dashboard)/gestante/[id]/page.tsx`** — centenas de linhas, dados mock filtrados no componente, várias abas com JSX pesado.
  - **`(dashboard)/gestor/page.tsx`** — muitos `useState` para filtros e `useMemo` para dados; poderia usar hooks dedicados.
- **Lógica vs UI:** Regras de negócio (validação CPF/CNS, formato telefone, regras de Transcard) estão **dentro** de componentes ou em helpers locais (ex.: `formatCpfValue` no próprio arquivo de cadastro), não em hooks ou serviços reutilizáveis.

**Conclusão:** Não há atomic design explícito nem separação clara entre “presentation” e “container”. Componentes grandes e mistura de UI + domínio + estado dificultam testes e evolução.

---

### 1.4 Organização por domínio

- **Domínios identificáveis:** gestante (cadastro, login, pesquisa, ficha), profissional/gestor (painel, registrar consulta, indicadores), CNS/integração (busca cidadão), auth.
- **Organização atual:** Por **tipo técnico** (app, components, lib), não por **domínio** ou **feature**. Para implementar uma nova funcionalidade do fluxo “gestante” é necessário tocar em `app/gestante/*`, `app/(dashboard)/gestante/*`, `app/api/gestante/*` e possivelmente `lib/` e `components/`.
- **Shared:** O pacote `@mae-salvador/shared` concentra tipos, constantes e mapeamentos; é o único “domínio compartilhado” bem delimitado.

**Conclusão:** Falta uma camada de **feature/domain** que agrupe UI + API + hooks + tipos por contexto de negócio.

---

### 1.5 Uso do pacote shared

- **Uso:** Tipos (Gestante, Consulta, RiscoGestacional, etc.), constantes (UBS_LIST, DISTRITOS_SANITARIOS), mocks (MOCK_GESTANTES, MOCK_CONSULTAS…) e funções de mapeamento (map-base-federal).
- **Pontos positivos:** Contratos únicos entre dashboard e mobile; evita duplicação de tipos e listas de domínio.
- **Pontos de atenção:** Mocks no shared acoplam front à estrutura de dados “fake”; quando a API real vier, pode ser necessário substituir por client ou camada de dados. Não há hoje `packages/api-client` ou `packages/utils` separados.

**Conclusão:** Uso do shared é adequado para o estágio atual. Para evoluir, faz sentido manter tipos/constantes no shared e considerar um `api-client` ou camada de dados no dashboard que consuma a API e substitua os mocks.

---

### 1.6 Navegação e maintainability

- **Navegação:** Estrutura de pastas é previsível (app, api, components, lib). O que falta é **coesão por feature**: não há um único “módulo gestante” onde estejam formulário, listagem, detalhe, API e hooks.
- **Manutenção:** Alterar o cadastro da gestante exige abrir um arquivo de ~1300 linhas; alterar indicadores do gestor exige um arquivo com muitos estados. Isso aumenta risco de regressão e dificulta code review.
- **Testes:** Não há testes automatizados no repositório; a estrutura atual (páginas enormes, lógica inline) tornaria testes unitários de componente difíceis sem refatoração prévia.

**Conclusão:** Maintainability é **média**: convenções Next.js ajudam, mas componentes e páginas muito grandes e falta de feature modules prejudicam.

---

### 1.7 Escalabilidade para novas funcionalidades

- **Novas rotas/páginas:** Fácil — criar `app/.../page.tsx` e, se necessário, nova pasta em `api/`.
- **Novos fluxos de formulário:** Se seguirem o padrão atual (um componente gigante com dezenas de estados), a base de código continuará pesada e difícil de testar.
- **Novos domínios (ex.: “profissional”, “unidade”):** Não há convenção de onde colocar componentes e hooks específicos; tende a crescer mais em `components/` e `lib/` genéricos, aumentando acoplamento.

**Conclusão:** Escalabilidade é **limitada** pela falta de boundaries por feature e pelo tamanho dos componentes. Novas funcionalidades podem ser adicionadas, mas o custo de manutenção tende a crescer sem refatoração.

---

## 2. Problemas atuais na estrutura de pastas e componentes

1. **Páginas/componentes excessivamente grandes**
   - `gestante/cadastrar/page.tsx` (~1300+ linhas, dezenas de estados).
   - `(dashboard)/gestante/[id]/page.tsx` e `(dashboard)/gestor/page.tsx` com centenas de linhas e muita lógica inline.

2. **Lógica e UI misturadas**
   - Validações, formatação (CPF, CEP, telefone) e regras de negócio dentro do JSX ou no mesmo arquivo da página.
   - Pouca extração para hooks (ex.: `useGestanteCadastro`, `usePainelFiltros`) ou para funções em `lib/`.

3. **Componentes reutilizáveis pouco explorados**
   - Formulários longos poderiam ser quebrados em subcomponentes por seção (Dados Pessoais, Endereço, Gestação, etc.) e/ou usar react-hook-form com subformulários.
   - Padrões repetidos (cards de resumo, tabelas por aba) poderiam virar componentes de domínio reutilizáveis.

4. **Falta de organização por feature/domínio**
   - Tudo em `components/` no mesmo nível; não há `features/gestante/`, `features/gestor/` ou equivalente.
   - Quem trabalha em “cadastro da gestante” não tem um único lugar onde estejam UI, API e regras.

5. **Hooks insuficientes**
   - Apenas `use-mobile` e `useAuth`; não há hooks para formulários complexos, listas filtradas ou dados da gestante, o que mantém a lógica presa nas páginas.

6. **Monorepo com um único pacote shared**
   - Não há `packages/ui`, `packages/hooks`, `packages/api-client` ou `packages/config`. Para o tamanho atual do MVP isso é aceitável, mas à medida que mobile e dashboard divergirem em UI ou em chamadas de API, pode fazer sentido extrair mais pacotes.

---

## 3. Padrão arquitetural recomendado

Recomenda-se um **híbrido** que preserve o App Router e a convenção Next.js e introduza **feature-oriented structure** e **separação clara entre UI e lógica**:

- **Manter:**  
  - `app/` como raiz de rotas (incluindo `(dashboard)`, `gestante/`, `api/`).  
  - `components/ui/` para primitivos Shadcn.  
  - `lib/` para serviços, DB e auth.

- **Introduzir:**  
  - **Features (ou domains)** no dashboard: agrupar por contexto de negócio (gestante, gestor, auth, integração) **sem** quebrar a árvore de rotas do App Router.  
  - **Hooks por feature:** extrair estado e lógica de formulários e listas para hooks (ex.: `useGestanteCadastro`, `usePainelGestantes`).  
  - **Componentes de feature:** componentes específicos de um fluxo (ex.: formulário de cadastro por etapas, cards de resumo da gestante) em pastas associadas à feature, não só em `components/` genérico.  
  - **Separação UI / domínio / infra:**  
  - **UI:** componentes presentacionais (recebem dados e callbacks).  
  - **Domain:** tipos, constantes e regras (já em parte no shared; no app, apenas o que for específico do dashboard).  
  - **Infra:** chamadas API, DB, auth (já em `lib/`).

Não é obrigatório migrar para uma “Domain Architecture” pura (domains/application/infrastructure) em pastas separadas na raiz; o ganho maior vem de **feature modules** e **quebrar componentes grandes** com hooks e subcomponentes.

---

## 4. Estrutura de pastas ideal (proposta)

Estrutura alvo para o **dashboard**, mantendo compatibilidade com o App Router:

```
apps/dashboard/src/
├── app/                          # Mantido: rotas Next.js
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── painel/page.tsx
│   │   ├── gestante/[id]/page.tsx
│   │   ├── gestor/page.tsx
│   │   ├── registrar/page.tsx
│   │   └── cadastrar/page.tsx
│   ├── gestante/
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   ├── cadastrar/page.tsx
│   │   ├── pesquisa-cidadao/page.tsx
│   │   └── esqueceu-senha/page.tsx
│   ├── login/
│   ├── api/
│   └── ...
├── components/
│   ├── ui/                       # Primitivos Shadcn (inalterado)
│   └── layout/                   # Opcional: header, sidebar wrapper
│       └── app-sidebar.tsx
├── features/                     # NOVO: agrupamento por domínio
│   ├── gestante/
│   │   ├── components/           # Componentes específicos do fluxo gestante
│   │   │   ├── cadastro-form/
│   │   │   │   ├── CadastroForm.tsx
│   │   │   │   ├── DadosPessoaisStep.tsx
│   │   │   │   ├── EnderecoStep.tsx
│   │   │   │   └── ...
│   │   │   ├── gestante-resumo-cards.tsx
│   │   │   ├── risk-badge.tsx
│   │   │   └── transcard-tab.tsx
│   │   ├── hooks/
│   │   │   ├── useGestanteCadastro.ts
│   │   │   ├── useGestanteDetail.ts
│   │   │   └── usePesquisaCidadao.ts
│   │   └── utils/                # Validações/formatações específicas
│   │       └── format-cpf-cep.ts
│   ├── gestor/
│   │   ├── components/
│   │   └── hooks/
│   │       └── useIndicadoresFiltros.ts
│   └── auth/
│       └── ...
├── lib/                          # Mantido: serviços, DB, providers
│   ├── db.ts
│   ├── auth-context.tsx
│   ├── senha.ts
│   ├── citizen-lookup-service.ts
│   ├── citizen-providers/
│   └── ...
└── hooks/                        # Hooks globais (use-mobile, etc.)
    └── use-mobile.ts
```

- **app/** continua sendo a única definição de rotas; as páginas podem importar componentes e hooks de `features/*`.
- **features/** agrupa por domínio (gestante, gestor, auth) com subpastas opcionais `components/`, `hooks/`, `utils/` para manter coesão.
- **components/ui/** e **components/layout/** permanecem para peças reutilizáveis em todo o app.
- **lib/** segue como camada de infra e serviços transversais.

Não é obrigatório criar `repositories/` ou `services/` na raiz; os “services” já estão em `lib/`. O que importa é **não concentrar** toda a lógica nas páginas e **extrair para features + hooks**.

---

## 5. Estrutura do monorepo (pacotes)

**Atual:** `apps/dashboard`, `apps/mobile`, `packages/shared`.

**Recomendação para o estágio atual:** Manter esses três. Não é essencial criar de imediato:

- `packages/ui` — Shadcn e tema estão no dashboard; mobile tem outra UI. Só faria sentido se houvesse design system compartilhado (ex.: web + React Native).
- `packages/hooks` — Hooks do dashboard são específicos do fluxo (gestante, auth). Podem viver em `features/`; compartilhamento com mobile é limitado.
- `packages/api-client` — Útil quando a API estiver estável e o dashboard deixar de usar mocks; aí um client tipado (fetch/axios) pode viver em um pacote ou em `lib/api` do dashboard.
- `packages/utils` — Formatação e validação podem ficar em `shared` (já tem tipos e constantes) ou em `features/*/utils` no dashboard.

**Conclusão:** Monorepo atual está adequado. Reavaliar `api-client` e eventualmente `ui` quando houver API real e/ou design system compartilhado.

---

## 6. Estratégia de migração (passo a passo)

Foco em **melhorar maintainability sem reescrever código**: refatorar por partes e estabelecer convenções para código novo.

### Fase 1 — Baixo risco (estrutura e convenções)

1. **Criar a pasta `features/`** em `apps/dashboard/src/` com subpastas `gestante/`, `gestor/`, `auth/` (vazias ou com um README descrevendo o propósito).
2. **Documentar convenção** (no README do dashboard ou em `docs/`): “Novos componentes e hooks de um fluxo devem ser colocados em `features/<domínio>/`”.
3. **Não mover nada ainda**; apenas passar a criar código novo (hooks, subcomponentes) já em `features/`.

### Fase 2 — Extração de hooks e utilitários

4. **Extrair helpers de formatação/validação** usados em `gestante/cadastrar/page.tsx` (ex.: `formatCpfValue`, `formatCepValue`, validações de CPF/CNS/senha) para `features/gestante/utils/` ou `lib/validacoes.ts`. Substituir no cadastro por imports.
5. **Criar hook `useGestanteCadastro`** (ou equivalente) que encapsule o estado do formulário de cadastro e a lógica de submit. Manter a página apenas como composição de componentes e uso do hook. Fazer em etapas: primeiro extrair estado e handlers para o hook; depois, se possível, quebrar o JSX em subcomponentes (DadosPessoais, Endereco, etc.).
6. **Criar hooks para páginas pesadas do gestor** (ex.: `useIndicadoresFiltros`) movendo `useState` e `useMemo` de filtros/dados para o hook. Manter a página só com layout e chamada ao hook.

### Fase 3 — Mover componentes de domínio para features

7. **Mover `risk-badge.tsx`** para `features/gestante/components/risk-badge.tsx` e atualizar imports.
8. **Mover `transcard-tab.tsx`** para `features/gestante/components/transcard-tab.tsx` e atualizar imports.
9. **Quebrar a página de detalhe da gestante** `(dashboard)/gestante/[id]/page.tsx` em componentes menores (ex.: `GestanteHeader`, `GestanteResumoCards`, `GestanteTabs`), colocando-os em `features/gestante/components/` e importando na page. Opcional: hook `useGestanteDetail(id)` que centralize a busca de gestante, consultas, exames, etc. (hoje mock; no futuro API).

### Fase 4 — Formulário de cadastro em partes

10. **Dividir o formulário de cadastro** em componentes por seção (ex.: `DadosPessoaisStep`, `EnderecoStep`, `GestacaoStep`, `SenhaStep`) dentro de `features/gestante/components/cadastro-form/`. Cada um pode usar react-hook-form (ou estado controlado pelo hook `useGestanteCadastro`). A página de cadastro passa a ser um “orquestrador” que renderiza os steps e o botão de envio.
11. **Reduzir o arquivo `gestante/cadastrar/page.tsx`** para algo na ordem de 100–200 linhas, com a maior parte da lógica no hook e nos subcomponentes.

### Fase 5 — Consolidação e testes (futuro)

12. **Introduzir testes** (ex.: Vitest + React Testing Library) primeiro para hooks e utilitários extraídos (formatação, validação, `useGestanteCadastro`). Depois, testes de integração para rotas de API.
13. **Revisar imports** e garantir que não haja dependências circulares entre `features/` e `lib/`. Manter `lib/` como camada “inferior” (sem importar de `features/`).

---

## 7. Resumo executivo

| Aspecto | Situação | Ação recomendada |
|--------|----------|-------------------|
| **Pastas** | Organização por tipo (app, components, lib); sem feature modules | Introduzir `features/<domínio>` e convenção para código novo |
| **Componentes** | Vários muito grandes; UI e lógica misturadas | Extrair hooks, quebrar em subcomponentes por seção/feature |
| **Domínio** | Domínios implícitos (gestante, gestor, auth); espalhados | Agrupar em `features/gestante`, `features/gestor`, `features/auth` |
| **Shared** | Bem usado para tipos, constantes e mocks | Manter; considerar api-client quando API real existir |
| **Monorepo** | apps + packages/shared suficientes para o MVP | Manter; não criar novos pacotes sem necessidade clara |
| **Escalabilidade** | Limitada por páginas e componentes grandes | Migração em fases: hooks → componentes em features → formulários em steps |

Prioridade imediata: **Fase 1 + Fase 2** (estrutura `features/`, extração de hooks e utils e redução do tamanho da página de cadastro) para ganhar maintainability sem reescrever a aplicação.
