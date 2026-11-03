#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "secrets.h"
#define DATABASE_URL "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app"

#pragma once'     

#define WIFI_SSID "GOOGLE_DAY"
#define WIFI_PASSWORD "googleday2026"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool firebaseWaitNoticePrinted = false;
unsigned long firebaseStartedAt = 0;
unsigned long nextFirebaseAttemptAt = 0;

constexpr unsigned long FIREBASE_RETRY_INTERVAL_MS = 10000;
constexpr unsigned long CONNECTION_PROOF_INTERVAL_MS = 60000;

bool saveConnectionProof() {
  const String uid(auth.token.uid.c_str());
  if (uid.isEmpty()) {
    Serial.println("Firebase ainda nao informou o UID da conta autenticada.");
    return false;
  }

  String path = "/diagnosticos/";
  path += uid;
  FirebaseJson proof;
  proof.set("status", "conectado");
  proof.set("ip", WiFi.localIP().toString());
  proof.set("rssi", WiFi.RSSI());
  proof.set("uptimeMs", millis());
  proof.set("lastSeen/.sv", "timestamp");

  Serial.printf("Gravando confirmacao em %s ...\n", path.c_str());
  if (!Firebase.RTDB.setJSON(&fbdo, path, &proof)) {
    Serial.printf("Falha ao gravar no Realtime Database: %s\n",
                  fbdo.errorReason().c_str());
    return false;
  }

  if (!Firebase.RTDB.getJSON(&fbdo, path)) {
    Serial.printf("Gravacao aceita, mas nao consegui ler de volta %s: %s\n",
                  path.c_str(), fbdo.errorReason().c_str());
    return false;
  }

  Serial.println("CONFIRMADO: dados gravados e lidos de volta do Firebase.");
  Serial.printf("Caminho: %s\n", path.c_str());
  Serial.printf("Registro: %s\n", fbdo.jsonString().c_str());
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nIniciando...");

  // Conecta Wi-Fi
  // WIFI_SSID e WIFI_PASSWORD sao definidos em secrets.h (nome da rede e senha).
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(400);
  }
  Serial.println("\nWi-Fi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Configura Firebase
  config.api_key = "AIzaSyCXHBFDahCxPlaxw-oILvzKLpVZlUsq_1E";
  config.database_url = "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app";
  config.token_status_callback = tokenStatusCallback;  // usa o callback padrão da lib
  config.timeout.serverResponse = 15000;
  config.timeout.socketConnection = 15000;

  // Login anônimo
  Serial.println("Iniciando login anonimo no Firebase...");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase: Login OK");
  } else {
    Serial.printf("Erro no login: %s\n", config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  firebaseStartedAt = millis();
  Serial.println("Firebase iniciado; aguardando autenticacao...");
  Serial.println("A confirmacao sera salva em /diagnosticos/<UID> no Realtime Database.");
}

void loop() {
  if (Firebase.ready() && millis() >= nextFirebaseAttemptAt) {
    nextFirebaseAttemptAt = millis() + FIREBASE_RETRY_INTERVAL_MS;
    if (saveConnectionProof()) {
      nextFirebaseAttemptAt = millis() + CONNECTION_PROOF_INTERVAL_MS;
    }
  } else if (!Firebase.ready() && !firebaseWaitNoticePrinted &&
             millis() - firebaseStartedAt > 20000) {
    Serial.println("AVISO: Firebase ainda nao autenticou; confira a internet, a API key e o login anonimo.");
    firebaseWaitNoticePrinted = true;
  }
  delay(100);
}