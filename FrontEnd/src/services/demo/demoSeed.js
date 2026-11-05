import { ROLES, TICKET_STATUS } from '../../utils/constants.js';

const DEMO_PASSWORD = 'demo1234';

const users = [
  {
    id: 1,
    username: 'ana.souza',
    name: 'Ana Souza',
    email: 'ana.souza@demo.local',
    role: ROLES.REQUESTER,
    department: 'Financeiro',
    password: DEMO_PASSWORD,
  },
  {
    id: 2,
    username: 'carlos.lima',
    name: 'Carlos Lima',
    email: 'carlos.lima@demo.local',
    role: ROLES.TECHNICIAN,
    department: 'Suporte N1',
    password: DEMO_PASSWORD,
  },
  {
    id: 3,
    username: 'marina.alves',
    name: 'Marina Alves',
    email: 'marina.alves@demo.local',
    role: ROLES.TECHNICIAN,
    department: 'Suporte N2',
    password: DEMO_PASSWORD,
  },
  {
    id: 4,
    username: 'joao.pereira',
    name: 'João Pereira',
    email: 'joao.pereira@demo.local',
    role: ROLES.REQUESTER,
    department: 'Comercial',
    password: DEMO_PASSWORD,
  },
];

export const DEMO_ACCOUNTS = [
  {
    label: 'Solicitante',
    name: 'Ana Souza',
    username: 'ana.souza@demo.local',
    password: DEMO_PASSWORD,
    role: ROLES.REQUESTER,
  },
  {
    label: 'Técnico',
    name: 'Carlos Lima',
    username: 'carlos.lima@demo.local',
    password: DEMO_PASSWORD,
    role: ROLES.TECHNICIAN,
  },
];

const categories = [
  { id: 1, slug: 'ti', name: 'TI' },
  { id: 2, slug: 'infraestrutura', name: 'Infraestrutura' },
  { id: 3, slug: 'financeiro', name: 'Financeiro' },
];

const U = {
  ana: users[0],
  carlos: users[1],
  marina: users[2],
  joao: users[3],
};

const now = Date.now();
const HOUR = 60 * 60 * 1000;

function isoAgo(hours) {
  return new Date(now - Math.max(hours, 0) * HOUR).toISOString();
}

function category(slug) {
  return categories.find((item) => item.slug === slug);
}

function ticket({
  id,
  title,
  description,
  categorySlug,
  urgency,
  status,
  requester,
  assignee = null,
  ageHours,
  updatedAgoHours,
  resolvedAgoHours = null,
  resolution = null,
}) {
  return {
    id,
    code: `HD-${String(id).padStart(4, '0')}`,
    title,
    description,
    category: category(categorySlug),
    urgency,
    status,
    requester,
    assignee,
    created_at: isoAgo(ageHours),
    updated_at: isoAgo(updatedAgoHours ?? Math.max(ageHours - 2, 0.5)),
    resolved_at: resolvedAgoHours === null ? null : isoAgo(resolvedAgoHours),
    resolution,
  };
}

