let db;
const request = indexedDB.open("BabyTrackerProDB", 8);

// 1. Obsługa tworzenia struktury bazy
request.onupgradeneeded = (e) => {
    let database = e.target.result;
    console.log("Tworzenie/Aktualizacja struktury bazy...");
    if (!database.objectStoreNames.contains("events")) {
        database.createObjectStore("events", { keyPath: "id", autoIncrement: true });
    }
    if (!database.objectStoreNames.contains("children")) {
        database.createObjectStore("children", { keyPath: "id", autoIncrement: true });
    }
    if (!database.objectStoreNames.contains("weight_history")) {
        database.createObjectStore("weight_history", { keyPath: "id", autoIncrement: true });
    }
};

// 2. Obsługa sukcesu otwarcia
request.onsuccess = (e) => {
    db = e.target.result;
    console.log("Połączenie z IndexedDB ustanowione.");
};

request.onerror = (e) => {
    console.error("Błąd krytyczny IndexedDB:", e.target.error);
};

// 3. Funkcja pobierająca bazę (z poprawionym czekaniem)
window.getDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }
        // Jeśli db jeszcze nie ma, czekamy na sukces requestu
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = () => reject("Nie udało się otworzyć bazy danych");
    });
};

// 4. Uniwersalna funkcja zapisu
window.addEntry = async function(storeName, data) {
    const database = await window.getDB(); 
    return new Promise((resolve, reject) => {
        try {
            const tx = database.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const addRequest = store.add(data);

            addRequest.onsuccess = () => {
                console.log(`Zapisano pomyślnie do ${storeName}`);
                resolve(addRequest.result);
            };

            addRequest.onerror = (e) => {
                console.error(`Błąd zapisu do ${storeName}:`, e.target.error);
                reject(e.target.error);
            };
        } catch (err) {
            console.error("Błąd transakcji:", err);
            reject(err);
        }
    });
};

// 5. Uniwersalna funkcja pobierania
window.getAllEntries = async function(storeName) {
    const database = await window.getDB();
    return new Promise((resolve, reject) => {
        try {
            const tx = database.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const getRequest = store.getAll();

            getRequest.onsuccess = (e) => resolve(e.target.result);
            getRequest.onerror = (e) => reject(e.target.error);
        } catch (err) {
            reject(err);
        }
    });
};

// Aktualizacja istniejącego rekordu
window.updateEntry = async function(storeName, id, newData) {
    const database = await window.getDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        // Dodajemy ID do obiektu danych, aby nadpisać stary rekord
        const request = store.put({ ...newData, id: id });
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

// Usuwanie rekordu
window.deleteEntry = async function(storeName, id) {
    const database = await window.getDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};