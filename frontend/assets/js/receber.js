document.addEventListener('DOMContentLoaded', () => {
    const CATEGORIAS = {
        alimentos: ['alimento', 'cesta'],
        roupas: ['roupa', 'acessório', 'acessorio', 'calçado', 'calcado', 'sapato'],
        higiene: ['higiene', 'limpeza', 'cuidados'],
        moveis: ['móvel', 'moveis', 'móvels', 'casa'],
        cultura: ['cultural', 'livro', 'escolar', 'educação', 'educacao', 'brinquedo'],
        dinheiro: ['dinheiro']
    };

    const ROTULOS = {
        alimentos: 'Alimentos',
        roupas: 'Roupas',
        higiene: 'Higiene',
        moveis: 'Móveis',
        cultura: 'Itens Culturais',
        dinheiro: 'Dinheiro'
    };

    const STATUS_PEDIDO = {
        pendente_contato: { texto: 'Aguardando Contato da Empresa', classe: 'status-pendente' },
        pendente: { texto: 'Aguardando Contato da Empresa', classe: 'status-pendente' },
        solicitado: { texto: 'Aguardando Contato da Empresa', classe: 'status-pendente' },
        concluido: { texto: 'Concluído', classe: 'status-concluido' },
        cancelado: { texto: 'Cancelado', classe: 'status-cancelado' }
    };

    let estoque = [];
    let abaAtiva = 'alimentos';
    let itemAlvo = null;

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function showToast(msg, tipo) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast ' + tipo + ' mostrar';
        setTimeout(() => {
            t.className = 'toast';
        }, 3500);
    }

    function categoriaCompativel(categoria, aba) {
        const texto = (categoria || '').toLowerCase();
        if (!CATEGORIAS[aba]) return false;
        return CATEGORIAS[aba].some((palavra) => texto.includes(palavra));
    }

    function abrirModal(id, nome, disponivel) {
        itemAlvo = { id, disponivel };
        document.getElementById('modal-item-nome').textContent = nome + ' — disponível: ' + disponivel;
        const campoQtd = document.getElementById('modal-qtd');
        campoQtd.value = 1;
        campoQtd.max = disponivel;
        document.getElementById('modal-solicitacao').classList.add('ativo');
    }

    function fecharModal() {
        document.getElementById('modal-solicitacao').classList.remove('ativo');
        itemAlvo = null;
    }

    async function confirmarSolicitacao() {
        if (!itemAlvo) return;
        const qtd = parseInt(document.getElementById('modal-qtd').value, 10);
        if (!qtd || qtd <= 0) {
            showToast('Quantidade inválida.', 'erro');
            return;
        }
        if (qtd > itemAlvo.disponivel) {
            showToast('Quantidade superior à disponível.', 'erro');
            return;
        }

        const botao = document.getElementById('btn-confirmar-solicitacao');
        const botaoCancelar = document.getElementById('btn-cancelar-solicitacao');
        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botaoCancelar.disabled = true;
        botao.textContent = 'Enviando...';

        try {
            const resposta = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id_item: itemAlvo.id, quantidade_pedida: qtd })
            });

            let dados = null;
            try {
                dados = await resposta.json();
            } catch {
                dados = null;
            }

            if (resposta.ok) {
                showToast(
                    'Solicitação enviada com sucesso! A instituição recebeu seus dados e entrará em contato via WhatsApp/Telefone para combinar a entrega.',
                    'sucesso'
                );
                fecharModal();
                carregarEstoque();
                carregarPedidos();
            } else {
                showToast((dados && dados.mensagem) || 'Erro ao solicitar.', 'erro');
            }
        } catch {
            showToast('Erro de conexão.', 'erro');
        } finally {
            botao.disabled = false;
            botaoCancelar.disabled = false;
            botao.textContent = textoOriginal;
        }
    }

    function renderizarItens() {
        const grade = document.getElementById('grade-itens');
        const itens = estoque.filter(
            (item) => item.quantidade > 0 && categoriaCompativel(item.categoria, abaAtiva)
        );

        if (itens.length === 0) {
            grade.innerHTML =
                '<p class="vazio" style="grid-column:1/-1">Nenhum item disponível nesta categoria no momento. Volte em breve!</p>';
            return;
        }

        let html = '';
        itens.forEach((item) => {
            html +=
                '<article class="card-item">' +
                '<span class="badge">' +
                escapeHtml(ROTULOS[abaAtiva]) +
                '</span>' +
                '<h3>' +
                escapeHtml(item.nome_item) +
                '</h3>' +
                '<span class="detalhe">Doação de: ' +
                escapeHtml(item.empresa_nome) +
                '</span>' +
                (item.data_validade
                    ? '<span class="detalhe">Validade: ' + escapeHtml(item.data_validade) + '</span>'
                    : '') +
                '<span class="disponivel">Disponível: ' +
                item.quantidade +
                ' un.</span>' +
                '<button type="button" class="btn-solicitar" data-id="' +
                item.id +
                '" data-nome="' +
                escapeHtml(item.nome_item) +
                '" data-disp="' +
                item.quantidade +
                '">SOLICITAR</button>' +
                '</article>';
        });
        grade.innerHTML = html;

        grade.querySelectorAll('.btn-solicitar').forEach((btn) => {
            btn.addEventListener('click', function () {
                abrirModal(
                    parseInt(this.getAttribute('data-id'), 10),
                    this.getAttribute('data-nome'),
                    parseInt(this.getAttribute('data-disp'), 10)
                );
            });
        });
    }

    function renderizarPedidos(pedidos) {
        const corpo = document.getElementById('corpo-pedidos');
        if (!pedidos || pedidos.length === 0) {
            corpo.innerHTML = '<tr class="vazio"><td colspan="6">Você ainda não fez pedidos.</td></tr>';
            return;
        }
        let html = '';
        pedidos.forEach((p) => {
            const status = STATUS_PEDIDO[p.status] || {
                texto: p.status || 'Não informado',
                classe: 'status-neutro'
            };
            html +=
                '<tr>' +
                '<td>' +
                p.id +
                '</td>' +
                '<td>' +
                escapeHtml(p.nome_item) +
                '</td>' +
                '<td>' +
                escapeHtml(p.categoria) +
                '</td>' +
                '<td>' +
                p.quantidade_pedida +
                '</td>' +
                '<td>' +
                escapeHtml(p.data_pedido) +
                '</td>' +
                '<td><span class="status-pedido ' +
                status.classe +
                '">' +
                escapeHtml(status.texto) +
                '</span></td>' +
                '</tr>';
        });
        corpo.innerHTML = html;
    }

    function carregarEstoque() {
        fetch('/api/estoque', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((dados) => {
                estoque = dados;
                renderizarItens();
            })
            .catch(() => {
                document.getElementById('grade-itens').innerHTML =
                    '<p class="vazio" style="grid-column:1/-1">Erro ao carregar os itens disponíveis.</p>';
            });
    }

    function carregarPedidos() {
        fetch('/api/pedidos', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(renderizarPedidos)
            .catch(() => {
                document.getElementById('corpo-pedidos').innerHTML =
                    '<tr class="vazio"><td colspan="6">Erro ao carregar seus pedidos.</td></tr>';
            });
    }

    document.getElementById('btn-sair').addEventListener('click', (evento) => {
        evento.preventDefault();
        FAP.sair();
    });

    document.getElementById('btn-cancelar-solicitacao').addEventListener('click', fecharModal);
    document.getElementById('btn-confirmar-solicitacao').addEventListener('click', confirmarSolicitacao);

    document.getElementById('abas').addEventListener('click', function (evento) {
        const botao = evento.target.closest('.aba');
        if (!botao) return;

        document.querySelectorAll('.aba').forEach((a) => a.classList.remove('ativa'));
        botao.classList.add('ativa');
        abaAtiva = botao.getAttribute('data-aba');

        const mostrarPedidos = abaAtiva === 'pedidos';
        document.getElementById('painel-itens').hidden = mostrarPedidos;
        document.getElementById('painel-pedidos').hidden = !mostrarPedidos;

        if (mostrarPedidos) {
            carregarPedidos();
        } else {
            renderizarItens();
        }
    });

    fetch('/api/auth/sessao', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((sessao) => {
            document.getElementById('boas-vindas').textContent =
                'Olá, ' + sessao.nome + ' (' + sessao.tipo + ') - escolha abaixo o que você precisa receber.';
        })
        .catch(() => {
            window.location.href = '/index.html';
        });

    carregarEstoque();
});
