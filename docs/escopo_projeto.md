# Escopo do Projeto — FAP Solidário

> Documento de escopo do projeto da disciplina de **Projeto e Desenvolvimento de Sistemas**.
> Define objetivo, regras de negócio, funcionalidades, arquitetura e requisitos da aplicação.

---

## 1. Objetivo

O **FAP Solidário** é uma plataforma web que **conecta doadores a instituições sociais** do
município de Barra do Garças – MT, facilitando e incentivando doações de alimentos, roupas,
itens de higiene, móveis, itens culturais e dinheiro.

A aplicação permite:

- **Doadores (pessoas e empresas)** registrarem doações em um estoque compartilhado,
  com controle de categoria, quantidade e validade.
- **Beneficiários** consultarem os itens disponíveis e solicitarem (receberem) doações,
  com baixa automática no estoque e histórico de pedidos.
- **Todos os usuários** consultarem painel com gráficos, ranking de doadores e
  informações de contato/localização das instituições.

---

## 2. Atendentes do sistema (Perfis de usuário)

| Tipo de conta | Papel interno | Quem é |
|---------------|---------------|--------|
| Doador Comum | `doador` | Pessoa física que registra doações no estoque. |
| Empresa | `doador` | Organização que doa e aparece no ranking do dashboard. |
| Beneficiário | `recebedor` | Pessoa que solicita itens disponíveis no estoque. |

- O **papel** é derivado do tipo da conta no servidor: `Beneficiário` → `recebedor`; demais → `doador`.
- Contas de teste (criadas automaticamente no 1º acesso):

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Doador (Comum) | `teste@fap.com` | `123456` |
| Recebedor (Beneficiário) | `recebedor@fap.com` | `123456` |

---

## 3. Funcionalidades

### 3.1 Autenticação e contas
- **Cadastro** com 3 tipos de conta (Doador Comum, Empresa, Beneficiário).
- **Login** com e-mail e senha; sessão mantida por cookie `HttpOnly` assinado, expira em 8h.
- **Logout** encerra a sessão no servidor e limpa o cookie.
- Senhas armazenadas com **hash scrypt + salt** (nunca em texto puro).

### 3.2 Área do doador
- **Menu do doador** com atalhos para doações, estoque, dashboard e informações.
- **Páginas de categoria** (roupas, alimentos, higiene/móveis, dinheiro) com lista de
  instituições receptoras, telefones e mapa embutido.
- **Estoque**: registrar doações (item, categoria, quantidade, doador/empresa, validade)
  e acompanhar a lista com alertas de validade (vencido / vence hoje / vence em 7 dias).
- **Dashboard**: gráfico de totais por categoria e ranking de doadores/empresas.

### 3.3 Área do beneficiário
- **Painel com abas** por categoria (Alimentos, Roupas, Higiene, Móveis, Cultura, Dinheiro).
- Botão **SOLICITAR** em cada item disponível, com escolha de quantidade.
- **Baixa automática e atômica** no estoque ao confirmar o pedido.
- Aba **Meus Pedidos** com histórico (item, categoria, quantidade, data).

### 3.4 Informações
- Página de contato (telefones, e-mail) e localização da sede (IFMT – Campus Barra do Garças)
  com mapa embutido e link para o Google Maps.

---

## 4. Regras de negócio

