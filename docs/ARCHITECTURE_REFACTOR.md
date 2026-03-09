# Refatoração de arquitetura — Dashboard Mãe Salvador

Documento de acompanhamento da aplicação das melhorias definidas em `AI/architecture.md`. Foco em **refatoração incremental e segura**, sem reescrever a aplicação.

---

## 1. Estrutura de pastas após refatoração (proposta)

```
apps/dashboard/src/
├── app/                              # Rotas Next.js (inalterado)
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── painel/page.tsx
│   │   ├── gestante/[id]/page.tsx
│   │   ├── gestor/page.tsx
│   │   ├── registrar/page.tsx
│   │   └── cadastrar/page.tsx
│   ├── gestante/
│   ├── login/
│   └── api/
├── components/
│   ├── ui/                           # Primitivos Shadcn (inalterado)
│   └── layout/
│       └── app-sidebar.tsx
├── features/                         # NOVO — organização por domínio
│   ├── README.md
│   ├── gestante/
│   │   ├── components/
│   │   │   ├── index.ts
│   │   │   ├── risk-badge.tsx        # movido
│   │   │   └── transcard-tab.tsx    # movido
│   │   └── hooks/
│   │       └── useGestanteDetail.ts  # novo
│   ├── gestor/
│   │   └── README.md
│   └── auth/
│       └── README.md
├── lib/
│   ├── db.ts
│   ├── auth-context.tsx
│   ├── senha.ts
│   ├── citizen-lookup-service.ts
│   ├── citizen-providers/
│   ├── repositories/                  # NOVO — camada de acesso a dados
│   │   └── gestante.repository.ts
│   └── ...
└── hooks/
    └── use-mobile.ts
```

**Já implementado (Fase 1):**
- `features/` com gestante, gestor, auth (READMEs).
- `features/gestante/components/`: `risk-badge`, `transcard-tab`, `index.ts`.
- `features/gestante/hooks/useGestanteDetail.ts`.
- `lib/repositories/gestante.repository.ts`.
- API `gestante/cadastrar` passou a usar o repositório.
- Página `(dashboard)/gestante/[id]` passou a usar `useGestanteDetail`.

---

## 2. Lista de arquivos a mover ou refatorar

| Ação | Arquivo | Destino / observação |
|------|---------|----------------------|
| ✅ Feito | `components/risk-badge.tsx` | `features/gestante/components/risk-badge.tsx` |
| ✅ Feito | `components/transcard-tab.tsx` | `features/gestante/components/transcard-tab.tsx` |
| ✅ Feito | Lógica de INSERT em `api/gestante/cadastrar/route.ts` | `lib/repositories/gestante.repository.ts` |
| ✅ Feito | Dados e helpers da página `gestante/[id]` | `features/gestante/hooks/useGestanteDetail.ts` |
| Pendente | `app/gestante/cadastrar/page.tsx` | Extrair `useGestanteCadastro` e quebrar em steps (DadosPessoais, Endereco, Gestacao, Senha) em `features/gestante/` |
| Pendente | `app/(dashboard)/gestor/page.tsx` | Extrair `useGestorIndicadores` ou `useIndicadoresFiltros` em `features/gestor/hooks/` |
| Pendente | `app/(dashboard)/painel/page.tsx` | Extrair `usePainelFiltros` ou `usePainelGestantes` em `features/gestante/hooks/` (ou manter em página se ficar &lt; 400 linhas) |
| Pendente | Helpers de formatação/validação em `gestante/cadastrar/page.tsx` | `features/gestante/utils/format-cpf-cep.ts` ou `lib/validacoes.ts` |
| Futuro | Outros endpoints que fazem SQL direto | Criar `consulta.repository.ts`, etc., conforme necessidade |

---

## 3. Exemplo de refatoração: página de detalhe da gestante

**Antes:** A página `(dashboard)/gestante/[id]/page.tsx` tinha ~420 linhas, com:
- Import de vários mocks e constantes.
- Cálculo de `consultas`, `exames`, `vacinas`, etc., e de `consultasRealizadas`, `testesRapidosFeitos`, `vacinasAtualizadas`.
- Helpers `fmt`, `getProfNome`, `getUbsNome` definidos no arquivo.
- Componente auxiliar `Row` no final do arquivo.

