# Documento de Requisitos — FAP Solidário

## 1. Introdução

O **FAP Solidário** é um site institucional que conecta doadores a instituições sociais (ONGs) do município de **Barra do Garças – MT**, permitindo que o usuário encontre pontos de coleta para diversos tipos de doação: roupas e acessórios, alimentos não perecíveis, móveis, itens de higiene, itens culturais e dinheiro. O site também disponibiliza os contatos e a localização das instituições e da sede do projeto.

Este documento descreve os **Requisitos de Usuário** e os **Requisitos Funcionais** identificados a partir da análise do sistema implementado.

---

## 2. Requisitos de Usuário (RU)

Os requisitos de usuário descrevem, em linguagem natural, o que o usuário espera poder fazer no sistema.

### 2.1 Navegação Geral

| Código | Descrição |
|--------|-----------|
| **RU01** | O usuário deve ser capaz de acessar a página inicial do sistema e visualizar a identidade visual do projeto (logo e nome "FAP SOLIDÁRIO"). |
| **RU02** | O usuário deve ser capaz de escolher entre as ações principais "Fazer Doações", "Receber Doações" e "Mais Informações" a partir da página inicial. |
| **RU03** | O usuário deve ser capaz de retornar à página inicial a partir de qualquer página interna, por meio de um botão "Voltar". |

### 2.2 Doações

| Código | Descrição |
|--------|-----------|
| **RU04** | O usuário que deseja doar deve ser capaz de selecionar a categoria da doação: roupas e acessórios, alimentos não perecíveis, itens culturais, móveis, itens de higiene ou dinheiro. |
| **RU05** | O usuário deve ser capaz de visualizar a lista de instituições receptoras de cada categoria de doação. |
| **RU06** | O usuário deve ser capaz de visualizar o telefone de contato de cada instituição receptora. |
| **RU07** | O usuário deve ser capaz de visualizar a localização de cada instituição por meio de um mapa embutido. |

### 2.3 Recebimento de Doações

| Código | Descrição |
|--------|-----------|
| **RU08** | O usuário que deseja receber doações deve ser capaz de selecionar a categoria de itens que deseja receber (roupas e acessórios, alimentos não perecíveis, itens culturais, móveis, itens de higiene ou dinheiro). |
| **RU09** | O usuário deve ser capaz de visualizar as instituições que recebem doações de cada categoria. |

### 2.4 Informações

| Código | Descrição |
|--------|-----------|
| **RU10** | O usuário deve ser capaz de acessar a página de informações gerais do projeto. |
| **RU11** | O usuário deve ser capaz de visualizar os telefones e o e-mail de contato do projeto. |
| **RU12** | O usuário deve ser capaz de visualizar a localização da sede do projeto (IFMT – Campus Barra do Garças) em um mapa. |
| **RU13** | O usuário deve ser capaz de abrir a localização da sede no Google Maps externamente, por meio de um link. |

---

## 3. Requisitos Funcionais (RF)

Os requisitos funcionais descrevem os comportamentos e funcionalidades que o sistema deve executar.

| Código | Descrição | Página |
|--------|-----------|--------|
| **RF01** | O sistema deve exibir a página inicial com a logo, o nome "FAP SOLIDÁRIO" e os três botões de navegação principais: "Fazer Doações", "Receber Doações" e "Mais Informações". | `index.html` |
| **RF02** | O sistema deve redirecionar o usuário para a página de seleção de categoria de doação quando ele acionar o botão "Fazer Doações". | `index.html` → `doar.html` |
| **RF03** | O sistema deve redirecionar o usuário para a página de seleção de categoria quando ele acionar o botão "Receber Doações". | `index.html` → `receberdoacao.html` |
| **RF04** | O sistema deve exibir as categorias de doação disponíveis: Roupas e Acessórios, Alimentos Não Perecíveis, Itens Culturais, Móveis, Itens de Higiene e Dinheiro, cada uma com um ícone ilustrativo. | `doar.html`, `receberdoacao.html` |
| **RF05** | O sistema deve redirecionar o usuário para a página da categoria selecionada ao clicar em uma categoria de doação. | `doar.html` |
| **RF06** | O sistema deve exibir, na página de roupas e acessórios, as instituições receptoras (Centro Espírita Paulo de Tarso e APAE Barra do Garças) com telefone, mapa e endereço visual. | `roupas.html` |
| **RF07** | O sistema deve exibir, na página de alimentos não perecíveis, as instituições receptoras (Associação dos Cegos, Vicentinos, Obras Sociais Francisco de Assis, Centro Espírita Paulo de Tarso e APAE) com telefone e mapa de cada uma. | `alimentos.html` |
| **RF08** | O sistema deve exibir, na página de doação de dinheiro, as instituições receptoras (Associação dos Cegos, Vicentinos, Obras Sociais Francisco de Assis, Centro Espírita Paulo de Tarso e APAE) com telefone e mapa de cada uma. | `dinheiro.html` |
| **RF09** | O sistema deve exibir, na página de higiene, as instituições receptoras de itens de higiene e cuidados (Associação Barragarcense dos Cegos e APAE Barra do Garças). | `moveisehigiene.html` |
| **RF10** | O sistema deve exibir, na mesma página, as instituições receptoras de móveis e itens de educação e cultura (APAE Barra do Garças). | `moveisehigiene.html` |
| **RF11** | O sistema deve incorporar um mapa (iframe do Google Maps) com a localização de cada instituição receptora nas páginas de categoria. | `roupas.html`, `alimentos.html`, `dinheiro.html`, `moveisehigiene.html` |
| **RF12** | O sistema deve exibir na página de informações os dados de contato do projeto: três telefones e um e-mail institucional. | `informaçoes.html` |
| **RF13** | O sistema deve exibir a localização da sede do projeto (IFMT – Campus Barra do Garças) por meio de um mapa embutido. | `informaçoes.html` |
| **RF14** | O sistema deve fornecer um link externo para abrir a localização da sede no Google Maps em nova aba. | `informaçoes.html` |
| **RF15** | O sistema deve fornecer um botão "Voltar" em todas as páginas internas, redirecionando o usuário à página inicial. | todas as páginas internas |

---

## 4. Rastreabilidade

| Página | Requisitos de Usuário | Requisitos Funcionais |
|--------|----------------------|-----------------------|
| `index.html` | RU01, RU02 | RF01, RF02, RF03 |
| `doar.html` | RU03, RU04 | RF04, RF05 |
| `receberdoacao.html` | RU03, RU08 | RF03, RF04 |
| `roupas.html` | RU03, RU05, RU06, RU07 | RF06, RF11, RF15 |
| `alimentos.html` | RU03, RU05, RU06, RU07 | RF07, RF11, RF15 |
| `dinheiro.html` | RU03, RU05, RU06, RU07 | RF08, RF11, RF15 |
| `moveisehigiene.html` | RU03, RU05, RU06, RU07 | RF09, RF10, RF11, RF15 |
| `informaçoes.html` | RU03, RU10, RU11, RU12, RU13 | RF12, RF13, RF14, RF15 |

---

## 5. Observações

- As páginas `doar.html` e `receberdoacao.html` apresentam atualmente as mesmas categorias e destinos, sendo a diferença apenas o objetivo do usuário (doar ou receber). Recomenda-se revisar a distinção de conteúdo entre elas.
- Não há formulários, cadastro ou autenticação implementados no site até o momento; as funcionalidades atuais são informativas e de navegação.
- As informações de contato e localização são exibidas de forma estática no código HTML, sem integração com banco de dados ou API.
