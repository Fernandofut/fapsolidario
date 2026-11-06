# Perfis de Usuário – FAP Solidário

## 1. Doador (Pessoa Física ou Empresa)

| Aspecto | Descrição |
|---|---|
| **Objetivo** | Contribuir com itens (roupas, alimentos, higiene, móveis, dinheiro) ou lotes corporativos para instituições beneficiárias. |
| **Necessidades** | - Cadastro rápido com definição de tipo (Doador Comum ou Empresa).<br>- Acesso à listagem de instituições por categoria.<br>- Ferramentas de contato direto (tel:, WhatsApp).<br>- Possibilidade de copiar endereço para navegação. |
| **Permissões** | - `POST /api/estoque` (cadastrar item no estoque).<br>- `GET /api/locais` (visualizar pontos de coleta).<br>- Acesso a dashboards de doações (somente leitura).<br>- Não pode criar/gerir pedidos de recepção. |
| **Critérios de Sucesso** | Doação registrada e refletida no estoque em < 2 s; feedback visual de confirmação; links de contato funcionais. |

## 2. Beneficiário / Instituição (ONG, Projeto Social, etc.)

| Aspecto | Descrição |
|---|---|
| **Objetivo** | Receber itens que atendam às necessidades da sua comunidade. |
| **Necessidades** | - Cadastro como `recebedor` para obter credenciais de acesso.<br>- Consulta ao catálogo de itens disponíveis por categoria.<br>- Emissão de pedidos de coleta (`POST /api/pedidos`).<br>- Visualizar histórico de pedidos e status. |
| **Permissões** | - `GET /api/estoque` (consultar disponibilidade).<br>- `POST /api/pedidos` (solicitar itens).<br>- `GET /api/pedidos` (consultar seus pedidos).<br>- Não pode inserir itens no estoque. |
| **Critérios de Sucesso** | Pedido criado, estoque atualizado atomically, confirmação automática enviada ao doador. |

## 3. Administrador (Gestor do Sistema)

| Aspecto | Descrição |
|---|---|
| **Objetivo** | Gerir usuários, validar instituições, monitorar fluxos de doação e garantir integridade dos dados. |
| **Necessidades** | - Interface de controle (painel administrativo).<br>- Ferramentas de CRUD completo para `usuarios`, `estoque`, `pedidos` e `locais`.<br>- Relatórios analíticos (volumes, ranking de doadores, desempenho por categoria).<br>- Monitoramento de segurança e auditoria. |
| **Permissões** | - Acesso total a todos os endpoints (`GET/POST/PUT/DELETE`).<br>- Gerenciamento de sessões e tokens JWT. |
| **Critérios de Sucesso** | Operações de gestão concluídas sem erros; logs de auditoria completos; disponibilidade > 99,9 %. |

---

*Este documento serve como base para a definição de papéis, controle de acesso e priorização de funcionalidades.*
