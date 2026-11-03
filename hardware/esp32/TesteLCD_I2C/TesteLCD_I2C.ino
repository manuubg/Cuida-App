#include <Wire.h>
#include <LiquidCrystal_I2C.h>

constexpr uint8_t LCD_SDA_PIN = 21;
constexpr uint8_t LCD_SCL_PIN = 22;
constexpr uint8_t LCD_ADDRESS = 0x27; // If blank, try 0x3F.

LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);

void setup() {
  Serial.begin(115200);
  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Oi mulherzinhas");

  Serial.println("Teste do LCD I2C concluido.");
  Serial.println("Se o LCD ficar em branco, tente mudar 0x27 para 0x3F.");
}

void loop() {
}

//Arduino: 1.8.19 (Windows Store 1.8.57.0) (Windows 10), Placa:"DOIT ESP32 DEVKIT V1, 80MHz, 921600, None, Disabled"





















AVISO: a biblioteca LiquidCrystal_I2C alega rodar em arquitetura(s) avr e pode ser incompatível com sua placa atual, que roda em arquitetura(s) esp32.

AVISO: a biblioteca LiquidCrystal_I2C alega rodar em arquitetura(s) avr e pode ser incompatível com sua placa atual, que roda em arquitetura(s) esp32.

In file included from C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:3:

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp: In member function 'virtual size_t LiquidCrystal_I2C::write(uint8_t)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.h:53:12: warning: 'B00000001' is deprecated: use 0b00000001 instead [-Wdeprecated-declarations]

   53 | #define Rs B00000001  // Register select bit

      |            ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:11:21: note: in expansion of macro 'Rs'

   11 |         send(value, Rs);

      |                     ^~

In file included from C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/Arduino.h:40,

                 from C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:7:

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/binary.h:53:3: note: declared here

   53 |   B00000001 DEPRECATED(0b00000001) = 1,

      |   ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp: In member function 'void LiquidCrystal_I2C::pulseEnable(uint8_t)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.h:51:12: warning: 'B00000100' is deprecated: use 0b00000100 instead [-Wdeprecated-declarations]

   51 | #define En B00000100  // Enable bit

      |            ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:259:31: note: in expansion of macro 'En'

  259 |         expanderWrite(_data | En);      // En high

      |                               ^~

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/binary.h:73:3: note: declared here

   73 |   B00000100 DEPRECATED(0b00000100) = 4,

      |   ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.h:51:12: warning: 'B00000100' is deprecated: use 0b00000100 instead [-Wdeprecated-declarations]

   51 | #define En B00000100  // Enable bit

      |            ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:262:32: note: in expansion of macro 'En'

  262 |         expanderWrite(_data & ~En);     // En low

      |                                ^~

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/binary.h:73:3: note: declared here

   73 |   B00000100 DEPRECATED(0b00000100) = 4,

      |   ^~~~~~~~~

AVISO: a biblioteca LiquidCrystal_I2C alega rodar em arquitetura(s) avr e pode ser incompatível com sua placa atual, que roda em arquitetura(s) esp32.

In file included from C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:3:

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp: In member function 'virtual size_t LiquidCrystal_I2C::write(uint8_t)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.h:53:12: warning: 'B00000001' is deprecated: use 0b00000001 instead [-Wdeprecated-declarations]

   53 | #define Rs B00000001  // Register select bit

      |            ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:11:21: note: in expansion of macro 'Rs'

   11 |         send(value, Rs);

      |                     ^~

