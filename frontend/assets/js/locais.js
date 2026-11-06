/**
 * locais.js — Módulo de renderização dinâmica de locais e instituições do FAP Solidário.
 * Inclui:
 *  - Consumo assíncrono de API (/api/locais)
 *  - Ações de chamada telefônica (tel:) e WhatsApp direto (wa.me)
 *  - Botão de ação rápida "Copiar Morada" para área de transferência (Waze/GPS)
 *  - Filtro em tempo real por Nome, Endereço e Bairro à medida que digita
 */

window.LocaisSolidarios = (() => {
    // Cache em memória para cada container registrado na página
    const cacheContainers = {};

    /**
     * Sanitiza strings para exibição segura no DOM.
     */
    function escaparHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Normaliza texto removendo acentos e convertendo para minúsculas.
     */
    function normalizarTexto(str) {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Extrai apenas os números do telefone.
     */
    function extrairDigitos(telefone) {
        if (!telefone) return '';
        return String(telefone).replace(/\D/g, '');
    }

    /**
     * Gera o link nativo de discagem 'tel:' com código do Brasil (55).
     * Usa `telefone_link` da API quando disponível (já normalizado).
     */
    function gerarTelHref(telefone, telefoneLink) {
        let digitos = extrairDigitos(telefoneLink) || extrairDigitos(telefone);
        if (!digitos) return '#';

        if (digitos.length === 10 || digitos.length === 11) {
            digitos = `55${digitos}`;
        }

        return `tel:${digitos}`;
    }

    /**
     * Gera o link direto para o WhatsApp com mensagem pré-formatada.
     * Usa `telefone_link` da API quando disponível (já normalizado).
     */
    function gerarWhatsAppHref(telefone, nomeInstituicao, telefoneLink) {
        let digitos = extrairDigitos(telefoneLink) || extrairDigitos(telefone);
        if (!digitos) return '#';

        if (digitos.length === 10 || digitos.length === 11) {
            digitos = `55${digitos}`;
        }

        const nome = nomeInstituicao ? ` para ${nomeInstituicao}` : '';
        const mensagem = `Olá! Vim através da plataforma FAP Solidário e gostaria de obter informações sobre como fazer doações${nome}.`;

        return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
    }

    /**
     * Copia o endereço da instituição para a área de transferência do usuário.
     * Oferece feedback visual imediato no botão ("Copiado! ✓").
     */
    async function copiarMorada(endereco, botaoElement) {
        if (!endereco) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(endereco);
            } else {
                // Fallback para contextos sem clipboard API
                const textarea = document.createElement('textarea');
                textarea.value = endereco;
                textarea.style.position = 'fixed';
                textarea.style.left = '-999999px';
                textarea.style.top = '-999999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            if (botaoElement) {
                const conteudoOriginal = botaoElement.innerHTML;
                botaoElement.classList.add('copied');
                botaoElement.innerHTML = `
                    <span class="copy-icon">✓</span>
                    <span class="copy-text">Copiada!</span>
                `;
                botaoElement.setAttribute('title', 'Morada copiada com sucesso!');

                setTimeout(() => {
                    botaoElement.classList.remove('copied');
                    botaoElement.innerHTML = conteudoOriginal;
                    botaoElement.setAttribute('title', 'Copiar morada para o Waze ou GPS');
                }, 2000);
            }
        } catch (erro) {
            console.error('Falha ao copiar morada:', erro);
            if (botaoElement) {
                botaoElement.textContent = 'Erro ao copiar';
                setTimeout(() => {
                    botaoElement.innerHTML = `
                        <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                        <span class="copy-text">Copiar</span>
                    `;
                }, 2000);
            }
        }
    }

    /**
     * Ícone SVG do WhatsApp padronizado.
     */
    const ICONE_WHATSAPP = `
        <svg class="whatsapp-icon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.53C9.36 7.53 9.09 7.6 8.87 7.84C8.65 8.08 8.02 8.67 8.02 9.87C8.02 11.07 8.9 12.23 9.02 12.39C9.14 12.55 10.76 15.05 13.25 16.12C13.84 16.38 14.3 16.53 14.66 16.65C15.26 16.84 15.8 16.81 16.23 16.75C16.71 16.68 17.7 16.15 17.91 15.57C18.12 14.99 18.12 14.49 18.06 14.39C18 14.29 17.83 14.23 17.57 14.1C17.32 13.98 16.08 13.37 15.85 13.29C15.62 13.2 15.46 13.16 15.29 13.41C15.13 13.65 14.65 14.23 14.5 14.41C14.36 14.58 14.21 14.6 13.96 14.48C13.71 14.35 12.9 14.09 11.94 13.23C11.19 12.56 10.68 11.73 10.54 11.48C10.39 11.24 10.52 11.11 10.65 10.98C10.76 10.87 10.9 10.69 11.02 10.55C11.15 10.4 11.19 10.3 11.27 10.13C11.35 9.97 11.31 9.82 11.25 9.7C11.19 9.58 10.72 8.42 10.52 7.94C10.33 7.48 10.13 7.54 9.98 7.53H9.53Z"/>
        </svg>
    `;

    /**
     * Monta o HTML de um card de instituição padronizado.
     */
    function renderizarCardLocal(local) {
        const nome = escaparHtml(local.nome || 'Instituição Solidária');
        const telefone = escaparHtml(local.telefone || 'Telefone não informado');
        const telHref = gerarTelHref(local.telefone, local.telefone_link);
        const whatsAppHref = gerarWhatsAppHref(local.telefone, local.nome, local.telefone_link);
        const tipo = escaparHtml(local.tipo || 'Ponto de Coleta');
        const endereco = escaparHtml(local.endereco || 'Barra do Garças - MT');

        let mapaUrl = local.mapa_url;
        if (!mapaUrl || mapaUrl.trim() === '') {
            mapaUrl = `https://maps.google.com/maps?q=${encodeURIComponent(local.nome + ' Barra do Garças MT')}&output=embed`;
        }

        const rotaUrl = `https://maps.google.com/?q=${encodeURIComponent(local.nome + ' ' + (local.endereco || 'Barra do Garças MT'))}`;
        const temTelefone = Boolean(extrairDigitos(local.telefone));

        return `
            <article class="info-card" data-id="${local.id}">
                <div class="card-header-top">
                    <span class="card-badge">📍 ${tipo}</span>
                </div>
                <h2 class="card-title">${nome}</h2>

                <!-- Ações de contato interativas: Ligar (tel:) e WhatsApp direto (wa.me) -->
                <div class="card-contacts-actions">
                    ${temTelefone ? `
                        <a href="${telHref}" class="btn-contact-action btn-call" title="Ligar para ${nome}">
                            <span class="contact-icon">📞</span>
                            <span class="contact-text">${telefone}</span>
                        </a>
                        <a href="${whatsAppHref}" target="_blank" rel="noopener noreferrer" class="btn-contact-action btn-whatsapp" title="Conversar no WhatsApp com ${nome}">
                            ${ICONE_WHATSAPP}
                            <span class="contact-text">WhatsApp</span>
                        </a>
                    ` : `
                        <span class="card-contact" style="background: #f1f5f9; color: #64748b; border-color: #cbd5e1;">
                            📞 Contato presencial
                        </span>
                    `}
                </div>

                <!-- Morada com botão de ação rápida "Copiar Morada" -->
                <div class="card-address-wrapper">
                    <span class="card-address-text" title="${endereco}">
                        📍 ${endereco}
                    </span>
                    <button
                        type="button"
                        class="btn-copy-address"
                        data-endereco="${endereco}"
                        title="Copiar morada para o Waze, Google Maps ou GPS"
                    >
                        <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                        <span class="copy-text">Copiar</span>
                    </button>
                </div>

                <div class="map-container">
                    <iframe
                        src="${escaparHtml(mapaUrl)}"
                        style="border: 0"
                        allowfullscreen=""
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"
                        title="Localização de ${nome}"
                    ></iframe>
                </div>
                <div style="margin-top: 10px; text-align: right;">
                    <a href="${rotaUrl}" target="_blank" rel="noopener noreferrer" class="card-map-link">
                        Ver rota no Google Maps ↗
                    </a>
                </div>
            </article>
        `;
    }

    /**
     * Aplica o filtro de pesquisa textual aos cards de um container específico.
     */
    function aplicarFiltro(termo, containerId) {
        const container = document.getElementById(containerId);
        const dados = cacheContainers[containerId];
        if (!container || !dados) return;

        const termoNorm = normalizarTexto(termo);

        if (!termoNorm) {
            // Sem busca: exibe lista completa do cache
            if (dados.locais.length === 0) {
                container.innerHTML = `
                    <div class="feedback-placeholder empty-state">
                        <div style="font-size: 2.2rem; margin-bottom: 10px;">📦</div>
                        <h3>Nenhum local cadastrado no momento</h3>
                        <p>Ainda não há instituições parceiras cadastradas para esta categoria específica.</p>
                    </div>
                `;
            } else {
                container.innerHTML = dados.locais.map(local => renderizarCardLocal(local)).join('');
            }
            container.classList.toggle('grid-2', dados.locais.length === 2);
            return;
        }

        // Filtra comparando nome e endereço
        const filtrados = dados.locais.filter(local => {
            const nomeNorm = normalizarTexto(local.nome);
            const enderecoNorm = normalizarTexto(local.endereco);
            return nomeNorm.includes(termoNorm) || enderecoNorm.includes(termoNorm);
        });

        if (filtrados.length === 0) {
            container.innerHTML = `
                <div class="feedback-placeholder empty-state">
                    <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
                    <h3>Nenhum local encontrado</h3>
                    <p>Não encontramos nenhuma instituição correspondente a "<strong>${escaparHtml(termo)}</strong>".</p>
                </div>
            `;
            container.classList.remove('grid-2');
        } else {
            container.innerHTML = filtrados.map(local => renderizarCardLocal(local)).join('');
            container.classList.toggle('grid-2', filtrados.length === 2);
        }
    }

    /**
     * Conecta um campo de busca `<input id="filtro-locais">` a todos os containers da página.
     */
    function configurarBarraBusca(inputId = 'filtro-locais') {
        const input = document.getElementById(inputId);
        if (!input || input.dataset.buscaInicializada) return;

        input.dataset.buscaInicializada = 'true';
        const btnLimpar = document.getElementById('btn-limpar-busca');

        function executarBusca() {
            const termo = input.value;
            if (btnLimpar) {
                btnLimpar.style.display = termo.trim() ? 'flex' : 'none';
            }

            // Filtra em todos os containers registrados na página
            Object.keys(cacheContainers).forEach(cId => {
                aplicarFiltro(termo, cId);
            });
        }

        input.addEventListener('input', executarBusca);

        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => {
                input.value = '';
                executarBusca();
                input.focus();
            });
        }
    }

    /**
     * Busca dados da API e renderiza no container especificado.
     * @param {string} categoria - Filtro da categoria (ex: 'roupas', 'alimentos', 'dinheiro', 'higiene', 'moveis')
     * @param {string} containerId - ID do container HTML onde os cards serão inseridos
     */
    async function carregarLocais(categoria = '', containerId = 'lista-locais') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container com ID "${containerId}" não foi encontrado no documento.`);
            return;
        }

        // Exibe estado de carregamento
        container.innerHTML = `
            <div class="feedback-placeholder loading-state">
                <div class="spinner"></div>
                <p>Buscando instituições e pontos de coleta disponíveis...</p>
            </div>
        `;

        try {
            const url = categoria
                ? `/api/locais?categoria=${encodeURIComponent(categoria)}`
                : '/api/locais';

            const resposta = await fetch(url, { credentials: 'include' });
            if (!resposta.ok) {
                throw new Error(`Falha no servidor (${resposta.status})`);
            }

            const locais = await resposta.json();

            // Salva no cache local para suportar busca instantânea
            cacheContainers[containerId] = {
                categoria,
                locais: Array.isArray(locais) ? locais : []
            };

            // Conecta a barra de busca se presente na página
            configurarBarraBusca('filtro-locais');

            // Renderiza com base no estado atual da busca (se houver texto já digitado)
            const inputBusca = document.getElementById('filtro-locais');
            const termoAtual = inputBusca ? inputBusca.value : '';
            aplicarFiltro(termoAtual, containerId);

        } catch (erro) {
            console.error('Erro ao carregar locais:', erro);
            container.innerHTML = `
                <div class="feedback-placeholder error-state">
                    <div style="font-size: 2.2rem; margin-bottom: 10px;">⚠️</div>
                    <h3>Erro ao carregar locais</h3>
                    <p>${escaparHtml(erro.message || 'Não foi possível conectar à API.')}</p>
                    <button type="button" class="btn-tentar-novamente" data-categoria="${escaparHtml(categoria)}" data-container="${escaparHtml(containerId)}">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    /**
     * Delegação de eventos: todos os botões gerados dinamicamente (copiar morada
     * e tentar novamente) recebem o clique sem depender de handlers inline.
     */
    document.addEventListener('click', (evento) => {
        const botaoCopiar = evento.target.closest('.btn-copy-address');
        if (botaoCopiar) {
            copiarMorada(botaoCopiar.getAttribute('data-endereco') || '', botaoCopiar);
            return;
        }

        const botaoTentar = evento.target.closest('.btn-tentar-novamente');
        if (botaoTentar) {
            carregarLocais(
                botaoTentar.getAttribute('data-categoria') || '',
                botaoTentar.getAttribute('data-container') || 'lista-locais'
            );
        }
    });

    return {
        renderizarCardLocal,
        carregarLocais,
        copiarMorada,
        configurarBarraBusca
    };
})();
