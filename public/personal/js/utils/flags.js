/* ============================================
   FEATURE FLAGS - URL (?flags=) + localStorage
   ============================================ */

/**
 * Flags vigentes:
 * - calendarioTrabajo: habilita el toggle + visualización "Modo Trabajo" en Calendario Persona.
 */
const FeatureFlags = (function FeatureFlagsModule() {
    const KEY = 'plataforma_feature_flags';
    const _cache = {
        inited: false,
        urlEnabled: new Set(),
        urlDisabled: new Set()
    };

    function _splitCsv(raw) {
        return String(raw || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }

    function _readParamsFromSearchAndHash() {
        const out = { flags: '', flagsOff: '' };
        try {
            const sp = new URLSearchParams(window.location.search || '');
            out.flags = sp.get('flags') || '';
            out.flagsOff = sp.get('flagsOff') || '';
        } catch (e) {}
        try {
            const hash = String(window.location.hash || '');
            const q = hash.includes('?') ? hash.split('?')[1] : '';
            if (q) {
                const hp = new URLSearchParams(q);
                out.flags = out.flags || (hp.get('flags') || '');
                out.flagsOff = out.flagsOff || (hp.get('flagsOff') || '');
            }
        } catch (e) {}
        return out;
    }

    function init() {
        if (_cache.inited) return;
        _cache.inited = true;
        const p = _readParamsFromSearchAndHash();
        _splitCsv(p.flags).forEach(f => _cache.urlEnabled.add(f));
        _splitCsv(p.flagsOff).forEach(f => _cache.urlDisabled.add(f));
    }

    function _readStore() {
        try {
            const raw = localStorage.getItem(KEY);
            const obj = raw ? JSON.parse(raw) : null;
            return obj && typeof obj === 'object' ? obj : {};
        } catch (e) {
            return {};
        }
    }

    function _writeStore(obj) {
        try {
            localStorage.setItem(KEY, JSON.stringify(obj || {}));
            return true;
        } catch (e) {
            return false;
        }
    }

    function isEnabled(name, defaultValue = false) {
        init();
        const n = String(name || '').trim();
        if (!n) return !!defaultValue;

        if (_cache.urlDisabled.has(n)) return false;
        if (_cache.urlEnabled.has(n)) return true;

        const store = _readStore();
        if (store[n] === true) return true;
        if (store[n] === false) return false;
        return !!defaultValue;
    }

    function setFlag(name, value) {
        const n = String(name || '').trim();
        if (!n) return false;
        const v = !!value;
        const store = _readStore();
        store[n] = v;
        return _writeStore(store);
    }

    return {
        KEY,
        init,
        isEnabled,
        setFlag
    };
})();

