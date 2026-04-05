/**
 * Generic SVG Line Chart Renderer Module
 */
class Graph {
    constructor(container, datapoint, options = {}) {
        this.container = container;
        this.datapoint = datapoint;
        
        // Wenn mehrere Datenquellen möglich sind (z.B. ['power', 'voltage', 'current'])
        this.metrics = options.metrics || ['value'];
        this.activeMetric = this.metrics[0];
        
        this.range = options.range || 7;
        this.offset = 0;

        this.init();
    }

    init() {
        this.renderSkeleton();
        this.setupEvents();
        this.updateChart();
    }

    renderSkeleton() {
        // Falls mehr als eine Metrik vorhanden ist, erstelle ein Dropdown-Menü
        let metricsHTML = '';
        if (this.metrics.length > 1) {
            metricsHTML = `
                <select class="chart-metric-select">
                    ${this.metrics.map(m => `<option value="${m}">${m.toUpperCase()}</option>`).join('')}
                </select>
            `;
        }

        this.container.innerHTML = `
            <div class="chart-wrapper">
                <div class="chart-header">
                    <div class="chart-dates">
                        <span class="chart-date-from">--.--.----</span>
                        <span class="chart-date-sep">-</span>
                        <span class="chart-date-to">--.--.----</span>
                    </div>
                    ${metricsHTML}
                    <div class="chart-controls">
                        <button class="chart-nav-btn" data-dir="-1">◀</button>
                        <button class="chart-range-btn ${this.range === 1 ? 'active' : ''}" data-range="1">1D</button>
                        <button class="chart-range-btn ${this.range === 7 ? 'active' : ''}" data-range="7">7D</button>
                        <button class="chart-range-btn ${this.range === 30 ? 'active' : ''}" data-range="30">1M</button>
                        <button class="chart-nav-btn" data-dir="1">▶</button>
                    </div>
                </div>
                <div class="chart-body">
                    <svg class="chart-svg" viewBox="0 0 200 100" preserveAspectRatio="none">
                        <path class="chart-path" d=""></path>
                    </svg>
                    <div class="chart-error-message hidden">Fehler beim Laden</div>
                </div>
            </div>
        `;
    }

    setupEvents() {
        // Metrik-Wechsel (z. B. Spannung -> Strom)
        const metricSelect = this.container.querySelector('.chart-metric-select');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                this.activeMetric = e.target.value;
                this.updateChart();
            });
        }
        
        // Zeitbereich-Tasten
        this.container.querySelectorAll('.chart-range-btn').forEach(btn => {
            btn.onclick = () => {
                this.container.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.range = parseInt(btn.dataset.range);
                this.offset = 0;
                this.updateChart();
            };
        });

        // Vor/Zurück Navigation in der Zeit
        this.container.querySelectorAll('.chart-nav-btn').forEach(btn => {
            btn.onclick = () => {
                this.offset += (parseInt(btn.dataset.dir) * this.range);
                if (this.offset < 0) this.offset = 0; // Nicht in die Zukunft navigieren
                this.updateChart();
            };
        });
    }

    async updateChart() {
        if (!this.datapoint) return;
        const dateFrom = this.container.querySelector('.chart-date-from');
        const dateTo = this.container.querySelector('.chart-date-to');
        const errorMsg = this.container.querySelector('.chart-error-message');
        const svg = this.container.querySelector('.chart-svg');

        try {
            // Livedaten zentral über die API beziehen
            const sensorValues = await window.API.getSensorData(this.datapoint);

            // Zeitfenster berechnen
            const now = new Date();
            const endTime = new Date(now.getTime() - (this.offset * 24 * 60 * 60 * 1000));
            const startTime = new Date(endTime.getTime() - (this.range * 24 * 60 * 60 * 1000));

            // Daten filtern und den angefragten Wert (aktive Metrik) extrahieren
            const filteredData = sensorValues
                .filter(entry => {
                    const dTime = new Date(entry.timestamp);
                    return dTime >= startTime && dTime <= endTime;
                })
                .map(entry => entry[this.activeMetric] !== undefined ? entry[this.activeMetric] : entry.value);

            if (dateFrom) dateFrom.textContent = startTime.toLocaleDateString();
            if (dateTo) dateTo.textContent = endTime.toLocaleDateString();

            if (filteredData.length === 0) {
                if (errorMsg) {
                    errorMsg.textContent = "Keine Daten vorhanden";
                    errorMsg.classList.remove('hidden');
                }
                if (svg) svg.style.opacity = '0.1';
                this.drawPath([]);
                return;
            }

            if (errorMsg) errorMsg.classList.add('hidden');
            if (svg) svg.style.opacity = '1';

            this.drawPath(filteredData);
        } catch (error) {
            console.error("Fehler beim Laden der Chart-Daten:", error);
            if (errorMsg) {
                errorMsg.textContent = "Fehler beim Laden";
                errorMsg.classList.remove('hidden');
            }
            if (svg) svg.style.opacity = '0.1';
        }
    }

    drawPath(data) {
        const pathEl = this.container.querySelector('.chart-path');
        if (!pathEl) return;
        if (!data || !data.length) {
            pathEl.setAttribute('d', '');
            return;
        }
        
        const width = 200, height = 100;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const valRange = max - min || 1;

        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / valRange) * height;
            return `${x},${y}`;
        });

        pathEl.setAttribute('d', `M ${points.join(' L ')}`);
    }
}

window.Graph = Graph;