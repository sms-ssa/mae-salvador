-- ════════════════════════════════════════════════════════════════
--  Programa Mãe Salvador — Recuperação de Senha
--  Migration 006: Controle persistente de tentativas incorretas.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gestante_esqueceu_senha_tentativas (
  cpf_cns         TEXT PRIMARY KEY,
  tentativas      SMALLINT NOT NULL DEFAULT 0,
  bloqueado_ate   TIMESTAMPTZ,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gestante_esqueceu_senha_bloqueado_ate
  ON gestante_esqueceu_senha_tentativas (bloqueado_ate);

COMMENT ON TABLE gestante_esqueceu_senha_tentativas IS
  'Controle de tentativas incorretas no fluxo Esqueceu Senha por CPF/CNS.';
