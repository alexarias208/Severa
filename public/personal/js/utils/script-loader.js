/* ============================================
   SCRIPT LOADER - Lazy load sin bundler
   ============================================ */

const ScriptLoader = (function ScriptLoaderModule() {
    const _promisesBySrc = new Map();

    function load(src) {
        const s = String(src || '').trim();
        if (!s) return Promise.reject(new Error('ScriptLoader.load: src vacío'));
        if (_promisesBySrc.has(s)) return _promisesBySrc.get(s);

        const p = new Promise((resolve, reject) => {
            try {
                const el = document.createElement('script');
                el.src = s;
                el.async = true;
                el.onload = () => resolve(true);
                el.onerror = () => reject(new Error('ScriptLoader: no se pudo cargar ' + s));
                document.head.appendChild(el);
            } catch (e) {
                reject(e);
            }
        });

        _promisesBySrc.set(s, p);
        return p;
    }

    async function loadAll(srcList) {
        const arr = Array.isArray(srcList) ? srcList : [];
        for (const s of arr) {
            // secuencial para respetar dependencias (p. ej. biblia-embed antes de religion.js)
            await load(s);
        }
        return true;
    }

    return { load, loadAll };
})();