const tickets = [
  ticket({
    id: 101,
    title: 'Erro ao acessar o sistema de ponto eletrônico',
    description:
      'Ao tentar registrar o ponto pelo navegador, o sistema exibe a mensagem "usuário não autorizado". O acesso funcionava normalmente até ontem. Preciso de suporte para conseguir registrar as horas do dia.',
    categorySlug: 'ti',
    urgency: null,
    status: TICKET_STATUS.OPEN,
    requester: U.ana,
    ageHours: 2,
  }),
  ticket({
    id: 102,
    title: 'Notebook não conecta ao Wi-Fi corporativo',
    description:
      'O notebook do comercial não localiza a rede interna da empresa. O Wi-Fi funciona em outros dispositivos. Já reiniciei o computador e o roteador sem sucesso.',
    categorySlug: 'infraestrutura',
    urgency: null,
    status: TICKET_STATUS.OPEN,
    requester: U.joao,
    ageHours: 5,
  }),
  ticket({
    id: 103,
    title: 'Solicitação de instalação do pacote Office',
    description:
      'Preciso do Microsoft Office instalado na máquina nova para elaborar as planilhas de acompanhamento do setor. A máquina está sem suíte de escritório desde a substituição.',
    categorySlug: 'ti',
    urgency: null,
    status: TICKET_STATUS.OPEN,
    requester: U.ana,
    ageHours: 26,
  }),
  ticket({
    id: 104,
    title: 'Reembolso de despesa não processado',
    description:
      'A solicitação de reembolso enviada há sete dias úteis continua com status "em análise" e não foi incluída no último ciclo de pagamento. Preciso de uma verificação do lançamento.',
    categorySlug: 'financeiro',
    urgency: null,
    status: TICKET_STATUS.OPEN,
    requester: U.joao,
    ageHours: 30,
  }),
  ticket({
    id: 105,
    title: 'Redefinição de senha do ERP',
    description:
      'A senha do ERP expirou e a opção de recuperação automática não envia o e-mail. Solicito a redefinição para retomar os lançamentos pendentes.',
    categorySlug: 'ti',
    urgency: null,
    status: TICKET_STATUS.OPEN,
    requester: U.ana,
    ageHours: 50,
  }),
  ticket({
    id: 106,
    title: 'VPN cai constantemente durante o expediente',
    description:
      'A conexão VPN permanece estável por cerca de 20 minutos e depois desconecta. O problema afeta o acesso aos sistemas internos e acontece várias vezes ao dia.',
    categorySlug: 'infraestrutura',
    urgency: 'MEDIA',
    status: TICKET_STATUS.IN_PROGRESS,
    requester: U.ana,
    assignee: U.carlos,
    ageHours: 52,
    updatedAgoHours: 3,
  }),
  ticket({
    id: 107,
    title: 'Sistema de emissão de notas fiscais indisponível',
    description:
      'O módulo de emissão de notas fiscais retorna erro 503 ao tentar gerar qualquer documento. A equipe está sem conseguir faturar os pedidos do dia.',
    categorySlug: 'ti',
    urgency: 'ALTA',
    status: TICKET_STATUS.IN_PROGRESS,
    requester: U.joao,
    assignee: U.marina,
    ageHours: 28,
    updatedAgoHours: 1,
  }),
  ticket({
    id: 108,
    title: 'Impressora do 2º andar com atolamento recorrente',
    description:
      'A impressora compartilhada do 2º andar apresenta atolamento de papel a cada três ou quatro páginas. Já foram removidas folhas presas, mas o problema voltou.',
    categorySlug: 'infraestrutura',
    urgency: 'BAIXA',
    status: TICKET_STATUS.IN_PROGRESS,
    requester: U.joao,
    assignee: U.carlos,
    ageHours: 72,
    updatedAgoHours: 5,
  }),
  ticket({
    id: 109,
    title: 'Nota fiscal duplicada no módulo financeiro',
    description:
      'A nota fiscal do pedido 4821 foi lançada duas vezes no módulo financeiro, gerando divergência no relatório de faturamento. É necessário estornar o lançamento duplicado.',
    categorySlug: 'financeiro',
    urgency: 'MEDIA',
    status: TICKET_STATUS.IN_PROGRESS,
    requester: U.ana,
    assignee: U.marina,
    ageHours: 46,
    updatedAgoHours: 8,
  }),
  ticket({
    id: 110,
    title: 'Acesso à pasta compartilhada do setor',
    description:
      'Solicito acesso de leitura e escrita à pasta compartilhada "Financeiro/2026". O acesso anterior foi removido após a mudança de equipe.',
    categorySlug: 'ti',
    urgency: 'MEDIA',
    status: TICKET_STATUS.WAITING_REQUESTER,
    requester: U.ana,
    assignee: U.carlos,
    ageHours: 74,
    updatedAgoHours: 22,
  }),
  ticket({
    id: 111,
    title: 'Monitor com flickering na estação 4',
    description:
      'O monitor da estação 4 apresenta oscilação de brilho e linhas horizontais intermitentes. O cabo de vídeo já foi reconectado e o defeito permanece.',
    categorySlug: 'infraestrutura',
    urgency: 'ALTA',
    status: TICKET_STATUS.WAITING_REQUESTER,
    requester: U.joao,
    assignee: U.marina,
    ageHours: 55,
    updatedAgoHours: 18,
  }),
  ticket({
    id: 112,
    title: 'Dúvida sobre centro de custo no relatório',
    description:
      'O relatório mensal apresenta o centro de custo incorreto para os lançamentos do time comercial. Preciso de orientação para corrigir a parametrização.',
    categorySlug: 'financeiro',
    urgency: 'BAIXA',
    status: TICKET_STATUS.WAITING_REQUESTER,
    requester: U.ana,
    assignee: U.carlos,
    ageHours: 96,
    updatedAgoHours: 30,
  }),
  ticket({
    id: 113,
    title: 'Falha no login do portal do colaborador',
    description:
      'O portal exibia "credenciais inválidas" mesmo após a redefinição de senha. O acesso era necessário para consultar os holerites.',
    categorySlug: 'ti',
    urgency: 'ALTA',
    status: TICKET_STATUS.RESOLVED,
    requester: U.ana,
    assignee: U.carlos,
    ageHours: 144,
    updatedAgoHours: 122,
    resolvedAgoHours: 120,
    resolution:
      'Conta desbloqueada no diretório corporativo e senha temporária emitida. O usuário confirmou o acesso ao portal com sucesso.',
  }),
  ticket({
    id: 114,
    title: 'Troca de cabo de rede da sala 2',
    description:
      'A estação da sala 2 perde a conexão de rede ao menor movimento no cabo. O conector apresenta desgaste visível.',
    categorySlug: 'infraestrutura',
    urgency: 'MEDIA',
    status: TICKET_STATUS.RESOLVED,
    requester: U.joao,
    assignee: U.marina,
    ageHours: 192,
    updatedAgoHours: 170,
    resolvedAgoHours: 168,
    resolution:
      'Cabo de rede substituído e conector novo crimpado. Teste de transferência executado sem perda de pacotes.',
  }),
  ticket({
    id: 115,
    title: 'Correção de valor em reembolso',
    description:
      'O reembolso foi aprovado com valor inferior ao solicitado devido a um erro de digitação no formulário. Peço a correção antes do fechamento financeiro.',
    categorySlug: 'financeiro',
    urgency: 'BAIXA',
    status: TICKET_STATUS.RESOLVED,
    requester: U.ana,
    assignee: U.carlos,
    ageHours: 240,
    updatedAgoHours: 218,
    resolvedAgoHours: 216,
    resolution:
      'Valor corrigido no lançamento e reembolso reprogramado para o próximo ciclo. Solicitante informado por comentário interno.',
  }),
  ticket({
    id: 116,
    title: 'Instalação de certificado digital',
    description:
      'A estação do comercial não possui o certificado digital necessário para assinar documentos no portal da prefeitura.',
    categorySlug: 'ti',
    urgency: 'MEDIA',
    status: TICKET_STATUS.RESOLVED,
    requester: U.joao,
    assignee: U.marina,
    ageHours: 288,
    updatedAgoHours: 266,
    resolvedAgoHours: 264,
    resolution:
      'Certificado importado no navegador corporativo e teste de assinatura realizado com sucesso.',
  }),
];

