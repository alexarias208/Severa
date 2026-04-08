/* ============================================
   CALENDAR PAGE - Monthly Calendar with Events
   ============================================ */

const CalendarPage = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),

    /** IDs nuevos: UUID si el navegador lo permite; si no, mismo esquema legacy que DateUtils.generateId. */
    _newEventId() {
        return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : DateUtils.generateId();
    },

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = DataService.getUserData(email);
        const personaEvents = data.calendario?.eventos || [];
        const trabajoFlagOn = (typeof FeatureFlags !== 'undefined' && FeatureFlags.isEnabled)
            ? FeatureFlags.isEnabled('calendarioTrabajo', true)
            : true;
        const mostrarTrabajo = trabajoFlagOn && !!data.calendario?.mostrarTrabajo;
        const viewEvents = this._buildViewEvents(personaEvents, mostrarTrabajo);

        const monthName = DateUtils.formatMonthYear(new Date(this.currentYear, this.currentMonth));
        const daysInMonth = DateUtils.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = DateUtils.getFirstDayOfMonth(this.currentYear, this.currentMonth);
        const todayStr = DateUtils.today();

        // Progreso solo eventos Persona (sin regresión de significado)
        const monthEvents = personaEvents.filter(e => {
            return e.fecha && e.fecha.startsWith(`${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`);
        });
        const completed = monthEvents.filter(e => e.completado).length;
        const progressPct = monthEvents.length > 0 ? Math.round((completed / monthEvents.length) * 100) : 0;

        const trabajoUrl = typeof resolveModoTrabajoIndexUrl === 'function' ? resolveModoTrabajoIndexUrl() : '/trabajo/index.html';
        const leyendaTrabajo = mostrarTrabajo
            ? `<p class="cal-leyenda-trabajo text-secondary text-xs" style="margin:0 0 0.75rem;">
                <span class="cal-leyenda-trabajo-mark" aria-hidden="true"></span>
                Los ítems con estilo <strong>Trabajo</strong> vienen del Modo Trabajo (solo lectura aquí). Para editarlos abre <a href="${trabajoUrl}" target="_blank" rel="noopener noreferrer">Modo Trabajo</a>.
            </p>`
            : '';
        const toggleTrabajoHtml = trabajoFlagOn
            ? `<label class="cal-toggle-trabajo flex items-center gap-sm" style="cursor:pointer;user-select:none;">
                        <input type="checkbox" id="cal-toggle-trabajo" ${mostrarTrabajo ? 'checked' : ''} aria-describedby="cal-toggle-trabajo-hint"/>
                        <span class="text-secondary text-sm" id="cal-toggle-trabajo-hint">Mostrar fechas de Modo Trabajo (solo lectura aquí)</span>
                    </label>`
            : '';

        container.innerHTML = `
            ${UI.pageTitle('Calendario', '<button id="btn-add-event" class="btn btn-primary btn-sm">+ Evento</button>', 'calendar')}

            <div class="calendar-header">
                <div class="calendar-nav">
                    <button id="btn-prev-month" class="btn btn-ghost">◀</button>
                    <h3>${monthName}</h3>
                    <button id="btn-next-month" class="btn btn-ghost">▶</button>
                </div>
                <div class="flex items-center gap-md flex-wrap" style="justify-content:flex-end;">
                    ${toggleTrabajoHtml}
                    <span class="text-secondary text-sm">${completed}/${monthEvents.length} completados</span>
                    <div class="progress" style="width: 120px;">
                        <div class="progress-bar success" style="width: ${progressPct}%;"></div>
                    </div>
                </div>
            </div>
            ${leyendaTrabajo}

            <div class="calendar-grid">
                ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d =>
                    `<div class="cal-day-header">${d}</div>`
                ).join('')}
                ${this._renderDays(firstDay, daysInMonth, viewEvents, todayStr)}
            </div>
        `;

        this._bindEvents(container, email);
    },

    /**
     * Fusiona eventos Persona + Trabajo para la grilla.
     * Desduplicado: misma fecha + título normalizado que un evento Persona → no se añade el de Trabajo.
     */
    _buildViewEvents(personaEvents, mostrarTrabajo) {
        try {
            if (!mostrarTrabajo || typeof TrabajoCalendarBridge === 'undefined') {
                return (personaEvents || []).map(e => ({
                    ...e,
                    _trabajo: false,
                    calDisplayTitle: e.titulo
                }));
            }
            const trabajo = TrabajoCalendarBridge.collectEvents();
            const personaKeys = new Set(
                (personaEvents || []).map(e =>
                    `${e.fecha}|${TrabajoCalendarBridge.normalizeTitle(e.titulo)}`
                )
            );
            const view = (personaEvents || []).map(e => ({
                ...e,
                _trabajo: false,
                calDisplayTitle: e.titulo
            }));
            trabajo.forEach(t => {
                const k = `${t.fecha}|${TrabajoCalendarBridge.normalizeTitle(t.titulo)}`;
                if (personaKeys.has(k)) return;
                view.push({
                    ...t,
                    tipo: 'trabajo',
                    calDisplayTitle: t.tituloDisplay
                });
            });
            return view;
        } catch (err) {
            return (personaEvents || []).map(e => ({ ...e, _trabajo: false, calDisplayTitle: e.titulo }));
        }
    },

    /** Slug para clase CSS (.type-study, etc.). Compat: "Estudio" → study */
    _eventTypeSlug(tipo) {
        const t = (tipo == null || tipo === '') ? 'pending' : String(tipo).trim();
        const lower = t.toLowerCase();
        if (lower === 'estudio') return 'study';
        return lower.replace(/\s+/g, '-');
    },

    _renderDays(firstDay, daysInMonth, events, todayStr) {
        let html = '';
        // Adjust: JS Sunday=0, we want Monday=0
        const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

        // Get diary entries for mood indicators
        const email = Auth.getCurrentEmail();
        const userData = DataService.getUserData(email);
        const diaryEntries = userData?.diario?.entradas || {};

        // Previous month padding
        const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
        const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
        const prevDays = DateUtils.getDaysInMonth(prevYear, prevMonth);

        for (let i = startOffset - 1; i >= 0; i--) {
            const day = prevDays - i;
            html += `<div class="cal-day other-month"><span class="cal-day-number">${day}</span></div>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayEvents = events.filter(e => e.fecha === dateStr);

            const feriadoNombre = typeof FeriadosCL !== 'undefined' ? FeriadosCL.nombreEnFecha(dateStr) : '';
            const feriadoHtml = feriadoNombre
                ? `<span class="cal-feriado-badge" title="${UI.esc(feriadoNombre)}" aria-label="Feriado: ${UI.esc(feriadoNombre)}">Feriado</span>`
                : '';

            // Diary mood indicator
            const diaryEntry = diaryEntries[dateStr];
            const moodColors = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' };
            const moodIndicator = diaryEntry ? `<div class="cal-day-mood-dot" style="background:${moodColors[diaryEntry.calificacion] || '#64748b'};" title="Ánimo: ${diaryEntry.calificacion || 'N/A'}"></div>` : '';

            const eventsHtml = dayEvents.slice(0, 3).map(ev => {
                if (ev._trabajo) {
                    const done = ev.completado ? ' cal-event--trabajo-done' : '';
                    const show = ev.calDisplayTitle || ev.tituloDisplay || ev.titulo;
                    return `<div class="cal-event cal-event--trabajo${done}" title="Modo Trabajo (${UI.esc(ev.origenLabel || '')}) · solo lectura aquí">${UI.esc(show)}</div>`;
                }
                const typeClass = ev.completado ? 'type-completed' : `type-${this._eventTypeSlug(ev.tipo)}`;
                return `<div class="cal-event ${typeClass}" title="${UI.esc(ev.titulo)}">${UI.esc(ev.titulo)}</div>`;
            }).join('');

            const more = dayEvents.length > 3 ? `<div class="cal-event" style="color:var(--text-muted);">+${dayEvents.length - 3} más</div>` : '';

            html += `
                <div class="cal-day ${isToday ? 'today' : ''}${feriadoNombre ? ' cal-day--feriado' : ''}" data-date="${dateStr}" style="position:relative;">
                    <div class="cal-day-top">
                        <span class="cal-day-number">${d}</span>
                        ${feriadoHtml}
                    </div>
                    ${moodIndicator}
                    ${eventsHtml}${more}
                </div>
            `;
        }

        // Next month padding
        const totalCells = startOffset + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="cal-day other-month"><span class="cal-day-number">${i}</span></div>`;
        }

        return html;
    },

    _bindEvents(container, email) {
        UI.bindButton('btn-prev-month', () => {
            if (this.currentMonth === 0) {
                this.currentMonth = 11;
                this.currentYear--;
            } else {
                this.currentMonth--;
            }
            this.render(container);
        });

        UI.bindButton('btn-next-month', () => {
            if (this.currentMonth === 11) {
                this.currentMonth = 0;
                this.currentYear++;
            } else {
                this.currentMonth++;
            }
            this.render(container);
        });

        UI.bindButton('btn-add-event', () => this._showEventModal(container, email));

        const toggleTrabajo = document.getElementById('cal-toggle-trabajo');
        if (toggleTrabajo) {
            toggleTrabajo.addEventListener('change', () => {
                const udata = DataService.getUserData(email);
                if (!udata.calendario) udata.calendario = { eventos: [] };
                udata.calendario.mostrarTrabajo = !!toggleTrabajo.checked;
                DataService.saveUserData(email, udata);
                this.render(container);
            });
        }

        // Click on day (prevent propagation to avoid modal closing on mobile)
        container.querySelectorAll('.cal-day:not(.other-month)').forEach(day => {
            day.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const date = day.dataset.date;
                this._showDayModal(container, email, date);
            });
        });
    },

    _showDayModal(container, email, date) {
        const data = DataService.getUserData(email);
        const events = (data.calendario?.eventos || []).filter(e => e.fecha === date);
        const trabajoFlagOn = (typeof FeatureFlags !== 'undefined' && FeatureFlags.isEnabled)
            ? FeatureFlags.isEnabled('calendarioTrabajo', true)
            : true;
        const mostrarTrabajo = trabajoFlagOn && !!data.calendario?.mostrarTrabajo;
        let trabajoDia = [];
        try {
            if (mostrarTrabajo && typeof TrabajoCalendarBridge !== 'undefined') {
                trabajoDia = TrabajoCalendarBridge.collectEvents().filter(e => e.fecha === date);
                const personaKeys = new Set(
                    events.map(e => `${e.fecha}|${TrabajoCalendarBridge.normalizeTitle(e.titulo)}`)
                );
                trabajoDia = trabajoDia.filter(t => {
                    const k = `${t.fecha}|${TrabajoCalendarBridge.normalizeTitle(t.titulo)}`;
                    return !personaKeys.has(k);
                });
            }
        } catch (err) {
            trabajoDia = [];
        }
        const trabajoUrl = typeof resolveModoTrabajoIndexUrl === 'function' ? resolveModoTrabajoIndexUrl() : '/trabajo/index.html';

        const feriadoNom = typeof FeriadosCL !== 'undefined' ? FeriadosCL.nombreEnFecha(date) : '';
        const feriadoBlock = feriadoNom
            ? `<p class="cal-feriado-modal text-secondary text-sm" style="margin:0 0 0.75rem;padding:0.5rem 0.65rem;background:rgba(234,179,8,0.12);border-radius:var(--border-radius-sm);border:1px solid rgba(234,179,8,0.35);">🇨🇱 <strong>Feriado</strong> · ${UI.esc(feriadoNom)}</p>`
            : '';

        const bloqueTrabajo = trabajoDia.length
            ? `<div class="cal-modal-trabajo-block" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-subtle, rgba(255,255,255,0.08));">
                <p class="text-sm text-secondary" style="margin:0 0 0.5rem;"><span class="cal-trabajo-badge-modal">Trabajo</span> Agenda Modo Trabajo (solo lectura)</p>
                ${trabajoDia.map(t => `
                    <div class="finance-item cal-modal-trabajo-item" style="cursor:default;">
                        <div class="item-info">
                            <strong>${UI.esc(t.tituloDisplay)}</strong>
                            <span class="text-secondary">${t.origenLabel || ''}${t.hora ? ' · ' + UI.esc(t.hora) : ''}</span>
                        </div>
                    </div>
                `).join('')}
                <p class="text-xs text-secondary" style="margin:0.5rem 0 0;">Editar en <a href="${trabajoUrl}" target="_blank" rel="noopener noreferrer">Modo Trabajo</a>.</p>
            </div>`
            : '';

        UI.showModal(`
            <h3 class="modal-title">${DateUtils.format(date, 'long')}</h3>
            ${feriadoBlock}
            <p class="text-sm text-secondary" style="margin:0 0 0.5rem;">Tus eventos</p>
            ${events.length > 0 ? events.map(e => `
                <div class="finance-item" style="cursor:pointer;" data-event-id="${e.id}">
                    <div class="item-info">
                        <strong>${UI.esc(e.titulo)}</strong>
                        <span class="text-secondary">${e.tipo || 'General'}${e.hora ? ' - ' + e.hora + (e.horaFin ? ' a ' + e.horaFin : '') : ''}</span>
                    </div>
                    <div class="flex gap-sm items-center">
                        <button class="btn btn-ghost btn-sm toggle-complete" data-id="${e.id}">${e.completado ? '✅' : '⬜'}</button>
                        <button class="btn btn-ghost btn-sm edit-event" data-id="${e.id}">✏️</button>
                        <button class="btn btn-ghost btn-sm del-event" data-id="${e.id}">🗑️</button>
                    </div>
                </div>
            `).join('') : '<p class="text-muted text-center">Sin eventos personales</p>'}
            ${bloqueTrabajo}
            <div class="modal-actions">
                <button id="btn-add-day-event" class="btn btn-primary">+ Agregar Evento</button>
            </div>
        `, {
            onReady: () => {
                UI.bindButton('btn-add-day-event', () => {
                    UI.closeModal();
                    this._showEventModal(container, email, date);
                });

                document.querySelectorAll('.toggle-complete').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const udata = DataService.getUserData(email);
                        const ev = (udata.calendario.eventos || []).find(x => x.id === btn.dataset.id);
                        if (ev) {
                            ev.completado = !ev.completado;
                            if (ev.moduloOrigen === 'estudios' && typeof PrioritiesSync !== 'undefined') {
                                PrioritiesSync.syncPriorityFromEvent(udata, ev.id, ev.completado);
                            }
                            DataService.saveUserData(email, udata);
                            UI.closeModal();
                            this.render(container);
                            UI.toast(ev.completado ? 'Evento completado' : 'Evento marcado pendiente', 'success');
                        }
                    });
                });

                document.querySelectorAll('.del-event').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const udata = DataService.getUserData(email);
                        const removedId = btn.dataset.id;
                        if (typeof PrioritiesSync !== 'undefined') {
                            PrioritiesSync.removePriorityForEvent(udata, removedId);
                        }
                        udata.calendario.eventos = (udata.calendario.eventos || []).filter(x => x.id !== removedId);
                        DataService.saveUserData(email, udata);
                        UI.closeModal();
                        this.render(container);
                        UI.toast('Evento eliminado', 'success');
                    });
                });

                document.querySelectorAll('.edit-event').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const udata = DataService.getUserData(email);
                        const ev = (udata.calendario.eventos || []).find(x => x.id === btn.dataset.id);
                        if (ev) {
                            UI.closeModal();
                            // showModal cancela el timeout de closeModal, así que el nuevo contenido no se borra
                            this._showEventModal(container, email, ev.fecha, ev);
                        }
                    });
                });
            }
        });
    },

    _showEventModal(container, email, defaultDate, editEvent = null) {
        const globalConfig = Storage.getModulesGlobal();
        const tipos = globalConfig.tiposEventos || [];
        const isEdit = !!editEvent;

        UI.showModal(`
            <h3 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Evento</h3>
            <form id="event-form">
                ${UI.formGroup('Título', UI.input('ev_titulo', { value: editEvent?.titulo || '', placeholder: 'Título del evento', required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Fecha', UI.input('ev_fecha', { type: 'date', value: editEvent?.fecha || defaultDate || DateUtils.today(), required: true }))}
                    ${UI.formGroup('Hora', UI.input('ev_hora', { type: 'time', value: editEvent?.hora || '' }))}
                </div>
                <div class="form-row">
                    ${UI.formGroup('Tipo', UI.select('ev_tipo', tipos, editEvent?.tipo || ''))}
                    ${UI.formGroup('Color', UI.select('ev_color', [
                        { value: '', label: 'Auto (por tipo)' },
                        { value: 'urgent', label: 'Rojo (Urgente)' },
                        { value: 'habit', label: 'Verde (Hábito)' },
                        { value: 'finance', label: 'Azul (Finanza)' },
                        { value: 'pending', label: 'Amarillo (Pendiente)' },
                        { value: 'study', label: 'Púrpura (Estudio)' },
                        { value: 'exercise', label: 'Naranja (Ejercicio)' }
                    ], editEvent?.color || ''))}
                </div>
                <div class="modal-actions">
                    <button type="button" id="btn-ev-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        `, {
            onReady: () => {
                UI.bindButton('btn-ev-cancel', () => UI.closeModal());
                UI.bindForm('event-form', (fd) => {
                    const v = DataValidate.validateCalendarEventForm(fd);
                    if (!v.ok) {
                        UI.toast(DataValidate.firstError(v) || 'Revisa los datos del evento.', 'error');
                        return;
                    }
                    const udata = DataService.getUserData(email);
                    if (isEdit) {
                        const ev = udata.calendario.eventos.find(x => x.id === editEvent.id);
                        if (ev) {
                            ev.titulo = fd.ev_titulo.trim();
                            ev.fecha = fd.ev_fecha;
                            ev.hora = fd.ev_hora;
                            ev.tipo = fd.ev_tipo;
                            ev.color = fd.ev_color;
                        }
                    } else {
                        udata.calendario.eventos.push({
                            id: this._newEventId(),
                            titulo: fd.ev_titulo.trim(),
                            fecha: fd.ev_fecha,
                            hora: fd.ev_hora,
                            tipo: fd.ev_tipo,
                            color: fd.ev_color,
                            moduloOrigen: null,
                            completado: false
                        });
                    }
                    DataService.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast(isEdit ? 'Evento actualizado' : 'Evento creado', 'success');
                    this.render(container);
                });
            }
        });
    },

    // Helper: add event from other modules. options = { hora, horaFin, ramoId }
    addAutoEvent(email, titulo, fecha, tipo, moduloOrigen, options) {
        const data = DataService.getUserData(email);
        if (!data.calendario) data.calendario = { eventos: [], mostrarTrabajo: true };
        if (!Array.isArray(data.calendario.eventos)) data.calendario.eventos = [];
        const opts = options || {};
        const hora = opts.hora || '';
        const horaFin = opts.horaFin || '';
        const ramoId = opts.ramoId || null;
        const autoV = DataValidate.validateCalendarEventAuto({ titulo, fecha });
        if (!autoV.ok) {
            if (typeof Logger !== 'undefined' && Logger.warn) Logger.warn('[Calendario] addAutoEvent omitido:', autoV.errors.join(' '));
            else console.warn('[Calendario] addAutoEvent omitido:', autoV.errors.join(' '));
            return false;
        }
        let tipoNorm = tipo;
        if (moduloOrigen === 'estudios' && (tipoNorm === 'Estudio' || tipoNorm === undefined || tipoNorm === null || tipoNorm === '')) {
            tipoNorm = 'study';
        }
        const exists = data.calendario.eventos.some(e =>
            e.titulo === titulo && e.fecha === fecha && e.moduloOrigen === moduloOrigen &&
            (e.hora || '') === hora && (e.ramoId || null) === ramoId
        );
        if (!exists) {
            const ev = {
                id: this._newEventId(),
                titulo, fecha, tipo: tipoNorm,
                color: '',
                moduloOrigen,
                completado: false
            };
            if (hora) ev.hora = hora;
            if (horaFin) ev.horaFin = horaFin;
            if (ramoId) ev.ramoId = ramoId;
            data.calendario.eventos.push(ev);
            DataService.saveUserData(email, data);
            return true;
        }
        return false;
    }
};
