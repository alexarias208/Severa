/**
 * Validaciones ligeras antes de persistir (localStorage). No sustituyen migraciones en Storage.
 * @see DataContract
 */

var DataValidate = {
    RE_DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
    RE_TIME_HM: /^\d{2}:\d{2}$/,

    /**
     * @param {{ ok: boolean, errors: string[] }} result
     * @returns {string}
     */
    firstError(result) {
        return (result.errors && result.errors[0]) || '';
    },

    /**
     * Formulario modal calendario Persona (`ev_titulo`, `ev_fecha`, `ev_hora`, …).
     * @param {Record<string, string>} fd - FormData-like object (claves string)
     * @returns {{ ok: boolean, errors: string[] }}
     */
    validateCalendarEventForm(fd) {
        const errors = [];
        const titulo = (fd.ev_titulo != null ? String(fd.ev_titulo) : '').trim();
        if (!titulo) errors.push('El título es obligatorio.');
        const fecha = fd.ev_fecha != null ? String(fd.ev_fecha) : '';
        if (!this.RE_DATE_ISO.test(fecha)) errors.push('La fecha debe ser válida (YYYY-MM-DD).');
        const hora = fd.ev_hora != null ? String(fd.ev_hora).trim() : '';
        if (hora && !this.RE_TIME_HM.test(hora)) errors.push('La hora debe tener formato HH:MM.');
        return { ok: errors.length === 0, errors };
    },

    /**
     * Alta automática desde otros módulos (misma regla de fecha/título).
     * @param {{ titulo?: string, fecha?: string }} raw
     * @returns {{ ok: boolean, errors: string[] }}
     */
    validateCalendarEventAuto(raw) {
        const errors = [];
        const titulo = (raw.titulo != null ? String(raw.titulo) : '').trim();
        if (!titulo) errors.push('El título es obligatorio.');
        const fecha = raw.fecha != null ? String(raw.fecha) : '';
        if (!this.RE_DATE_ISO.test(fecha)) errors.push('La fecha debe ser YYYY-MM-DD.');
        return { ok: errors.length === 0, errors };
    },

    /**
     * Tarea agenda Modo Trabajo antes de `normalizeAgendaTarea`.
     * @param {{ titulo?: string, fecha?: string, hora?: string }} raw
     * @returns {{ ok: boolean, errors: string[] }}
     */
    validateAgendaTareaDraft(raw) {
        const errors = [];
        const titulo = (raw.titulo != null ? String(raw.titulo) : '').trim();
        if (!titulo) errors.push('El título es obligatorio.');
        const fecha = raw.fecha != null ? String(raw.fecha) : '';
        if (!this.RE_DATE_ISO.test(fecha)) errors.push('La fecha debe ser YYYY-MM-DD.');
        const hora = raw.hora != null ? String(raw.hora).trim() : '';
        if (hora && !this.RE_TIME_HM.test(hora)) errors.push('La hora debe ser HH:MM.');
        return { ok: errors.length === 0, errors };
    },

    /**
     * Ingreso simple perfil cabañas (y patrones similares).
     * @param {{ monto?: string|number, fecha?: string, concepto?: string }} raw
     * @returns {{ ok: boolean, errors: string[] }}
     */
    validateFinanzaMovimientoIngreso(raw) {
        const errors = [];
        const m = raw.monto;
        const num = typeof m === 'number' ? m : parseFloat(String(m != null ? m : '').replace(',', '.'));
        if (!Number.isFinite(num)) errors.push('El monto debe ser un número válido.');
        else if (num < 0) errors.push('El monto no puede ser negativo.');
        const fecha = raw.fecha != null ? String(raw.fecha) : '';
        if (!this.RE_DATE_ISO.test(fecha)) errors.push('La fecha debe ser YYYY-MM-DD.');
        return { ok: errors.length === 0, errors };
    }
};
