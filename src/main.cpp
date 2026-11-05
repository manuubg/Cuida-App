#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include "secrets.h"
#include <time.h>
#include <string.h>

#ifndef WIFI_SSID
#define WIFI_SSID ""
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif
#ifndef FIREBASE_API_KEY
#define FIREBASE_API_KEY ""
#endif
#ifndef FIREBASE_DEVICE_EMAIL
#define FIREBASE_DEVICE_EMAIL ""
#endif
#ifndef FIREBASE_DEVICE_PASSWORD
#define FIREBASE_DEVICE_PASSWORD ""
#endif
#ifndef CAREGIVER_UID
#define CAREGIVER_UID ""
#endif
#ifndef ELDER_ID
#define ELDER_ID ""
#endif

#define DATABASE_URL "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app"

constexpr int PIN_IR = 5;
constexpr int PIN_SOS = 27;
constexpr int PIN_BUZZER = 18;
constexpr int PIN_REED = 4;
constexpr int PIN_SDA = 21;
constexpr int PIN_SCL = 22;

constexpr int IR_DETECTED_LEVEL = HIGH;
constexpr int SOS_ACTIVE_LEVEL = LOW;

constexpr unsigned long ROUTINE_CHECK_MS = 15000;
constexpr unsigned long HEARTBEAT_INTERVAL_MS = 60000;
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
constexpr unsigned long EVENT_RETRY_INTERVAL_MS = 5000;
constexpr unsigned long BUZZER_STEP_MS = 250;
constexpr unsigned long DEBOUNCE_MS = 50;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
LiquidCrystal_I2C lcd(0x27, 16, 2);

String familyPath;
String medicinesPath;
String historyPath;
String sosPath;
String deviceStatusPath;
String medicineId;
String medicineName;
String scheduledTime;
String scheduledDate;
String lastCheckedMinute;
String deviceUid;
String pendingSosEventId;
String pendingSosTimestamp;
String doseEventId;

bool alarmActive = false;
bool lidWasOpened = false;
bool handDetectedAfterOpening = false;
bool lidIsClosed = true;
bool lastButtonReading = false;
bool stableButtonState = false;
bool handStateInitialized = false;
bool lastHandSent = false;
bool firebaseReadyAnnounced = false;
bool sosPending = false;
bool firebaseConfigValid = false;

unsigned long lastRoutineCheck = 0;
unsigned long lastHeartbeat = 0;
unsigned long nextWifiRetry = 0;
unsigned long nextEventRetry = 0;
unsigned long lastBuzzerStep = 0;
unsigned long lastDoseRetry = 0;
unsigned long lastButtonChange = 0;
uint8_t buzzerStep = 0;

const bool ACTIVE_BUZZER_PATTERN[] = {true, false, true, false, true, false, false, false};

String twoDigits(int value) {
  return value < 10 ? "0" + String(value) : String(value);
}

bool getDateTime(String &date, String &timeText) {
  struct tm info;

  if (!getLocalTime(&info, 100)) {
    return false;
  }

  date = String(info.tm_year + 1900) + "-" +
         twoDigits(info.tm_mon + 1) + "-" +
         twoDigits(info.tm_mday);

  timeText = twoDigits(info.tm_hour) + ":" + twoDigits(info.tm_min);
  return true;
}

String timestampNow() {
  struct tm info;

  if (!getLocalTime(&info, 100)) {
    return "";
  }

  char timestamp[80];
  snprintf(timestamp, sizeof(timestamp), "%04d-%02d-%02dT%02d:%02d:%02d-03:00",
           info.tm_year + 1900, info.tm_mon + 1, info.tm_mday,
           info.tm_hour, info.tm_min, info.tm_sec);
  return String(timestamp);
}

String newEventId() {
  return String(static_cast<uint32_t>(ESP.getEfuseMac() >> 32), HEX) +
         "_" + String(millis(), HEX);
}

bool writeDeviceStatus(const String &state) {
  if (!Firebase.ready()) {
    Serial.println("Status do dispositivo aguardando reconexao do Firebase.");
    return false;
  }

  const time_t now = time(nullptr);
  if (now < 1000000000) {
    Serial.println("Status aguardando sincronizacao do horario NTP.");
    return false;
  }

  FirebaseJson status;
  status.set("online", true);
  status.set("lastSeen", static_cast<double>(now) * 1000.0);
  status.set("deviceUid", deviceUid);
  status.set("state", state);
  status.set("wifiRssi", WiFi.RSSI());
  if (medicineId.length()) status.set("medicineId", medicineId);
  if (medicineName.length()) status.set("medicineName", medicineName);

  if (!Firebase.RTDB.setJSON(&fbdo, deviceStatusPath, &status)) {
    Serial.printf("Erro ao atualizar status do ESP32: %s\n",
                  fbdo.errorReason().c_str());
    return false;
  }

  return true;
}

