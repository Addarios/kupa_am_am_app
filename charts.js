let myChart = null;

async function initChart(type = 'feeding', scale = 'hour') {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;
    const events = await window.getAllEntries('events');
    const weights = await window.getAllEntries('weight_history');
    const childId = parseInt(document.getElementById('globalChildSelect').value);

    if (!childId) return;
    if (myChart) myChart.destroy();

    if (type === 'feeding') {
        if (scale === 'hour') renderHourChart(ctx, events, childId);
        else renderDayChart(ctx, events, childId);
    } else {
        renderWeightChart(ctx, weights, childId);
    }
}

function renderHourChart(ctx, events, childId) {
    const today = new Date().toDateString();
    const data = new Array(24).fill(0);
    events.filter(e => e.childId === childId && e.type === 'posiłek' && new Date(e.date).toDateString() === today)
          .forEach(e => data[new Date(e.date).getHours()] += e.amount);

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{ label: 'ml dzisiaj', data, backgroundColor: '#007bff' }]
        }
    });
}

function renderDayChart(ctx, events, childId) {
    const days = [];
    const data = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i);
        const dStr = d.toDateString();
        days.push(`${d.getDate()}.${d.getMonth()+1}`);
        const sum = events.filter(e => e.childId === childId && e.type === 'posiłek' && new Date(e.date).toDateString() === dStr)
                          .reduce((s, e) => s + e.amount, 0);
        data.push(sum);
    }
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: days, datasets: [{ label: 'ml / dzień', data, backgroundColor: '#6f42c1' }] }
    });
}

function renderWeightChart(ctx, weights, childId) {
    const filtered = weights.filter(w => w.childId === childId).sort((a,b) => a.date - b.date);
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filtered.map(w => new Date(w.date).toLocaleDateString()),
            datasets: [{ label: 'Waga (g)', data: filtered.map(w => w.weight), borderColor: '#28a745', fill: false }]
        }
    });
}

// Obsługa przycisków
document.getElementById('btnScaleHour').onclick = () => initChart('feeding', 'hour');
document.getElementById('btnScaleDay').onclick = () => initChart('feeding', 'day');
document.getElementById('btnShowFeedingChart').onclick = () => initChart('feeding', 'hour');
document.getElementById('btnShowWeightChart').onclick = () => initChart('weight');