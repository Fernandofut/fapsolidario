document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-sair').addEventListener('click', (evento) => {
        evento.preventDefault();
        FAP.sair();
    });

    fetch('/api/auth/sessao', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((sessao) => {
            document.getElementById('boas-vindas').textContent =
                'Olá, ' + sessao.nome + ' (' + sessao.tipo + ') - Área do doador';
        })
        .catch(() => {
            window.location.href = '/index.html';
        });
});
