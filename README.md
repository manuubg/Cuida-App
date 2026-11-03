# CUIDA+

Aplicativo React Native com Expo para apoiar cuidadores no acompanhamento de medicamentos, histórico e alertas de emergência.

## Executar

O projeto usa Expo SDK 57 e foi validado para Expo Go 57.0.9.

```powershell
npm install
$env:EXPO_NO_TELEMETRY="1"
npx expo start
```

Para abrir no celular, use o Expo Go na mesma rede Wi-Fi e escaneie o QR Code.

## Funcionalidades

- Login, cadastro e recuperação de senha com Firebase Authentication.
- Cadastro de medicamentos com horário, duração, observações e foto.
- Confirmação de medicamento e histórico de adesão.
- Modo família para cadastrar e alternar entre familiares.
- Dados, medicamentos, histórico e SOS separados por familiar.
- Integração ESP32 autenticada com Firebase Authentication e Realtime Database.
- Tutorial inicial para orientar o cuidador.
- Tela inicial com identidade visual de acolhimento, resumo da rotina diária, progresso e animação suave.
- Cartão de próximo passo com horário destacado e atalhos visuais para Remédios e Histórico.

## Organização do código

- `App.js`: composição do aplicativo, telas e fluxo de navegação.
- `styles.js`: estilos compartilhados da interface.
- `utils.js`: datas, horários, caminhos do Firebase, validações e operações auxiliares.
- `firebaseConfig.js`: configuração do Firebase.

## Organização do Firebase

Cada conta autenticada pertence a um cuidador e pode acompanhar vários idosos. O ID de cada idoso é a chave estável do familiar, preservada ao alternar entre perfis:

```text
Realtime Database
└── usuarios/{uid}
    ├── conta
    │   ├── accountType: "familia"
    │   ├── caregiver
    │   └── schemaVersion
    └── familiares/{idosoId}
        ├── perfil (elderId, elder, device, onboardingCompleted)
        ├── medicamentos/{medicamentoId}
        ├── historico/{eventoId}
        ├── sos/{eventoId}
        └── status
            ├── display
            └── dispositivo

ID do familiar principal: "principal"
IDs dos demais idosos: chaves geradas pelo Realtime Database

Cloud Storage
└── usuarios/{uid}/familiares/{idosoId}/medicamentos/{medicamentoId}/foto
```

Quando o Cloud Storage estiver inicializado no projeto, fotos novas serão salvas lá e o Realtime Database guardará apenas a URL.

O banco foi limpo após um backup local: não há dados antigos na raiz. O arquivo de backup fica fora do projeto em `Documents/CUIDA-Firebase-backups`; ele contém dados pessoais e deve ser guardado em local privado, sem ser enviado ao GitHub. O app cria o registro da conta familiar quando o cuidador autentica. As contas do Firebase Authentication não foram apagadas; após entrar novamente, cadastre os idosos pela opção `Modo família`. Familiares adicionais ficam sob `familiares/{idosoId}`, com perfil, status do dispositivo, medicamentos, histórico e SOS separados por idoso. O firmware grava eventos SOS em `sos` e no histórico.

No primeiro login com um banco que ainda contenha o esquema antigo, a rotina de migração copia os dados principais e preserva os caminhos de origem; no banco atualmente limpo, ela apenas inicializa a conta.

As regras em `database.rules.json` e `storage.rules` restringem cada UID à própria área autenticada, limitam o acesso do ESP32 ao perfil pareado e restringem uploads a imagens menores que 10 MB. O arquivo `.firebaserc` seleciona o projeto `cuidaplus-11255`. As regras RTDB foram alteradas para permitir a integracao autenticada e precisam ser publicadas antes de usar o firmware atualizado.

O Firebase Storage ainda pode nao estar inicializado no projeto; para habilitar upload de fotos, configure Storage no Console e publique as regras com `firebase deploy --only storage --project cuidaplus-11255`. A conexao do app ao Realtime Database deve ser conferida apos o login, pelo indicador `Firebase` na tela inicial.

