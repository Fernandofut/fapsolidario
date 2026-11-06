document.addEventListener('DOMContentLoaded', () => {
    if (!window.LocaisSolidarios) return;
    LocaisSolidarios.carregarLocais('higiene', 'lista-higiene');
    LocaisSolidarios.carregarLocais('moveis', 'lista-moveis');
});
