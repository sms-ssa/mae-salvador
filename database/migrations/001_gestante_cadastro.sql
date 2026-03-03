-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Cadastro de Gestante
--  Migration 001: Tabela gestante_cadastro (origem CIP ou manual).
--  Compatível com pesquisa na Base Federal (CNS) e formulário local.
-- ════════════════════════════════════════════════════════════════
--
--  Execução: psql $APP_DATABASE_URL -f database/migrations/001_gestante_cadastro.sql
--  Ou via ferramenta de migrations do projeto.

CREATE TABLE IF NOT EXISTS gestante_cadastro (
  id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação (CPF ou CNS obrigatório; validado na aplicação)
  cpf                         TEXT    NOT NULL,
  cns                         TEXT,
  nome_completo               TEXT    NOT NULL,
  nome_mae                    TEXT,
  nome_pai                    TEXT,
  data_nascimento             DATE,
  telefone                    TEXT    NOT NULL,
  tem_whatsapp                BOOLEAN NOT NULL DEFAULT false,

  -- Identidade (documento de requisitos)
  nome_social                  TEXT,
  nome_social_principal        BOOLEAN NOT NULL DEFAULT false,
  identidade_genero           TEXT,
  orientacao_sexual            TEXT,
  raca_cor                    TEXT    CHECK (raca_cor IS NULL OR raca_cor IN ('BRANCA','PARDA','PRETA','AMARELA','INDIGENA')),
  sexo                        TEXT    CHECK (sexo IS NULL OR sexo IN ('FEMININO','MASCULINO','INDETERMINADO')),
  possui_deficiencia          BOOLEAN NOT NULL DEFAULT false,
  deficiencia                 TEXT,

  -- Endereço
  logradouro                  TEXT    NOT NULL,
  numero                      TEXT    NOT NULL,
  complemento                 TEXT,
  bairro                      TEXT    NOT NULL,
  cep                         TEXT    NOT NULL,
  distrito_sanitario_id       TEXT,

  -- Gestação
  descobrimento_gestacao       TEXT    NOT NULL CHECK (descobrimento_gestacao IN ('teste-rapido','beta-hcg','atraso-menstrual')),
  dum                         DATE,
  programa_social             TEXT    NOT NULL DEFAULT 'nenhum'
    CHECK (programa_social IN ('nenhum','bolsa-familia','bpc-loas','aluguel-social','outros')),
  nis                         TEXT,
  plano_saude                 TEXT    CHECK (plano_saude IN ('sim','nao')),
  manter_acompanhamento_ubs   TEXT    CHECK (manter_acompanhamento_ubs IN ('sim','nao')),

  -- Vínculo
  ubs_id                      TEXT    NOT NULL,
  maternidade_referencia      TEXT,
  cartao_mae_salvador         BOOLEAN NOT NULL DEFAULT false,

  -- Histórico obstétrico (opcional)
  gestacoes_previas           SMALLINT,
  partos_normal               SMALLINT,
  partos_cesareo              SMALLINT,
  abortos                     SMALLINT,

  -- Saúde (opcional)
  alergias                    TEXT,
  doencas_conhecidas          TEXT,
  medicacoes_em_uso           TEXT,

  -- Origem e vínculos externos
  origem_cadastro             TEXT    NOT NULL DEFAULT 'manual'
    CHECK (origem_cadastro IN ('manual','cip')),
  id_cidadao_cip              BIGINT,
  co_cidadao_esus             BIGINT,

  -- Acesso (senha hash para login perfil Gestante)
  senha_hash                  TEXT,

  -- Controle
  status                      TEXT    NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','aprovado','recusado')),
  data_cadastro               DATE    NOT NULL DEFAULT CURRENT_DATE,
  criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Se a tabela já existia (ex.: versão anterior sem status), adiciona a coluna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gestante_cadastro' AND column_name = 'status'
  ) THEN
    ALTER TABLE gestante_cadastro
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status IN ('pendente','aprovado','recusado'));
  END IF;
END $$;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_gestante_cadastro_cpf_unique
  ON gestante_cadastro (REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', ''))
  WHERE co_cidadao_esus IS NULL;

CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_cpf
  ON gestante_cadastro (cpf);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_cns
  ON gestante_cadastro (cns) WHERE cns IS NOT NULL AND cns <> '';
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_esus
  ON gestante_cadastro (co_cidadao_esus) WHERE co_cidadao_esus IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_data
  ON gestante_cadastro (data_cadastro DESC);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_ubs
  ON gestante_cadastro (ubs_id);
CREATE INDEX IF NOT EXISTS idx_gestante_cadastro_status
  ON gestante_cadastro (status);

COMMENT ON TABLE gestante_cadastro IS
  'Cadastro de gestante pelo app: origem manual ou CIP (pesquisa Base Federal). Dados mapeados/normalizados localmente; não persiste resposta bruta da federal.';
