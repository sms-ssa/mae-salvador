-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Dropar todas as tabelas do schema
--  Use para limpar o banco antes de rodar as migrations de novo.
--  ATENÇÃO: apaga todos os dados dessas tabelas.
-- ════════════════════════════════════════════════════════════════
--
--  Execução:
--    psql "%APP_DATABASE_URL%" -f database/drop-tables.sql
--  Ou (Node): node database/run-drop-tables.js
--

-- Ordem: primeiro tabelas que referenciam outras; depois as de domínio
DROP TABLE IF EXISTS gestante_esqueceu_senha_tentativas CASCADE;
DROP TABLE IF EXISTS gestante_cadastro CASCADE;
DROP TABLE IF EXISTS ubs CASCADE;
DROP TABLE IF EXISTS distrito_sanitario CASCADE;
DROP TABLE IF EXISTS identidade_genero CASCADE;
DROP TABLE IF EXISTS orientacao_sexual CASCADE;
DROP TABLE IF EXISTS descobrimento_gestacao CASCADE;
DROP TABLE IF EXISTS programa_social CASCADE;
DROP TABLE IF EXISTS plano_saude_opcao CASCADE;
