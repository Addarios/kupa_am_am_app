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

// Funkcja aktualizacji widoku
async function updateUI(tabId) {
    const childId = parseInt(document.getElementById('globalChildSelect').value);
    
    if (tabId === 'today') {
        const events = await getAllEntries('events');
        const filtered = events.filter(e => !childId || e.childId === childId).reverse();
        
        const list = document.getElementById('historyList');
        if(list) {
            list.innerHTML = filtered.slice(0, 10).map(e => `
                <li class="list-group-item d-flex justify-content-between p-2">
                    <span>${e.type === 'kupa' ? '💩' : '🍼'} ${e.amount ? e.amount+'ml' : ''}</span>
                    <small class="text-muted">${new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
                </li>`).join('');
        }
    }
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

// Funkcje zapisu (uproszczone dla testu)
async function saveMeal() {
    const childId = parseInt(document.getElementById('globalChildSelect').value);
    if(!childId) return alert("Wybierz dziecko!");
    const amount = parseInt(document.getElementById('mlAmount').value) || 0;
    const date = document.getElementById('mealDateTime').value;
    
    await addEntry('events', { childId, type: 'posiłek', amount, milkType: document.getElementById('milkType').value, date: new Date(date) });
    alert("Zapisano posiłek");
    switchTab('today');
}

async function savePoop() {
    const childId = parseInt(document.getElementById('globalChildSelect').value);
    if(!childId) return alert("Wybierz dziecko!");
    const date = document.getElementById('poopDateTime').value;
    
    await addEntry('events', { childId, type: 'kupa', date: new Date(date) });
    alert("Zapisano 💩");
    switchTab('today');
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
    alert("Przycisk kliknięty!"); // Dodaj to!
    console.log("Próba dodania dziecka...");
    const nameEl = document.getElementById('childName');
    const birthEl = document.getElementById('childBirth');

    if (!nameEl || !birthEl) {
        console.error("Nie znaleziono pól formularza w HTML!");
        return;
    }

    const name = nameEl.value;
    const birth = birthEl.value;

    if (!name || !birth) {
        alert("Proszę podać imię i datę urodzenia!");
        return;
    }

    try {
        await addEntry('children', { name, birth });
        console.log("Dziecko dodane pomyślnie");
        
        // Czyścimy pola
        nameEl.value = "";
        birthEl.value = "";
        
        // Odświeżamy listy
        await refreshChildrenList();
        alert("Dodano profil: " + name);
    } catch (err) {
        console.error("Błąd zapisu dziecka:", err);
    }
}