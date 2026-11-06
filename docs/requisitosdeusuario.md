# Requisitos de Usuário – FAP Solidário

## 1. Navegação e Experiência Geral

- **RU01**: O usuário deve acessar a página inicial e ver a identidade visual (logo, paleta de cores institucional, tipografia Inter). 
- **RU02**: Deve existir um menu de navegação sempre visível que redirecione para as áreas **Fazer Doação**, **Receber Doação**, **Informações** e **Perfil**.
- **RU03**: Em todas as páginas internas, um botão “Voltar” deve levar o usuário ao menu adequado ao seu perfil.

## 2. Doador (Pessoa Física ou Empresa)

- **RU04**: Selecionar a categoria da doação (Roupas, Alimentos, Higiene, Móveis, Cultura, Dinheiro). 
- **RU05**: Visualizar instituições da categoria em um **grid responsivo** (3 colunas desktop, 2 tablet, 1 mobile). 
- **RU06**: Cada card deve exibir:
  - Nome da instituição
  - Telefone como link `tel:`
  - Botão WhatsApp que abre `https://wa.me/<numero>?text=Olá%20via%20FAP%20Solidário`
  - Botão “Copiar Morada” que copia o endereço para a área de transferência.
- **RU07**: Registrar um novo item no estoque via formulário (nome, quantidade, validade opcional) e receber feedback visual de sucesso/erro.
- **RU08**: Visualizar um **dashboard** com total de doações, ranking de doadores e gráficos por categoria.

## 3. Beneficiário / Instituição

- **RU09**: Navegar pelas categorias e ver os itens disponíveis em cards semelhantes ao doador.
- **RU10**: Filtrar a lista em tempo real por **nome** ou **bairro** usando uma barra de pesquisa.
- **RU11**: Solicitar a quantidade desejada de um item (botão **Solicitar**) – o sistema valida disponibilidade e confirma o pedido.
- **RU12**: Consultar histórico de pedidos (item, quantidade, data, status) na aba “Meus Pedidos”.

## 4. Administrador

- **RU13**: Acessar um painel de controle com CRUD completo para usuários, estoque, pedidos e locais.
- **RU14**: Gerar relatórios analíticos (totais de doações, ranking de doadores, distribuição por categoria, volume por período).
- **RU15**: Validar ou rejeitar novos pontos de coleta cadastrados automaticamente.

---

*Todos os requisitos foram pensados para garantir usabilidade fluida em dispositivos móveis e desktop.*
