-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Recuperação de Senha (doc)
--  Migration 005: Município de nascimento para pergunta de segurança.
--  Executar após 004_cadastro_gestante_contatos_endereco.sql.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS municipio_nascimento TEXT;

COMMENT ON COLUMN gestante_cadastro.municipio_nascimento IS 'Município de nascimento (usado na pergunta de segurança em Esqueceu Senha).';