In file included from C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/Arduino.h:40,

                 from C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:7:

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/binary.h:53:3: note: declared here

   53 |   B00000001 DEPRECATED(0b00000001) = 1,

      |   ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp: In member function 'void LiquidCrystal_I2C::pulseEnable(uint8_t)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.h:51:12: warning: 'B00000100' is deprecated: use 0b00000100 instead [-Wdeprecated-declarations]

   51 | #define En B00000100  // Enable bit

      |            ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:259:31: note: in expansion of macro 'En'

  259 |         expanderWrite(_data | En);      // En high

      |                               ^~

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/binary.h:73:3: note: declared here

   73 |   B00000100 DEPRECATED(0b00000100) = 4,

      |   ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.h:51:12: warning: 'B00000100' is deprecated: use 0b00000100 instead [-Wdeprecated-declarations]

   51 | #define En B00000100  // Enable bit

      |            ^~~~~~~~~

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp:262:32: note: in expansion of macro 'En'

  262 |         expanderWrite(_data & ~En);     // En low

      |                                ^~

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\cores\esp32/binary.h:73:3: note: declared here

   73 |   B00000100 DEPRECATED(0b00000100) = 4,

      |   ^~~~~~~~~

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\tools\esp32-libs\3.3.12/lib\libesp_system.a(panic_handler.c.obj):(.literal.panic_handler+0x10): undefined reference to `__wrap_esp_panic_handler'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\tools\esp32-libs\3.3.12/lib\libesp_system.a(panic_handler.c.obj): in function `frame_to_panic_info':

/home/runner/work/esp32-arduino-lib-builder/esp32-arduino-lib-builder/esp-idf/components/esp_system/port/panic_handler.c:113:(.text.panic_handler+0xfa): undefined reference to `__wrap_esp_panic_handler'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: sketch\sketch_oct20a.ino.cpp.o:(.literal._Z5setupv+0x4): undefined reference to `Serial0'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: sketch\sketch_oct20a.ino.cpp.o:(.literal._Z5setupv+0x1c): undefined reference to `HardwareSerial::begin(unsigned long, unsigned long, signed char, signed char, bool, unsigned long, unsigned char)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: sketch\sketch_oct20a.ino.cpp.o:(.literal._Z5setupv+0x20): undefined reference to `Print::print(char const*)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: sketch\sketch_oct20a.ino.cpp.o:(.literal._Z5setupv+0x24): undefined reference to `Print::println(char const*)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: sketch\sketch_oct20a.ino.cpp.o: in function `setup()':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\sketch_oct20a/sketch_oct20a.ino:11:(.text._Z5setupv+0x23): undefined reference to `HardwareSerial::begin(unsigned long, unsigned long, signed char, signed char, bool, unsigned long, unsigned char)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\sketch_oct20a/sketch_oct20a.ino:17:(.text._Z5setupv+0x57): undefined reference to `Print::print(char const*)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\sketch_oct20a/sketch_oct20a.ino:18:(.text._Z5setupv+0x63): undefined reference to `Print::println(char const*)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\sketch_oct20a/sketch_oct20a.ino:20:(.text._Z5setupv+0x6e): undefined reference to `Print::println(char const*)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire15endTransmissionEb+0x0): undefined reference to `i2cWrite'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire11requestFromEhjb+0x0): undefined reference to `i2cWriteReadNonStop'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire11requestFromEhjb+0x4): undefined reference to `i2cRead'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire8setClockEm+0x0): undefined reference to `i2cSetClock'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire3endEv+0x0): undefined reference to `i2cSlaveDeinit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire3endEv+0x4): undefined reference to `i2cIsInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire3endEv+0x8): undefined reference to `i2cDeinit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire5beginEhiim+0x8): undefined reference to `i2cSlaveAttachCallbacks'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire5beginEhiim+0xc): undefined reference to `i2cSlaveInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire5beginEiim+0x0): undefined reference to `i2cInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.literal._ZN7TwoWire10slaveWriteEPKhj+0x0): undefined reference to `i2cSlaveWrite'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::endTransmission(bool)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:458:(.text._ZN7TwoWire15endTransmissionEb+0x1f): undefined reference to `i2cWrite'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::requestFrom(unsigned char, unsigned int, bool)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:530:(.text._ZN7TwoWire11requestFromEhjb+0x7f): undefined reference to `i2cWriteReadNonStop'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:535:(.text._ZN7TwoWire11requestFromEhjb+0xaa): undefined reference to `i2cRead'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::setClock(unsigned long)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:395:(.text._ZN7TwoWire8setClockEm+0x27): undefined reference to `i2cSetClock'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::end()':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:337:(.text._ZN7TwoWire3endEv+0x1e): undefined reference to `i2cSlaveDeinit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:352:(.text._ZN7TwoWire3endEv+0x4c): undefined reference to `i2cIsInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:337:(.text._ZN7TwoWire3endEv+0x5a): undefined reference to `i2cDeinit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::begin(unsigned char, int, int, unsigned long)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:245:(.text._ZN7TwoWire5beginEhiim+0x35): undefined reference to `i2cIsInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:256:(.text._ZN7TwoWire5beginEhiim+0x5f): undefined reference to `i2cSlaveAttachCallbacks'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:257:(.text._ZN7TwoWire5beginEhiim+0x7c): undefined reference to `i2cSlaveInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::begin(int, int, unsigned long)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:322:(.text._ZN7TwoWire5beginEiim+0x44): undefined reference to `i2cIsInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:311:(.text._ZN7TwoWire5beginEiim+0x78): undefined reference to `i2cInit'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o: in function `TwoWire::slaveWrite(unsigned char const*, unsigned int)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\hardware\esp32\3.3.12\libraries\Wire\src/Wire.cpp:627:(.text._ZN7TwoWire10slaveWriteEPKhj+0xc): undefined reference to `i2cSlaveWrite'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.rodata._ZTV7TwoWire[_ZTV7TwoWire]+0x2c): undefined reference to `Stream::readBytes(char*, unsigned int)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\Wire\Wire.cpp.o:(.rodata._ZTV7TwoWire[_ZTV7TwoWire]+0x34): undefined reference to `Stream::readString()'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o:(.literal._ZN17LiquidCrystal_I2C11pulseEnableEh+0x0): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o:(.literal._ZN17LiquidCrystal_I2C5beginEhhh+0x4): undefined reference to `delay'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o: in function `LiquidCrystal_I2C::pulseEnable(unsigned char)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:260:(.text._ZN17LiquidCrystal_I2C11pulseEnableEh+0x15): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:262:(.text._ZN17LiquidCrystal_I2C11pulseEnableEh+0x27): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o: in function `LiquidCrystal_I2C::clear()':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:129:(.text._ZN17LiquidCrystal_I2C5clearEv+0xf): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o: in function `LiquidCrystal_I2C::home()':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:134:(.text._ZN17LiquidCrystal_I2C4homeEv+0xf): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o: in function `LiquidCrystal_I2C::begin(unsigned char, unsigned char, unsigned char)':

