-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Normalização dos campos do formulário
--  Migration 003: Adiciona FKs para tabelas de domínio em gestante_cadastro.
--  Executar após 002_tabelas_dominio.sql.
--  Formulário passa a enviar IDs; aplicação grava nas colunas *_id (UUID).
--  Idempotente: safe re-run (só renomeia se coluna *_codigo ainda não existir).
-- ════════════════════════════════════════════════════════════════

-- Renomear colunas TEXT que viram FK para *_codigo (só se ainda não foram renomeadas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gestante_cadastro' AND column_name = 'distrito_sanitario_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gestante_cadastro' AND column_name = 'distrito_sanitario_codigo') THEN
    ALTER TABLE gestante_cadastro RENAME COLUMN distrito_sanitario_id TO distrito_sanitario_codigo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gestante_cadastro' AND column_name = 'ubs_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gestante_cadastro' AND column_name = 'ubs_codigo') THEN
    ALTER TABLE gestante_cadastro RENAME COLUMN ubs_id TO ubs_codigo;
  END IF;
END $$;

-- Permitir que novos cadastros usem só ubs_id (UUID); ubs_codigo fica para legado (só altera se coluna existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gestante_cadastro' AND column_name = 'ubs_codigo') THEN
    ALTER TABLE gestante_cadastro ALTER COLUMN ubs_codigo DROP NOT NULL;
  END IF;
END $$;

-- Adicionar colunas FK (normalizadas)
ALTER TABLE gestante_cadastro
  ADD COLUMN IF NOT EXISTS identidade_genero_id    UUID REFERENCES identidade_genero(id),
  ADD COLUMN IF NOT EXISTS orientacao_sexual_id    UUID REFERENCES orientacao_sexual(id),
  ADD COLUMN IF NOT EXISTS distrito_sanitario_id   UUID REFERENCES distrito_sanitario(id),
  ADD COLUMN IF NOT EXISTS descobrimento_gestacao_id UUID REFERENCES descobrimento_gestacao(id),
  ADD COLUMN IF NOT EXISTS programa_social_id     UUID REFERENCES programa_social(id),
  ADD COLUMN IF NOT EXISTS plano_saude_id         UUID REFERENCES plano_saude_opcao(id),
  ADD COLUMN IF NOT EXISTS ubs_id                 UUID REFERENCES ubs(id);

-- Preencher FKs a partir dos códigos/texto existentes (quando existir correspondência)
-- Usar comparação explícita TEXT = TEXT para evitar erro "operador não existe: text = uuid"
UPDATE gestante_cadastro g
SET identidade_genero_id = ig.id
FROM identidade_genero ig
WHERE g.identidade_genero IS NOT NULL AND ig.codigo::text = g.identidade_genero::text;

UPDATE gestante_cadastro g
SET orientacao_sexual_id = os.id
FROM orientacao_sexual os
WHERE g.orientacao_sexual IS NOT NULL AND os.codigo::text = g.orientacao_sexual::text;

UPDATE gestante_cadastro g
SET distrito_sanitario_id = d.id
FROM distrito_sanitario d
WHERE g.distrito_sanitario_codigo IS NOT NULL AND d.codigo::text = g.distrito_sanitario_codigo::text;

UPDATE gestante_cadastro g
SET descobrimento_gestacao_id = dg.id
FROM descobrimento_gestacao dg
WHERE g.descobrimento_gestacao IS NOT NULL AND dg.codigo::text = g.descobrimento_gestacao::text;

UPDATE gestante_cadastro g
SET programa_social_id = ps.id
FROM programa_social ps
WHERE g.programa_social IS NOT NULL AND ps.codigo::text = g.programa_social::text;

UPDATE gestante_cadastro g
SET plano_saude_id = pso.id
FROM plano_saude_opcao pso
WHERE g.plano_saude IS NOT NULL AND pso.codigo::text = g.plano_saude::text;

UPDATE gestante_cadastro g
SET ubs_id = u.id
FROM ubs u
WHERE g.ubs_codigo IS NOT NULL AND u.codigo::text = g.ubs_codigo::text;

-- Índices para buscas por FK
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_identidade_genero
  ON gestante_cadastro(identidade_genero_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_orientacao_sexual
  ON gestante_cadastro(orientacao_sexual_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_distrito
  ON gestante_cadastro(distrito_sanitario_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_descobrimento
  ON gestante_cadastro(descobrimento_gestacao_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_programa_social
  ON gestante_cadastro(programa_social_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_plano_saude
  ON gestante_cadastro(plano_saude_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_ubs_id
  ON gestante_cadastro(ubs_id);

COMMENT ON COLUMN gestante_cadastro.identidade_genero_id IS 'FK identidade_genero (formulário normalizado).';
COMMENT ON COLUMN gestante_cadastro.orientacao_sexual_id IS 'FK orientacao_sexual (formulário normalizado).';
COMMENT ON COLUMN gestante_cadastro.distrito_sanitario_id IS 'FK distrito_sanitario (formulário normalizado).';
COMMENT ON COLUMN gestante_cadastro.descobrimento_gestacao_id IS 'FK descobrimento_gestacao (formulário normalizado).';
COMMENT ON COLUMN gestante_cadastro.programa_social_id IS 'FK programa_social (formulário normalizado).';
COMMENT ON COLUMN gestante_cadastro.plano_saude_id IS 'FK plano_saude_opcao (formulário normalizado).';
COMMENT ON COLUMN gestante_cadastro.ubs_id IS 'FK ubs (formulário normalizado).';
