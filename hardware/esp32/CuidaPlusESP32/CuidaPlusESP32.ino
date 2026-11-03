#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <stdlib.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <time.h>
#include "secrets.h"

constexpr uint8_t REED_PIN = 4;
constexpr uint8_t IR_PIN = 13;
constexpr uint8_t BUZZER_PIN = 14;
constexpr uint8_t LCD_SDA_PIN = 21;
constexpr uint8_t LCD_SCL_PIN = 22;
constexpr uint8_t SOS_BUTTON_PIN = 27;
constexpr uint8_t PILL_REMOVED_LEVEL = LOW;
constexpr uint8_t LID_OPEN_LEVEL = HIGH;
constexpr uint8_t SOS_PRESSED_LEVEL = LOW;

constexpr unsigned long DEBOUNCE_MS = 60;
constexpr unsigned long CONFIG_REFRESH_MS = 60000;
constexpr unsigned long HEARTBEAT_INTERVAL_MS = 60000;
constexpr unsigned long EVENT_RETRY_MS = 5000;
constexpr unsigned long HTTP_TIMEOUT_MS = 5000;
constexpr uint8_t MAX_MEDICINES = 12;

const char *FIREBASE_DATABASE_HOST =
    "cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app";

// Google Trust Services Root R1 for Firebase Authentication and RTDB HTTPS endpoints.
// Keep certificate validation enabled; do not replace this with setInsecure().
static const char BACKEND_ROOT_CA[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw
CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU
MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw
MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp
Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo
27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w
Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobTSPS5g4M/SCYe7zUjw
TcLCeoiKu7rPWRnWr4+wB7CeMfGCwcDfLqZtbBkOtdh+JhpFAz2weaSUKK0Pfybl
qAj+lug8aJRT7oM6iCsVlgmy4HqMLnXWnOunVmSPlk9orj2XwoSPwLxAwAtcvfaH
szVsrBhQf4TgTM2S0yDpM7xSma8ytSmzJSq0SPly4cpk9+aCEI3oncKKiPo4Zor8
Y/kB+Xj9e1x3+naH+uzfsQ55lVe0vSbv1gHR6xYKu44LtcXFilWr06zqkUspzBmk
MiVOKvFlRNACzqrOSbTqn3yDsEB750Orp2yjj32JgfpMpf/VjsPOS+C12LOORc92
wO1AK/1TD7Cn1TsNsYqiA94xrcx36m97PtbfkSIS5r762DL8EGMUUXLeXdYWk70p
aDPvOmbsB4om3xPXV2V4J95eSRQAogB/mqghtqmxlbCluQ0WEdrHbEg8QOB+DVrN
VjzRlwW5y0vtOUucxD/SVRNuJLDWcfr0wbrM7Rv1/oFB2ACYPTrIrnqYNxgFlQID
AQABo0IwQDAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E
FgQU5K8rJnEaK0gnhS9SZizv8IkTcT4wDQYJKoZIhvcNAQEMBQADggIBAJ+qQibb
C5u+/x6Wki4+omVKapi6Ist9wTrYggoGxval3sBOh2Z5ofmmWJyq+bXmYOfg6LEe
QkEzCzc9zolwFcq1JKjPa7XSQCGYzyI0zzvFIoTgxQ6KfF2I5DUkzps+GlQebtuy
h6f88/qBVRRiClmpIgUxPoLW7ttXNLwzldMXG+gnoot7TiYaelpkttGsN/H9oPM4
7HLwEXWdyzRSjeZ2axfG34arJ45JK3VmgRAhpuo+9K4l/3wV3s6MJT/KYnAK9y8J
ZgfIPxz88NtFMN9iiMG1D53Dn0reWVlHxYciNuaCp+0KueIHoI17eko8cdLiA6Ef
MgfdG+RCzgwARWGAtQsgWSl4vflVy2PFPEz0tv/bal8xa5meLMFrUKTX5hgUvYU/
Z6tGn6D/Qqc6f1zLXbBwHSs09dR2CQzreExZBfMzQsNhFRAbd03OIozUhfJFfbdT
6u9AWpQKXCBfTkBdYiJ23//OYb2MI3jSNwLgjt7RETeJ9r/tSQdirpLsQBqvFAnZ
0E6yove+7u7Y/9waLd64NnHi/Hm3lCXRSHNboTXns5lndcEZOitHTtNCjv0xyBZm
2tIMPNuzjsmhDYAPexZ3FL//2wmUspO8IFgV6dtxQ/PeEMMA3KgqlbbC1j+Qa3bb
bP6MvPJwNQzcmRk13NfIRmPVNnGuV/u3gm3c
-----END CERTIFICATE-----
)PEM";

