/**
 * mockGenerator.js - Generiert realistische Kurven für Graphen
 */
export const MockDataGenerator = {
    generateTimeSeriesData(type, days = 35) {
        const data = [];
        const now = new Date();
        const start = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        let baseValue = 0;
        let variance = 1;

        const t = (type || '').toLowerCase();

        if (t.includes('temp')) { baseValue = 21; variance = 3; }
        else if (t.includes('co2')) { baseValue = 500; variance = 150; }
        else if (t.includes('energy')) { baseValue = 1000; variance = 2; }
        else if (t.includes('water') && !t.includes('quality')) { baseValue = 300; variance = 0.5; }
        else if (t.includes('quality')) { baseValue = 7.0; variance = 0.2; }

        for (let d = new Date(start); d <= now; d.setHours(d.getHours() + 1)) {
            let val;
            if (t.includes('energy') || (t.includes('water') && !t.includes('quality'))) {
                baseValue += Math.random() * variance; 
                val = baseValue;
            } else if (t.includes('presence') || t.includes('motion') || t.includes('contact') || t.includes('flood') || t.includes('switch')) {
                val = Math.random() > 0.85 ? 1 : 0; 
            } else {
                const timeOfDay = d.getHours();
                const dayNightCycle = Math.sin((timeOfDay - 6) / 24 * Math.PI * 2) * variance;
                val = baseValue + dayNightCycle + (Math.random() - 0.5) * (variance / 2);
            }
            data.push({ timestamp: new Date(d).toISOString(), value: Number(val.toFixed(2)) });
        }
        return data;
    }
};