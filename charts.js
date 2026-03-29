let myChart = null;

// Funkcja inicjująca wykres
async function initChart(type = 'feeding') {
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Pobieramy dane z bazy (korzystamy z funkcji z db.js)
    const events = await window.getAllEntries('events');
    const weights = await window.getAllEntries('weight_history');
    const children = await window.getAllEntries('children');
    const selectedChildId = parseInt(document.getElementById('globalChildSelect').value);

    if (!selectedChildId) {
        ctx.font = "16px Arial";
        ctx.fillText("Wybierz dziecko, aby zobaczyć wykres", 10, 50);
        return;
    }

    // Jeśli wykres już istnieje, niszczymy go przed narysowaniem nowego
    if (myChart) {
        myChart.destroy();
    }

    if (type === 'feeding') {
        renderFeedingChart(ctx, events, selectedChildId);
    } else {
        renderWeightChart(ctx, weights, selectedChildId);
    }
}

function renderFeedingChart(ctx, events, childId) {
    const today = new Date().toDateString();
    
    // Filtrujemy posiłki wybranego dziecka z dzisiaj
    const todayMeals = events.filter(e => 
        e.childId === childId && 
        e.type === 'posiłek' && 
        new Date(e.date).toDateString() === today
    );

    // Przygotowanie danych do osi X (godziny 0-23)
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const dataByHour = new Array(24).fill(0);

    todayMeals.forEach(m => {
        const hour = new Date(m.date).getHours();
        dataByHour[hour] += m.amount;
    });

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Zjedzone ml (Dzisiaj)',
                data: dataByHour,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderWeightChart(ctx, weights, childId) {
    const childWeights = weights
        .filter(w => w.childId === childId)
        .sort((a, b) => a.date - b.date);

    const labels = childWeights.map(w => new Date(w.date).toLocaleDateString());
    const data = childWeights.map(w => w.weight || w.amount); // obsługa obu nazw pól

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waga (g)',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: false } }
        }
    });
}

// Podpięcie przycisków w zakładce Analytics
document.getElementById('btnShowFeedingChart').onclick = () => initChart('feeding');
document.getElementById('btnShowWeightChart').onclick = () => initChart('weight');