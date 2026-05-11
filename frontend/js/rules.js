/**
 * rules.js – Verwaltung der Automatisierungen
 */
const RuleManager = {
    init() {
        const container = document.querySelector('#rules-table-container');
        if (!container) return;
        
        const columns = [
            { key: 'name', label: 'Regelname' },
            { 
                key: 'logic', 
                label: 'Logik (Menschlich)', 
                render: (v, row) => `<code class="logic-tag">${RuleEngine.translateToHuman(row)}</code>` 
            },
            { 
                key: 'active', 
                label: 'Status', 
                render: (v) => `<span class="badge ${v ? 'badge--active' : 'badge--inactive'}">${v ? 'Aktiv' : 'Inaktiv'}</span>` 
            }
        ];

        this.table = new DataTable(container, columns, { searchable: true });
        
        // Regeln dynamisch aus der API laden
        window.API.getRules().then(rules => {
            this.table.setData(rules);
        }).catch(err => console.error("Fehler beim Laden der Regeln:", err));

        // "Add"-Event der Tabelle überschreiben für den Regel-Baukasten
        this.table._showAddModal = () => this.showRuleBuilder();
    },

    showRuleBuilder() {
        const modal = document.createElement('div');
        modal.className = 'table-modal';
        modal.innerHTML = `
            <div class="table-modal-box rule-builder">
                <h3>Neue Regel erstellen</h3>
                <div class="settings-group">
                    <label>Name der Regel</label>
                    <input type="text" id="rule-name" placeholder="z.B. Nachtlicht">
                </div>
                
                <div id="condition-list">
                    <div class="condition-row">
                        <select class="rule-dp">
                            <option value="sensor.temp.living">Wohnzimmer Temp</option>
                            <option value="actuator.light.hall">Flur Licht</option>
                        </select>
                        <select class="rule-op">
                            ${Object.keys(RuleEngine.operators).map(op => `<option>${op}</option>`).join('')}
                        </select>
                        <input type="text" class="rule-val" placeholder="Wert">
                    </div>
                </div>

                <div class="settings-group">
                    <label>Verknüpfung</label>
                    <select id="rule-logic">
                        <option value="AND">UND (Alle müssen zutreffen)</option>
                        <option value="OR">ODER (Eines muss zutreffen)</option>
                    </select>
                </div>

                <div class="table-modal-actions">
                    <button onclick="this.closest('.table-modal').remove()">Abbrechen</button>
                    <button class="btn-primary" id="save-rule">Regel speichern</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#save-rule').onclick = () => {
            const newRule = {
                name: document.getElementById('rule-name').value,
                active: true,
                logic: document.getElementById('rule-logic').value,
                conditions: [{
                    datapoint: modal.querySelector('.rule-dp').value,
                    operator: modal.querySelector('.rule-op').value,
                    value: modal.querySelector('.rule-val').value
                }]
            };
            window.API.addRule(newRule).then((res) => {
                newRule.id = res.id;
                this.table._addRow(newRule);
                modal.remove();
            }).catch(err => alert("Fehler beim Speichern der Regel."));
        };
    }
};

document.addEventListener('DOMContentLoaded', () => RuleManager.init());