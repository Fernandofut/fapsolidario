# Requisitos Funcionais – FAP Solidário

## RF01 – Autenticação e Sessão
- **Descrição**: O sistema deve permitir cadastro, login e logout de usuários com diferentes papéis (`doador`, `recebedor`, `administrador`).
- **Endpoints**:
  - `POST /api/auth/cadastro`
  - `POST /api/auth/login`
  - `GET /api/auth/sessao`
  - `POST /api/auth/logout`
- **Requisitos**: Senhas armazenadas com hash (`scrypt`), cookie de sessão `HttpOnly` e validade de 8 h.

## RF02 – Gestão de Estoque (Doadores)
- **Descrição**: Doadores podem cadastrar itens no estoque.
- **Endpoints**:
  - `POST /api/estoque` (criar item)
  - `GET /api/estoque` (listar itens)
- **Validações**: Apenas usuários com papel `doador`; campos obrigatórios `nome_item`, `categoria`, `quantidade`; `quantidade >= 0`.

## RF03 – Listagem Dinâmica de Locais/Instituições
- **Descrição**: Página de listagem deve consumir `GET /api/locais` e renderizar cards dinamicamente.
- **Parâmetros**: `?categoria=` opcional para filtrar por categoria.
- **Front‑end**: JavaScript vanilla que cria elementos `<div class="card">` dentro de `#listagem`.

## RF04 – Busca em Tempo Real
- **Descrição**: Barra de pesquisa no topo das páginas de listagem filtra cards por nome ou bairro conforme o usuário digita.
- **Implementação**: `input#busca` com event `input` que oculta/show cards via `display:none/block`.

## RF05 – Contato Interativo
- **Descrição**: Cada card inclui:
  - Link `tel:` para discagem direta.
  - Botão WhatsApp que abre `https://wa.me/<numero>?text=Olá%20via%20FAP%20Solidário`.
  - Botão “Copiar Morada” que usa `navigator.clipboard.writeText` e exibe toast de sucesso.

## RF06 – Emissão de Pedidos (Beneficiário)
- **Descrição**: Beneficiário pode solicitar itens disponíveis.
- **Endpoints**:
  - `POST /api/pedidos`
  - `GET /api/pedidos` (historico próprio)
- **Processo**: Verifica estoque, subtrai quantidade atomically, cria registro em `pedidos` com status `pendente`.

## RF07 – Dashboard Analítico (Doador & Administrador)
- **Descrição**: Exibir gráficos de total de doações, ranking de empresas e distribuição por categoria.
- **Endpoint**: `GET /api/dashboard`
- **Restrição**: Acesso somente para `doador` (visualização) e `administrador` (todos os dados).

## RF08 – Painel Administrativo
- **Descrição**: CRUD completo para `usuarios`, `estoque`, `pedidos`, `locais`.
- **Endpoints**: `GET/POST/PUT/DELETE /api/*` conforme recurso.
- **Segurança**: Token JWT válido e papel `administrador` requerido.

## RF09 – Responsividade e Design System
- **Descrição**: Todas as páginas devem usar CSS Grid/Flexbox, tipografia *Inter*, paleta institucional (`#1389ac`, `#f1db0c`, `#5bbd5e`).
- **Componentes**: Card institucional, botão de ação rápida, barra de busca, cabeçalho responsivo.

## RF10 – Acessibilidade
- **Descrição**: Uso de atributos `aria-`, contraste mínimo 4.5:1, foco visível, navegação por teclado.

---

*Os requisitos acima correspondem ao escopo MVP e estão alinhados com a documentação existente.*
