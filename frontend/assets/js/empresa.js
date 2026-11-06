/**
 * empresa.js — aba "Solicitações Recebidas" da Empresa/Ponto de Coleta.
 *
 * Consome GET /api/empresa/solicitacoes e PATCH /api/pedidos/:id/status.
 * Toda a interface é criada com textContent/DOM (sem innerHTML dinâmico e sem
 * handlers inline), respeitando a Content-Security-Policy do servidor.
 */
(function () {
    'use strict';

    const ROTULOS_STATUS = {
        PENDENTE: 'Pendente',
        EM_ATENDIMENTO: 'Em atendimento',
        ENTREGUE: 'Entregue',
        CANCELADO: 'Cancelado'
    };
    const STATUS_TERMINAIS = ['ENTREGUE', 'CANCELADO'];
    const OPCOES_STATUS = ['PENDENTE', 'EM_ATENDIMENTO', 'ENTREGUE', 'CANCELADO'];
    const ROTULOS_PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

    let solicitacoes = [];
    let filtroAtual = 'TODOS';
    let carregando = false;
    let empresaAtual = null;

    function normalizar(valor) {
        return String(valor || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\s-]+/g, '_');
    }

    function ehEmpresa(usuario) {
        if (!usuario) return false;
        const tipo = normalizar(usuario.tipo);
        const papel = normalizar(usuario.papel);
        return (
            ['empresa', 'ponto_de_coleta', 'instituicao', 'ong'].includes(tipo) ||
            ['empresa', 'ponto_de_coleta'].includes(papel)
        );
    }

    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined && texto !== null) elemento.textContent = texto;
        return elemento;
    }

    function normalizarStatus(status) {
        const chave = normalizar(status).toUpperCase();
        if (chave === 'CONCLUIDO') return 'ENTREGUE';
        return ROTULOS_STATUS[chave] ? chave : 'PENDENTE';
    }

    function formatarData(valor) {
        const texto = String(valor || '');
        const partes = texto.split(' ');
        const data = (partes[0] || '').split('-');
        if (data.length !== 3) return texto || 'Data não informada';
        const hora = (partes[1] || '').slice(0, 5);
        return `${data[2]}/${data[1]}/${data[0]}${hora ? ` ${hora}` : ''}`;
    }

    function anunciar(mensagem, erro) {
        const aviso = document.getElementById('sol-aviso');
        if (!aviso) return;
        aviso.textContent = mensagem || '';
        aviso.classList.toggle('erro', Boolean(erro));
    }

    function obterSolicitacoesDaResposta(resposta) {
        if (Array.isArray(resposta)) return resposta;
        if (resposta && Array.isArray(resposta.solicitacoes)) return resposta.solicitacoes;
        if (resposta && Array.isArray(resposta.pedidos)) return resposta.pedidos;
        return [];
    }

    function contarPorStatus(status) {
        return solicitacoes.filter((item) => normalizarStatus(item.status) === status).length;
    }

    function atualizarResumo() {
        document.getElementById('sol-total').textContent = String(solicitacoes.length);
        document.getElementById('sol-pendentes').textContent = String(contarPorStatus('PENDENTE'));
        document.getElementById('sol-atendimento').textContent = String(contarPorStatus('EM_ATENDIMENTO'));
        document.getElementById('sol-entregues').textContent = String(contarPorStatus('ENTREGUE'));
    }

    function preencherItem(celula, solicitacao) {
        const nome = solicitacao.nome_item || (solicitacao.item && solicitacao.item.nome_item) || 'Item';
        const categoria =
            solicitacao.categoria || (solicitacao.item && solicitacao.item.categoria) || 'Sem categoria';
        const quantidade =
            solicitacao.quantidade_solicitada || solicitacao.quantidade || (solicitacao.item && solicitacao.item.quantidade) || 0;

        celula.appendChild(criar('span', 'sol-item-nome', nome));
        celula.appendChild(criar('span', 'sol-item-meta', `${categoria} • Solicitado: ${quantidade} un.`));
    }

    function preencherFicha(celula, solicitacao) {
        const ficha = solicitacao.beneficiario || solicitacao.solicitante || {};
        const prioridade = solicitacao.prioridade_social || {};
        const composicao =
            ficha.composicao_familiar_texto ||
            `${ficha.adultos || 0} adulto(s), ${ficha.criancas || 0} criança(s), ${ficha.idosos || 0} idoso(s)`;

        celula.appendChild(criar('span', 'sol-ficha-nome', ficha.nome || 'Beneficiário não informado'));
        celula.appendChild(criar('span', 'sol-ficha-linha', composicao));
        celula.appendChild(
            criar('span', 'sol-ficha-linha', `NIS: ${ficha.possui_nis || prioridade.possui_nis ? ficha.nis || 'Informado' : 'Não informado'}`)
        );
        celula.appendChild(
            criar('span', 'sol-ficha-linha', `Renda: ${ficha.faixa_renda || ficha.renda_familiar || 'Não informada'}`)
        );
        if (ficha.endereco_completo) {
            celula.appendChild(criar('span', 'sol-ficha-linha', ficha.endereco_completo));
        }
        if (ficha.necessidades) {
            celula.appendChild(criar('span', 'sol-ficha-linha', `Necessidades: ${ficha.necessidades}`));
        }
    }

    function preencherPrioridade(celula, solicitacao) {
        const prioridade = solicitacao.prioridade_social || {};
        const nivel = ROTULOS_PRIORIDADE[prioridade.nivel] ? prioridade.nivel : 'baixa';
        celula.appendChild(
            criar('span', `sol-badge sol-badge-prioridade-${nivel}`, ROTULOS_PRIORIDADE[nivel])
        );
        celula.appendChild(
            criar(
                'span',
                'sol-prio-detalhe',
                `${prioridade.criancas || 0} criança(s), ${prioridade.idosos || 0} idoso(s), ` +
                    `${prioridade.total_familia || 0} pessoa(s) na família`
            )
        );
        celula.appendChild(
            criar('span', 'sol-prio-detalhe', prioridade.possui_nis ? 'NIS informado' : 'NIS não informado')
        );
    }

    function preencherContato(celula, solicitacao) {
        const ficha = solicitacao.beneficiario || solicitacao.solicitante || {};
        const telefone = String(ficha.telefone || '').trim();
        const whatsapp = String(ficha.whatsapp || '').replace(/\D/g, '');

        if (!telefone && !whatsapp) {
            celula.appendChild(criar('span', 'sol-contato-vazio', 'Sem contato'));
            return;
        }

        const grupo = criar('div', 'sol-contato');
        if (whatsapp) {
            const linkWhats = criar('a', 'sol-whatsapp', 'WhatsApp');
            linkWhats.href = `https://wa.me/${whatsapp}`;
            linkWhats.target = '_blank';
            linkWhats.rel = 'noopener noreferrer';
            grupo.appendChild(linkWhats);
        }
        if (telefone) {
            const linkTel = criar('a', 'sol-telefone', 'Ligar');
            linkTel.href = `tel:${telefone.replace(/[^\d+]/g, '')}`;
            grupo.appendChild(linkTel);
        }
        celula.appendChild(grupo);
    }

    function montarSeletorStatus(solicitacao) {
        const statusAtual = normalizarStatus(solicitacao.status);
        const seletor = criar('select', 'sol-status-select');
        seletor.setAttribute('aria-label', `Status da solicitação ${solicitacao.id || ''}`);

        OPCOES_STATUS.forEach((status) => {
            const opcao = document.createElement('option');
            opcao.value = status;
            opcao.textContent = ROTULOS_STATUS[status];
            if (status === statusAtual) opcao.selected = true;
            seletor.appendChild(opcao);
        });

        seletor.disabled = STATUS_TERMINAIS.includes(statusAtual);
        seletor.addEventListener('change', () => {
            alterarStatus(solicitacao, seletor, statusAtual);
        });
        return seletor;
    }

    async function alterarStatus(solicitacao, seletor, statusAnterior) {
        const novoStatus = seletor.value;
        if (novoStatus === statusAnterior) return;

        if (novoStatus === 'CANCELADO') {
            const confirmar = window.confirm(
                'Cancelar esta solicitação? A quantidade voltará ao estoque do ponto de coleta.'
            );
            if (!confirmar) {
                seletor.value = statusAnterior;
                return;
            }
        }
        if (novoStatus === 'ENTREGUE') {
            const confirmar = window.confirm('Confirmar a entrega desta solicitação?');
            if (!confirmar) {
                seletor.value = statusAnterior;
                return;
            }
        }

        seletor.disabled = true;
        anunciar('Atualizando status...', false);
        try {
            const resposta = await FAP.requisitar('PATCH', `/api/pedidos/${solicitacao.id}/status`, {
                status: novoStatus
            });
            const atualizada = (resposta && (resposta.solicitacao || resposta.pedido)) || null;
            if (atualizada) {
                Object.keys(atualizada).forEach((chave) => {
                    solicitacao[chave] = atualizada[chave];
                });
            } else {
                solicitacao.status = novoStatus;
            }
            anunciar(`Solicitação atualizada para "${ROTULOS_STATUS[novoStatus]}".`, false);
            renderizar();
        } catch (erro) {
            seletor.value = statusAnterior;
            seletor.disabled = STATUS_TERMINAIS.includes(statusAnterior);
            anunciar(erro.message || 'Não foi possível atualizar o status.', true);
        }
    }

    function criarLinha(solicitacao) {
        const linha = document.createElement('tr');

        const celulas = [
            ['Item', (celula) => preencherItem(celula, solicitacao)],
            ['Solicitante / Ficha', (celula) => preencherFicha(celula, solicitacao)],
            ['Prioridade social', (celula) => preencherPrioridade(celula, solicitacao)],
            ['Contato', (celula) => preencherContato(celula, solicitacao)],
            ['Data', (celula) => celula.appendChild(criar('span', 'sol-data', formatarData(solicitacao.data_solicitacao)))],
            ['Status', (celula) => celula.appendChild(montarSeletorStatus(solicitacao))]
        ];

        celulas.forEach(([rotulo, preencher]) => {
            const celula = document.createElement('td');
            celula.dataset.label = rotulo;
            preencher(celula);
            linha.appendChild(celula);
        });

        return linha;
    }

    function renderizar() {
        atualizarResumo();

        const corpo = document.getElementById('sol-corpo');
        const vazio = document.getElementById('sol-vazio');
        const tabela = document.getElementById('sol-tabela-wrap');
        if (!corpo || !vazio || !tabela) return;

        corpo.textContent = '';
        const filtradas =
            filtroAtual === 'TODOS'
                ? solicitacoes
                : solicitacoes.filter((item) => normalizarStatus(item.status) === filtroAtual);

        vazio.hidden = filtradas.length > 0;
        tabela.hidden = filtradas.length === 0;
        filtradas.forEach((solicitacao) => corpo.appendChild(criarLinha(solicitacao)));
    }

    async function carregarSolicitacoes() {
        if (carregando) return;
        carregando = true;
        const botao = document.getElementById('sol-recarregar');
        const carregandoTexto = document.getElementById('sol-carregando');
        if (botao) botao.disabled = true;
        if (carregandoTexto) carregandoTexto.hidden = false;
        anunciar('', false);

        try {
            const resposta = await FAP.get('/api/empresa/solicitacoes');
            solicitacoes = obterSolicitacoesDaResposta(resposta);
            renderizar();
        } catch (erro) {
            solicitacoes = [];
            renderizar();
            anunciar(erro.message || 'Erro ao carregar as solicitações recebidas.', true);
        } finally {
            carregando = false;
            if (botao) botao.disabled = false;
            if (carregandoTexto) carregandoTexto.hidden = true;
        }
    }

    function ativarAbaSolicitacoes() {
        const painel = document.getElementById('painel-solicitacoes');
        const analitico = document.getElementById('painel-analitico');
        const navSolicitacoes = document.getElementById('nav-solicitacoes');
        const navDashboard = document.getElementById('nav-dashboard');

        if (painel) painel.hidden = false;
        if (analitico) analitico.hidden = true;
        if (navSolicitacoes) {
            navSolicitacoes.hidden = false;
            navSolicitacoes.classList.add('ativo');
        }
        if (navDashboard) navDashboard.classList.remove('ativo');

        const subtitulo = document.getElementById('sol-subtitulo');
        if (subtitulo && empresaAtual) {
            subtitulo.textContent = `Pedidos feitos aos itens de ${empresaAtual.nome}.`;
        }
        document.title = 'FAP SOLIDÁRIO - Solicitações Recebidas';
        carregarSolicitacoes();
    }

    function configurarEventos() {
        const recarregar = document.getElementById('sol-recarregar');
        if (recarregar) recarregar.addEventListener('click', carregarSolicitacoes);

        document.querySelectorAll('#sol-filtros .sol-filtro').forEach((botao) => {
            botao.addEventListener('click', () => {
                document.querySelectorAll('#sol-filtros .sol-filtro').forEach((outro) => {
                    outro.classList.toggle('ativo', outro === botao);
                });
                filtroAtual = botao.dataset.status || 'TODOS';
                renderizar();
            });
        });
    }

    async function iniciar() {
        configurarEventos();

        let usuario = null;
        try {
            usuario = await FAP.sessao();
        } catch {
            usuario = null;
        }
        if (!ehEmpresa(usuario)) return;

        empresaAtual = usuario;
        const navSolicitacoes = document.getElementById('nav-solicitacoes');
        if (navSolicitacoes) navSolicitacoes.hidden = false;

        const parametros = new URLSearchParams(window.location.search);
        if (parametros.get('aba') === 'solicitacoes') ativarAbaSolicitacoes();
    }

    document.addEventListener('DOMContentLoaded', iniciar);
})();
