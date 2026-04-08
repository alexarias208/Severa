/* ============================================
   CYCLE PAGE - Menstrual Cycle Tracker
   + Intimate encounter tracking for women
   ============================================ */

const CyclePage = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),

    render(container) {
        const email = Auth.getCurrentEmail();
        const user = Auth.getCurrentUser();

        if (user?.perfil?.genero !== 'mujer') {
            container.innerHTML = `
                ${UI.pageTitle('Ciclo Menstrual')}
                <div class="card text-center p-lg">
                    <p class="text-secondary">Este módulo está disponible para perfiles con género femenino.</p>
                    <p class="text-secondary mt-sm">Puedes cambiar tu género en tu perfil si lo necesitas.</p>
                </div>
            `;
            return;
        }

        const data = Storage.getUserData(email);
        const ciclo = data.ciclo || { registros: {}, duracionCiclo: 28, ultimoInicio: null, encuentros: [] };
        if (!ciclo.encuentros) ciclo.encuentros = [];

        const today = DateUtils.today();
        const monthName = DateUtils.formatMonthYear(new Date(this.currentYear, this.currentMonth));
        const daysInMonth = DateUtils.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = DateUtils.getFirstDayOfMonth(this.currentYear, this.currentMonth);

        // Calculate phases
        const phases = this._calculatePhases(ciclo, this.currentYear, this.currentMonth, daysInMonth);

        // Build encounter date map for current month
        const encountersByDate = this._getEncountersByDate(ciclo.encuentros);

        // Count encounters this month
        const monthPrefix = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
        const encountersThisMonth = (ciclo.encuentros || []).filter(e => e.fecha && e.fecha.startsWith(monthPrefix)).length;

        container.innerHTML = `
            ${UI.pageTitle('Ciclo Menstrual', '<button id="btn-cycle-settings" class="btn btn-ghost btn-sm">Configurar</button>')}

            <div class="cards-grid">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Información</span>
                    </div>
                    <p><strong>Duración ciclo:</strong> ${ciclo.duracionCiclo} días</p>
                    <p><strong>Último inicio:</strong> ${ciclo.ultimoInicio ? DateUtils.format(ciclo.ultimoInicio, 'medium') : 'No registrado'}</p>
                    ${ciclo.ultimoInicio ? `<p><strong>Próximo estimado:</strong> ${DateUtils.format(DateUtils.addDays(ciclo.ultimoInicio, ciclo.duracionCiclo), 'medium')}</p>` : ''}
                    <p><strong>Encuentros este mes:</strong> ${encountersThisMonth}</p>
                    <button id="btn-mark-start" class="btn btn-danger btn-sm mt-md">Marcar inicio de período</button>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Síntomas este mes</h4>
                    <div class="chart-container" style="height:200px;"><canvas id="chart-cycle-mood"></canvas></div>
                </div>
            </div>

            <!-- Calendar -->
            <div class="card mt-lg">
                <div class="calendar-header">
                    <div class="calendar-nav">
                        <button id="btn-cprev" class="btn btn-ghost">◀</button>
                        <h3>${monthName}</h3>
                        <button id="btn-cnext" class="btn btn-ghost">▶</button>
                    </div>
                    <div class="flex gap-sm items-center" style="flex-wrap:wrap;">
                        <span class="color-dot" style="background:#F44336;"></span><span class="text-sm">Menstruación</span>
                        <span class="color-dot" style="background:#FFC107;"></span><span class="text-sm">Ovulación</span>
                        <span class="color-dot" style="background:rgba(255,193,7,0.3);"></span><span class="text-sm">Fértil</span>
                        <span style="color:#E91E63; font-size:12px;">❤️</span><span class="text-sm">Encuentro</span>
                    </div>
                </div>
                <div class="cycle-calendar">
                    ${['L','M','X','J','V','S','D'].map(d => `<div class="mini-cal-header">${d}</div>`).join('')}
                    ${this._renderCalDays(firstDay, daysInMonth, phases, ciclo.registros, encountersByDate, today)}
                </div>
            </div>
        `;

        this._bindEvents(container, email, ciclo, phases);
        this._renderMoodChart(ciclo.registros, this.currentYear, this.currentMonth, daysInMonth);
    },

    _calculatePhases(ciclo, year, month, daysInMonth) {
        const phases = {};
        if (!ciclo.ultimoInicio) return phases;

        const startDate = DateUtils.fromDateStr(ciclo.ultimoInicio);
        const cycleLen = ciclo.duracionCiclo || 28;

        // Generate phases for several cycles
        for (let c = -3; c < 6; c++) {
            const cycleStart = new Date(startDate);
            cycleStart.setDate(startDate.getDate() + (c * cycleLen));

            // Menstruation: days 1-5
            for (let d = 0; d < 5; d++) {
                const day = new Date(cycleStart);
                day.setDate(cycleStart.getDate() + d);
                phases[DateUtils.toDateStr(day)] = 'menstruation';
            }

            // Ovulation: day 14
            const ovDay = new Date(cycleStart);
            ovDay.setDate(cycleStart.getDate() + 13);
            phases[DateUtils.toDateStr(ovDay)] = 'ovulation';

            // Fertile window: days 11-16
            for (let d = 10; d < 16; d++) {
                const day = new Date(cycleStart);
                day.setDate(cycleStart.getDate() + d);
                const ds = DateUtils.toDateStr(day);
                if (!phases[ds]) phases[ds] = 'fertile';
            }
        }
        return phases;
    },

    _getEncountersByDate(encuentros) {
        const map = {};
        (encuentros || []).forEach(enc => {
            map[enc.fecha] = true;
        });
        return map;
    },

    _renderCalDays(firstDay, daysInMonth, phases, registros, encountersByDate, today) {
        let html = '';
        const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

        for (let i = 0; i < startOffset; i++) {
            html += '<div class="cycle-day" style="opacity:0.3;"></div>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const phase = phases[ds] || '';
            const hasRecord = registros[ds];
            const hasEncounter = encountersByDate[ds];
            const isToday = ds === today;

            html += `
                <div class="cycle-day ${phase} ${isToday ? 'today' : ''}" data-date="${ds}" style="cursor:pointer; position:relative; ${hasRecord ? 'font-weight:bold;' : ''}">
                    ${d}
                    ${hasEncounter ? '<span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); font-size:9px; line-height:1;">❤️</span>' : ''}
                </div>
            `;
        }
        return html;
    },

    _renderMoodChart(registros, year, month, daysInMonth) {
        if (typeof Chart === 'undefined') return;
        const labels = [];
        const moods = [];
        const pains = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const rec = registros[ds];
            if (rec) {
                labels.push(d);
                moods.push(rec.mood || 0);
                pains.push(rec.dolor || 0);
            }
        }

        if (labels.length > 0) {
            ChartUtils.line('chart-cycle-mood', labels, [
                { label: 'Ánimo', data: moods, color: '#667eea' },
                { label: 'Dolor', data: pains, color: '#f5576c' }
            ]);
        }
    },

    _renderStarsInput(name, selected = 0) {
        let html = '<div class="stars-input" style="display:flex; gap:4px; font-size:24px; cursor:pointer;">';
        for (let i = 1; i <= 5; i++) {
            html += `<span class="star-btn" data-value="${i}" style="color:${i <= selected ? '#E91E63' : '#ccc'}; transition: color 0.15s;">★</span>`;
        }
        html += `<input type="hidden" name="${name}" id="input-${name}" value="${selected}">`;
        html += '</div>';
        return html;
    },

    _bindStarRating() {
        const starsContainer = document.querySelector('.stars-input');
        if (!starsContainer) return;

        const stars = starsContainer.querySelectorAll('.star-btn');
        const hiddenInput = starsContainer.querySelector('input[type="hidden"]');

        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.dataset.value);
                stars.forEach(s => {
                    s.style.color = parseInt(s.dataset.value) <= val ? '#E91E63' : '#ccc';
                });
            });

            star.addEventListener('click', () => {
                const val = parseInt(star.dataset.value);
                if (hiddenInput) hiddenInput.value = val;
                stars.forEach(s => {
                    s.style.color = parseInt(s.dataset.value) <= val ? '#E91E63' : '#ccc';
                });
            });
        });

        starsContainer.addEventListener('mouseleave', () => {
            const currentVal = parseInt(hiddenInput?.value) || 0;
            stars.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= currentVal ? '#E91E63' : '#ccc';
            });
        });
    },

    _bindEvents(container, email, ciclo, phases) {
        UI.bindButton('btn-cprev', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
            this.render(container);
        });

        UI.bindButton('btn-cnext', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
            this.render(container);
        });

        UI.bindButton('btn-mark-start', () => {
            const data = Storage.getUserData(email);
            data.ciclo.ultimoInicio = DateUtils.today();
            Storage.saveUserData(email, data);
            UI.toast('Inicio de período marcado', 'success');
            // Auto calendar event
            CalendarPage.addAutoEvent(email, 'Inicio de período', DateUtils.today(), 'Salud', 'ciclo');
            this.render(container);
        });

        UI.bindButton('btn-cycle-settings', () => {
            UI.showModal(`
                <h3 class="modal-title">Configurar Ciclo</h3>
                <form id="cycle-config-form">
                    ${UI.formGroup('Duración del ciclo (días)', UI.input('cc_dur', { type: 'number', value: ciclo.duracionCiclo || 28, min: 20, max: 45 }))}
                    ${UI.formGroup('Fecha último inicio', UI.input('cc_start', { type: 'date', value: ciclo.ultimoInicio || '' }))}
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            `, {
                size: 'sm',
                onReady: () => {
                    UI.bindForm('cycle-config-form', (fd) => {
                        const data = Storage.getUserData(email);
                        data.ciclo.duracionCiclo = parseInt(fd.cc_dur) || 28;
                        if (fd.cc_start) data.ciclo.ultimoInicio = fd.cc_start;
                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        UI.toast('Configuración guardada', 'success');
                        this.render(container);
                    });
                }
            });
        });

        // Click day to log symptoms + intimate encounter
        container.querySelectorAll('.cycle-day[data-date]').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                const rec = ciclo.registros[date] || {};

                // Find existing encounter for this date
                const existingEnc = (ciclo.encuentros || []).find(e => e.fecha === date);

                UI.showModal(`
                    <h3 class="modal-title">Registro: ${DateUtils.format(date, 'medium')}</h3>
                    <form id="cycle-log-form">
                        <h4 style="margin-bottom: var(--spacing-sm); color: var(--text-primary);">Síntomas</h4>
                        ${UI.formGroup('Flujo (0-5)', UI.input('cl_flujo', { type: 'number', value: rec.flujo || 0, min: 0, max: 5 }))}
                        ${UI.formGroup('Dolor (0-5)', UI.input('cl_dolor', { type: 'number', value: rec.dolor || 0, min: 0, max: 5 }))}
                        ${UI.formGroup('Ánimo (1-5)', UI.input('cl_mood', { type: 'number', value: rec.mood || 3, min: 1, max: 5 }))}
                        ${UI.formGroup('Síntomas', UI.input('cl_sintomas', { value: (rec.sintomas || []).join(', '), placeholder: 'Dolor cabeza, náuseas...' }))}

                        <hr style="margin: var(--spacing-lg) 0; border: none; border-top: 1px solid var(--border-color);">

                        <h4 style="margin-bottom: var(--spacing-sm); color: var(--text-primary);">❤️ Encuentro íntimo</h4>
                        <label class="form-check" style="margin-bottom: var(--spacing-md);">
                            <input type="checkbox" id="chk-intimate" name="cl_intimate" value="1" ${existingEnc ? 'checked' : ''}>
                            <span class="form-check-label">Relación sexual</span>
                        </label>
                        <div id="intimate-fields" style="display:${existingEnc ? 'block' : 'none'};">
                            ${UI.formGroup('Protección', `
                                <label class="form-check">
                                    <input type="checkbox" name="cl_enc_proteccion" value="1" ${existingEnc?.proteccion ? 'checked' : ''}>
                                    <span class="form-check-label">Se usó protección</span>
                                </label>
                            `)}
                            ${UI.formGroup('Calificación', this._renderStarsInput('cl_enc_calificacion', existingEnc?.calificacion || 0))}
                            ${UI.formGroup('Notas del encuentro', UI.textarea('cl_enc_notas', existingEnc?.notas || '', { placeholder: 'Notas opcionales...' }))}
                        </div>

                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                `, {
                    size: 'sm',
                    onReady: () => {
                        // Toggle intimate fields visibility
                        const chkIntimate = document.getElementById('chk-intimate');
                        const intimateFields = document.getElementById('intimate-fields');
                        if (chkIntimate && intimateFields) {
                            chkIntimate.addEventListener('change', () => {
                                intimateFields.style.display = chkIntimate.checked ? 'block' : 'none';
                            });
                        }

                        // Star rating interaction
                        this._bindStarRating();

                        UI.bindForm('cycle-log-form', (fd) => {
                            const data = Storage.getUserData(email);
                            if (!data.ciclo.encuentros) data.ciclo.encuentros = [];

                            // Save symptom record
                            data.ciclo.registros[date] = {
                                flujo: parseInt(fd.cl_flujo) || 0,
                                dolor: parseInt(fd.cl_dolor) || 0,
                                mood: parseInt(fd.cl_mood) || 3,
                                sintomas: fd.cl_sintomas ? fd.cl_sintomas.split(',').map(s => s.trim()).filter(Boolean) : []
                            };

                            // Handle intimate encounter
                            const intimateChecked = !!fd.cl_intimate;
                            const existingIdx = data.ciclo.encuentros.findIndex(e => e.fecha === date);

                            if (intimateChecked) {
                                const encEntry = {
                                    id: existingIdx >= 0 ? data.ciclo.encuentros[existingIdx].id : DateUtils.generateId(),
                                    fecha: date,
                                    hora: '',
                                    proteccion: !!fd.cl_enc_proteccion,
                                    notas: fd.cl_enc_notas || '',
                                    calificacion: parseInt(fd.cl_enc_calificacion) || 0
                                };

                                if (existingIdx >= 0) {
                                    data.ciclo.encuentros[existingIdx] = encEntry;
                                } else {
                                    data.ciclo.encuentros.push(encEntry);
                                }
                            } else {
                                // If unchecked, remove encounter for this date if it existed
                                if (existingIdx >= 0) {
                                    data.ciclo.encuentros.splice(existingIdx, 1);
                                }
                            }

                            Storage.saveUserData(email, data);
                            UI.closeModal();
                            UI.toast('Registro guardado', 'success');
                            this.render(container);
                        });
                    }
                });
            });
        });
    }
};