struct Medicine {
  char id[48];
  char name[40];
  char dose[24];
  char time[6];
  char lastTakenDate[11];
  bool active;
};

struct DebouncedInput {
  uint8_t pin;
  uint8_t stableLevel;
  uint8_t lastReading;
  unsigned long changedAt;
};

LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClientSecure tlsClient;
Medicine medicines[MAX_MEDICINES];
char idToken[2048] = {};
char refreshToken[512] = {};
char deviceUid[40] = {};
uint8_t medicineCount = 0;
uint32_t lastAlarmDate[MAX_MEDICINES] = {};
DebouncedInput lid = {REED_PIN, HIGH, HIGH, 0};
DebouncedInput infrared = {IR_PIN, HIGH, HIGH, 0};
DebouncedInput sosButton = {SOS_BUTTON_PIN, HIGH, HIGH, 0};

int activeMedicine = -1;
bool reminderActive = false;
bool pillRemovedWhileLidOpen = false;
bool doseEventPending = false;
bool sosEventPending = false;
bool networkCallPending = false;
char pendingDoseEventId[96] = {};
char pendingSosEventId[96] = {};
char lcdRow0[17] = {};
char lcdRow1[17] = {};
unsigned long nextConfigAt = 0;
unsigned long nextHeartbeatAt = 0;
unsigned long nextWifiAttemptAt = 0;
unsigned long nextEventRetryAt = 0;
unsigned long nextBuzzerAt = 0;
unsigned long buzzerOffAt = 0;
unsigned long lastSensorLogAt = 0;
unsigned long refreshTokenAt = 0;
uint32_t doseEventEpoch = 0;
uint32_t sosEventEpoch = 0;
bool buzzerIsOn = false;

void printRow(uint8_t row, const char *text) {
  char buffer[17] = {};
  strlcpy(buffer, text, sizeof(buffer));
  lcd.setCursor(0, row);
  lcd.print(buffer);
  for (size_t i = strlen(buffer); i < 16; i++) lcd.print(' ');
}

void showScreen(const char *row0, const char *row1) {
  if (strncmp(lcdRow0, row0, sizeof(lcdRow0)) != 0) {
    strlcpy(lcdRow0, row0, sizeof(lcdRow0));
    printRow(0, lcdRow0);
  }
  if (strncmp(lcdRow1, row1, sizeof(lcdRow1)) != 0) {
    strlcpy(lcdRow1, row1, sizeof(lcdRow1));
    printRow(1, lcdRow1);
  }
}

bool updateInput(DebouncedInput &input) {
  const uint8_t reading = digitalRead(input.pin);
  if (reading != input.lastReading) {
    input.lastReading = reading;
    input.changedAt = millis();
  }
  if (reading != input.stableLevel && millis() - input.changedAt >= DEBOUNCE_MS) {
    input.stableLevel = reading;
    return true;
  }
  return false;
}

bool hasFirebaseSettings() {
  return strcmp(FIREBASE_API_KEY, "API_KEY_DO_FIREBASE") != 0
      && strcmp(FIREBASE_DEVICE_EMAIL, "EMAIL_DA_CONTA_DO_ESP32") != 0
      && strcmp(FIREBASE_DEVICE_PASSWORD, "SENHA_EXCLUSIVA_DO_ESP32") != 0
      && strcmp(FIREBASE_OWNER_UID, "UID_DA_CONTA_DO_CUIDADOR") != 0
      && strcmp(FIREBASE_ELDER_ID, "ID_DO_IDOSO_NO_APP") != 0;
}