const seedComments = [
  { ticketId: 106, author: U.carlos, content: 'Acesso remoto agendado com a solicitante para coleta dos logs da VPN.', hours: 30 },
  { ticketId: 106, author: U.carlos, content: 'Identificado conflito entre dois clientes VPN instalados. Removido o cliente antigo e reiniciado o serviço.', hours: 3 },
  { ticketId: 107, author: U.marina, content: 'Indisponibilidade confirmada no serviço de emissão. Escalado para a equipe de aplicação.', hours: 20 },
  { ticketId: 108, author: U.carlos, content: 'Substituída a unidade de fusão e limpo o caminho de papel. Monitorando novas ocorrências.', hours: 5 },
  { ticketId: 109, author: U.marina, content: 'Duplicidade confirmada no lançamento 4821. Aguardando validação do financeiro para estornar.', hours: 8 },
  { ticketId: 110, author: U.carlos, content: 'Permissão aplicada ao grupo do setor. Solicitado que a usuária valide o acesso e confirme o retorno.', hours: 22 },
  { ticketId: 111, author: U.marina, content: 'Testado com outro cabo e outra estação. O defeito acompanha o monitor, indicando falha no equipamento.', hours: 18 },
  { ticketId: 112, author: U.carlos, content: 'Aguardando a solicitante confirmar qual centro de custo deve ser usado como padrão no relatório.', hours: 30 },
  { ticketId: 113, author: U.carlos, content: 'Conta desbloqueada e senha temporária enviada por canal seguro. Acesso validado pela usuária.', hours: 120 },
  { ticketId: 115, author: U.carlos, content: 'Valor corrigido no sistema financeiro. Reembolso incluído no próximo ciclo de pagamento.', hours: 216 },
];

