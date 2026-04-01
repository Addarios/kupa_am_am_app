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

// Funkcja pomocnicza do formatowania daty dla inputa datetime-local
function formatLocalDate(dateInput) {
    const d = new Date(dateInput);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// Przykład użycia wewnątrz historyList.map:
const dateForPicker = formatLocalDate(e.date);

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
            console.log("Odświeżam stronę główną...");
            const children = await window.getAllEntries('children');
            const events = await window.getAllEntries('events');
            
            // Pobieramy dzisiejszą datę w formacie lokalnym do porównania
            const todayStr = new Date().toLocaleDateString();

            // 1. PODSUMOWANIE (KARTY)
            let summaryHtml = '<div class="row g-2">';
            children.forEach(child => {
                const childTodayEvents = events.filter(e => 
                    e.childId === child.id && 
                    new Date(e.date).toLocaleDateString() === todayStr
                );

                const totalMl = childTodayEvents
                    .filter(e => e.type === 'posiłek' && e.milkType !== 'Pierś')
                    .reduce((sum, e) => sum + (parseInt(e.amount) || 0), 0);

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

            // 2. LISTA OSTATNICH 15 ZDARZEŃ (Z poprawką czasu lokalnego)
            const historyList = document.getElementById('historyList');
            
            // Sortujemy od najnowszych
            const sortedEvents = events.sort((a, b) => b.date - a.date).slice(0, 15);

            historyList.innerHTML = sortedEvents.map(e => {
                const child = children.find(c => c.id === e.childId);
                const dateObj = new Date(e.date);
                
                // Formatowanie czasu do wyświetlenia
                const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Formatowanie daty do inputa (poprawka +2h)
                const localDateForPicker = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
                                            .toISOString()
                                            .slice(0, 16);

                let icon = e.type === 'kupa' ? '💩' : '🍼';
                let label = e.type === 'kupa' ? 'Kupa' : (e.milkType === 'Pierś' ? 'Pierś' : `${e.amount}ml`);

                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center px-2 shadow-none" 
                        onclick="openEditModal(${e.id}, 'events', ${e.amount || 0}, '${localDateForPicker}', '${e.milkType}', '${e.type}')">
                        <span><strong>${child ? child.name : '?'}</strong>: ${icon} ${label}</span>
                        <small class="text-muted">${timeStr} ✏️</small>
                    </li>`;
            }).join('');

            if (sortedEvents.length === 0) {
                historyList.innerHTML = '<li class="list-group-item text-center text-muted small">Brak zdarzeń z ostatnich dni</li>';
            }
            
        } catch (e) {
            console.error("Błąd aktualizacji UI:", e);
        }
    }
}

async function renderChildrenList() {
    const children = await getAllEntries('children');
    const list = document.getElementById('childrenList');
    if (!list) return;

    list.innerHTML = children.map(c => `
        <div class="col-12">
            <div class="card p-3 shadow-sm border-0 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${c.name}</strong> 
                        <div class="small text-muted">${c.gender} | Ur. ${c.birth}</div>
                    </div>
                    <button onclick="showFullHistory(${c.id}, '${c.name}')" class="btn btn-primary btn-sm">
                        📜 Historia
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}
async function showFullHistory(childId, childName) {
    document.getElementById('profilesView').style.display = 'none';
    document.getElementById('fullHistoryView').style.display = 'block';
    document.getElementById('historyChildName').innerText = `Historia: ${childName}`;

    const events = await window.getAllEntries('events');
    const childEvents = events
        .filter(e => e.childId === childId)
        .sort((a, b) => b.date - a.date);

    const historyList = document.getElementById('fullHistoryList');
    
    historyList.innerHTML = childEvents.map(e => {
        const dateObj = new Date(e.date);
        
        // POPRAWKA CZASU LOKALNEGO TUTAJ:
        const localDateForPicker = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
                                    .toISOString()
                                    .slice(0, 16);

        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let label = e.type === 'kupa' ? '💩 Kupa' : (e.milkType === 'Pierś' ? '🤱 Pierś' : `🍼 ${e.amount}ml (${e.milkType})`);

        return `
            <li class="list-group-item d-flex justify-content-between align-items-center" 
                onclick="openEditModal(${e.id}, 'events', ${e.amount || 0}, '${localDateForPicker}', '${e.milkType}', '${e.type}')">
                <div>
                    <div class="fw-bold">${label}</div>
                    <small class="text-muted">${dateStr}, ${timeStr}</small>
                </div>
                <span class="text-primary">✏️</span>
            </li>`;
    }).join('');
}

// 3. Powrót do listy dzieci
function backToProfiles() {
    document.getElementById('profilesView').style.display = 'block';
    document.getElementById('fullHistoryView').style.display = 'none';
}

async function refreshChildrenList() {
    try {
        const children = await window.getAllEntries('children');
        const select = document.getElementById('globalChildSelect');
        
        if (select) {
            const currentSelected = select.value; // Zapamiętaj co było wybrane
            
            let html = '<option value="">-- Wybierz dziecko --</option>';
            html += children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
            select.innerHTML = html;
            
            // Przywróć wybór, jeśli dziecko wciąż istnieje
            if (currentSelected) select.value = currentSelected;
            
            console.log("Lista dzieci w selektorze odświeżona.");
        }
    } catch (e) {
        console.error("Błąd refreshChildrenList:", e);
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
    console.log("Aplikacja startuje...");
    try {
        // 1. Czekamy na połączenie z bazą
        await window.getDB();
        console.log("Baza danych gotowa.");

        // 2. Ładujemy listę dzieci do górnego selektora (Kluczowe!)
        await refreshChildrenList();
        
        // 3. Ładujemy listę dzieci w widoku profilu (jeśli tam jesteśmy)
        await renderChildrenList();
        
        // 4. Uruchamiamy widok główny
        switchTab('today');
        
    } catch (e) {
        console.error("Błąd podczas startu aplikacji:", e);
    }
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
function openEditModal(id, store, amount, date, milkType, type) {
    document.getElementById('editId').value = id;
    document.getElementById('editStore').value = store;
    document.getElementById('editAmount').value = amount;
    document.getElementById('editDate').value = date;
    
    // Jeśli to kupa, ustawiamy typ na kupa, w przeciwnym razie na konkretne mleko
    const select = document.getElementById('editMilkType');
    select.value = (type === 'kupa') ? 'kupa' : milkType;
    
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
    const selectedType = document.getElementById('editMilkType').value;

    const all = await window.getAllEntries(store);
    const oldEntry = all.find(e => e.id === id);

    // Budujemy nowy obiekt danych
    const updatedData = { 
        ...oldEntry, 
        amount: amount, 
        date: date 
    };

    // Jeśli wybrano 'kupa', zmieniamy typ główny i zerujemy ml
    if (selectedType === 'kupa') {
        updatedData.type = 'kupa';
        updatedData.milkType = null;
        updatedData.amount = 0;
    } else {
        updatedData.type = 'posiłek';
        updatedData.milkType = selectedType;
    }

    await window.updateEntry(store, id, updatedData);
    
    alert("Dane zaktualizowane!");
    closeEditModal();
    updateUI('today');

    if (document.getElementById('fullHistoryView').style.display === 'block') {
        const childName = document.getElementById('historyChildName').innerText.replace('Historia: ', '');
        // Pobieramy ID z jakiegoś ukrytego pola lub ponownie renderujemy (najprościej wywołać switchTab lub ponownie showFullHistory)
        // Ale najprościej jest po prostu wymusić ponowne wejście w profil lub zamknąć historię
        backToProfiles(); 
    }
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