/**
 * FAP SOLIDÁRIO - Módulo de Tradução Dinâmica (PT | EN | ES)
 * Responsável pela alternância de idiomas e tradução da interface em tempo real.
 */

(function () {
    'use strict';

    const CHAVE_STORAGE = 'fap_idioma';
    const IDIOMA_PADRAO = 'pt';

    const DICIONARIO = {
        en: {
            // Gerais e Marca
            'FAP SOLIDÁRIO': 'FAP SOLIDÁRIO',
            'FAP SOLIDÁRIO - Login': 'FAP SOLIDÁRIO - Login',
            'FAP SOLIDÁRIO - Cadastro': 'FAP SOLIDÁRIO - Sign Up',
            'FAP SOLIDÁRIO - Menu': 'FAP SOLIDÁRIO - Menu',
            'FAP SOLIDÁRIO - Menu do Doador': 'FAP SOLIDÁRIO - Donor Menu',
            'FAP SOLIDÁRIO - Escolha sua Doação': 'FAP SOLIDÁRIO - Choose your Donation',
            'FAP SOLIDÁRIO - Estoque de Doações': 'FAP SOLIDÁRIO - Donation Inventory',
            'FAP SOLIDÁRIO - Dashboard Analítico': 'FAP SOLIDÁRIO - Analytics Dashboard',
            'FAP SOLIDÁRIO - Receber Doações': 'FAP SOLIDÁRIO - Receive Donations',
            'InformaÁ§Áµes - FAP SOLIDÁRIO': 'Information - FAP SOLIDÁRIO',
            'Informações - FAP SOLIDÁRIO': 'Information - FAP SOLIDÁRIO',

            // Login e Autenticação
            'Entre para doar ou receber doações': 'Sign in to donate or receive donations',
            'E-mail': 'E-mail',
            'Senha': 'Password',
            'ENTRAR': 'SIGN IN',
            'Doador:': 'Donor:',
            'Recebedor:': 'Recipient:',
            'Ainda não tem conta?': "Don't have an account?",
            'Cadastre-se aqui': 'Sign up here',
            'Já tem uma conta?': 'Already have an account?',
            'Faça login aqui': 'Log in here',
            'Sua senha': 'Your password',
            'seu@email.com': 'your@email.com',

            // Cadastro
            'Crie sua conta para doar ou receber': 'Create your account to donate or receive',
            'Nome': 'Name',
            'Seu nome completo': 'Your full name',
            'Crie uma senha': 'Create a password',
            'O que você quer fazer no FAP SOLIDÁRIO?': 'What do you want to do on FAP SOLIDÁRIO?',
            'O que você quer fazer no FAP Solidário?': 'What do you want to do on FAP SOLIDÁRIO?',
            'Quero DOAR': 'I want to DONATE',
            'Quero RECEBER': 'I want to RECEIVE',
            'Doador Comum': 'Regular Donor',
            'Empresa': 'Company',
            'Empresa / Organização': 'Company / Organization',
            'Beneficiário': 'Beneficiary',
            'Beneficiário (receber doações)': 'Beneficiary (receive donations)',
            'CADASTRAR': 'REGISTER',
            'Você poderá registrar doações de alimentos, roupas, higiene, móveis e dinheiro.': 'You will be able to register donations of food, clothing, hygiene, furniture and money.',
            'Sua empresa aparece no ranking de doações do dashboard e no registro de estoque.': 'Your company appears on the donation ranking of the dashboard and inventory records.',
            'Você terá acesso às abas para solicitar doações disponíveis e acompanhar seus pedidos.': 'You will have access to the tabs to request available donations and track your requests.',

            // Menu e Navegação
            'Abrindo seu menu...': 'Opening your menu...',
            'Se não for redirecionado, faça login novamente.': 'If not redirected, please log in again.',
            'faça login novamente': 'log in again',
            'clique aqui': 'click here',
            'Abrindo a área de recebimento de doações...': 'Opening the donation reception area...',
            'Bem-vindo(a)!': 'Welcome!',
            'FAZER DOACOES': 'MAKE DONATIONS',
            'FAZER DOAÇÕES': 'MAKE DONATIONS',
            'ESTOQUE DE DOACOES': 'DONATION INVENTORY',
            'ESTOQUE DE DOAÇÕES': 'DONATION INVENTORY',
            'DASHBOARD': 'DASHBOARD',
            'MAIS INFORMACOES': 'MORE INFORMATION',
            'MAIS INFORMAÇÕES': 'MORE INFORMATION',
            'SAIR DA CONTA': 'SIGN OUT',
            'SAIR': 'SIGN OUT',
            'Sair': 'Sign out',
            'Menu': 'Menu',
            'VOLTAR': 'BACK',
            'Voltar': 'Back',
            'Categorias': 'Categories',
            'Estoque': 'Inventory',
            'Dashboard': 'Dashboard',

            // Doar / Categorias
            'ESCOLHA COMO DOAR': 'CHOOSE HOW TO DONATE',
            'Selecione a categoria desejada para encontrar pontos de coleta': 'Select the desired category to find collection points',
            'Roupas e Acessórios': 'Clothes and Accessories',
            'Agasalhos, calçados, cobertores e vestuário em geral.': 'Warm clothes, footwear, blankets and general clothing.',
            'Alimentos Não Perecíveis': 'Non-Perishable Food',
            'Arroz, feijão, óleo, leite em pó, café, macarrão e cestas básicas completas.': 'Rice, beans, cooking oil, powdered milk, coffee, pasta and complete food hampers.',
            'Itens de Higiene': 'Hygiene Items',
            'Sabonete, pasta de dente, escovas, papel higiênico e produtos de limpeza doméstica.': 'Soap, toothpaste, toothbrushes, toilet paper and household cleaning items.',
            'Móveis e Utensílios': 'Furniture and Utensils',
            'Camas, colchões, mesas, cadeiras, fogões, geladeiras e utilidades do lar.': 'Beds, mattresses, tables, chairs, stoves, refrigerators and home utilities.',
            'Itens Culturais e Livros': 'Cultural Items and Books',
            'Livros didáticos e literários, cadernos, mochilas e materiais escolares.': 'Textbooks, literature, notebooks, backpacks and school supplies.',
            'Doações Financeiras': 'Financial Donations',
            'Apoie instituições com transferências via PIX ou conta bancária direta.': 'Support organizations with PIX transfers or direct bank account.',
            'Ver locais de coleta →': 'View collection points →',
            'Ver chaves e dados →': 'View keys and details →',

            // Listagem de Locais
            'Todas as Doações': 'All Donations',
            'Roupas': 'Clothes',
            'Alimentos': 'Food',
            'Higiene & Móveis': 'Hygiene & Furniture',
            'Dinheiro': 'Money',
            'DOAÇÃO DE ALIMENTOS': 'FOOD DONATION',
            'Pontos de arrecadação para alimentos não perecíveis, leite e cestas básicas para famílias em vulnerabilidade.': 'Collection points for non-perishable food, milk, and basic hampers for vulnerable families.',
            'DOAÇÃO DE ROUPAS & ACESSÓRIOS': 'CLOTHES & ACCESSORIES DONATION',
            'Pontos para doar agasalhos, calçados, cobertores e roupas em bom estado.': 'Points to donate coats, shoes, blankets, and clothes in good condition.',
            'MÓVEIS, HIGIENE E UTILIDADES': 'FURNITURE, HYGIENE & UTILITIES',
            'Pontos de coleta para móveis, eletrodomésticos, kits de higiene e produtos de limpeza.': 'Collection points for furniture, appliances, hygiene kits, and cleaning supplies.',
            'DOAÇÕES EM DINHEIRO': 'FINANCIAL DONATIONS',
            'Contribua diretamente via PIX ou transferência para instituições cadastradas.': 'Contribute directly via PIX or bank transfer to registered institutions.',
            'Buscar por instituição, endereço ou bairro...': 'Search by institution, address or neighborhood...',
            'Limpar busca': 'Clear search',
            'Copiar': 'Copy',
            'Copiada!': 'Copied!',
            'Copiar morada para o Waze ou GPS': 'Copy address to Waze or GPS',
            'WhatsApp': 'WhatsApp',
            'Ligar': 'Call',
            'Contato presencial': 'In-person contact',
            'Ponto de Coleta': 'Collection Point',
            'Instituição Solidária': 'Solidarity Institution',

            // Estoque
            'DASHBOARD ANALÍTICO': 'ANALYTICS DASHBOARD',
            'Visualização em tempo real do estoque de doações': 'Real-time overview of donation inventory',
            'Total de Itens': 'Total Items',
            'Quantidade Total': 'Total Quantity',
            'Ranking de Doações por Empresa': 'Donations Ranking by Company',
            'Itens por Categoria': 'Items by Category',
            'Nenhuma doação por empresa registrada ainda.': 'No company donations registered yet.',
            'Nenhum item em estoque para exibir no gráfico.': 'No items in stock to show on chart.',
            'Cadastrar Novo Item no Estoque': 'Register New Item in Inventory',
            'Nome do Item': 'Item Name',
            'Categoria': 'Category',
            'Quantidade': 'Quantity',
            'Unidade': 'Unit',
            'Local de Armazenamento': 'Storage Location',
            'Descrição / Observações': 'Description / Notes',
            'Adicionar ao Estoque': 'Add to Inventory',
            'Filtro por Categoria:': 'Filter by Category:',
            'Todos': 'All',
            'Item': 'Item',
            'Status': 'Status',
            'Data': 'Date',
            'Ações': 'Actions',
            'Disponível': 'Available',
            'Reservado': 'Reserved',
            'Entregue': 'Delivered',
            'Remover': 'Remove',

            // Receber
            'RECEBER DOAÇÕES': 'RECEIVE DONATIONS',
            'Itens Disponíveis para Doação': 'Available Items for Donation',
            'Meus Pedidos de Doação': 'My Donation Requests',
            'Solicitar Item': 'Request Item',
            'Quantidade Desejada': 'Desired Quantity',
            'Justificativa / Observação': 'Justification / Note',
            'Confirmar Pedido': 'Confirm Request',
            'Cancelar': 'Cancel',
            'Pendente': 'Pending',
            'Aprovado': 'Approved',
            'Nenhum item disponível nesta categoria no momento.': 'No items available in this category at the moment.',
            'Você ainda não fez nenhum pedido de doação.': "You haven't made any donation requests yet.",

            // Informações
            'INFORMAÇÕES INSTITUCIONAIS': 'INSTITUTIONAL INFORMATION',
            'Fazer Doação': 'Make Donation',
            'Informações': 'Information'
        },
        es: {
            // Gerais e Marca
            'FAP SOLIDÁRIO': 'FAP SOLIDÁRIO',
            'FAP SOLIDÁRIO - Login': 'FAP SOLIDÁRIO - Iniciar Sesión',
            'FAP SOLIDÁRIO - Cadastro': 'FAP SOLIDÁRIO - Registro',
            'FAP SOLIDÁRIO - Menu': 'FAP SOLIDÁRIO - Menú',
            'FAP SOLIDÁRIO - Menu do Doador': 'FAP SOLIDÁRIO - Menú del Donante',
            'FAP SOLIDÁRIO - Escolha sua Doação': 'FAP SOLIDÁRIO - Elige tu Donación',
            'FAP SOLIDÁRIO - Estoque de Doações': 'FAP SOLIDÁRIO - Inventario de Donaciones',
            'FAP SOLIDÁRIO - Dashboard Analítico': 'FAP SOLIDÁRIO - Panel Analítico',
            'FAP SOLIDÁRIO - Receber Doações': 'FAP SOLIDÁRIO - Recibir Donaciones',
            'InformaÁ§Áµes - FAP SOLIDÁRIO': 'Información - FAP SOLIDÁRIO',
            'Informações - FAP SOLIDÁRIO': 'Información - FAP SOLIDÁRIO',

            // Login e Autenticação
            'Entre para doar ou receber doações': 'Inicia sesión para donar o recibir donaciones',
            'E-mail': 'Correo electrónico',
            'Senha': 'Contraseña',
            'ENTRAR': 'ENTRAR',
            'Doador:': 'Donante:',
            'Recebedor:': 'Receptor:',
            'Ainda não tem conta?': '¿Aún no tienes cuenta?',
            'Cadastre-se aqui': 'Regístrate aquí',
            'Já tem uma conta?': '¿Ya tienes una cuenta?',
            'Faça login aqui': 'Inicia sesión aquí',
            'Sua senha': 'Tu contraseña',
            'seu@email.com': 'tu@email.com',

            // Cadastro
            'Crie sua conta para doar ou receber': 'Crea tu cuenta para donar o recibir',
            'Nome': 'Nombre',
            'Seu nome completo': 'Tu nombre completo',
            'Crie uma senha': 'Crea una contraseña',
            'O que você quer fazer no FAP SOLIDÁRIO?': '¿Qué deseas hacer en FAP SOLIDÁRIO?',
            'O que você quer fazer no FAP Solidário?': '¿Qué deseas hacer en FAP SOLIDÁRIO?',
            'Quero DOAR': 'Quiero DONAR',
            'Quero RECEBER': 'Quiero RECIBIR',
            'Doador Comum': 'Donante Común',
            'Empresa': 'Empresa',
            'Empresa / Organização': 'Empresa / Organización',
            'Beneficiário': 'Beneficiario',
            'Beneficiário (receber doações)': 'Beneficiario (recibir donaciones)',
            'CADASTRAR': 'REGISTRARSE',
            'Você poderá registrar doações de alimentos, roupas, higiene, móveis e dinheiro.': 'Podrás registrar donaciones de alimentos, ropa, higiene, muebles y dinero.',
            'Sua empresa aparece no ranking de doações do dashboard e no registro de estoque.': 'Tu empresa aparece en el ranking de donaciones del panel y en el registro de inventario.',
            'Você terá acesso às abas para solicitar doações disponíveis e acompanhar seus pedidos.': 'Tendrás acceso a las pestañas para solicitar donaciones disponibles y dar seguimiento a tus solicitudes.',

            // Menu e Navegação
            'Abrindo seu menu...': 'Abriendo tu menú...',
            'Se não for redirecionado, faça login novamente.': 'Si no eres redirigido, inicia sesión nuevamente.',
            'faça login novamente': 'inicia sesión nuevamente',
            'clique aqui': 'haz clic aquí',
            'Abrindo a área de recebimento de doações...': 'Abriendo el área de recepción de donaciones...',
            'Bem-vindo(a)!': '¡Bienvenido(a)!',
            'FAZER DOACOES': 'HACER DONACIONES',
            'FAZER DOAÇÕES': 'HACER DONACIONES',
            'ESTOQUE DE DOACOES': 'INVENTARIO DE DONACIONES',
            'ESTOQUE DE DOAÇÕES': 'INVENTARIO DE DONACIONES',
            'DASHBOARD': 'PANEL DE CONTROL',
            'MAIS INFORMACOES': 'MÁS INFORMACIÓN',
            'MAIS INFORMAÇÕES': 'MÁS INFORMACIÓN',
            'SAIR DA CONTA': 'CERRAR SESIÓN',
            'SAIR': 'SALIR',
            'Sair': 'Salir',
            'Menu': 'Menú',
            'VOLTAR': 'VOLVER',
            'Voltar': 'Volver',
            'Categorias': 'Categorías',
            'Estoque': 'Inventario',
            'Dashboard': 'Panel',

            // Doar / Categorias
            'ESCOLHA COMO DOAR': 'ELIGE CÓMO DONAR',
            'Selecione a categoria desejada para encontrar pontos de coleta': 'Selecciona la categoría deseada para encontrar puntos de recolección',
            'Roupas e Acessórios': 'Ropa y Accesorios',
            'Agasalhos, calçados, cobertores e vestuário em geral.': 'Abrigos, calzado, cobijas y vestimenta en general.',
            'Alimentos Não Perecíveis': 'Alimentos No Perecederos',
            'Arroz, feijão, óleo, leite em pó, café, macarrão e cestas básicas completas.': 'Arroz, frijoles, aceite, leche en polvo, café, fideos y canastas básicas completas.',
            'Itens de Higiene': 'Artículos de Higiene',
            'Sabonete, pasta de dente, escovas, papel higiênico e produtos de limpeza doméstica.': 'Jabón, pasta de dientes, cepillos, papel higiénico y productos de limpieza para el hogar.',
            'Móveis e Utensílios': 'Muebles y Utensilios',
            'Camas, colchões, mesas, cadeiras, fogões, geladeiras e utilidades do lar.': 'Camas, colchones, mesas, sillas, estufas, refrigeradores y artículos del hogar.',
            'Itens Culturais e Livros': 'Artículos Culturales y Libros',
            'Livros didáticos e literários, cadernos, mochilas e materiais escolares.': 'Libros de texto y literarios, cuadernos, mochilas y útiles escolares.',
            'Doações Financeiras': 'Donaciones Financieras',
            'Apoie instituições com transferências via PIX ou conta bancária direta.': 'Apoya instituciones con transferencias PIX o cuenta bancaria directa.',
            'Ver locais de coleta →': 'Ver puntos de recolección →',
            'Ver chaves e dados →': 'Ver claves y datos →',

            // Listagem de Locais
            'Todas as Doações': 'Todas las Donaciones',
            'Roupas': 'Ropa',
            'Alimentos': 'Alimentos',
            'Higiene & Móveis': 'Higiene & Muebles',
            'Dinheiro': 'Dinero',
            'DOAÇÃO DE ALIMENTOS': 'DONACIÓN DE ALIMENTOS',
            'Pontos de arrecadação para alimentos não perecíveis, leite e cestas básicas para famílias em vulnerabilidade.': 'Puntos de recolección de alimentos no perecederos, leche y canastas básicas para familias en vulnerabilidad.',
            'DOAÇÃO DE ROUPAS & ACESSÓRIOS': 'DONACIÓN DE ROPA Y ACCESORIOS',
            'Pontos para doar agasalhos, calçados, cobertores e roupas em bom estado.': 'Puntos para donar abrigos, calzado, cobijas y ropa en buen estado.',
            'MÓVEIS, HIGIENE E UTILIDADES': 'MUEBLES, HIGIENE Y UTILIDADES',
            'Pontos de coleta para móveis, eletrodomésticos, kits de higiene e produtos de limpeza.': 'Puntos de recolección de muebles, electrodomésticos, kits de higiene y productos de limpieza.',
            'DOAÇÕES EM DINHEIRO': 'DONACIONES EN DINERO',
            'Contribua diretamente via PIX ou transferência para instituições cadastradas.': 'Contribuye directamente mediante PIX o transferencia bancaria a instituciones registradas.',
            'Buscar por instituição, endereço ou bairro...': 'Buscar por institución, dirección o barrio...',
            'Limpar busca': 'Limpiar búsqueda',
            'Copiar': 'Copiar',
            'Copiada!': '¡Copiada!',
            'Copiar morada para o Waze ou GPS': 'Copiar dirección a Waze o GPS',
            'WhatsApp': 'WhatsApp',
            'Ligar': 'Llamar',
            'Contato presencial': 'Contacto presencial',
            'Ponto de Coleta': 'Punto de Recolección',
            'Instituição Solidária': 'Institución Solidaria',

            // Estoque
            'DASHBOARD ANALÍTICO': 'PANEL ANALÍTICO',
            'Visualização em tempo real do estoque de doações': 'Visualización en tiempo real del inventario de donaciones',
            'Total de Itens': 'Total de Artículos',
            'Quantidade Total': 'Cantidad Total',
            'Ranking de Doações por Empresa': 'Ranking de Donaciones por Empresa',
            'Itens por Categoria': 'Artículos por Categoría',
            'Nenhuma doação por empresa registrada ainda.': 'Aún no hay donaciones de empresas registradas.',
            'Nenhum item em estoque para exibir no gráfico.': 'No hay artículos en inventario para mostrar en el gráfico.',
            'Cadastrar Novo Item no Estoque': 'Registrar Nuevo Artículo en Inventario',
            'Nome do Item': 'Nombre del Artículo',
            'Categoria': 'Category',
            'Quantidade': 'Cantidad',
            'Unidade': 'Unidad',
            'Local de Armazenamento': 'Lugar de Almacenamiento',
            'Descrição / Observações': 'Descripción / Observaciones',
            'Adicionar ao Estoque': 'Agregar al Inventario',
            'Filtro por Categoria:': 'Filtrar por Categoría:',
            'Todos': 'Todos',
            'Item': 'Artículo',
            'Status': 'Estado',
            'Data': 'Fecha',
            'Ações': 'Acciones',
            'Disponível': 'Disponible',
            'Reservado': 'Reservado',
            'Entregue': 'Entregado',
            'Remover': 'Eliminar',

            // Receber
            'RECEBER DOAÇÕES': 'RECIBIR DONACIONES',
            'Itens Disponíveis para Doação': 'Artículos Disponibles para Donación',
            'Meus Pedidos de Doação': 'Mis Solicitudes de Donación',
            'Solicitar Item': 'Solicitar Artículo',
            'Quantidade Desejada': 'Cantidad Deseada',
            'Justificativa / Observação': 'Justificación / Nota',
            'Confirmar Pedido': 'Confirmar Solicitud',
            'Cancelar': 'Cancelar',
            'Pendente': 'Pendiente',
            'Aprovado': 'Aprobado',
            'Nenhum item disponível nesta categoria no momento.': 'No hay artículos disponibles en esta categoría en este momento.',
            'Você ainda não fez nenhum pedido de doação.': 'Aún no has realizado ninguna solicitud de donación.',

            // Informações
            'INFORMAÇÕES INSTITUCIONAIS': 'INFORMACIÓN INSTITUCIONAL',
            'Fazer Doação': 'Hacer Donación',
            'Informações': 'Información'
        }
    };

    function obterIdioma() {
        try {
            const salvo = localStorage.getItem(CHAVE_STORAGE);
            if (salvo === 'pt' || salvo === 'en' || salvo === 'es') return salvo;
        } catch (e) {
            console.warn('[Tradutor] Falha ao ler localStorage:', e);
        }
        return IDIOMA_PADRAO;
    }

    function salvarIdioma(lang) {
        try {
            localStorage.setItem(CHAVE_STORAGE, lang);
        } catch (e) {
            console.warn('[Tradutor] Falha ao salvar localStorage:', e);
        }
    }

    function traduzirTexto(texto, idioma) {
        if (!texto || idioma === 'pt') return texto;
        const dict = DICIONARIO[idioma];
        if (!dict) return texto;

        const trim = texto.trim();
        if (dict[trim]) {
            return texto.replace(trim, dict[trim]);
        }
        return texto;
    }

    function aplicarTraducoes(idioma) {
        document.documentElement.lang = idioma === 'pt' ? 'pt-BR' : idioma;

        // 1. Traduzir nós de texto
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest('.seletor-idioma') || parent.closest('.notranslate')) {
                    return NodeFilter.FILTER_REJECT;
                }
                const tag = parent.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE') {
                    return NodeFilter.FILTER_REJECT;
                }
                if (!node.nodeValue || node.nodeValue.trim() === '') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) {
            textNodes.push(n);
        }

        textNodes.forEach((node) => {
            // Guardar o texto original em português
            if (node.__originalText === undefined) {
                node.__originalText = node.nodeValue;
            }
            if (idioma === 'pt') {
                node.nodeValue = node.__originalText;
            } else {
                node.nodeValue = traduzirTexto(node.__originalText, idioma);
            }
        });

        // 2. Placeholders de input e textarea
        document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
            if (el.__origPlaceholder === undefined) {
                el.__origPlaceholder = el.getAttribute('placeholder');
            }
            if (idioma === 'pt') {
                el.setAttribute('placeholder', el.__origPlaceholder);
            } else {
                const trad = traduzirTexto(el.__origPlaceholder, idioma);
                el.setAttribute('placeholder', trad);
            }
        });

        // 3. Document Title
        if (document.__origTitle === undefined) {
            document.__origTitle = document.title;
        }
        if (idioma === 'pt') {
            document.title = document.__origTitle;
        } else {
            document.title = traduzirTexto(document.__origTitle, idioma);
        }
    }

    function atualizarBotoes(idioma) {
        document.querySelectorAll('.btn-lang').forEach((btn) => {
            if (btn.dataset.lang === idioma) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function configurarEventos() {
        document.querySelectorAll('.btn-lang').forEach((btn) => {
            btn.onclick = function (e) {
                e.preventDefault();
                const lang = this.dataset.lang;
                if (!lang) return;
                salvarIdioma(lang);
                atualizarBotoes(lang);
                aplicarTraducoes(lang);
            };
        });
    }

    function iniciar() {
        configurarEventos();
        const idioma = obterIdioma();
        atualizarBotoes(idioma);
        if (idioma !== 'pt') {
            aplicarTraducoes(idioma);
        }
    }

    window.FAPTradutor = {
        obterIdioma,
        definirIdioma(lang) {
            salvarIdioma(lang);
            atualizarBotoes(lang);
            aplicarTraducoes(lang);
        },
        atualizar: () => aplicarTraducoes(obterIdioma())
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
