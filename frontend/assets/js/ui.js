/**
 * ui.js — interações universais de navegação do FAP Solidário.
 *
 * Mantém o estado visual das abas/filtros (.cat-pill) e dos menus (.nav-links)
 * sincronizado com o clique do utilizador, sem depender de handlers inline
 * (bloqueados pela Content-Security-Policy do servidor).
 */
(function () {
    'use strict';

    function marcarAtivo(elemento, classeAtiva) {
        const grupo = elemento.closest('.category-nav, .nav-links');
        const seletor = grupo && grupo.classList.contains('nav-links') ? '.nav-links a' : '.cat-pill';

        document.querySelectorAll(seletor).forEach((item) => {
            item.classList.remove('active', 'ativo');
            item.removeAttribute('aria-current');
        });

        elemento.classList.add(classeAtiva);
        elemento.setAttribute('aria-current', 'page');
    }

    document.addEventListener('click', (evento) => {
        const pill = evento.target.closest('.cat-pill');
        if (pill) {
            marcarAtivo(pill, 'active');
            return;
        }

        const linkMenu = evento.target.closest('.nav-links a');
        if (linkMenu && linkMenu.getAttribute('href') !== '#') {
            marcarAtivo(linkMenu, 'ativo');
        }
    });
})();
