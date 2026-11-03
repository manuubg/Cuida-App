const { createHash, timingSafeEqual } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase, ServerValue } = require("firebase-admin/database");
const { onRequest } = require("firebase-functions/v2/https");

initializeApp({
  databaseURL: "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app",
});
const TIME_ZONE = "America/Sao_Paulo";
const DEVICE_PATH = "dispositivos";

function sendJson(res, status, value) {
  res.status(status).set("Cache-Control", "no-store").json(value);
}

function normalizedDeviceId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
}

function safeEventId(value) {
  const eventId = String(value || "");
  return /^[a-zA-Z0-9_-]{8,96}$/.test(eventId) ? eventId : null;
}

function timingSafeHashMatches(token, savedHash) {
  if (typeof token !== "string" || typeof savedHash !== "string") return false;
  const received = createHash("sha256").update(token).digest();
  const expected = Buffer.from(savedHash, "hex");
  return expected.length === received.length && timingSafeEqual(received, expected);
}

async function authenticateDevice(req) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{40,128})$/);
  const deviceId = normalizedDeviceId(req.get("x-device-id"));
  if (!match || !deviceId) return null;

  const snapshot = await getDatabase().ref(`${DEVICE_PATH}/${deviceId}`).get();
  const registry = snapshot.val();
  if (!registry || registry.enabled !== true
      || !timingSafeHashMatches(match[1], registry.tokenHash)) return null;

  if (typeof registry.uid !== "string" || typeof registry.elderId !== "string") return null;
  return { deviceId, uid: registry.uid, elderId: registry.elderId };
}

