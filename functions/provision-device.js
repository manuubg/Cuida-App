const { createHash, randomBytes } = require("node:crypto");

const [deviceIdInput, uid, elderId] = process.argv.slice(2);
if (!deviceIdInput || !uid || !elderId) {
  console.error("Uso: node provision-device.js <MAC-do-ESP32> <UID-do-cuidador> <ID-do-idoso>");
  process.exit(1);
}

const deviceId = deviceIdInput.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
if (!deviceId || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)
    || !/^[a-zA-Z0-9_-]{1,128}$/.test(elderId)) {
  console.error("MAC, UID ou ID do idoso invalido.");
  process.exit(1);
}

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
console.log(JSON.stringify({
  deviceId,
  token,
  databaseRecord: {
    tokenHash,
    uid,
    elderId,
    enabled: true
  }
}, null, 2));
console.error("Guarde o token em local privado e copie somente databaseRecord para /dispositivos/" + deviceId);
