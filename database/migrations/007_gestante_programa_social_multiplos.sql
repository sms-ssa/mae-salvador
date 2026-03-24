-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Cadastro Gestante
--  Migration 007: Permitir múltiplos programas sociais.
-- ════════════════════════════════════════════════════════════════

-- Remove o CHECK legado (aceitava apenas valor único).
ALTER TABLE gestante_cadastro
  DROP CONSTRAINT IF EXISTS gestante_cadastro_programa_social_check;

-- Novo CHECK:
-- - aceita "nenhum" sozinho, OU
-- - lista separada por ';' com valores válidos (sem "nenhum" misturado).
ALTER TABLE gestante_cadastro
  ADD CONSTRAINT gestante_cadastro_programa_social_check
  CHECK (
    programa_social ~ '^(nenhum|((bolsa-familia|bpc-loas|aluguel-social|outros)(;\\s*(bolsa-familia|bpc-loas|aluguel-social|outros))*))$'
  );

COMMENT ON COLUMN gestante_cadastro.programa_social IS
  'Programa(s) social(is). Aceita "nenhum" ou múltiplos valores válidos separados por ponto e vírgula.';