C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:80:(.text._ZN17LiquidCrystal_I2C5beginEhhh+0x34): undefined reference to `delay'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:84:(.text._ZN17LiquidCrystal_I2C5beginEhhh+0x45): undefined reference to `delay'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:91:(.text._ZN17LiquidCrystal_I2C5beginEhhh+0x55): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:95:(.text._ZN17LiquidCrystal_I2C5beginEhhh+0x65): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\Arduino\libraries\LiquidCrystal_I2C/LiquidCrystal_I2C.cpp:99:(.text._ZN17LiquidCrystal_I2C5beginEhhh+0x76): undefined reference to `delayMicroseconds'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: libraries\LiquidCrystal_I2C\LiquidCrystal_I2C.cpp.o:(.rodata._ZTV17LiquidCrystal_I2C[_ZTV17LiquidCrystal_I2C]+0x14): undefined reference to `Print::write(unsigned char const*, unsigned int)'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\tools\esp32-libs\3.3.12/lib\libfreertos.a(app_startup.c.obj):(.literal.main_task+0x14): undefined reference to `app_main'

C:/Users/I2DS.ECFP508D1263054.000/Documents/ArduinoData/packages/esp32/tools/esp-x32/2601/bin/../lib/gcc/xtensa-esp-elf/14.2.0/../../../../xtensa-esp-elf/bin/ld.exe: C:\Users\I2DS.ECFP508D1263054.000\Documents\ArduinoData\packages\esp32\tools\esp32-libs\3.3.12/lib\libfreertos.a(app_startup.c.obj): in function `main_task':

/home/runner/work/esp32-arduino-lib-builder/esp32-arduino-lib-builder/esp-idf/components/freertos/app_startup.c:206:(.text.main_task+0x3f): undefined reference to `app_main'

collect2.exe: error: ld returned 1 exit status

exit status 1

Erro compilando para a placa DOIT ESP32 DEVKIT V1



Este relatório teria mais informações com
"Mostrar a saida detalhada durante a compilação"
opção pode ser ativada em "Arquivo -> Preferências"