bool writeEvent(const String &collection, const String &eventId,
                const String &title, const String &type,
                const String &eventTimestamp, const String &subtitle = "") {
  if (!Firebase.ready() || eventTimestamp.isEmpty()) return false;

  FirebaseJson event;
  event.set("timestamp", eventTimestamp);
  event.set("date", eventTimestamp.substring(0, 10));
  event.set("title", title);
  event.set("type", type);
  event.set("source", "esp32");
  event.set("deviceUid", deviceUid);
  event.set("eventId", eventId);
  if (subtitle.length()) event.set("subtitle", subtitle);

  String path = collection == "sos" ? sosPath : historyPath;
  if (!Firebase.RTDB.setJSON(&fbdo, path + "/" + eventId, &event)) {
    Serial.printf("Erro ao gravar evento em %s: %s\n",
                  collection.c_str(), fbdo.errorReason().c_str());
    return false;
  }
  return true;
}

bool writeSosEvent(const String &eventId, const String &eventTimestamp) {
  const String title = "SOS do dispositivo";
  const bool sosSaved = writeEvent("sos", eventId, title, "warning", eventTimestamp);
  const bool historySaved = writeEvent(
      "historico", eventId, title, "warning", eventTimestamp,
      "Alerta enviado pelo botão SOS do ESP32.");
  const bool statusSaved = writeDeviceStatus("sos");
  return sosSaved && historySaved && statusSaved;
}

String currentDeviceState() {
  if (!alarmActive) return "online";
  if (lidWasOpened && handDetectedAfterOpening && !lidIsClosed) {
    return "ir_detected";
  }
  if (lidWasOpened && !lidIsClosed) return "lid_open";
  return "reminder";
}

void showDisplay() {
  lcd.clear();

  if (alarmActive) {
    lcd.setCursor(0, 0);
    lcd.print("HORA REMEDIO");

    lcd.setCursor(0, 1);
    String line = medicineName;
    if (line.length() > 16) line = line.substring(0, 16);
    lcd.print(line);
  } else {
    lcd.setCursor(0, 0);
    lcd.print("Cuida conectado");

    lcd.setCursor(0, 1);
    lcd.print("Aguardando hora");
  }
}

void startReminder(const String &name, const String &date, const String &timeText) {
  medicineName = name;
  scheduledDate = date;
  scheduledTime = timeText;
  lastCheckedMinute = date + " " + timeText;
  doseEventId = newEventId();
  alarmActive = true;
  lidWasOpened = false;
  handDetectedAfterOpening = false;
  buzzerStep = 0;
  lastBuzzerStep = millis();

  writeDeviceStatus("reminder");
  showDisplay();

  Serial.printf("Lembrete: %s - %s %s\n",
                medicineName.c_str(),
                scheduledDate.c_str(),
                scheduledTime.c_str());
}

void checkRoutine() {
  if (!Firebase.ready() || alarmActive) return;

  String date;
  String timeText;
  if (!getDateTime(date, timeText)) return;

  String minuteKey = date + " " + timeText;
  if (minuteKey == lastCheckedMinute) return;

  if (!Firebase.RTDB.getJSON(&fbdo, medicinesPath)) {
    Serial.printf("Erro ao ler medicamentos: %s\n",
                  fbdo.errorReason().c_str());
    return;
  }

  lastCheckedMinute = minuteKey;
  FirebaseJson &medicines = fbdo.jsonObject();
  const size_t count = medicines.iteratorBegin();
  FirebaseJson::IteratorValue entry;

  for (size_t index = 0; index < count; index++) {
    entry = medicines.valueAt(index);
    if (entry.type != FirebaseJson::JSON_OBJECT) continue;

    FirebaseJson medication;
    medication.setJsonData(entry.value);
    FirebaseJsonData value;
    medication.get(value, "time");
    const String medicineTime = value.success ? value.stringValue : "";
    medication.get(value, "name");
    const String name = value.success ? value.stringValue : "";
    medication.get(value, "status");
    const String status = value.success ? value.stringValue : "";
    medication.get(value, "lastTakenDate");
    const String lastTakenDate = value.success ? value.stringValue : "";

    const bool due = status == "Pendente" ||
                     (status == "Tomado" && lastTakenDate != date);
    if (medicineTime != timeText || name.length() == 0 ||
        !due || lastTakenDate == date) {
      continue;
    }

    medicineId = entry.key;
    medicines.iteratorEnd();
    startReminder(name, date, timeText);
    return;
  }
  medicines.iteratorEnd();
}

