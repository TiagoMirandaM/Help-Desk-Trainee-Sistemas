# Helpdesk — Backend Django REST Framework

API REST do MVP de Helpdesk (gestão de chamados). O frontend React deste repositório
consome esta API em `http://localhost:8000/api`.

O backend implementa autenticação por sessão do Django com CSRF, perfis
`SOLICITANTE` e `TECNICO`, abertura e acompanhamento de chamados, atribuição
atômica com definição de urgência, transições de status controladas, solicitação
de confirmação ao solicitante, confirmação/rejeição da solução proposta,
comentários internos e histórico de auditoria imutável pela API.

---

## Sumário

- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Decisões de projeto](#decisões-de-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração e execução](#configuração-e-execução)
- [Banco de dados PostgreSQL](#banco-de-dados-postgresql)
- [Primeiro técnico e usuários de demonstração](#primeiro-técnico-e-usuários-de-demonstração)
- [Documentação da API](#documentação-da-api)
- [Autenticação e CSRF](#autenticação-e-csrf)
- [Perfis e permissões](#perfis-e-permissões)
- [Endpoints](#endpoints)
- [Contrato dos chamados](#contrato-dos-chamados)
- [Fluxo de status](#fluxo-de-status)
- [Comentários internos](#comentários-internos)
- [Histórico de auditoria](#histórico-de-auditoria)
- [Filtros, busca e paginação](#filtros-busca-e-paginação)
- [Erros](#erros)
- [Integração com o frontend React](#integração-com-o-frontend-react)
- [Testes](#testes)
- [Qualidade e segurança](#qualidade-e-segurança)
- [Fora do escopo](#fora-do-escopo)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Stack

| Tecnologia | Uso |
|---|---|
| Python 3.12 | Linguagem |
| Django 5.2 | Framework web, ORM, autenticação e admin |
| Django REST Framework 3.16 | API REST |
| PostgreSQL | Banco principal (SQLite opcional para execução local) |
| `django-filter` | Filtros de chamados |
| `drf-spectacular` | OpenAPI 3 e Swagger/Redoc |
| `django-cors-headers` | CORS para o frontend React |
| `python-dotenv` | Variáveis de ambiente via `.env` |
| pytest + pytest-django | Testes automatizados |
| Ruff | Lint e formatação |

---

## Arquitetura

```text
BackEnd/
├── manage.py
├── config/
│   ├── settings.py          # Configuração por variáveis de ambiente
│   ├── settings_test.py     # SQLite em memória para a suíte de testes
│   ├── urls.py              # Rotas /api/ e documentação
│   ├── pagination.py        # Paginação padrão (20, máximo 200)
│   ├── exceptions.py        # Normalização de erros para {"detail": ...}
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── accounts/
│   │   ├── models.py        # User customizado com role
│   │   ├── authentication.py# Sessão com resposta 401
│   │   ├── serializers.py
│   │   ├── views.py         # csrf, login, logout, me
│   │   ├── permissions.py   # IsTechnician / IsRequester
│   │   ├── schema.py        # Esquema OpenAPI da sessão
│   │   └── management/commands/
│   │       ├── create_technician.py
│   │       └── seed_demo.py
│   ├── categories/
│   │   ├── models.py        # Category
│   │   └── views.py         # GET /api/categories/
│   └── tickets/
│       ├── models.py        # Ticket, TicketComment, TicketHistory
│       ├── services.py      # Regras de negócio transacionais
│       ├── serializers.py
│       ├── filters.py
│       ├── views.py
│       ├── exceptions.py    # Conflict (HTTP 409)
│       └── tests/
├── conftest.py              # Fixtures compartilhadas
├── scripts/smoke_test.py    # Fluxo HTTP completo contra o servidor local
├── requirements.txt
├── pytest.ini
├── pyproject.toml
├── .env.example
└── README.md
```

Comentários e auditoria ficam no domínio `tickets` porque compartilham o ciclo de
vida do chamado; não há apps separados sem necessidade real.

As regras de atribuição, transição, solicitação de confirmação e
confirmação/rejeição ficam centralizadas em `apps/tickets/services.py`. Views e
serializers apenas validam entrada, aplicam permissões e chamam os serviços.

---

## Decisões de projeto

1. **Autenticação por sessão do Django + CSRF**, sem JWT. O frontend já usa
   `withCredentials: true` e envia `X-CSRFToken`; não há token em `localStorage`.
2. **Usuário customizado desde a primeira migration**, com `role` explícito.
   A role vem do banco e nunca de payload do cliente.
3. **Categorias no banco**, com seed opcional para TI, Infraestrutura e Financeiro.
4. **Operações críticas transacionais** com `transaction.atomic()` e
   `select_for_update()` na atribuição, transição, solicitação de confirmação e
   confirmação/rejeição do solicitante.
5. **Histórico gravado na mesma transação** da operação correspondente.
6. **Respostas de erro previsíveis**: validações por campo no padrão DRF e erros
   simples como `{"detail": "..."}`.
7. **Paginação DRF** em listas de chamados, comentários e histórico; categorias
   são uma lista simples (poucas opções).
8. **Sem endpoints de edição/exclusão** de chamados, comentários ou histórico no MVP.
9. **Resolução colaborativa**: o técnico propõe a solução, mas o chamado só é
   encerrado após a confirmação positiva do solicitante proprietário.
10. **Abertura compartilhada**: solicitantes e técnicos podem abrir chamados; o
    `requester` é sempre o usuário autenticado e o chamado nasce `ABERTO` sem
    responsável.

---

## Pré-requisitos

- Python 3.12+
- PostgreSQL 14+ (ou SQLite para execução local rápida)
- pip

---

## Configuração e execução

### 1. Ambiente virtual e dependências

```powershell
cd "C:\Faculdade\Commit\Trainee MVP\BackEnd"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Linux/macOS:

```bash
cd BackEnd
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Variáveis de ambiente

```powershell
Copy-Item .env.example .env
```

Edite o `.env`. O projeto já inclui um `.env` local com `DB_ENGINE=sqlite`
para rodar imediatamente sem instalar PostgreSQL. O padrão de `config/settings.py`
(sem `DB_ENGINE`) é PostgreSQL.

Principais variáveis:

| Variável | Padrão | Descrição |
|---|---|---|
| `DJANGO_SECRET_KEY` | valor inseguro de dev | Chave secreta; obrigatória em produção |
| `DJANGO_DEBUG` | `true` | Desative em produção |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts permitidos, separados por vírgula |
| `DB_ENGINE` | `postgresql` | `postgresql` ou `sqlite` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `helpdesk` / `helpdesk` / vazio | Conexão PostgreSQL |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Conexão PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,...` | Origens explícitas do React |
| `CSRF_TRUSTED_ORIGINS` | mesmas origens | Origens confiáveis para CSRF |
| `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | `false` em dev | Use `true` com HTTPS |
| `SESSION_COOKIE_SAMESITE` / `CSRF_COOKIE_SAMESITE` | `Lax` | Ajuste conforme o domínio do frontend |

Nunca versione o `.env`. O `.gitignore` já o exclui.

### 3. Migrations e execução

```powershell
python manage.py migrate
python manage.py create_technician --username carlos.lima --email carlos.lima@empresa.com
python manage.py runserver
```

A migration `apps/tickets/migrations/0002_alter_tickethistory_event_type.py`
amplia os tipos de evento de auditoria usados pelo fluxo de confirmação
(`URGENCY_CHANGED`, `CONFIRMATION_REQUESTED`, `REQUESTER_CONFIRMED`,
`REQUESTER_REJECTED`, `RETURNED_TO_SERVICE` e `RESOLVED_BY_REQUESTER`).

As migrations `0003_alter_ticket_urgency.py` e
`0004_normalize_open_ticket_urgency.py` tornam a urgência opcional e limpam
urgências antigas de chamados ainda `ABERTO`. Esses chamados passam a exibir
“A definir” até a assunção pelo técnico.

Acesse:

- API: `http://localhost:8000/api/`
- Swagger: `http://localhost:8000/api/docs/`
- Schema OpenAPI: `http://localhost:8000/api/schema/`
- Admin: `http://localhost:8000/admin/`

Para criar um superusuário do admin:

```powershell
python manage.py createsuperuser
```

---

## Banco de dados PostgreSQL

Crie o usuário e o banco (exemplo):

```sql
CREATE USER helpdesk WITH PASSWORD 'troque-esta-senha';
CREATE DATABASE helpdesk OWNER helpdesk;
```

No `.env`:

```env
DB_ENGINE=postgresql
DB_NAME=helpdesk
DB_USER=helpdesk
DB_PASSWORD=troque-esta-senha
DB_HOST=localhost
DB_PORT=5432
```

Depois:

```powershell
python manage.py migrate
```

Para execução local rápida sem PostgreSQL:

```env
DB_ENGINE=sqlite
SQLITE_NAME=db.sqlite3
```

A suíte de testes usa SQLite em memória (`config/settings_test.py`) e não
depende de PostgreSQL. O teste real de concorrência é executado apenas no
PostgreSQL (veja [Testes](#testes)).

---

## Primeiro técnico e usuários de demonstração

Criar um técnico (a senha é solicitada se `--password` for omitido):

```powershell
python manage.py create_technician --username carlos.lima --email carlos.lima@empresa.com
```

Também é possível criar pelo Django Admin: crie o usuário e defina o campo
**Perfil de negócio** como **Técnico**.

Dados fictícios explícitos para demonstração local:

```powershell
python manage.py seed_demo
```

| Perfil | Usuário | Senha |
|---|---|---|
| Solicitante | `ana.souza` / `ana.souza@demo.local` | `demo1234` |
| Solicitante | `joao.pereira` | `demo1234` |
| Técnico | `carlos.lima` | `demo1234` |
| Técnico | `marina.alves` | `demo1234` |

O comando também cria as categorias TI, Infraestrutura e Financeiro. Ele é
**explícito** e não roda automaticamente em produção.

Smoke test HTTP (com o servidor rodando):

```powershell
python scripts/smoke_test.py
```

O script executa login, abertura de chamado, atribuição com urgência,
comentário interno, pausa/retomada, solicitação de confirmação, confirmação do
solicitante e consulta do histórico final.

---

## Documentação da API

- `/api/schema/` — OpenAPI 3 (YAML por padrão; use `?format=json` ou
  `Accept: application/json` para JSON)
- `/api/docs/` — Swagger UI
- `/api/redoc/` — Redoc

A documentação é gerada a partir dos serializers, views e permissões reais.
O esquema de autenticação `sessionAuth` documenta o cookie `sessionid` e o
header `X-CSRFToken`.

---

## Autenticação e CSRF

Fluxo usado pelo frontend:

1. `GET /api/auth/csrf/` define o cookie `csrftoken`.
2. `POST /api/auth/login/` com `{"username": "...", "password": "..."}`.
   O campo `username` aceita username ou e-mail.
3. O servidor cria a sessão (`sessionid`) e retorna `{"user": {...}}`.
4. Requisições de escrita enviam `X-CSRFToken` com o valor do cookie `csrftoken`.
5. `POST /api/auth/logout/` encerra a sessão.
6. `GET /api/auth/me/` retorna o usuário autenticado.

Cookies usados:

- `sessionid`: `HttpOnly`, `SameSite=Lax` por padrão;
- `csrftoken`: legível pelo JavaScript (necessário para o header).

Em produção, use HTTPS e `SESSION_COOKIE_SECURE=true` /
`CSRF_COOKIE_SECURE=true`. Se o frontend estiver em outro site (não apenas outra
porta do mesmo host), avalie `SameSite=None` com `Secure`.

### Exemplo com curl

```bash
curl -c cookies.txt http://localhost:8000/api/auth/csrf/

TOKEN=$(grep csrftoken cookies.txt | awk '{print $7}')

curl -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $TOKEN" \
  -d '{"username":"carlos.lima","password":"demo1234"}' \
  http://localhost:8000/api/auth/login/

curl -b cookies.txt http://localhost:8000/api/auth/me/
```

---

## Perfis e permissões

| Ação | Solicitante | Técnico |
|---|---|---|
| Abrir chamado | Sim | Sim |
| Ver próprios chamados | Sim | — |
| Ver fila de chamados | Não | Sim |
| Consultar chamado autorizado | Apenas os próprios | Sim |
| Assumir chamado `ABERTO` sem responsável | Não | Sim |
| Definir a urgência na assunção | Não | Sim |
| Alterar status operacional | Não | Somente o responsável |
| Solicitar confirmação da resolução | Não | Somente o responsável |
| Confirmar ou rejeitar a resolução | Somente o proprietário | Não |
| Comentários internos | Não | Sim |
| Histórico de auditoria | Próprios chamados, eventos seguros | Sim |
| Alterar a própria role | Não | Não |

- A autorização é aplicada no backend em todas as rotas e por objeto.
- Solicitante que tenta acessar chamado de terceiro recebe `404` (reduz a
  exposição da existência do registro).
- Técnico que tenta operar chamado de outro técnico recebe `403`.
- Técnico que abre um chamado é o `requester`; o chamado continua sem
  responsável até que alguém o assuma.
- A confirmação da resolução é exclusiva do solicitante proprietário e só é
  aceita em `AGUARDANDO_SOLICITANTE`.
- Não há endpoint para alterar `role`, `status`, `assignee`, `requester`,
  datas ou resolução por edição genérica.

---

## Endpoints

Todas as rotas de negócio usam o prefixo `/api/`.

| Método | Endpoint | Perfil | Finalidade |
|---|---|---|---|
| `GET` | `/api/auth/csrf/` | Público | Definir cookie CSRF |
| `POST` | `/api/auth/login/` | Público | Autenticar |
| `POST` | `/api/auth/logout/` | Autenticado | Encerrar sessão |
| `GET` | `/api/auth/me/` | Autenticado | Usuário atual |
| `GET` | `/api/categories/` | Autenticado | Categorias ativas |
| `GET` | `/api/tickets/` | Autenticado | Listar chamados autorizados |
| `POST` | `/api/tickets/` | Solicitante ou técnico | Abrir chamado |
| `GET` | `/api/tickets/{id}/` | Autenticado | Detalhar chamado autorizado |
| `POST` | `/api/tickets/{id}/assign/` | Técnico | Assumir chamado e definir urgência |
| `POST` | `/api/tickets/{id}/transition/` | Técnico responsável | Alterar status operacional |
| `POST` | `/api/tickets/{id}/resolve/` | Técnico responsável | Propor solução e solicitar confirmação |
| `POST` | `/api/tickets/{id}/confirm-resolution/` | Solicitante proprietário | Confirmar ou rejeitar a solução |
| `GET` | `/api/tickets/{id}/comments/` | Técnico | Listar comentários internos |
| `POST` | `/api/tickets/{id}/comments/` | Técnico | Criar comentário interno |
| `GET` | `/api/tickets/{id}/history/` | Autenticado | Histórico de auditoria |

Não existem endpoints de `PUT`, `PATCH` ou `DELETE` para chamados, comentários
ou histórico no MVP. Tentativas retornam `405 Method Not Allowed`.

### Payloads

Abrir chamado:

```json
{
  "title": "Erro ao acessar o ERP",
  "description": "O usuário relata erro ao abrir o módulo financeiro do ERP.",
  "category": 1
}
```

`category` é o `id` de uma categoria ativa. O chamado nasce com `urgency: null`;
a urgência (`BAIXA`, `MEDIA` ou `ALTA`) é definida exclusivamente na assunção
pelo técnico. Campos como `urgency`, `status`, `requester`, `assignee`,
`resolved_at` e `resolution` são ignorados se enviados na abertura. O
`requester` é sempre o usuário autenticado, inclusive quando um técnico abre o
chamado.

Assumir chamado:

```json
{
  "urgency": "ALTA"
}
```

`urgency` é obrigatória. Em uma única transação, o técnico autenticado vira
responsável, a urgência é atualizada e o status passa para `EM_ATENDIMENTO`.
Chamado já assumido ou fora de `ABERTO` retorna `409`.

Transição:

```json
{
  "status": "AGUARDANDO_SOLICITANTE"
}
```

Transições operacionais permitidas: `EM_ATENDIMENTO` ↔
`AGUARDANDO_SOLICITANTE`. `RESOLVIDO` não é aceito nesta rota.

Solicitar confirmação (antiga “resolução”):

```json
{
  "resolution": "Ajuste realizado e funcionamento validado."
}
```

A solução deve ter pelo menos 10 caracteres. O chamado vai para
`AGUARDANDO_SOLICITANTE`, a solução fica registrada para o solicitante e
`resolved_at` permanece nulo. A conclusão depende da confirmação.

Confirmação do solicitante:

```json
{
  "resolved": true
}
```

- `true`: chamado vai para `RESOLVIDO`, preenche `resolved_at` e registra a
  confirmação;
- `false`: chamado volta para `EM_ATENDIMENTO`, mantém o técnico responsável,
  limpa a solução proposta e registra a rejeição/retorno.

Comentário:

```json
{
  "content": "Solicitada confirmação do comportamento ao usuário."
}
```

---

## Contrato dos chamados

Resposta de `GET /api/tickets/{id}/`:

```json
{
  "id": 1,
  "code": "HD-0001",
  "title": "Erro ao acessar o ERP",
  "description": "O usuário relata erro ao abrir o módulo financeiro do ERP.",
  "category": {
    "id": 1,
    "name": "TI",
    "slug": "ti"
  },
  "urgency": null,
  "status": "ABERTO",
  "requester": {
    "id": 1,
    "username": "ana.souza",
    "name": "Ana Souza",
    "role": "SOLICITANTE"
  },
  "assignee": null,
  "created_at": "2026-10-29T17:00:00Z",
  "updated_at": "2026-10-29T17:00:00Z",
  "resolved_at": null,
  "resolution": ""
}
```

O campo `code` é derivado do `id` (`HD-0001`, `HD-0002`, ...). A resposta de
listagem usa a paginação padrão do DRF:

```json
{
  "count": 25,
  "next": "http://localhost:8000/api/tickets/?page=2",
  "previous": null,
  "results": []
}
```

Usuários dentro de chamados são representados por `id`, `username`, `name` e
`role` (sem e-mail, para reduzir exposição). O endpoint `/api/auth/me/` inclui
e-mail e dados completos do próprio usuário.

---

## Fluxo de status

```text
ABERTO
  └── assign (urgência obrigatória) ──> EM_ATENDIMENTO
                                           ├── transition ──> AGUARDANDO_SOLICITANTE
                                           ├── resolve ─────> AGUARDANDO_SOLICITANTE
                                           └── transition <── AGUARDANDO_SOLICITANTE

AGUARDANDO_SOLICITANTE
  ├── confirm-resolution {resolved: true}  ──> RESOLVIDO (terminal)
  └── confirm-resolution {resolved: false} ──> EM_ATENDIMENTO
```

| Status atual | Próximo | Condição |
|---|---|---|
| `ABERTO` | `EM_ATENDIMENTO` | Somente por `assign`, com urgência |
| `EM_ATENDIMENTO` | `AGUARDANDO_SOLICITANTE` | Técnico responsável, por `transition` ou `resolve` |
| `AGUARDANDO_SOLICITANTE` | `EM_ATENDIMENTO` | Técnico responsável (`transition`) ou solicitante rejeitando (`confirm-resolution` com `false`) |
| `AGUARDANDO_SOLICITANTE` | `RESOLVIDO` | Solicitante proprietário confirmando (`confirm-resolution` com `true`) |
| `RESOLVIDO` | — | Estado terminal no MVP |

Regras aplicadas no backend:

- transições arbitrárias são rejeitadas;
- `ABERTO` só sai por `assign`, que atualiza responsável, urgência e status
  atomicamente;
- apenas o responsável altera o status operacional;
- `resolve` exige solução com 10+ caracteres, move para
  `AGUARDANDO_SOLICITANTE` e preserva a solução proposta;
- a transição direta pelo Kanban para `AGUARDANDO_SOLICITANTE` usa uma solução
  fallback quando não há texto, permitindo a confirmação posterior;
- somente o solicitante proprietário confirma ou rejeita, e somente em
  `AGUARDANDO_SOLICITANTE`;
- confirmação positiva preenche `resolved_at`; negativa limpa a solução e
  mantém o técnico responsável;
- `RESOLVIDO` é terminal: nova confirmação ou transição retorna `409`;
- `updated_at` é atualizado em toda operação válida;
- toda operação válida gera evento de auditoria na mesma transação;
- operação inválida não deixa alteração parcial.

Conflitos de estado/concorrência retornam `409 Conflict`; payload inválido
retorna `400 Bad Request`.

---

## Comentários internos

- Apenas técnicos podem listar e criar.
- O autor é sempre o usuário autenticado; o cliente não escolhe o autor.
- Comentários não são incluídos em respostas genéricas de chamados.
- Não há endpoints de edição ou exclusão.
- A listagem é cronológica e paginada.

Resposta:

```json
{
  "id": 10,
  "ticket": 1,
  "author": {
    "id": 3,
    "username": "carlos.lima",
    "name": "Carlos Lima",
    "role": "TECNICO"
  },
  "content": "Solicitada confirmação do comportamento ao usuário.",
  "created_at": "2026-10-29T18:00:00Z"
}
```

---

## Histórico de auditoria

Eventos registrados:

- `CREATED` — abertura do chamado;
- `ASSIGNED` — atribuição do responsável;
- `URGENCY_CHANGED` — urgência definida ou alterada na assunção;
- `STATUS_CHANGED` — mudança de status feita por `assign`, `transition` ou
  solicitação de confirmação;
- `CONFIRMATION_REQUESTED` — técnico propôs a solução e solicitou confirmação;
- `REQUESTER_CONFIRMED` — solicitante confirmou a solução;
- `RESOLVED_BY_REQUESTER` — encerramento efetivo por confirmação;
- `REQUESTER_REJECTED` — solicitante informou que o problema continua;
- `RETURNED_TO_SERVICE` — chamado devolvido ao atendimento após a rejeição.

Os fluxos de confirmação e rejeição registram os eventos específicos acima sem
duplicar um `STATUS_CHANGED` genérico. A solicitação de confirmação registra
`STATUS_CHANGED` e `CONFIRMATION_REQUESTED`, que representam a transição e o
pedido ao solicitante, respectivamente. O tipo legado `RESOLVED` permanece no
schema por compatibilidade, mas o encerramento atual usa
`RESOLVED_BY_REQUESTER`.

Cada evento contém `old_value`, `new_value`, `actor` e `created_at`. Para
compatibilidade com o frontend, a resposta também expõe `from_status` e
`to_status` derivados, além de uma `description` legível.

```json
{
  "id": 2,
  "ticket": 1,
  "actor": {
    "id": 3,
    "username": "carlos.lima",
    "name": "Carlos Lima",
    "role": "TECNICO"
  },
  "event_type": "STATUS_CHANGED",
  "old_value": "ABERTO",
  "new_value": "EM_ATENDIMENTO",
  "from_status": "ABERTO",
  "to_status": "EM_ATENDIMENTO",
  "description": "Status alterado de ABERTO para EM_ATENDIMENTO.",
  "created_at": "2026-10-29T18:00:00Z"
}
```

**Exposição ao solicitante:** o solicitante vê apenas o histórico dos próprios
chamados, com tipo de evento, status anterior/novo, ator (nome de exibição) e
datas. Comentários internos nunca aparecem no histórico. Técnicos veem o
histórico dos chamados autorizados. Não há endpoints de criação, edição ou
exclusão de eventos; no Django Admin o histórico é somente leitura.

---

## Filtros, busca e paginação

`GET /api/tickets/` aceita:

| Parâmetro | Exemplo | Descrição |
|---|---|---|
| `status` | `ABERTO` | Status exato |
| `urgency` | `ALTA` | Urgência exata (chamados sem assunção têm urgência nula) |
| `category` | `1` ou `ti` | ID ou slug da categoria |
| `assignee` | `me` ou `3` | Responsável |
| `requester` | `2` | Solicitante (aplicado apenas para técnicos) |
| `mine` | `true` | Chamados atribuídos ao técnico (ou próprios, para solicitante) |
| `search` | `ERP` ou `HD-0001` | Título, descrição, ID ou código |
| `ordering` | `-created_at` | `created_at`, `updated_at`, `id`, `urgency` (prefixo `-` para desc) |
| `page` | `2` | Página |
| `page_size` | `50` | Itens por página (máximo 200) |

Filtros nunca ampliam o escopo de acesso: um solicitante que envia
`?requester=outro_id` continua vendo apenas os próprios chamados.

A ordenação por `urgency` usa peso semântico (`A definir` < `BAIXA` < `MEDIA` <
`ALTA`), não ordem alfabética. Isso mantém as opções “Maior urgência” e “Menor
urgência” do frontend funcionando corretamente, com chamados ainda sem urgência
no início da ordem ascendente.

A paginação é a do DRF (`count`, `next`, `previous`, `results`). O frontend usa
`page_size=200` nos painéis e no Kanban; esse é o limite máximo.

---

## Erros

Formato de validação (padrão DRF):

```json
{
  "title": ["O título deve ter pelo menos 5 caracteres."],
  "category": ["Categoria inexistente ou inativa."]
}
```

Erros simples:

```json
{"detail": "Usuário ou senha inválidos."}
```

| Código | Uso |
|---|---|
| `200` | Consulta/operação concluída |
| `201` | Chamado ou comentário criado |
| `204` | Logout |
| `400` | Payload inválido, resolução curta, status inválido |
| `401` | Não autenticado ou credenciais inválidas |
| `403` | Perfil sem permissão ou técnico não responsável |
| `404` | Recurso inexistente ou fora do escopo |
| `405` | Método não permitido (edição/exclusão) |
| `409` | Conflito de estado/concorrência |
| `500` | Erro inesperado (sem detalhes sensíveis) |

---

## Integração com o frontend React

No `FrontEnd/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_DEMO_MODE=false
```

Reinicie o Vite após alterar. O backend libera CORS com credenciais para
`http://localhost:5173` e `http://127.0.0.1:5173` por padrão; ajuste
`CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` se usar outra porta/host.

O contrato foi conferido com os serviços do frontend:

- `authService`: `/auth/csrf/`, `/auth/login/`, `/auth/me/`, `/auth/logout/`;
- `ticketService`: `/tickets/`, `/tickets/{id}/`, `assign/`, `transition/`,
  `resolve/`, `confirm-resolution/`;
- `commentService`: `/tickets/{id}/comments/`;
- `historyService`: `/tickets/{id}/history/`;
- `categoryService`: `/categories/`.

Campos consumidos por `normalizers.js` estão presentes: `code`, `category`
(com `id`, `name`, `slug`), `requester`/`assignee`, `created_at`, `updated_at`,
`resolved_at`, `resolution`, `event_type`, `old_value`, `new_value`,
`from_status` e `to_status`.

Observações:

- O login retorna `{"user": {...}}`; `/auth/me/` retorna o usuário diretamente.
- O frontend lê o cookie `csrftoken` e envia `X-CSRFToken`; o backend exige
  CSRF em requisições autenticadas de escrita.
- O modo demonstração do frontend (`VITE_DEMO_MODE=true`) não chama esta API.
- O Kanban usa `page_size=200`; não há endpoint de estatísticas agregadas no MVP.
- O filtro `?mine=true` é resolvido no backend: técnicos recebem os chamados
  atribuídos a eles; solicitantes recebem os próprios chamados.

### Validação de integração realizada

Com backend e frontend rodando juntos, foram percorridos em navegador real:

1. login da solicitante, abertura de chamado e conferência da listagem própria;
2. login do técnico e conferência da navegação final (`Todos os chamados`,
   `Kanban`, `Abrir chamado`, `Meu perfil`, `Sair`);
3. abertura de chamado pelo técnico, com `requester` autenticado, sem
   responsável e sem urgência;
4. assunção com urgência pelo modal e pelo Kanban, com atualização atômica;
5. drag and drop entre colunas válidas, bloqueio de destinos inválidos e
   feedback visual;
6. comentário interno e auditoria de atribuição/urgência;
7. solicitação de confirmação com solução proposta;
8. confirmação pendente na listagem e no detalhe do solicitante;
9. confirmação positiva → `RESOLVIDO` com `resolved_at`;
10. rejeição → retorno a `EM_ATENDIMENTO` mantendo o técnico, seguida de nova
    confirmação e encerramento;
11. filtro “Meus chamados” combinado com busca/status/urgência/categoria;
12. conferência do histórico final sem duplicidade de eventos.

Correções feitas durante essa validação:

- a prop `block` do componente de botão do frontend passou a ser aplicada como
  classe CSS, em vez de vazar para o DOM e gerar warning do React;
- a API passou a ordenar `urgency` por peso semântico, pois antes a opção
  “Maior/Menor urgência” do frontend era ignorada silenciosamente;
- o sensor de drag and drop passou a priorizar a coluna sob o ponteiro
  (`pointerWithin` com fallback para `closestCorners`), evitando que um cartão
  largo fosse associado à coluna vizinha.

---

## Testes

```powershell
python -m pytest -q
```

Resultado atual: **65 testes passando, 1 ignorado** (teste de concorrência real
em PostgreSQL).

Cobertura principal:

- autenticação, login por username/e-mail, logout, CSRF e isolamento de role;
- abertura de chamado por solicitante e por técnico, campos controlados pelo
  servidor, categoria inativa;
- listagem por perfil, detalhe, filtros (incluindo `mine`), busca, paginação e
  limite de página;
- atribuição com urgência obrigatória, conflito de atribuição dupla e atualização
  atômica de responsável/urgência/status;
- transições válidas/inválidas, incluindo pausa/retomada e bloqueio de
  `RESOLVIDO` pela rota de transição;
- solicitação de confirmação com texto obrigatório e solução preservada;
- confirmação positiva/negativa, ownership, status exigido, dupla confirmação
  (`409`) e estado terminal;
- comentários internos e bloqueio para solicitantes;
- histórico por perfil, eventos novos, ausência de duplicidade e de vazamento de
  comentários;
- rollback transacional quando a auditoria falha;
- documentação OpenAPI e Swagger.

O teste de concorrência real (`apps/tickets/tests/test_concurrency.py`) usa
`select_for_update()` e só executa com PostgreSQL. Para rodá-lo:

```powershell
# .env com DB_ENGINE=postgresql e um banco de teste acessível
python -m pytest --ds=config.settings apps/tickets/tests/test_concurrency.py
```

Com SQLite, o teste é ignorado porque o banco não oferece o mesmo bloqueio de
linha. Os testes sequenciais de conflito (`409`) continuam cobrindo a regra de
estado.

Lint e formatação:

```powershell
ruff check .
ruff format --check .
```

---

## Qualidade e segurança

- Senhas usam o hash nativo do Django; nenhuma senha é armazenada em texto puro.
- Segredos vêm de variáveis de ambiente; `.env` é ignorado pelo git.
- CORS usa origens explícitas e `CORS_ALLOW_CREDENTIALS=True`; não há
  `CORS_ALLOW_ALL_ORIGINS`.
- CSRF ativo no login e nas requisições autenticadas de escrita.
- Cookies de sessão `HttpOnly`; CSRF legível apenas para o header.
- Autorização por perfil **e por objeto** em chamados, comentários e histórico.
- Consultas via ORM, com `select_related` e índices em status, urgência,
  solicitante, responsável e datas.
- `select_for_update()` nas operações críticas; auditoria na mesma transação.
- Erros não expõem stack traces em produção (`DEBUG=false`).
- Admin: histórico e comentários são somente leitura; chamados não podem ser
  excluídos pelo admin para preservar a auditoria.
- Em produção: defina `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY` forte,
  `ALLOWED_HOSTS`, HTTPS, cookies `Secure` e CORS/CSRF restritos.

---

## Fora do escopo

- Cadastro público de usuários.
- Administração de categorias/usuários pela API pública.
- Comentários públicos ou edição/exclusão de comentários.
- Reabertura de chamados resolvidos.
- Encerramento automático sem a confirmação do solicitante.
- Anexos, e-mail, push, SLA, escalonamento, chat em tempo real.
- Atribuição automática, multiempresa e microsserviços.
- Painéis analíticos avançados.
- Atualização em tempo real (WebSocket/polling).

---

## Limitações conhecidas

- A consistência entre abas depende de recarregar após ações e tratar `409`;
  não há WebSocket/polling.
- A confirmação da resolução depende do solicitante; não há notificação
  automática, então ele acompanha pela listagem “Meus chamados”.
- O Kanban carrega até 200 chamados por consulta. Para volumes maiores, avalie
  paginação por coluna ou carregamento incremental.
- O teste de concorrência real não roda na configuração padrão SQLite.
- O `.env` incluído usa SQLite para conveniência local; produção deve usar
  PostgreSQL conforme a seção de configuração.
