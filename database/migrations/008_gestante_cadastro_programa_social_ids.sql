-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Cadastro Gestante
--  Migration 008: vínculo N:N de cadastro com programa social por ID.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gestante_cadastro_programa_social (
  gestante_cadastro_id UUID NOT NULL REFERENCES gestante_cadastro(id) ON DELETE CASCADE,
  programa_social_id   UUID NOT NULL REFERENCES programa_social(id),
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (gestante_cadastro_id, programa_social_id)
);

CREATE INDEX IF NOT EXISTS idx_gcps_programa_social_id
  ON gestante_cadastro_programa_social (programa_social_id);

-- Garante opções de domínio (idempotente), caso a base tenha sido criada
-- sem a carga inicial da migration 002.
INSERT INTO programa_social (codigo, label, ordem) VALUES
  ('nenhum', 'Nenhum', 1),
  ('bolsa-familia', 'Bolsa Família', 2),
  ('bpc-loas', 'BPC/LOAS', 3),
  ('aluguel-social', 'Aluguel Social', 4),
  ('outros', 'Outros', 5)
ON CONFLICT (codigo) DO NOTHING;

-- Backfill dos registros antigos usando a coluna textual programa_social.
INSERT INTO gestante_cadastro_programa_social (gestante_cadastro_id, programa_social_id)
SELECT g.id, ps.id
FROM gestante_cadastro g
JOIN LATERAL regexp_split_to_table(COALESCE(g.programa_social, ''), '\s*;\s*') AS p(codigo_raw) ON true
JOIN programa_social ps ON ps.codigo = lower(trim(p.codigo_raw))
ON CONFLICT DO NOTHING;

COMMENT ON TABLE gestante_cadastro_programa_social IS
  'Vínculo entre cadastro de gestante e programas sociais selecionados, usando IDs.';
