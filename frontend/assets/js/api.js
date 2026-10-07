/* Cliente HTTP do FAP Solidário — o frontend conversa SOMENTE com a API (/api/*). */
window.FAP = (() => {
    const PAGINAS_PUBLICAS = ['/index.html', '/', '/pages/cadastro.html'];
    const PAGINAS_DOADOR = [
        '/pages/opcoes.html',
        '/pages/doar.html',
        '/pages/roupas.html',
        '/pages/alimentos.html',
        '/pages/dinheiro.html',
        '/pages/moveisehigiene.html',
        '/pages/estoque.html',
        '/pages/dashboard.html'
    ];
    const PAGINAS_RECEBEDOR = ['/pages/receber.html'];

    async function requisitar(metodo, caminho, corpo) {
        const opcoes = { method: metodo, headers: {} };
        if (corpo !== undefined) {
            opcoes.headers['Content-Type'] = 'application/json';
            opcoes.body = JSON.stringify(corpo);
        }
        const resposta = await fetch(caminho, opcoes);
        let dados;
        try {
            dados = await resposta.json();
        } catch {
            dados = null;
        }
        if (!resposta.ok) {
            const erro = new Error((dados && dados.mensagem) || 'Erro na requisição (' + resposta.status + ')');
            erro.status = resposta.status;
            erro.dados = dados;
            throw erro;
        }
        return dados;
    }

    const get = (caminho) => requisitar('GET', caminho);
    const post = (caminho, corpo) => requisitar('POST', caminho, corpo);

    function sessao() {
        return get('/api/auth/sessao');
    }

    function sair() {
        post('/api/auth/logout', {})
            .catch(() => {})
            .finally(() => {
                window.location.href = '/index.html';
            });
    }

    async function protegerPagina() {
        const caminho = window.location.pathname === '/' ? '/index.html' : window.location.pathname;
        if (PAGINAS_PUBLICAS.includes(caminho)) return;

        let usuario;
        try {
            usuario = await sessao();
        } catch {
            usuario = null;
        }
        if (!usuario) {
            window.location.replace('/index.html');
            return;
        }
        if (PAGINAS_DOADOR.includes(caminho) && usuario.papel === 'recebedor') {
            window.location.replace('/pages/receber.html');
        } else if (PAGINAS_RECEBEDOR.includes(caminho) && usuario.papel === 'doador') {
            window.location.replace('/pages/opcoes.html');
        }
    }

    protegerPagina();

    return { requisitar, get, post, sessao, sair };
})();
