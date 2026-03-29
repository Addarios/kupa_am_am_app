/**
 * NAWIGACJA
 */
function switchTab(tabId) {
    console.log("Przełączanie na:", tabId);
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active-tab'));

    const navs = document.querySelectorAll('.nav-item');
    navs.forEach(n => n.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active-tab');
        const activeNav = document.getElementById('nav-' + tabId);
        if (activeNav) activeNav.classList.add('active');
        
        // Wywołanie odświeżania danych dla konkretnej zakładki
        if (tabId === 'today') updateUI('today');
        if (tabId === 'meal') setCurrentTime('mealDateTime');
        if (tabId === 'poop') setCurrentTime('poopDateTime');
        if (tabId === 'weight') {
            setCurrentTime('weightDate');
            loadWeightHistory();
        }
        if (tabId === 'settings') renderChildrenList();
    }
}

function setCurrentTime(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    el.value = now.toISOString().slice(0, 16);
}

function getSelectedChildId() {
    const select = document.getElementById('globalChildSelect');
    if (!select || !select.value) {
        alert("Najpierw wybierz dziecko na górze strony!");
        return null;
    }
    return parseInt(select.value);
}

/**
 * ZAPISYWANIE DANYCH (ASYNC)
 */
async function addChild() {
    console.log("Próba dodania dziecka...");
    const name = document.getElementById('childName').value;
    const birth = document.getElementById('childBirth').value;
    const weight = document.getElementById('childWeight').value;
    const gender = document.getElementById('childGender').value;

    if (!name || !birth) {
        alert("Podaj przynajmniej imię i datę urodzenia!");
        return;
    }

    const data = {
        name,
        birth,
        gender,
        weight: parseInt(weight) || 0
    };

    try {
        await addEntry('children', data);
        alert("Dziecko dodane pomyślnie!");
        // Czyścimy pola
        document.getElementById('childName').value = "";
        document.getElementById('childWeight').value = "";
        // Odświeżamy listy
        await refreshChildrenList();
        await renderChildrenList();
    } catch (e) {
        console.error("Błąd addChild:", e);
        alert("Błąd zapisu dziecka.");
    }
}

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
    alert("Posiłek zapisany!");
    document.getElementById('mlAmount').value = "";
    switchTab('today');
}

async function savePoop() {
    const childId = getSelectedChildId();
    if (!childId) return;

    const dateVal = document.getElementById('poopDateTime').value;
    await addEntry('events', {
        childId,
        type: 'kupa',
        date: new Date(dateVal).getTime()
    });
    alert("Kupa zapisana 💩");
    switchTab('today');
}

async function saveWeight() {
    const childId = getSelectedChildId();
    if (!childId) return;

    const weight = parseInt(document.getElementById('weightInput').value);
    const dateVal = document.getElementById('weightDate').value;

    if (!weight || !dateVal) return alert("Podaj wagę i datę!");

    await addEntry('weight_history', {
        childId,
        weight,
        date: new Date(dateVal).getTime()
    });
    
    alert("Waga zapisana!");
    document.getElementById('weightInput').value = "";
    loadWeightHistory();
}

/**
 * WYŚWIETLANIE DANYCH
 */
async function updateUI(tabId) {
    if (tabId === 'today') {
        try {
            const children = await getAllEntries('children');
            const events = await getAllEntries('events');
            const todayStr = new Date().toDateString();

            // Karty dzieci
            let html = '<div class="row g-2">';
            children.forEach(c => {
                const total = events
                    .filter(e => e.childId === c.id && e.type === 'posiłek' && new Date(e.date).toDateString() === todayStr)
                    .reduce((s, e) => s + e.amount, 0);
                html += `
                    <div class="col-6">
                        <div class="card p-2 shadow-sm border-0">
                            <small class="text-muted">${c.name}</small>
                            <div class="h5 mb-0 text-primary">${total} ml</div>
                        </div>
                    </div>`;
            });
            html += '</div>';
            document.getElementById('summaryCards').innerHTML = html;

            // Lista zdarzeń
            const historyList = document.getElementById('historyList');
            const lastEvents = events.sort((a,b) => b.date - a.date).slice(0, 15);
            historyList.innerHTML = lastEvents.map(e => {
                const child = children.find(c => c.id === e.childId);
                const time = new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                return `
                    <li class="list-group-item d-flex justify-content-between px-2">
                        <span><strong>${child ? child.name : '?'}</strong>: ${e.type === 'kupa' ? '💩' : '🍼 '+e.amount+'ml'}</span>
                        <small class="text-muted">${time}</small>
                    </li>`;
            }).join('');
        } catch (e) { console.log("Błąd UI:", e); }
    }
}

async function renderChildrenList() {
    const children = await getAllEntries('children');
    document.getElementById('childrenList').innerHTML = children.map(c => `
        <div class="col-12 border-bottom p-2 d-flex justify-content-between">
            <span><strong>${c.name}</strong> (${c.gender})</span>
            <small class="text-muted">Ur. ${c.birth}</small>
        </div>
    `).join('');
}

async function refreshChildrenList() {
    const children = await getAllEntries('children');
    const select = document.getElementById('globalChildSelect');
    if (select) {
        const val = select.value;
        select.innerHTML = '<option value="">-- Wybierz dziecko --</option>' + 
            children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        select.value = val;
    }
}

async function loadWeightHistory() {
    const childId = getSelectedChildId();
    if (!childId) return;
    const weights = await getAllEntries('weight_history');
    const filtered = weights.filter(w => w.childId === childId).sort((a,b) => b.date - a.date);
    document.getElementById('weightHistoryList').innerHTML = filtered.map(w => `
        <li class="list-group-item d-flex justify-content-between">
            <span>${w.weight} g</span>
            <small>${new Date(w.date).toLocaleDateString()}</small>
        </li>
    `).join('');
}

/**
 * SERWIS
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await getDB();
        await refreshChildrenList();
        switchTab('today');
    } catch(e) { console.error(e); }
});

async function clearAppCache() {
    if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for(let r of regs) await r.unregister();
    }
    const names = await caches.keys();
    await Promise.all(names.map(n => caches.delete(n)));
    window.location.reload(true);
}

function resetFullApp() {
    if (confirm("Usuń wszystko?")) {
        indexedDB.deleteDatabase("BabyTrackerProDB");
        location.reload();
    }
}