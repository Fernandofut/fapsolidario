/**
 * cadastro.js — fluxo de cadastro do FAP Solidário.
 *
 * A seleção do tipo de conta alterna, sem recarregar a página, entre três
 * formulários padronizados: Doador, Beneficiário (triagem social/CadÚnico)
 * e Empresa/Ponto de Coleta. Todas as validações, máscaras, consulta de CEP
 * (ViaCEP) e montagem do payload ficam concentradas neste ficheiro.
 */
document.addEventListener('DOMContentLoaded', () => {
    const formCadastro = document.getElementById('form-cadastro');
    const msgErro = document.getElementById('msg-erro');
    const msgSucesso = document.getElementById('msg-sucesso');
    const selectTipo = document.getElementById('tipo');
    const dicaTipo = document.getElementById('dica-tipo');
    const labelNome = document.getElementById('label-nome');
    const inputNome = document.getElementById('nome');
    const btnCadastrar = document.getElementById('btn-cadastrar');

    const secoes = {
        doador: document.getElementById('campos-doador'),
        beneficiario: document.getElementById('campos-beneficiario'),
        empresa: document.getElementById('campos-empresa'),
    };

    const campos = {
        email: document.getElementById('email'),
        senha: document.getElementById('senha'),

        doadorTipoPessoa: document.getElementById('doador-tipo-pessoa'),
        doadorDocumento: document.getElementById('doador-documento'),
        doadorLabelDocumento: document.getElementById('label-documento-doador'),
        doadorTelefone: document.getElementById('doador-telefone'),
        doadorCep: document.getElementById('doador-cep'),
        doadorRua: document.getElementById('doador-rua'),
        doadorBairro: document.getElementById('doador-bairro'),
        doadorNumero: document.getElementById('doador-numero'),
        doadorComplemento: document.getElementById('doador-complemento'),

        beneficiarioCpf: document.getElementById('beneficiario-cpf'),
        beneficiarioRg: document.getElementById('beneficiario-rg'),
        beneficiarioNascimento: document.getElementById('beneficiario-nascimento'),
        beneficiarioTelefone: document.getElementById('beneficiario-telefone'),
        beneficiarioNis: document.getElementById('beneficiario-nis'),
        beneficiarioCep: document.getElementById('beneficiario-cep'),
        beneficiarioRua: document.getElementById('beneficiario-rua'),
        beneficiarioBairro: document.getElementById('beneficiario-bairro'),
        beneficiarioNumero: document.getElementById('beneficiario-numero'),
        beneficiarioReferencia: document.getElementById('beneficiario-referencia'),
        beneficiarioAdultos: document.getElementById('beneficiario-adultos'),
        beneficiarioCriancas: document.getElementById('beneficiario-criancas'),
        beneficiarioIdosos: document.getElementById('beneficiario-idosos'),
        beneficiarioRenda: document.getElementById('beneficiario-renda'),

        empresaDocumento: document.getElementById('empresa-documento'),
        empresaTelefone: document.getElementById('empresa-telefone'),
        empresaCep: document.getElementById('empresa-cep'),
        empresaRua: document.getElementById('empresa-rua'),
        empresaBairro: document.getElementById('empresa-bairro'),
        empresaNumero: document.getElementById('empresa-numero'),
        empresaComplemento: document.getElementById('empresa-complemento'),
        empresaReferencia: document.getElementById('empresa-referencia'),
        empresaHorario: document.getElementById('empresa-horario'),
    };

    const DICAS = {
        doador: 'Você poderá registrar doações de alimentos, roupas, higiene, móveis e dinheiro.',
        beneficiario:
            'Seus dados de triagem social (CadÚnico/CRAS) ajudam a priorizar as famílias com maior necessidade.',
        empresa:
            'Sua empresa ou ponto de coleta aparecerá imediatamente nas páginas de doação, com morada, telefone e WhatsApp.',
    };

    const NOMES = {
        doador: { label: 'Nome Completo', placeholder: 'Seu nome completo' },
        beneficiario: { label: 'Nome Completo', placeholder: 'Seu nome completo' },
        empresa: { label: 'Nome da Instituição / Empresa', placeholder: 'Ex.: Mercado Solidário' },
    };

    const CEP_STATUS_PADRAO = 'Preenchimento automático da morada via ViaCEP.';

    function somenteDigitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    function mascaraTelefone(valor) {
        const d = somenteDigitos(valor).slice(0, 11);
        if (d.length === 0) return '';
        if (d.length <= 2) return `(${d}`;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    function mascaraCep(valor) {
        const d = somenteDigitos(valor).slice(0, 8);
        return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    }

    function mascaraCpf(valor) {
        const d = somenteDigitos(valor).slice(0, 11);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
        if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
        return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    }

    function mascaraCnpj(valor) {
        const d = somenteDigitos(valor).slice(0, 14);
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
        if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
        if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
        return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    }

    function documentoBasicoValido(valor, tipoPessoa) {
        const d = somenteDigitos(valor);
        const tamanho = tipoPessoa === 'PJ' ? 14 : 11;
        return d.length === tamanho && !/^(\d)\1+$/.test(d);
    }

    function perfilAtual() {
        if (selectTipo.value === 'Empresa') return 'empresa';
        if (selectTipo.value === 'Beneficiário') return 'beneficiario';
        return 'doador';
    }

    function exibirErro(mensagem) {
        msgSucesso.style.display = 'none';
        msgErro.textContent = mensagem;
        msgErro.style.display = 'block';
        msgErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function limparMensagens() {
        msgErro.style.display = 'none';
        msgSucesso.style.display = 'none';
    }

    function atualizarDocumentoDoador() {
        const pj = campos.doadorTipoPessoa.value === 'PJ';
        campos.doadorLabelDocumento.textContent = pj ? 'CNPJ' : 'CPF';
        campos.doadorDocumento.placeholder = pj ? '00.000.000/0000-00' : '000.000.000-00';
        campos.doadorDocumento.value = pj
            ? mascaraCnpj(campos.doadorDocumento.value)
            : mascaraCpf(campos.doadorDocumento.value);

        if (perfilAtual() === 'doador') {
            labelNome.textContent = pj ? 'Razão Social' : 'Nome Completo';
            inputNome.placeholder = pj ? 'Ex.: Mercado Solidário LTDA' : 'Seu nome completo';
        }
    }

    function atualizarTipoConta() {
        const perfil = perfilAtual();

        Object.entries(secoes).forEach(([nome, secao]) => {
            secao.classList.toggle('ds-hidden', nome !== perfil);
        });

        labelNome.textContent = NOMES[perfil].label;
        inputNome.placeholder = NOMES[perfil].placeholder;
        dicaTipo.textContent = DICAS[perfil] || '';

        atualizarDocumentoDoador();
    }

    function configurarMascaraTelefone(input) {
        input.addEventListener('input', () => {
            input.value = mascaraTelefone(input.value);
        });
    }

    function configurarCep({ input, status, rua, bairro, numero }) {
        async function buscarCep() {
            const cep = somenteDigitos(input.value);
            if (cep.length !== 8) {
                status.textContent = CEP_STATUS_PADRAO;
                return;
            }

            status.textContent = 'Buscando endereço...';

            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!resposta.ok) throw new Error('falha na consulta');
                const dados = await resposta.json();

                if (dados.erro) {
                    status.textContent = 'CEP não encontrado. Confira os números.';
                    return;
                }

                if (!rua.value.trim()) rua.value = dados.logradouro || '';
                if (!bairro.value.trim()) bairro.value = dados.bairro || '';

                const localidade = [dados.localidade, dados.uf].filter(Boolean).join(' - ');
                status.textContent = localidade
                    ? `Endereço localizado: ${localidade}.`
                    : 'Endereço localizado.';

                if (rua.value.trim()) numero.focus();
            } catch {
                status.textContent = 'Não foi possível consultar o CEP agora. Preencha manualmente.';
            }
        }

        input.addEventListener('input', () => {
            input.value = mascaraCep(input.value);
            if (somenteDigitos(input.value).length === 8) buscarCep();
        });

        input.addEventListener('blur', buscarCep);
    }

    function valoresMarcados(nome) {
        return Array.from(document.querySelectorAll(`input[name="${nome}"]:checked`))
            .map((campo) => campo.value)
            .join(',');
    }

    function validarComum() {
        const nome = inputNome.value.trim();
        const email = campos.email.value.trim();
        const senha = campos.senha.value;

        if (nome.length < 2) return 'Informe o nome completo (mínimo 2 caracteres).';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Informe um e-mail válido.';
        if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
        return null;
    }

    function validarDoador() {
        const tipoPessoa = campos.doadorTipoPessoa.value;
        if (!documentoBasicoValido(campos.doadorDocumento.value, tipoPessoa)) {
            return tipoPessoa === 'PJ'
                ? 'Informe um CNPJ válido (14 dígitos).'
                : 'Informe um CPF válido (11 dígitos).';
        }
        if (somenteDigitos(campos.doadorTelefone.value).length < 10) {
            return 'Informe um telefone/WhatsApp válido com DDD.';
        }
        if (somenteDigitos(campos.doadorCep.value).length !== 8) return 'Informe um CEP válido (8 dígitos).';
        if (!campos.doadorRua.value.trim()) return 'Informe o nome da rua.';
        if (!campos.doadorBairro.value.trim()) return 'Informe o bairro.';
        if (!campos.doadorNumero.value.trim()) return 'Informe o número da casa/prédio.';
        if (!valoresMarcados('doador_categorias')) return 'Selecione pelo menos uma categoria de doação.';
        return null;
    }

    function validarBeneficiario() {
        if (!documentoBasicoValido(campos.beneficiarioCpf.value, 'PF')) {
            return 'Informe um CPF válido (11 dígitos).';
        }
        if (campos.beneficiarioRg.value.trim().length < 3) return 'Informe o RG.';
        if (!campos.beneficiarioNascimento.value) return 'Informe a data de nascimento.';

        const nascimento = new Date(`${campos.beneficiarioNascimento.value}T00:00:00`);
        if (Number.isNaN(nascimento.getTime()) || nascimento > new Date()) {
            return 'Informe uma data de nascimento válida.';
        }

        if (somenteDigitos(campos.beneficiarioTelefone.value).length < 10) {
            return 'Informe um telefone/WhatsApp válido com DDD.';
        }

        const nis = somenteDigitos(campos.beneficiarioNis.value);
        if (nis && nis.length !== 11) return 'O NIS/CadÚnico deve ter 11 dígitos (ou ficar em branco).';

        if (somenteDigitos(campos.beneficiarioCep.value).length !== 8) {
            return 'Informe um CEP válido (8 dígitos).';
        }
        if (!campos.beneficiarioRua.value.trim()) return 'Informe o nome da rua.';
        if (!campos.beneficiarioBairro.value.trim()) return 'Informe o bairro.';
        if (!campos.beneficiarioNumero.value.trim()) return 'Informe o número.';
        if (!campos.beneficiarioReferencia.value.trim()) return 'Informe um ponto de referência.';

        const adultos = Number.parseInt(campos.beneficiarioAdultos.value, 10) || 0;
        const criancas = Number.parseInt(campos.beneficiarioCriancas.value, 10) || 0;
        const idosos = Number.parseInt(campos.beneficiarioIdosos.value, 10) || 0;
        if (adultos < 0 || criancas < 0 || idosos < 0) {
            return 'A composição familiar não pode ter números negativos.';
        }
        if (adultos + criancas + idosos < 1) {
            return 'Informe pelo menos uma pessoa na composição familiar.';
        }

        if (!campos.beneficiarioRenda.value) return 'Informe a faixa de renda familiar mensal.';
        if (!valoresMarcados('beneficiario_necessidades')) {
            return 'Selecione pelo menos uma necessidade atual.';
        }
        return null;
    }

    function validarEmpresa() {
        if (!documentoBasicoValido(campos.empresaDocumento.value, 'PJ')) {
            return 'Informe um CNPJ válido (14 dígitos).';
        }
        if (somenteDigitos(campos.empresaTelefone.value).length < 10) {
            return 'Informe um telefone/WhatsApp válido com DDD.';
        }
        if (somenteDigitos(campos.empresaCep.value).length !== 8) return 'Informe um CEP válido (8 dígitos).';
        if (!campos.empresaRua.value.trim()) return 'Informe o nome da rua.';
        if (!campos.empresaBairro.value.trim()) return 'Informe o bairro.';
        if (!campos.empresaNumero.value.trim()) return 'Informe o número.';
        if (!campos.empresaReferencia.value.trim()) return 'Informe um ponto de referência.';
        if (!campos.empresaHorario.value.trim()) return 'Informe o horário de funcionamento para coletas.';
        if (!valoresMarcados('empresa_categorias')) return 'Selecione pelo menos uma categoria aceita.';
        return null;
    }

    function validar() {
        const erroComum = validarComum();
        if (erroComum) return erroComum;

        const perfil = perfilAtual();
        if (perfil === 'doador') return validarDoador();
        if (perfil === 'beneficiario') return validarBeneficiario();
        return validarEmpresa();
    }

    function montarPayload() {
        const perfil = perfilAtual();
        const payload = {
            nome: inputNome.value.trim(),
            email: campos.email.value.trim(),
            senha: campos.senha.value,
            tipo: selectTipo.value,
        };

        if (perfil === 'doador') {
            const logistica = document.querySelector('input[name="logistica"]:checked');
            return {
                ...payload,
                tipo_pessoa: campos.doadorTipoPessoa.value,
                documento: somenteDigitos(campos.doadorDocumento.value),
                telefone: mascaraTelefone(campos.doadorTelefone.value),
                cep: mascaraCep(campos.doadorCep.value),
                rua: campos.doadorRua.value.trim(),
                bairro: campos.doadorBairro.value.trim(),
                numero: campos.doadorNumero.value.trim(),
                complemento: campos.doadorComplemento.value.trim(),
                logistica: logistica ? logistica.value : 'ponto_coleta',
                categorias: valoresMarcados('doador_categorias'),
            };
        }

        if (perfil === 'beneficiario') {
            return {
                ...payload,
                cpf: somenteDigitos(campos.beneficiarioCpf.value),
                rg: campos.beneficiarioRg.value.trim(),
                data_nascimento: campos.beneficiarioNascimento.value,
                telefone: mascaraTelefone(campos.beneficiarioTelefone.value),
                nis: somenteDigitos(campos.beneficiarioNis.value),
                cep: mascaraCep(campos.beneficiarioCep.value),
                rua: campos.beneficiarioRua.value.trim(),
                bairro: campos.beneficiarioBairro.value.trim(),
                numero: campos.beneficiarioNumero.value.trim(),
                ponto_referencia: campos.beneficiarioReferencia.value.trim(),
                adultos: Number.parseInt(campos.beneficiarioAdultos.value, 10) || 0,
                criancas: Number.parseInt(campos.beneficiarioCriancas.value, 10) || 0,
                idosos: Number.parseInt(campos.beneficiarioIdosos.value, 10) || 0,
                renda_familiar: campos.beneficiarioRenda.value,
                necessidades: valoresMarcados('beneficiario_necessidades'),
            };
        }

        return {
            ...payload,
            tipo_pessoa: 'PJ',
            documento: somenteDigitos(campos.empresaDocumento.value),
            telefone: mascaraTelefone(campos.empresaTelefone.value),
            cep: mascaraCep(campos.empresaCep.value),
            rua: campos.empresaRua.value.trim(),
            bairro: campos.empresaBairro.value.trim(),
            numero: campos.empresaNumero.value.trim(),
            complemento: campos.empresaComplemento.value.trim(),
            ponto_referencia: campos.empresaReferencia.value.trim(),
            horario_funcionamento: campos.empresaHorario.value.trim(),
            categorias: valoresMarcados('empresa_categorias'),
        };
    }

    function mensagemSucesso(perfil) {
        const mensagens = {
            doador: 'Conta de doador criada com sucesso! Redirecionando para o login...',
            beneficiario: 'Cadastro social concluído com sucesso! Redirecionando para o login...',
            empresa: 'Empresa/Ponto de Coleta cadastrado com sucesso! Redirecionando para o login...',
        };
        return mensagens[perfil];
    }

    selectTipo.addEventListener('change', atualizarTipoConta);
    campos.doadorTipoPessoa.addEventListener('change', atualizarDocumentoDoador);
    atualizarTipoConta();

    configurarMascaraTelefone(campos.doadorTelefone);
    configurarMascaraTelefone(campos.beneficiarioTelefone);
    configurarMascaraTelefone(campos.empresaTelefone);

    campos.doadorDocumento.addEventListener('input', () => {
        campos.doadorDocumento.value =
            campos.doadorTipoPessoa.value === 'PJ'
                ? mascaraCnpj(campos.doadorDocumento.value)
                : mascaraCpf(campos.doadorDocumento.value);
    });

    campos.beneficiarioCpf.addEventListener('input', () => {
        campos.beneficiarioCpf.value = mascaraCpf(campos.beneficiarioCpf.value);
    });

    campos.beneficiarioNis.addEventListener('input', () => {
        campos.beneficiarioNis.value = somenteDigitos(campos.beneficiarioNis.value).slice(0, 11);
    });

    campos.empresaDocumento.addEventListener('input', () => {
        campos.empresaDocumento.value = mascaraCnpj(campos.empresaDocumento.value);
    });

    configurarCep({
        input: campos.doadorCep,
        status: document.getElementById('doador-cep-status'),
        rua: campos.doadorRua,
        bairro: campos.doadorBairro,
        numero: campos.doadorNumero,
    });

    configurarCep({
        input: campos.beneficiarioCep,
        status: document.getElementById('beneficiario-cep-status'),
        rua: campos.beneficiarioRua,
        bairro: campos.beneficiarioBairro,
        numero: campos.beneficiarioNumero,
    });

    configurarCep({
        input: campos.empresaCep,
        status: document.getElementById('empresa-cep-status'),
        rua: campos.empresaRua,
        bairro: campos.empresaBairro,
        numero: campos.empresaNumero,
    });

    formCadastro.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        limparMensagens();

        const erroValidacao = validar();
        if (erroValidacao) {
            exibirErro(erroValidacao);
            return;
        }

        const perfil = perfilAtual();
        const textoOriginal = btnCadastrar.textContent;
        btnCadastrar.disabled = true;
        btnCadastrar.textContent = 'CADASTRANDO...';

        try {
            await FAP.post('/api/auth/registro', montarPayload());

            msgSucesso.textContent = mensagemSucesso(perfil);
            msgSucesso.style.display = 'block';
            formCadastro.reset();
            atualizarTipoConta();

            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1600);
        } catch (erro) {
            exibirErro(erro.message || 'Não foi possível concluir o cadastro.');
        } finally {
            btnCadastrar.disabled = false;
            btnCadastrar.textContent = textoOriginal;
        }
    });
});