| Código | Regra |
|--------|-------|
| **RN01** | Somente perfis `doador` podem registrar itens no estoque (`POST /api/estoque`). |
| **RN02** | Somente perfis `recebedor` podem solicitar itens (`POST /api/pedidos`) e consultar seus pedidos (`GET /api/pedidos`). |
| **RN03** | A solicitação de um item só é aceita se a quantidade pedida for **menor ou igual** ao estoque disponível; caso contrário, retorna erro. |
| **RN04** | O pedido e a baixa de estoque ocorrem na **mesma transação**: se a baixa falhar, o pedido é desfeito (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`). |
| **RN05** | Todo usuário logado pode consultar estoque e dashboard; usuários sem sessão recebem `401`. |
| **RN06** | E-mail é **único** no cadastro (constraint `UNIQUE`); tentativa repetida retorna `409`. |
| **RN07** | A senha deve ter no mínimo **6 caracteres** e é armazenada com hash (scrypt + salt). |
| **RN08** | O papel do usuário é derivado **no servidor** do tipo da conta — não é confiado ao cliente. |
| **RN09** | Sessão expira após `SESSAO_HORAS` (padrão: 8 horas) e é invalidada no logout. |
| **RN10** | Itens com validade próxima/vencida são sinalizados visualmente no estoque (controle FIFO). |
| **RN11** | *Pendente/KYC*: repasse de valores a beneficiários exige validação de CPF/CNPJ e dados bancários. |
| **RN12** | *Pendente*: eventual taxa de manutenção e prazo de repasse (ex.: D+3) devem ser informados com transparência. |

---

## 5. Regras de acesso (matriz de permissões)

| Recurso | Doador | Recebedor | Sem login |
|---------|--------|-----------|-----------|
| `POST /api/auth/cadastro`, `POST /api/auth/login` | ✅ | ✅ | ✅ |
| `GET /api/auth/sessao` | ✅ | ✅ | ❌ 401 |
| `GET /api/estoque`, `GET /api/dashboard` | ✅ | ✅ | ❌ 401 |
| `POST /api/estoque` | ✅ | ❌ 403 | ❌ 401 |
| `GET /api/pedidos`, `POST /api/pedidos` | ❌ 403 | ✅ | ❌ 401 |
| Páginas de doação/estoque/dashboard | ✅ | ❌ redireciona | ❌ redireciona |
| Páginas de recebimento | ❌ redireciona | ✅ | ❌ redireciona |
| `cadastro.html`, `index.html` (login) | ✅ | ✅ | ✅ |

> As regras de página são reforçadas no cliente (`frontend/js/api.js`) apenas para
> navegação; **a autorização real é sempre aplicada pela API**.

---

## 6. Arquitetura (diagrama textual)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                               NAVEGADOR                                  │
│  frontend/  (HTML5 + CSS3 + JavaScript puro)                             │
│  ┌──────────────────────┐   fetch JSON apenas para   ┌────────────────┐  │
│  │ páginas (index,      │ ──────────────────────────► │  js/api.js     │  │
│  │ cadastro, estoque,   │      /api/*                 │  (cliente HTTP │  │
│  │ receber, dashboard…) │ ◄────────────────────────── │   + guardas)   │  │
│  └──────────────────────┘      JSON                   └────────────────┘  │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │  HTTP (cookie sid HttpOnly)
┌───────────────────────────────────▼──────────────────────────────────────┐
│  api/  (Node.js + Express)                                               │
│  ┌──────────────┐ ┌────────────────────────────────────────────────────┐ │
│  │ server.js    │ │ app.js: monta o Express                            │ │
│  │ (config →    │─│  rotas: /api/auth /api/estoque /api/pedidos        │ │
│  │  banco →     │ │          /api/dashboard                           │ │
│  │  listen)     │ │  middlewares: logger, auth, notFound, errorHandler │ │
│  └──────────────┘ ├────────────────────────────────────────────────────┤ │
│                   │ modules/{auth,estoque,pedidos,dashboard}/         │ │
│                   │   routes + service (regras de negócio)            │ │
│                   │ config/ (.env)  database/ (sqlite, schema, seed)  │ │
│                   │ utils/ (AppError, asyncHandler, hash scrypt)      │ │
│                   └───────────────────────────┬────────────────────────┘ │
└───────────────────────────────────────────────┼──────────────────────────┘
                                                │  único acesso ao banco
                              ┌─────────────────▼──────────────────┐
                              │  api/data/banco.sqlite             │
                              │  (usuarios, estoque, pedidos)      │
                              │  fora do versionamento (.gitignore)│
                              └────────────────────────────────────┘
```

**Princípio central:** o frontend é apenas apresentação. Ele nunca abre o banco nem lê
arquivos confidenciais; todo dado passa pela API, que valida sessão, papel e dados.

---

## 7. Mapa da API (rotas REST)

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `POST` | `/api/auth/cadastro` | público | Cria conta (nome, email, senha, tipo). |
| `POST` | `/api/auth/login` | público | Autentica e cria sessão (cookie `sid`). |
| `POST` | `/api/auth/logout` | logado | Destroi a sessão e limpa o cookie. |
| `GET`  | `/api/auth/sessao` | logado | Devolve `{nome, email, tipo, papel}`. |
| `GET`  | `/api/estoque` | logado | Lista itens do estoque (JSON). |
| `POST` | `/api/estoque` | doador | Registra nova doação no estoque. |
| `GET`  | `/api/dashboard` | logado | Totais por categoria + ranking de doadores. |
| `GET`  | `/api/pedidos` | recebedor | Histórico de pedidos do usuário. |
| `POST` | `/api/pedidos` | recebedor | Solicita item (transação com baixa no estoque). |

Formato de resposta: JSON com `sucesso` + `mensagem` (+ dados). Erros: `400/401/403/404/409/500`.

---

## 8. Modelo de dados (SQLite)

```
usuarios                     estoque                       pedidos
─────────                    ───────                       ───────
id          INTEGER PK       id          INTEGER PK        id            INTEGER PK
nome        TEXT             nome_item   TEXT              id_item       INTEGER → estoque
email       TEXT UNIQUE      categoria   TEXT              usuario_email TEXT
senha       TEXT (hash)      quantidade  INTEGER           quantidade_pedida INTEGER
tipo        TEXT             empresa_nome TEXT             data_pedido   TEXT
criado_em   TEXT             data_validade TEXT (opc.)     criado_em     TEXT
                            criado_em   TEXT
```

Categorias aceitas: `Alimentos`, `Roupas`, `Higiene`, `Moveis`, `Cultura`, `Dinheiro`, `Outros`.

---

## 9. Fluxo de navegação

```
                       Login (/index.html) ──POST /api/auth/login
                                                │
              ┌─────────────────────────────────┴────────────────────────────┐
              ▼ papel "doador"                              ▼ papel "recebedor"
     Menu do Doador (/pages/opcoes.html)          Painel (/pages/receber.html)
       │        │        │        │                abas: alimentos, roupas,
       ▼        ▼        ▼        ▼                      higiene, móveis,
    FAZER    ESTOQUE  DASHBOARD  MAIS                  cultura, dinheiro,
   DOAÇÕES           (gráficos) INFO                  meus pedidos
   (páginas de                               botão SOLICITAR → POST /api/pedidos
    categoria)                                (baixa automática no estoque)
```

---

## 10. Requisitos não funcionais

- **Segredo em ambiente:** porta, chaves e caminhos ficam no `api/.env`; `.env`, `*.log`,
  `*.db`/`*.sqlite` são ignorados pelo `.gitignore` e **nunca vão para o repositório**.
- **Separação de camadas:** `frontend/` (apresentação), `api/` (regras e acesso a dados),
  `docs/` (documentação). O banco fica **dentro de `api/`**, acessível somente pelo servidor.
- **Segurança:** senhas com hash scrypt, cookie de sessão `HttpOnly` + `SameSite=Lax`,
  token assinado com HMAC (`SESSION_SECRET`), consultas SQL parametrizadas (anti-injection),
  validação de entrada, autorização por papel em toda rota protegida.
- **Confiabilidade:** transação no pedido/baixa, mensagens de erro consistentes,
  log de requisições em `api/logs/app.log`.
- **Portabilidade:** roda com `npm install && npm start` — sem serviços externos.
- **Padrões de código:** ESLint + Prettier + EditorConfig na raiz (`npm run lint`,
  `npm run format`) garantindo estilo consistente em todo o time.
- **Escalabilidade futura:** backend organizado em camadas (middlewares, modules com
  routes/service, utils) facilita a troca de banco (ex.: Postgres) ou a inclusão de
  novo recurso sem quebrar o existente.

---

## 11. Fora de escopo (versão atual / próximos passos)

- Painel administrativo completo e gestão de usuários.
- Notificações de pedidos e histórico consolidado por usuário.
- Processamento real de pagamentos (doação em dinheiro) e KYC (RN11/RN12).
- Testes automatizados e implantação em servidor (produção).

---

## 12. Estrutura de pastas do repositório

```
fapsolidario/
├── README.md                 # Guia de instalação e execução
├── package.json              # Ferramentas de qualidade (ESLint, Prettier) e scripts
├── eslint.config.js          # Regras de lint (frontend JS + backend Node)
├── .prettierrc / .prettierignore / .editorconfig
├── .gitignore                # Ignora .env, *.log, *.sqlite/*.db, node_modules/
│
├── docs/                     # Documentação do projeto
│   ├── escopo_projeto.md     # ← este documento
│   ├── documento_requisitos.md
│   ├── perfisdeusuario
│   ├── regrasdenegocio
│   └── ...
│
├── api/                      # Backend (único dono do banco de dados)
│   ├── server.js             # Bootstrap: config → schema/seed → app.listen
│   ├── package.json          # Dependências de runtime
│   ├── .env.example          # Modelo das variáveis de ambiente
│   ├── .env                  # Valores reais (NÃO versionado)
│   ├── data/banco.sqlite     # Banco SQLite gerado (NÃO versionado)
│   ├── logs/app.log          # Log de requisições (NÃO versionado)
│   └── src/
│       ├── app.js            # Criação do Express (rotas, estáticos, erros)
│       ├── config/           # index.js: leitura do .env
│       ├── database/         # connection.js, schema.js, seed.js
│       ├── middlewares/      # logger, auth, notFound, errorHandler
│       ├── modules/          # auth/, estoque/, pedidos/, dashboard/
│       │                     # (cada um com *.routes.js + *.service.js)
│       └── utils/            # AppError, asyncHandler, password (hash)
│
└── frontend/                 # Apenas consome a API (/api/*)
    ├── index.html            # Login
    ├── pages/                # Páginas internas (HTML + JS inline)
    └── assets/
        ├── js/api.js         # Cliente HTTP + guardas de navegação
        ├── css/              # Estilos por página
        └── img/              # Imagens (logo)
```
