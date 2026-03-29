let myChart = null;

// Funkcja inicjująca wykres
// Rozbudowana funkcja inicjująca
async function initChart(type = 'feeding', scale = 'hour') {
    const ctx = document.getElementById('myChart').getContext('2d');
    const events = await window.getAllEntries('events');
    const weights = await window.getAllEntries('weight_history');
    const selectedChildId = parseInt(document.getElementById('globalChildSelect').value);

    if (!selectedChildId) return;
    if (myChart) myChart.destroy();

    if (type === 'feeding') {
        if (scale === 'hour') {
            renderFeedingChart(ctx, events, selectedChildId); // To co już masz (dzisiaj po godzinach)
        } else {
            renderDailyFeedingChart(ctx, events, selectedChildId); // NOWOŚĆ: Dni
        }
    } else {
        renderWeightChart(ctx, weights, selectedChildId);
    }

    
}

// NOWA FUNKCJA: Raport dniowy (ostatnie 7 dni)
function renderDailyFeedingChart(ctx, events, childId) {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toDateString());
    }

    const totalsByDay = new Array(7).fill(0);

    events.filter(e => e.childId === childId && e.type === 'posiłek').forEach(m => {
        const mealDate = new Date(m.date).toDateString();
        const dayIndex = last7Days.indexOf(mealDate);
        if (dayIndex !== -1) {
            totalsByDay[dayIndex] += m.amount;
        }
    });

    // Formatuje daty do ładniejszego wyglądu (np. "24.03")
    const labels = last7Days.map(dateStr => {
        const d = new Date(dateStr);
        return `${d.getDate()}.${d.getMonth() + 1}`;
    });

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Suma ml / dzień',
                data: totalsByDay,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Podpięcie przycisków skali w HTML
document.getElementById('btnScaleHour').onclick = () => initChart('feeding', 'hour');
document.getElementById('btnScaleDay').onclick = () => initChart('feeding', 'day');

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