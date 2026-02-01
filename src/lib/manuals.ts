export type ManualSection = {
  title: string;
  content: string[]; // Array of paragraphs
};

export type ManualContent = {
  title: string;
  introduction: string;
  sections: ManualSection[];
};

export const manuals: { [key: string]: ManualContent } = {
  student: {
    title: "Manual do Aluno - ProZil",
    introduction: "Bem-vindo ao ProZil! Este guia rápido irá ajudá-lo a usar a plataforma para realizar suas tarefas e acompanhar seu progresso. Explore, aprenda e divirta-se!",
    sections: [
      {
        title: "1. Painel Principal (Início)",
        content: [
          "Ao entrar, você verá os tipos de atividades disponíveis: Matemática, Português e Memória. Se o seu professor já atribuiu tarefas, os botões estarão habilitados para você começar."
        ]
      },
      {
        title: "2. Minhas Tarefas",
        content: [
          "Acesse a seção 'Tarefas' no menu lateral para ver uma lista de todas as atividades que seus professores enviaram. As tarefas pendentes aparecem primeiro.",
          "Para atividades do tipo 'Jogo Interativo', clique em 'Iniciar Atividade' para começar.",
          "Para atividades do tipo 'Folha Imprimível', você deve completá-las no papel e, em seguida, marcar a caixa de seleção correspondente na plataforma para informar ao seu professor que você terminou."
        ]
      },
      {
        title: "3. Meu Progresso",
        content: [
          "Na seção 'Progresso', você pode ver gráficos e estatísticas sobre seu desempenho. Acompanhe sua pontuação média e veja como você está melhorando ao longo do tempo em cada matéria."
        ]
      },
      {
        title: "4. Meu Perfil e Conexão com Professores",
        content: [
          "Vá para 'Meu Perfil' para encontrar seu 'ID ProZil'. Este ID é como seu nome de usuário na plataforma.",
          "Para se conectar a um professor, peça o 'ID ProZil' dele e insira-o no campo 'ID ProZil do Professor' em seu perfil. Clique em 'Vincular'. Uma vez conectado, você poderá receber tarefas diretamente dele.",
          "Você pode se desvincular de um professor a qualquer momento na mesma página."
        ]
      },
      {
        title: "5. Configurações de Acessibilidade",
        content: [
          "Na página 'Configurações', você pode personalizar a aparência do ProZil. Escolha entre temas de cores (Claro, Escuro, Rosa, Azul) e ajuste o tamanho da fonte para tornar a leitura mais confortável para você."
        ]
      }
    ]
  },
  teacher: {
    title: "Manual do Professor - ProZil",
    introduction: "Bem-vindo, professor! Este manual foi criado para guiá-lo pelas ferramentas do ProZil, desde a criação de exercícios e tarefas até o acompanhamento do desempenho de seus alunos.",
    sections: [
      {
        title: "1. Conectando-se com Alunos",
        content: [
          "Para começar, você precisa que seus alunos se conectem a você. Vá para a página 'Meu Perfil' no menu lateral para encontrar seu 'ID ProZil'.",
          "Compartilhe este ID com seus alunos. Eles devem inseri-lo em seus próprios perfis para criar o vínculo. Uma vez conectados, eles aparecerão na sua lista de 'Meus Alunos' e você poderá atribuir tarefas a eles."
        ]
      },
      {
        title: "2. Banco de Exercícios: Sua Biblioteca Pessoal",
        content: [
          "Acesse 'Tarefas' e clique na aba 'Banco de Exercícios'. Este é o coração do seu conteúdo.",
          "Aqui, você pode criar exercícios reutilizáveis de diversos tipos (Múltipla Escolha, Jogo da Memória, Organizar Sílabas, etc.).",
          "Use o botão 'Popular com Exemplos' para adicionar um conjunto de exercícios pré-fabricados e começar rapidamente. Você pode editá-los e excluí-los como quiser.",
          "Crie seus próprios exercícios preenchendo o formulário. Seja criativo e adapte o conteúdo às necessidades da sua turma."
        ]
      },
      {
        title: "3. Gerenciando Tarefas",
        content: [
          "Na aba 'Gerenciar Tarefas', você pode criar e atribuir atividades para seus alunos.",
          "Preencha os detalhes da tarefa (título, data de entrega, etc.) e selecione um aluno pelo seu ID ProZil.",
          "Clique em 'Adicionar' para abrir seu Banco de Exercícios e selecionar as perguntas que farão parte da tarefa.",
          "Você pode criar 'Jogos Interativos' (que os alunos jogam na plataforma) ou 'Folhas Imprimíveis'.",
          "As tarefas já criadas podem ser editadas, excluídas ou reutilizadas para outros alunos."
        ]
      },
      {
        title: "4. Acompanhando o Desempenho",
        content: [
          "Na aba 'Tarefas por Aluno', você pode ver o progresso de cada estudante. Expanda o nome de um aluno para ver a lista de tarefas dele.",
          "Clique em 'Ver Relatório' para obter detalhes sobre uma tarefa específica: tempo gasto, tentativas, respostas e pontuação final.",
          "Use o botão 'Gerar Relatório Geral' para baixar um PDF com o resumo do desempenho do aluno em todas as suas tarefas."
        ]
      },
       {
        title: "5. Gerador de Folhas para Imprimir",
        content: [
          "Acesse a seção 'Imprimir' no menu. Nela, você pode selecionar exercícios do seu banco para criar uma folha de atividades em PDF, pronta para impressão e uso offline.",
          "A folha é formatada automaticamente com fontes grandes e layout limpo, ideal para alunos com baixa visão."
        ]
      }
    ]
  },
  director: {
    title: "Manual da Diretoria - ProZil",
    introduction: "Bem-vindo ao Painel da Diretoria. Este guia oferece uma visão geral das ferramentas disponíveis para monitorar a atividade e o desempenho na plataforma ProZil.",
    sections: [
      {
        title: "1. Acessando o Painel Principal",
        content: [
          "Ao fazer login, você será direcionado para a página 'Início', que o convidará a acessar o 'Painel da Diretoria'. Você também pode acessá-lo a qualquer momento pelo menu lateral.",
          "O painel principal exibe métricas-chave em tempo real, como o número total de professores, alunos, tarefas atribuídas e a taxa geral de conclusão."
        ]
      },
      {
        title: "2. Visão por Aluno",
        content: [
          "Dentro do painel, a aba 'Visão por Aluno' permite uma análise detalhada do desempenho individual de cada estudante na plataforma.",
          "Você pode expandir o nome de cada aluno para ver uma lista de todas as tarefas a ele atribuídas, incluindo o status (pendente/concluída) e o professor responsável.",
          "Para cada tarefa, você pode clicar em 'Ver Relatório da Tarefa' para analisar o desempenho em detalhes: pontuação, tempo gasto, respostas, etc.",
          "Use o botão 'Gerar Relatório Geral do Aluno' para baixar um PDF consolidado com o resumo de todas as atividades daquele estudante."
        ]
      },
      {
        title: "3. Visão por Professor",
        content: [
          "A aba 'Visão por Professor' agrupa todas as tarefas criadas por cada professor.",
          "Isso permite que você veja o volume e o tipo de atividades que cada educador está criando e atribuindo aos alunos.",
          "Assim como na visão por aluno, você pode visualizar o relatório detalhado de cada tarefa individualmente."
        ]
      },
      {
        title: "4. Propósito da Visão de Diretoria",
        content: [
          "Seu perfil tem acesso de 'leitura' a todos os dados relevantes da escola. Isso significa que você pode monitorar e gerar relatórios sem o risco de alterar ou excluir acidentalmente tarefas ou perfis.",
          "Use estas ferramentas para obter insights sobre o engajamento na plataforma, identificar alunos que precisam de mais apoio e acompanhar a aplicação das atividades pelos professores."
        ]
      }
    ]
  },
  admin: {
    title: "Manual do Administrador - ProZil",
    introduction: "Este é o guia para o Painel de Administração. Como administrador, você tem controle total sobre os usuários e dados da plataforma. Use estas ferramentas com responsabilidade.",
    sections: [
      {
        title: "1. Gerenciamento de Usuários",
        content: [
          "O painel principal do administrador, acessível pelo menu 'Admin', é dividido em abas para 'Professores', 'Alunos' e 'Diretoria'.",
          "Em cada aba, você pode visualizar todos os usuários cadastrados, editar suas informações (nome e ID ProZil) e ver a data do último acesso.",
          "Use o botão de 'Arquivar' para desativar o acesso de um usuário ao seu perfil do Firestore. Isso não remove a conta de login (Firebase Auth), mas o impede de interagir com os dados do aplicativo. Você pode restaurar usuários arquivados a qualquer momento na visão 'Mostrar Arquivados'."
        ]
      },
      {
        title: "2. Convidando Diretores",
        content: [
          "O perfil de 'Diretoria' é o único que requer um convite para o cadastro. Para criar um convite, use o card 'Convidar Novo Diretor'.",
          "Preencha o nome e o e-mail do diretor e clique em 'Enviar Convite'. A pessoa convidada poderá então criar uma conta com aquele e-mail específico, que será automaticamente atribuída ao perfil de diretoria."
        ]
      },
      {
        title: "3. Ações Críticas",
        content: [
          "O card 'Ações do Administrador' contém ferramentas poderosas.",
          "A ação 'Limpar Perfis de Usuários' remove TODOS os perfis de professores (exceto o seu), alunos e diretores do banco de dados (Firestore). Esta ação é irreversível.",
          "Importante: A limpeza de perfis não remove as contas de autenticação do Firebase. Se um usuário precisar se cadastrar novamente com o mesmo e-mail, sua conta antiga deverá ser excluída manualmente no Firebase Console."
        ]
      },
      {
        title: "4. Acesso e Permissões",
        content: [
          "Sua conta de administrador (UID: yUKh2hnexMdiTd2t9rXEU0SgjPk1) possui permissão de leitura e escrita em toda a base de dados, conforme definido nas regras de segurança do Firestore.",
          "Isso garante que você nunca encontrará erros de permissão ao gerenciar os dados da plataforma. Todos os outros perfis (professor, aluno, diretoria) possuem regras restritas para garantir a segurança e a privacidade dos dados."
        ]
      }
    ]
  }
};
