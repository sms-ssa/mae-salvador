-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Cadastro Gestante Página 2 (Contatos e Endereço)
--  Migration 004: Novas colunas conforme documentação.
--  Executar após 003_gestante_cadastro_fks.sql.
-- ════════════════════════════════════════════════════════════════

-- Contatos
ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS telefone_alternativo TEXT;
ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS telefone_residencial TEXT;

-- Endereço (campos carregados por CEP / ponto de referência)
ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS tipo_logradouro TEXT;
ALTER TABLE gestante_cadastro ADD COLUMN IF NOT EXISTS ponto_referencia TEXT;

COMMENT ON COLUMN gestante_cadastro.email IS 'E-mail (deve conter @ e ponto).';
COMMENT ON COLUMN gestante_cadastro.telefone_alternativo IS 'Telefone celular alternativo (9 dígitos).';
COMMENT ON COLUMN gestante_cadastro.telefone_residencial IS 'Telefone residencial (8 dígitos, inicia 2 a 5).';
COMMENT ON COLUMN gestante_cadastro.municipio IS 'Município (preenchido pela busca CEP).';
COMMENT ON COLUMN gestante_cadastro.tipo_logradouro IS 'Tipo de logradouro (Rua, Avenida, etc.).';
COMMENT ON COLUMN gestante_cadastro.ponto_referencia IS 'Ponto de referência do endereço.';
