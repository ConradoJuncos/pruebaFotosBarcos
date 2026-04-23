import postgres from "postgres";

function buildConnectionStringFromParts() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "postgres";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !user || !password) {
    return null;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

const connectionString = process.env.DATABASE_URL || buildConnectionStringFromParts();

if (!connectionString) {
  throw new Error(
    "Falta configuracion de base de datos. Define DATABASE_URL o DB_HOST, DB_USER y DB_PASSWORD en .env"
  );
}

const sql = postgres(connectionString, {
  ssl: "require"
});

export default sql;

