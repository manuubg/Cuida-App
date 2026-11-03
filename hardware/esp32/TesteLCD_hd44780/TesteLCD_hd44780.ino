#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>

constexpr uint8_t LCD_SDA_PIN = 21;
constexpr uint8_t LCD_SCL_PIN = 22;

hd44780_I2Cexp lcd;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("TESTE Cuida+ iniciado");
  Serial.flush();

  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  Serial.println("I2C iniciado (SDA 21, SCL 22)");
  Serial.flush();

  Serial.println("Iniciando LCD...");
  Serial.flush();
  const int status = lcd.begin(16, 2);
  if (status != 0) {
    Serial.printf("Falha ao iniciar LCD. Codigo de erro: %d\n", status);
    Serial.flush();
    return;
  }
  Serial.println("LCD inicializado.");
  Serial.flush();

  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Oi mulherzinhas");

  Serial.println("LCD iniciado e texto enviado.");
  Serial.flush();
}

void loop() {
}