String firebaseUrl(const String &path) {
  return String("https://") + FIREBASE_DATABASE_HOST + path + ".json?auth=" + idToken;
}

String familyPath(const char *collection) {
  return String("/usuarios/") + FIREBASE_OWNER_UID + "/familiares/"
      + FIREBASE_ELDER_ID + "/" + collection;
}

String formUrlEncode(const char *value) {
  const char hex[] = "0123456789ABCDEF";
  String encoded;
  while (*value) {
    const uint8_t character = static_cast<uint8_t>(*value++);
    if ((character >= 'a' && character <= 'z')
        || (character >= 'A' && character <= 'Z')
        || (character >= '0' && character <= '9')
        || character == '-' || character == '_' || character == '.' || character == '~') {
      encoded += static_cast<char>(character);
    } else {
      encoded += '%';
      encoded += hex[character >> 4];
      encoded += hex[character & 0x0F];
    }
  }
  return encoded;
}

bool getClock(struct tm &now) {
  return getLocalTime(&now, 25);
}

bool saveAuthTokens(JsonDocument &response, bool refreshing) {
  const char *newIdToken = response["idToken"] | "";
  const char *newRefreshToken = response["refreshToken"] | "";
  if (!newIdToken[0]) newIdToken = response["id_token"] | "";
  if (!newRefreshToken[0]) newRefreshToken = response["refresh_token"] | "";
  if (!newIdToken[0] || !newRefreshToken[0]
      || strlcpy(idToken, newIdToken, sizeof(idToken)) >= sizeof(idToken)
      || strlcpy(refreshToken, newRefreshToken, sizeof(refreshToken)) >= sizeof(refreshToken)) {
    Serial.println("Resposta do Firebase Auth sem tokens validos.");
    idToken[0] = '\0';
    return false;
  }

  if (!refreshing) {
    const char *uid = response["localId"] | "";
    if (!uid[0] || strlcpy(deviceUid, uid, sizeof(deviceUid)) >= sizeof(deviceUid)) {
      Serial.println("Firebase Auth nao retornou o UID do dispositivo.");
      idToken[0] = '\0';
      return false;
    }
    Serial.printf("Firebase Auth conectado. UID do ESP32: %s\n", deviceUid);
  }

  const char *expiresText = response["expiresIn"] | "3600";
  const unsigned long expiresSeconds = strtoul(expiresText, nullptr, 10);
  const unsigned long refreshAfterSeconds = expiresSeconds > 120 ? expiresSeconds - 120 : 60;
  refreshTokenAt = millis() + refreshAfterSeconds * 1000UL;
  return true;
}

bool signInDevice() {
  if (!hasFirebaseSettings() || WiFi.status() != WL_CONNECTED) return false;
  tlsClient.setCACert(BACKEND_ROOT_CA);
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  const String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=")
      + FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) {
    Serial.println("Nao foi possivel abrir HTTPS para Firebase Authentication.");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  DynamicJsonDocument request(512);
  request["email"] = FIREBASE_DEVICE_EMAIL;
  request["password"] = FIREBASE_DEVICE_PASSWORD;
  request["returnSecureToken"] = true;
  String body;
  serializeJson(request, body);
  const int status = http.POST(body);
  DynamicJsonDocument response(4096);
  const String responseBody = http.getString();
  const DeserializationError parseError = deserializeJson(response, responseBody);
  if (status != HTTP_CODE_OK || parseError) {
    Serial.printf("Firebase Auth falhou (HTTP %d): %s\n", status,
                  parseError ? parseError.c_str() : responseBody.c_str());
    http.end();
    return false;
  }
  const bool saved = saveAuthTokens(response, false);
  http.end();
  return saved;
}

