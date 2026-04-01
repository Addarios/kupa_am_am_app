/**
 * 1. NAWIGACJA I FORMATOWANIE
 */
function switchTab(tabId) {
    console.log("Przełączanie na:", tabId);
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active-tab');
        const activeNav = document.getElementById('nav-' + tabId);
        if (activeNav) activeNav.classList.add('active');
        
        if (tabId === 'today') updateUI('today');
        if (tabId === 'meal') setCurrentTime('mealDateTime');
        if (tabId === 'poop') setCurrentTime('poopDateTime');
        if (tabId === 'weight') {
            setCurrentTime('weightDate');
            loadWeightHistory();
        }
        if (tabId === 'analytics') {
            if (typeof initChart === "function") initChart('feeding', 'hour');
        }
        if (tabId === 'settings') {
            backToProfiles();
            renderChildrenList();
        }
    }
}

function formatLocalDate(dateInput) {
    const d = new Date(dateInput);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function setCurrentTime(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.value = formatLocalDate(new Date());
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
 * 2. ZAPISYWANIE DANYCH
 */
async function addChild() {
    const nameEl = document.getElementById('childName');
    const birthEl = document.getElementById('childBirth');
    const weightEl = document.getElementById('childWeight');
    const genderEl = document.getElementById('childGender');

    if (!nameEl.value || !birthEl.value) return alert("Podaj imię i datę urodzenia!");

    const data = {
        name: nameEl.value,
        birth: birthEl.value,
        gender: genderEl.value,
        weight: parseInt(weightEl.value) || 0
    };

    await window.addEntry('children', data);
    alert("Dziecko dodane!");
    nameEl.value = ""; weightEl.value = "";
    await refreshChildrenList();
    await renderChildrenList();
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
    await addEntry('events', {
        childId,
        type: 'kupa',
        date: new Date(document.getElementById('poopDateTime').value).getTime()
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
    await addEntry('weight_history', { childId, weight, date: new Date(dateVal).getTime() });
    alert("Waga zapisana!");
    document.getElementById('weightInput').value = "";
    loadWeightHistory();
}

/**
 * 3. WYŚWIETLANIE UI
 */
async function updateUI(tabId) {
    if (tabId !== 'today') return;
    try {
        const children = await window.getAllEntries('children');
        const events = await window.getAllEntries('events');
        const todayStr = new Date().toLocaleDateString();

        let summaryHtml = '<div class="row g-2">';
        children.forEach(child => {
            const dayEvents = events.filter(e => e.childId === child.id && new Date(e.date).toLocaleDateString() === todayStr);
            const totalMl = dayEvents.filter(e => e.type === 'posiłek' && e.milkType !== 'Pierś').reduce((s, e) => s + (e.amount || 0), 0);
            const breastCount = dayEvents.filter(e => e.type === 'posiłek' && e.milkType === 'Pierś').length;

            summaryHtml += `
                <div class="col-6">
                    <div class="card p-2 border-0 shadow-sm bg-white text-center">
                        <small class="text-muted fw-bold" style="font-size: 0.65rem;">${child.name}</small>
                        <div class="h5 mb-0 text-primary">${totalMl} ml</div>
                        <div class="text-muted" style="font-size: 0.75rem;">🤱 Piersią: ${breastCount}</div>
                    </div>
                </div>`;
        });
        document.getElementById('summaryCards').innerHTML = summaryHtml + '</div>';

        const historyList = document.getElementById('historyList');
        const sorted = events.sort((a, b) => b.date - a.date).slice(0, 15);
        historyList.innerHTML = sorted.map(e => {
            const child = children.find(c => c.id === e.childId);
            const timeStr = new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const localDate = formatLocalDate(e.date);
            let label = e.type === 'kupa' ? 'Kupa' : (e.milkType === 'Pierś' ? 'Pierś' : `${e.amount}ml`);
            return `<li class="list-group-item d-flex justify-content-between align-items-center px-2" onclick="openEditModal(${e.id}, 'events', ${e.amount || 0}, '${localDate}', '${e.milkType}', '${e.type}')">
                <span><strong>${child ? child.name : '?'}</strong>: ${e.type === 'kupa' ? '💩' : '🍼'} ${label}</span>
                <small class="text-muted">${timeStr} ✏️</small></li>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function renderChildrenList() {
    const children = await getAllEntries('children');
    document.getElementById('childrenList').innerHTML = children.map(c => `
        <div class="col-12 border-bottom p-2 d-flex justify-content-between align-items-center">
            <div><strong>${c.name}</strong> <small class="text-muted">Ur. ${c.birth}</small></div>
            <button onclick="showFullHistory(${c.id}, '${c.name}')" class="btn btn-primary btn-sm">📜 Historia</button>
        </div>`).join('');
}

async function showFullHistory(childId, childName) {
    document.getElementById('profilesView').style.display = 'none';
    document.getElementById('fullHistoryView').style.display = 'block';
    document.getElementById('historyChildName').innerText = `Historia: ${childName}`;
    const events = await window.getAllEntries('events');
    const childEvents = events.filter(e => e.childId === childId).sort((a, b) => b.date - a.date);
    document.getElementById('fullHistoryList').innerHTML = childEvents.map(e => {
        const localDate = formatLocalDate(e.date);
        let label = e.type === 'kupa' ? '💩 Kupa' : (e.milkType === 'Pierś' ? '🤱 Pierś' : `🍼 ${e.amount}ml (${e.milkType})`);
        return `<li class="list-group-item d-flex justify-content-between align-items-center" onclick="openEditModal(${e.id}, 'events', ${e.amount || 0}, '${localDate}', '${e.milkType}', '${e.type}')">
            <div><div class="fw-bold">${label}</div><small class="text-muted">${new Date(e.date).toLocaleString()}</small></div><span>✏️</span></li>`;
    }).join('');
}

function backToProfiles() {
    document.getElementById('profilesView').style.display = 'block';
    document.getElementById('fullHistoryView').style.display = 'none';
}

/**
 * 4. EDYCJA I USUWANIE
 */
function openEditModal(id, store, amount, date, milkType, type) {
    document.getElementById('editId').value = id;
    document.getElementById('editStore').value = store;
    document.getElementById('editAmount').value = amount;
    document.getElementById('editDate').value = date;
    document.getElementById('editMilkType').value = (type === 'kupa') ? 'kupa' : milkType;
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

async function confirmUpdate() {
    const id = parseInt(document.getElementById('editId').value);
    const store = document.getElementById('editStore').value;
    const amount = parseInt(document.getElementById('editAmount').value);
    const date = new Date(document.getElementById('editDate').value).getTime();
    const milkType = document.getElementById('editMilkType').value;

    const all = await window.getAllEntries(store);
    const old = all.find(e => e.id === id);
    const updated = { ...old, amount: (milkType === 'kupa' ? 0 : amount), date, type: (milkType === 'kupa' ? 'kupa' : 'posiłek'), milkType: (milkType === 'kupa' ? null : milkType) };

    await window.updateEntry(store, id, updated);
    alert("Zaktualizowano!");
    closeEditModal();
    updateUI('today');
    if (document.getElementById('fullHistoryView').style.display === 'block') showFullHistory(old.childId, "");
}

async function confirmDelete() {
    if (!confirm("Usunąć?")) return;
    const id = parseInt(document.getElementById('editId').value);
    const store = document.getElementById('editStore').value;
    await window.deleteEntry(store, id);
    alert("Usunięto!");
    closeEditModal();
    updateUI('today');
    backToProfiles();
}

/**
 * 5. SYSTEMOWE
 */
async function refreshChildrenList() {
    const children = await window.getAllEntries('children');
    const select = document.getElementById('globalChildSelect');
    if (select) {
        const cur = select.value;
        select.innerHTML = '<option value="">-- Wybierz dziecko --</option>' + children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (cur) select.value = cur;
    }
}

async function loadWeightHistory() {
    const id = getSelectedChildId();
    if (!id) return;
    const weights = await getAllEntries('weight_history');
    document.getElementById('weightHistoryList').innerHTML = weights.filter(w => w.childId === id).sort((a,b) => b.date - a.date).map(w => `
        <li class="list-group-item d-flex justify-content-between"><span>${w.weight} g</span><small>${new Date(w.date).toLocaleDateString()}</small></li>`).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.getDB();
        await refreshChildrenList();
        await renderChildrenList();
        switchTab('today');
    } catch (e) { console.error(e); }
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
    if (confirm("Usuń wszystko?")) { indexedDB.deleteDatabase("BabyTrackerProDB"); location.reload(); }
}