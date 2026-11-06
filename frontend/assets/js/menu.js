document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/auth/sessao', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((sessao) => {
            window.location.href = sessao.papel === 'recebedor' ? '/pages/receber.html' : '/pages/opcoes.html';
        })
        .catch(() => {
            window.location.href = '/index.html';
        });
});
