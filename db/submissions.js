import sql from "./sql.js";

export async function ensureSubmissionsTable() {
  await sql`
    create table if not exists submissions (
      id text primary key,
      full_name text not null,
      note text not null,
      image_name text not null,
      image_type text not null,
      image_data text not null,
      client_created_at timestamptz,
      received_at timestamptz not null default now()
    )
  `;
}

export async function insertSubmission(payload) {
  const [row] = await sql`
    insert into submissions (
      id,
      full_name,
      note,
      image_name,
      image_type,
      image_data,
      client_created_at
    )
    values (
      ${payload.id},
      ${payload.fullName},
      ${payload.note},
      ${payload.imageName},
      ${payload.imageType},
      ${payload.imageData},
      ${payload.createdAt ? new Date(payload.createdAt) : null}
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      note = excluded.note,
      image_name = excluded.image_name,
      image_type = excluded.image_type,
      image_data = excluded.image_data,
      client_created_at = excluded.client_created_at
    returning id, received_at
  `;

  return row;
}

export async function listSubmissions(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

  return sql`
    select
      id,
      full_name,
      note,
      image_name,
      image_type,
      image_data,
      client_created_at,
      received_at
    from submissions
    order by received_at desc
    limit ${safeLimit}
  `;
}

