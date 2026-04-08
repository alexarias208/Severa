/* ============================================
   STUDIES PAGE - Horario semanal, evaluaciones, detalle por ramo
   ============================================ */

const StudiesPage = {
    UPCOMING_WEEKS: 4,
    /** Ventana hacia adelante para sincronizar horarios → calendario (días) */
    SYNC_CALENDAR_FORWARD_DAYS: 180,
    DAYS_ORDER: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],

    render(container) {
        const email = Auth.getCurrentEmail();
        const raw = Storage.getUserData(email);
        const estudios = this._normalizeEstudios(raw.estudios || { ramos: [], pruebas: [] });

        const hasHorarios = estudios.ramos.some(r => (r.horario || []).length > 0);
        const upcoming = this._upcomingPruebas(estudios, this.UPCOMING_WEEKS);

        container.innerHTML = `
            ${UI.pageTitle('Estudios', `
                ${hasHorarios ? '<button id="btn-sync-horarios" class="btn btn-secondary btn-sm" title="Crear/actualizar eventos en el calendario desde los horarios de cada ramo">Sincronizar con calendario</button>' : ''}
                <button id="btn-add-ramo" class="btn btn-primary btn-sm">+ Ramo</button>
            `, 'studies')}

            <p class="text-secondary mb-md">Horario de la semana y evaluaciones próximas. Las notas y gráficos están en cada ramo.</p>

            ${this._renderUpcomingCard(upcoming, estudios)}

            <div class="card mb-lg studies-schedule-card">
                <div class="flex justify-between items-center mb-md flex-wrap gap-sm">
                    <h4 class="card-title mb-0">Horario semanal</h4>
                    <span class="text-sm text-secondary">Por bloques de cada ramo (sala si la indicaste)</span>
                </div>
                ${this._renderWeeklySchedule(estudios.ramos)}
            </div>

            <div class="card mb-lg">
                <h4 class="card-title mb-md">Ramos</h4>
                <p class="text-secondary text-sm mb-md">Toca un ramo para ver notas, gráficos y gestionar horarios.</p>
                <div class="studies-ramos-compact">
                    ${estudios.ramos.length > 0 ? estudios.ramos.map(r => this._renderRamoCompactRow(r, estudios)).join('') : UI.emptyState('Sin ramos. ¡Agrega uno para comenzar!')}
                </div>
            </div>
        `;

        this._bindEvents(container, email, estudios);
    },

    _normalizeEstudios(estudios) {
        if (!estudios) return { ramos: [], pruebas: [] };
        if (!Array.isArray(estudios.ramos)) estudios.ramos = [];
        if (!Array.isArray(estudios.pruebas)) estudios.pruebas = [];
        estudios.ramos = estudios.ramos.map(r => this._normalizeRamo(r));
        estudios.pruebas = estudios.pruebas.map(p => ({
            id: p.id,
            ramoId: p.ramoId,
            fecha: p.fecha || '',
            ponderacion: parseFloat(p.ponderacion) || 0,
            nota: p.nota !== undefined && p.nota !== '' ? p.nota : null,
            titulo: p.titulo || p.nombre || ''
        }));
        return estudios;
    },

    _normalizeRamo(r) {
        if (!r) return { id: DateUtils.generateId(), nombre: 'Sin nombre', calificaciones: [], horario: [] };
        const horario = (r.horario || []).map(b => this._normalizeHorarioBlock(b));
        return {
            ...r,
            id: r.id,
            nombre: (r.nombre && String(r.nombre).trim()) ? r.nombre : 'Sin nombre',
            profesor: r.profesor || '',
            correos: r.correos || '',
            companeros: r.companeros || '',
            notas: r.notas !== undefined && r.notas !== null ? String(r.notas) : '',
            calificaciones: Array.isArray(r.calificaciones) ? r.calificaciones : [],
            horario
        };
    },

    _normalizeHorarioBlock(b) {
        if (!b || typeof b !== 'object') return { dia: 'Lunes', horaInicio: '', horaFin: '', sala: '' };
        const hi = (b.horaInicio || b.hora || '').toString().trim().slice(0, 5);
        const hf = (b.horaFin || '').toString().trim().slice(0, 5);
        return {
            dia: b.dia || 'Lunes',
            horaInicio: hi,
            horaFin: hf,
            sala: (b.sala || b.aula || '').toString().trim()
        };
    },

    _timeSortKey(t) {
        if (!t) return '99:99';
        const m = /^(\d{1,2}):(\d{2})$/.exec(t);
        if (!m) return t;
        return `${m[1].padStart(2, '0')}:${m[2]}`;
    },

    _formatBlockRange(b) {
        if (b.horaInicio && b.horaFin) return `${b.horaInicio}–${b.horaFin}`;
        if (b.horaInicio) return b.horaInicio;
        return '—';
    },

    _upcomingPruebas(estudios, weeks) {
        const today = DateUtils.today();
        const limit = DateUtils.addDays(today, weeks * 7);
        return (estudios.pruebas || [])
            .filter(p => p.fecha && p.fecha >= today && p.fecha <= limit)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
    },

    _nextPruebaForRamo(ramoId, estudios) {
        const today = DateUtils.today();
        const list = (estudios.pruebas || [])
            .filter(p => p.ramoId === ramoId && p.fecha && p.fecha >= today)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
        return list[0] || null;
    },

    _renderUpcomingCard(upcoming, estudios) {
        if (!estudios.ramos.length) return '';
        return `
            <div class="card mb-lg studies-upcoming-card">
                <div class="flex justify-between items-center mb-md flex-wrap gap-sm">
                    <h4 class="card-title mb-0">Próximas evaluaciones</h4>
                    <span class="text-sm text-secondary">Próximas ${this.UPCOMING_WEEKS} semanas</span>
                </div>
                ${upcoming.length ? `
                    <ul class="studies-upcoming-list">
                        ${upcoming.map(p => {
                            const ramo = estudios.ramos.find(r => r.id === p.ramoId);
                            const label = (p.titulo && p.titulo.trim()) ? p.titulo.trim() : 'Evaluación';
                            return `
                                <li class="studies-upcoming-item" data-ramo-id="${p.ramoId}">
                                    <div class="studies-upcoming-date">
                                        <span class="studies-upcoming-day">${DateUtils.format(p.fecha, 'short')}</span>
                                        <span class="studies-upcoming-wd text-secondary text-sm">${DateUtils.format(p.fecha, 'long').split(',')[0]}</span>
                                    </div>
                                    <div class="studies-upcoming-body">
                                        <strong>${UI.esc(ramo ? ramo.nombre : 'Ramo')}</strong>
                                        <span class="text-secondary text-sm">${UI.esc(label)}${p.ponderacion ? ` · ${p.ponderacion}%` : ''}</span>
                                    </div>
                                    ${p.nota !== null && p.nota !== undefined && p.nota !== '' ? `<span class="badge badge-success">${UI.esc(String(p.nota))}</span>` : '<span class="badge badge-warning">Pendiente</span>'}
                                </li>
                            `;
                        }).join('')}
                    </ul>
                ` : '<p class="text-muted text-center mb-0">No hay evaluaciones programadas en este periodo.</p>'}
            </div>
        `;
    },

    _renderWeeklySchedule(ramos) {
        const buckets = this.DAYS_ORDER.map(() => []);
        ramos.forEach(ramo => {
            (ramo.horario || []).forEach(block => {
                const idx = this.DAYS_ORDER.indexOf(block.dia);
                if (idx < 0) return;
                buckets[idx].push({
                    sort: this._timeSortKey(block.horaInicio),
                    ramoId: ramo.id,
                    ramoNombre: ramo.nombre,
                    block
                });
            });
        });
        buckets.forEach(list => list.sort((a, b) => a.sort.localeCompare(b.sort)));

        const any = buckets.some(b => b.length > 0);
        if (!any) {
            return `<p class="text-muted text-center">Aún no hay bloques de horario. Abre un ramo y añade horario, o crea ramos desde <strong>+ Ramo</strong>.</p>`;
        }

        return `
            <div class="studies-week-wrap">
                <div class="studies-week-grid">
                    ${this.DAYS_ORDER.map((dia, i) => {
                        const short = DateUtils.DAYS_SHORT[this.DAYS_ORDER.indexOf(dia) + 1] || dia.slice(0, 3);
                        const items = buckets[i];
                        return `
                            <div class="studies-day-col">
                                <div class="studies-day-head">${short}</div>
                                <div class="studies-day-body">
                                    ${items.length ? items.map(({ ramoId, ramoNombre, block }) => `
                                        <button type="button" class="studies-block" data-ramo-id="${ramoId}">
                                            <span class="studies-block-time">${UI.esc(this._formatBlockRange(block))}</span>
                                            <span class="studies-block-name">${UI.esc(ramoNombre)}</span>
                                            ${block.sala ? `<span class="studies-block-room">${UI.esc(block.sala)}</span>` : ''}
                                        </button>
                                    `).join('') : '<span class="studies-day-empty">—</span>'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    _renderRamoCompactRow(r, estudios) {
        const avg = this._calcAvg(r.calificaciones);
        const nextP = this._nextPruebaForRamo(r.id, estudios);
        return `
            <button type="button" class="studies-ramo-row" data-ramo-id="${r.id}">
                <div class="studies-ramo-row-main">
                    <span class="studies-ramo-title">${UI.esc(r.nombre)}</span>
                    <span class="text-secondary text-sm">${UI.esc(r.profesor || 'Sin profesor')}</span>
                </div>
                <div class="studies-ramo-row-meta">
                    ${nextP ? `<span class="studies-ramo-next" title="Próxima evaluación">${DateUtils.format(nextP.fecha, 'short')}</span>` : '<span class="text-muted text-sm">Sin eval. próx.</span>'}
                    <span class="studies-ramo-avg ${avg >= 4 ? 'good' : avg >= 3 ? 'mid' : 'low'}">${avg > 0 ? avg.toFixed(1) : '—'}</span>
                </div>
            </button>
        `;
    },

    _calcAvg(calificaciones) {
        if (!calificaciones || calificaciones.length === 0) return 0;
        let totalWeight = 0; let weighted = 0;
        calificaciones.forEach(c => {
            const w = parseFloat(c.ponderacion) || 1;
            weighted += (parseFloat(c.nota) || 0) * w;
            totalWeight += w;
        });
        return totalWeight > 0 ? weighted / totalWeight : 0;
    },

    _timeToMinutes(t) {
        if (!t || typeof t !== 'string') return NaN;
        const p = t.trim().split(':');
        if (p.length < 2) return NaN;
        const h = parseInt(p[0], 10); const m = parseInt(p[1], 10);
        if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
        return h * 60 + m;
    },

    /**
     * Genera eventos de calendario para un bloque de horario entre dos fechas (misma lógica que + Horario).
     * @returns {number} cantidad de eventos nuevos añadidos
     */
    _expandBlockToCalendarInRange(udata, ramo, block, ramoId, desdeStr, hastaStr) {
        const b = this._normalizeHorarioBlock(block);
        const dayNum = this._dayNameToNum(b.dia);
        let count = 0;
        let d = DateUtils.fromDateStr(desdeStr);
        const end = DateUtils.fromDateStr(hastaStr);
        while (d <= end) {
            if (d.getDay() === dayNum) {
                const fecha = DateUtils.toDateStr(d);
                if (this._addEstudioEventToUserData(udata, ramo, fecha, b, ramoId)) count++;
            }
            d.setDate(d.getDate() + 1);
        }
        return count;
    },

    /** Añade prueba a estudios.pruebas y evento en calendario (misma idea que _addTest), mutando udata. */
    _pushPruebaEvaluacion(udata, ramoId, ramoNombre, ev) {
        if (!udata.estudios) udata.estudios = { ramos: [], pruebas: [] };
        if (!udata.estudios.pruebas) udata.estudios.pruebas = [];
        const titulo = (ev.titulo && String(ev.titulo).trim()) ? String(ev.titulo).trim() : '';
        udata.estudios.pruebas.push({
            id: DateUtils.generateId(),
            ramoId,
            fecha: ev.fecha,
            ponderacion: parseFloat(ev.ponderacion) || 0,
            nota: null,
            titulo
        });
        const tit = titulo || 'Prueba';
        const tituloCal = `${tit}: ${ramoNombre}`;
        if (!udata.calendario) udata.calendario = { eventos: [] };
        if (!Array.isArray(udata.calendario.eventos)) udata.calendario.eventos = [];
        const dup = udata.calendario.eventos.some(e =>
            e.titulo === tituloCal && e.fecha === ev.fecha && e.moduloOrigen === 'estudios'
        );
        if (!dup) {
            udata.calendario.eventos.push({
                id: DateUtils.generateId(),
                titulo: tituloCal,
                fecha: ev.fecha,
                tipo: 'study',
                color: '',
                moduloOrigen: 'estudios',
                completado: false
            });
        }
    },

    _htmlNewRamoScheduleRow(today, hastaDefault) {
        const diasOpts = this.DAYS_ORDER.map(d => `<option value="${d}">${d}</option>`).join('');
        return `
            <div class="studies-new-ramo-sched card mb-sm" style="padding:12px;border:1px solid var(--glass-border);border-radius:var(--border-radius-md,10px);">
                <div class="text-sm text-secondary mb-sm">Bloque de horario</div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Día</label>
                        <select class="form-input nr-sch-dia">${diasOpts}</select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Hora inicio</label>
                        <input type="time" class="form-input nr-sch-ini" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Hora fin</label>
                        <input type="time" class="form-input nr-sch-fin" />
                    </div>
                </div>
                ${UI.formGroup('Sala / aula (opcional)', '<input type="text" class="form-input nr-sch-sala" placeholder="Ej: Online, B-204" />')}
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Desde</label>
                        <input type="date" class="form-input nr-sch-desde" value="${today}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Hasta</label>
                        <input type="date" class="form-input nr-sch-hasta" value="${hastaDefault}" />
                    </div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm nr-sch-remove">Quitar bloque</button>
            </div>
        `;
    },

    _htmlNewRamoEvalRow(today) {
        return `
            <div class="studies-new-ramo-eval card mb-sm" style="padding:12px;border:1px solid var(--glass-border);border-radius:var(--border-radius-md,10px);">
                <div class="text-sm text-secondary mb-sm">Evaluación</div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Fecha</label>
                        <input type="date" class="form-input nr-ev-fecha" value="${today}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Título (opcional)</label>
                        <input type="text" class="form-input nr-ev-tit" placeholder="Ej: Certamen 1" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ponderación % (opc.)</label>
                        <input type="number" class="form-input nr-ev-pond" min="0" max="100" placeholder="%" />
                    </div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm nr-ev-remove">Quitar</button>
            </div>
        `;
    },

    /** Lee filas de horario del modal crear ramo; lanza Error si hay datos incompletos */
    _parseNewRamoScheduleRows(form) {
        const wrap = form.querySelector('#new-ramo-schedule-rows');
        if (!wrap) return [];
        const rows = wrap.querySelectorAll('.studies-new-ramo-sched');
        const out = [];
        rows.forEach(row => {
            const dia = row.querySelector('.nr-sch-dia')?.value?.trim();
            const ini = row.querySelector('.nr-sch-ini')?.value;
            const fin = row.querySelector('.nr-sch-fin')?.value;
            const sala = (row.querySelector('.nr-sch-sala')?.value || '').trim();
            const desde = row.querySelector('.nr-sch-desde')?.value;
            const hasta = row.querySelector('.nr-sch-hasta')?.value;
            const any = ini || fin || desde || hasta || sala;
            if (!any) return;
            if (!dia || !ini || !fin || !desde || !hasta) {
                throw new Error('Completa día, horas y rango desde/hasta en cada bloque de horario, o quita el bloque vacío.');
            }
            if (desde > hasta) throw new Error('En horario: "Desde" no puede ser posterior a "Hasta".');
            const a = this._timeToMinutes(ini);
            const b = this._timeToMinutes(fin);
            if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
                throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
            }
            out.push({
                block: { dia, horaInicio: ini, horaFin: fin, sala },
                desde,
                hasta
            });
        });
        return out;
    },

    _parseNewRamoEvalRows(form) {
        const wrap = form.querySelector('#new-ramo-eval-rows');
        if (!wrap) return [];
        const rows = wrap.querySelectorAll('.studies-new-ramo-eval');
        const out = [];
        rows.forEach(row => {
            const fecha = row.querySelector('.nr-ev-fecha')?.value;
            const tit = (row.querySelector('.nr-ev-tit')?.value || '').trim();
            const pond = row.querySelector('.nr-ev-pond')?.value;
            const any = fecha || tit || (pond !== undefined && pond !== '');
            if (!any) return;
            if (!fecha) throw new Error('Cada evaluación añadida debe tener fecha, o quita la fila.');
            out.push({ fecha, titulo: tit, ponderacion: pond });
        });
        return out;
    },

    _bindEvents(container, email, estudios) {
        const syncBtn = document.getElementById('btn-sync-horarios');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                const count = this._syncHorariosToCalendar(email, estudios);
                if (typeof PrioritiesSync !== 'undefined') {
                    const udata = Storage.getUserData(email);
                    if (PrioritiesSync.ensureEstudiosPriorities(udata, DateUtils.today())) {
                        Storage.saveUserData(email, udata);
                    }
                }
                UI.toast(
                    count > 0
                        ? `Sincronizado: ${count} evento(s) nuevo(s) en calendario (hasta +${this.SYNC_CALENDAR_FORWARD_DAYS} d). Abre #calendar para verlos.`
                        : 'Sin eventos nuevos (ya existían o revisa horarios/rango).',
                    'success'
                );
                this._refreshCalendarIfVisible();
                this.render(container);
            });
        }

        UI.bindButton('btn-add-ramo', () => {
            const today = DateUtils.today();
            const defaultHasta = DateUtils.addDays(today, 16 * 7);
            UI.showModal(`
                <h3 class="modal-title">Nuevo Ramo</h3>
                <form id="ramo-form">
                    ${UI.formGroup('Nombre del Ramo', UI.input('ramo_nombre', { placeholder: 'Ej: Matemáticas', required: true }))}
                    ${UI.formGroup('Profesor', UI.input('ramo_prof', { placeholder: 'Nombre del profesor' }))}
                    ${UI.formGroup('Correos contacto', UI.input('ramo_correos', { placeholder: 'correo1@x.com, correo2@x.com' }))}
                    ${UI.formGroup('Compañeros', UI.input('ramo_comp', { placeholder: 'Nombre1, Nombre2' }))}

                    <h4 class="mt-lg mb-sm">Horario (opcional)</h4>
                    <p class="text-sm text-secondary mb-sm">Añade uno o más bloques; se guardarán en el ramo y se crearán eventos en el calendario en el rango indicado.</p>
                    <div id="new-ramo-schedule-rows"></div>
                    <button type="button" id="btn-new-ramo-add-sched" class="btn btn-ghost btn-sm mb-md">+ Añadir bloque de horario</button>

                    <h4 class="mb-sm">Evaluaciones programadas (opcional)</h4>
                    <p class="text-sm text-secondary mb-sm">Fechas de pruebas o certámenes vinculadas a este ramo.</p>
                    <div id="new-ramo-eval-rows"></div>
                    <button type="button" id="btn-new-ramo-add-eval" class="btn btn-ghost btn-sm mb-md">+ Añadir evaluación</button>

                    <div class="modal-actions">
                        <button type="button" id="btn-ramo-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `, {
                size: 'lg',
                onReady: () => {
                    const form = document.getElementById('ramo-form');
                    const schedWrap = document.getElementById('new-ramo-schedule-rows');
                    const evalWrap = document.getElementById('new-ramo-eval-rows');

                    const addSched = () => {
                        if (!schedWrap) return;
                        schedWrap.insertAdjacentHTML('beforeend', this._htmlNewRamoScheduleRow(today, defaultHasta));
                        schedWrap.querySelector('.studies-new-ramo-sched:last-child .nr-sch-remove')?.addEventListener('click', (e) => {
                            e.target.closest('.studies-new-ramo-sched')?.remove();
                        });
                    };
                    const addEval = () => {
                        if (!evalWrap) return;
                        evalWrap.insertAdjacentHTML('beforeend', this._htmlNewRamoEvalRow(today));
                        evalWrap.querySelector('.studies-new-ramo-eval:last-child .nr-ev-remove')?.addEventListener('click', (e) => {
                            e.target.closest('.studies-new-ramo-eval')?.remove();
                        });
                    };

                    UI.bindButton('btn-new-ramo-add-sched', addSched);
                    UI.bindButton('btn-new-ramo-add-eval', addEval);
                    UI.bindButton('btn-ramo-cancel', () => UI.closeModal());

                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const fd = new FormData(form);
                        const ramoNombre = (fd.get('ramo_nombre') || '').trim();
                        if (!ramoNombre) {
                            UI.toast('Indica el nombre del ramo', 'error');
                            return;
                        }
                        let scheduleSpecs;
                        let evalSpecs;
                        try {
                            scheduleSpecs = this._parseNewRamoScheduleRows(form);
                            evalSpecs = this._parseNewRamoEvalRows(form);
                        } catch (err) {
                            UI.toast(err.message || 'Revisa los datos opcionales', 'error');
                            return;
                        }

                        const data = Storage.getUserData(email);
                        if (!data.estudios) data.estudios = { ramos: [], pruebas: [] };
                        if (!data.estudios.pruebas) data.estudios.pruebas = [];

                        const ramoId = DateUtils.generateId();
                        const ramo = {
                            id: ramoId,
                            nombre: ramoNombre,
                            profesor: fd.get('ramo_prof') || '',
                            correos: fd.get('ramo_correos') || '',
                            companeros: fd.get('ramo_comp') || '',
                            notas: '',
                            calificaciones: [],
                            horario: []
                        };

                        let evCalCount = 0;
                        scheduleSpecs.forEach(spec => {
                            const block = this._normalizeHorarioBlock(spec.block);
                            ramo.horario.push(block);
                            evCalCount += this._expandBlockToCalendarInRange(data, ramo, block, ramoId, spec.desde, spec.hasta);
                        });

                        data.estudios.ramos.push(ramo);

                        evalSpecs.forEach(ev => {
                            this._pushPruebaEvaluacion(data, ramoId, ramo.nombre, ev);
                        });

                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        const parts = ['Ramo creado'];
                        if (scheduleSpecs.length) parts.push(`${ramo.horario.length} bloque(s) de horario`);
                        if (evCalCount) parts.push(`${evCalCount} evento(s) en calendario`);
                        if (evalSpecs.length) parts.push(`${evalSpecs.length} evaluación(es)`);
                        UI.toast(parts.join(' · '), 'success');
                        this._refreshCalendarIfVisible();
                        this.render(container);
                    });
                }
            });
        });

        container.querySelectorAll('[data-ramo-id].studies-ramo-row, [data-ramo-id].studies-block, [data-ramo-id].studies-upcoming-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.ramoId;
                if (id) this._showRamoDetail(container, email, id);
            });
        });
    },

    _showRamoDetail(container, email, ramoId) {
        const data = Storage.getUserData(email);
        const estudios = this._normalizeEstudios(data.estudios || { ramos: [], pruebas: [] });
        const ramo = estudios.ramos.find(r => r.id === ramoId);
        if (!ramo) return;

        const avg = this._calcAvg(ramo.calificaciones);
        const pruebasRamo = (estudios.pruebas || []).filter(p => p.ramoId === ramoId).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

        ChartUtils.destroy('chart-ramo-detail');

        UI.showModal(`
            <h3 class="modal-title">${UI.esc(ramo.nombre)}</h3>
            <p class="text-secondary text-sm mb-md">Promedio ponderado: <strong>${avg > 0 ? avg.toFixed(2) : 'Sin notas'}</strong></p>

            <div class="studies-detail-grid">
                <div>
                    <p><strong>Profesor:</strong> ${UI.esc(ramo.profesor || '-')}</p>
                    <p><strong>Correos:</strong> ${UI.esc(ramo.correos || '-')}</p>
                    <p><strong>Compañeros:</strong> ${UI.esc(ramo.companeros || '-')}</p>
                </div>
            </div>

            <div class="studies-ramo-actions flex gap-sm flex-wrap mb-lg">
                <button id="btn-add-grade" class="btn btn-success btn-sm">+ Calificación</button>
                <button id="btn-add-test" class="btn btn-primary btn-sm">+ Prueba</button>
                <button id="btn-add-schedule" class="btn btn-secondary btn-sm">+ Horario</button>
                <button id="btn-del-ramo" class="btn btn-danger btn-sm">Eliminar Ramo</button>
            </div>

            <h4 class="mb-sm">Notas y apuntes</h4>
            <textarea id="ramo-notas-field" class="input studies-notas-area" rows="4" placeholder="Apuntes del ramo, enlaces, recordatorios…"></textarea>
            <div class="mt-sm mb-lg">
                <button type="button" id="btn-save-ramo-notas" class="btn btn-secondary btn-sm">Guardar notas</button>
            </div>

            <h4 class="mb-sm">Evolución de notas</h4>
            <div class="chart-container studies-detail-chart"><canvas id="chart-ramo-detail"></canvas></div>

            <h4 class="mt-lg mb-sm">Calificaciones</h4>
            ${ramo.calificaciones.length > 0 ? `
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Evaluación</th><th>Nota</th><th>Ponderación</th></tr></thead>
                        <tbody>
                            ${ramo.calificaciones.map(c => `
                                <tr>
                                    <td>${UI.esc(c.nombre)}</td>
                                    <td>${c.nota}</td>
                                    <td>${c.ponderacion}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p class="text-muted">Sin calificaciones registradas</p>'}

            <h4 class="mt-lg mb-sm">Evaluaciones programadas (este ramo)</h4>
            ${pruebasRamo.length ? `
                <ul class="studies-detail-pruebas">
                    ${pruebasRamo.map(p => `
                        <li>
                            <span>${DateUtils.format(p.fecha, 'medium')}</span>
                            <span>${UI.esc((p.titulo && p.titulo.trim()) ? p.titulo : 'Evaluación')}</span>
                            <span class="text-secondary">${p.ponderacion ? p.ponderacion + '%' : '—'}</span>
                            ${p.nota !== null && p.nota !== undefined && p.nota !== '' ? `<span class="badge badge-success">${p.nota}</span>` : '<span class="badge badge-warning">Pendiente</span>'}
                        </li>
                    `).join('')}
                </ul>
            ` : '<p class="text-muted text-sm">No hay pruebas en la lista para este ramo.</p>'}

            <h4 class="mt-lg mb-sm">Horario (bloques)</h4>
            ${(ramo.horario || []).length ? `
                <ul class="studies-detail-horario">
                    ${ramo.horario.map(b => `
                        <li>${UI.esc(b.dia)} · ${UI.esc(this._formatBlockRange(b))}${b.sala ? ` · ${UI.esc(b.sala)}` : ''}</li>
                    `).join('')}
                </ul>
            ` : '<p class="text-muted text-sm">Sin bloques de horario.</p>'}
        `, {
            size: 'lg',
            onReady: () => {
                const ta = document.getElementById('ramo-notas-field');
                if (ta) ta.value = ramo.notas || '';

                setTimeout(() => this._renderRamoLineChart(ramo), 80);

                UI.bindButton('btn-save-ramo-notas', () => {
                    const ta = document.getElementById('ramo-notas-field');
                    const u = Storage.getUserData(email);
                    const rr = u.estudios.ramos.find(r => r.id === ramoId);
                    if (rr && ta) {
                        rr.notas = ta.value;
                        Storage.saveUserData(email, u);
                        UI.toast('Notas guardadas', 'success');
                    }
                });

                UI.bindButton('btn-add-grade', () => {
                    UI.closeModal();
                    this._addGrade(container, email, ramoId);
                });
                UI.bindButton('btn-add-test', () => {
                    UI.closeModal();
                    this._addTest(container, email, ramoId);
                });
                UI.bindButton('btn-add-schedule', () => {
                    UI.closeModal();
                    this._addSchedule(container, email, ramoId);
                });
                UI.bindButton('btn-del-ramo', () => {
                    const d = Storage.getUserData(email);
                    d.estudios.ramos = d.estudios.ramos.filter(r => r.id !== ramoId);
                    d.estudios.pruebas = d.estudios.pruebas.filter(p => p.ramoId !== ramoId);
                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast('Ramo eliminado', 'success');
                    this.render(container);
                });
            }
        });
    },

    _renderRamoLineChart(ramo) {
        if (typeof Chart === 'undefined') return;
        const cal = ramo.calificaciones || [];
        if (!cal.length) return;
        const labels = cal.map(c => c.nombre || '—');
        const data = cal.map(c => parseFloat(c.nota) || 0);
        ChartUtils.line('chart-ramo-detail', labels, [{
            label: 'Nota',
            data,
            fill: true
        }], { beginAtZero: false });
    },

    _addGrade(container, email, ramoId) {
        UI.showModal(`
            <h3 class="modal-title">Nueva Calificación</h3>
            <form id="grade-form">
                ${UI.formGroup('Nombre', UI.input('gr_name', { placeholder: 'Ej: Prueba 1', required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Nota', UI.input('gr_nota', { type: 'number', placeholder: '1.0-7.0', required: true, min: 1, max: 7, step: '0.1' }))}
                    ${UI.formGroup('Ponderación (%)', UI.input('gr_pond', { type: 'number', placeholder: '%', required: true, min: 0, max: 100 }))}
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                const form = document.getElementById('grade-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fd = new FormData(form);
                        const data = {};
                        fd.forEach((v, k) => { data[k] = v; });
                        if (!data.gr_name || !data.gr_name.trim()) return;
                        const udata = Storage.getUserData(email);
                        const ramo = udata.estudios.ramos.find(r => r.id === ramoId);
                        if (ramo) {
                            ramo.calificaciones.push({
                                nombre: data.gr_name,
                                nota: parseFloat(data.gr_nota) || 0,
                                ponderacion: parseFloat(data.gr_pond) || 0
                            });
                            Storage.saveUserData(email, udata);
                            UI.closeModal();
                            UI.toast('Calificación agregada', 'success');
                            this.render(container);
                        }
                    });
                }
            }
        });
    },

    _addTest(container, email, ramoId) {
        UI.showModal(`
            <h3 class="modal-title">Nueva Prueba / evaluación</h3>
            <form id="test-form">
                ${UI.formGroup('Nombre (opcional)', UI.input('tst_titulo', { placeholder: 'Ej: Certamen 1' }))}
                ${UI.formGroup('Fecha', UI.input('tst_fecha', { type: 'date', required: true, value: DateUtils.today() }))}
                ${UI.formGroup('Ponderación (%)', UI.input('tst_pond', { type: 'number', placeholder: '%', min: 0, max: 100 }))}
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Crear</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                const form = document.getElementById('test-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fd = new FormData(form);
                        const data = {};
                        fd.forEach((v, k) => { data[k] = v; });
                        if (!data.tst_fecha) return;
                        const udata = Storage.getUserData(email);
                        if (!udata.estudios.pruebas) udata.estudios.pruebas = [];
                        const ramo = udata.estudios.ramos.find(r => r.id === ramoId);
                        udata.estudios.pruebas.push({
                            id: DateUtils.generateId(),
                            ramoId,
                            fecha: data.tst_fecha,
                            ponderacion: parseFloat(data.tst_pond) || 0,
                            nota: null,
                            titulo: (data.tst_titulo && data.tst_titulo.trim()) ? data.tst_titulo.trim() : ''
                        });
                        if (ramo && data.tst_fecha && typeof CalendarPage !== 'undefined' && CalendarPage.addAutoEvent) {
                            const tit = (data.tst_titulo && data.tst_titulo.trim()) ? data.tst_titulo.trim() : 'Prueba';
                            CalendarPage.addAutoEvent(email, `${tit}: ${ramo.nombre}`, data.tst_fecha, 'study', 'estudios');
                        }
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        UI.toast('Prueba creada', 'success');
                        this.render(container);
                    });
                }
            }
        });
    },

    _dayNameToNum(dia) {
        const map = { Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6 };
        return map[dia] ?? 0;
    },

    /** Título en calendario: nombre del ramo + sala si existe */
    _tituloEventoRamo(ramo, block) {
        const n = ramo?.nombre || 'Clase';
        const s = block && String(block.sala || '').trim();
        return s ? `${n} · ${s}` : n;
    },

    /**
     * Inserta evento de estudios en el objeto usuario (un solo saveUserData después).
     * Dedupe igual que CalendarPage.addAutoEvent (fecha+título+hora+ramoId+módulo).
     * @returns {boolean} true si se añadió
     */
    _addEstudioEventToUserData(udata, ramo, fecha, block, ramoId) {
        if (!udata.calendario) udata.calendario = { eventos: [] };
        if (!Array.isArray(udata.calendario.eventos)) udata.calendario.eventos = [];
        const b = this._normalizeHorarioBlock(block);
        const hora = (b.horaInicio || '').toString().slice(0, 5);
        const horaFin = (b.horaFin || '').toString().slice(0, 5);
        const rid = ramoId || null;
        const titulo = this._tituloEventoRamo(ramo, b);
        const exists = udata.calendario.eventos.some(e =>
            e.titulo === titulo && e.fecha === fecha && e.moduloOrigen === 'estudios' &&
            (e.hora || '') === hora && (e.ramoId || null) === rid
        );
        if (exists) return false;
        udata.calendario.eventos.push({
            id: DateUtils.generateId(),
            titulo,
            fecha,
            tipo: 'study',
            color: '',
            moduloOrigen: 'estudios',
            completado: false,
            hora,
            horaFin,
            ramoId: rid
        });
        return true;
    },

    _refreshCalendarIfVisible() {
        if (window.location.hash !== '#calendar' || typeof CalendarPage === 'undefined') return;
        const c = document.getElementById('page-container');
        if (c) CalendarPage.render(c);
    },

    _syncHorariosToCalendar(email, estudios) {
        const udata = Storage.getUserData(email);
        const today = DateUtils.today();
        const hasta = DateUtils.addDays(today, this.SYNC_CALENDAR_FORWARD_DAYS);
        let count = 0;
        (estudios.ramos || []).forEach(ramo => {
            (ramo.horario || []).forEach(block => {
                const b = this._normalizeHorarioBlock(block);
                const dayNum = this._dayNameToNum(b.dia);
                let d = DateUtils.fromDateStr(today);
                const end = DateUtils.fromDateStr(hasta);
                while (d <= end) {
                    if (d.getDay() === dayNum) {
                        const fecha = DateUtils.toDateStr(d);
                        if (this._addEstudioEventToUserData(udata, ramo, fecha, b, ramo.id)) count++;
                    }
                    d.setDate(d.getDate() + 1);
                }
            });
        });
        Storage.saveUserData(email, udata);
        return count;
    },

    _addSchedule(container, email, ramoId) {
        const today = DateUtils.today();
        const defaultHasta = DateUtils.addDays(today, 16 * 7);
        UI.showModal(`
            <h3 class="modal-title">Agregar Horario</h3>
            <form id="sched-form">
                ${UI.formGroup('Día', UI.select('sch_dia', ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], '', { required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Hora Inicio', UI.input('sch_inicio', { type: 'time', required: true }))}
                    ${UI.formGroup('Hora Fin', UI.input('sch_fin', { type: 'time', required: true }))}
                </div>
                ${UI.formGroup('Sala / aula (opcional)', UI.input('sch_sala', { placeholder: 'Ej: B-204' }))}
                <div class="form-row">
                    ${UI.formGroup('Desde (calendario)', UI.input('sch_desde', { type: 'date', value: today }))}
                    ${UI.formGroup('Hasta (calendario)', UI.input('sch_hasta', { type: 'date', value: defaultHasta }))}
                </div>
                <p class="form-hint text-sm">Se crearán eventos en el calendario para cada día que coincida con el día elegido.</p>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                const form = document.getElementById('sched-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fd = new FormData(form);
                        const data = {};
                        fd.forEach((v, k) => { data[k] = v; });
                        if (!data.sch_dia || !data.sch_inicio || !data.sch_fin) return;
                        const udata = Storage.getUserData(email);
                        const ramo = udata.estudios.ramos.find(r => r.id === ramoId);
                        if (ramo) {
                            if (!ramo.horario) ramo.horario = [];
                            const block = {
                                dia: data.sch_dia,
                                horaInicio: data.sch_inicio,
                                horaFin: data.sch_fin,
                                sala: (data.sch_sala && data.sch_sala.trim()) ? data.sch_sala.trim() : ''
                            };
                            ramo.horario.push(block);
                            const desde = data.sch_desde || today;
                            const hasta = data.sch_hasta || defaultHasta;
                            const count = this._expandBlockToCalendarInRange(udata, ramo, block, ramoId, desde, hasta);
                            Storage.saveUserData(email, udata);
                            UI.closeModal();
                            const msg = count > 0
                                ? `Horario guardado. ${count} evento(s) en el calendario (tipo estudio). Revisa #calendar o abre Calendario.`
                                : 'Horario guardado (los eventos ya existían o el rango no incluye ese día de la semana).';
                            UI.toast(msg, 'success');
                            this._refreshCalendarIfVisible();
                            this.render(container);
                        }
                    });
                }
            }
        });
    }
};
