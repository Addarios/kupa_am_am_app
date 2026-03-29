let db;
const request = indexedDB.open("BabyTrackerProDB", 7);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("events")) db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("children")) db.createObjectStore("children", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("weight_history")) db.createObjectStore("weight_history", { keyPath: "id", autoIncrement: true });
};

window.getDB = () => new Promise((resolve, reject) => {
    if (db) resolve(db);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject("Błąd bazy danych");
});

window.addEntry = async function(storeName, data) {
    const database = await getDB(); // Pobiera bazę danych
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => {
            console.error("Błąd zapisu do " + storeName, e.target.error);
            reject(e.target.error);
        };
    });
}

window.getAllEntries = async function(storeName) {
    const database = await getDB();
    return new Promise(resolve => {
        database.transaction(storeName, "readonly").objectStore(storeName).getAll().onsuccess = (e) => resolve(e.target.result);
    });
}