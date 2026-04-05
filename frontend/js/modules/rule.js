/**
 * diese file enthält eine baukstenlogik für das erstellen von regeln die regelverwatlung erfolgt in rules.js / rules.css mittels tabelle
 * die regeln können mit menschilecher sprache erstellt werden und wir in maschienensprache übersetzt
 * AND OR NOT können verwendet werden um komplexere relgen zu erstelen.
 * die regeln greifen auf die datenpunkte zu und können diese vergleichen oder auf bestimmte werde reagieren.
 * grösser als, kleiner als, gleich, ungleich, enthält, beginnt mit, endet mit sind die möglichen operatoren
 */

/**
 * RuleEngine – Übersetzt menschliche Logik in Maschinencode
 */
const RuleEngine = {
    operators: {
        'grösser als': '>',
        'kleiner als': '<',
        'gleich': '==',
        'ungleich': '!=',
        'enthält': 'includes',
        'beginnt mit': 'startsWith',
        'endet mit': 'endsWith'
    },

    // Erstellt ein lesbares Label aus einer Regel-Struktur
    translateToHuman(rule) {
        if (!rule || !rule.conditions) return "Keine Bedingungen";
        return rule.conditions.map(c => 
            `${c.datapoint} ${c.operator} ${c.value}`
        ).join(` ${rule.logic || 'AND'} `);
    },

    // Validiert eine Regel gegen aktuelle Live-Daten
    checkRule(rule, liveData) {
        const results = rule.conditions.map(c => {
            const val = liveData[c.datapoint];
            const op = this.operators[c.operator];
            
            switch(op) {
                case '>':  return val > c.value;
                case '<':  return val < c.value;
                case '==': return val == c.value;
                case '!=': return val != c.value;
                case 'includes': return String(val).includes(c.value);
                default: return false;
            }
        });

        if (rule.logic === 'OR') return results.some(r => r === true);
        return results.every(r => r === true);
    }
};