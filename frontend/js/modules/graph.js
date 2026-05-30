/**
 * Generic SVG Line Chart Renderer Module
 */
class Graph {
    constructor(container, datapoint, options = {}) {
        this.container = container;
        this.datapoints = (typeof datapoint === 'string') ? datapoint.split(',').filter(d => d) : (datapoint ? [datapoint] : []);
        
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
                    <div class="chart-y-axis">
                        <span class="y-max"></span>
                        <span class="y-mid"></span>
                        <span class="y-min"></span>
                    </div>
                    <div class="chart-main">
                        <div class="chart-graph-area">
                            <div class="chart-grid-h">
                                <div class="grid-line"></div>
                                <div class="grid-line"></div>
                                <div class="grid-line"></div>
                            </div>
                            <svg class="chart-svg" viewBox="0 0 200 100" preserveAspectRatio="none">
                                <g class="chart-paths"></g>
                            </svg>
                            <div class="chart-points-container"></div>
                            <div class="chart-error-message hidden">Fehler beim Laden</div>
                        </div>
                        <div class="chart-x-axis">
                            <!-- Ticks will be dynamically injected here -->
                        </div>
                    </div>
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
                // -1 (Links) geht zurück in die Vergangenheit -> offset muss vergrössert werden
                // 1 (Rechts) geht in die Zukunft -> offset muss verkleinert werden
                this.offset -= (parseInt(btn.dataset.dir) * this.range);
                if (this.offset < 0) this.offset = 0; // Nicht in die Zukunft navigieren
                this.updateChart();
            };
        });
    }

    async updateChart() {
        if (!this.datapoints || this.datapoints.length === 0) return;
        const dateFrom = this.container.querySelector('.chart-date-from');
        const dateTo = this.container.querySelector('.chart-date-to');
        const errorMsg = this.container.querySelector('.chart-error-message');
        const svg = this.container.querySelector('.chart-svg');

        // Lade die SI-Einheit aus den Sensor-Metadaten (nur einmalig nötig)
        if (this.unit === undefined) {
            try {
                const sensors = await window.API.getSensors();
                const sensor = sensors.find(s => s.id === this.datapoints[0]);
                this.unit = sensor && sensor.unit ? sensor.unit : '';
            } catch (e) { this.unit = ''; }
        }

        try {
            // Livedaten zentral über die API beziehen
            const promises = this.datapoints.map(dp => window.API.getSensorData(dp).catch(() => []));
            const sensorValuesArray = await Promise.all(promises);

            // Zeitfenster berechnen (Immer volle 24h mit Überhang)
            let now = new Date();
            
            sensorValuesArray.forEach(sensorValues => {
                if (sensorValues && sensorValues.length > 0) {
                    const lastEntry = sensorValues[sensorValues.length - 1];
                    if (lastEntry.timestamp) {
                        const tDate = new Date(lastEntry.timestamp);
                        if (tDate > now) now = tDate;
                    }
                }
            });

            // Wir runden "now" auf den Beginn des Folgetags (00:00 Uhr) um volle Tage zu haben
            const exactEnd = new Date(now);
            exactEnd.setHours(0, 0, 0, 0);
            exactEnd.setDate(exactEnd.getDate() + 1);

            // Offset anwenden (Verschiebung in die Vergangenheit in ganzen Tagen)
            exactEnd.setDate(exactEnd.getDate() - this.offset);

            // Den exakten Startpunkt ermitteln (this.range Tage zurück)
            const exactStart = new Date(exactEnd);
            exactStart.setDate(exactStart.getDate() - this.range);

            // Überhang (Padding) von 5% auf beiden Seiten für die Anzeige
            const durationMs = exactEnd.getTime() - exactStart.getTime();
            const paddingMs = durationMs * 0.05;

            const startTime = new Date(exactStart.getTime() - paddingMs);
            const endTime = new Date(exactEnd.getTime() + paddingMs);

            let allFilteredData = [];
            
            sensorValuesArray.forEach((sensorValues) => {
                if (!sensorValues) return;
                const filteredData = sensorValues
                    .filter(entry => {
                        const dTime = new Date(entry.timestamp);
                        return dTime >= startTime && dTime <= endTime;
                    })
                    .map(entry => ({
                        val: entry[this.activeMetric] !== undefined ? entry[this.activeMetric] : entry.value,
                        timestamp: entry.timestamp
                    }));
                if (filteredData.length > 0) allFilteredData.push(filteredData);
            });

            // Header Beschriftung (exakte Tage ohne Überhang)
            const displayEnd = new Date(exactEnd.getTime() - 1);
            if (dateFrom) dateFrom.textContent = exactStart.toLocaleDateString();
            if (dateTo) dateTo.textContent = displayEnd.toLocaleDateString();

            // X-Achse dynamisch generieren (mit Strichen und 00:00 Logik)
            const xAxisContainer = this.container.querySelector('.chart-x-axis');
            if (xAxisContainer) {
                xAxisContainer.innerHTML = '';
                const totalMs = endTime.getTime() - startTime.getTime();
                const ticks = [];
                
                // Saubere Basis bei 00:00 Uhr (exactStart)
                let t = new Date(exactStart);
                
                // Rückwärts, um den linken Überhang zu füllen (DST-sicher mit Date-Methoden)
                while (t > startTime) {
                    if (this.range >= 30) t.setDate(t.getDate() - 5);
                    else if (this.range === 7) t.setHours(t.getHours() - 12);
                    else t.setHours(t.getHours() - 6);
                }

                // Vorwärts durch das gesamte Fenster
                while (t <= endTime) {
                    if (t >= startTime) ticks.push(new Date(t));
                    if (this.range >= 30) t.setDate(t.getDate() + 5);
                    else if (this.range === 7) t.setHours(t.getHours() + 12);
                    else t.setHours(t.getHours() + 6);
                }

                // Fallback, falls keine Ticks im Bereich liegen
                if (ticks.length === 0) {
                    ticks.push(startTime, new Date((startTime.getTime() + endTime.getTime())/2), endTime);
                }

                ticks.forEach(tick => {
                    const percent = ((tick.getTime() - startTime.getTime()) / totalMs) * 100;
                    const span = document.createElement('span');
                    span.className = 'x-tick';
                    span.style.left = `${percent}%`;

                    const timeStr = tick.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    const dateStr = tick.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
                    const isMidnight = tick.getHours() === 0 && tick.getMinutes() === 0;
                    
                    // Genereller Tooltip für alle Ticks (zeigt immer Datum und exakte Uhrzeit bei Hover)
                    span.title = `${dateStr} ${timeStr}`;

                    if (this.range >= 30) {
                        // Monatsansicht: Nur Datum, keine Zeit. Uhrzeit im Tooltip
                        span.innerHTML = `<span class="tick-date">${dateStr}</span>`;
                        span.classList.add('tick-midnight'); // Immer hell in der Monatsansicht
                    } else if (this.range === 7) {
                        // Wochenansicht: 00:00 nur Datum hervorgehoben, sonst 12:00
                        if (isMidnight) {
                            span.innerHTML = `<span class="tick-date">${dateStr}</span>`;
                            span.classList.add('tick-midnight');
                        } else {
                            span.innerHTML = `<span class="tick-time">${timeStr}</span>`;
                        }
                    } else {
                        // Tagesansicht: 00:00 nur Datum, sonst Uhrzeit
                        if (isMidnight) {
                            span.innerHTML = `<span class="tick-date">${dateStr}</span>`;
                            span.classList.add('tick-midnight');
                        } else {
                            span.innerHTML = `<span class="tick-time">${timeStr}</span>`;
                        }
                    }

                    xAxisContainer.appendChild(span);
                });
            }

            if (allFilteredData.length === 0) {
                if (errorMsg) {
                    errorMsg.textContent = "Keine Daten vorhanden";
                    errorMsg.classList.remove('hidden');
                }
                if (svg) svg.style.opacity = '0.1';
                this.drawPaths([]);
                return;
            }

            if (errorMsg) errorMsg.classList.add('hidden');
            if (svg) svg.style.opacity = '1';

            this.drawPaths(allFilteredData);
        } catch (error) {
            console.error("Fehler beim Laden der Chart-Daten:", error);
            if (errorMsg) {
                errorMsg.textContent = "Fehler beim Laden";
                errorMsg.classList.remove('hidden');
            }
            if (svg) svg.style.opacity = '0.1';
        }
    }

    drawPaths(dataArray) {
        const pathsGroup = this.container.querySelector('.chart-paths');
        const pointsContainer = this.container.querySelector('.chart-points-container');
        if (!pathsGroup) return;
        if (pointsContainer) pointsContainer.innerHTML = '';
        pathsGroup.innerHTML = '';

        if (!dataArray || !dataArray.length) {
            return;
        }
        
        const width = 200, height = 100;
        const vals = dataArray.flatMap(series => series.map(d => d.val));
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        
        // Dynamisches Padding von 10% (oder mind. 1, falls min==max)
        const padding = (max - min) * 0.1 || 1; 
        const renderMax = max + padding;
        const renderMin = min - padding;
        const valRange = renderMax - renderMin || 1;

        // Achsenbeschriftung aktualisieren
        const yMaxEl = this.container.querySelector('.y-max');
        const yMidEl = this.container.querySelector('.y-mid');
        const yMinEl = this.container.querySelector('.y-min');
        
        const u = this.unit ? ` ${this.unit}` : '';
        if (yMaxEl) yMaxEl.textContent = renderMax.toFixed(1) + u;
        if (yMidEl) yMidEl.textContent = ((renderMax + renderMin) / 2).toFixed(1) + u;
        if (yMinEl) yMinEl.textContent = renderMin.toFixed(1) + u;

        const colors = ['var(--accent-blue)', 'var(--accent-green)', 'var(--accent-yellow)', 'var(--accent-red)', '#cba6f7', '#f38ba8'];

        dataArray.forEach((data, index) => {
            if (!data || !data.length) return;
            const color = colors[index % colors.length];

            const pathPoints = data.map((d, i) => {
                const x = (i / Math.max(1, data.length - 1)) * width;
                const y = height - ((d.val - renderMin) / valRange) * height;
                
                if (pointsContainer) {
                    const px = (i / Math.max(1, data.length - 1)) * 100;
                    const py = ((d.val - renderMin) / valRange) * 100;
                    
                    const pt = document.createElement('div');
                    pt.className = 'chart-data-point';
                    pt.style.left = `${px}%`;
                    pt.style.bottom = `${py}%`;
                    pt.style.borderColor = color;

                    const dTime = new Date(d.timestamp);
                    const dateStr = dTime.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const timeStr = dTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    
                    pt.title = `Serie ${index + 1}\n${dateStr} ${timeStr}\nWert: ${d.val}${u}`;
                    pointsContainer.appendChild(pt);
                }

                return `${x},${y}`;
            });

            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('class', 'chart-path');
            pathEl.setAttribute('d', `M ${pathPoints.join(' L ')}`);
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('stroke', color);
            pathEl.setAttribute('stroke-width', '1.5');
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');
            
            pathsGroup.appendChild(pathEl);
        });
    }
}

window.Graph = Graph;