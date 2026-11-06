document.addEventListener('DOMContentLoaded', () => {
    if (!window.LocaisSolidarios) return;
    LocaisSolidarios.carregarLocais('alimentos', 'lista-locais');
});
