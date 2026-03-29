/**
 * NAWIGACJA I UI
 */

// Funkcja przełączania zakładek
function switchTab(tabId) {
    console.log("Przełączanie na:", tabId);

    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active-tab'));

    const navs = document.querySelectorAll('.nav-item');
    navs.forEach(n => n.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active-tab');
        // Aktualizacja UI w zależności od zakładki
        if (tabId === 'today' || tabId === 'report') updateUI('today');
        if (tabId === 'meal') setCurrentTime('mealDateTime');
        if (tabId === 'poop') setCurrentTime('poopDateTime');
        if (tabId === 'weight_tab') {
            setCurrentTime('weightDate');
            loadWeightHistory();
        }
        if (tabId === 'settings') renderChildrenList();
    }
}

// Pomocnik daty: ustawia aktualny czas w inputach datetime-local
function setCurrentTime(elementId) {
    if (!elementId) return;
    const el = document.getElementById(elementId);
    if (!el) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    el.value = now.toISOString().slice(0, 16);
}

// Pobieranie ID wybranego dziecka z górnego paska
function getSelectedChildId() {
    const select = document.getElementById('globalChildSelect');
    if (!select || !select.value) {
        alert("Najpierw wybierz dziecko na górze strony!");
        return null;
    }
    return parseInt(select.value);
}

/**
 * LOGIKA BAZY DANYCH I WIDOKÓW
 */

// Aktualizacja strony głównej (Raportu)
async function updateUI(tabId) {
    if (tabId === 'today') {
        const children = await getAllEntries('children');
        const events = await getAllEntries('events');
        const todayStr = new Date().toDateString();

        // 1. Podsumowanie dla każdego dziecka
        let summaryHtml = '<div class="row g-2">';
        children.forEach(child => {
            const childTotal = events
                .filter(e => e.childId === child.id && 
                             e.type === 'posiłek' && 
                             new Date(e.date).toDateString() === todayStr)
                .reduce((sum, e) => sum + (e.amount || 0), 0);

            summaryHtml += `
                <div class="col-6">
                    <div class="card p-2 border-0 shadow-sm bg-white text-center">
                        <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">${child.name}</small>
                        <div class="h5 mb-0 text-primary">${childTotal} ml</div>
                    </div>
                </div>`;
        });
        summaryHtml += '</div>';
        document.getElementById('summaryCards').innerHTML = summaryHtml;

        // 2. Ostatnie 10 zdarzeń
        const historyList = document.getElementById('historyList');
        const lastEvents = events.sort((a, b) => new Date(b.date) - new Date(a.date)).reverse().slice(0, 10);
        
        historyList.innerHTML = lastEvents.map(e => {
            const child = children.find(c => c.id === e.childId);
            const time = new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let icon = e.type === 'kupa' ? '💩' : '🍼';
            let detail = e.type === 'posiłek' ? `${e.amount}ml` : '';
            
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center px-2">
                    <span><strong>${child ? child.name : '?'}</strong>: ${icon} ${detail}</span>
                    <small class="text-muted">${time}</small>
                </li>`;
        }).join('');
    }
}

/**
 * FUNKCJE ZAPISU (ASYNC)
 */

async function saveMeal() {
    const childId = getSelectedChildId();
    if (!childId) return;

    const data = {
        childId,
        type: 'posiłek',
        milkType: document.getElementById('milkType').value,
        amount: parseInt(document.getElementById('mlAmount').value) || 0,
        date: new Date(document.getElementById('mealDateTime').value).getTime()
    };

    await addEntry('events', data);
    alert("Zapisano posiłek! 🍼");
    document.getElementById('mlAmount').value = '';
    switchTab('today');
}

async function savePoop() {
    const childId = getSelectedChildId();
    if (!childId) return;

    await addEntry('events', {
        childId,
        type: 'kupa',
        date: new Date(document.getElementById('poopDateTime').value).getTime()
    });
    alert("Zapisano 💩");
    switchTab('today');
}

async function saveWeight() {
    const childId = getSelectedChildIdId(); // Poprawione na spójną nazwę
    const weight = parseInt(document.getElementById('weightInput').value);
    const dateVal = document.getElementById('weightDate').value;

    if (!childId || !weight || !dateVal) {
        alert("Uzupełnij wszystkie pola wagi!");
        return;
    }

    await addEntry('weight_history', {
        childId,
        amount: weight,
        date: new Date(dateVal).getTime()
    });

    alert("Waga zapisana! ⚖️");
    document.getElementById('weightInput').value = "";
    loadWeightHistory();
}

/**
 * ZARZĄDZANIE PROFILAMI
 */

async function addChild() {
    const name = document.getElementById('childName').value;
    const birth = document.getElementById('childBirth').value;
    const weight = document.getElementById('childWeight').value;
    const gender = document.getElementById('childGender').value;

    if (!name || !birth) {
        alert("Imię i data urodzenia są wymagane!");
        return;
    }

    await addEntry('children', {
        name,
        birth,
        gender,
        weight: parseInt(weight) || 0
    });

    alert("Dziecko dodane! ✨");
    document.getElementById('childName').value = "";
    document.getElementById('childWeight').value = "";
    await refreshChildrenList();
    renderChildrenList();
}

async function renderChildrenList() {
    const children = await getAllEntries('children');
    const list = document.getElementById('childrenList');
    if (!list) return;

    list.innerHTML = children.map(c => `
        <div class="col-12">
            <div class="card p-2 shadow-sm border-0 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div><strong>${c.name}</strong> <small class="text-muted">(${c.gender})</small></div>
                    <small>Ur. ${c.birth}</small>
                </div>
            </div>
        </div>
    `).join('');
}

async function refreshChildrenList() {
    const children = await getAllEntries('children');
    const select = document.getElementById('globalChildSelect');
    if (select) {
        const current = select.value;
        select.innerHTML = '<option value="">-- Wybierz dziecko --</option>' + 
            children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        select.value = current;
    }
}

/**
 * START APLIKACJI
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Aplikacja startuje...");
    try {
        await getDB(); 
        await refreshChildrenList();
        switchTab('today');
    } catch (e) {
        console.error("Błąd startu:", e);
    }
});

/**
 * SERWISOWE
 */
async function clearAppCache() {
    if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
    }
    const names = await caches.keys();
    await Promise.all(names.map(n => caches.delete(n)));
    alert("Cache wyczyszczony!");
    window.location.reload(true);
}