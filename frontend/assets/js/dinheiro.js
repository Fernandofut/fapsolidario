document.addEventListener('DOMContentLoaded', () => {
    if (!window.LocaisSolidarios) return;
    LocaisSolidarios.carregarLocais('dinheiro', 'lista-locais');
});
