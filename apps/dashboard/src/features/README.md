# Feature modules

Componentes, hooks e utilitários organizados por **domínio de negócio**.

- **gestante** — Cadastro, ficha, risco, Transcard, dados da gestante.
- **gestor** — Indicadores, KPIs, filtros do painel do gestor.
- **auth** — Login, perfil, nível de acesso (quando extraído do layout).

Cada feature pode ter:
- `components/` — Componentes específicos do domínio (não primitivos UI).
- `hooks/` — Estado e lógica reutilizável da feature.
- `utils/` — Formatação, validação e helpers do domínio.

**Convenção:** Novos componentes e hooks de um fluxo devem ser criados na feature correspondente. Primitivos de UI permanecem em `src/components/ui`.