bool refreshDeviceToken() {
  if (!refreshToken[0] || WiFi.status() != WL_CONNECTED) return false;
  tlsClient.setCACert(BACKEND_ROOT_CA);
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  const String url = String("https://securetoken.googleapis.com/v1/token?key=") + FIREBASE_API_KEY;
  if (!http.begin(tlsClient, url)) {
    Serial.println("Nao foi possivel abrir HTTPS para renovar token Firebase.");
    return false;
  }
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  const String body = String("grant_type=refresh_token&refresh_token=")
      + formUrlEncode(refreshToken);
  const int status = http.POST(body);
  DynamicJsonDocument response(4096);
  const String responseBody = http.getString();
  const DeserializationError parseError = deserializeJson(response, responseBody);
  if (status != HTTP_CODE_OK || parseError) {
    Serial.printf("Renovacao do token falhou (HTTP %d): %s\n", status,
                  parseError ? parseError.c_str() : responseBody.c_str());
    http.end();
    return false;
  }
  const bool saved = saveAuthTokens(response, true);
  http.end();
  return saved;
}

bool ensureDeviceAuth() {
  if (!idToken[0]) return signInDevice();
  if (static_cast<long>(millis() - refreshTokenAt) < 0) return true;
  if (refreshDeviceToken()) return true;
  idToken[0] = '\0';
  return signInDevice();
}

bool getFirebaseJson(const String &path, JsonDocument &response) {
  if (!ensureDeviceAuth()) return false;
  tlsClient.setCACert(BACKEND_ROOT_CA);
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(tlsClient, firebaseUrl(path))) {
    Serial.println("Nao foi possivel abrir HTTPS para consultar o Realtime Database.");
    return false;
  }
  const int status = http.GET();
  const String responseBody = http.getString();
  const DeserializationError parseError = deserializeJson(response, responseBody);
  if (status != HTTP_CODE_OK || parseError) {
    Serial.printf("Erro ao consultar RTDB (HTTP %d): %s\n", status,
                  parseError ? parseError.c_str() : responseBody.c_str());
    if (status == 401) idToken[0] = '\0';
    http.end();
    return false;
  }
  http.end();
  return true;
}

bool putFirebaseJson(const String &path, JsonDocument &document) {
  if (!ensureDeviceAuth()) return false;
  tlsClient.setCACert(BACKEND_ROOT_CA);
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(tlsClient, firebaseUrl(path))) {
    Serial.println("Nao foi possivel abrir HTTPS para gravar no Realtime Database.");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  String body;
  serializeJson(document, body);
  const int status = http.PUT(body);
  if (status < 200 || status >= 300) {
    Serial.printf("Erro ao gravar RTDB (HTTP %d): %s\n", status, http.getString().c_str());
    if (status == 401) idToken[0] = '\0';
    http.end();
    return false;
  }
  http.end();
  return true;
}

bool fetchMedicines() {
  if (!hasFirebaseSettings() || WiFi.status() != WL_CONNECTED) return false;
  DynamicJsonDocument pairing(128);
  if (!getFirebaseJson(familyPath("perfil/device/uid"), pairing)) return false;
  const char *pairedUid = pairing.as<const char *>();
  if (!pairedUid || strcmp(pairedUid, deviceUid) != 0) {
    Serial.println("Este ESP32 ainda nao esta pareado ao perfil informado.");
    return false;
  }

  DynamicJsonDocument doc(16384);
  if (!getFirebaseJson(familyPath("medicamentos"), doc)) return false;
  JsonObjectConst items = doc.as<JsonObjectConst>();
  medicineCount = 0;
  for (JsonPairConst pair : items) {
    if (medicineCount >= MAX_MEDICINES) break;
    JsonObjectConst item = pair.value().as<JsonObjectConst>();
    Medicine medicine = {};
    strlcpy(medicine.id, pair.key().c_str(), sizeof(medicine.id));
    strlcpy(medicine.name, item["name"] | "Remedio", sizeof(medicine.name));
    strlcpy(medicine.dose, item["dose"] | "", sizeof(medicine.dose));
    strlcpy(medicine.time, item["time"] | "", sizeof(medicine.time));
    medicine.active = item["active"] | true;
    strlcpy(medicine.lastTakenDate, item["lastTakenDate"] | "", sizeof(medicine.lastTakenDate));
    if (medicine.id[0] && medicine.active && strlen(medicine.time) == 5
        && strcmp(item["status"] | "", "Inativo") != 0) {
      medicines[medicineCount++] = medicine;
    }
  }
  Serial.printf("Agenda carregada: %u medicamento(s)\n", medicineCount);
  return true;
}

