/* ============================================
   SUMMARY PAGE - Enhanced Dashboard Overview
   Stats Pills | Charts Grid | Alerts
   ============================================ */

const SummaryPage = {
    render(container) {
        const email = Auth.getCurrentEmail();
        const user = Auth.getCurrentUser();
        const data = Storage.getUserData(email);
        const opts = user?.perfil?.opcionesActivas || {};
        const today = DateUtils.today();

        // Core data references
        const habits = data.habitos?.lista || [];
        const habitRec = data.habitos?.registros || {};
        const todayRec = habitRec[today] || {};
        const fin = data.finanzas || { ingresos: [], gastos: [], deudas: [] };
        const events = data.calendario?.eventos || [];
        const diario = data.diario?.entradas || [];
        const foda = data.foda || {};
        const religion = data.religion || {};
        const ejercicios = data.ejercicios?.sesiones || [];

        // Computed stats
        const habitsToday = habits.filter(h => todayRec[h.id]).length;
        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const balance = totalIncome - totalExpense;
        const pendingEvents = events.filter(e => e.fecha >= today && !e.completado).length;
        const streak = this._calcStreak(habits, habitRec, today);
        const isDesktop = document.documentElement.getAttribute('data-view') === 'desktop';
        const chartsGridStyle = isDesktop
            ? 'grid-template-columns: repeat(3, 1fr); gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);'
            : 'grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);';

        container.innerHTML = `
            ${UI.pageTitle('Resumen General', '', 'summary')}

            <!-- TOP STAT PILLS -->
            <div class="summary-pills" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:var(--spacing-sm); margin-bottom:var(--spacing-lg);">
                ${opts.habitos !== false ? `
                    <div class="card card-clickable" onclick="window.location.hash='#habits'" style="padding:var(--spacing-md); text-align:center;">
                        <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
                            <div style="width:40px; height:40px;"><canvas id="sum-pill-habits"></canvas></div>
                            <div style="text-align:left;">
                                <p style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Hábitos</p>
                                <p style="font-size:1.1rem; font-weight:700; margin:0;">${habitsToday}/${habits.length} hoy</p>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="card card-clickable" onclick="window.location.hash='#finance'" style="padding:var(--spacing-md); text-align:center;">
                    <p style="font-size:0.75rem; color:var(--text-secondary); margin:0 0 2px 0;">Finanzas</p>
                    <p style="font-size:1.1rem; font-weight:700; margin:0; color:${balance >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                        ${UI.money(balance)}
                    </p>
                </div>

                <div class="card card-clickable" onclick="window.location.hash='#calendar'" style="padding:var(--spacing-md); text-align:center;">
                    <p style="font-size:0.75rem; color:var(--text-secondary); margin:0 0 2px 0;">Eventos</p>
                    <p style="font-size:1.1rem; font-weight:700; margin:0;">${pendingEvents} pendientes</p>
                </div>

                ${opts.habitos !== false ? `
                    <div class="card" style="padding:var(--spacing-md); text-align:center;">
                        <p style="font-size:0.75rem; color:var(--text-secondary); margin:0 0 2px 0;">Racha</p>
                        <p style="font-size:1.1rem; font-weight:700; margin:0; color:#fbbf24;">
                            ${streak} día${streak !== 1 ? 's' : ''}
                        </p>
                    </div>
                ` : ''}
            </div>

            <!-- CHARTS SECTION (desktop: 3 columns; mobile: auto-fit) -->
            <div class="cards-grid summary-charts" style="${chartsGridStyle}">

                <!-- Weekly Habits Heatmap -->
                ${opts.habitos !== false ? `
                    <div class="card">
                        <h4 class="card-title mb-md">Hábitos de la Semana</h4>
                        <div id="sum-habits-heatmap" style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;"></div>
                    </div>
                ` : ''}

                <!-- Monthly Financial Trend -->
                <div class="card">
                    <h4 class="card-title mb-md">Tendencia Financiera (6 Meses)</h4>
                    <div class="chart-container" style="height:220px;"><canvas id="sum-finance-trend"></canvas></div>
                </div>

                <!-- Diary Mood Trend -->
                ${diario.length > 0 ? `
                    <div class="card">
                        <h4 class="card-title mb-md">Ánimo (Últimos 14 días)</h4>
                        <div class="chart-container" style="height:220px;"><canvas id="sum-mood-trend"></canvas></div>
                    </div>
                ` : ''}

                <!-- Exercise Sessions -->
                ${opts.ejercicios !== false ? `
                    <div class="card">
                        <h4 class="card-title mb-md">Sesiones de Ejercicio (4 Semanas)</h4>
                        <div class="chart-container" style="height:220px;"><canvas id="sum-exercise-bar"></canvas></div>
                    </div>
                ` : ''}

                <!-- Bible Reading Progress -->
                ${opts.biblia !== false ? `
                    <div class="card">
                        <h4 class="card-title mb-md">Progreso Bíblico</h4>
                        ${this._renderBibleProgress(religion)}
                    </div>
                ` : ''}

                <!-- FODA Summary -->
                ${foda && (foda.fortalezas || foda.oportunidades || foda.debilidades || foda.amenazas) ? `
                    <div class="card">
                        <h4 class="card-title mb-md">Análisis FODA</h4>
                        <div class="chart-container" style="height:220px;"><canvas id="sum-foda-bar"></canvas></div>
                    </div>
                ` : ''}
            </div>

            <!-- ALERTS SECTION -->
            <div class="card">
                <h4 class="card-title mb-md">Alertas y Pendientes</h4>
                ${this._renderAlerts(data, opts, today)}
            </div>
        `;

        // Render all charts after DOM is ready
        setTimeout(() => {
            this._renderAllCharts(data, opts, today, habits, habitRec, fin, diario, foda, religion, ejercicios);
        }, 50);
    },

    /* ==============================================
       STREAK CALCULATOR
       ============================================== */
    _calcStreak(habits, registros, today) {
        if (habits.length === 0) return 0;
        let streak = 0;
        let checkDate = today;

        // Check today first: if not all completed yet, start checking from yesterday
        const todayRec = registros[checkDate] || {};
        const todayDone = habits.every(h => todayRec[h.id]);
        if (!todayDone) {
            checkDate = DateUtils.addDays(checkDate, -1);
        }

        for (let i = 0; i < 365; i++) {
            const rec = registros[checkDate] || {};
            const allDone = habits.every(h => rec[h.id]);
            if (allDone) {
                streak++;
                checkDate = DateUtils.addDays(checkDate, -1);
            } else {
                break;
            }
        }

        return streak;
    },

    /* ==============================================
       BIBLE PROGRESS
       ============================================== */
    _renderBibleProgress(religion) {
        const read = religion.progreso?.versiculosLeidos || 0;
        const total = religion.progreso?.totalVersiculos || 31102;
        const pct = total > 0 ? Math.round((read / total) * 100) : 0;

        return `
            <div style="padding:var(--spacing-sm) 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="text-secondary" style="font-size:0.85rem;">${read.toLocaleString()} / ${total.toLocaleString()} versículos</span>
                    <span style="font-weight:700; font-size:1.1rem; color:#818cf8;">${pct}%</span>
                </div>
                <div class="progress progress-lg" style="height:12px; border-radius:6px; background:rgba(255,255,255,0.08);">
                    <div class="progress-bar" style="width:${Math.min(pct, 100)}%; background:linear-gradient(90deg, #818cf8, #a855f7); border-radius:6px; transition:width 0.5s ease;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:8px;">
                    <span class="text-secondary" style="font-size:0.75rem;">${religion.favoritos?.length || 0} versículos favoritos</span>
                    <span class="text-secondary" style="font-size:0.75rem;">${pct < 100 ? `Faltan ${(total - read).toLocaleString()}` : '¡Completado!'}</span>
                </div>
            </div>
        `;
    },

    /* ==============================================
       ALERTS
       ============================================== */
    _renderAlerts(data, opts, today) {
        const alerts = [];
        const fin = data.finanzas || { ingresos: [], gastos: [], deudas: [] };
        const habits = data.habitos?.lista || [];
        const todayRec = data.habitos?.registros?.[today] || {};
        const events = data.calendario?.eventos || [];

        // Overdue debts
        fin.deudas.forEach(d => {
            if (d.fechaVence && d.fechaVence < today) {
                alerts.push({ type: 'danger', icon: '💰', msg: `Deuda vencida: ${d.descripcion} (${UI.money(d.monto)})`, link: '#finance' });
            }
        });

        // Upcoming payments (next 7 days)
        const in7Days = DateUtils.addDays(today, 7);
        fin.deudas.forEach(d => {
            if (d.fechaVence && d.fechaVence >= today && d.fechaVence <= in7Days) {
                alerts.push({ type: 'warn', icon: '⏰', msg: `Pago próximo: ${d.descripcion} - ${DateUtils.format(d.fechaVence, 'short')}`, link: '#finance' });
            }
        });

        // Pending habits today
        const pendingH = habits.filter(h => !todayRec[h.id]).length;
        if (pendingH > 0 && opts.habitos !== false) {
            alerts.push({ type: 'warn', icon: '🎯', msg: `${pendingH} hábito(s) pendiente(s) hoy`, link: '#habits' });
        }

        // Pending events today
        const pendingEvToday = events.filter(e => e.fecha === today && !e.completado).length;
        if (pendingEvToday > 0) {
            alerts.push({ type: 'warn', icon: '📅', msg: `${pendingEvToday} evento(s) pendiente(s) hoy`, link: '#calendar' });
        }

        // Upcoming events (next 3 days)
        const in3Days = DateUtils.addDays(today, 3);
        const upcomingEv = events.filter(e => e.fecha > today && e.fecha <= in3Days && !e.completado).length;
        if (upcomingEv > 0) {
            alerts.push({ type: 'info', icon: '📋', msg: `${upcomingEv} evento(s) en los próximos 3 días`, link: '#calendar' });
        }

        if (alerts.length === 0) {
            return '<p class="text-muted text-center" style="padding:var(--spacing-lg);">Sin alertas pendientes. ¡Todo al día! ✨</p>';
        }

        return `<div style="display:flex; flex-direction:column; gap:6px;">
            ${alerts.map(a => `
                <div onclick="window.location.hash='${a.link}'" style="
                    display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; cursor:pointer;
                    background:${a.type === 'danger' ? 'rgba(244,63,94,0.1)' : a.type === 'warn' ? 'rgba(251,191,36,0.1)' : 'rgba(129,140,248,0.1)'};
                    border-left:3px solid ${a.type === 'danger' ? '#f43f5e' : a.type === 'warn' ? '#fbbf24' : '#818cf8'};
                    transition:background 0.2s;
                ">
                    <span style="font-size:1.1rem;">${a.icon}</span>
                    <span style="font-size:0.85rem;">${UI.esc(a.msg)}</span>
                </div>
            `).join('')}
        </div>`;
    },

    /* ==============================================
       CHART RENDERING
       ============================================== */
    _renderAllCharts(data, opts, today, habits, habitRec, fin, diario, foda, religion, ejercicios) {
        if (typeof Chart === 'undefined') return;

        // 1. Habits pill mini ring
        if (opts.habitos !== false) {
            const todayRec = habitRec[today] || {};
            const done = habits.filter(h => todayRec[h.id]).length;
            ChartUtils.progressRing('sum-pill-habits', done, habits.length || 1, { color: '#34d399' });
        }

        // 2. Weekly habits heatmap
        if (opts.habitos !== false) {
            this._renderHabitsHeatmap(habits, habitRec, today);
        }

        // 3. Financial trend (6 months)
        this._renderFinanceTrend(fin);

        // 4. Mood trend (14 days)
        if (diario.length > 0) {
            this._renderMoodTrend(diario, today);
        }

        // 5. Exercise bar (4 weeks)
        if (opts.ejercicios !== false) {
            this._renderExerciseBar(ejercicios, today);
        }

        // 6. FODA bar
        if (foda && (foda.fortalezas || foda.oportunidades || foda.debilidades || foda.amenazas)) {
            this._renderFodaChart(foda);
        }
    },

    _renderHabitsHeatmap(habits, registros, today) {
        const container = document.getElementById('sum-habits-heatmap');
        if (!container || habits.length === 0) return;

        // Get the current week's dates (Mon-Sun)
        const weekRange = DateUtils.getWeekRange(today);
        const startDate = weekRange.start;
        const boxes = [];

        for (let i = 0; i < 7; i++) {
            const dateStr = DateUtils.addDays(startDate, i);
            const dayRec = registros[dateStr] || {};
            const completed = habits.filter(h => dayRec[h.id]).length;
            const pct = habits.length > 0 ? (completed / habits.length) * 100 : 0;

            // Color based on completion %
            let bgColor;
            if (pct === 0) bgColor = 'rgba(255,255,255,0.06)';
            else if (pct < 33) bgColor = 'rgba(244,63,94,0.4)';
            else if (pct < 66) bgColor = 'rgba(251,191,36,0.5)';
            else if (pct < 100) bgColor = 'rgba(52,211,153,0.5)';
            else bgColor = 'rgba(52,211,153,0.85)';

            const isToday = dateStr === today;
            const dayLabel = DateUtils.DAYS_SHORT[new Date(DateUtils.fromDateStr(dateStr)).getDay()];

            boxes.push(`
                <div style="
                    display:flex; flex-direction:column; align-items:center; gap:4px;
                " title="${dateStr}: ${completed}/${habits.length}">
                    <span style="font-size:0.7rem; color:var(--text-secondary);">${dayLabel}</span>
                    <div style="
                        width:38px; height:38px; border-radius:8px;
                        background:${bgColor};
                        display:flex; align-items:center; justify-content:center;
                        font-size:0.75rem; font-weight:600;
                        ${isToday ? 'box-shadow:0 0 0 2px #818cf8;' : ''}
                    ">${completed}/${habits.length}</div>
                </div>
            `);
        }

        container.innerHTML = boxes.join('');
    },

    _renderFinanceTrend(fin) {
        const now = new Date();
        const labels = [];
        const incData = [];
        const expData = [];
        const netData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            labels.push(DateUtils.MONTHS_SHORT[m]);
            const { start, end } = DateUtils.getMonthRange(y, m);

            const mInc = fin.ingresos
                .filter(x => DateUtils.isInRange(x.fecha, start, end))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            const mExp = fin.gastos
                .filter(x => DateUtils.isInRange(x.fecha, start, end))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);

            incData.push(mInc);
            expData.push(mExp);
            netData.push(mInc - mExp);
        }

        ChartUtils.line('sum-finance-trend', labels, [
            { label: 'Ingresos', data: incData, color: '#34d399' },
            { label: 'Gastos', data: expData, color: '#f43f5e' },
            { label: 'Neto', data: netData, color: '#818cf8' }
        ]);
    },

    _renderMoodTrend(diario, today) {
        // Last 14 days of diary entries, using 'nota' as mood value (1-10 scale)
        const labels = [];
        const moodData = [];

        // Build a map of date -> nota
        const moodMap = {};
        diario.forEach(e => {
            if (e.fecha && e.nota !== undefined) {
                moodMap[e.fecha] = parseFloat(e.nota) || 0;
            }
        });

        for (let i = 13; i >= 0; i--) {
            const dateStr = DateUtils.addDays(today, -i);
            const dateObj = DateUtils.fromDateStr(dateStr);
            labels.push(`${dateObj.getDate()}/${dateObj.getMonth() + 1}`);
            moodData.push(moodMap[dateStr] !== undefined ? moodMap[dateStr] : null);
        }

        ChartUtils.line('sum-mood-trend', labels, [
            { label: 'Ánimo', data: moodData, color: '#a855f7', fill: true }
        ], { beginAtZero: true });
    },

    _renderExerciseBar(sesiones, today) {
        const labels = [];
        const sessData = [];

        for (let w = 3; w >= 0; w--) {
            const weekEnd = DateUtils.addDays(today, -w * 7);
            const weekStart = DateUtils.addDays(weekEnd, -6);
            const count = sesiones.filter(s =>
                s.fecha && DateUtils.isInRange(s.fecha, weekStart, weekEnd)
            ).length;

            if (w === 0) {
                labels.push('Esta semana');
            } else if (w === 1) {
                labels.push('Sem. pasada');
            } else {
                labels.push(`Hace ${w} sem.`);
            }
            sessData.push(count);
        }

        ChartUtils.bar('sum-exercise-bar', labels, [
            { label: 'Sesiones', data: sessData, color: '#22d3ee' }
        ]);
    },

    _renderFodaChart(foda) {
        // Calculate averages for each FODA dimension
        const calcAvg = (items) => {
            if (!items || !Array.isArray(items) || items.length === 0) return 0;
            const vals = items.map(i => {
                if (typeof i === 'object' && i.puntuacion !== undefined) return parseFloat(i.puntuacion) || 0;
                if (typeof i === 'object' && i.valor !== undefined) return parseFloat(i.valor) || 0;
                return 0;
            });
            return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        };

        const counts = {
            F: Array.isArray(foda.fortalezas) ? foda.fortalezas.length : 0,
            O: Array.isArray(foda.oportunidades) ? foda.oportunidades.length : 0,
            D: Array.isArray(foda.debilidades) ? foda.debilidades.length : 0,
            A: Array.isArray(foda.amenazas) ? foda.amenazas.length : 0
        };

        const avgF = calcAvg(foda.fortalezas);
        const avgO = calcAvg(foda.oportunidades);
        const avgD = calcAvg(foda.debilidades);
        const avgA = calcAvg(foda.amenazas);

        // If there are scoring values, show averages; otherwise show counts
        const hasScores = avgF > 0 || avgO > 0 || avgD > 0 || avgA > 0;

        if (hasScores) {
            ChartUtils.bar('sum-foda-bar',
                ['Fortalezas', 'Oportunidades', 'Debilidades', 'Amenazas'],
                [{
                    label: 'Promedio',
                    data: [avgF, avgO, avgD, avgA],
                    backgroundColor: ['#34d399', '#818cf8', '#fbbf24', '#f43f5e']
                }]
            );
        } else {
            ChartUtils.bar('sum-foda-bar',
                ['Fortalezas', 'Oportunidades', 'Debilidades', 'Amenazas'],
                [{
                    label: 'Cantidad',
                    data: [counts.F, counts.O, counts.D, counts.A],
                    backgroundColor: ['#34d399', '#818cf8', '#fbbf24', '#f43f5e']
                }]
            );
        }
    }
};