void confirmMedicationInteraction() {
  if (!Firebase.ready() || !alarmActive ||
      millis() - lastDoseRetry < EVENT_RETRY_INTERVAL_MS) return;
  lastDoseRetry = millis();

  const String takenAt = timestampNow();
  if (takenAt.isEmpty()) return;
  const String medicationPath = medicinesPath + "/" + medicineId;
  const bool statusOk = Firebase.RTDB.setString(
      &fbdo, medicationPath + "/status", "Tomado");
  const bool takenAtOk = Firebase.RTDB.setString(
      &fbdo, medicationPath + "/lastTakenAt", takenAt);
  const bool dateOk = Firebase.RTDB.setString(
      &fbdo, medicationPath + "/lastTakenDate", scheduledDate);

  String timing = "on_time";
  String takenTime = takenAt.substring(11, 16);
  if (takenTime > scheduledTime) timing = "late";
  FirebaseJson event;
  event.set("date", scheduledDate);
  event.set("timestamp", takenAt);
  event.set("title", medicineName + " confirmado");
  event.set("subtitle", "Confirmado pelo ESP32");
  event.set("type", "success");
  event.set("timing", timing);
  event.set("scheduledTime", scheduledTime);
  event.set("medicineId", medicineId);
  event.set("medicineName", medicineName);
  event.set("source", "esp32");
  event.set("deviceUid", deviceUid);
  event.set("eventId", doseEventId);
  const bool historyOk = Firebase.RTDB.setJSON(
      &fbdo, historyPath + "/" + doseEventId, &event);

  if (statusOk && takenAtOk && dateOk && historyOk) {
    alarmActive = false;
    lidWasOpened = false;
    handDetectedAfterOpening = false;
    medicineId = "";
    doseEventId = "";
    writeDeviceStatus("dose_taken");
    showDisplay();
    Serial.println("Tomada registrada no app e no Firebase.");
  } else {
    Serial.printf("Falha ao registrar tomada: %s\n",
                  fbdo.errorReason().c_str());
  }
}

void retryPendingSos() {
  if (!sosPending || !Firebase.ready() ||
      millis() < nextEventRetry) return;

  nextEventRetry = millis() + EVENT_RETRY_INTERVAL_MS;
  if (pendingSosTimestamp.length() == 0) {
    pendingSosTimestamp = timestampNow();
    if (pendingSosTimestamp.length() == 0) {
      Serial.println("SOS aguardando sincronizacao do horario NTP.");
      return;
    }
  }
  if (writeSosEvent(pendingSosEventId, pendingSosTimestamp)) {
    sosPending = false;
    Serial.println("SOS gravado em /sos e /historico.");
  }
}

void checkSensors() {
  // Reed entre GPIO 4 e GND: LOW significa contato fechado/tampa fechada.
  bool closedNow = digitalRead(PIN_REED) == LOW;
  bool handNow = digitalRead(PIN_IR) == IR_DETECTED_LEVEL;

  if (closedNow != lidIsClosed) {
    lidIsClosed = closedNow;
    if (alarmActive && !closedNow) {
      lidWasOpened = true;
      handDetectedAfterOpening = false;
      Serial.println("Primeira verificacao: tampa aberta.");
      writeDeviceStatus("lid_open");
    } else if (closedNow) {
      if (alarmActive) writeDeviceStatus("reminder");
      else writeDeviceStatus("online");
    }
  }

  if (!handStateInitialized) {
    lastHandSent = handNow;
    handStateInitialized = true;
  } else if (handNow != lastHandSent) {
    lastHandSent = handNow;
  }

  if (alarmActive && lidWasOpened && !lidIsClosed && handNow &&
      !handDetectedAfterOpening) {
    handDetectedAfterOpening = true;
    Serial.println("Segunda verificacao: sensor IR detectou retirada.");
    writeDeviceStatus("ir_detected");
  }

  if (alarmActive &&
      lidWasOpened &&
      handDetectedAfterOpening &&
      lidIsClosed) {
    confirmMedicationInteraction();
  }

  // Debounce e detecção de pressionamento do botão SOS.
  bool buttonReading = digitalRead(PIN_SOS) == SOS_ACTIVE_LEVEL;

  if (buttonReading != lastButtonReading) {
    lastButtonChange = millis();
    lastButtonReading = buttonReading;
  }

  if (millis() - lastButtonChange >= DEBOUNCE_MS &&
      buttonReading != stableButtonState) {
    stableButtonState = buttonReading;

    if (stableButtonState) {
      pendingSosEventId = newEventId();
      pendingSosTimestamp = timestampNow();
      sosPending = true;
      if (pendingSosTimestamp.length() == 0) {
        Serial.println("SOS guardado; aguardando sincronizacao do horario NTP.");
      } else if (!Firebase.ready()) {
        Serial.println("SOS guardado temporariamente; aguardando Firebase.");
      }
    }
  }
}

