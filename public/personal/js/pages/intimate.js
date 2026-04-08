/* ============================================
   INTIMATE PAGE - Registro Íntimo (non-female users)
   ============================================ */

const IntimatePage = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),

    render(container) {
        const email = Auth.getCurrentEmail();
        const user = Auth.getCurrentUser();

        // This module is for users who are NOT women (women use the cycle module)
        if (user?.perfil?.genero === 'mujer') {
            container.innerHTML = `
                ${UI.pageTitle('Registro Íntimo')}
                <div class="card text-center p-lg">
                    <p class="text-secondary">Este módulo no está disponible para tu perfil.</p>
                    <p class="text-secondary mt-sm">Puedes registrar encuentros íntimos desde el módulo de Ciclo Menstrual.</p>
                </div>
            `;
            return;
        }

        const data = Storage.getUserData(email);
        if (!data.registroIntimo) data.registroIntimo = { encuentros: [] };
        const encuentros = data.registroIntimo.encuentros || [];

        const today = DateUtils.today();
        const monthName = DateUtils.formatMonthYear(new Date(this.currentYear, this.currentMonth));
        const daysInMonth = DateUtils.getDaysInMonth(this.currentYear, this.currentMonth);
        const firstDay = DateUtils.getFirstDayOfMonth(this.currentYear, this.currentMonth);

        // Build encounter date map for current month
        const encountersByDate = this._getEncountersByDate(encuentros);

        // Stats
        const monthStats = this._getMonthStats(encuentros, this.currentYear, this.currentMonth);
        const yearStats = this._getYearStats(encuentros, this.currentYear);
        const protectionPct = this._getProtectionPct(encuentros);
        const last6Months = this._getLast6MonthsData(encuentros);

        container.innerHTML = `
            ${UI.pageTitle('Registro Íntimo', '<button id="btn-add-encounter" class="btn btn-primary btn-sm">+ Nuevo registro</button>')}

            <!-- Stats Cards -->
            <div class="cards-grid">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Estadísticas</span>
                    </div>
                    <div class="stats-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                        <div class="text-center">
                            <div style="font-size: var(--font-2xl); font-weight: 700; color: var(--color-primary);">${monthStats.total}</div>
                            <div class="text-secondary text-sm">Este mes</div>
                        </div>
                        <div class="text-center">
                            <div style="font-size: var(--font-2xl); font-weight: 700; color: var(--color-primary);">${yearStats.total}</div>
                            <div class="text-secondary text-sm">Este año</div>
                        </div>
                        <div class="text-center">
                            <div style="font-size: var(--font-2xl); font-weight: 700; color: var(--color-success);">${protectionPct}%</div>
                            <div class="text-secondary text-sm">Con protección</div>
                        </div>
                        <div class="text-center">
                            <div style="font-size: var(--font-2xl); font-weight: 700; color: var(--color-warning);">${this._getAvgRating(encuentros)}</div>
                            <div class="text-secondary text-sm">Calificación prom.</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Frecuencia (últimos 6 meses)</h4>
                    <div class="chart-container" style="height:200px;"><canvas id="chart-intimate-freq"></canvas></div>
                </div>
            </div>

            <!-- Registros recientes primero (más protagonismo) -->
            <div class="card mt-lg">
                <div class="card-header">
                    <span class="card-title">Registros recientes</span>
                </div>
                ${this._renderEncounterList(encuentros)}
            </div>

            <!-- Calendario compacto -->
            <div class="card mt-lg intimate-calendar-card">
                <div class="calendar-header" style="margin-bottom:var(--spacing-sm);">
                    <div class="calendar-nav" style="gap:var(--spacing-xs);">
                        <button id="btn-int-prev" class="btn btn-ghost btn-sm">◀</button>
                        <h4 class="card-title mb-0" style="font-size:1rem;">${monthName}</h4>
                        <button id="btn-int-next" class="btn btn-ghost btn-sm">▶</button>
                    </div>
                    <span class="text-secondary text-sm">❤️ = registro</span>
                </div>
                <div class="cycle-calendar cycle-calendar-compact">
                    ${['L','M','X','J','V','S','D'].map(d => `<div class="mini-cal-header">${d}</div>`).join('')}
                    ${this._renderCalDays(firstDay, daysInMonth, encountersByDate, today)}
                </div>
            </div>
        `;

        this._bindEvents(container, email, encuentros);
        this._renderFrequencyChart(last6Months);
    },

    // ==================== Calendar Rendering ====================

    _renderCalDays(firstDay, daysInMonth, encountersByDate, today) {
        let html = '';
        const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

        for (let i = 0; i < startOffset; i++) {
            html += '<div class="cycle-day" style="opacity:0.3;"></div>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const hasEncounter = encountersByDate[ds];
            const isToday = ds === today;

            html += `
                <div class="cycle-day ${isToday ? 'today' : ''}" data-date="${ds}" style="cursor:pointer; position:relative;">
                    ${d}
                    ${hasEncounter ? '<span style="position:absolute; bottom:2px; left:50%; transform:translateX(-50%); font-size:10px; line-height:1;">❤️</span>' : ''}
                </div>
            `;
        }
        return html;
    },

    // ==================== Encounter List ====================

    _renderEncounterList(encuentros) {
        if (!encuentros || encuentros.length === 0) {
            return UI.emptyState('No hay registros aún. Presiona "+ Nuevo registro" para comenzar.', '❤️');
        }

        // Sort by date descending, show last 20
        const sorted = [...encuentros].sort((a, b) => {
            if (b.fecha !== a.fecha) return b.fecha.localeCompare(a.fecha);
            return (b.hora || '').localeCompare(a.hora || '');
        });
        const recent = sorted.slice(0, 20);

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Calificación</th>
                            <th>Protección</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recent.map(enc => `
                            <tr class="clickable-row" data-enc-id="${enc.id}" style="cursor:pointer;">
                                <td>${DateUtils.format(enc.fecha, 'short')}</td>
                                <td>${enc.hora || '-'}</td>
                                <td>${this._renderStars(enc.calificacion || 0)}</td>
                                <td>
                                    <span class="badge ${enc.proteccion ? 'badge-success' : 'badge-warning'}">
                                        ${enc.proteccion ? 'Sí' : 'No'}
                                    </span>
                                </td>
                                <td class="text-secondary text-sm">${UI.esc((enc.notas || '').substring(0, 40))}${(enc.notas || '').length > 40 ? '...' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    _renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += `<span style="color:${i <= rating ? '#E91E63' : '#ccc'}; font-size:14px;">★</span>`;
        }
        return html;
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

    // ==================== Statistics ====================

    _getEncountersByDate(encuentros) {
        const map = {};
        (encuentros || []).forEach(enc => {
            map[enc.fecha] = true;
        });
        return map;
    },

    _getMonthStats(encuentros, year, month) {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const filtered = (encuentros || []).filter(e => e.fecha && e.fecha.startsWith(prefix));
        return { total: filtered.length };
    },

    _getYearStats(encuentros, year) {
        const prefix = `${year}-`;
        const filtered = (encuentros || []).filter(e => e.fecha && e.fecha.startsWith(prefix));
        return { total: filtered.length };
    },

    _getProtectionPct(encuentros) {
        if (!encuentros || encuentros.length === 0) return 0;
        const withProtection = encuentros.filter(e => e.proteccion).length;
        return Math.round((withProtection / encuentros.length) * 100);
    },

    _getAvgRating(encuentros) {
        if (!encuentros || encuentros.length === 0) return '-';
        const rated = encuentros.filter(e => e.calificacion && e.calificacion > 0);
        if (rated.length === 0) return '-';
        const avg = rated.reduce((sum, e) => sum + e.calificacion, 0) / rated.length;
        return avg.toFixed(1);
    },

    _getLast6MonthsData(encuentros) {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = DateUtils.MONTHS_SHORT[d.getMonth()];
            const count = (encuentros || []).filter(e => e.fecha && e.fecha.startsWith(prefix)).length;
            months.push({ label, count });
        }
        return months;
    },

    // ==================== Chart ====================

    _renderFrequencyChart(last6Months) {
        if (typeof Chart === 'undefined') return;
        const labels = last6Months.map(m => m.label);
        const data = last6Months.map(m => m.count);

        ChartUtils.bar('chart-intimate-freq', labels, [
            { label: 'Encuentros', data, color: '#E91E63' }
        ]);
    },

    // ==================== Event Binding ====================

    _bindEvents(container, email, encuentros) {
        // Month navigation
        UI.bindButton('btn-int-prev', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
            this.render(container);
        });

        UI.bindButton('btn-int-next', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
            this.render(container);
        });

        // Add encounter button
        UI.bindButton('btn-add-encounter', () => {
            this._showEncounterModal(container, email, null);
        });

        // Click on calendar day to add encounter for that date
        container.querySelectorAll('.cycle-day[data-date]').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                this._showEncounterModal(container, email, null, date);
            });
        });

        // Click on encounter row to edit
        container.querySelectorAll('.clickable-row[data-enc-id]').forEach(row => {
            row.addEventListener('click', () => {
                const encId = row.dataset.encId;
                const enc = encuentros.find(e => e.id === encId);
                if (enc) {
                    this._showEncounterModal(container, email, enc);
                }
            });
        });
    },

    // ==================== Encounter Modal ====================

    _showEncounterModal(container, email, existingEnc, prefillDate) {
        const isEdit = !!existingEnc;
        const enc = existingEnc || {};
        const defaultDate = prefillDate || enc.fecha || DateUtils.today();

        UI.showModal(`
            <h3 class="modal-title">${isEdit ? 'Editar Registro' : 'Nuevo Registro Íntimo'}</h3>
            <form id="encounter-form">
                <div class="form-row">
                    ${UI.formGroup('Fecha', UI.input('enc_fecha', { type: 'date', value: defaultDate, required: true }))}
                    ${UI.formGroup('Hora', UI.input('enc_hora', { type: 'time', value: enc.hora || '' }))}
                </div>
                ${UI.formGroup('Protección', `
                    <label class="form-check">
                        <input type="checkbox" name="enc_proteccion" value="1" ${enc.proteccion ? 'checked' : ''}>
                        <span class="form-check-label">Se usó protección</span>
                    </label>
                `)}
                ${UI.formGroup('Calificación', this._renderStarsInput('enc_calificacion', enc.calificacion || 0))}
                ${UI.formGroup('Notas', UI.textarea('enc_notas', enc.notas || '', { placeholder: 'Notas opcionales...' }))}
                <div class="modal-actions">
                    ${isEdit ? '<button type="button" id="btn-enc-delete" class="btn btn-danger">Eliminar</button>' : ''}
                    <button type="button" id="btn-enc-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                // Star rating interaction
                this._bindStarRating();

                UI.bindButton('btn-enc-cancel', () => UI.closeModal());

                // Delete
                if (isEdit) {
                    UI.bindButton('btn-enc-delete', () => {
                        UI.confirm('¿Eliminar este registro?', () => {
                            const data = Storage.getUserData(email);
                            if (!data.registroIntimo) data.registroIntimo = { encuentros: [] };
                            data.registroIntimo.encuentros = data.registroIntimo.encuentros.filter(e => e.id !== existingEnc.id);
                            Storage.saveUserData(email, data);
                            UI.closeModal();
                            UI.toast('Registro eliminado', 'success');
                            this.render(container);
                        });
                    });
                }

                // Save
                UI.bindForm('encounter-form', (fd) => {
                    const data = Storage.getUserData(email);
                    if (!data.registroIntimo) data.registroIntimo = { encuentros: [] };

                    const entry = {
                        id: isEdit ? existingEnc.id : DateUtils.generateId(),
                        fecha: fd.enc_fecha || DateUtils.today(),
                        hora: fd.enc_hora || '',
                        proteccion: !!fd.enc_proteccion,
                        notas: fd.enc_notas || '',
                        calificacion: parseInt(fd.enc_calificacion) || 0
                    };

                    if (isEdit) {
                        const idx = data.registroIntimo.encuentros.findIndex(e => e.id === existingEnc.id);
                        if (idx >= 0) {
                            data.registroIntimo.encuentros[idx] = entry;
                        }
                    } else {
                        data.registroIntimo.encuentros.push(entry);
                    }

                    Storage.saveUserData(email, data);
                    UI.closeModal();
                    UI.toast(isEdit ? 'Registro actualizado' : 'Registro guardado', 'success');
                    this.render(container);
                });
            }
        });
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
    }
};