bool writeDeviceStatus(const char *state) {
  DynamicJsonDocument doc(384);
  doc["online"] = true;
  doc["deviceUid"] = deviceUid;
  doc["firmwareVersion"] = "0.3.0";
  doc["uptimeMs"] = millis();
  doc["wifiRssi"] = WiFi.RSSI();
  doc["state"] = state;
  JsonObject timestamp = doc.createNestedObject("lastSeen");
  timestamp[".sv"] = "timestamp";
  return putFirebaseJson(familyPath("status/dispositivo"), doc);
}

bool sendHeartbeat() {
  const char *state = reminderActive ? "reminder"
      : lid.stableLevel == LID_OPEN_LEVEL ? "lid_open" : "idle";
  return writeDeviceStatus(state);
}

uint32_t makeDateKey(const struct tm &now) {
  return (now.tm_year + 1900) * 10000UL + (now.tm_mon + 1) * 100UL + now.tm_mday;
}

void formatLocalDate(const struct tm &now, char *destination, size_t capacity) {
  snprintf(destination, capacity, "%04d-%02d-%02d", now.tm_year + 1900,
           now.tm_mon + 1, now.tm_mday);
}

bool isScheduledNow(const Medicine &medicine, const struct tm &now) {
  char currentTime[6];
  snprintf(currentTime, sizeof(currentTime), "%02d:%02d", now.tm_hour, now.tm_min);
  return strncmp(currentTime, medicine.time, sizeof(currentTime)) == 0;
}

void beginReminder(uint8_t index, const struct tm &now) {
  activeMedicine = index;
  reminderActive = true;
  pillRemovedWhileLidOpen = false;
  lastAlarmDate[index] = makeDateKey(now);
  char row0[40];
  char row1[40];
  snprintf(row0, sizeof(row0), "Hora %02d:%02d", now.tm_hour, now.tm_min);
  snprintf(row1, sizeof(row1), "Tomar: %.9s", medicines[index].name);
  showScreen(row0, row1);
  Serial.printf("Hora do remedio: %s - %s (%s)\n", row0,
                medicines[index].name, medicines[index].dose);
  nextBuzzerAt = 0;
}

void checkSchedule() {
  if (reminderActive || doseEventPending || medicineCount == 0) return;
  struct tm now;
  if (!getClock(now)) return;
  char today[11];
  formatLocalDate(now, today, sizeof(today));
  for (uint8_t i = 0; i < medicineCount; i++) {
    if (lastAlarmDate[i] != makeDateKey(now)
        && strcmp(medicines[i].lastTakenDate, today) != 0
        && isScheduledNow(medicines[i], now)) {
      beginReminder(i, now);
      return;
    }
  }
}

void serviceBuzzer() {
  const unsigned long now = millis();
  if (buzzerIsOn && now >= buzzerOffAt) {
    noTone(BUZZER_PIN);
    buzzerIsOn = false;
  }
  if (reminderActive && !buzzerIsOn && now >= nextBuzzerAt) {
    tone(BUZZER_PIN, 1800);
    buzzerIsOn = true;
    buzzerOffAt = now + 300;
    nextBuzzerAt = now + 2500;
  }
}

void makeEventId(const char *kind, uint32_t epoch, char *destination, size_t capacity) {
  String id = WiFi.macAddress();
  id.replace(":", "");
  id += "_";
  id += kind;
  id += "_";
  id += String(epoch);
  id += "_";
  id += String(millis());
  strlcpy(destination, id.c_str(), capacity);
}

void confirmDose() {
  if (activeMedicine < 0 || activeMedicine >= medicineCount) return;
  doseEventEpoch = static_cast<uint32_t>(time(nullptr));
  makeEventId("DOSE", doseEventEpoch, pendingDoseEventId, sizeof(pendingDoseEventId));
  doseEventPending = true;
  reminderActive = false;
  pillRemovedWhileLidOpen = false;
  noTone(BUZZER_PIN);
  buzzerIsOn = false;
  tone(BUZZER_PIN, 2100, 180);
  showScreen("Dose verificada", "Sincronizando...");
  Serial.println("Tampa abriu + IR indicou retirada + tampa fechou.");
}

