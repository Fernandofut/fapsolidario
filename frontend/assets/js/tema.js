/**
 * tema.js — Alternância de tema claro/escuro do FAP Solidário.
 *
 * Executado no <head> para aplicar o tema antes da pintura (evita flash),
 * e novamente no DOMContentLoaded para posicionar o botão ao lado do
 * seletor de idioma. Nenhuma regra de negócio é afetada: apenas o atributo
 * data-theme do <html> e a preferência em localStorage.
 */
(function () {
    'use strict';

    var CHAVE_STORAGE = 'fap_tema';
    var TEMA_PADRAO = 'light';
    var ouvintes = [];
    var temaAtual = TEMA_PADRAO;

    function obterTema() {
        try {
            var salvo = localStorage.getItem(CHAVE_STORAGE);
            if (salvo === 'dark' || salvo === 'light') return salvo;
        } catch (erro) {
            console.warn('[Tema] Não foi possível ler localStorage:', erro);
        }
        return TEMA_PADRAO;
    }

    function sincronizarBotao() {
        var botao = document.getElementById('btn-tema');
        if (!botao) return;
        var escuro = temaAtual === 'dark';
        botao.setAttribute('aria-pressed', String(escuro));
        botao.setAttribute('title', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
        botao.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
    }

    function aplicarTema(tema, persistir) {
        temaAtual = tema === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', temaAtual);
        sincronizarBotao();

        if (persistir) {
            try {
                localStorage.setItem(CHAVE_STORAGE, temaAtual);
            } catch (erro) {
                console.warn('[Tema] Não foi possível salvar localStorage:', erro);
            }
        }

        ouvintes.forEach(function (callback) {
            try {
                callback(temaAtual);
            } catch (erro) {
                console.warn('[Tema] Falha ao notificar consumidor:', erro);
            }
        });
    }

    function alternarTema() {
        aplicarTema(temaAtual === 'dark' ? 'light' : 'dark', true);
    }

    function criarBotao() {
        var botao = document.createElement('button');
        botao.type = 'button';
        botao.id = 'btn-tema';
        botao.className = 'theme-toggle notranslate';
        botao.innerHTML =
            '<svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
            '<svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="4"/>' +
            '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>' +
            '</svg>' +
            '<span class="theme-toggle__text">Tema</span>';

        botao.addEventListener('click', alternarTema);
        return botao;
    }

    function posicionarBotao() {
        if (document.getElementById('btn-tema')) {
            sincronizarBotao();
            return;
        }

        var botao = criarBotao();
        var grupo = document.querySelector('.controles-topo');
        var seletorIdioma = document.querySelector('.seletor-idioma');

        if (!grupo && seletorIdioma && seletorIdioma.parentNode) {
            grupo = document.createElement('div');
            grupo.className = 'controles-topo';
            seletorIdioma.parentNode.insertBefore(grupo, seletorIdioma);
            grupo.appendChild(seletorIdioma);
        }

        if (grupo) {
            grupo.appendChild(botao);
        } else {
            botao.classList.add('theme-toggle--solto');
            (document.body || document.documentElement).appendChild(botao);
        }

        sincronizarBotao();
    }

    function registrarObservador(callback) {
        if (typeof callback !== 'function') return;
        ouvintes.push(callback);
        callback(temaAtual);
    }

    window.FAPTema = {
        obterTema: obterTema,
        definirTema: function (tema) {
            aplicarTema(tema, true);
        },
        alternar: alternarTema,
        aoMudar: registrarObservador
    };

    /* Aplicação imediata (ainda no <head>): sem piscada entre temas. */
    aplicarTema(obterTema(), false);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', posicionarBotao);
    } else {
        posicionarBotao();
    }
})();