void handleBuzzer() {
  if (!alarmActive) {
    digitalWrite(PIN_BUZZER, LOW);
    return;
  }

  if (millis() - lastBuzzerStep >= BUZZER_STEP_MS) {
    lastBuzzerStep = millis();
    buzzerStep = (buzzerStep + 1) %
        (sizeof(ACTIVE_BUZZER_PATTERN) / sizeof(ACTIVE_BUZZER_PATTERN[0]));
  }
  digitalWrite(PIN_BUZZER, ACTIVE_BUZZER_PATTERN[buzzerStep] ? HIGH : LOW);
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_IR, INPUT);
  pinMode(PIN_SOS, INPUT_PULLUP);
  stableButtonState = digitalRead(PIN_SOS) == SOS_ACTIVE_LEVEL;
  lastButtonReading = stableButtonState;
  lastButtonChange = millis();
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_REED, INPUT_PULLUP);
  digitalWrite(PIN_BUZZER, LOW);

  Wire.begin(PIN_SDA, PIN_SCL);
  lcd.init();
  lcd.backlight();
  lcd.print("Iniciando Cuida");

  firebaseConfigValid =
      strlen(WIFI_SSID) > 0 &&
      strlen(WIFI_PASSWORD) > 0 &&
      strlen(FIREBASE_API_KEY) > 0 &&
      strlen(FIREBASE_DEVICE_EMAIL) > 0 &&
      strlen(FIREBASE_DEVICE_PASSWORD) > 0 &&
      strlen(CAREGIVER_UID) > 0 &&
      strlen(ELDER_ID) > 0;
  if (!firebaseConfigValid) {
    Serial.println("Configuracao incompleta em src/secrets.h.");
    Serial.println("Preencha Wi-Fi, Firebase, UID do cuidador e ID do idoso.");
    lcd.clear();
    lcd.print("Configurar");
    lcd.setCursor(0, 1);
    lcd.print("secrets.h");
    return;
  }

  familyPath = String("/usuarios/") + CAREGIVER_UID +
               "/familiares/" + ELDER_ID;
  medicinesPath = familyPath + "/medicamentos";
  historyPath = familyPath + "/historico";
  sosPath = familyPath + "/sos";
  deviceStatusPath = familyPath + "/status/dispositivo";

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTzTime("BRT3", "pool.ntp.org", "time.google.com");

  config.api_key = FIREBASE_API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;
  auth.user.email = FIREBASE_DEVICE_EMAIL;
  auth.user.password = FIREBASE_DEVICE_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  lidIsClosed = digitalRead(PIN_REED) == LOW;
  showDisplay();
  Serial.println("Firmware iniciado. Aguardando Wi-Fi e Firebase...");
}

void loop() {
  if (!firebaseConfigValid) {
    delay(1000);
    return;
  }

  if (WiFi.status() != WL_CONNECTED && millis() >= nextWifiRetry) {
    nextWifiRetry = millis() + WIFI_RETRY_INTERVAL_MS;
    Serial.println("Wi-Fi desconectado; tentando reconectar.");
    WiFi.reconnect();
  }

  if (Firebase.ready()) {
    if (!firebaseReadyAnnounced) {
      deviceUid = String(auth.token.uid.c_str());
      if (deviceUid.length() == 0) {
        Serial.println("Firebase autenticou, mas nao retornou o UID do dispositivo.");
      } else {
        Serial.printf("Firebase conectado. UID do ESP32: %s\n", deviceUid.c_str());
        Serial.printf("Caminho do familiar: %s\n", familyPath.c_str());
        writeDeviceStatus(currentDeviceState());
        lastHeartbeat = millis();
        firebaseReadyAnnounced = true;
      }
    }

    if (firebaseReadyAnnounced) {
      retryPendingSos();
      if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = millis();
        writeDeviceStatus(currentDeviceState());
      }
    }
  } else if (firebaseReadyAnnounced) {
    firebaseReadyAnnounced = false;
    Serial.println("Firebase desconectado; aguardando reconexao.");
  }

  checkSensors();
  handleBuzzer();

  if (millis() - lastRoutineCheck >= ROUTINE_CHECK_MS) {
    lastRoutineCheck = millis();
    checkRoutine();
  }

  delay(20);
}