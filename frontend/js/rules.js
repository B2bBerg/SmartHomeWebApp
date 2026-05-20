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

        this.table = new DataTable(container, columns, { 
            searchable: true,
            onAdd: () => this.showRuleBuilder(),
            onDelete: (rowId) => this.deleteRule(rowId)
        });
        
        // Regeln dynamisch aus der API laden
        window.API.getRules().then(rules => {
            this.table.setData(rules);
        }).catch(err => console.error("Fehler beim Laden der Regeln:", err));
    },

    async showRuleBuilder() {
        const modal = document.createElement('div');
        modal.className = 'table-modal';

        // Datenpunkte laden
        let datapoints = [];
        try {
            const sensors = await window.API.getSensors();
            const actuators = await window.API.getActuators();
            datapoints = [...(sensors || []), ...(actuators || [])];
        } catch (e) {
            console.error("Fehler beim Laden der Datenpunkte für den Rule-Builder:", e);
        }

        const datapointOptions = datapoints.map(dp => 
            `<option value="${dp.id}">${dp.name} (${dp.location || 'N/A'})</option>`
        ).join('');

        modal.innerHTML = `
            <div class="table-modal-box rule-builder">
                <h3>Neue Regel erstellen</h3>
                <div class="settings-group">
                    <label>Name der Regel</label>
                    <input type="text" id="rule-name" placeholder="z.B. Nachtlicht im Flur">
                </div>
                
                <div id="condition-list">
                    <div class="condition-row">
                        <select class="rule-dp">
                            ${datapointOptions.length > 0 ? datapointOptions : '<option>Keine Datenpunkte gefunden</option>'}
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
                    <button class="btn-outline" onclick="this.closest('.table-modal').remove()">Abbrechen</button>
                    <button class="btn-primary" id="save-rule">Regel speichern</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#save-rule').onclick = () => {
            const ruleName = document.getElementById('rule-name').value.trim();
            const ruleVal = modal.querySelector('.rule-val').value.trim();
            
            if (!ruleName || !ruleVal) {
                window.Dialog.alert('Fehler', 'Bitte alle Pflichtfelder ausfüllen.', true);
                return; // Verhindert das Schließen des Modals
            }

            const newRule = {
                name: ruleName,
                active: true,
                logic: document.getElementById('rule-logic').value,
                conditions: [{ datapoint: modal.querySelector('.rule-dp').value, operator: modal.querySelector('.rule-op').value, value: ruleVal }]
            };
            window.API.addRule(newRule).then((res) => {
                newRule.id = res.id;
                this.table._addRow(newRule);
                modal.remove();
            }).catch(err => window.Dialog.alert("Fehler", "Fehler beim Speichern der Regel.", true));
        };
    },

    async deleteRule(rowId) {
        try {
            await window.API.deleteRule(rowId);
            this.table.data = this.table.data.filter(r => r.id !== rowId);
            this.table.setData(this.table.data);
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            window.Dialog.alert("Fehler", "Löschen fehlgeschlagen.", true);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => RuleManager.init());