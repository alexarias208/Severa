/* ============================================
   DATE UTILS - Date formatting and helpers
   ============================================ */

const DateUtils = {
    MONTHS: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    MONTHS_SHORT: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    DAYS: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    DAYS_SHORT: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    DAYS_MIN: ['D','L','M','X','J','V','S'],

    today() {
        const d = new Date();
        return this.toDateStr(d);
    },

    toDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    fromDateStr(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    },

    format(dateStr, style = 'medium') {
        const date = typeof dateStr === 'string' ? this.fromDateStr(dateStr) : dateStr;
        if (style === 'short') {
            return `${date.getDate()} ${this.MONTHS_SHORT[date.getMonth()]}`;
        }
        if (style === 'medium') {
            return `${date.getDate()} ${this.MONTHS[date.getMonth()]} ${date.getFullYear()}`;
        }
        if (style === 'long') {
            return `${this.DAYS[date.getDay()]}, ${date.getDate()} de ${this.MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
        }
        return dateStr;
    },

    formatMonthYear(date) {
        return `${this.MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    },

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    },

    getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    },

    isSameDay(d1, d2) {
        return this.toDateStr(d1) === this.toDateStr(d2);
    },

    isToday(dateStr) {
        return dateStr === this.today();
    },

    addDays(dateStr, days) {
        const d = this.fromDateStr(dateStr);
        d.setDate(d.getDate() + days);
        return this.toDateStr(d);
    },

    daysBetween(start, end) {
        const s = this.fromDateStr(start);
        const e = this.fromDateStr(end);
        return Math.floor((e - s) / (1000 * 60 * 60 * 24));
    },

    getWeekRange(dateStr) {
        const d = this.fromDateStr(dateStr);
        const day = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - day + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start: this.toDateStr(start), end: this.toDateStr(end) };
    },

    getMonthRange(year, month) {
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = this.getDaysInMonth(year, month);
        const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { start, end };
    },

    isInRange(dateStr, start, end) {
        return dateStr >= start && dateStr <= end;
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    timeAgo(isoStr) {
        const date = new Date(isoStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
        return this.format(this.toDateStr(date), 'short');
    }
};
