# Helpdesk — Frontend React

Frontend de um sistema web de gestão de chamados e ordens de serviço (Helpdesk), construído em **React + JavaScript + Vite**, preparado para consumir uma API **Django REST Framework**.

O projeto implementa o MVP completo: autenticação, listagem por perfil, abertura compartilhada de chamados, filtros combináveis, quadro Kanban com drag and drop, detalhe com solicitação e confirmação de resolução, comentários internos e histórico de auditoria.

> **Estado atual:** interface funcional, testada e integrada ao backend Django. Sem o backend, a aplicação roda em **modo demonstração** com dados fictícios claramente sinalizados na interface. O contrato validado e as limitações restantes estão em [Integração com o backend](#integração-com-o-backend).

---

## Sumário

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Modo demonstração](#modo-demonstração)
- [Scripts](#scripts)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Rotas e controle de acesso](#rotas-e-controle-de-acesso)
- [Perfis e permissões na interface](#perfis-e-permissões-na-interface)
- [Contrato da API](#contrato-da-api)
- [Regras de negócio refletidas na UI](#regras-de-negócio-refletidas-na-ui)
- [Estados de interface e erros](#estados-de-interface-e-erros)
- [Testes](#testes)
- [Acessibilidade e responsividade](#acessibilidade-e-responsividade)
- [Segurança](#segurança)
- [Integração com o backend](#integração-com-o-backend)
- [Fora do escopo do MVP](#fora-do-escopo-do-mvp)

---

## Stack

| Tecnologia | Uso |
|---|---|
| React 18 + JavaScript | Interface, sem TypeScript |
| Vite 6 | Dev server e build |
| React Router 6 | Rotas, guards de autenticação e perfil |
| Axios | Cliente HTTP centralizado |
| React Hook Form | Formulários de chamado, login e resolução |
| `@dnd-kit/core` | Drag and drop acessível no Kanban |
| Lucide React | Ícones |
| CSS puro com variáveis | Tokens, layout, componentes e páginas |
| Vitest + React Testing Library | Testes de comportamento |

Sem Redux: autenticação e notificações usam **Context API**; filtros, paginação e formulários usam estado local.

O Kanban usa `@dnd-kit/core` com `PointerSensor` e `KeyboardSensor`. O frontend valida os destinos permitidos e exibe feedback imediato, mas a autorização e a transição definitivas continuam no backend. Em telas pequenas, as mesmas ações ficam disponíveis em botões explícitos.

---

## Pré-requisitos

- **Node.js 18+** (desenvolvido com Node 22)
- **npm 9+**

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de ambiente
#    Windows (PowerShell): Copy-Item .env.example .env
#    Linux/macOS:          cp .env.example .env
#    (o repositório já inclui um .env com o modo demonstração ativo)

# 3. Subir o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:5173**.

Para apontar para o backend real, edite o `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_DEMO_MODE=false
```

Reinicie o Vite após alterar variáveis de ambiente.

### Build de produção

```bash
npm run build
npm run preview   # serve o build em http://localhost:4173
```

O build gera os arquivos em `dist/`. Como o roteamento usa `BrowserRouter`, o servidor que hospeda o build precisa redirecionar rotas desconhecidas para `index.html` (fallback SPA).

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | URL base da API Django REST Framework |
| `VITE_DEMO_MODE` | `true` no `.env` de exemplo | `true` usa o backend simulado no navegador; `false` usa a API real |

Tudo o que começa com `VITE_` é embutido no bundle e **não deve conter segredos**. Nenhuma senha, token ou chave é armazenada no código de produção; as credenciais de demonstração existem apenas no seed fictício.

---

## Modo demonstração

Com `VITE_DEMO_MODE=true`:

- Os serviços (`authService`, `ticketService`, `commentService`, `historyService`, `categoryService`) delegam para `src/services/demo/demoBackend.js`.
- Os dados vivem em memória e em `sessionStorage` (chaves `helpdesk.demo.db.v1` e `helpdesk.demo.session.v1`), simulando latência de rede.
- A interface exibe o selo **“Modo demonstração”** no cabeçalho e a caixa de acesso rápido no login. Nenhum dado fictício se mistura com o modo real.
- A sessão da demonstração dura enquanto a aba estiver aberta; limpar o `sessionStorage` restaura os dados originais.
- Os chamados abertos do seed nascem sem urgência (“A definir”); bases antigas salvas no `sessionStorage` são normalizadas automaticamente ao carregar.

### Contas de demonstração

| Perfil | Usuário | Senha |
|---|---|---|
| Solicitante | `ana.souza@demo.local` (ou `ana.souza`) | `demo1234` |
| Técnico | `carlos.lima@demo.local` (ou `carlos.lima`) | `demo1234` |

Existem também `marina.alves` (técnica) e `joao.pereira` (solicitante), com a mesma senha. Os botões de acesso rápido preenchem as credenciais de Ana e Carlos.

Sugestão de roteiro: entre como **Ana**, abra um chamado e acompanhe “Meus chamados”; saia e entre como **Carlos**, assuma o chamado pelo Kanban definindo a urgência, comente internamente e use “Solicitar confirmação” com a solução proposta. Volte como **Ana**, abra o chamado pendente e confirme a resolução; repita o fluxo rejeitando a solução para ver o retorno ao atendimento. Carlos também pode abrir um chamado e usar o filtro “Meus chamados”.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Pré-visualização do build |
| `npm test` | Vitest em modo watch |
| `npm run test:run` | Executa a suíte uma vez (CI) |

---

## Estrutura de pastas

```text
src/
├── app/
│   ├── App.jsx              # Providers (Router, Toast, Auth)
│   └── router.jsx           # Rotas, guards de sessão e perfil
├── components/
│   ├── layout/              # AppLayout, Sidebar, Header, UserMenu, PageHeader
│   ├── ui/                  # Button, Input, Select, Textarea, Badge, Modal,
│   │                        # EmptyState, Avatar, Spinner
│   ├── feedback/            # LoadingState, ErrorState, Toaster
│   └── tickets/             # TicketTable, TicketCard, TicketFilters, TicketForm,
│                            # UrgencySelector, KanbanBoard, TicketActions,
│                            # AssignTicketModal, ResolveTicketModal,
│                            # ConfirmResolutionModal, TicketComments,
│                            # TicketTimeline, badges
├── contexts/
│   ├── AuthContext.jsx      # Sessão, login, logout, 401
│   └── ToastContext.jsx     # Notificações visuais
├── hooks/                   # useTickets, useTicketDetail, useCategories,
│                            # useDebouncedValue, useAuth
├── pages/                   # Login, lista, criação, detalhe,
│                            # Kanban, perfil, 403 e 404
├── services/
│   ├── api.js               # Axios, cookies, CSRF, evento 401
│   ├── apiError.js          # Normalização de erros HTTP
│   ├── normalizers.js       # Adaptação de respostas da API
│   ├── authService.js
│   ├── ticketService.js
│   ├── commentService.js
│   ├── historyService.js
│   ├── categoryService.js
│   └── demo/                # Backend simulado + seed (isolados do modo real)
├── styles/                  # tokens, global, utilities
├── utils/                   # constantes, formatadores, permissões, erros, env
├── test/setup.js
└── main.jsx
```

Cada domínio concentra seu CSS junto aos componentes (`ui.css`, `layout.css`, `tickets.css`, `pages.css`, `feedback.css`), sempre usando os tokens de `styles/tokens.css`.

---

## Rotas e controle de acesso

| Rota | Página | Perfis |
|---|---|---|
| `/login` | Login | Público (redireciona autenticados) |
| `/` | Redireciona para `/chamados` | Autenticado |
| `/chamados` | Lista de chamados (tela principal) | Ambos (escopo definido pela API) |
| `/chamados/novo` | Abertura de chamado | Ambos |
| `/chamados/:id` | Detalhe do chamado | Ambos, conforme autorização da API |
| `/kanban` | Quadro Kanban com drag and drop | `TECNICO` |
| `/perfil` | Meu perfil | Ambos |
| `/403` | Acesso negado | Ambos |
| `*` | Página não encontrada | Ambos |

- As rotas antigas `/painel`, `/suporte` e `/meus-atendimentos` foram removidas.
- Rotas protegidas redirecionam usuários não autenticados para `/login`, preservando o destino.
- Rotas de perfil incompatível redirecionam para `/403`.
- Em `401`, a sessão local é encerrada e o login informa que a sessão expirou.
- O papel do usuário vem **exclusivamente** de `GET /auth/me/` (ou do retorno do login), nunca de URL ou campo editável.
- A navegação final do técnico é “Todos os chamados”, “Kanban”, “Abrir chamado”, “Meu perfil” e “Sair”; a do solicitante é “Meus chamados”, “Abrir chamado”, “Meu perfil” e “Sair”.

---

## Perfis e permissões na interface

As ações são derivadas em `src/utils/ticketPermissions.js` e apenas **refletem** a autorização do backend.

| Ação | Solicitante | Técnico responsável | Outro técnico |
|---|---|---|---|
| Ver próprios chamados | Sim | — | — |
| Ver chamados autorizados | — | Sim | Sim |
| Abrir chamado | Sim | Sim | Sim |
| Assumir chamado aberto sem responsável | Não | Sim | Sim |
| Definir urgência (somente na assunção) | Não | Sim | Sim |
| Mover no Kanban para etapa válida | Não | Sim | Não |
| Pausar (`EM_ATENDIMENTO` → `AGUARDANDO_SOLICITANTE`) | Não | Sim | Não |
| Retomar (`AGUARDANDO_SOLICITANTE` → `EM_ATENDIMENTO`) | Não | Sim | Não |
| Solicitar confirmação (`EM_ATENDIMENTO` → `AGUARDANDO_SOLICITANTE`) | Não | Sim | Não |
| Confirmar ou rejeitar a resolução pendente | Somente o proprietário | Não | Não |
| Reabrir chamado resolvido | Não | Não | Não |
| Comentários internos | Não | Sim | Sim |
| Histórico de auditoria | Próprios chamados, eventos seguros | Sim | Sim |

---

## Contrato da API

O contrato abaixo foi validado contra o backend Django deste repositório. A adaptação de respostas continua isolada em `src/services/` e `normalizers.js`.

### Autenticação (sessão + CSRF)

| Método | Endpoint | Observação |
|---|---|---|
| `GET` | `/auth/csrf/` | Opcional; garante o cookie `csrftoken`. Falha é ignorada no login. |
| `POST` | `/auth/login/` | Corpo `{ "username": "...", "password": "..." }`; retorna o usuário ou ele é obtido via `/auth/me/`. |
| `GET` | `/auth/me/` | Retorna o usuário autenticado com `role`. |
| `POST` | `/auth/logout/` | Encerra a sessão no servidor. |

- Cookies de sessão são enviados com `withCredentials: true`.
- Em métodos de escrita, o token do cookie `csrftoken` é enviado no header `X-CSRFToken`.
- Não há token em `localStorage`.

### Chamados

| Método | Endpoint | Corpo / Parâmetros |
|---|---|---|
| `GET` | `/tickets/` | `search`, `status`, `urgency`, `category`, `assignee` (`me` ou id), `requester`, `mine`, `ordering`, `page`, `page_size` |
| `POST` | `/tickets/` | `{ title, description, category }`; disponível para ambos os perfis; a urgência nasce nula |
| `GET` | `/tickets/{id}/` | — |
| `POST` | `/tickets/{id}/assign/` | `{ "urgency": "ALTA" }` |
| `POST` | `/tickets/{id}/transition/` | `{ "status": "AGUARDANDO_SOLICITANTE" }` |
| `POST` | `/tickets/{id}/resolve/` | `{ "resolution": "..." }` (solicita confirmação) |
| `POST` | `/tickets/{id}/confirm-resolution/` | `{ "resolved": true }` ou `{ "resolved": false }` |
| `GET` | `/tickets/{id}/comments/` | Comentários internos |
| `POST` | `/tickets/{id}/comments/` | `{ "content": "..." }` |
| `GET` | `/tickets/{id}/history/` | Eventos de auditoria |
| `GET` | `/categories/` | Lista de categorias controladas |

`mine=true` é enviado ao backend e combinado com os demais filtros; o frontend
não filtra a lista localmente.

Listas aceitam **array puro** ou paginação DRF (`{ count, next, previous, results }`).

### Formato de chamado esperado (com aliases aceitos)

```json
{
  "id": 101,
  "code": "HD-0101",
  "title": "Erro ao acessar o ERP",
  "description": "Descrição completa...",
  "status": "ABERTO",
  "urgency": null,
  "category": { "id": 1, "slug": "ti", "name": "TI" },
  "requester": { "id": 1, "name": "Ana Souza", "email": "ana@empresa.com", "role": "SOLICITANTE" },
  "assignee": null,
  "created_at": "2026-10-20T10:00:00Z",
  "updated_at": "2026-10-20T10:00:00Z",
  "resolved_at": null,
  "resolution": null
}
```

O normalizador aceita variações comuns: `assigned_to`/`technician`/`assignee_user` para responsável, `created_by`/`requester_user` para solicitante, `priority` para urgência, `protocol`/`number` para código, entre outras. Ainda assim, o contrato real deve ser confirmado.

Formatos de comentário (`author`, `content`, `created_at`) e de evento (`event_type`, `actor`, `description`, `from_status`, `to_status`, `created_at`) seguem a mesma lógica de normalização. Tipos de evento reconhecidos: `CREATED`, `ASSIGNED`, `URGENCY_CHANGED`, `STATUS_CHANGED`, `CONFIRMATION_REQUESTED`, `REQUESTER_CONFIRMED`, `REQUESTER_REJECTED`, `RETURNED_TO_SERVICE`, `RESOLVED_BY_REQUESTER` e `RESOLVED` (legado).

---

## Regras de negócio refletidas na UI

1. Chamados novos começam em `ABERTO`, sem responsável e sem urgência (`urgency: null`, exibida como “A definir”); solicitante, data e status inicial não são editáveis. Solicitantes e técnicos podem abrir chamados, e o `requester` é sempre o usuário autenticado.
2. Apenas técnicos veem ações de assumir, mover, pausar, retomar e solicitar confirmação.
3. Só é possível assumir chamado `ABERTO` sem responsável. A urgência é definida exclusivamente nesse momento, pelo modal ou pelo drag and drop no Kanban; o backend atualiza responsável, urgência e status (`EM_ATENDIMENTO`) atomicamente.
4. Transições operacionais são exclusivas do técnico responsável:
   - `EM_ATENDIMENTO` → `AGUARDANDO_SOLICITANTE` (pausa ou solicitação de confirmação);
   - `AGUARDANDO_SOLICITANTE` → `EM_ATENDIMENTO` (retomada).
5. “Resolver” significa **solicitar confirmação**: o técnico descreve a solução (10+ caracteres) e o chamado fica em `AGUARDANDO_SOLICITANTE`.
6. O solicitante proprietário confirma ou rejeita a solução:
   - confirmação positiva → `RESOLVIDO` + `resolved_at`;
   - rejeição → `EM_ATENDIMENTO`, mantendo o técnico responsável e limpando a solução proposta.
7. `RESOLVIDO` é terminal; a interface não oferece reabertura nem uma segunda confirmação.
8. O filtro “Meus chamados” envia `mine=true` ao backend; para técnicos, retorna os chamados atribuídos a eles. O toggle é combinável com busca, status, urgência, categoria e responsável.
9. O Kanban valida os destinos antes de chamar o backend: `ABERTO → EM_ATENDIMENTO` abre o modal de urgência; pausar/retomar usam a rota de transição; destinos inválidos exibem aviso inline e toast. No mobile, as mesmas ações aparecem em botões explícitos.
10. Solicitantes não veem comentários internos; o histórico exposto a eles contém apenas eventos seguros dos próprios chamados.
11. Nenhuma ação crítica é aplicada de forma otimista: a tela só muda após a confirmação do servidor; em conflito (`409`), os dados são recarregados.
12. O backend continua sendo a autoridade final de autorização e validação; o frontend nunca filtra chamados por conta própria para impor escopo de acesso.

---

## Estados de interface e erros

Toda tela que consome dados trata:

- carregamento inicial;
- carregamento durante ação (botões com spinner e bloqueio);
- sucesso com dados;
- lista vazia contextual (com ou sem filtros);
- erro recuperável com ação “Tentar novamente”;
- falha de conexão com mensagem específica;
- sessão expirada (`401`);
- acesso negado (`403`);
- recurso não encontrado (`404`);
- conflito de concorrência (`409`), com recarga do quadro;
- destino inválido no Kanban, com aviso inline, toast e retorno visual do cartão;
- confirmação pendente do solicitante, destacada na listagem e no detalhe.

Erros são normalizados em `src/services/apiError.js` e traduzidos em `src/utils/errorMessages.js`. Notificações usam toasts acessíveis (sem `alert()` nativo). Confirmações críticas usam modal com foco preso e fechamento por `Esc`.

---

## Testes

```bash
npm run test:run
```

Cobertura atual: **51 testes em 13 arquivos**, todos passando.

| Arquivo | Foco |
|---|---|
| `src/utils/formatters.test.js` | Código do chamado, rótulos, nomes e iniciais |
| `src/utils/ticketPermissions.test.js` | Regras de perfil, responsável, confirmação e estado terminal |
| `src/components/layout/Sidebar.test.jsx` | Navegação final de solicitante e técnico, sem rotas removidas |
| `src/components/tickets/Badges.test.jsx` | Status/urgência por texto, “A definir” e fallback |
| `src/services/demo/demoSeed.test.js` | Chamados abertos sem urgência no seed e normalização de dados antigos |
| `src/components/tickets/TicketForm.test.jsx` | Validação obrigatória, envio válido e contador |
| `src/components/tickets/TicketComments.test.jsx` | Listagem, validação, envio, erro preservando texto |
| `src/components/tickets/KanbanBoard.test.jsx` | Quatro colunas, contagens, destinos válidos, bloqueio de drop e visão do solicitante |
| `src/components/tickets/AssignTicketModal.test.jsx` | Código, título e envio da urgência escolhida |
| `src/components/tickets/ConfirmResolutionModal.test.jsx` | Confirmação positiva e negativa |
| `src/components/tickets/TicketActions.test.jsx` | Ações por perfil, solicitação e confirmação de resolução |
| `src/pages/TicketListPage.test.jsx` | Títulos por perfil e filtro `mine` combinado com os demais |
| `src/app/router.test.jsx` | Rotas finais por perfil e ausência das rotas antigas |

Os testes priorizam comportamento observável (papéis, rótulos e textos), sem acoplar à implementação interna. O fluxo completo também é validado por dois roteiros Playwright contra backend e frontend reais (DnD, modais, confirmação/rejeição, mobile e auditoria).

---

## Acessibilidade e responsividade

- HTML semântico (`header`, `nav`, `main`, `section`, `table` com `caption`), skip link e foco visível.
- Campos com `label` associado, erros textuais ligados por `aria-describedby`/`aria-invalid`.
- Status e urgência comunicados por texto e ícone, não só por cor.
- Modal com `role="dialog"`, `aria-modal`, foco inicial, ciclo de Tab e restauração de foco.
- Toasts em região `aria-live`; carregamentos com `role="status"`.
- `prefers-reduced-motion` respeitado globalmente.
- Drag and drop com `PointerSensor` e `KeyboardSensor`; cada cartão tem uma alça com nome acessível (“Mover chamado HD-XXXX”), e o destino válido é destacado visualmente.
- No mobile, o Kanban mantém as quatro colunas com rolagem horizontal e oferece as transições em botões explícitos, sem depender do arraste.
- Layout responsivo: sidebar recolhível no desktop e menu móvel com backdrop; tabela com rolagem e colunas secundárias ocultas em telas estreitas.

---

## Segurança

- Autenticação baseada em cookie de sessão + CSRF; nenhum token sensível é guardado no navegador.
- O perfil usado para renderizar a navegação vem do backend, não de estado manipulável persistido.
- Permissões de UI são conveniência de experiência; toda operação deve ser reautorizada no Django.
- O modo demonstração é opt-in por variável de ambiente, usa dados fictícios e nunca faz chamadas à API real.
- Mensagens de erro não expõem stack traces nem detalhes internos do servidor.
- Para produção, o backend deve configurar CORS restrito, `SameSite`/`Secure` nos cookies, `CSRF_TRUSTED_ORIGINS` e HTTPS.

---

## Integração com o backend

O frontend foi validado contra a API Django deste repositório em navegador real, incluindo os fluxos de DnD, modais, confirmação/rejeição, mobile e auditoria. O contrato está documentado em [Contrato da API](#contrato-da-api).

- **Autenticação:** sessão por cookie + CSRF, sem token em `localStorage`.
- **Campos do chamado:** `code`, categoria aninhada, `requester`/`assignee`, datas, `resolution` e `resolved_at`; os normalizadores mantêm aliases para tolerância.
- **Filtros e ordenação:** `search`, `status`, `urgency`, `category`, `assignee`, `requester`, `mine`, `ordering`, `page` e `page_size`.
- **Ações:** `POST /tickets/` não recebe urgência; `assign` recebe `{ urgency }`; `transition` recebe `{ status }`; `resolve` recebe `{ resolution }` e solicita confirmação; `confirm-resolution` recebe `{ resolved }`.
- **Concorrência:** conflitos de estado/atribuição retornam `409`; o frontend recarrega os dados e informa o usuário.
- **Comentários e histórico:** a API restringe comentários internos a técnicos e expõe ao solicitante apenas eventos seguros dos próprios chamados.
- **Categorias:** `GET /categories/` lista as categorias e `POST /tickets/` aceita o `id` da categoria.
- **Erros:** formato DRF (`detail`, erros por campo e `non_field_errors`).
- **Kanban:** carrega até 200 chamados por consulta. Para bases maiores, avaliar paginação por coluna ou carregamento incremental.
- **Atualização em tempo real:** não há WebSocket/polling; a consistência depende de recarregar após ações e tratar `409`.
- **Fallback de SPA:** o servidor de produção deve redirecionar rotas desconhecidas para `index.html`.
- **Proxy de desenvolvimento (opcional):** se o backend não liberar CORS em dev, adicionar `server.proxy` no `vite.config.js` e ajustar `VITE_API_BASE_URL`.

---

## Fora do escopo do MVP

- Cadastro público de usuários.
- Administração de categorias, usuários ou relatórios avançados.
- Comentários públicos (somente comentários internos para técnicos).
- Edição ou exclusão de comentários.
- Reabertura de chamados resolvidos.
- Confirmação automática da resolução ou encerramento sem resposta do solicitante.
- Anexos, notificações por e-mail e integrações externas.
- Edição de dados do perfil.

---

## Licença

Projeto pessoal para fins de demonstração de competências Full Stack. Sem licença definida.