**Depois:**
- **Hook `useGestanteDetail(id)`** em `features/gestante/hooks/useGestanteDetail.ts`:
  - Recebe `gestanteId` e retorna `gestante`, listas (consultas, exames, vacinas, medicacoes, atividades, visitas), `transcard`, indicadores (consultasRealizadas, testesRapidosFeitos, vacinasAtualizadas) e helpers `getUbsNome`, `getProfNome`, `fmt`.
  - Toda a lógica de filtro e derivação fica no hook; a página não importa mocks diretamente.
- **Página** apenas:
  - Usa `use(params)` para obter `id`.
  - Chama `useGestanteDetail(id)` e desestrutura o retorno.
  - Se `!g`, exibe “Gestante não encontrada”.
  - Renderiza o layout e as abas usando os dados e helpers do hook.
  - Mantém o componente `Row` local (pode ser extraído para `features/gestante/components/` depois).

**Benefícios:** Página mais curta e legível; lógica de dados e domínio testável no hook; padrão reutilizável para outras páginas pesadas (painel, gestor, cadastro).

---

## 4. Benefícios arquiteturais

| Melhoria | Benefício |
|----------|-----------|
| **Feature modules** | Navegação por domínio (gestante, gestor, auth); menos arquivos “soltos” em `components/`. |
| **Hooks por feature** | Estado e lógica concentrados; páginas viram composição + layout; hooks testáveis de forma isolada. |
| **Camada de repositório** | API Routes ficam mais finas (validação + chamada ao repositório); SQL e mapeamento centralizados; facilita troca de fonte de dados e testes. |
| **Componentes &lt; 400 linhas** | Convenção de tamanho reduz componentes gigantes; incentiva extração de subcomponentes e hooks. |
| **Separação UI / lógica** | Componentes de apresentação recebem props; hooks e repositórios tratam de estado e dados; menos mistura em um único arquivo. |
| **Preparação para Server Components** | Dados que puderem ser buscados no servidor podem ser movidos para Server Components depois; hooks e repositórios já separam “o quê” de “onde renderiza”. |

---

## 5. Plano de migração em fases

### Fase 1 — Estrutura e movimentações (concluída)
- [x] Criar `features/` com gestante, gestor, auth.
- [x] Mover `risk-badge` e `transcard-tab` para `features/gestante/components/`.
- [x] Atualizar imports nas páginas que usam esses componentes.
- [x] Criar `lib/repositories/gestante.repository.ts` e refatorar `api/gestante/cadastrar` para usá-lo.
- [x] Criar `useGestanteDetail` e refatorar a página `gestante/[id]`.

### Fase 2 — Hooks e utilitários
- [ ] Extrair helpers de formatação/validação do cadastro para `features/gestante/utils/` ou `lib/`.
- [ ] Criar `useGestanteCadastro` (estado e submit do formulário de cadastro).
- [ ] Criar `useIndicadoresFiltros` ou equivalente para a página do gestor.

### Fase 3 — Quebra do formulário de cadastro
- [ ] Dividir o formulário em steps (ex.: DadosPessoaisStep, EnderecoStep, GestacaoStep, SenhaStep) em `features/gestante/components/cadastro-form/`.
- [ ] Reduzir `gestante/cadastrar/page.tsx` para &lt; 400 linhas (orquestração + uso do hook e dos steps).

### Fase 4 — Convenção e Server Components
- [ ] Documentar convenção “máximo 400 linhas por componente/página” (ex.: em `docs/` ou `.cursor/rules`).
- [ ] Identificar páginas que podem passar a buscar dados no servidor e, onde fizer sentido, converter para Server Components.

### Fase 5 — Testes e limpeza
- [ ] Introduzir testes (ex.: Vitest + React Testing Library) para hooks e repositórios.
- [ ] Revisar imports para evitar dependências circulares (ex.: `lib/` não importar de `features/`).

---

## Convenção: tamanho de componente

**Regra:** Nenhum componente ou página deve ultrapassar **400 linhas de código**.

Se ultrapassar:
- Extrair subcomponentes.
- Extrair hooks para estado e lógica.
- Extrair utilitários para formatação/validação.

Ref.: `AI/architecture.md` e plano de migração acima.
