import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sql from "./db/sql.js";
import { ensureSubmissionsTable, insertSubmission, listSubmissions } from "./db/submissions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

app.use(express.json({ limit: "15mb" }));
app.use(
  express.static(path.join(__dirname, "app"), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath);

      if (fileName === "index.html" || fileName === "sw.js" || fileName === "main.js") {
        res.setHeader("Cache-Control", "no-store, max-age=0");
        return;
      }

      if (fileName.endsWith(".css")) {
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      }
    }
  })
);

app.post("/api/upload", async (req, res) => {
  const { id, fullName, note, imageName, imageType, imageData, createdAt } = req.body ?? {};

  if (!id || !fullName || !note || !imageName || !imageType || !imageData) {
    return res.status(400).json({ ok: false, message: "Datos incompletos" });
  }

  try {
    const saved = await insertSubmission({
      id,
      fullName,
      note,
      imageName,
      imageType,
      imageData,
      createdAt
    });

    return res.json({
      ok: true,
      receivedAt: saved.received_at,
      data: { id, fullName, note, imageName, imageType }
    });
  } catch (error) {
    console.error("Error guardando en base de datos", error);
    return res.status(500).json({ ok: false, message: "No se pudo guardar en la base de datos" });
  }
});

app.get("/api/submissions", async (req, res) => {
  try {
    const rows = await listSubmissions(req.query.limit);
    return res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("Error leyendo registros", error);
    return res.status(500).json({ ok: false, message: "No se pudieron leer los registros" });
  }
});

app.get("/submissions", async (_req, res) => {
  try {
    const rows = await listSubmissions(100);
    const itemsHtml = rows
      .map((row) => {
        const name = escapeHtml(row.full_name);
        const note = escapeHtml(row.note);
        const imageName = escapeHtml(row.image_name);
        const created = row.received_at ? new Date(row.received_at).toLocaleString("es-AR") : "-";

        return `
          <article class="item">
            <img src="${row.image_data}" alt="${imageName}" loading="lazy" />
            <div class="meta">
              <h3>${name}</h3>
              <p>${note}</p>
              <small>${created}</small>
            </div>
          </article>
        `;
      })
      .join("\n");

    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Submissions</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; background: #020617; color: #e2e8f0; }
      main { max-width: 920px; margin: 0 auto; padding: 20px; }
      h1 { margin: 0 0 12px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
      .item { border: 1px solid #334155; border-radius: 12px; background: #0f172a; overflow: hidden; }
      .item img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; background: #1e293b; }
      .meta { padding: 10px; }
      .meta h3 { margin: 0 0 6px; font-size: 15px; }
      .meta p { margin: 0 0 8px; color: #cbd5e1; font-size: 13px; }
      .meta small { color: #94a3b8; }
      .empty { border: 1px dashed #475569; border-radius: 12px; padding: 16px; text-align: center; }
    </style>
  </head>
  <body>
    <main>
      <h1>Registros subidos</h1>
      ${rows.length === 0 ? '<div class="empty">No hay registros todavia.</div>' : `<section class="grid">${itemsHtml}</section>`}
    </main>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (error) {
    console.error("Error renderizando galeria", error);
    return res.status(500).send("No se pudo cargar la galeria");
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "offline-form-prototype" });
});

ensureSubmissionsTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor listo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo inicializar la base de datos", error);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  await sql.end({ timeout: 5 });
  process.exit(0);
});