void makeSosRequest() {
  sosEventEpoch = static_cast<uint32_t>(time(nullptr));
  makeEventId("SOS", sosEventEpoch, pendingSosEventId, sizeof(pendingSosEventId));
  sosEventPending = true;
  tone(BUZZER_PIN, 2400, 700);
  showScreen("SOS acionado!", "Chamando ajuda");
  Serial.println("Botao SOS pressionado.");
}

void serviceSensors() {
  updateInput(lid);
  updateInput(infrared);
  const bool sosChanged = updateInput(sosButton);

  if (reminderActive) {
    if (lid.stableLevel == LID_OPEN_LEVEL && infrared.stableLevel == PILL_REMOVED_LEVEL) {
      pillRemovedWhileLidOpen = true;
      showScreen(medicines[activeMedicine].name, "Feche a tampa");
    } else if (lid.stableLevel != LID_OPEN_LEVEL && pillRemovedWhileLidOpen) {
      confirmDose();
    }
  } else if (!doseEventPending && !sosEventPending) {
    showScreen(WiFi.status() == WL_CONNECTED ? "Cuida+ conectado" : "Sem Wi-Fi",
               "Aguardando horario");
  }

  if (sosChanged && sosButton.stableLevel == SOS_PRESSED_LEVEL && !sosEventPending) {
    makeSosRequest();
  }

  if (millis() - lastSensorLogAt >= 1000) {
    lastSensorLogAt = millis();
    Serial.printf("Tampa=%s | IR=%s nivel=%s | SOS=%s\n",
                  lid.stableLevel == LID_OPEN_LEVEL ? "ABERTA" : "FECHADA",
                  infrared.stableLevel == PILL_REMOVED_LEVEL ? "RETIRADA" : "SEM_RETIRADA",
                  infrared.stableLevel == HIGH ? "HIGH" : "LOW",
                  sosButton.stableLevel == SOS_PRESSED_LEVEL ? "PRESSIONADO" : "SOLTO");
  }
}

String formatUtcTimestamp(uint32_t epoch) {
  const time_t eventTime = static_cast<time_t>(epoch);
  struct tm utc;
  if (!gmtime_r(&eventTime, &utc)) return "";
  char timestamp[25] = {};
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return timestamp;
}

