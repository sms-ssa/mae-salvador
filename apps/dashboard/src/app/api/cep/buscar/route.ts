import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

let _esusPool: Pool | null = null;

function getEsusPool(): Pool | null {
  const url = process.env.ESUS_DATABASE_URL?.trim();
  if (!url || !url.startsWith("postgres")) return null;
  if (!_esusPool) {
    _esusPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return _esusPool;
}

export async function GET(req: NextRequest) {
  const cep = req.nextUrl.searchParams.get("cep")?.replace(/\D/g, "").slice(0, 8) ?? "";

  if (cep.length !== 8) {
    return NextResponse.json({ erro: "CEP inválido." }, { status: 400 });
  }

  const pool = getEsusPool();
  if (!pool) {
    return NextResponse.json({ erro: "Banco e-SUS não configurado." }, { status: 503 });
  }

  try {
    const query = `
      SELECT
        l.nu_cep AS cep,
        tl.no_tipo_logradouro AS tipo_logradouro,
        UPPER(l.no_logradouro) AS logradouro,
        b.no_bairro AS bairro,
        loc.no_localidade AS localidade,
        uf.sg_uf AS uf
      FROM tb_logradouro l
      LEFT JOIN tb_tipo_logradouro tl
        ON l.tp_logradouro::bigint = tl.co_tipo_logradouro
      LEFT JOIN tb_bairro b
        ON l.co_bairro_dne = b.nu_dne
      LEFT JOIN tb_localidade loc
        ON b.co_localidade::bigint = loc.co_localidade
      LEFT JOIN tb_uf uf
        ON loc.co_uf::bigint = uf.co_uf
      WHERE l.nu_cep = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [cep]);
    const row = result.rows?.[0] as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ erro: "CEP não localizado." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      cep: String(row.cep ?? "").trim(),
      tipoLogradouro: String(row.tipo_logradouro ?? "").trim(),
      logradouro: String(row.logradouro ?? "").trim(),
      bairro: String(row.bairro ?? "").trim(),
      localidade: String(row.localidade ?? "").trim(),
      uf: String(row.uf ?? "").trim(),
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao consultar CEP." }, { status: 500 });
  }
}
