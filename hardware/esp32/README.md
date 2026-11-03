# Firmware Cuida+ - ESP32 DevKit V1

O sketch `CuidaPlusESP32.ino` usa o LCD I2C testado, sensores com debounce, lembrete diario, sincronizacao NTP, buzzer e HTTPS para Firebase Authentication e Realtime Database REST. Esta configuracao nao depende de Cloud Functions nem do plano Blaze.

## Configurar Firebase sem Blaze

O Firebase Authentication e as regras do Realtime Database controlam o acesso do dispositivo. Crie uma conta Firebase exclusiva para a placa; nao use o e-mail/senha do cuidador no firmware. A conta do ESP32 pode ser revogada sem afetar o login do app.

1. No Firebase Console do projeto `cuidaplus-11255`, abra **Authentication > Sign-in method** e habilite **E-mail/senha**.
2. Em **Authentication > Users**, adicione uma conta exclusiva para a placa. Anote o UID dela e use uma senha longa e exclusiva.
3. No app, abra o perfil do idoso, toque em **Editar Perfil**, cole esse UID em **Conexao do ESP32** e salve.
4. Copie `secrets.example.h` para `secrets.h` na pasta do sketch e preencha:
   - SSID e senha de uma rede Wi-Fi de 2,4 GHz;
   - API key publica do app Web, em `firebaseConfig.js`;
   - e-mail e senha exclusivos da conta criada para a placa;
   - UID da conta do cuidador, exibido no perfil do app;
   - ID do idoso, exibido no perfil do app.
5. Na raiz do projeto, publique somente as regras do Realtime Database:

   ```powershell
   firebase deploy --only database --project cuidaplus-11255
   ```

   Esse comando nao publica Cloud Functions nem Storage. As regras de `database.rules.json` mantem os dados privados do cuidador e dao a conta do ESP32 permissao apenas para ler a agenda e gravar o status de tomada, historico, SOS e heartbeat do perfil pareado.
6. Instale ArduinoJson e a biblioteca LiquidCrystal_I2C usada no teste do LCD. Compile e envie `CuidaPlusESP32.ino` para ESP32 DevKit V1. Abra o Monitor Serial em 115200 baud.

O sketch autentica a conta do dispositivo pela API do Firebase Auth, renova o token e usa HTTPS validado para consultar/gravar no RTDB. O UID autenticado precisa ser o mesmo UID pareado no perfil. `Permission denied` normalmente indica regras ainda nao publicadas, UID divergente ou provedor E-mail/senha desabilitado.

Crie `secrets.h` a partir do exemplo; o arquivo real esta no `.gitignore`. Nunca compartilhe esse arquivo, senha ou dados pessoais. Senhas embarcadas podem ser extraidas de um dispositivo fisico; por isso, use uma conta separada e regras de permissao minima. Se a placa for perdida, desative a conta dela no Firebase Authentication e remova o UID do perfil.

`functions/index.js` fica como alternativa futura para Cloud Functions e nao e usado pelo firmware nesta configuracao. Publicar Cloud Functions pode exigir Blaze; nao e necessario para o fluxo gratuito acima.

O app salva um horario diario por medicamento. A data da ultima tomada evita repetir o mesmo alarme depois de uma reinicializacao e permite que o medicamento volte a ficar pendente no dia seguinte. Multiplos horarios por medicamento e deteccao automatica de doses perdidas ainda nao estao implementados. Evite medicamentos diferentes no mesmo horario porque o sensor nao identifica qual frasco/comprimido foi retirado.

O evento de dose so e criado quando o lembrete esta ativo, a tampa abre, o IR indica retirada e a tampa fecha. Isso nao prova ingestao. O SOS gera um evento `warning` em `historico` e `sos`; com o app aberto, o cuidador recebe um alerta e pode tocar no chamado no Historico para registrar o motivo. Push notification quando o app esta fechado/background ainda nao esta configurada. Eventos ainda pendentes de envio ficam apenas em RAM e podem ser perdidos se a placa reiniciar sem conexao.

## PlatformIO (teste de conexao)

O codigo de teste em `src/main.cpp` le as configuracoes de `include/secrets.h`.
Copie `include/secrets.example.h` para `include/secrets.h`, preencha os dados
da rede e do Firebase, e compile com `pio run`. O arquivo `secrets.h` e ignorado
pelo Git; nunca o envie ao repositorio.

Para gravar a confirmacao de conexao, habilite o provedor **Anonymous** em
Firebase Console > Authentication > Sign-in method e publique as regras do
Realtime Database:

```powershell
firebase deploy --only database --project cuidaplus-11255
```

Depois de iniciar, o Monitor Serial mostra o caminho `/diagnosticos/<UID>` e
confirma quando consegue gravar e ler o registro. No Firebase Console, abra
Realtime Database > Data > `diagnosticos` para ver o status, IP, sinal Wi-Fi e
horario da ultima confirmacao. As regras permitem que cada conta autenticada
acesse apenas o diagnostico do proprio UID.

## Arduino IDE

1. Instale o pacote de placas **esp32 by Espressif Systems** pelo Boards Manager.
2. Selecione **Tools > Board > esp32 > DOIT ESP32 DEVKIT V1**. Se esse nome nao aparecer, use **ESP32 Dev Module**.
3. Instale **ArduinoJson** (v6 ou v7) e **LiquidCrystal_I2C** usada com sucesso no teste do display.
4. Copie e preencha `secrets.h` a partir de `secrets.example.h`.
5. Abra `CuidaPlusESP32.ino`, selecione a porta serial, envie o sketch e abra o Serial Monitor em **115200 baud**.

O sketch valida o certificado raiz GTS Root R1; nao use `setInsecure()`. O ESP32 DevKit V1 conecta a redes Wi-Fi de 2,4 GHz, nao 5 GHz. O LCD esta configurado em `0x27`; se o modulo usar `0x3F`, altere o endereco na declaracao de `lcd`.

## Pinos

| Funcao | Pino ESP32 |
|---|---:|
| Reed switch / tampa | GPIO 4 |
| Sensor IR | GPIO 13 |
| Buzzer | GPIO 14 |
| LCD SDA | GPIO 21 |
| LCD SCL | GPIO 22 |
| Botao SOS vermelho | GPIO 27 |

Para um botao momentaneo simples de **2 terminais**, ligue um terminal ao **GPIO 27** e o outro ao **GND**. Nao existe pino VCC nesse tipo; o sketch usa `INPUT_PULLUP` interno e considera LOW como pressionado.

Se o botao for um **modulo de 3 pinos VCC/GND/OUT**, ligue **GND a GND**, **VCC a 3V3** e **OUT ao GPIO 27**. Confira no Monitor Serial se OUT fica em LOW quando pressiona; se o modulo ficar em HIGH, altere `SOS_PRESSED_LEVEL` para `HIGH`. Nunca leve OUT a 5 V.

No sensor IR de 4 pinos **VCC/GND/DO/AO**, ligue **DO ao GPIO 13**, VCC a 3V3 e GND a GND comum. Deixe AO desconectado. Se o modulo exigir 5 V, nao conecte DO diretamente ao ESP32: use conversor de nivel ou divisor que limite a saida a 3,3 V. Confira no Monitor Serial qual nivel (`HIGH` ou `LOW`) indica retirada e ajuste `PILL_REMOVED_LEVEL` se necessario.

Use GND comum entre sensores, display e ESP32. Os GPIOs do ESP32 nao sao tolerantes a 5 V. O sensor reflexivo detecta uma condicao optica; posicao e testes fisicos determinam se isso representa retirada do comprimido.
