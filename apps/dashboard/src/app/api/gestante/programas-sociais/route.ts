import { NextResponse } from "next/server";
import { getAppPool, isAppDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, erro: "Serviço indisponível." },
      { status: 503 },
    );
  }

  try {
    const pool = getAppPool();
    const res = await pool.query<{
      id: string;
      codigo: string;
      label: string;
      ordem: number;
    }>(
      `SELECT id, codigo, label, ordem
         FROM programa_social
        ORDER BY ordem ASC, label ASC`,
    );
    return NextResponse.json({ ok: true, itens: res.rows });
  } catch {
    return NextResponse.json(
      { ok: false, erro: "Erro ao carregar programas sociais." },
      { status: 500 },
    );
  }
}
