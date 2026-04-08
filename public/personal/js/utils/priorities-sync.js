/* ============================================
   PRIORITIES SYNC — Calendario (estudios) ↔ prioridadesDia
   Regla: una prioridad auto por evento (dedupe por eventoId + fecha).
   ============================================ */

const PrioritiesSync = {
    /**
     * Crea o actualiza prioridades para eventos del calendario con moduloOrigen === 'estudios'
     * en la fecha indicada. Elimina prioridades huérfanas (eventoId sin evento).
     * @returns {boolean} true si hubo cambios que deben persistirse
     */
    ensureEstudiosPriorities(udata, viewDate) {
        if (!udata) return false;
        if (!udata.prioridadesDia) udata.prioridadesDia = [];
        if (!udata.calendario) udata.calendario = { eventos: [] };

        const eventos = (udata.calendario.eventos || []).filter(
            e => e.fecha === viewDate && e.moduloOrigen === 'estudios'
        );
        const byEventId = new Map(eventos.map(e => [e.id, e]));
        let changed = false;

        const beforeLen = udata.prioridadesDia.length;
        udata.prioridadesDia = udata.prioridadesDia.filter(p => {
            if (p.fecha !== viewDate || !p.eventoId) return true;
            if (!byEventId.has(p.eventoId)) {
                changed = true;
                return false;
            }
            return true;
        });
        if (udata.prioridadesDia.length !== beforeLen) changed = true;

        eventos.forEach(ev => {
            const texto = this._textoEstudios(ev);
            let p = udata.prioridadesDia.find(x => x.eventoId === ev.id && x.fecha === viewDate);
            if (p) {
                if (p.texto !== texto || !!p.completado !== !!ev.completado) {
                    p.texto = texto;
                    p.completado = !!ev.completado;
                    changed = true;
                }
            } else {
                udata.prioridadesDia.push({
                    id: DateUtils.generateId(),
                    texto,
                    completado: !!ev.completado,
                    fecha: viewDate,
                    eventoId: ev.id,
                    orden: udata.prioridadesDia.length,
                    origen: 'estudios-calendario'
                });
                changed = true;
            }
        });

        return changed;
    },

    _textoEstudios(ev) {
        let h = '—';
        if (ev.hora) {
            h = ev.horaFin ? `${ev.hora}–${ev.horaFin}` : ev.hora;
        }
        return `Asistir: ${ev.titulo || 'Clase'} · ${h}`;
    },

    /** Tras cambiar event.completado (p. ej. en calendario o actividades del día). */
    syncPriorityFromEvent(udata, eventId, completado) {
        if (!udata?.prioridadesDia) return;
        const p = udata.prioridadesDia.find(x => x.eventoId === eventId);
        if (p) p.completado = !!completado;
    },

    /** Tras marcar prioridad vinculada (checkbox en dashboard). */
    syncEventFromPriority(udata, priorityId, completado) {
        if (!udata?.prioridadesDia) return;
        const p = udata.prioridadesDia.find(x => x.id === priorityId);
        if (!p?.eventoId) return;
        const ev = (udata.calendario?.eventos || []).find(e => e.id === p.eventoId);
        if (ev) ev.completado = !!completado;
    },

    /** Al borrar un evento del calendario, quitar prioridad vinculada. */
    removePriorityForEvent(udata, eventId) {
        if (!udata?.prioridadesDia) return false;
        const before = udata.prioridadesDia.length;
        udata.prioridadesDia = udata.prioridadesDia.filter(p => p.eventoId !== eventId);
        return udata.prioridadesDia.length !== before;
    }
};
