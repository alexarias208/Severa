/**
 * Puente Calendario Modo Persona ↔ datos Modo Trabajo (localStorage `trabajo_data`).
 * Solo lectura para visualización en #calendar.
 *
 * Desduplicado con eventos Persona (calendar.js): misma fecha + título normalizado
 * → se omite el ítem Trabajo y queda solo el evento Persona (evita duplicar líneas).
 *
 * Limitación: si Modo Persona y Modo Trabajo se cargan desde orígenes distintos
 * (p. ej. otro dominio o sin compartir localStorage), no habrá datos de Trabajo
 * que leer aquí — comportamiento esperado.
 *
 * Etiquetas por slug: mantener alineadas con `TrabajoStorage.PERFILES` en trabajo/js/storage.js
 */
const TrabajoCalendarBridge = {
    KEY_DATA: 'trabajo_data',

    PERFIL_LABELS: {
        minimarket: 'Minimarket',
        educacion: 'Educación',
        prevencionista: 'Prevención de riesgos',
        administrativo: 'Administrativo / RRHH',
        pasteleria: 'Pastelería',
        cabanas: 'Arriendo cabañas',
        laboratorio: 'Laboratorio / balanzas',
        salud: 'Consulta independiente'
    },

    normalizeTitle(s) {
        return String(s == null ? '' : s)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    },

    /** Parsea JSON de trabajo_data; null si ausente o inválido. */
    parseTrabajoData() {
        try {
            const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.KEY_DATA) : null;
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    },

    isPerfilActivo(d, slug) {
        const pa = d.perfilesActivos;
        if (!pa || pa[slug] === undefined) return true;
        return !!pa[slug];
    },

    fechaYmd(f) {
        if (f == null || f === '') return '';
        const s = String(f).slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
    },

    _nextIsoYmd(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() + 1);
        const pad = n => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    },

    /** Recorre [a,b] inclusive (strings YYYY-MM-DD comparables). */
    _forEachDayInclusive(a, b, fn) {
        if (!a || !b || a > b) return;
        let iso = a;
        for (;;) {
            fn(iso);
            if (iso >= b) break;
            iso = this._nextIsoYmd(iso);
        }
    },

    /**
     * Ítems de “negocio” alineados con `_countPerfilNegocioDia` en trabajo/js/perfiles.js
     * (reservas, visitas, cajas, entregas, fechas admin).
     */
    _pushNegocioEvents(slug, p, label, out) {
        try {
            if (slug === 'cabanas' && p.reservas) {
                const uni = Object.fromEntries((p.unidades || []).map(u => [u.id, u.nombre || '']));
                const cli = Object.fromEntries((p.clientes || []).map(c => [c.id, c.nombre || '']));
                (p.reservas || []).forEach(r => {
                    if (!r || r.estado === 'cancelada') return;
                    const a = this.fechaYmd(r.desde);
                    const b = this.fechaYmd(r.hasta || r.desde);
                    if (!a || !b) return;
                    const nom = cli[r.clienteId] || '';
                    const un = uni[r.unidadId] || '';
                    const titulo = ['Reserva', nom || null, un || null].filter(Boolean).join(' · ');
                    this._forEachDayInclusive(a, b, iso => {
                        out.push({
                            id: `trabajo-cab-res-${r.id}-${iso}`,
                            fecha: iso,
                            titulo,
                            tituloDisplay: `[${label}] ${titulo}`,
                            hora: '',
                            completado: false,
                            _trabajo: true,
                            origenSlug: slug,
                            origenLabel: label,
                            fuente: 'reserva'
                        });
                    });
                });
            }
            if (slug === 'minimarket' && Array.isArray(p.cajasTurno)) {
                p.cajasTurno.forEach(c => {
                    if (!c) return;
                    const fecha = this.fechaYmd(c.fecha);
                    if (!fecha) return;
                    const titulo = `Caja turno · ${c.turno || '—'}`;
                    out.push({
                        id: `trabajo-mm-caja-${c.id || fecha}-${fecha}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: '',
                        completado: false,
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'caja'
                    });
                });
            }
            if (slug === 'pasteleria' && Array.isArray(p.entregas)) {
                p.entregas.forEach(e => {
                    if (!e) return;
                    const fecha = this.fechaYmd(e.fecha);
                    if (!fecha) return;
                    const titulo = `Entrega · ${e.cliente || ''} · ${e.producto || ''}`.replace(/\s·\s$/, '').trim();
                    out.push({
                        id: `trabajo-past-ent-${e.id || fecha}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: '',
                        completado: false,
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'entrega'
                    });
                });
            }
            if (slug === 'prevencionista' && Array.isArray(p.visitas)) {
                const obras = Object.fromEntries((p.obras || []).map(o => [o.id, o.nombre || '']));
                p.visitas.forEach(v => {
                    if (!v) return;
                    const fecha = this.fechaYmd(v.fecha);
                    if (!fecha) return;
                    const titulo = `${v.tipo || 'Visita'} · ${obras[v.obraId] || ''}`.replace(/\s·\s*$/, '').trim();
                    out.push({
                        id: `trabajo-prev-vis-${v.id}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: v.hora ? String(v.hora) : '',
                        completado: false,
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'visita'
                    });
                });
            }
            if (slug === 'laboratorio' && Array.isArray(p.visitas)) {
                const eqs = Object.fromEntries((p.equipos || []).map(e => [e.id, e.nombre || '']));
                p.visitas.forEach(v => {
                    if (!v) return;
                    const fecha = this.fechaYmd(v.fecha);
                    if (!fecha) return;
                    const titulo = `Visita · ${eqs[v.equipoId] || 'Equipo'}`;
                    out.push({
                        id: `trabajo-lab-vis-${v.id}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: '',
                        completado: v.estado === 'cerrada',
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'visita'
                    });
                });
            }
            if (slug === 'salud' && Array.isArray(p.sesiones)) {
                const pac = Object.fromEntries((p.pacientes || []).map(c => [c.id, c.nombre || '']));
                p.sesiones.forEach(s => {
                    if (!s || s.estado === 'cancelada') return;
                    const fecha = this.fechaYmd(s.fecha);
                    if (!fecha) return;
                    const titulo = `${s.tipo || 'Consulta'} · ${pac[s.pacienteId] || 'Paciente'}`;
                    out.push({
                        id: `trabajo-salud-ses-${s.id}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: s.hora ? String(s.hora) : '',
                        completado: s.estado === 'realizada',
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'sesionSalud'
                    });
                });
            }
            if (slug === 'administrativo') {
                (p.fechasImportantes || []).forEach(f => {
                    if (!f) return;
                    const fecha = this.fechaYmd(f.fecha);
                    if (!fecha) return;
                    const titulo = f.titulo || 'Fecha importante';
                    out.push({
                        id: `trabajo-adm-fi-${f.id || fecha + titulo}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: '',
                        completado: false,
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'fechaImportant'
                    });
                });
                (p.procesos || []).forEach(pr => {
                    if (!pr) return;
                    const fecha = this.fechaYmd(pr.fechaLimite);
                    if (!fecha) return;
                    const titulo = `Proceso · ${pr.nombre || '—'}`;
                    out.push({
                        id: `trabajo-adm-pr-${pr.id || fecha}`,
                        fecha,
                        titulo,
                        tituloDisplay: `[${label}] ${titulo}`,
                        hora: '',
                        completado: false,
                        _trabajo: true,
                        origenSlug: slug,
                        origenLabel: label,
                        fuente: 'proceso'
                    });
                });
            }
        } catch (e) {
            /* no-op: resto de perfiles sigue */
        }
    },

    /**
     * Lista normalizada de “eventos fantasma” para el calendario Persona.
     * @returns {Array<{ id: string, fecha: string, titulo: string, tituloDisplay: string, hora: string, completado: boolean, _trabajo: true, origenSlug: string, origenLabel: string, fuente: string }>}
     */
    collectEvents() {
        const out = [];
        const d = this.parseTrabajoData();
        if (!d || typeof d !== 'object' || !d.perfiles) return out;

        Object.keys(d.perfiles).forEach(slug => {
            if (!this.isPerfilActivo(d, slug)) return;
            const p = d.perfiles[slug];
            if (!p || typeof p !== 'object') return;
            const label = this.PERFIL_LABELS[slug] || slug;

            const tareas = p.agenda && Array.isArray(p.agenda.tareasAgenda) ? p.agenda.tareasAgenda : [];
            tareas.forEach(t => {
                if (!t || typeof t !== 'object') return;
                const fecha = this.fechaYmd(t.fecha);
                if (!fecha) return;
                const titulo =
                    (t.titulo != null && String(t.titulo).trim() !== '')
                        ? String(t.titulo).trim()
                        : String(t.texto || '').trim() || '(sin título)';
                const idBase = t.id != null ? String(t.id) : `${fecha}-${titulo}`.replace(/\s/g, '-');
                out.push({
                    id: `trabajo-agenda-${slug}-${idBase}`,
                    fecha,
                    titulo,
                    tituloDisplay: `[${label}] ${titulo}`,
                    hora: t.hora ? String(t.hora) : '',
                    completado: !!(t.hecho || t.hecha),
                    _trabajo: true,
                    origenSlug: slug,
                    origenLabel: label,
                    fuente: 'agenda'
                });
            });

            /* Educación: sesiones por curso (misma fuente que el calendario Trabajo / _countSesionesEducacionDia). */
            if (slug === 'educacion' && Array.isArray(p.cursos)) {
                p.cursos.forEach(c => {
                    (c.sesiones || []).forEach((s, idx) => {
                        if (!s || typeof s !== 'object') return;
                        const fecha = this.fechaYmd(s.fecha);
                        if (!fecha) return;
                        const baseTit = s.titulo || 'Sesión';
                        const cn = c.nombre ? ` · ${c.nombre}` : '';
                        const titulo = String(baseTit) + cn;
                        const idEv = s.id != null ? String(s.id) : `i${idx}`;
                        const hora = s.horaInicio || s.hora || '';
                        out.push({
                            id: `trabajo-edu-ses-${c.id || 'c'}-${idEv}-${fecha}`,
                            fecha,
                            titulo,
                            tituloDisplay: `[${label}] ${String(baseTit)}${cn}`,
                            hora: hora ? String(hora) : '',
                            completado: false,
                            _trabajo: true,
                            origenSlug: slug,
                            origenLabel: label,
                            fuente: 'sesionCurso'
                        });
                    });
                });
            }

            this._pushNegocioEvents(slug, p, label, out);
        });

        return out;
    }
};
