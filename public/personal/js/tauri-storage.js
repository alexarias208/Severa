/* ============================================
   TAURI STORAGE - Bridge para persistencia SQLite
   Usa invoke('load_data') y invoke('save_data') cuando Tauri está presente.
   ============================================ */

const TauriStorage = {
    data: {},
    loaded: false,
    _saveTimeout: null,

    async init() {
        if (!window.__TAURI__) return;
        try {
            const raw = await window.__TAURI__.core.invoke('load_data');
            if (raw) {
                this.data = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('TauriStorage: load_data failed', e);
        }
        this.loaded = true;
        this._listenQuitEvents();
    },

    _listenQuitEvents() {
        if (!window.__TAURI__?.event?.listen) return;
        const save = () => this.saveNow();
        window.__TAURI__.event.listen('save-now', save).catch(() => {});
        window.__TAURI__.event.listen('save-before-quit', save).catch(() => {});
    },

    get(key) {
        return this.data[key] ?? null;
    },

    set(key, value) {
        this.data[key] = value;
        this._scheduleSave();
    },

    remove(key) {
        delete this.data[key];
        // En Tauri, save_data no borra claves ausentes; hacemos DELETE explícito
        if (window.__TAURI__?.core?.invoke) {
            window.__TAURI__.core.invoke('delete_key', { key }).catch(() => {});
        }
        this._scheduleSave();
    },

    _scheduleSave() {
        if (!window.__TAURI__) return;
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this._flush(), 300);
    },

    async _flush() {
        this._saveTimeout = null;
        if (!window.__TAURI__) return;
        try {
            await window.__TAURI__.core.invoke('save_data', {
                payload: JSON.stringify(this.data)
            });
        } catch (e) {
            console.error('TauriStorage: save_data failed', e);
        }
    },

    async saveNow() {
        await this._flush();
    },

    isTauri() {
        return !!window.__TAURI__;
    }
};

// Al cerrar ventana, intentar guardar (best-effort)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (TauriStorage.isTauri()) {
            TauriStorage.saveNow();
        }
    });
}
