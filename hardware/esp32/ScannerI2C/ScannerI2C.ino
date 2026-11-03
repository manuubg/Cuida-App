#include <Wire.h>

constexpr uint8_t SDA_PIN = 21;
constexpr uint8_t SCL_PIN = 22;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(SDA_PIN, SCL_PIN);

  Serial.println();
  Serial.println("Scanner I2C - ESP32 DevKit V1");
  Serial.println("SDA = GPIO 21 | SCL = GPIO 22");
}

void loop() {
  uint8_t found = 0;
  Serial.println("Procurando dispositivos...");

  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    const uint8_t error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("Dispositivo encontrado no endereco 0x%02X\n", address);
      found++;
    }
  }

  if (found == 0) {
    Serial.println("Nenhum dispositivo I2C encontrado.");
  }
  Serial.println("---");
  delay(3000);
}