bool postPendingEvent() {
  if (!doseEventPending && !sosEventPending) return true;
  const bool sos = sosEventPending;
  const uint32_t eventEpoch = sos ? sosEventEpoch : doseEventEpoch;
  const char *eventId = sos ? pendingSosEventId : pendingDoseEventId;
  const String timestamp = formatUtcTimestamp(eventEpoch);
  if (!timestamp.length()) {
    Serial.println("Relogio invalido; nao foi possivel criar o evento.");
    return false;
  }

  time_t localEpoch = static_cast<time_t>(eventEpoch);
  struct tm local;
  if (!localtime_r(&localEpoch, &local)) return false;
  char localDate[11] = {};
  char localTime[6] = {};
  formatLocalDate(local, localDate, sizeof(localDate));
  snprintf(localTime, sizeof(localTime), "%02d:%02d", local.tm_hour, local.tm_min);

  DynamicJsonDocument event(1024);
  event["eventId"] = eventId;
  event["deviceUid"] = deviceUid;
  event["deviceId"] = WiFi.macAddress();
  event["source"] = "esp32";
  event["date"] = localDate;
  event["timestamp"] = timestamp;

  if (sos) {
    event["title"] = "SOS acionado pelo idoso";
    event["subtitle"] = String(localTime) + " - Alerta enviado pelo dispositivo";
    event["type"] = "warning";
  } else {
    if (activeMedicine < 0 || activeMedicine >= medicineCount) return false;
    const Medicine &medicine = medicines[activeMedicine];
    int difference = local.tm_hour * 60 + local.tm_min
        - (atoi(medicine.time) * 60 + atoi(medicine.time + 3));
    if (difference > 720) difference -= 1440;
    if (difference < -720) difference += 1440;
    const char *timing = difference < -15 ? "early" : difference > 15 ? "late" : "on_time";
    const char *timingLabel = difference < -15 ? "Tomado adiantado"
        : difference > 15 ? "Tomado atrasado" : "Tomado no horario";
    event["title"] = String(medicine.name) + " confirmado pelo dispositivo";
    event["subtitle"] = String(localTime) + " - " + timingLabel;
    event["type"] = "success";
    event["timing"] = timing;
    event["scheduledTime"] = medicine.time;
    event["medicineId"] = medicine.id;
    event["medicineName"] = medicine.name;
    event["dose"] = medicine.dose;
  }

  const String historyPath = familyPath("historico") + "/" + eventId;
  if (!putFirebaseJson(historyPath, event)) return false;

  if (sos) {
    if (!putFirebaseJson(familyPath("sos") + "/" + eventId, event)) return false;
    if (!writeDeviceStatus("sos")) return false;
    sosEventPending = false;
  } else {
    const Medicine &medicine = medicines[activeMedicine];
    DynamicJsonDocument status(64);
    status.set("Tomado");
    if (!putFirebaseJson(familyPath("medicamentos") + "/" + medicine.id + "/status", status)) return false;

    DynamicJsonDocument takenAt(64);
    takenAt.set(timestamp);
    if (!putFirebaseJson(familyPath("medicamentos") + "/" + medicine.id + "/lastTakenAt", takenAt)) return false;

    DynamicJsonDocument takenDate(32);
    takenDate.set(localDate);
    if (!putFirebaseJson(familyPath("medicamentos") + "/" + medicine.id + "/lastTakenDate", takenDate)) return false;

    if (!writeDeviceStatus("dose_taken")) return false;
    strlcpy(medicines[activeMedicine].lastTakenDate, localDate,
            sizeof(medicines[activeMedicine].lastTakenDate));
    doseEventPending = false;
    activeMedicine = -1;
  }
  showScreen("Evento enviado", "Cuida+ atualizado");
  Serial.println("Evento enviado ao Realtime Database.");
  return true;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED || millis() < nextWifiAttemptAt) return;
  nextWifiAttemptAt = millis() + 10000;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Conectando ao Wi-Fi 2.4 GHz: %s\n", WIFI_SSID);
}

void syncFirebase() {
  if (!hasFirebaseSettings() || WiFi.status() != WL_CONNECTED || networkCallPending) return;
  if (reminderActive && !sosEventPending) return;
  if (millis() < nextEventRetryAt && (doseEventPending || sosEventPending)) return;

  networkCallPending = true;
  bool success = true;
  if (doseEventPending || sosEventPending) {
    success = postPendingEvent();
  } else if (millis() >= nextConfigAt) {
    nextConfigAt = millis() + CONFIG_REFRESH_MS;
    success = fetchMedicines();
    if (!success) nextConfigAt = millis() + 15000;
  } else if (millis() >= nextHeartbeatAt) {
    nextHeartbeatAt = millis() + HEARTBEAT_INTERVAL_MS;
    success = sendHeartbeat();
  }
  if (!success) nextEventRetryAt = millis() + EVENT_RETRY_MS;
  else nextEventRetryAt = 0;
  networkCallPending = false;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== Cuida+ ESP32 DevKit V1 ===");

  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(IR_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);

  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  lcd.init();
  lcd.backlight();
  showScreen("Cuida+ iniciando", "ESP32 DevKit V1");

  lid.stableLevel = lid.lastReading = digitalRead(REED_PIN);
  infrared.stableLevel = infrared.lastReading = digitalRead(IR_PIN);
  sosButton.stableLevel = sosButton.lastReading = digitalRead(SOS_BUTTON_PIN);

  configTzTime("BRT3", "pool.ntp.org", "time.google.com");
  connectWifi();
  Serial.printf("MAC Wi-Fi deste ESP32: %s\n", WiFi.macAddress().c_str());
  if (!hasFirebaseSettings()) {
    Serial.println("Configure secrets.h antes de conectar este dispositivo ao Firebase.");
  }
  Serial.println("Pronto. Monitor Serial: 115200 baud.");
}

void loop() {
  connectWifi();
  serviceSensors();
  checkSchedule();
  serviceBuzzer();
  syncFirebase();
  delay(5);
}