function localDateAndTime(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${fields.year}-${fields.month}-${fields.day}`,
    time: `${fields.hour}:${fields.minute}`,
    hour: Number(fields.hour),
    minute: Number(fields.minute),
  };
}

function makeHistoryEventId(eventId) {
  return `device_${eventId}`;
}

async function getDeviceMedicines(device) {
  const path = `usuarios/${device.uid}/familiares/${device.elderId}/medicamentos`;
  const snapshot = await getDatabase().ref(path).get();
  const medicines = snapshot.val() || {};
  return Object.entries(medicines)
    .filter(([, medicine]) => medicine && medicine.status !== "Tomado"
      && medicine.status !== "Inativo" && medicine.active !== false
      && /^\d{2}:\d{2}$/.test(String(medicine.time || "")))
    .map(([id, medicine]) => ({
      id,
      name: String(medicine.name || "Remedio").slice(0, 39),
      dose: String(medicine.dose || "").slice(0, 23),
      time: medicine.time,
      active: true,
    }));
}

function validateEvent(body, device) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const eventId = safeEventId(body.eventId);
  const deviceId = normalizedDeviceId(body.deviceId);
  const occurredAtEpoch = Number(body.occurredAtEpoch);
  if (!eventId || deviceId !== device.deviceId
      || !Number.isInteger(occurredAtEpoch)
      || occurredAtEpoch < 1700000000
      || occurredAtEpoch > Math.floor(Date.now() / 1000) + 300) return null;

  if (body.type === "sos") {
    return { type: "sos", eventId, occurredAt: new Date(occurredAtEpoch * 1000) };
  }
  if (body.type === "dose_taken" && typeof body.medicineId === "string"
      && /^[a-zA-Z0-9_-]{1,128}$/.test(body.medicineId)) {
    return {
      type: "dose_taken",
      eventId,
      medicineId: body.medicineId,
      occurredAt: new Date(occurredAtEpoch * 1000),
    };
  }
  return null;
}

async function saveDoseEvent(device, event) {
  const base = `usuarios/${device.uid}/familiares/${device.elderId}`;
  const medicineRef = getDatabase().ref(`${base}/medicamentos/${event.medicineId}`);
  const medicineSnapshot = await medicineRef.get();
  const medicine = medicineSnapshot.val();
  if (!medicine || medicine.active === false) return { status: 404, error: "Medicamento nao encontrado/ativo." };

  const local = localDateAndTime(event.occurredAt);
  const [scheduledHour, scheduledMinute] = String(medicine.time || "00:00").split(":").map(Number);
  const difference = local.hour * 60 + local.minute - (scheduledHour * 60 + scheduledMinute);
  const timing = difference < -15 ? "early" : difference > 15 ? "late" : "on_time";
  const historyId = makeHistoryEventId(event.eventId);
  const historyRef = getDatabase().ref(`${base}/historico/${historyId}`);
  const historyEvent = {
    date: local.date,
    timestamp: event.occurredAt.toISOString(),
    title: `${medicine.name || "Remedio"} confirmado pelo dispositivo`,
    subtitle: `${local.time} • ${timing === "on_time" ? "Tomado no horario" : timing === "early" ? "Tomado adiantado" : "Tomado atrasado"}`,
    type: "success",
    timing,
    scheduledTime: medicine.time || "",
    medicineId: event.medicineId,
    medicineName: medicine.name || "Remedio",
    dose: medicine.dose || "",
    quantity: medicine.quantity || "",
    source: "esp32",
    deviceId: device.deviceId,
  };

  await getDatabase().ref().update({
    [`${base}/historico/${historyId}`]: historyEvent,
    [`${base}/medicamentos/${event.medicineId}/status`]: "Tomado",
    [`${base}/medicamentos/${event.medicineId}/lastTakenAt`]: event.occurredAt.toISOString(),
    [`${base}/status/dispositivo`]: {
      online: true,
      lastSeen: ServerValue.TIMESTAMP,
      deviceId: device.deviceId,
      state: "dose_taken",
    },
  });
  return { status: 200, eventId: historyId };
}

async function saveSosEvent(device, event) {
  const base = `usuarios/${device.uid}/familiares/${device.elderId}`;
  const historyId = makeHistoryEventId(event.eventId);
  const local = localDateAndTime(event.occurredAt);
  const historyEvent = {
    date: local.date,
    timestamp: event.occurredAt.toISOString(),
    title: "SOS acionado pelo idoso",
    subtitle: `${local.time} • Alerta enviado pelo dispositivo`,
    type: "warning",
    source: "esp32",
    deviceId: device.deviceId,
  };

  await getDatabase().ref().update({
    [`${base}/historico/${historyId}`]: historyEvent,
    [`${base}/sos/${event.eventId}`]: historyEvent,
    [`${base}/status/dispositivo`]: {
      online: true,
      lastSeen: ServerValue.TIMESTAMP,
      deviceId: device.deviceId,
      state: "sos",
    },
  });
  return { status: 200, eventId: historyId };
}

async function updateHeartbeat(device, req) {
  const body = req.body || {};
  const state = ["idle", "reminder", "lid_open"].includes(body.state) ? body.state : "online";
  await getDatabase().ref(
    `usuarios/${device.uid}/familiares/${device.elderId}/status/dispositivo`,
  ).update({
    online: true,
    lastSeen: ServerValue.TIMESTAMP,
    deviceId: device.deviceId,
    firmwareVersion: String(body.firmwareVersion || "").slice(0, 24),
    wifiRssi: Number.isInteger(body.wifiRssi) ? body.wifiRssi : null,
    state,
  });
}

exports.deviceApi = onRequest({ region: "europe-west1", maxInstances: 5 }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Allow", "GET, POST, OPTIONS").status(204).send("");
    return;
  }

  const routes = {
    "/v1/device/config": "GET",
    "/v1/device/events": "POST",
    "/v1/device/heartbeat": "POST",
  };
  if (routes[req.path] !== req.method) {
    sendJson(res, 404, { error: "Endpoint nao encontrado." });
    return;
  }

  try {
    const device = await authenticateDevice(req);
    if (!device) {
      sendJson(res, 401, { error: "Dispositivo nao autorizado." });
      return;
    }

    if (req.path === "/v1/device/config") {
      sendJson(res, 200, { medicines: await getDeviceMedicines(device) });
      return;
    }

    if (!req.is("application/json")) {
      sendJson(res, 415, { error: "Envie Content-Type application/json." });
      return;
    }

    if (req.path === "/v1/device/heartbeat") {
      await updateHeartbeat(device, req);
      sendJson(res, 200, { ok: true });
      return;
    }

    const event = validateEvent(req.body, device);
    if (!event) {
      sendJson(res, 400, { error: "Evento invalido." });
      return;
    }
    const result = event.type === "sos"
      ? await saveSosEvent(device, event)
      : await saveDoseEvent(device, event);
    sendJson(res, result.status, result);
  } catch (error) {
    console.error("Cuida+ device API error", error);
    sendJson(res, 500, { error: "Erro interno ao processar dispositivo." });
  }
});
