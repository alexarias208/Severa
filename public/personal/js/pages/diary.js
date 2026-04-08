/* ============================================
   DIARY PAGE - Life Diary / Mood Tracker
   ============================================ */

const ACTIVIDADES_PRESETS = [
    'Ejercicio', 'Lectura', 'Trabajo', 'Estudio', 'Meditación',
    'Trabajo doméstico', 'Social', 'Descanso', 'Caminata', 'Ocio'
];

// Normaliza actividad para tendencias (evitar "ejercicio" vs "Ejercicio" vs "gym" como diferentes)
const ACTIVIDAD_SYNONYMS = {
    'ejercicio': 'Ejercicio', 'gym': 'Ejercicio', 'entrenar': 'Ejercicio', 'entrenamiento': 'Ejercicio',
    'lectura': 'Lectura', 'leer': 'Lectura', 'libro': 'Lectura',
    'trabajo': 'Trabajo', 'oficina': 'Trabajo',
    'estudio': 'Estudio', 'estudiar': 'Estudio',
    'meditacion': 'Meditación', 'meditar': 'Meditación',
    'trabajo domestico': 'Trabajo doméstico', 'quehaceres': 'Trabajo doméstico', 'limpieza': 'Trabajo doméstico',
    'social': 'Social', 'amigos': 'Social', 'familia': 'Social',
    'descanso': 'Descanso', 'descansar': 'Descanso',
    'caminata': 'Caminata', 'caminar': 'Caminata',
    'ocio': 'Ocio', 'series': 'Ocio', 'pelicula': 'Ocio', 'netflix': 'Ocio'
};

