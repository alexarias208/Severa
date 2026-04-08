/* ============================================
   EXERCISES PAGE - Workout Tracker with Types
   Strength (sets/reps/weight), Cardio (km/time/calories)
   ============================================ */

const ExercisesPage = {
    bodyParts: [
        { id: 'head', name: 'Cabeza/Cuello' },
        { id: 'chest', name: 'Pecho' },
        { id: 'shoulders', name: 'Hombros' },
        { id: 'biceps', name: 'Bíceps' },
        { id: 'triceps', name: 'Tríceps' },
        { id: 'abs', name: 'Abdominales' },
        { id: 'back', name: 'Espalda' },
        { id: 'forearms', name: 'Antebrazos' },
        { id: 'glutes', name: 'Glúteos' },
        { id: 'quads', name: 'Cuádriceps' },
        { id: 'hamstrings', name: 'Isquiotibiales' },
        { id: 'calves', name: 'Pantorrillas' },
        { id: 'cardio', name: 'Cardio (General)' }
    ],

    exerciseTypes: [
        { id: 'strength', name: 'Fuerza', icon: '🏋️', fields: ['series', 'reps', 'peso'] },
        { id: 'cardio', name: 'Cardio', icon: '🏃', fields: ['km', 'tiempo', 'calorias'] },
        { id: 'bodyweight', name: 'Peso corporal', icon: '💪', fields: ['series', 'reps'] },
        { id: 'flexibility', name: 'Flexibilidad', icon: '🧘', fields: ['tiempo'] }
    ],

    // Common exercise presets
    presets: {
        strength: [
            { nombre: 'Press banca', parte: 'chest' },
            { nombre: 'Sentadillas', parte: 'quads' },
            { nombre: 'Peso muerto', parte: 'back' },
            { nombre: 'Press militar', parte: 'shoulders' },
            { nombre: 'Curl bíceps', parte: 'biceps' },
            { nombre: 'Extensión tríceps', parte: 'triceps' },
            { nombre: 'Remo con barra', parte: 'back' },
            { nombre: 'Prensa de piernas', parte: 'quads' },
            { nombre: 'Hip thrust', parte: 'glutes' },
            { nombre: 'Elevación de pantorrillas', parte: 'calves' },
        ],
        cardio: [
            { nombre: 'Correr', parte: 'cardio' },
            { nombre: 'Bicicleta', parte: 'cardio' },
            { nombre: 'Elíptica', parte: 'cardio' },
            { nombre: 'Nadar', parte: 'cardio' },
            { nombre: 'Saltar cuerda', parte: 'cardio' },
            { nombre: 'Caminata', parte: 'cardio' },
        ],
        bodyweight: [
            { nombre: 'Flexiones', parte: 'chest' },
            { nombre: 'Dominadas', parte: 'back' },
            { nombre: 'Abdominales', parte: 'abs' },
            { nombre: 'Planchas', parte: 'abs' },
            { nombre: 'Burpees', parte: 'cardio' },
            { nombre: 'Sentadillas sin peso', parte: 'quads' },
            { nombre: 'Fondos', parte: 'triceps' },
        ],
        flexibility: [
            { nombre: 'Estiramiento general', parte: 'back' },
            { nombre: 'Yoga', parte: 'abs' },
        ]
    },

    selectedViewDate: null,

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const ejercicios = data.ejercicios || { sesiones: [] };
        const today = DateUtils.today();
        const week = DateUtils.getWeekRange(today);

        const weeklyWork = this._getWeeklyWork(ejercicios.sesiones, week);
        const viewDate = this.selectedViewDate || today;
        const dayWork = this._getDayWork(ejercicios.sesiones, viewDate);
        const daySessions = ejercicios.sesiones.filter(s => s.fecha === viewDate);

        // Weekly stats
        const weekSessions = ejercicios.sesiones.filter(s => DateUtils.isInRange(s.fecha, week.start, week.end));
        const totalExercises = weekSessions.reduce((s, sess) => s + sess.ejercicios.length, 0);
        const totalWeight = weekSessions.reduce((s, sess) => s + sess.ejercicios.reduce((s2, e) => s2 + ((e.peso || 0) * (e.reps || 0) * (e.series || 1)), 0), 0);
        const totalKm = weekSessions.reduce((s, sess) => s + sess.ejercicios.reduce((s2, e) => s2 + (e.km || 0), 0), 0);
        const totalCal = weekSessions.reduce((s, sess) => s + sess.ejercicios.reduce((s2, e) => s2 + (e.calorias || 0), 0), 0);

        container.innerHTML = `
            ${UI.pageTitle('Ejercicios', '<button id="btn-add-session" class="btn btn-primary btn-sm">+ Nueva Sesión</button>', 'exercises')}

            <!-- Weekly Stats -->
            <div class="cards-grid cols-4 mb-lg">
                <div class="card text-center">
                    <div class="text-3xl font-bold" style="color:var(--accent-blue);">${weekSessions.length}</div>
                    <div class="text-sm text-secondary">Sesiones</div>
                </div>
                <div class="card text-center">
                    <div class="text-3xl font-bold" style="color:var(--accent-green);">${totalExercises}</div>
                    <div class="text-sm text-secondary">Ejercicios</div>
                </div>
                <div class="card text-center">
                    <div class="text-3xl font-bold" style="color:var(--accent-purple);">${totalWeight > 0 ? (totalWeight/1000).toFixed(1) + 't' : '0'}</div>
                    <div class="text-sm text-secondary">Volumen Total</div>
                </div>
                <div class="card text-center">
                    <div class="text-3xl font-bold" style="color:var(--state-error);">${totalKm > 0 ? totalKm.toFixed(1) + 'km' : totalCal > 0 ? totalCal + 'cal' : '0'}</div>
                    <div class="text-sm text-secondary">Cardio</div>
                </div>
            </div>

            <div class="cards-grid">
                <div class="card">
                    <div style="display:flex; align-items:center; justify-content:center; gap:var(--spacing-md); flex-wrap:wrap; margin-bottom:var(--spacing-md);">
                        <button id="ex-date-prev" class="btn btn-ghost btn-sm">◀</button>
                        <button id="ex-date-today" class="btn btn-ghost btn-sm" ${viewDate === today ? 'disabled' : ''}>Hoy</button>
                        <button id="ex-date-next" class="btn btn-ghost btn-sm" ${viewDate >= today ? 'disabled' : ''}>▶</button>
                        <h4 class="card-title text-center" style="margin:0;">Mapa Corporal — ${DateUtils.format(viewDate, 'long')}</h4>
                    </div>
                    <div class="body-svg-container">
                        ${this._renderBodySVG(dayWork)}
                    </div>
                    <p class="text-secondary text-sm text-center mt-sm">Sesiones este día: ${daySessions.length}</p>
                    <div class="flex flex-wrap gap-sm justify-center mt-md">
                        <span class="flex items-center gap-xs text-sm"><span class="color-dot" style="background:#F44336;width:10px;height:10px;"></span> Alta</span>
                        <span class="flex items-center gap-xs text-sm"><span class="color-dot" style="background:#FFC107;width:10px;height:10px;"></span> Media</span>
                        <span class="flex items-center gap-xs text-sm"><span class="color-dot" style="background:#4CAF50;width:10px;height:10px;"></span> Baja</span>
                        <span class="flex items-center gap-xs text-sm"><span class="color-dot" style="background:#ddd;width:10px;height:10px;"></span> Sin trabajo</span>
                    </div>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Progreso Semanal</h4>
                    <div class="chart-container" style="height:250px;"><canvas id="chart-exercise"></canvas></div>
                </div>
            </div>

            <!-- Rutinas recomendadas (Guía casa) -->
            <div class="card mt-lg">
                <h4 class="card-title mb-md">Rutinas recomendadas</h4>
                <p class="text-secondary text-sm mb-md">Por nivel: principiante (más fáciles) o intermedio. Elige una y "Usar esta rutina" para cargar la sesión.</p>
                <div class="flex gap-sm mb-md flex-wrap">
                    <label class="text-sm text-secondary">Nivel:</label>
                    <select id="rutinas-nivel-filter" class="form-select" style="width:auto;">
                        <option value="">Todas</option>
                        <option value="principiante">Principiante</option>
                        <option value="intermedio">Intermedio</option>
                    </select>
                </div>
                <div id="rutinas-recomendacion"></div>
                <div id="rutinas-container">Cargando rutinas...</div>
            </div>

            <!-- Sessions -->
            <div class="card mt-lg">
                <h4 class="card-title mb-md">Sesiones Recientes</h4>
                ${ejercicios.sesiones.length > 0 ? ejercicios.sesiones
                    .sort((a, b) => b.fecha.localeCompare(a.fecha))
                    .slice(0, 15)
                    .map(s => `
                        <div class="finance-item clickable" data-session-id="${s.id}">
                            <div class="item-info">
                                <strong>${DateUtils.format(s.fecha, 'medium')}</strong>
                                <span class="text-secondary">
                                    ${s.ejercicios.length} ejercicios &middot;
                                    ${this._sessionSummary(s)}
                                </span>
                            </div>
                            <button class="btn btn-ghost btn-sm text-error" data-del-session="${s.id}">✕</button>
                        </div>
                    `).join('') : UI.emptyState('Sin sesiones registradas. Registra tu primera sesión de entrenamiento.')}
            </div>

            ${this._renderAlerts(weeklyWork)}
        `;

        this._bindEvents(container, email, ejercicios);
        this._renderChart(ejercicios.sesiones);
    },

    _sessionSummary(session) {
        const parts = [...new Set(session.ejercicios.map(e => {
            const bp = this.bodyParts.find(p => p.id === e.parte);
            return bp ? bp.name : e.parte;
        }))];
        const totalVol = session.ejercicios.reduce((s, e) => s + ((e.peso || 0) * (e.reps || 0) * (e.series || 1)), 0);
        const totalKm = session.ejercicios.reduce((s, e) => s + (e.km || 0), 0);
        let summary = parts.slice(0, 3).join(', ');
        if (totalVol > 0) summary += ` &middot; ${(totalVol/1000).toFixed(1)}t vol.`;
        if (totalKm > 0) summary += ` &middot; ${totalKm.toFixed(1)}km`;
        return summary;
    },

    _getWeeklyWork(sesiones, week) {
        const work = {};
        this.bodyParts.forEach(p => { work[p.id] = 0; });
        sesiones.filter(s => DateUtils.isInRange(s.fecha, week.start, week.end)).forEach(s => {
            s.ejercicios.forEach(e => {
                if (work[e.parte] !== undefined) work[e.parte]++;
            });
        });
        return work;
    },

    _getDayWork(sesiones, dateStr) {
        const work = {};
        this.bodyParts.forEach(p => { work[p.id] = 0; });
        sesiones.filter(s => s.fecha === dateStr).forEach(s => {
            s.ejercicios.forEach(e => {
                if (work[e.parte] !== undefined) work[e.parte]++;
            });
        });
        return work;
    },

    _renderBodySVG(weeklyWork) {
        const getColor = (count) => {
            if (count === 0) return '#ddd';
            if (count <= 1) return '#4CAF50';
            if (count <= 3) return '#FFC107';
            return '#F44336';
        };

        return `
            <svg viewBox="0 0 320 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;margin:0 auto;display:block;">
                <ellipse cx="160" cy="35" rx="25" ry="30" fill="${getColor(weeklyWork.head)}" stroke="#999" stroke-width="1" data-part="head" style="cursor:pointer;"/>
                <rect x="150" y="60" width="20" height="12" fill="${getColor(weeklyWork.head)}" rx="3"/>
                <rect x="100" y="70" width="120" height="15" fill="${getColor(weeklyWork.shoulders)}" stroke="#999" stroke-width="1" rx="7" data-part="shoulders" style="cursor:pointer;"/>
                <rect x="120" y="82" width="80" height="40" fill="${getColor(weeklyWork.chest)}" stroke="#999" stroke-width="1" rx="5" data-part="chest" style="cursor:pointer;"/>
                <rect x="85" y="82" width="30" height="45" fill="${getColor(weeklyWork.biceps)}" stroke="#999" stroke-width="1" rx="10" data-part="biceps" style="cursor:pointer;"/>
                <rect x="78" y="127" width="25" height="40" fill="${getColor(weeklyWork.forearms)}" stroke="#999" stroke-width="1" rx="8" data-part="forearms" style="cursor:pointer;"/>
                <rect x="205" y="82" width="30" height="45" fill="${getColor(weeklyWork.triceps)}" stroke="#999" stroke-width="1" rx="10" data-part="triceps" style="cursor:pointer;"/>
                <rect x="217" y="127" width="25" height="40" fill="${getColor(weeklyWork.forearms)}" stroke="#999" stroke-width="1" rx="8" style="cursor:pointer;"/>
                <rect x="128" y="122" width="64" height="50" fill="${getColor(weeklyWork.abs)}" stroke="#999" stroke-width="1" rx="5" data-part="abs" style="cursor:pointer;"/>
                <rect x="125" y="172" width="70" height="30" fill="${getColor(weeklyWork.glutes)}" stroke="#999" stroke-width="1" rx="10" data-part="glutes" style="cursor:pointer;"/>
                <rect x="120" y="202" width="35" height="60" fill="${getColor(weeklyWork.quads)}" stroke="#999" stroke-width="1" rx="10" data-part="quads" style="cursor:pointer;"/>
                <rect x="122" y="262" width="30" height="50" fill="${getColor(weeklyWork.calves)}" stroke="#999" stroke-width="1" rx="8" data-part="calves" style="cursor:pointer;"/>
                <rect x="165" y="202" width="35" height="60" fill="${getColor(weeklyWork.quads)}" stroke="#999" stroke-width="1" rx="10" style="cursor:pointer;"/>
                <rect x="168" y="262" width="30" height="50" fill="${getColor(weeklyWork.calves)}" stroke="#999" stroke-width="1" rx="8" style="cursor:pointer;"/>
            </svg>
        `;
    },

    _renderAlerts(weeklyWork) {
        const unworked = this.bodyParts.filter(p => p.id !== 'cardio' && (weeklyWork[p.id] || 0) === 0);
        if (unworked.length === 0) return '';
        return `
            <div class="alert alert-warning mt-lg">
                <strong>Partes sin trabajar esta semana:</strong> ${unworked.map(p => p.name).join(', ')}
            </div>
        `;
    },

    _renderChart(sesiones) {
        if (typeof Chart === 'undefined') return;
        const today = DateUtils.today();
        const labels = [];
        const strengthData = [];
        const cardioData = [];
        for (let i = 6; i >= 0; i--) {
            const d = DateUtils.addDays(today, -i);
            labels.push(DateUtils.format(d, 'short'));
            const daySessions = sesiones.filter(s => s.fecha === d);
            strengthData.push(daySessions.reduce((sum, s) => sum + s.ejercicios.filter(e => e.tipo === 'strength' || e.tipo === 'bodyweight' || (!e.tipo && e.reps)).length, 0));
            cardioData.push(daySessions.reduce((sum, s) => sum + s.ejercicios.filter(e => e.tipo === 'cardio' || (!e.tipo && e.km)).length, 0));
        }
        ChartUtils.bar('chart-exercise', labels, [
            { label: 'Fuerza', data: strengthData, color: '#FF9800' },
            { label: 'Cardio', data: cardioData, color: '#2196F3' }
        ]);
    },

    _showSessionModal(container, email, prefillEjercicios) {
        const self = this;
        UI.showModal(`
            <h3 class="modal-title">Nueva Sesión de Entrenamiento</h3>
            <form id="session-form">
                ${UI.formGroup('Fecha', UI.input('ses_fecha', { type: 'date', value: DateUtils.today(), required: true }))}
                <div class="flex gap-sm mb-md flex-wrap">
                    ${this.exerciseTypes.map(t => `
                        <button type="button" class="btn btn-ghost btn-sm exercise-type-btn" data-type="${t.id}">
                            ${t.icon} ${t.name}
                        </button>
                    `).join('')}
                </div>
                <div id="exercise-list" class="dynamic-list"></div>
                <div class="modal-actions">
                    <button type="button" id="btn-ses-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Sesión</button>
                </div>
            </form>
        `, {
            size: 'lg',
            onReady: () => {
                const addExerciseRow = (type = 'strength', preset = null) => {
                    const list = document.getElementById('exercise-list');
                    if (!list) return;
                    const id = DateUtils.generateId();
                    const typeInfo = self.exerciseTypes.find(t => t.id === type) || self.exerciseTypes[0];
                    const partsOpts = self.bodyParts.map(p => `<option value="${p.id}" ${preset && p.id === preset.parte ? 'selected' : ''}>${p.name}</option>`).join('');
                    const presetsForType = self.presets[type] || [];
                    const presetOpts = presetsForType.map(p => `<option value="${p.nombre}" data-parte="${p.parte}">${p.nombre}</option>`).join('');

                    let fieldsHtml = '';
                    if (typeInfo.fields.includes('series')) {
                        fieldsHtml += `<div class="form-group"><label class="text-xs text-secondary">Series</label><input type="number" class="form-input" name="ex_series_${id}" placeholder="3" min="1" value="${preset?.series ?? 3}" style="width:65px;"></div>`;
                    }
                    if (typeInfo.fields.includes('reps')) {
                        fieldsHtml += `<div class="form-group"><label class="text-xs text-secondary">Reps</label><input type="number" class="form-input" name="ex_reps_${id}" placeholder="10" min="0" value="${preset?.reps ?? ''}" style="width:65px;"></div>`;
                    }
                    if (typeInfo.fields.includes('peso')) {
                        fieldsHtml += `<div class="form-group"><label class="text-xs text-secondary">Peso (kg)</label><input type="number" class="form-input" name="ex_peso_${id}" placeholder="0" min="0" step="0.5" value="${preset?.peso ?? ''}" style="width:75px;"></div>`;
                    }
                    if (typeInfo.fields.includes('km')) {
                        fieldsHtml += `<div class="form-group"><label class="text-xs text-secondary">Km</label><input type="number" class="form-input" name="ex_km_${id}" placeholder="0" min="0" step="0.1" value="${preset?.km ?? ''}" style="width:75px;"></div>`;
                    }
                    if (typeInfo.fields.includes('tiempo')) {
                        fieldsHtml += `<div class="form-group"><label class="text-xs text-secondary">Min</label><input type="number" class="form-input" name="ex_tiempo_${id}" placeholder="0" min="0" value="${preset?.tiempo ?? ''}" style="width:65px;"></div>`;
                    }
                    if (typeInfo.fields.includes('calorias')) {
                        fieldsHtml += `<div class="form-group"><label class="text-xs text-secondary">Cal</label><input type="number" class="form-input" name="ex_cal_${id}" placeholder="0" min="0" value="${preset?.calorias ?? ''}" style="width:75px;"></div>`;
                    }

                    const row = document.createElement('div');
                    row.className = 'dynamic-item exercise-row';
                    row.dataset.id = id;
                    row.dataset.type = type;
                    row.innerHTML = `
                        <div class="exercise-row-header">
                            <span class="badge">${typeInfo.icon} ${typeInfo.name}</span>
                            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
                        </div>
                        <div class="flex gap-sm flex-wrap items-end">
                            <div class="form-group" style="flex:1;min-width:120px;">
                                <label class="text-xs text-secondary">Ejercicio</label>
                                ${presetsForType.length > 0 ? `
                                    <select class="form-select exercise-preset-sel" name="ex_preset_${id}">
                                        <option value="">-- Personalizado --</option>
                                        ${presetOpts}
                                    </select>
                                ` : ''}
                                <input class="form-input mt-xs" name="ex_name_${id}" placeholder="Nombre del ejercicio" value="${UI.esc(preset?.nombre || '')}">
                            </div>
                            <div class="form-group" style="min-width:110px;">
                                <label class="text-xs text-secondary">Parte del cuerpo</label>
                                <select class="form-select" name="ex_part_${id}">${partsOpts}</select>
                            </div>
                            ${fieldsHtml}
                        </div>
                    `;
                    list.appendChild(row);

                    const presetSel = row.querySelector('.exercise-preset-sel');
                    if (presetSel) {
                        presetSel.addEventListener('change', () => {
                            const val = presetSel.value;
                            const nameInput = row.querySelector(`[name="ex_name_${id}"]`);
                            const partSelect = row.querySelector(`[name="ex_part_${id}"]`);
                            if (val && nameInput && partSelect) {
                                nameInput.value = val;
                                const opt = presetSel.selectedOptions[0];
                                if (opt && opt.dataset.parte) partSelect.value = opt.dataset.parte;
                            }
                        });
                    }
                };

                document.querySelectorAll('.exercise-type-btn').forEach(btn => {
                    btn.addEventListener('click', () => addExerciseRow(btn.dataset.type));
                });

                if (prefillEjercicios && prefillEjercicios.length > 0) {
                    prefillEjercicios.forEach(ej => {
                        addExerciseRow(ej.tipo || 'bodyweight', {
                            nombre: ej.nombre,
                            parte: ej.parte,
                            series: ej.series,
                            reps: ej.reps,
                            tiempo: ej.tiempo
                        });
                    });
                } else {
                    addExerciseRow('strength');
                }

                UI.bindButton('btn-ses-cancel', () => UI.closeModal());

                UI.bindForm('session-form', (fd) => {
                    const exercises = [];
                    document.querySelectorAll('#exercise-list .exercise-row').forEach(row => {
                        const id = row.dataset.id;
                        const tipo = row.dataset.type;
                        const nombre = row.querySelector(`[name="ex_name_${id}"]`)?.value || '';
                        const parte = row.querySelector(`[name="ex_part_${id}"]`)?.value || '';
                        if (!nombre) return;
                        const exercise = { nombre, parte, tipo };
                        const series = parseInt(row.querySelector(`[name="ex_series_${id}"]`)?.value) || 0;
                        const reps = parseInt(row.querySelector(`[name="ex_reps_${id}"]`)?.value) || 0;
                        const peso = parseFloat(row.querySelector(`[name="ex_peso_${id}"]`)?.value) || 0;
                        const km = parseFloat(row.querySelector(`[name="ex_km_${id}"]`)?.value) || 0;
                        const tiempo = parseInt(row.querySelector(`[name="ex_tiempo_${id}"]`)?.value) || 0;
                        const calorias = parseInt(row.querySelector(`[name="ex_cal_${id}"]`)?.value) || 0;
                        if (series) exercise.series = series;
                        if (reps) exercise.reps = reps;
                        if (peso) exercise.peso = peso;
                        if (km) exercise.km = km;
                        if (tiempo) exercise.tiempo = tiempo;
                        if (calorias) exercise.calorias = calorias;
                        exercises.push(exercise);
                    });

                    if (exercises.length === 0) {
                        UI.toast('Agrega al menos un ejercicio', 'error');
                        return;
                    }

                    const data = Storage.getUserData(email);
                    const sessionDate = fd.ses_fecha || DateUtils.today();
                    data.ejercicios.sesiones.push({
                        id: DateUtils.generateId(),
                        fecha: sessionDate,
                        ejercicios: exercises
                    });
                    if (!data.diario) data.diario = { entradas: {} };
                    if (!data.diario.entradas[sessionDate]) {
                        data.diario.entradas[sessionDate] = { texto: '', calificacion: '', nota: 5, actividades: [], creado: new Date().toISOString(), modificado: new Date().toISOString() };
                    }
                    const acts = data.diario.entradas[sessionDate].actividades || [];
                    if (!acts.includes('Ejercicio')) {
                        data.diario.entradas[sessionDate].actividades = [...acts, 'Ejercicio'];
                        data.diario.entradas[sessionDate].modificado = new Date().toISOString();
                    }
                    Storage.saveUserData(email, data);
                    CalendarPage.addAutoEvent(email, 'Sesión de ejercicio', sessionDate, 'Ejercicio', 'ejercicios');
                    UI.closeModal();
                    UI.toast('Sesión registrada exitosamente', 'success');
                    self.render(container);
                });
            }
        });
    },

    _bindEvents(container, email, ejercicios) {
        const self = this;
        // Date navigation for body map
        UI.bindButton('ex-date-prev', () => {
            const today = DateUtils.today();
            const base = self.selectedViewDate || today;
            self.selectedViewDate = DateUtils.addDays(base, -1);
            self.render(container);
        });
        UI.bindButton('ex-date-today', () => {
            self.selectedViewDate = null;
            self.render(container);
        });
        UI.bindButton('ex-date-next', () => {
            const today = DateUtils.today();
            const base = self.selectedViewDate || today;
            if (base >= today) return;
            self.selectedViewDate = DateUtils.addDays(base, 1);
            self.render(container);
        });

        UI.bindButton('btn-add-session', () => this._showSessionModal(container, email, null));

        // Load rutinas + guia-ejercicios; fill recomendación (por partes sin trabajar) y lista con imagen/indicaciones
        const week = DateUtils.getWeekRange(DateUtils.today());
        const weeklyWork = self._getWeeklyWork(ejercicios.sesiones || [], week);
        const unworked = self.bodyParts.filter(p => p.id !== 'cardio' && (weeklyWork[p.id] || 0) === 0);

        Promise.all([
            fetch('data/rutinas.json').then(r => r.ok ? r.json() : { rutinas: [] }),
            fetch('data/guia-ejercicios.json').then(r => r.ok ? r.json() : { ejercicios: [] })
        ]).then(([dataRutinas, dataGuia]) => {
            const rutinas = dataRutinas.rutinas || [];
            const guiaEjercicios = dataGuia.ejercicios || [];
            const guiaByNombre = {};
            guiaEjercicios.forEach(e => { guiaByNombre[e.nombre] = e; });

            const user = Auth.getCurrentUser();
            const tipoCuerpo = user?.perfil?.tipoCuerpo || '';
            const tipoCuerpoLabel = { ectomorfo: 'Ectomorfo', mesomorfo: 'Mesomorfo', endomorfo: 'Endomorfo' }[tipoCuerpo] || '';

            const recEl = document.getElementById('rutinas-recomendacion');
            const el = document.getElementById('rutinas-container');
            if (!el) return;

            // Sugerir rutina según partes sin trabajar
            const inferiores = ['quads', 'glutes', 'hamstrings', 'calves'];
            const superiores = ['chest', 'back', 'shoulders', 'triceps', 'biceps'];
            const unworkedInf = unworked.some(p => inferiores.includes(p.id));
            const unworkedSup = unworked.some(p => superiores.includes(p.id));
            const unworkedAbs = unworked.some(p => p.id === 'abs');
            let suggestedRutina = null;
            const totalSessions = (ejercicios.sesiones || []).length;
            if (totalSessions < 3) suggestedRutina = rutinas.find(r => r.id === 'principiante-suave') || rutinas.find(r => r.nivel === 'principiante');
            if (!suggestedRutina && unworked.length > 0) {
                if (unworkedInf && unworkedSup) suggestedRutina = rutinas.find(r => r.id === 'rutina-completa-casa');
                else if (unworkedInf) suggestedRutina = rutinas.find(r => r.id === 'tren-inferior-guia');
                else if (unworkedSup) suggestedRutina = rutinas.find(r => r.id === 'tren-superior-guia');
                else if (unworkedAbs) suggestedRutina = rutinas.find(r => r.id === 'zona-media-guia');
                if (!suggestedRutina && rutinas.length) suggestedRutina = rutinas.find(r => r.id === 'rutina-completa-casa') || rutinas[0];
            }
            if (recEl && suggestedRutina) {
                const lineaTipoCuerpo = tipoCuerpoLabel
                    ? `<p class="text-sm mt-xs text-secondary">Según tu tipo de cuerpo (${UI.esc(tipoCuerpoLabel)}) esta rutina se ajusta a tus objetivos.</p>`
                    : '<p class="text-sm mt-xs text-secondary">Configura tu tipo de cuerpo en Perfil para recomendaciones más personalizadas.</p>';
                recEl.innerHTML = `
                    <div class="alert mb-md" style="background: rgba(129, 140, 248, 0.12); border: 1px solid var(--accent-blue); border-radius: var(--border-radius-md); padding: var(--spacing-md);">
                        <strong>Te recomendamos esta rutina</strong>
                        <p class="text-sm mt-xs text-secondary">Esta semana no has trabajado: ${unworked.map(p => p.name).join(', ')}.</p>
                        ${lineaTipoCuerpo}
                        <p class="text-sm mt-xs">${UI.esc(suggestedRutina.nombre)} — ${UI.esc(suggestedRutina.descripcion || '')}</p>
                        <button type="button" class="btn btn-primary btn-sm mt-sm btn-usar-rutina" data-rutina-id="${UI.esc(suggestedRutina.id)}">Usar esta rutina</button>
                    </div>
                `;
                const recBtn = recEl.querySelector('.btn-usar-rutina');
                if (recBtn) recBtn.addEventListener('click', () => {
                    const rutina = rutinas.find(r => r.id === recBtn.dataset.rutinaId);
                    if (rutina && rutina.ejercicios && rutina.ejercicios.length) self._showSessionModal(container, email, rutina.ejercicios);
                });
            }

            if (rutinas.length === 0) {
                el.innerHTML = '<p class="text-secondary">No hay rutinas cargadas.</p>';
                return;
            }

            const nivelFilter = document.getElementById('rutinas-nivel-filter')?.value || '';
            const filtered = nivelFilter ? rutinas.filter(r => (r.nivel || '') === nivelFilter || r.nivel === 'todos') : rutinas;

            const renderRutinas = (list) => list.map(r => {
                const nivelLabel = r.nivel === 'principiante' ? 'Principiante' : r.nivel === 'intermedio' ? 'Intermedio' : '';
                return `
                <div class="card mb-md" style="padding:var(--spacing-md);">
                    <div class="flex justify-between items-start gap-sm flex-wrap">
                        <div>
                            ${nivelLabel ? `<span class="badge badge-info" style="font-size:0.7rem; margin-right:6px;">${UI.esc(nivelLabel)}</span>` : ''}
                            <strong>${UI.esc(r.nombre)}</strong>
                            ${r.duracionAprox ? `<span class="text-secondary text-sm"> — ${UI.esc(r.duracionAprox)}</span>` : ''}
                            ${r.descripcion ? `<p class="text-secondary text-sm mt-xs">${UI.esc(r.descripcion)}</p>` : ''}
                            <p class="text-sm mt-xs">${(r.ejercicios || []).length} ejercicios</p>
                        </div>
                        <div class="flex gap-xs">
                            <button type="button" class="btn btn-ghost btn-sm btn-ver-ejercicios" data-rutina-id="${UI.esc(r.id)}">Ver ejercicios</button>
                            <button type="button" class="btn btn-primary btn-sm btn-usar-rutina" data-rutina-id="${UI.esc(r.id)}">Usar esta rutina</button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            el.innerHTML = filtered.length === 0 ? '<p class="text-secondary">No hay rutinas para este nivel.</p>' : renderRutinas(filtered);

            document.getElementById('rutinas-nivel-filter')?.addEventListener('change', () => {
                const nf = document.getElementById('rutinas-nivel-filter')?.value || '';
                const list = nf ? rutinas.filter(r => (r.nivel || '') === nf || r.nivel === 'todos') : rutinas;
                el.innerHTML = list.length === 0 ? '<p class="text-secondary">No hay rutinas para este nivel.</p>' : renderRutinas(list);
                el.querySelectorAll('.btn-usar-rutina').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const rutina = rutinas.find(r => r.id === btn.dataset.rutinaId);
                        if (rutina?.ejercicios?.length) self._showSessionModal(container, email, rutina.ejercicios);
                    });
                });
                el.querySelectorAll('.btn-ver-ejercicios').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const rutina = rutinas.find(r => r.id === btn.dataset.rutinaId);
                        if (!rutina?.ejercicios) return;
                        const items = rutina.ejercicios.map(ej => {
                            const guia = guiaByNombre[ej.nombre];
                            const imgHtml = guia?.imagen ? `<img src="${UI.esc(guia.imagen)}" alt="" style="max-width:120px;height:auto;border-radius:var(--border-radius-sm);" onerror="this.style.display='none'">` : '';
                            const parteName = self.bodyParts.find(p => p.id === ej.parte);
                            return `<div class="mb-md" style="padding:var(--spacing-sm); border-bottom:1px solid var(--border);"><div class="flex gap-md flex-wrap">${imgHtml ? `<div>${imgHtml}</div>` : ''}<div style="flex:1;min-width:180px;"><strong>${UI.esc(ej.nombre)}</strong>${parteName ? ` — ${UI.esc(parteName.name)}` : ''}<p class="text-sm mt-xs">${ej.series || 3} series × ${ej.reps || '-'} reps</p></div></div></div>`;
                        }).join('');
                        UI.showModal(`<h3 class="modal-title">${UI.esc(rutina.nombre)}</h3><div style="max-height:70vh;overflow-y:auto;">${items}</div><div class="modal-actions mt-md"><button type="button" id="btn-cerrar-ver-ej" class="btn btn-primary">Cerrar</button><button type="button" class="btn btn-secondary btn-usar-rutina-from-modal" data-rutina-id="${UI.esc(rutina.id)}">Usar esta rutina</button></div>`, { size: 'lg', onReady: () => {
                            UI.bindButton('btn-cerrar-ver-ej', () => UI.closeModal());
                            document.querySelector('.btn-usar-rutina-from-modal')?.addEventListener('click', () => { UI.closeModal(); if (rutina.ejercicios.length) self._showSessionModal(container, email, rutina.ejercicios); });
                        } });
                    });
                });
            });

            el.querySelectorAll('.btn-usar-rutina').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rutina = rutinas.find(r => r.id === btn.dataset.rutinaId);
                    if (rutina && rutina.ejercicios && rutina.ejercicios.length) self._showSessionModal(container, email, rutina.ejercicios);
                });
            });

            el.querySelectorAll('.btn-ver-ejercicios').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rutina = rutinas.find(r => r.id === btn.dataset.rutinaId);
                    if (!rutina || !rutina.ejercicios) return;
                    const items = rutina.ejercicios.map(ej => {
                        const guia = guiaByNombre[ej.nombre];
                        const imgHtml = guia && guia.imagen ? `<img src="${UI.esc(guia.imagen)}" alt="" style="max-width:120px;height:auto;border-radius:var(--border-radius-sm);" onerror="this.style.display='none'">` : '';
                        const indicHtml = guia && guia.indicaciones ? `<p class="text-secondary text-sm mt-xs">${UI.esc(guia.indicaciones)}</p>` : (ej.notas ? `<p class="text-sm mt-xs">${UI.esc(ej.notas)}</p>` : '');
                        const parteName = self.bodyParts.find(p => p.id === ej.parte);
                        return `<div class="mb-md" style="padding:var(--spacing-sm); border-bottom:1px solid var(--border);">
                            <div class="flex gap-md flex-wrap">
                                ${imgHtml ? `<div>${imgHtml}</div>` : ''}
                                <div style="flex:1;min-width:180px;">
                                    <strong>${UI.esc(ej.nombre)}</strong>
                                    ${parteName ? `<span class="text-secondary text-sm"> — ${UI.esc(parteName.name)}</span>` : ''}
                                    <p class="text-sm mt-xs">${(ej.series || 3)} series × ${ej.reps || '-'} reps</p>
                                    ${indicHtml}
                                </div>
                            </div>
                        </div>`;
                    }).join('');
                    UI.showModal(`
                        <h3 class="modal-title">${UI.esc(rutina.nombre)}</h3>
                        <div style="max-height:70vh;overflow-y:auto;">${items}</div>
                        <div class="modal-actions mt-md">
                            <button type="button" id="btn-cerrar-ver-ej" class="btn btn-primary">Cerrar</button>
                            <button type="button" class="btn btn-secondary btn-usar-rutina-from-modal" data-rutina-id="${UI.esc(rutina.id)}">Usar esta rutina</button>
                        </div>
                    `, { size: 'lg', onReady: () => {
                        UI.bindButton('btn-cerrar-ver-ej', () => UI.closeModal());
                        document.querySelector('.btn-usar-rutina-from-modal')?.addEventListener('click', () => {
                            UI.closeModal();
                            if (rutina.ejercicios.length) self._showSessionModal(container, email, rutina.ejercicios);
                        });
                    } });
                });
            });
        }).catch(() => {
            const el = document.getElementById('rutinas-container');
            if (el) el.innerHTML = '<p class="text-secondary">No se pudieron cargar las rutinas.</p>';
        });

        // Click session to view details
        container.querySelectorAll('[data-session-id]').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('[data-del-session]')) return;
                const id = item.dataset.sessionId;
                const session = ejercicios.sesiones.find(s => s.id === id);
                if (!session) return;

                UI.showModal(`
                    <h3 class="modal-title">Sesión: ${DateUtils.format(session.fecha, 'medium')}</h3>
                    <div class="mt-md">
                        ${session.ejercicios.map(e => {
                            const typeInfo = this.exerciseTypes.find(t => t.id === e.tipo) || { icon: '💪', name: e.tipo || 'General' };
                            const bp = this.bodyParts.find(p => p.id === e.parte);
                            let details = [];
                            if (e.series) details.push(`${e.series} series`);
                            if (e.reps) details.push(`${e.reps} reps`);
                            if (e.peso) details.push(`${e.peso}kg`);
                            if (e.km) details.push(`${e.km}km`);
                            if (e.tiempo) details.push(`${e.tiempo} min`);
                            if (e.calorias) details.push(`${e.calorias} cal`);
                            return `
                                <div class="finance-item">
                                    <div class="item-info">
                                        <strong>${typeInfo.icon} ${UI.esc(e.nombre)}</strong>
                                        <span class="text-secondary">${bp ? bp.name : e.parte} &middot; ${details.join(' &middot; ') || 'Sin datos'}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `, { size: 'md' });
            });
        });

        // Delete session
        container.querySelectorAll('[data-del-session]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.delSession;
                UI.confirm('¿Eliminar esta sesión?', () => {
                    const data = Storage.getUserData(email);
                    data.ejercicios.sesiones = data.ejercicios.sesiones.filter(s => s.id !== id);
                    Storage.saveUserData(email, data);
                    UI.toast('Sesión eliminada', 'success');
                    this.render(container);
                });
            });
        });

        // Click body part
        container.querySelectorAll('[data-part]').forEach(part => {
            part.addEventListener('click', () => {
                const partId = part.dataset.part;
                const bp = this.bodyParts.find(p => p.id === partId);
                if (bp) UI.toast(`${bp.name} — Click "+ Nueva Sesión" para registrar`, 'info');
            });
        });
    }
};
