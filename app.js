document.addEventListener('DOMContentLoaded', async () => {
    await getDB();
    initApp();
});

function initApp() {
    refreshChildrenList();
    setCurrentTime();

    // POPRAWIONA OBSŁUGA NAWIGACJI
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.onclick = (e) => {
            // Znajduje najbliższy element z klasą nav-item (nawet jeśli klikniesz w ikonkę)
            const clickedItem = e.target.closest('.nav-item');
            if (!clickedItem) return;

            const tabId = clickedItem.getAttribute('data-tab');
            
            // 1. Ukryj wszystkie zakładki
            document.querySelectorAll('.tab-content').forEach(t => {
                t.classList.remove('active-tab');
            });

            // 2. Usuń klasę active ze wszystkich przycisków
            navItems.forEach(n => n.classList.remove('active'));

            // 3. Pokaż wybraną zakładkę i dodaj klasę active
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active-tab');
                clickedItem.classList.add('active');
                
                // 4. Odśwież dane dla konkretnej zakładki
                updateUI(tabId);
            }
        };
    });

    // Event Listenery dla przycisków
    document.getElementById('btnSaveMeal').onclick = saveMeal;
    document.getElementById('btnSavePoop').onclick = savePoop;
    document.getElementById('btnSaveWeight').onclick = saveWeight;
    document.getElementById('btnAddChild').onclick = addChild;
    document.getElementById('globalChildSelect').onchange = () => updateUI('today');
}

function getChildId() {
    return parseInt(document.getElementById('globalChildSelect').value) || null;
}

function setCurrentTime() {
    const now = new Date().toISOString().slice(0, 16);
    if(document.getElementById('mealDateTime')) document.getElementById('mealDateTime').value = now;
    if(document.getElementById('poopDateTime')) document.getElementById('poopDateTime').value = now;
}

async function saveMeal() {
    const childId = getChildId();
    if(!childId) return alert("Wybierz dziecko!");
    const data = {
        childId,
        type: 'posiłek',
        milkType: document.getElementById('milkType').value,
        amount: parseInt(document.getElementById('mlAmount').value) || 0,
        date: new Date(document.getElementById('mealDateTime').value)
    };
    await addEntry('events', data);
    alert("Smacznego!");
    updateUI('today');
}

async function savePoop() {
    const childId = getChildId();
    if(!childId) return alert("Wybierz dziecko!");
    await addEntry('events', { childId, type: 'kupa', date: new Date(document.getElementById('poopDateTime').value) });
    alert("Zapisano 💩");
}

async function saveWeight() {
    const childId = getChildId();
    const weight = parseInt(document.getElementById('newWeight').value);
    if(!childId || !weight) return alert("Wybierz dziecko i podaj wagę!");
    await addEntry('weight_history', { childId, weight, date: new Date(document.getElementById('weightDate').value) });
    updateUI('weight');
}

async function addChild() {
    const name = document.getElementById('childName').value;
    const birth = document.getElementById('childBirth').value;
    if(!name) return;
    await addEntry('children', { name, birth });
    refreshChildrenList();
}

async function refreshChildrenList() {
    const children = await getAllEntries('children');
    const select = document.getElementById('globalChildSelect');
    const list = document.getElementById('childrenList');
    
    select.innerHTML = '<option value="">-- Wybierz dziecko --</option>' + 
        children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    if(list) {
        list.innerHTML = children.map(c => `<div class="card p-2 mb-2 border-start border-primary border-4 shadow-sm small">${c.name} (ur. ${c.birth})</div>`).join('');
    }
}

async function updateUI(tabId) {
    const childId = getChildId();
    if(tabId === 'today') {
        const events = await getAllEntries('events');
        const filtered = events.filter(e => e.childId === childId).reverse();
        const todayStr = new Date().toDateString();
        const totalMl = filtered.filter(e => new Date(e.date).toDateString() === todayStr && e.type === 'posiłek').reduce((s, e) => s + e.amount, 0);
        
        document.getElementById('summaryCards').innerHTML = `<div class="col-12"><div class="card p-2 bg-primary text-white">Dzisiaj: ${totalMl} ml</div></div>`;
        document.getElementById('historyList').innerHTML = filtered.slice(0, 10).map(e => `
            <li class="list-group-item d-flex justify-content-between">
                <span>${e.type === 'kupa' ? '💩' : '🍼'} ${e.amount ? e.amount+'ml' : ''}</span>
                <small>${new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
            </li>`).join('');
    }
    if(tabId === 'weight') {
        const history = await getAllEntries('weight_history');
        const filtered = history.filter(h => h.childId === childId).reverse();
        document.getElementById('weightHistoryList').innerHTML = filtered.map(h => `<li class="list-group-item d-flex justify-content-between p-1"><span>${new Date(h.date).toLocaleDateString()}</span><strong>${h.weight}g</strong></li>`).join('');
    }
}