let db;
const request = indexedDB.open("BabyTrackerProDB", 6);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("events")) db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("children")) db.createObjectStore("children", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("weight_history")) db.createObjectStore("weight_history", { keyPath: "id", autoIncrement: true });
};

const getDB = () => new Promise((resolve, reject) => {
    if (db) resolve(db);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject("Błąd bazy danych");
});

async function addEntry(storeName, data) {
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

async function getAllEntries(storeName) {
    const database = await getDB();
    return new Promise(resolve => {
        database.transaction(storeName, "readonly").objectStore(storeName).getAll().onsuccess = (e) => resolve(e.target.result);
    });
}