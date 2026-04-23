import { saveSubmission, getPendingCount } from "./db.js";
import { syncPendingSubmissions, uploadSubmission } from "./sync.js";
import { isAllowedImageType, normalizeText } from "./validation.js";

const form = document.getElementById("report-form");
const fullNameInput = document.getElementById("fullName");
const noteInput = document.getElementById("note");
const photoInput = document.getElementById("photo");
const pendingBadge = document.getElementById("pendingCount");
const statusBox = document.getElementById("status");
const syncButton = document.getElementById("syncNow");
const loadRecordsButton = document.getElementById("loadRecords");
const recordsSection = document.getElementById("recordsSection");
const recordsList = document.getElementById("recordsList");
const recordsCount = document.getElementById("recordsCount");
const onlineDot = document.getElementById("onlineDot");
const onlineText = document.getElementById("onlineText");

function setStatus(message, tone = "info") {
  const baseClass = "mt-4 rounded-xl border px-3 py-2 text-sm";
  const tones = {
    info: "border-slate-700 bg-slate-800/60 text-slate-200",
    success: "border-emerald-700 bg-emerald-900/30 text-emerald-300",
    warning: "border-amber-700 bg-amber-900/30 text-amber-300",
    error: "border-rose-700 bg-rose-900/30 text-rose-300"
  };

  statusBox.className = `${baseClass} ${tones[tone] || tones.info}`;
  statusBox.textContent = message;
}

function setConnectivityUi() {
  if (navigator.onLine) {
    onlineDot.className = "h-2.5 w-2.5 rounded-full bg-emerald-400";
    onlineText.textContent = "En linea";
  } else {
    onlineDot.className = "h-2.5 w-2.5 rounded-full bg-rose-400";
    onlineText.textContent = "Sin conexion";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function refreshPendingCount() {
  const count = await getPendingCount();
  pendingBadge.textContent = String(count);
}

async function trySyncNow() {
  if (!navigator.onLine) {
    setStatus("Sigues sin conexion. Los registros quedan guardados localmente.", "warning");
    return;
  }

  setStatus("Sincronizando registros pendientes...", "info");

  const result = await syncPendingSubmissions();
  await refreshPendingCount();

  if (result.failed > 0) {
    setStatus(
      `Sincronizacion parcial: ${result.synced} enviados, ${result.failed} pendientes.`,
      "warning"
    );
    return;
  }

  setStatus(`Sincronizacion completa: ${result.synced} enviados.`, "success");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("es-AR");
}

function buildRecordCard(item) {
  const card = document.createElement("article");
  card.className = "overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50";

  const photo = document.createElement("img");
  photo.className = "h-36 w-full object-cover bg-slate-900";
  photo.src = item.image_data;
  photo.alt = item.image_name || "Foto cargada";
  photo.loading = "lazy";

  const body = document.createElement("div");
  body.className = "space-y-1 p-3";

  const title = document.createElement("p");
  title.className = "text-sm font-semibold text-slate-100";
  title.textContent = item.full_name || "Sin nombre";

  const description = document.createElement("p");
  description.className = "text-xs text-slate-300";
  description.textContent = item.note || "Sin descripcion";

  const meta = document.createElement("p");
  meta.className = "text-[11px] text-slate-400";
  meta.textContent = `Subido: ${formatDate(item.received_at)}`;

  body.append(title, description, meta);
  card.append(photo, body);
  return card;
}

function renderRecords(items) {
  recordsSection.classList.remove("hidden");
  recordsList.innerHTML = "";
  recordsCount.textContent = `${items.length}`;

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rounded-lg border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-400";
    empty.textContent = "No hay datos cargados en la base por ahora.";
    recordsList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.append(buildRecordCard(item));
  }
  recordsList.append(fragment);
}

async function loadRecords() {
  setStatus("Cargando datos desde la base...", "info");

  try {
    const response = await fetch("/api/submissions?limit=30");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];
    renderRecords(items);
    setStatus(`Se cargaron ${items.length} registros de la base.`, "success");
  } catch (_error) {
    setStatus("No se pudieron cargar los datos de la base.", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = normalizeText(fullNameInput.value);
  const note = normalizeText(noteInput.value);
  const photo = photoInput.files?.[0];

  if (!fullName || !note || !photo) {
    setStatus("Completa los tres campos antes de guardar.", "warning");
    return;
  }

  if (!isAllowedImageType(photo)) {
    setStatus("La foto debe ser JPG o PNG.", "error");
    return;
  }

  try {
    const imageData = await fileToBase64(photo);
    const payload = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      fullName,
      note,
      imageName: photo.name,
      imageType: photo.type,
      imageData
    };

    if (navigator.onLine) {
      try {
        await uploadSubmission(payload);
        form.reset();
        setStatus("Guardado en la base de datos.", "success");
        await trySyncNow();
        return;
      } catch (_onlineError) {
        // Si falla el envio online, se conserva en IndexedDB para reintento.
      }
    }

    await saveSubmission(payload);
    await refreshPendingCount();

    form.reset();
    setStatus("Guardado en este dispositivo. Se subira cuando haya internet.", "warning");
  } catch (_error) {
    setStatus("No se pudo guardar localmente. Intenta de nuevo.", "error");
  }
});

syncButton.addEventListener("click", async () => {
  await trySyncNow();
});

loadRecordsButton.addEventListener("click", async () => {
  await loadRecords();
});

window.addEventListener("online", async () => {
  setConnectivityUi();
  await trySyncNow();
});

window.addEventListener("offline", () => {
  setConnectivityUi();
  setStatus("Modo offline activo. Puedes seguir guardando datos.", "info");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    setStatus("No se pudo registrar el modo offline avanzado.", "warning");
  });
}

(async function init() {
  setConnectivityUi();
  await refreshPendingCount();
  setStatus("Listo. Puedes capturar informacion aun sin conexion.", "info");

  if (navigator.onLine) {
    await trySyncNow();
    await loadRecords();
  }
})();

