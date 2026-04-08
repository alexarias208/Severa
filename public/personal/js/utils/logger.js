/* ============================================
   LOGGER - niveles + ring buffer en memoria
   ============================================ */

const Logger = (function LoggerModule() {
    const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
    const DEFAULT_MAX = 100;

    const _state = {
        inited: false,
        level: LEVELS.warn,
        max: DEFAULT_MAX,
        buf: [],
        writeConsole: true
    };

    function _nowIso() {
        try { return new Date().toISOString(); } catch (e) { return ''; }
    }

    function _readDebugParam() {
        // debug=1 por search o hash query (como Router.getParam, pero sin depender de Router)
        try {
            const sp = new URLSearchParams(window.location.search || '');
            if (sp.get('debug') === '1') return true;
        } catch (e) {}
        try {
            const hash = String(window.location.hash || '');
            const q = hash.includes('?') ? hash.split('?')[1] : '';
            if (!q) return false;
            const hp = new URLSearchParams(q);
            if (hp.get('debug') === '1') return true;
        } catch (e) {}
        return false;
    }

    function _readDebugStorage() {
        try {
            return localStorage.getItem('plataforma_debug') === '1';
        } catch (e) {
            return false;
        }
    }

    function init(options) {
        if (_state.inited) return;
        _state.inited = true;

        const opt = options && typeof options === 'object' ? options : {};
        const debug = _readDebugParam() || _readDebugStorage();

        _state.level = debug ? LEVELS.debug : LEVELS.warn;
        _state.max = Number.isFinite(opt.max) ? Math.max(10, Math.floor(opt.max)) : DEFAULT_MAX;
        _state.writeConsole = opt.writeConsole !== false;
    }

    function setLevel(level) {
        const k = String(level || '').toLowerCase();
        if (LEVELS[k] == null) return false;
        _state.level = LEVELS[k];
        return true;
    }

    function isDebug() {
        return _state.level <= LEVELS.debug;
    }

    function _push(entry) {
        _state.buf.push(entry);
        if (_state.buf.length > _state.max) {
            _state.buf.splice(0, _state.buf.length - _state.max);
        }
    }

    function _emit(levelName, args) {
        init();
        const lvl = LEVELS[levelName] || LEVELS.info;
        if (lvl < _state.level) return;

        const entry = {
            ts: _nowIso(),
            level: levelName,
            msg: Array.from(args || [])
        };
        _push(entry);

        if (!_state.writeConsole) return;
        try {
            const con = console;
            const fn =
                levelName === 'debug' ? con.debug :
                levelName === 'info' ? con.info :
                levelName === 'warn' ? con.warn :
                con.error;
            fn.apply(con, entry.msg);
        } catch (e) {}
    }

    function debug() { _emit('debug', arguments); }
    function info() { _emit('info', arguments); }
    function warn() { _emit('warn', arguments); }
    function error() { _emit('error', arguments); }

    function getEntries() {
        return _state.buf.slice();
    }

    function toText() {
        return _state.buf.map(e => {
            let m = '';
            try { m = e.msg.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); }
            catch (err) { m = String(e.msg); }
            return `[${e.ts}] ${e.level.toUpperCase()} ${m}`;
        }).join('\n');
    }

    async function copyToClipboard() {
        const text = toText();
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return { ok: true };
            }
        } catch (e) {}
        return { ok: false, text };
    }

    return {
        LEVELS,
        init,
        setLevel,
        isDebug,
        debug,
        info,
        warn,
        error,
        getEntries,
        toText,
        copyToClipboard
    };
})();

