document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-sair').addEventListener('click', (evento) => {
        evento.preventDefault();
        FAP.sair();
    });

    const cores = [
        '#667eea',
        '#764ba2',
        '#43e97b',
        '#f093fb',
        '#fccb90',
        '#4facfe',
        '#f5576c',
        '#43e97b',
        '#38f9d7',
        '#e74c3c'
    ];
    const selos = ['&#x1F947;', '&#x1F948;', '&#x1F949;'];
    let chartInstance = null;

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function carregarDashboard() {
        fetch('/api/dashboard', { credentials: 'include' })
            .then((r) => {
                if (!r.ok) throw new Error('Erro HTTP ' + r.status);
                return r.json();
            })
            .then((dados) => {
                const cats = dados.categorias || [];
                const ranking = dados.ranking || [];

                let totalQtd = 0;
                cats.forEach((c) => (totalQtd += c.total));

                document.getElementById('dash-total').textContent = totalQtd;
                document.getElementById('dash-qtd').textContent = totalQtd;
                document.getElementById('dash-cats').textContent = cats.length;
                document.getElementById('dash-emp').textContent = ranking.length;

                if (cats.length === 0) {
                    document.getElementById('chartCategorias').style.display = 'none';
                    document.getElementById('vazio-cats').style.display = 'block';
                } else {
                    document.getElementById('chartCategorias').style.display = 'block';
                    document.getElementById('vazio-cats').style.display = 'none';
                    renderizarPizza(cats);
                }

                renderizarRanking(ranking);
            })
            .catch(() => {
                document.getElementById('chartCategorias').style.display = 'none';
                document.getElementById('vazio-cats').style.display = 'block';
                document.getElementById('vazio-cats').textContent = 'Erro ao carregar dados do dashboard.';
                document.getElementById('ranking-lista').innerHTML =
                    '<li class="vazio-msg">Erro ao carregar ranking.</li>';
            });
    }

    function renderizarPizza(cats) {
        if (typeof Chart === 'undefined') {
            document.getElementById('chartCategorias').style.display = 'none';
            document.getElementById('vazio-cats').style.display = 'block';
            document.getElementById('vazio-cats').textContent = 'Não foi possível carregar o gráfico.';
            return;
        }

        const labels = cats.map((c) => c.categoria);
        const valores = cats.map((c) => c.total);
        const coresChart = cats.map((_, i) => cores[i % cores.length]);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(document.getElementById('chartCategorias'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: valores,
                        backgroundColor: coresChart,
                        borderColor: '#fff',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } }
                }
            }
        });
    }

    function renderizarRanking(ranking) {
        const lista = document.getElementById('ranking-lista');
        if (ranking.length === 0) {
            lista.innerHTML = '<li class="vazio-msg">Nenhuma empresa registrada.</li>';
            return;
        }
        let html = '';
        ranking.forEach((emp, i) => {
            const selo = i < 3 ? selos[i] : '<span style="color:#aaa">#' + (i + 1) + '</span>';
            const bg = i === 0 ? '#fff9e6' : i === 1 ? '#f5f5f5' : i === 2 ? '#fdf0e6' : '';
            html +=
                '<li style="background:' +
                bg +
                '">' +
                '<span class="ranking-pos">' +
                selo +
                '</span>' +
                '<span class="ranking-nome">' +
                escapeHtml(emp.empresa_nome) +
                '</span>' +
                '<span class="ranking-qtd">' +
                emp.total_doado +
                ' un.</span>' +
                '</li>';
        });
        lista.innerHTML = html;
    }

    carregarDashboard();
});