### ESP32 sem Cloud Functions

O firmware para ESP32 DevKit V1 esta em `hardware/esp32/CuidaPlusESP32/CuidaPlusESP32.ino`; configuracao Firebase, pinos e testes estao em `hardware/esp32/README.md`. Para evitar Cloud Functions/Blaze, o dispositivo usa uma conta Firebase Authentication exclusiva e o RTDB REST por HTTPS. As regras limitam essa conta ao perfil pareado; nunca use as credenciais do cuidador no firmware. A pasta `functions/` contem uma alternativa Cloud Functions nao usada neste fluxo.

Antes de testar a placa, habilite E-mail/senha no Firebase Authentication, crie uma conta exclusiva para o ESP32, vincule o UID dela ao idoso em Perfil, configure o arquivo local `secrets.h` e publique as regras:

```powershell
firebase deploy --only database --project cuidaplus-11255
```

Esse deploy afeta somente regras RTDB e nao ativa Blaze. A sincronizacao usa o unico horario diario de cada medicamento. Tomadas e SOS aparecem em tempo real no app quando aberto; push notification quando o app esta fechado ainda nao esta configurada. A retirada detectada nao comprova ingestao.

## Testes funcionais

### Testes automatizados de bundle

Executar a checagem de dependências:

```powershell
npx expo install --check
```

Gerar o bundle Android:

```powershell
$env:EXPO_NO_TELEMETRY="1"
.\node_modules\.bin\expo.cmd export --platform android --output-dir .expo-test
Remove-Item -Recurse -Force .expo-test
```

Resultado esperado: o Metro finaliza sem erros e gera o bundle Android.

### Roteiro manual

1. Abrir o app no Expo Go e confirmar que a tela de login aparece.
2. Entrar como visitante e verificar a tela inicial.
3. Confirmar que a entrada da tela inicial aparece suavemente.
4. Verificar o card `Rotina de hoje` e a barra de progresso.
5. Criar uma conta e cadastrar um medicamento.
6. Confirmar o medicamento na tela inicial e conferir o evento no Histórico.
7. Abrir `Modo família`, adicionar outro familiar e alternar entre os perfis.
8. Confirmar que medicamentos e histórico de cada familiar permanecem separados.
9. Depois de publicar as regras e configurar uma conta de teste para o ESP32, testar SOS com um perfil ficticio; nunca usar informacoes pessoais nem acionar uma emergencia real.
10. Fechar e abrir o app novamente para confirmar a persistência no Firebase.

### Formulário de teste com usuários

O arquivo `roteiro-testes-cuida-form.gs` cria um Google Forms para avaliar as tarefas principais do CUIDA+ com participantes. Para usar:

1. Abra [script.google.com](https://script.google.com/) e crie um projeto.
2. Copie o conteúdo de `roteiro-testes-cuida-form.gs` para o editor e execute `criarFormularioTesteCuidaMais`.
3. Autorize o acesso ao Google Forms e consulte os links de edição e resposta no registro de execução. O formulário tem quatro páginas: identificação do teste e participação, tarefas, avaliação da experiência e problemas observados.
4. Na primeira página, informe sistema, versão, responsável, data e ambiente. Antes da sessão, prepare uma conta de teste e dados fictícios. Para a tarefa de família, prepare dois perfis fictícios.

O formulário não coleta e-mail nem envia confirmação por e-mail; ao concluir, a pessoa verá uma mensagem simples de agradecimento. Não use contas, medicamentos ou informações reais de pacientes. Testes de hardware devem usar somente perfis fictícios; não acione uma emergência real. Se uma execução anterior parou com erro após criar o formulário, apague o formulário incompleto no Google Forms antes de executar novamente; a função cria um formulário novo a cada execução.

## Versão de retorno

Antes das melhorias visuais, a versão organizada e salva no GitHub é o commit `5964b33`:

```powershell
git checkout 5964b33
```

Para voltar ao desenvolvimento normal depois de consultar essa versão:

```powershell
git switch main
```
