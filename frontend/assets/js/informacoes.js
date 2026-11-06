/**
 * informacoes.js — carrega dinamicamente as instituições e pontos de coleta
 * cadastrados na página de informações (via /api/locais).
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.LocaisSolidarios) return;
    LocaisSolidarios.carregarLocais('', 'lista-locais');
});
