let currentChart = null;

async function renderFeedingChart(scale = 'hour') {
    const childId = getChildId();
    if(!childId) return;
    const events = await getAllEntries('events');
    const filtered = events.filter(e => e.childId === childId && e.type === 'posiłek');
    
    let labels = [], values = [];
    if(scale === 'hour') {
        const hours = Array.from({length: 24}, (_, i) => i + ":00");
        const data = new Array(24).fill(0);
        const today = new Date().toDateString();
        filtered.forEach(e => {
            const d = new Date(e.date);
            if(d.toDateString() === today) data[d.getHours()] += e.amount;
        });
        labels = hours; values = data;
    } else {
        const dayMap = {};
        filtered.forEach(e => {
            const d = new Date(e.date).toLocaleDateString();
            dayMap[d] = (dayMap[d] || 0) + e.amount;
        });
        labels = Object.keys(dayMap); values = Object.values(dayMap);
    }
    drawChart('Karmienie (ml)', labels, values, '#0d6efd', scale === 'hour' ? 'bar' : 'line');
}

async function renderWeightChart() {
    const childId = getChildId();
    const history = await getAllEntries('weight_history');
    const data = history.filter(h => h.childId === childId).sort((a,b) => new Date(a.date) - new Date(b.date));
    drawChart('Waga (g)', data.map(h => new Date(h.date).toLocaleDateString()), data.map(h => h.weight), '#198754', 'line');
}

function drawChart(label, labels, data, color, type) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (currentChart) currentChart.destroy();
    currentChart = new Chart(ctx, {
        type: type,
        data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: color+'22', fill: true }] },
        options: { maintainAspectRatio: false }
    });
}

// Podpięcie pod przyciski z index.html
document.getElementById('btnShowFeedingChart').onclick = () => renderFeedingChart('hour');
document.getElementById('btnShowWeightChart').onclick = renderWeightChart;
document.getElementById('btnScaleHour').onclick = () => renderFeedingChart('hour');
document.getElementById('btnScaleDay').onclick = () => renderFeedingChart('day');