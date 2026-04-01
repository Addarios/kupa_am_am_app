/**
 * NAWIGACJA
 */
function switchTab(tabId) {
    console.log("Przełączanie na:", tabId);
    
    // 1. Ukryj wszystkie sekcje
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active-tab'));

    // 2. Dezaktywuj przyciski menu
    const navs = document.querySelectorAll('.nav-item');
    navs.forEach(n => n.classList.remove('active'));

    // 3. Pokaż wybraną sekcję
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active-tab');
        
        // Szukamy przycisku nawigacji po ID (np. nav-today, nav-meal)
        const activeNav = document.getElementById('nav-' + tabId);
        if (activeNav) activeNav.classList.add('active');
        
        // 4. Wywołanie odświeżania danych dla konkretnej zakładki
        if (tabId === 'today') updateUI('today');
        
        if (tabId === 'meal') setCurrentTime('mealDateTime');
        
        if (tabId === 'poop') setCurrentTime('poopDateTime');
        
        if (tabId === 'weight') {
            setCurrentTime('weightDate');
            loadWeightHistory();
        }
        
        // NOWOŚĆ: Obsługa zakładki wykresów
        if (tabId === 'analytics') {
            if (typeof initChart === "function") {
                initChart('feeding'); // Domyślnie ładuj wykres posiłków
            }
        }
        
        if (tabId === 'settings') renderChildrenList();
        
    } else {
        console.error("Nie znaleziono sekcji o ID:", tabId);
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
    console.log("1. Start addChild");
    try {
        const nameEl = document.getElementById('childName');
        const birthEl = document.getElementById('childBirth');
        const weightEl = document.getElementById('childWeight');
        const genderEl = document.getElementById('childGender');

        if (!nameEl || !birthEl) {
            console.error("Nie znaleziono pól formularza w HTML!");
            return;
        }

        const data = {
            name: nameEl.value,
            birth: birthEl.value,
            gender: genderEl.value,
            weight: parseInt(weightEl.value) || 0
        };

        console.log("2. Dane przygotowane:", data);

        if (!data.name || !data.birth) {
            alert("Podaj imię i datę urodzenia!");
            return;
        }

        console.log("3. Wywołuję addEntry z db.js...");
        // Używamy window.addEntry, żeby mieć pewność, że widzi funkcję z drugiego pliku
        await window.addEntry('children', data);
        
        console.log("4. Zapis zakończony sukcesem!");
        alert("Dziecko dodane!");
        
        nameEl.value = "";
        if(weightEl) weightEl.value = "";
        
        await refreshChildrenList();
        await renderChildrenList();
    } catch (e) {
        console.error("BŁĄD w addChild:", e);
        alert("Wystąpił błąd: " + e.message);
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

            // 1. Podsumowanie dla każdego dziecka
            let summaryHtml = '<div class="row g-2">';
            children.forEach(child => {
                // Filtrujemy dzisiejsze zdarzenia tego dziecka
                const childTodayEvents = events.filter(e => 
                    e.childId === child.id && 
                    new Date(e.date).toDateString() === todayStr
                );

                // Suma ml (tylko butelki/modyfikowane)
                const totalMl = childTodayEvents
                    .filter(e => e.type === 'posiłek' && e.milkType !== 'Pierś')
                    .reduce((sum, e) => sum + (parseInt(e.amount) || 0), 0);

                // Liczba karmień piersią
                const breastCount = childTodayEvents
                    .filter(e => e.type === 'posiłek' && e.milkType === 'Pierś')
                    .length;

                summaryHtml += `
                    <div class="col-6">
                        <div class="card p-2 border-0 shadow-sm bg-white text-center">
                            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">${child.name}</small>
                            <div class="h5 mb-0 text-primary">${totalMl} ml</div>
                            <div class="text-muted" style="font-size: 0.75rem;">
                                🤱 Piersią: <strong>${breastCount}</strong>
                            </div>
                        </div>
                    </div>`;
            });
            summaryHtml += '</div>';
            document.getElementById('summaryCards').innerHTML = summaryHtml;

            // 2. Lista ostatnich zdarzeń (to zostaje bez zmian)
            const historyList = document.getElementById('historyList');
            const lastEvents = events.sort((a, b) => b.date - a.date).slice(0, 15);

            historyList.innerHTML = lastEvents.map(e => {
                const child = children.find(c => c.id === e.childId);
                const time = new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                const label = e.type === 'kupa' ? '💩 Kupa' : (e.milkType === 'Pierś' ? '🤱 Pierś' : `🍼 ${e.amount}ml`);
                
                // Dodajemy onclick i przesyłamy ID oraz typ
                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center px-2" 
                        onclick="openEditModal(${e.id}, 'events', ${e.amount}, '${new Date(e.date).toISOString().slice(0,16)}')">
                        <span><strong>${child ? child.name : '?'}</strong>: ${label}</span>
                        <small class="text-muted">${time} ✏️</small>
                    </li>`;
            }).join('');
            
        } catch (e) {
            console.error("Błąd aktualizacji UI:", e);
        }
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
function openEditModal(id, store, amount, date) {
    document.getElementById('editId').value = id;
    document.getElementById('editStore').value = store;
    document.getElementById('editAmount').value = amount;
    document.getElementById('editDate').value = date;
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function confirmUpdate() {
    const id = parseInt(document.getElementById('editId').value);
    const store = document.getElementById('editStore').value;
    const amount = parseInt(document.getElementById('editAmount').value);
    const date = new Date(document.getElementById('editDate').value).getTime();

    // Pobieramy stary rekord, żeby nie stracić childId i innych pól
    const all = await window.getAllEntries(store);
    const oldEntry = all.find(e => e.id === id);

    const updatedData = { ...oldEntry, amount: amount, date: date };
    await window.updateEntry(store, id, updatedData);
    
    alert("Zaktualizowano!");
    closeEditModal();
    updateUI('today'); // Odśwież widok
}

async function confirmDelete() {
    if (confirm("Czy na pewno chcesz usunąć ten rekord?")) {
        const id = parseInt(document.getElementById('editId').value);
        const store = document.getElementById('editStore').value;
        await window.deleteEntry(store, id);
        
        alert("Usunięto!");
        closeEditModal();
        updateUI('today');
    }
}