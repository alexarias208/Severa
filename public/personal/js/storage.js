/* ============================================
   STORAGE - localStorage + IndexedDB Abstraction
   ============================================ */

var Storage = {
    KEYS: {
        USERS: 'plataforma_users',
        SESSION: 'plataforma_session',
        MODULES_GLOBAL: 'plataforma_modules_global',
        DATA_PREFIX: 'plataforma_data_'
    },

    DB_NAME: 'plataformaDB',
    DB_VERSION: 2,
    /** Tamaño máximo por imagen (bytes) antes de codificar a data URL */
    MAX_FOTO_FILE_BYTES: 600 * 1024,
    FOTOS_STORE: 'fotos',
    _db: null,

    // ==================== localStorage / Tauri SQLite ====================

    _get(key) {
        try {
            if (typeof TauriStorage !== 'undefined' && TauriStorage.isTauri()) {
                return TauriStorage.get(key);
            }
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Storage._get error:', key, e);
            return null;
        }
    },

    _set(key, value) {
        try {
            if (typeof TauriStorage !== 'undefined' && TauriStorage.isTauri()) {
                TauriStorage.set(key, value);
                return true;
            }
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage._set error:', key, e);
            return false;
        }
    },

    _remove(key) {
        if (typeof TauriStorage !== 'undefined' && TauriStorage.isTauri()) {
            TauriStorage.remove(key);
            return;
        }
        localStorage.removeItem(key);
    },

    // --- Users ---
    getUsers() {
        return this._get(this.KEYS.USERS) || {};
    },

    saveUsers(users) {
        return this._set(this.KEYS.USERS, users);
    },

    getUser(email) {
        const users = this.getUsers();
        return users[email] || null;
    },

    saveUser(email, userData) {
        const users = this.getUsers();
        users[email] = userData;
        return this.saveUsers(users);
    },

    deleteUser(email) {
        const users = this.getUsers();
        delete users[email];
        this.saveUsers(users);
        this._remove(this.KEYS.DATA_PREFIX + email);
    },

    // --- Session ---
    getSession() {
        return this._get(this.KEYS.SESSION);
    },

    setSession(email, managerViewMode = false) {
        const s = this.getSession() || {};
        return this._set(this.KEYS.SESSION, {
            email: typeof email === 'string' ? email : (s.email || null),
            managerViewMode: typeof managerViewMode === 'boolean' ? managerViewMode : (s.managerViewMode ?? false),
            modoActivo: null // Reset on session change; use setActiveMode when user selects profile
        });
    },

    setActiveMode(mode) {
        const s = this.getSession();
        if (!s) return false;
        s.modoActivo = mode;
        return this._set(this.KEYS.SESSION, s);
    },

    getActiveMode() {
        const s = this.getSession();
        return s?.modoActivo || null;
    },

    clearSession() {
        this._remove(this.KEYS.SESSION);
    },

    // --- User Data (isolated per user) ---
    getUserData(email) {
        if (!email) return null;
        const data = this._get(this.KEYS.DATA_PREFIX + email) || this._defaultUserData();
        let changed = false;
        if (this._migratePrioridadesDia(data)) changed = true;
        if (this._migrateCalendarioPrefs(data)) changed = true;
        if (changed) {
            this._set(this.KEYS.DATA_PREFIX + email, data);
        }
        return data;
    },

    /**
     * prioridadesDia: cada ítem tiene fecha (YYYY-MM-DD) y opcionalmente eventoId.
     * Migración: ítems sin fecha → asignar fecha de hoy (una sola vez al persistir).
     */
    _migratePrioridadesDia(data) {
        if (!data || !Array.isArray(data.prioridadesDia)) return false;
        const today = typeof DateUtils !== 'undefined' && DateUtils.today ? DateUtils.today() : new Date().toISOString().slice(0, 10);
        let changed = false;
        data.prioridadesDia.forEach(p => {
            if (p && !p.fecha) {
                p.fecha = today;
                changed = true;
            }
        });
        return changed;
    },

    /**
     * Calendario: preferencia para mezclar vista con agenda Modo Trabajo (solo lectura).
     * Por defecto se muestra la fusión; el usuario puede desactivarla con el interruptor en #calendar.
     */
    _migrateCalendarioPrefs(data) {
        if (!data) return false;
        if (!data.calendario) data.calendario = { eventos: [] };
        if (!Array.isArray(data.calendario.eventos)) data.calendario.eventos = [];
        let changed = false;
        if (data.calendario._fusionTrabajoPrefV2 !== true) {
            data.calendario.mostrarTrabajo = true;
            data.calendario._fusionTrabajoPrefV2 = true;
            changed = true;
        } else if (data.calendario.mostrarTrabajo === undefined) {
            data.calendario.mostrarTrabajo = true;
            changed = true;
        }
        return changed;
    },

    saveUserData(email, data) {
        if (!email) return false;
        return this._set(this.KEYS.DATA_PREFIX + email, data);
    },

    _defaultUserData() {
        return {
            finanzas: { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] },
            // gastosCompartidos.periodosCerrados: snapshots inmutables [{ id, etiqueta, desde, hasta, cerradoEn, participantes, gastos, balance, transferencias, detalle }]
            gastosCompartidos: { participantes: [], gastos: [], periodosCerrados: [] },
            calendario: { eventos: [], mostrarTrabajo: true },
            habitos: { lista: [], registros: {}, vicios: [], registrosVicios: {} },
            // estudios: ramos[{ id, nombre, profesor?, correos?, companeros?, notas?, calificaciones[], horario[{ dia, horaInicio, horaFin, sala? }] }], pruebas[{ id?, ramoId, fecha, ponderacion, nota?, titulo? }]
            estudios: { ramos: [], pruebas: [] },
            religion: {
                posicionActual: { libro: 0, capitulo: 0, versiculo: 0 },
                favoritos: [],
                reflexiones: {},
                progreso: { versiculosLeidos: 0, totalVersiculos: 0, ultimaLectura: null, versiculosHoy: 0 },
                modoLectura: true
            },
            ciclo: { registros: {}, duracionCiclo: 28, ultimoInicio: null, encuentros: [] },
            ejercicios: { sesiones: [] },
            juegos: {
                palabraDia: { fecha: null, intentos: 0, resuelto: false },
                crucigrama: { mejorTiempo: null, resueltos: 0 },
                sudoku: { mejorTiempo: null, resueltos: 0 },
                historial: []
            },
            // prioridadesDia: [{ id, texto, completado, orden, fecha YYYY-MM-DD, eventoId?, origen? }]
            prioridadesDia: [],
            enfoqueDia: { texto: '', fecha: '' },
            diario: {
                entradas: {}  // keyed by "YYYY-MM-DD": { texto, calificacion, nota, actividades, creado }
            },
            foda: {
                fortalezas: [],
                oportunidades: [],
                debilidades: [],
                amenazas: [],
                estrategias: []
            },
            registroIntimo: {
                encuentros: []
            },
            documentos: {
                grupos: []
            },
            gratitud: {
                entradas: []  // { id, fecha, texto, creado }
            },
            salud: {
                enfermedades: [],  // { id, nombre, fechaInicio, fechaFin?, notas, creado }
                medicamentos: [],  // { id, nombre, dosis?, horarios: [{ hora, dias? }], fechaInicio?, fechaFin?, notas, creado }
                sintomas: [],      // { id, fecha, sintoma, notas?, creado } — ej. mareos, dolor de cabeza
                tomas: {}          // { "YYYY-MM-DD": { "medId": true } } — registro de medicación tomada
            },
            biografia: {
                // eventos: { id, fecha, tipo?, titulo, descripcion?, lugar?, creado, origen?, viajeId?, fotos?: [{ id, url?|idbKey? }] }
                eventos: []
            },
            // viajes: { id, destino, fechaInicio, fechaFin?, notas?, conQuien?, creado, anadidoALineaVida?, fotos?: [...] }
            viajes: [],
            config: { puenteFinanciero: false }  // auto-transfer ingreso neto Modo Trabajo → Finanzas Persona
        };
    },

    // --- Global Modules Config ---
    getModulesGlobal() {
        return this._get(this.KEYS.MODULES_GLOBAL) || this._defaultModulesGlobal();
    },

    saveModulesGlobal(config) {
        return this._set(this.KEYS.MODULES_GLOBAL, config);
    },

    _defaultModulesGlobal() {
        return {
            categoriasGastos: ['Comida', 'Transporte', 'Salud', 'Educación', 'Entretenimiento', 'Servicios', 'Hogar', 'Ropa', 'Otro'],
            categoriasIngresos: ['Salario', 'Freelance', 'Inversiones', 'Otro'],
            tiposEventos: ['General', 'Urgente', 'Hábito', 'Finanza', 'Estudio', 'Ejercicio', 'Salud'],
            opcionesRapidas: ['Ejercicio', 'Leer Biblia', 'Pago Deuda', 'Prueba Estudio', 'Médico']
        };
    },

    // ==================== IndexedDB ====================

    async initDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('documentos')) {
                    db.createObjectStore('documentos', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('biblia')) {
                    db.createObjectStore('biblia', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.FOTOS_STORE)) {
                    db.createObjectStore(this.FOTOS_STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            request.onerror = (e) => {
                console.error('IndexedDB error:', e);
                reject(e);
            };
        });
    },

    async idbPut(storeName, data) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async idbGet(storeName, key) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async idbGetAll(storeName) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async idbDelete(storeName, key) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    // --- Document helpers ---
    async saveDocument(doc) {
        return this.idbPut('documentos', doc);
    },

    async getDocuments(email) {
        const all = await this.idbGetAll('documentos');
        return all.filter(d => d.email === email);
    },

    async deleteDocument(id) {
        return this.idbDelete('documentos', id);
    },

    // --- Bible helpers ---
    async getBiblia() {
        return this.idbGet('biblia', 'rv1960');
    },

    async saveBiblia(data) {
        return this.idbPut('biblia', { id: 'rv1960', ...data });
    },

    /** Fotos (data URL) en IndexedDB para no inflar localStorage. id: `foto_<emailHash>_<timestamp>_<rand>` */
    _fotoId(email) {
        const h = (email || 'x').replace(/[^a-z0-9]/gi, '').slice(0, 8);
        return `foto_${h}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    },

    /**
     * Guarda una imagen como data URL en IDB. Devuelve el id o null si falla / demasiado grande.
     */
    async saveFotoDataUrl(email, dataUrl) {
        if (!email || !dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
        if (dataUrl.length > 1200000) {
            console.warn('Foto demasiado grande para guardar');
            return null;
        }
        const id = this._fotoId(email);
        await this.idbPut(this.FOTOS_STORE, { id, email, dataUrl, creado: new Date().toISOString() });
        return id;
    },

    async getFotoDataUrl(id) {
        if (!id) return null;
        const rec = await this.idbGet(this.FOTOS_STORE, id);
        return rec && rec.dataUrl ? rec.dataUrl : null;
    },

    async deleteFotoRecord(id) {
        if (!id) return;
        try {
            await this.idbDelete(this.FOTOS_STORE, id);
        } catch (e) {}
    },

    /** Elimina en IDB todas las claves idbKey listadas en fotos[]. */
    async deleteFotoRefs(fotos) {
        if (!Array.isArray(fotos)) return;
        for (const f of fotos) {
            if (f && f.idbKey) await this.deleteFotoRecord(f.idbKey);
        }
    }
};