function buildHistory() {
  const events = [];

  tickets.forEach((item) => {
    const created = new Date(item.created_at).getTime();
    events.push({
      ticketId: item.id,
      event_type: 'CREATED',
      actor: item.requester,
      created_at: item.created_at,
      description: 'Chamado aberto pelo solicitante.',
      from_status: null,
      to_status: TICKET_STATUS.OPEN,
    });

    if (item.assignee) {
      const assignedAt = new Date(Math.min(created + HOUR, now - HOUR)).toISOString();
      events.push({
        ticketId: item.id,
        event_type: 'ASSIGNED',
        actor: item.assignee,
        created_at: assignedAt,
        description: `Chamado assumido por ${item.assignee.name}.`,
        from_status: TICKET_STATUS.OPEN,
        to_status: TICKET_STATUS.IN_PROGRESS,
      });
    }

    if (item.status === TICKET_STATUS.WAITING_REQUESTER) {
      events.push({
        ticketId: item.id,
        event_type: 'STATUS_CHANGED',
        actor: item.assignee,
        created_at: item.updated_at,
        description: 'Atendimento pausado para aguardar retorno do solicitante.',
        from_status: TICKET_STATUS.IN_PROGRESS,
        to_status: TICKET_STATUS.WAITING_REQUESTER,
      });
    }

    if (item.status === TICKET_STATUS.RESOLVED) {
      events.push({
        ticketId: item.id,
        event_type: 'STATUS_CHANGED',
        actor: item.assignee,
        created_at: item.resolved_at,
        description: 'Chamado marcado como resolvido.',
        from_status: TICKET_STATUS.IN_PROGRESS,
        to_status: TICKET_STATUS.RESOLVED,
      });
      events.push({
        ticketId: item.id,
        event_type: 'RESOLVED',
        actor: item.assignee,
        created_at: item.resolved_at,
        description: item.resolution,
        from_status: TICKET_STATUS.IN_PROGRESS,
        to_status: TICKET_STATUS.RESOLVED,
      });
    }
  });

  return events.map((event, index) => ({ id: index + 1, ...event }));
}

export function createDemoSeed() {
  const history = buildHistory();
  const comments = seedComments.map((comment, index) => ({
    id: index + 1,
    ticketId: comment.ticketId,
    author: comment.author,
    content: comment.content,
    created_at: isoAgo(comment.hours),
  }));

  return {
    version: 1,
    users,
    categories,
    tickets,
    comments,
    history,
    nextTicketId: Math.max(...tickets.map((item) => item.id)) + 1,
    nextCommentId: comments.length + 1,
    nextHistoryId: history.length + 1,
  };
}
