#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "secrets.h"
#define DATABASE_URL "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool databaseTestDone = false;
bool firebaseWaitNoticePrinted = false;
unsigned long firebaseStartedAt = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nIniciando...");

  // Conecta Wi-Fi
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
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
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
}

void loop() {
  if (!databaseTestDone) {
    if (Firebase.ready()) {
      Serial.println("Testando acesso ao Realtime Database...");
      if (Firebase.RTDB.setString(&fbdo, "/teste/mensagem", "ESP32 funcionando!")) {
        Serial.println("SUCESSO: gravacao no Firebase Realtime Database confirmada!");
        Serial.println("Confira o valor em /teste/mensagem no Firebase Console.");
      } else {
        Serial.print("FALHA no teste do Realtime Database: ");
        Serial.println(fbdo.errorReason());
      }
      databaseTestDone = true;
    } else if (!firebaseWaitNoticePrinted && millis() - firebaseStartedAt > 20000) {
      Serial.println("AVISO: Firebase ainda nao autenticou; confira se o login anonimo esta habilitado.");
      firebaseWaitNoticePrinted = true;
    }
  }
  delay(100);
}