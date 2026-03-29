// Funkcja przełączania zakładek - MUSI być globalna
function switchTab(tabId) {
    console.log("Próba przełączenia na:", tabId);

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
        const activeNav = document.getElementById('nav-' + tabId);
        if (activeNav) activeNav.classList.add('active');
        
        // Wywołaj aktualizację danych
        updateUI(tabId);
    } else {
        console.error("Nie znaleziono sekcji:", tabId);
    }
}
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active-tab');
    
    // Obsługa zdarzeń przy wejściu w zakładkę
    if(id === 'meal') {
        setCurrentTime('mealDateTime');
    }
    if(id === 'report') loadHistory();
    if(id === 'settings') renderChildrenList();
    if(id === 'weight_tab') {
        // Tu też możesz dodać setCurrentTime jeśli dodasz pole daty do wagi
        loadWeightHistory();
    }
}

// Funkcja aktualizacji widoku
async function updateUI(tabId) {
    if (tabId === 'today') {
        const children = await getAllEntries('children');
        const events = await getAllEntries('events');
        const todayStr = new Date().toDateString();

        // 1. Podsumowanie całościowe dla każdego dziecka
        let summaryHtml = '<div class="row g-2">';
        children.forEach(child => {
            const childTotal = events
                .filter(e => e.childId === child.id && 
                             e.type === 'posiłek' && 
                             new Date(e.date).toDateString() === todayStr)
                .reduce((sum, e) => sum + e.amount, 0);

            summaryHtml += `
                <div class="col-6">
                    <div class="card p-2 border-0 shadow-sm bg-white">
                        <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">${child.name}</small>
                        <div class="h5 mb-0 text-primary">${childTotal} ml</div>
                    </div>
                </div>`;
        });
        summaryHtml += '</div>';
        document.getElementById('summaryCards').innerHTML = summaryHtml;

        // 2. Lista ostatnich 10 zdarzeń (ogólna)
        const historyList = document.getElementById('historyList');
        const lastEvents = events.sort((a, b) => b.date - a.date).slice(0, 10);
        
        historyList.innerHTML = lastEvents.map(e => {
            const child = children.find(c => c.id === e.childId);
            const time = new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center px-2">
                    <span><strong>${child ? child.name : '?'}</strong>: ${e.type === 'kupa' ? '💩' : '🍼 ' + e.amount + 'ml'}</span>
                    <small class="text-muted">${time}</small>
                </li>`;
        }).join('');
    }
}
function setCurrentTime(elementId) {
    const now = new Date();
    // Formatowanie do YYYY-MM-DDTHH:mm (wymagane przez datetime-local)
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById(elementId).value = now.toISOString().slice(0, 16);
}
// Inicjalizacja po załadowaniu strony
// Ten blok kodu wykonuje się SAMODZIELNIE zaraz po wczytaniu strony
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Aplikacja startuje...");
    try {
        // Czekamy na połączenie z bazą (z pliku db.js)
        await getDB(); 
        console.log("Baza danych gotowa.");

        // Ładujemy listę dzieci do selektora na górze
        await refreshChildrenList();
        
        // Ustawiamy aktualną datę w formularzach
        setCurrentTime();
        
        // Ładujemy historię dla domyślnego widoku
        updateUI('today');
    } catch (e) {
        console.error("Błąd podczas startu aplikacji:", e);
    }
});
function getSelectedChild() {
    const select = document.getElementById('globalChildSelect');
    if (!select || !select.value) {
        alert("Najpierw wybierz dziecko na górze strony!");
        return null;
    }
    return parseInt(select.value);
}
// Funkcje zapisu (uproszczone dla testu)
// Poprawiona funkcja zapisu posiłku
function saveMeal() {
    // Sprawdzamy czy funkcja getSelectedChild istnieje (powinna być zdefiniowana wcześniej)
    const childId = getSelectedChild(); 
    if(!childId) return; // alert jest wewnątrz getSelectedChild

    const milk = document.getElementById('milkType').value;
    const ml = parseInt(document.getElementById('mlAmount').value) || 0;
    const customDate = document.getElementById('mealDateTime').value;

    const tx = db.transaction("events", "readwrite");
    tx.objectStore("events").add({ 
        childId: childId, 
        type: 'posiłek', 
        milkType: milk, 
        amount: ml, 
        date: new Date(customDate) // Zapisuje datę wybraną przez użytkownika
    });

    tx.oncomplete = () => {
        alert("Zapisano posiłek!");
        document.getElementById('mlAmount').value = '';
        showTab('report'); // Wraca do raportu
    };
    
    tx.onerror = (e) => {
        console.error("Błąd zapisu:", e.target.error);
    };
}

// Poprawiona funkcja zapisu kupy
async function savePoop() {
    const childId = getChildId();
    const dateVal = document.getElementById('poopDateTime').value;

    if (!childId || !dateVal) {
        alert("Wybierz dziecko i datę!");
        return;
    }

    await addEntry('events', { 
        childId, 
        type: 'kupa', 
        date: new Date(dateVal).getTime() // Zapisujemy jako liczbę
    });
    alert("Zapisano 💩");
    switchTab('today');
}
async function saveWeight() {
    const childId = getChildId();
    const weight = parseInt(document.getElementById('newWeight').value);
    const dateVal = document.getElementById('weightDate').value;

    if (!childId || isNaN(weight) || !dateVal) {
        alert("Wybierz dziecko, podaj wagę i datę!");
        return;
    }

    await addEntry('weight_history', { 
        childId, 
        weight, 
        date: new Date(dateVal).getTime() 
    });
    
    document.getElementById('newWeight').value = "";
    alert("Waga zapisana!");
    updateUI('weight');
}
async function refreshChildrenList() {
    const children = await getAllEntries('children');
    const select = document.getElementById('globalChildSelect');
    if(select) {
        const current = select.value;
        select.innerHTML = '<option value="">-- Wybierz dziecko --</option>' + 
            children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        select.value = current;
    }
}

async function addChild() {
    console.log("1. Start funkcji addChild");
    const nameEl = document.getElementById('childName');
    const birthEl = document.getElementById('childBirth');

    if (!nameEl.value || !birthEl.value) {
        alert("Wypełnij imię i datę!");
        return;
    }

    const newChild = { 
        name: nameEl.value, 
        birth: birthEl.value 
    };

    console.log("2. Dane do zapisu:", newChild);

    try {
        // Tu najczęściej następuje blokada
        await addEntry('children', newChild); 
        console.log("3. Sukces! Zapisano w IndexedDB");

        nameEl.value = "";
        birthEl.value = "";
        
        await refreshChildrenList();
        alert("Dodano dziecko!");
    } catch (err) {
        console.error("BŁĄD w kroku 3:", err);
        alert("Błąd bazy danych: " + err);
    }
}
// 1. Czyszczenie tylko plików aplikacji (HTML/JS/CSS) - BEZPIECZNE
async function clearAppCache() {
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
            await registration.unregister(); // Wyrejestruj SW
        }
    }
    
    // Usuń wszystkie magazyny cache przeglądarki
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(name => caches.delete(name))
    );

    alert("Pamięć podręczna wyczyszczona. Aplikacja przeładuje się teraz.");
    window.location.reload(true); // Wymuś przeładowanie z serwera
}

// 2. Całkowity reset (Dane dzieci + pliki) - NIEBEZPIECZNE
function resetFullApp() {
    if (confirm("CZY NA PEWNO? To usunie wszystkie dane dzieci, wagę i historię posiłków bezpowrotnie!")) {
        const req = indexedDB.deleteDatabase("BabyTrackerProDB");
        req.onsuccess = () => {
            clearAppCache(); // Czyści też pliki i przeładowuje
        };
    }
}