const DiaryPage = {
    _normalizeActividad(str) {
        const key = (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return ACTIVIDAD_SYNONYMS[key] || (str ? str.trim() : '');
    },

    currentTab: 'today',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedViewDate: null,
    diaryCalendarView: 'compact', // 'compact' | 'standard'
    trendsRange: 30, // 7, 30, 90
    _container: null,
    _email: null,

    render(container) {
        this._container = container;
        this._email = Auth.getCurrentEmail();
        const data = Storage.getUserData(this._email);
        if (!data.diario) data.diario = { entradas: {} };

        const entradas = data.diario.entradas || {};
        const totalEntries = Object.keys(entradas).length;

        container.innerHTML = `
            ${UI.pageTitle('Mi Diario', `<span class="text-secondary text-sm">${totalEntries} entradas</span>`)}

            <div class="tabs">
                <button class="tab-btn ${this.currentTab === 'today' ? 'active' : ''}" data-tab="today">Hoy</button>
                <button class="tab-btn ${this.currentTab === 'calendar' ? 'active' : ''}" data-tab="calendar">Calendario</button>
                <button class="tab-btn ${this.currentTab === 'trends' ? 'active' : ''}" data-tab="trends">Tendencias</button>
            </div>

            <div id="tab-today" class="tab-content ${this.currentTab === 'today' ? 'active' : ''}">
                ${this._renderToday(data)}
            </div>

            <div id="tab-calendar" class="tab-content ${this.currentTab === 'calendar' ? 'active' : ''}">
                ${this._renderCalendar(data)}
            </div>

            <div id="tab-trends" class="tab-content ${this.currentTab === 'trends' ? 'active' : ''}">
                ${this._renderTrends(data)}
            </div>
        `;

        this._bindEvents(container);
        this._renderCharts(data, this.trendsRange);
    },

    /* ==================== TAB: HOY ==================== */

    _renderToday(data) {
        const today = DateUtils.today();
        const viewDate = this.selectedViewDate || today;
        const entry = data.diario.entradas[viewDate] || null;
        const texto = entry ? entry.texto : '';
        const calificacion = entry ? entry.calificacion : '';
        const nota = entry ? entry.nota : 5;
        const actividades = entry ? (entry.actividades || []).join(', ') : '';

        return `
            <div class="card">
                <div style="display:flex; align-items:center; gap:var(--spacing-md); flex-wrap:wrap; margin-bottom:var(--spacing-md);">
                    <button id="diary-date-prev" class="btn btn-ghost btn-sm">◀</button>
                    <button id="diary-date-today" class="btn btn-ghost btn-sm" ${viewDate === today ? 'disabled' : ''}>Hoy</button>
                    <button id="diary-date-next" class="btn btn-ghost btn-sm" ${viewDate >= today ? 'disabled' : ''}>▶</button>
                    <h4 class="card-title" style="margin:0;">${DateUtils.format(viewDate, 'long')}</h4>
                </div>
                ${entry ? '<p class="text-secondary text-sm mb-md">Entrada existente. Puedes editarla.</p>' : (viewDate === today ? '' : '<p class="text-secondary text-sm mb-md">No hay entrada para este día. Puedes crear una.</p>')}
                <form id="diary-today-form">
                    ${UI.formGroup('¿Cómo fue tu día?',
                        `<textarea name="diary_texto" id="input-diary_texto" class="form-textarea" 
                            placeholder="Escribe sobre tu día, pensamientos, logros..." 
                            rows="8" style="min-height:180px; resize:vertical;">${UI.esc(texto)}</textarea>`
                    )}

                    <div class="form-group">
                        <label class="form-label">Calificación del día</label>
                        <div class="diary-rating-buttons" style="display:flex; gap:var(--spacing-md); align-items:center; flex-wrap:wrap;">
                            <button type="button" class="diary-color-btn ${calificacion === 'rojo' ? 'selected' : ''}" data-color="rojo"
                                style="width:48px; height:48px; border-radius:50%; border:3px solid transparent; background:#e74c3c; cursor:pointer; transition:all 0.2s; ${calificacion === 'rojo' ? 'border-color:#c0392b; transform:scale(1.15); box-shadow:0 0 12px rgba(231,76,60,0.5);' : ''}"
                                title="Mal día">
                            </button>
                            <span class="text-sm text-secondary">Malo</span>

                            <button type="button" class="diary-color-btn ${calificacion === 'amarillo' ? 'selected' : ''}" data-color="amarillo"
                                style="width:48px; height:48px; border-radius:50%; border:3px solid transparent; background:#f1c40f; cursor:pointer; transition:all 0.2s; ${calificacion === 'amarillo' ? 'border-color:#f39c12; transform:scale(1.15); box-shadow:0 0 12px rgba(241,196,15,0.5);' : ''}"
                                title="Día regular">
                            </button>
                            <span class="text-sm text-secondary">Regular</span>

                            <button type="button" class="diary-color-btn ${calificacion === 'verde' ? 'selected' : ''}" data-color="verde"
                                style="width:48px; height:48px; border-radius:50%; border:3px solid transparent; background:#2ecc71; cursor:pointer; transition:all 0.2s; ${calificacion === 'verde' ? 'border-color:#27ae60; transform:scale(1.15); box-shadow:0 0 12px rgba(46,204,113,0.5);' : ''}"
                                title="Buen día">
                            </button>
                            <span class="text-sm text-secondary">Bueno</span>
                        </div>
                        <input type="hidden" name="diary_calificacion" id="input-diary_calificacion" value="${UI.esc(calificacion)}">
                    </div>

                    ${UI.formGroup('Nota del día (1-10)',
                        `<div style="display:flex; align-items:center; gap:var(--spacing-md);">
                            <input type="range" name="diary_nota" id="input-diary_nota" 
                                min="1" max="10" value="${nota}" 
                                style="flex:1; accent-color:var(--primary);">
                            <span id="diary-nota-display" style="font-size:var(--font-xl); font-weight:700; min-width:32px; text-align:center;">${nota}</span>
                        </div>`
                    )}

                    <div class="form-group">
                        <label class="form-label">Actividades</label>
                        <div class="diary-actividades-presets mb-sm" style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${ACTIVIDADES_PRESETS.map(a => `
                                <button type="button" class="btn btn-ghost btn-sm diary-preset-btn" data-activity="${UI.esc(a)}">${UI.esc(a)}</button>
                            `).join('')}
                        </div>
                        <input type="text" name="diary_actividades" id="input-diary_actividades" class="form-input" 
                            placeholder="Elige de la lista o escribe (separado por comas)" 
                            value="${UI.esc(actividades)}">
                        <p class="text-secondary text-sm mt-xs">Si registras ejercicio, aparecerá automáticamente aquí.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-check">
                            <input type="checkbox" name="diary_linea_vida" id="input-diary_linea_vida" value="1">
                            <span class="form-check-label">Añadir a línea de vida (Biografía)</span>
                        </label>
                        <p class="text-secondary text-sm mt-xs">Esta entrada aparecerá en tu línea de tiempo.</p>
                    </div>

                    <div class="modal-actions" style="justify-content:flex-end; margin-top:var(--spacing-lg);">
                        <button type="submit" class="btn btn-primary">${entry ? 'Actualizar entrada' : 'Guardar entrada'}</button>
                    </div>
                </form>
            </div>
        `;
    },

    /* ==================== TAB: CALENDARIO ==================== */

    _renderCalendar(data) {
        const entradas = data.diario.entradas || {};
        const year = this.currentYear;
        const month = this.currentMonth;
        const daysInMonth = DateUtils.getDaysInMonth(year, month);
        const firstDay = DateUtils.getFirstDayOfMonth(year, month);
        const dateObj = new Date(year, month, 1);
        const today = DateUtils.today();

        // Build calendar grid
        let calendarCells = '';

        // Day headers
        DateUtils.DAYS_MIN.forEach(d => {
            calendarCells += `<div class="diary-cal-header">${d}</div>`;
        });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            calendarCells += '<div class="diary-cal-cell empty"></div>';
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = entradas[dateStr];
            const isToday = dateStr === today;
            let colorStyle = 'background:#e0e0e0;'; // gray for no entry
            let colorClass = 'no-entry';

            if (entry) {
                if (entry.calificacion === 'verde') {
                    colorStyle = 'background:#2ecc71;';
                    colorClass = 'verde';
                } else if (entry.calificacion === 'amarillo') {
                    colorStyle = 'background:#f1c40f;';
                    colorClass = 'amarillo';
                } else if (entry.calificacion === 'rojo') {
                    colorStyle = 'background:#e74c3c;';
                    colorClass = 'rojo';
                }
            }

            calendarCells += `
                <div class="diary-cal-cell ${isToday ? 'today' : ''}" data-date="${dateStr}" style="cursor:pointer;" title="${entry ? 'Nota: ' + entry.nota + '/10' : 'Sin entrada'}">
                    <span class="diary-cal-day">${day}</span>
                    <div class="diary-cal-dot" style="width:12px; height:12px; border-radius:50%; ${colorStyle} margin:2px auto 0;"></div>
                </div>
            `;
        }

        // Monthly stats
        const monthEntries = Object.entries(entradas).filter(([key]) => {
            return key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
        });
        const daysWritten = monthEntries.length;
        const avgNota = daysWritten > 0
            ? (monthEntries.reduce((s, [, e]) => s + (e.nota || 0), 0) / daysWritten).toFixed(1)
            : '—';
        const greenDays = monthEntries.filter(([, e]) => e.calificacion === 'verde').length;
        const yellowDays = monthEntries.filter(([, e]) => e.calificacion === 'amarillo').length;
        const redDays = monthEntries.filter(([, e]) => e.calificacion === 'rojo').length;

        const isCompact = this.diaryCalendarView === 'compact';
        return `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md); flex-wrap:wrap; gap:var(--spacing-sm);">
                    <button id="btn-cal-prev" class="btn btn-secondary btn-sm">&larr;</button>
                    <h4 class="card-title" style="margin:0;">${DateUtils.formatMonthYear(dateObj)}</h4>
                    <div class="flex gap-sm items-center">
                        <button id="btn-cal-view-toggle" class="btn btn-ghost btn-sm" title="Cambiar vista">${isCompact ? 'Vista estándar' : 'Vista compacta'}</button>
                        <button id="btn-cal-next" class="btn btn-secondary btn-sm">&rarr;</button>
                    </div>
                </div>

                <div class="diary-calendar-grid ${isCompact ? 'diary-calendar-compact' : ''}" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:${isCompact ? '2px' : '4px'}; text-align:center;">
                    ${calendarCells}
                </div>
            </div>

            <div class="cards-grid mt-lg">
                <div class="card text-center">
                    <p class="text-secondary">Días escritos</p>
                    <p style="font-size:var(--font-2xl); font-weight:700;">${daysWritten}</p>
                    <p class="text-muted text-sm">de ${daysInMonth} días</p>
                </div>
                <div class="card text-center">
                    <p class="text-secondary">Nota promedio</p>
                    <p style="font-size:var(--font-2xl); font-weight:700;">${avgNota}</p>
                    <p class="text-muted text-sm">de 10</p>
                </div>
                <div class="card text-center">
                    <p class="text-secondary">Estado de ánimo</p>
                    <div style="display:flex; justify-content:center; gap:var(--spacing-sm); margin-top:var(--spacing-xs);">
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:#2ecc71; display:inline-block;"></span>
                            ${greenDays}
                        </span>
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:#f1c40f; display:inline-block;"></span>
                            ${yellowDays}
                        </span>
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:#e74c3c; display:inline-block;"></span>
                            ${redDays}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    /* ==================== TAB: TENDENCIAS ==================== */

    _renderTrends(data) {
        const entradas = data.diario.entradas || {};
        const totalEntries = Object.keys(entradas).length;

        if (totalEntries === 0) {
            return `
                <div class="card">
                    ${UI.emptyState('Escribe tu primera entrada para ver tendencias.', '📊')}
                </div>
            `;
        }

        // Find most common activities on good vs bad days
        const goodActivities = {};
        const badActivities = {};

        Object.values(entradas).forEach(e => {
            const acts = e.actividades || [];
            acts.forEach(a => {
                const key = this._normalizeActividad(a) || a.trim();
                if (!key) return;
                if (e.calificacion === 'verde' || e.nota >= 7) {
                    goodActivities[key] = (goodActivities[key] || 0) + 1;
                }
                if (e.calificacion === 'rojo' || e.nota <= 4) {
                    badActivities[key] = (badActivities[key] || 0) + 1;
                }
            });
        });

        const topGood = Object.entries(goodActivities).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topBad = Object.entries(badActivities).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const today = DateUtils.today();
        const range = this.trendsRange || 30;
        const sortedDates = Object.keys(entradas).filter(d => d <= today).sort();
        let rachaVerde = 0;
        for (let i = sortedDates.length - 1; i >= 0; i--) {
            const e = entradas[sortedDates[i]];
            if (e && e.calificacion === 'verde') rachaVerde++;
            else break;
        }
        const weekStart = DateUtils.getWeekRange(today).start;
        const weekEnd = DateUtils.getWeekRange(today).end;
        const prevWeekStart = DateUtils.addDays(weekStart, -7);
        const prevWeekEnd = DateUtils.addDays(weekEnd, -7);
        let avgThisWeek = 0, countThis = 0, avgPrevWeek = 0, countPrev = 0;
        sortedDates.forEach(d => {
            const e = entradas[d];
            if (!e || e.nota == null) return;
            if (d >= weekStart && d <= weekEnd) { avgThisWeek += e.nota; countThis++; }
            if (d >= prevWeekStart && d <= prevWeekEnd) { avgPrevWeek += e.nota; countPrev++; }
        });
        avgThisWeek = countThis > 0 ? (avgThisWeek / countThis).toFixed(1) : '—';
        avgPrevWeek = countPrev > 0 ? (avgPrevWeek / countPrev).toFixed(1) : '—';

        return `
            <div class="flex justify-between items-center mb-md flex-wrap gap-sm">
                <h4 class="card-title mb-0">Rango</h4>
                <select id="trends-range-select" class="form-select" style="width:auto;">
                    <option value="7" ${range === 7 ? 'selected' : ''}>Últimos 7 días</option>
                    <option value="30" ${range === 30 ? 'selected' : ''}>Últimos 30 días</option>
                    <option value="90" ${range === 90 ? 'selected' : ''}>Últimos 90 días</option>
                </select>
            </div>

            <div class="cards-grid mb-md">
                <div class="card text-center">
                    <p class="text-secondary text-sm">Racha de días buenos</p>
                    <p style="font-size:var(--font-2xl); font-weight:700; color:#2ecc71;">${rachaVerde}</p>
                </div>
                <div class="card text-center">
                    <p class="text-secondary text-sm">Promedio esta semana</p>
                    <p style="font-size:var(--font-2xl); font-weight:700;">${avgThisWeek}</p>
                </div>
                <div class="card text-center">
                    <p class="text-secondary text-sm">Promedio semana anterior</p>
                    <p style="font-size:var(--font-2xl); font-weight:700;">${avgPrevWeek}</p>
                </div>
            </div>

            <div class="cards-grid">
                <div class="card">
                    <h4 class="card-title mb-md">Notas últimos ${range} días</h4>
                    <div class="chart-container" style="height:260px;">
                        <canvas id="diary-line-chart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Distribución de ánimo</h4>
                    <div class="chart-container" style="height:260px;">
                        <canvas id="diary-pie-chart"></canvas>
                    </div>
                </div>
            </div>

            <div class="cards-grid mt-lg">
                <div class="card">
                    <h4 class="card-title mb-md" style="color:#2ecc71;">Actividades en días buenos</h4>
                    ${topGood.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:var(--spacing-xs);">
                            ${topGood.map(([act, count]) => `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-xs) var(--spacing-sm); background:rgba(46,204,113,0.08); border-radius:var(--radius-sm);">
                                    <span>${UI.esc(act)}</span>
                                    <span class="badge" style="background:#2ecc71; color:#fff;">${count}x</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted text-sm">Sin datos suficientes</p>'}
                </div>
                <div class="card">
                    <h4 class="card-title mb-md" style="color:#e74c3c;">Actividades en días malos</h4>
                    ${topBad.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:var(--spacing-xs);">
                            ${topBad.map(([act, count]) => `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-xs) var(--spacing-sm); background:rgba(231,76,60,0.08); border-radius:var(--radius-sm);">
                                    <span>${UI.esc(act)}</span>
                                    <span class="badge" style="background:#e74c3c; color:#fff;">${count}x</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted text-sm">Sin datos suficientes</p>'}
                </div>
            </div>
        `;
    },

    /* ==================== CHARTS ==================== */

    _renderCharts(data, rangeDays) {
        if (typeof Chart === 'undefined') return;
        const entradas = data.diario.entradas || {};
        const range = rangeDays || this.trendsRange || 30;
        const today = DateUtils.today();

        // Line chart: last N days
        const lineLabels = [];
        const lineData = [];
        for (let i = range - 1; i >= 0; i--) {
            const dateStr = DateUtils.addDays(today, -i);
            const entry = entradas[dateStr];
            lineLabels.push(DateUtils.format(dateStr, 'short'));
            lineData.push(entry ? entry.nota : null);
        }

        const lineCtx = document.getElementById('diary-line-chart');
        if (lineCtx) {
            ChartUtils.line('diary-line-chart', lineLabels, [{
                label: 'Nota del día',
                data: lineData,
                color: '#667eea',
                fill: true,
                spanGaps: true
            }], { title: '' });
        }

        // Pie chart: mood distribution (over the same range)
        let green = 0, yellow = 0, red = 0;
        for (let i = 0; i < range; i++) {
            const dateStr = DateUtils.addDays(today, -i);
            const e = entradas[dateStr];
            if (!e) continue;
            if (e.calificacion === 'verde') green++;
            else if (e.calificacion === 'amarillo') yellow++;
            else if (e.calificacion === 'rojo') red++;
        }

        const pieCtx = document.getElementById('diary-pie-chart');
        if (pieCtx && green + yellow + red > 0) {
            ChartUtils.pie('diary-pie-chart',
                ['Buenos', 'Regulares', 'Malos'],
                [green, yellow, red],
                { colors: ['#2ecc71', '#f1c40f', '#e74c3c'] }
            );
        }
    },

    /* ==================== EVENTS ==================== */

    _bindEvents(container) {
        const self = this;
        const email = this._email;

        // Date navigation in "Hoy" tab
        const prevBtn = container.querySelector('#diary-date-prev');
        const nextBtn = container.querySelector('#diary-date-next');
        const todayBtn = container.querySelector('#diary-date-today');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const today = DateUtils.today();
                const base = self.selectedViewDate || today;
                self.selectedViewDate = DateUtils.addDays(base, -1);
                self.render(container);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const today = DateUtils.today();
                const base = self.selectedViewDate || today;
                if (base >= today) return;
                self.selectedViewDate = DateUtils.addDays(base, 1);
                self.render(container);
            });
        }
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                self.selectedViewDate = null;
                self.render(container);
            });
        }

        const trendsRangeSelect = container.querySelector('#trends-range-select');
        if (trendsRangeSelect) {
            trendsRangeSelect.addEventListener('change', () => {
                self.trendsRange = parseInt(trendsRangeSelect.value, 10);
                const data = Storage.getUserData(email);
                self._renderCharts(data, self.trendsRange);
            });
        }

        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                self.currentTab = btn.dataset.tab;
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById(`tab-${btn.dataset.tab}`);
                if (target) target.classList.add('active');

                // Re-render charts when switching to trends tab
                if (btn.dataset.tab === 'trends') {
                    const data = Storage.getUserData(email);
                    setTimeout(() => self._renderCharts(data, self.trendsRange), 50);
                }
                // Re-render calendar when switching to calendar tab
                if (btn.dataset.tab === 'calendar') {
                    self.render(container);
                }
            });
        });

        // Color rating buttons
        container.querySelectorAll('.diary-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                const hiddenInput = document.getElementById('input-diary_calificacion');
                if (hiddenInput) hiddenInput.value = color;

                // Visual feedback
                container.querySelectorAll('.diary-color-btn').forEach(b => {
                    b.classList.remove('selected');
                    b.style.borderColor = 'transparent';
                    b.style.transform = 'scale(1)';
                    b.style.boxShadow = 'none';
                });
                btn.classList.add('selected');
                const colors = { rojo: '#c0392b', amarillo: '#f39c12', verde: '#27ae60' };
                const glows = { rojo: 'rgba(231,76,60,0.5)', amarillo: 'rgba(241,196,15,0.5)', verde: 'rgba(46,204,113,0.5)' };
                btn.style.borderColor = colors[color];
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = `0 0 12px ${glows[color]}`;
            });
        });

        // Range slider display
        const rangeInput = document.getElementById('input-diary_nota');
        const rangeDisplay = document.getElementById('diary-nota-display');
        if (rangeInput && rangeDisplay) {
            rangeInput.addEventListener('input', () => {
                rangeDisplay.textContent = rangeInput.value;
            });
        }

        // Activity preset buttons
        container.querySelectorAll('.diary-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const inp = document.getElementById('input-diary_actividades');
                if (!inp) return;
                const act = btn.dataset.activity;
                const current = (inp.value || '').split(',').map(a => a.trim()).filter(Boolean);
                if (current.includes(act)) return;
                inp.value = current.concat(act).join(', ');
            });
        });

        // Save today's entry
        UI.bindForm('diary-today-form', (fd) => {
            const texto = fd.diary_texto || '';
            const calificacion = fd.diary_calificacion || '';
            const nota = parseInt(fd.diary_nota) || 5;
            const actividadesRaw = fd.diary_actividades || '';
            const actividadesRawList = actividadesRaw.split(',').map(a => a.trim()).filter(a => a.length > 0);
            const actividades = [...new Set(actividadesRawList.map(a => this._normalizeActividad(a) || a.trim()).filter(Boolean))];

            if (!texto.trim() && !calificacion) {
                UI.toast('Escribe algo o selecciona una calificación', 'error');
                return;
            }

            const today = DateUtils.today();
            const viewDate = self.selectedViewDate || today;
            const data = Storage.getUserData(email);
            if (!data.diario) data.diario = { entradas: {} };
            if (!data.diario.entradas) data.diario.entradas = {};

            const existing = data.diario.entradas[viewDate];
            data.diario.entradas[viewDate] = {
                texto: texto,
                calificacion: calificacion,
                nota: nota,
                actividades: actividades,
                creado: existing ? existing.creado : new Date().toISOString(),
                modificado: new Date().toISOString()
            };

            const addToLinea = document.getElementById('input-diary_linea_vida')?.checked;
            if (addToLinea) {
                if (!data.biografia) data.biografia = { eventos: [] };
                data.biografia.eventos.push({
                    id: DateUtils.generateId(),
                    fecha: viewDate,
                    tipo: 'otro',
                    titulo: (texto || 'Entrada del día').substring(0, 100),
                    descripcion: texto || undefined,
                    creado: new Date().toISOString(),
                    origen: 'diario'
                });
            }

            Storage.saveUserData(email, data);
            UI.toast(existing ? 'Entrada actualizada' : 'Entrada guardada', 'success');
            self.render(container);
        });

        // Calendar navigation
        UI.bindButton('btn-cal-prev', () => {
            self.currentMonth--;
            if (self.currentMonth < 0) {
                self.currentMonth = 11;
                self.currentYear--;
            }
            self.currentTab = 'calendar';
            self.render(container);
        });

        UI.bindButton('btn-cal-next', () => {
            self.currentMonth++;
            if (self.currentMonth > 11) {
                self.currentMonth = 0;
                self.currentYear++;
            }
            self.currentTab = 'calendar';
            self.render(container);
        });
        UI.bindButton('btn-cal-view-toggle', () => {
            self.diaryCalendarView = self.diaryCalendarView === 'compact' ? 'standard' : 'compact';
            self.currentTab = 'calendar';
            self.render(container);
        });

        // Click on calendar day
        container.querySelectorAll('.diary-cal-cell[data-date]').forEach(cell => {
            cell.addEventListener('click', () => {
                const dateStr = cell.dataset.date;
                self._showDayModal(container, email, dateStr);
            });
        });
    },

    /* ==================== DAY MODAL ==================== */

    _showDayModal(container, email, dateStr) {
        const data = Storage.getUserData(email);
        if (!data.diario) data.diario = { entradas: {} };
        const entry = data.diario.entradas[dateStr] || null;
        const self = this;

        const texto = entry ? entry.texto : '';
        const calificacion = entry ? entry.calificacion : '';
        const nota = entry ? entry.nota : 5;
        const actividades = entry ? (entry.actividades || []).join(', ') : '';

        UI.showModal(`
            <h3 class="modal-title">${DateUtils.format(dateStr, 'long')}</h3>
            <form id="diary-day-form">
                <div class="form-group">
                    <label class="form-label">Texto</label>
                    <textarea name="dm_texto" id="input-dm_texto" class="form-textarea" 
                        placeholder="¿Cómo fue este día?" rows="5">${UI.esc(texto)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Calificación</label>
                    <div style="display:flex; gap:var(--spacing-md); align-items:center;">
                        <button type="button" class="dm-color-btn" data-color="rojo"
                            style="width:40px; height:40px; border-radius:50%; border:3px solid ${calificacion === 'rojo' ? '#c0392b' : 'transparent'}; background:#e74c3c; cursor:pointer; transition:all 0.2s; ${calificacion === 'rojo' ? 'transform:scale(1.15);' : ''}">
                        </button>
                        <button type="button" class="dm-color-btn" data-color="amarillo"
                            style="width:40px; height:40px; border-radius:50%; border:3px solid ${calificacion === 'amarillo' ? '#f39c12' : 'transparent'}; background:#f1c40f; cursor:pointer; transition:all 0.2s; ${calificacion === 'amarillo' ? 'transform:scale(1.15);' : ''}">
                        </button>
                        <button type="button" class="dm-color-btn" data-color="verde"
                            style="width:40px; height:40px; border-radius:50%; border:3px solid ${calificacion === 'verde' ? '#27ae60' : 'transparent'}; background:#2ecc71; cursor:pointer; transition:all 0.2s; ${calificacion === 'verde' ? 'transform:scale(1.15);' : ''}">
                        </button>
                    </div>
                    <input type="hidden" name="dm_calificacion" id="input-dm_calificacion" value="${UI.esc(calificacion)}">
                </div>

                <div class="form-group">
                    <label class="form-label">Nota (1-10)</label>
                    <div style="display:flex; align-items:center; gap:var(--spacing-md);">
                        <input type="range" name="dm_nota" id="input-dm_nota" min="1" max="10" value="${nota}" style="flex:1; accent-color:var(--primary);">
                        <span id="dm-nota-display" style="font-size:var(--font-xl); font-weight:700; min-width:28px; text-align:center;">${nota}</span>
                    </div>
                </div>

                ${UI.formGroup('Actividades', UI.input('dm_actividades', {
                    placeholder: 'Ej: ejercicio, lectura...',
                    value: actividades
                }), 'Separa con comas')}

                <div class="form-group">
                    <label class="form-check">
                        <input type="checkbox" name="dm_linea_vida" id="input-dm_linea_vida" value="1">
                        <span class="form-check-label">Añadir a línea de vida (Biografía)</span>
                    </label>
                </div>

                <div class="modal-actions">
                    ${entry ? '<button type="button" id="btn-dm-delete" class="btn btn-danger">Eliminar</button>' : ''}
                    <button type="button" id="btn-dm-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            onReady: () => {
                // Color buttons in modal
                document.querySelectorAll('.dm-color-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const color = btn.dataset.color;
                        const hidden = document.getElementById('input-dm_calificacion');
                        if (hidden) hidden.value = color;

                        document.querySelectorAll('.dm-color-btn').forEach(b => {
                            b.style.borderColor = 'transparent';
                            b.style.transform = 'scale(1)';
                        });
                        const colors = { rojo: '#c0392b', amarillo: '#f39c12', verde: '#27ae60' };
                        btn.style.borderColor = colors[color];
                        btn.style.transform = 'scale(1.15)';
                    });
                });

                // Nota slider in modal
                const rangeInput = document.getElementById('input-dm_nota');
                const rangeDisplay = document.getElementById('dm-nota-display');
                if (rangeInput && rangeDisplay) {
                    rangeInput.addEventListener('input', () => {
                        rangeDisplay.textContent = rangeInput.value;
                    });
                }

                // Cancel
                UI.bindButton('btn-dm-cancel', () => UI.closeModal());

                // Delete
                if (entry) {
                    UI.bindButton('btn-dm-delete', () => {
                        UI.confirm('¿Eliminar esta entrada?', () => {
                            const d = Storage.getUserData(email);
                            if (d.diario && d.diario.entradas) {
                                delete d.diario.entradas[dateStr];
                            }
                            Storage.saveUserData(email, d);
                            UI.closeModal();
                            UI.toast('Entrada eliminada', 'success');
                            self.currentTab = 'calendar';
                            self.render(container);
                        });
                    });
                }

                // Save
                UI.bindForm('diary-day-form', (fd) => {
                    const textoVal = fd.dm_texto || '';
                    const califVal = fd.dm_calificacion || '';
                    const notaVal = parseInt(fd.dm_nota) || 5;
                    const actRaw = fd.dm_actividades || '';
                    const acts = actRaw.split(',').map(a => a.trim()).filter(a => a.length > 0);

                    if (!textoVal.trim() && !califVal) {
                        UI.toast('Escribe algo o selecciona una calificación', 'error');
                        return;
                    }

                    const d = Storage.getUserData(email);
                    if (!d.diario) d.diario = { entradas: {} };
                    if (!d.diario.entradas) d.diario.entradas = {};

                    const existingEntry = d.diario.entradas[dateStr];
                    d.diario.entradas[dateStr] = {
                        texto: textoVal,
                        calificacion: califVal,
                        nota: notaVal,
                        actividades: acts,
                        creado: existingEntry ? existingEntry.creado : new Date().toISOString(),
                        modificado: new Date().toISOString()
                    };

                    const addToLinea = document.getElementById('input-dm_linea_vida')?.checked;
                    if (addToLinea) {
                        if (!d.biografia) d.biografia = { eventos: [] };
                        d.biografia.eventos.push({
                            id: DateUtils.generateId(),
                            fecha: dateStr,
                            tipo: 'otro',
                            titulo: (textoVal || 'Entrada del día').substring(0, 100),
                            descripcion: textoVal || undefined,
                            creado: new Date().toISOString(),
                            origen: 'diario'
                        });
                    }

                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast('Entrada guardada', 'success');
                    self.currentTab = 'calendar';
                    self.render(container);
                });
            }
        });
    }
};
