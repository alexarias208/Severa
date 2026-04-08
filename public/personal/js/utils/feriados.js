/**
 * Feriados legales Chile (referencia: fijos + Viernes Santo por Pascua).
 * Fuente única para Modo Persona (#calendar) y Modo Trabajo (rejillas).
 * No sustituye el Diario Oficial.
 */
const FeriadosCL = {
    _yearCache: null,

    _pad(n) {
        return String(n).padStart(2, '0');
    },

    _iso(y, month, day) {
        return `${y}-${this._pad(month)}-${this._pad(day)}`;
    },

    _easterSunday(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    },

    /** Lista { fecha: YYYY-MM-DD, nombre } para un año (con cache en memoria). */
    feriadosYear(year) {
        if (!this._yearCache) this._yearCache = {};
        if (this._yearCache[year]) return this._yearCache[year];

        const out = [];
        const add = (month, day, nombre) => {
            out.push({ fecha: this._iso(year, month, day), nombre });
        };
        add(1, 1, 'Año Nuevo');
        const easter = this._easterSunday(year);
        const vieSanto = new Date(easter);
        vieSanto.setDate(easter.getDate() - 2);
        out.push({
            fecha: this._iso(vieSanto.getFullYear(), vieSanto.getMonth() + 1, vieSanto.getDate()),
            nombre: 'Viernes Santo'
        });
        add(5, 1, 'Día del Trabajo');
        add(5, 21, 'Día de las Glorias Navales');
        add(7, 16, 'Virgen del Carmen');
        add(8, 15, 'Asunción de la Virgen');
        add(9, 18, 'Fiestas Patrias');
        add(9, 19, 'Día de las Glorias del Ejército');
        add(10, 12, 'Encuentro de Dos Mundos');
        add(10, 31, 'Día de las Iglesias Evangélicas y Protestantes');
        add(11, 1, 'Día de Todos los Santos');
        add(12, 8, 'Inmaculada Concepción');
        add(12, 25, 'Navidad');

        const sorted = out.sort((a, b) => a.fecha.localeCompare(b.fecha));
        this._yearCache[year] = sorted;
        return sorted;
    },

    enMes(year, monthIndex) {
        return this.feriadosYear(year).filter(f => {
            const m = parseInt(f.fecha.slice(5, 7), 10) - 1;
            return m === monthIndex;
        });
    },

    nombreEnFecha(iso) {
        if (!iso || iso.length < 10) return '';
        const y = parseInt(iso.slice(0, 4), 10);
        const hit = this.feriadosYear(y).find(f => f.fecha === iso.slice(0, 10));
        return hit ? hit.nombre : '';
    },

    /** Invalida cache (p. ej. tests). */
    clearCache() {
        this._yearCache = null;
    }
};

if (typeof globalThis !== 'undefined') {
    globalThis.FeriadosCL = FeriadosCL;
}
