# Regras de Negócio – FAP Solidário

## RN01 – Validação de Perfil para Estoque
- Apenas usuários com papel **doador** podem registrar itens no estoque (`POST /api/estoque`).
- O campo `tipo` no cadastro determina o papel: `Doador Comum` e `Empresa` → papel `doador`; `Beneficiário` → papel `recebedor`.

## RN02 – Restrição de Pedidos
- Apenas usuários com papel **recebedor** podem criar pedidos (`POST /api/pedidos`).
- O endpoint devolve `403 Forbidden` para papéis diferentes.

## RN03 – Controle de Quantidade no Estoque
- Ao criar um pedido, a quantidade solicitada é subtraída imediatamente do estoque.
- A quantidade em estoque nunca pode ficar negativa; a validação ocorre no servidor antes da confirmação.

## RN04 – Validação de Dados de Perecíveis
- Itens da categoria **Alimentos** devem conter campo `data_validade` no formato ISO `YYYY-MM-DD`.
- O backend rejeita datas no passado com `400 Bad Request`.

## RN05 – Segurança das Credenciais
- Senhas são armazenadas usando `crypto.scrypt` com sal aleatório e parâmetros de custo adequados.
- Nunca há armazenamento de senhas em texto plano.

## RN06 – Sessão Segura
- Cookies de sessão são `HttpOnly`, `Secure` (quando HTTPS) e têm vida útil de 8 h.
- A sessão é invalidada ao chamar `POST /api/auth/logout`.

## RN07 – Propagação de Novo Ponto de Coleta
- Quando um usuário se registra como **Empresa** ou **Beneficiário**, um registro é automaticamente inserido na tabela `locais`.
- O novo ponto fica imediatamente disponível na listagem `GET /api/locais`.

## RN08 – Histórico de Pedidos
- Cada pedido gera um registro em `pedidos` com timestamp `criado_em`.
- O beneficiário pode consultar seu histórico via `GET /api/pedidos` filtrado por `recebedor_id`.

## RN09 – Relatórios Administrativos
- Administradores podem gerar métricas agregadas (`GET /api/dashboard`) contendo totais de doações, pedidos, ranking de doadores e distribuição por categoria.
- Dados são retornados somente para usuários com papel `administrador`.
