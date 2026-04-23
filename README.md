# Prototipo mobile offline (Node.js + Tailwind)

Prototipo responsive con tema oscuro para capturar:
- 2 campos de texto
- 1 fotografia (`.jpg`, `.jpeg`, `.png`)

Flujo de guardado:
- Con internet: el formulario se envia directo al backend (`/api/upload`) y se guarda en Supabase Postgres.
- Sin internet (o si falla el envio): se guarda en `IndexedDB` (persistente en el dispositivo) y al volver la conexion se sincroniza automaticamente.

## Requisitos

- Node.js 18+
- Credenciales de Supabase (incluyendo password del usuario `postgres`)

## Configurar base de datos (Supabase)

1. Copia `.env.example` a `.env`.
2. Configura `DATABASE_URL` o las variables `DB_*`.
3. Inicia la app; el servidor crea la tabla `submissions` automaticamente si no existe.

Ejemplo de `.env`:

```bash
DATABASE_URL=postgresql://postgres:[TU_PASSWORD]@[TU_HOST]:5432/postgres

# Alternativa por variables separadas
DB_HOST=db.swjmbkvcjushmpeourbb.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[TU_PASSWORD]

PORT=3000
```

Nota: con solo host/puerto/usuario no alcanza; necesitas tambien `DB_PASSWORD`.

## Ejecutar

```bash
npm install
npm run build:css
npm run dev
```

Abrir: `http://localhost:3000`

## Probar flujo offline

1. Abre la pagina una vez con internet (esto cachea la app shell con Service Worker).
2. Corta la conexion o activa modo avion.
3. Completa el formulario y presiona **Guardar**.
4. Verifica el contador de pendientes.
5. Vuelve a tener conexion.
6. La app intenta sincronizar automaticamente (o usa el boton **Sincronizar**).

## Estructura

- `server.js`: servidor Express + endpoint stub para subida
- `db/sql.js`: conexion a Supabase Postgres
- `db/submissions.js`: acceso a tabla `submissions`
- `app/index.html`: UI mobile-first
- `app/styles.css`: Tailwind + estilos de componentes
- `app/main.js`: lógica de formulario y estado de conectividad
- `app/db.js`: persistencia offline con IndexedDB
- `app/sync.js`: cola y reintentos de sincronizacion
- `app/sw.js`: cache para funcionamiento offline basico
- `test/validation.test.js`: prueba automatizada simple

## Nota de backend

`/api/upload` valida el payload y lo guarda en Supabase Postgres.

