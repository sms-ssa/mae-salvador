-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Tabelas de domínio (formulário)
--  Migration 002: Opções para normalizar campos do cadastro da gestante.
--  Executar após 001_gestante_cadastro.sql.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
--  IDENTIDADE DE GÊNERO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identidade_genero (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  TEXT    UNIQUE NOT NULL,
  label   TEXT    NOT NULL,
  ordem   SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE identidade_genero IS 'Opções de identidade de gênero para o cadastro da gestante.';

INSERT INTO identidade_genero (codigo, label, ordem) VALUES
  ('mulher-cis', 'Mulher cisgênero', 1),
  ('homem-cis', 'Homem cisgênero', 2),
  ('mulher-trans', 'Mulher transgênero', 3),
  ('homem-trans', 'Homem transgênero', 4),
  ('travesti', 'Travesti', 5),
  ('pessoa-nao-binaria', 'Pessoa não-binária', 6),
  ('outro', 'Outro', 7),
  ('prefere-nao-declarar', 'Prefere não declarar', 8)
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  ORIENTAÇÃO SEXUAL
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orientacao_sexual (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  TEXT    UNIQUE NOT NULL,
  label   TEXT    NOT NULL,
  ordem   SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE orientacao_sexual IS 'Opções de orientação sexual para o cadastro da gestante.';

INSERT INTO orientacao_sexual (codigo, label, ordem) VALUES
  ('heterossexual', 'Heterossexual', 1),
  ('lesbica', 'Lésbica', 2),
  ('gay', 'Gay', 3),
  ('bissexual', 'Bissexual', 4),
  ('pansexual', 'Pansexual', 5),
  ('assexual', 'Assexual', 6),
  ('outro', 'Outro', 7),
  ('prefere-nao-declarar', 'Prefere não declarar', 8)
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  DISTRITO SANITÁRIO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distrito_sanitario (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  TEXT    UNIQUE NOT NULL,
  nome    TEXT    NOT NULL,
  numero  SMALLINT NOT NULL
);

COMMENT ON TABLE distrito_sanitario IS '12 Distritos Sanitários de Salvador.';

INSERT INTO distrito_sanitario (codigo, nome, numero) VALUES
  ('ds-01', 'Centro Histórico', 1),
  ('ds-02', 'Itapagipe', 2),
  ('ds-03', 'São Caetano / Valéria', 3),
  ('ds-04', 'Liberdade', 4),
  ('ds-05', 'Brotas', 5),
  ('ds-06', 'Barra / Rio Vermelho', 6),
  ('ds-07', 'Boca do Rio', 7),
  ('ds-08', 'Itapuã', 8),
  ('ds-09', 'Cabula / Beiru', 9),
  ('ds-10', 'Pau da Lima', 10),
  ('ds-11', 'Subúrbio Ferroviário', 11),
  ('ds-12', 'Cajazeiras', 12)
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  UBS (Unidade Básica de Saúde)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ubs (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                TEXT    UNIQUE NOT NULL,
  nome                  TEXT    NOT NULL,
  cnes                  TEXT,
  tipo                  TEXT    NOT NULL DEFAULT 'USF' CHECK (tipo IN ('USF', 'UBS')),
  distrito_sanitario_id UUID    NOT NULL REFERENCES distrito_sanitario(id),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ubs IS 'UBS de vinculação da gestante; referência ao distrito sanitário.';

INSERT INTO ubs (codigo, nome, cnes, tipo, distrito_sanitario_id)
SELECT u.codigo, u.nome, u.cnes, u.tipo, d.id
FROM (VALUES
  ('ubs-001', 'USF Bairro da Paz', '2802171', 'USF', 'ds-08'),
  ('ubs-002', 'USF Cajazeiras X', '2517957', 'USF', 'ds-12'),
  ('ubs-003', 'UBS Ramiro de Azevedo', '2516985', 'UBS', 'ds-01'),
  ('ubs-004', 'USF Pau da Lima', '2509504', 'USF', 'ds-10'),
  ('ubs-005', 'USF Vale do Camurugipe', '2521490', 'USF', 'ds-09'),
  ('ubs-006', 'USF Liberdade', '2530082', 'USF', 'ds-04'),
  ('ubs-007', 'USF São Marcos', '2516942', 'USF', 'ds-03'),
  ('ubs-008', 'UBS Nelson Piauhy Dourado', '2518716', 'UBS', 'ds-06')
) AS u(codigo, nome, cnes, tipo, distrito_codigo)
JOIN distrito_sanitario d ON d.codigo = u.distrito_codigo
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  DESCOBRIMENTO GESTAÇÃO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS descobrimento_gestacao (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  TEXT    UNIQUE NOT NULL,
  label   TEXT    NOT NULL,
  ordem   SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE descobrimento_gestacao IS 'Como a gestante descobriu a gestação.';

INSERT INTO descobrimento_gestacao (codigo, label, ordem) VALUES
  ('teste-rapido', 'Teste rápido', 1),
  ('beta-hcg', 'Beta-HCG (Sangue)', 2),
  ('atraso-menstrual', 'Atraso Menstrual', 3)
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  PROGRAMA SOCIAL
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programa_social (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  TEXT    UNIQUE NOT NULL,
  label   TEXT    NOT NULL,
  ordem   SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE programa_social IS 'Programa social do qual a gestante participa.';

INSERT INTO programa_social (codigo, label, ordem) VALUES
  ('nenhum', 'Nenhum', 1),
  ('bolsa-familia', 'Bolsa Família', 2),
  ('bpc-loas', 'BPC/LOAS', 3),
  ('aluguel-social', 'Aluguel Social', 4),
  ('outros', 'Outros', 5)
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  PLANO DE SAÚDE / PARTICULAR (sim ou não)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plano_saude_opcao (
  id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  TEXT    UNIQUE NOT NULL,
  label   TEXT    NOT NULL
);

COMMENT ON TABLE plano_saude_opcao IS 'Acompanhamento com plano de saúde ou particular (sim/não).';

INSERT INTO plano_saude_opcao (codigo, label) VALUES
  ('sim', 'Sim'),
  ('nao', 'Não')
ON CONFLICT (codigo) DO NOTHING;
