document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-sair').addEventListener('click', (evento) => {
        evento.preventDefault();
        FAP.sair();
    });

    document.getElementById('form-estoque').addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const form = evento.target;
        const dados = Object.fromEntries(new FormData(form).entries());

        try {
            const resposta = await FAP.post('/api/estoque', dados);
            showToast(resposta.mensagem, 'sucesso');
            form.reset();
            carregarEstoque();
        } catch (erro) {
            showToast(erro.message, 'erro');
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function getCategoriaClass(cat) {
        const c = (cat || '').toLowerCase();
        if (c.includes('alimento')) return 'cat-alimentos';
        if (c.includes('roupa')) return 'cat-roupas';
        if (c.includes('higiene')) return 'cat-higiene';
        if (c.includes('moveis') || c.includes('móvel')) return 'cat-moveis';
        if (c.includes('dinheiro')) return 'cat-dinheiro';
        if (c.includes('cultura') || c.includes('educac')) return 'cat-higiene';
        return 'cat-outros';
    }

    function getValidadeInfo(dataStr) {
        if (!dataStr) return { texto: 'Sem validade', classe: '' };
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const val = new Date(dataStr + 'T00:00:00');
        const diff = Math.ceil((val - hoje) / (1000 * 60 * 60 * 24));
        if (diff < 0) return { texto: dataStr + ' (VENCIDO)', classe: 'v-vencido' };
        if (diff === 0) return { texto: dataStr + ' (HOJE)', classe: 'v-critico' };
        if (diff <= 7) return { texto: dataStr + ' (' + diff + 'd)', classe: 'v-alerta' };
        return { texto: dataStr, classe: 'v-ok' };
    }

    function getLinhaClass(dataStr) {
        if (!dataStr) return '';
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const val = new Date(dataStr + 'T00:00:00');
        const diff = Math.ceil((val - hoje) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'vencido';
        if (diff <= 7) return 'vencendo';
        return '';
    }

    function showToast(msg, tipo) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast ' + tipo + ' mostrar';
        setTimeout(() => {
            t.className = 'toast';
        }, 3500);
    }

    function carregarEstoque() {
        fetch('/api/estoque', { credentials: 'include' })
            .then((r) => {
                if (!r.ok) throw new Error('Erro HTTP ' + r.status);
                return r.json();
            })
            .then((dados) => {
                const corpo = document.getElementById('corpo-tabela');
                if (dados.length === 0) {
                    corpo.innerHTML = '<tr class="vazio"><td colspan="6">Nenhum item cadastrado ainda.</td></tr>';
                    document.getElementById('total-itens').textContent = '0';
                    document.getElementById('total-quantidade').textContent = '0';
                    document.getElementById('total-empresas').textContent = '0';
                    document.getElementById('total-vencendo').textContent = '0';
                    return;
                }
                let html = '',
                    somaQtd = 0,
                    vencendo = 0;
                const empresas = new Set();
                dados.forEach((item) => {
                    somaQtd += item.quantidade;
                    empresas.add(item.empresa_nome);
                    const vi = getValidadeInfo(item.data_validade);
                    const linhaCls = getLinhaClass(item.data_validade);
                    if (linhaCls === 'vencendo') vencendo++;
                    html +=
                        '<tr class="' +
                        linhaCls +
                        '">' +
                        '<td>' +
                        item.id +
                        '</td>' +
                        '<td>' +
                        escapeHtml(item.nome_item) +
                        '</td>' +
                        '<td><span class="badge ' +
                        getCategoriaClass(item.categoria) +
                        '">' +
                        escapeHtml(item.categoria) +
                        '</span></td>' +
                        '<td>' +
                        item.quantidade +
                        '</td>' +
                        '<td>' +
                        escapeHtml(item.empresa_nome) +
                        '</td>' +
                        '<td class="' +
                        vi.classe +
                        '">' +
                        escapeHtml(vi.texto) +
                        '</td>' +
                        '</tr>';
                });
                corpo.innerHTML = html;

                document.getElementById('total-itens').textContent = dados.length;
                document.getElementById('total-quantidade').textContent = somaQtd;
                document.getElementById('total-empresas').textContent = empresas.size;
                document.getElementById('total-vencendo').textContent = vencendo;
            })
            .catch(() => {
                document.getElementById('corpo-tabela').innerHTML =
                    '<tr class="vazio"><td colspan="6">Erro ao carregar estoque.</td></tr>';
                showToast('Erro ao carregar o estoque.', 'erro');
            });
    }

    fetch('/api/auth/sessao', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((sessao) => {
            document.getElementById('subtitulo').textContent =
                'Olá, ' +
                sessao.nome +
                ' (' +
                sessao.tipo +
                ') - registre e acompanhe as doacoes com controle de validade (FIFO)';
            const campoDoador = document.getElementById('empresa_nome');
            if (campoDoador && !campoDoador.value) campoDoador.value = sessao.nome;
        })
        .catch(() => {
            window.location.href = '/index.html';
        });

    carregarEstoque();
});
