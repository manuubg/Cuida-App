function criarFormularioTesteCuidaMais() {
  var form = FormApp.create('Teste com usuários — CUIDA+');
  form
    .setDescription(
      'Oi! Vamos testar o CUIDA+ para ver o que está funcionando bem e o que podemos melhorar. ' +
      'Use a conta e os dados fictícios preparados pela equipe. Não coloque aqui senhas, dados pessoais ou informações reais de saúde. ' +
      'Se não quiser continuar, é só parar. O CUIDA+ é um protótipo do nosso projeto e não substitui orientação de saúde. ' +
      'O SOS do dispositivo físico ainda não está integrado ao app, então não faça um acionamento real durante o teste.',
    )
    .setCollectEmail(false)
    .setProgressBar(true)
    .setConfirmationMessage('Prontinho! Recebemos suas respostas. Valeu por testar o CUIDA+ com a gente e ajudar a melhorar o app!');

  form.addSectionHeaderItem()
    .setTitle('1. Sobre esta sessão')
    .setHelpText('Vamos começar identificando o teste. Use dados fictícios e não informe o nome de quem está testando.');

  form.addMultipleChoiceItem()
    .setTitle('Sistema:')
    .setChoiceValues(['CUIDA+'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Versão do aplicativo:')
    .setHelpText('Versão atual: 1.0.0. Confirme com a equipe se estiver usando outra versão.')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Responsável pelo teste:')
    .setHelpText('Nome de quem está acompanhando/aplicando o teste.')
    .setRequired(true);

  form.addDateItem()
    .setTitle('Data do teste:')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Ambiente:')
    .setChoiceValues([
      'Teste — Expo Go em celular Android',
      'Teste — Expo Go em iPhone',
      'Teste — Navegador',
      'Homologação',
      'Outro',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Você topa participar do teste?')
    .setHelpText('A participação é por vontade própria. Se não quiser participar, pode fechar o formulário.')
    .setChoiceValues(['Sim, vamos começar!', 'Prefiro não participar'])
    .setRequired(true);

  form.addPageBreakItem()
    .setTitle('2. Tarefas no aplicativo')
    .setHelpText(
      'Tente realizar cada tarefa sem ajuda primeiro. A equipe deve usar uma conta de teste e dados fictícios. ' +
      'Não use uma conta real de paciente nem registre ou confirme uma dose de medicamento verdadeiro.',
    );

  adicionarTarefa(
    form,
    'Tarefa 1 — Entender a tela inicial',
    'Na tela Início, encontre a rotina de hoje, o próximo medicamento e o status do display. Diga o que você entendeu dessas informações.',
    'A tela inicial permite localizar e compreender a rotina, o próximo medicamento e o status do display.',
  );

  adicionarTarefa(
    form,
    'Tarefa 2 — Cadastrar um medicamento fictício',
    'Abra Remédios e cadastre o medicamento de teste fornecido pela equipe. Preencha nome, dose, quantidade, horário (HH:mm) e duração; observações e foto são opcionais. Não use dados de um tratamento real.',
    'O app informa claramente os campos obrigatórios, aceita um horário válido e mostra o medicamento fictício salvo na lista.',
  );

  adicionarTarefa(
    form,
    'Tarefa 3 — Confirmar e localizar um registro de teste',
    'Usando somente o medicamento fictício criado para esta sessão, volte à tela Início, confirme a dose de teste e encontre o evento correspondente em Histórico.',
    'A confirmação atualiza o status do medicamento e registra o evento no histórico. Não confirme uma dose real.',
  );

  adicionarTarefa(
    form,
    'Tarefa 4 — Consultar o histórico e o relatório',
    'Em Histórico, navegue entre as datas usando Anterior, Próximo e Hoje. Depois alterne o relatório entre 1 semana, 2 semanas e 1 mês.',
    'Os controles de data e período são fáceis de encontrar e a tela apresenta o resumo correspondente aos dados disponíveis.',
  );

  adicionarTarefa(
    form,
    'Tarefa 5 — Encontrar as informações do perfil',
    'Abra Perfil e localize os dados do cuidador e do idoso. Não altere informações reais; use somente o perfil fictício preparado para o teste.',
    'O perfil é fácil de localizar e suas informações estão organizadas e legíveis.',
  );

  adicionarTarefa(
    form,
    'Tarefa 6 — Alternar entre familiares (se disponível)',
    'Se a equipe preparou dois perfis fictícios, abra Modo família, alterne entre eles e confira se o nome, os medicamentos e o histórico correspondem ao perfil selecionado. Se não houver dois perfis, marque “Não se aplica”.',
    'A troca de perfil é compreensível e os dados de cada familiar permanecem separados.',
  );

  form.addPageBreakItem().setTitle('3. Sua experiência');

  form.addScaleItem()
    .setTitle('No geral, foi fácil entender como usar o CUIDA+?')
    .setBounds(1, 5)
    .setLabels('Muito difícil', 'Muito fácil')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Como você avalia a clareza dos textos, botões e mensagens?')
    .setBounds(1, 5)
    .setLabels('Muito confusos', 'Muito claros')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Como você avalia a aparência e a leitura das telas?')
    .setBounds(1, 5)
    .setLabels('Muito ruim', 'Muito boa')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Você usaria o CUIDA+ para acompanhar uma rotina de cuidados, se ele estivesse pronto?')
    .setChoiceValues(['Sim', 'Talvez', 'Não'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Em qual tarefa você teve mais dificuldade? O que dificultou?');

  form.addParagraphTextItem()
    .setTitle('O que você mais gostou ou achou útil no aplicativo?');

  form.addParagraphTextItem()
    .setTitle('O que você mudaria ou gostaria que o aplicativo tivesse?');

  form.addPageBreakItem().setTitle('4. Problemas observados');
  form.addSectionHeaderItem()
    .setTitle('Registre uma falha, se aconteceu')
    .setHelpText('Se não houve falha, deixe os campos em branco. Não inclua senhas, dados pessoais ou informações de saúde.');

  form.addParagraphTextItem()
    .setTitle('O que aconteceu? Qual tela ou tarefa estava sendo usada?');

  form.addParagraphTextItem()
    .setTitle('Como a equipe pode reproduzir o problema?');

  form.addMultipleChoiceItem()
    .setTitle('Qual foi o impacto?')
    .setChoiceValues([
      'Baixo — pequeno incômodo, consegui continuar',
      'Médio — dificultou uma tarefa',
      'Alto — não consegui concluir uma tarefa importante',
      'Não sei avaliar',
    ]);

  form.addTextItem()
    .setTitle('Link de evidência (opcional; remova dados pessoais da imagem antes de compartilhar)');

  form.addParagraphTextItem()
    .setTitle('Comentários finais');

  Logger.log('Formulário do CUIDA+ criado.');
  Logger.log('Link para editar: ' + form.getEditUrl());
  Logger.log('Link para responder: ' + form.getPublishedUrl());
}

function adicionarTarefa(form, titulo, passos, esperado) {
  form.addSectionHeaderItem()
    .setTitle(titulo)
    .setHelpText('O que fazer: ' + passos + '\n\nO que observar: ' + esperado);

  form.addMultipleChoiceItem()
    .setTitle('Como foi esta tarefa? — ' + titulo)
    .setChoiceValues([
      'Consegui fazer sem ajuda',
      'Consegui fazer com ajuda',
      'Não consegui concluir',
      'Não se aplica / não foi executada',
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Observações sobre esta tarefa — ' + titulo)
    .setHelpText('O que aconteceu? Alguma mensagem apareceu? Deixe em branco se não tiver observações.');

  form.addMultipleChoiceItem()
    .setTitle('Qual foi o nível de dificuldade? — ' + titulo)
    .setChoiceValues(['Muito fácil', 'Fácil', 'Nem fácil nem difícil', 'Difícil', 'Muito difícil'])
    .setRequired(true);
}
