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
- Integração futura com o dispositivo físico do TCC para o SOS.
- Tutorial inicial para orientar o cuidador.
- Tela inicial com identidade visual de acolhimento, resumo da rotina diária, progresso e animação suave.
- Cartão de próximo passo com horário destacado e atalhos visuais para Remédios e Histórico.

## Organização do código

- `App.js`: composição do aplicativo, telas e fluxo de navegação.
- `styles.js`: estilos compartilhados da interface.
- `utils.js`: datas, horários, caminhos do Firebase, validações e operações auxiliares.
- `firebaseConfig.js`: configuração do Firebase.

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
9. Acionar o teste de SOS, conferir o alerta e marcar como resolvido.
10. Fechar e abrir o app novamente para confirmar a persistência no Firebase.

## Versão de retorno

Antes das melhorias visuais, a versão organizada e salva no GitHub é o commit `5964b33`:

```powershell
git checkout 5964b33
```

Para voltar ao desenvolvimento normal depois de consultar essa versão:

```powershell
git switch main
```
