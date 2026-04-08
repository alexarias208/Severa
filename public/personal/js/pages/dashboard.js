/* ============================================
   DASHBOARD - Central Hub (Reference-style)
   Single-page dashboard with tools grid
   ============================================ */

// Biblioteca de frases motivadoras/realistas, cercanas (hopecore), sin citas de autor
const Motivational = {
    phrases: [
        "Hoy no tiene que ser perfecto, solo tiene que ser tuyo.",
        "Un paso al día basta.",
        "Está bien avanzar lento si no te detienes.",
        "Tu cuerpo y tu mente te están llevando hasta aquí. Confía un poco más.",
        "No hace falta tener todo resuelto para estar bien hoy.",
        "Algo que hiciste ayer te trajo hasta aquí. Eso cuenta.",
        "Los días malos también pasan. Los buenos también. Vive este.",
        "No tienes que ser productivo para merecer descansar.",
        "Pequeños cambios siguen siendo cambios.",
        "Hoy puedes elegir una cosa que te acerque a quien quieres ser.",
        "No todo tiene que salir bien para que el día valga la pena.",
        "Respira. Ya llevas mucho hecho.",
        "Tu versión de hoy es suficiente.",
        "A veces el logro es simplemente haber intentado.",
        "El progreso no es lineal. Un día bajo no borra lo que ya construiste.",
        "Cada día que te levantas y sigues ya es un triunfo.",
        "No compares tu capítulo 5 con el capítulo 20 de nadie.",
        "Hoy puedes ser un poco más amable contigo.",
        "Las rachas se construyen de a un día.",
        "No hace falta motivación; hace falta dar el primer paso.",
        "Tu futuro se escribe con lo que haces hoy, pero hoy no tiene que ser perfecto.",
        "A veces la meta es solo llegar al final del día. Y está bien.",
        "Confía en el proceso aunque no veas el resultado aún.",
        "Lo que haces por ti mismo cuenta más de lo que crees.",
        "Un día a la vez no es poco; es la única manera.",
    ],
    getDaily() {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return { text: this.phrases[dayOfYear % this.phrases.length], author: "" };
    },
    getByProgress(pct) {
        if (pct >= 100) return { text: "Día cerrado. Descansa y mañana seguimos.", author: "" };
        if (pct >= 75) return { text: "Casi terminas. El cierre del día se siente bien.", author: "" };
        if (pct >= 50) return { text: "Vas por la mitad. Sigue a tu ritmo.", author: "" };
        return this.getDaily();
    }
};

const DashboardPage = {
    selectedViewDate: null,

    render(container) {
        const email = Auth.getCurrentEmail();
        const user = Auth.getCurrentUser();
        const data = Storage.getUserData(email);
        const today = DateUtils.today();
        const viewDate = this.selectedViewDate || today;
        const opts = user?.perfil?.opcionesActivas || {};
        const isManager = user?.rol === 'manager';

        if (typeof PrioritiesSync !== 'undefined') {
            if (PrioritiesSync.ensureEstudiosPriorities(data, viewDate)) {
                Storage.saveUserData(email, data);
            }
        }

        // Habits
        const todayHabits = data.habitos?.lista || [];
        const todayHabitRecords = data.habitos?.registros?.[viewDate] || {};
        const completedHabits = todayHabits.filter(h => todayHabitRecords[h.id]);
        const habitPct = todayHabits.length > 0 ? Math.round((completedHabits.length / todayHabits.length) * 100) : 0;

        // Prioridades del día (por fecha); eventos de estudios vinculados no duplican barra de progreso
        const prioritiesForDay = (data.prioridadesDia || []).filter(p => p.fecha === viewDate);
        const linkedEventIds = new Set(prioritiesForDay.filter(p => p.eventoId).map(p => p.eventoId));
        const todayEventsForPct = (data.calendario?.eventos || []).filter(
            e => e.fecha === viewDate && !(e.moduloOrigen === 'estudios' && linkedEventIds.has(e.id))
        );
        const completedPriorities = prioritiesForDay.filter(p => p.completado).length;
        const completedActivities = todayEventsForPct.filter(e => e.completado).length;
        const totalTasks = prioritiesForDay.length + todayHabits.length + todayEventsForPct.length;
        const completedTasks = completedPriorities + completedHabits.length + completedActivities;
        const dayPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Motivational phrase
        const phrase = Motivational.getByProgress(dayPct);

        // Actividades del día = eventos del calendario para la fecha seleccionada
        const todayEvents = (data.calendario?.eventos || []).filter(e => e.fecha === viewDate);
        // Medicación del día (eventos de salud / recordatorios de medicamentos)
        const todayMedication = todayEvents.filter(e => e.moduloOrigen === 'salud' || (e.titulo || '').startsWith('💊'));
        // Clases y pruebas (eventos de estudios)
        const todayEstudios = todayEvents.filter(e => e.moduloOrigen === 'estudios');

        container.innerHTML = `
            <div class="dash-board">
            ${Auth.isManagerViewMode() ? `
                <div class="alert alert-info mb-md" style="text-align:center; grid-column:1/-1;">
                    Modo vista (solo lectura)
                    <button id="btn-return-manager" class="btn btn-secondary btn-sm" style="margin-left:12px;">Volver a Manager</button>
                </div>
            ` : ''}

            <!-- Navegación por fecha -->
            <div class="dash-section dash-date-nav" style="display:flex; align-items:center; gap:var(--spacing-md); flex-wrap:wrap;">
                <button id="dash-date-prev" class="btn btn-ghost btn-sm" title="Día anterior">◀</button>
                <button id="dash-date-today" class="btn btn-ghost btn-sm" ${viewDate === today ? 'disabled' : ''}>Hoy</button>
                <button id="dash-date-next" class="btn btn-ghost btn-sm" title="Día siguiente">▶</button>
                <span class="text-secondary text-sm">${DateUtils.format(viewDate, 'long')}</span>
                ${typeof Help !== 'undefined' ? Help.button('dashboard') : ''}
            </div>

            <!-- Fecha y saludo (presentación: fecha primero) -->
            <div class="dash-section dash-greeting">
                <p class="dash-greeting-date">${viewDate === today ? this._formatFullDate() : DateUtils.format(viewDate, 'long')}</p>
                <h1 class="dash-greeting-text">${this._getGreeting()}, <span class="dash-greeting-name">${UI.esc(user?.perfil?.nombre || 'Usuario')}</span></h1>
            </div>

            <!-- Fila KPI (solo visible en escritorio, estilo ERP) -->
            <div class="dash-erp-kpi">
                <a href="#dashboard" class="dash-kpi-card">
                    <span class="dash-kpi-value" id="dash-kpi-progress">${dayPct}%</span>
                    <span class="dash-kpi-label">Progreso del día</span>
                </a>
                <div class="dash-kpi-card">
                    <span class="dash-kpi-value">${todayEvents.length}</span>
                    <span class="dash-kpi-label">Actividades hoy</span>
                </div>
                <div class="dash-kpi-card">
                    <span class="dash-kpi-value">${completedHabits.length}/${todayHabits.length || '-'}</span>
                    <span class="dash-kpi-label">Hábitos</span>
                </div>
                <a href="#finance" class="dash-kpi-card">
                    <span class="dash-kpi-value" id="dash-kpi-balance">—</span>
                    <span class="dash-kpi-label">Balance mes</span>
                </a>
            </div>

            <!-- Actividades del día (desde calendario) -->
            <div class="dash-section dash-focus">
                <label class="dash-focus-label">Actividades del Día ${viewDate !== today ? '(' + DateUtils.format(viewDate, 'short') + ')' : ''}</label>
                ${todayMedication.length > 0 ? `
                    <div class="dash-tomar-hoy mb-sm">
                        <span class="text-secondary text-sm" style="font-weight:600;">💊 Tomar hoy</span>
                        <ul class="dash-activities-list" style="margin:6px 0 0 0;">
                            ${todayMedication.map(e => `
                                <li class="dash-activity ${e.completado ? 'done' : ''}" data-event-id="${e.id}">
                                    <input type="checkbox" class="dash-activity-check" data-event-id="${e.id}" ${e.completado ? 'checked' : ''} title="Marcar como tomado">
                                    <span class="dash-activity-text">${UI.esc(e.titulo)}${e.hora ? ' · ' + UI.esc(e.hora) : ''}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${todayEstudios.length > 0 ? `
                    <div class="dash-estudios-hoy mb-sm">
                        <span class="text-secondary text-sm" style="font-weight:600;">📚 Clases / Pruebas hoy</span>
                        <ul class="dash-activities-list" style="margin:6px 0 0 0;">
                            ${todayEstudios.map(e => `
                                <li class="dash-activity ${e.completado ? 'done' : ''}" data-event-id="${e.id}">
                                    <input type="checkbox" class="dash-activity-check" data-event-id="${e.id}" ${e.completado ? 'checked' : ''} title="Marcar como realizado">
                                    <span class="dash-activity-text">${UI.esc(e.titulo)}${e.hora ? ' · ' + UI.esc(e.hora) : ''}</span>
                                </li>
                            `).join('')}
                        </ul>
                        <p class="text-xs text-secondary mt-xs"><a href="#studies" style="color:var(--accent-blue);">Estudios</a></p>
                    </div>
                ` : ''}
                ${(function(){
                    const otrosEventos = todayEvents.filter(e => e.moduloOrigen !== 'salud' && e.moduloOrigen !== 'estudios' && !(e.titulo || '').startsWith('💊'));
                    return otrosEventos.length > 0 ? `
                    <ul class="dash-activities-list" id="dash-activities-list">
                        ${otrosEventos.map(e => `
                            <li class="dash-activity ${e.completado ? 'done' : ''}" data-event-id="${e.id}">
                                <input type="checkbox" class="dash-activity-check" data-event-id="${e.id}" ${e.completado ? 'checked' : ''} title="Marcar como realizado">
                                <span class="dash-activity-text">${UI.esc(e.titulo)}${e.hora ? ' · ' + UI.esc(e.hora) : ''}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <p class="text-sm text-secondary mt-sm"><a href="#calendar" style="color:var(--accent-blue);">Ver calendario</a> para agregar o editar</p>
                ` : (todayMedication.length === 0 && todayEstudios.length === 0) ? `
                    <p class="text-secondary">No hay actividades registradas para esta fecha en el calendario.</p>
                    <p class="text-sm mt-sm"><a href="#calendar" style="color:var(--accent-blue);">Agregar en Calendario</a></p>
                ` : '<p class="text-sm mt-sm"><a href="#calendar" style="color:var(--accent-blue);">Ver calendario</a></p>';
                })()}
            </div>

            <!-- Resumen rápido: finanzas del mes + próximos eventos -->
            <div class="dash-section dash-resumen-rapido" style="display:grid; grid-template-columns: 1fr; gap: var(--spacing-lg); align-items: start;">
                <div class="card" style="padding: var(--spacing-md);">
                    <h3 class="dash-section-title" style="margin: 0 0 var(--spacing-sm); font-size: 1rem;"><a href="#finance" style="color: inherit; text-decoration: none;">💰 Resumen finanzas (mes)</a></h3>
                    <div id="dash-mini-finance" style="min-height: 100px;"></div>
                    <p class="text-sm text-secondary mt-sm"><a href="#finance">Ver finanzas</a></p>
                </div>
                <div class="card" style="padding: var(--spacing-md);">
                    <h3 class="dash-section-title" style="margin: 0 0 var(--spacing-sm); font-size: 1rem;"><a href="#calendar" style="color: inherit; text-decoration: none;">📅 Próximos días</a></h3>
                    <div id="dash-mini-calendar" style="min-height: 80px;"></div>
                    <p class="text-sm text-secondary mt-sm"><a href="#calendar">Ver calendario</a></p>
                </div>
                ${opts.gratitud !== false ? `
                <div class="card" style="padding: var(--spacing-md);">
                    <h3 class="dash-section-title" style="margin: 0 0 var(--spacing-sm); font-size: 1rem;"><a href="#gratitud" style="color: inherit; text-decoration: none;">🙏 Hoy agradezco</a></h3>
                    <div id="dash-widget-gratitud">
                        ${(function(){
                            const entradas = ((data.gratitud || {}).entradas || []).slice().sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));
                            const ultimas = entradas.slice(0, 5);
                            if (ultimas.length === 0) return '<p class="text-secondary text-sm" style="margin:0 0 8px;">Aún no hay entradas.</p>';
                            return '<ul class="dash-gratitud-list" style="margin:0; padding-left:1.2rem; font-size:0.9rem;">' + ultimas.map(e => '<li style="margin-bottom:4px;">' + UI.esc((e.texto||'').substring(0, 60)) + ((e.texto||'').length > 60 ? '…' : '') + '</li>').join('') + '</ul>';
                        })()}
                    </div>
                    <div class="dash-gratitud-presets mt-xs mb-sm" style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${['Mi familia', 'Salud', 'Un techo', 'Este día'].map(t => `<button type="button" class="btn btn-ghost btn-sm dash-gratitud-preset" style="padding:4px 8px; font-size:0.8rem;" data-texto="${UI.esc(t)}">${UI.esc(t)}</button>`).join('')}
                    </div>
                    <div class="dash-gratitud-quick mt-sm" style="display:flex; gap:6px;">
                        <input type="text" id="dash-gratitud-input" class="form-input" placeholder="Añadir algo por lo que agradezco…" style="flex:1; padding:6px 8px; font-size:0.9rem;" />
                        <button type="button" id="btn-dash-gratitud-add" class="btn btn-primary btn-sm">Añadir</button>
                    </div>
                    <p class="text-sm text-secondary mt-sm"><a href="#gratitud">Ver todos</a></p>
                </div>
                ` : ''}
            </div>

            <!-- Progress Ring + Motivational -->
            <div class="dash-section dash-progress-area">
                <div class="dash-progress-ring-wrap">
                    <canvas id="dash-day-ring" width="120" height="120"></canvas>
                    <div class="dash-ring-label">
                        <span class="dash-ring-pct">${dayPct}%</span>
                    </div>
                </div>
                <div class="dash-progress-info">
                    <h3 class="dash-progress-title">Progreso del Día</h3>
                    <p class="dash-progress-phrase">${UI.esc(phrase.text)}</p>
                    ${phrase.author ? `<p class="dash-progress-author">— ${UI.esc(phrase.author)}</p>` : ''}
                </div>
            </div>

            <!-- Habits Tracker -->
            <div class="dash-section dash-habits">
                <div class="dash-section-header">
                    <h2 class="dash-section-title">Tracker de Hábitos</h2>
                    <div class="dash-section-actions">
                        <button id="btn-habits-calendar" class="btn btn-ghost btn-sm">Ver calendario</button>
                        <button id="btn-habits-config" class="btn btn-ghost btn-sm">Configurar</button>
                    </div>
                </div>
                <div class="dash-habits-grid" id="dash-habits-grid">
                    ${todayHabits.length > 0 ? todayHabits.map(h => {
                        const done = !!todayHabitRecords[h.id];
                        const icon = this._habitIcon(h.nombre);
                        return `
                            <button class="dash-habit-btn ${done ? 'done' : ''}" data-habit-id="${h.id}" title="${UI.esc(h.nombre)}">
                                <span class="dash-habit-icon">${icon}</span>
                                <span class="dash-habit-name">${UI.esc(h.nombre)}</span>
                            </button>
                        `;
                    }).join('') : `
                        <p class="text-muted text-sm" style="grid-column:1/-1;text-align:center;padding:var(--spacing-lg);">
                            Sin hábitos configurados. <a href="#habits" style="color:var(--accent-blue);">Configurar hábitos</a>
                        </p>
                    `}
                </div>
            </div>

            <!-- Priorities -->
            <div class="dash-section dash-priorities">
                <div class="dash-section-header">
                    <h2 class="dash-section-title">Prioridades del Día</h2>
                </div>
                <div id="dash-priorities">
                    ${prioritiesForDay.map((p, i) => `
                        <div class="dash-priority ${p.completado ? 'done' : ''} ${p.eventoId ? 'dash-priority-linked' : ''}" data-id="${p.id}" title="${p.eventoId ? 'Vinculada al calendario (Estudios); el estado se sincroniza con la actividad del día' : ''}">
                            <input type="checkbox" class="dash-priority-check" data-id="${p.id}" ${p.completado ? 'checked' : ''}>
                            <span class="dash-priority-text">${UI.esc(p.texto)}${p.eventoId ? ' <span class="text-xs text-secondary">· calendario</span>' : ''}</span>
                            ${p.eventoId ? '' : `<button type="button" class="dash-priority-del" data-id="${p.id}" title="Eliminar">&times;</button>`}
                        </div>
                    `).join('')}
                </div>
                <div class="dash-add-priority">
                    <input type="text" id="new-priority-text" class="dash-add-input"
                        placeholder="Añadir una nueva prioridad...">
                    <button type="button" id="btn-add-priority-inline" class="dash-add-btn" title="Añadir tarea">+</button>
                </div>
            </div>

            <!-- Tools Grid (oculto en escritorio: el sidebar ya muestra lo mismo) -->
            <div class="dash-section dash-section-tools">
                <div class="dash-section-header">
                    <h2 class="dash-section-title">Herramientas</h2>
                </div>
                <div class="dash-tools-grid">
                    ${this._renderTools(user, opts, isManager)}
                </div>
            </div>

            <!-- Resumen del día -->
            <div class="dash-section dash-close-day-wrap" style="text-align:center;padding-bottom:var(--spacing-2xl);">
                <button id="btn-close-day" class="btn btn-primary btn-lg" style="min-width:200px;">
                    Resumen del día
                </button>
            </div>
            </div>
        `;

        this._fillResumenRapido(data, today);
        this._bindEvents(container, email, data, viewDate, today);
        this._renderDayRing(dayPct);
    },

    _fillResumenRapido(data, today) {
        const fin = data.finanzas || { ingresos: [], gastos: [] };
        const events = data.calendario?.eventos || [];
        const now = new Date();
        const monthStart = DateUtils.toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        const monthEnd = DateUtils.toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        const ingresosMes = (fin.ingresos || []).filter(i => i.fecha >= monthStart && i.fecha <= monthEnd);
        const gastosMes = (fin.gastos || []).filter(g => g.fecha >= monthStart && g.fecha <= monthEnd);
        const totalIng = ingresosMes.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalGas = gastosMes.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const balance = totalIng - totalGas;

        const financeEl = document.getElementById('dash-mini-finance');
        if (financeEl) {
            financeEl.innerHTML = `
                <p style="margin:0 0 4px; font-size:0.9rem;">Ingresos: <strong style="color:var(--color-success,#34d399);">${UI.money(totalIng)}</strong></p>
                <p style="margin:0 0 4px; font-size:0.9rem;">Gastos: <strong style="color:var(--color-error,#f43f5e);">${UI.money(totalGas)}</strong></p>
                <p style="margin:0; font-size:1rem;">Balance: <strong style="color:${balance >= 0 ? 'var(--color-success,#34d399)' : 'var(--color-error,#f43f5e)'};">${UI.money(balance)}</strong></p>
            `;
        }
        const kpiBalance = document.getElementById('dash-kpi-balance');
        if (kpiBalance) kpiBalance.textContent = UI.money(balance);

        const calendarEl = document.getElementById('dash-mini-calendar');
        if (calendarEl) {
            const days = [];
            for (let i = 0; i < 7; i++) days.push(DateUtils.addDays(today, i));
            const upcoming = days.map(d => ({
                date: d,
                events: events.filter(e => e.fecha === d)
            })).filter(x => x.events.length > 0);
            if (upcoming.length === 0) {
                calendarEl.innerHTML = '<p class="text-secondary text-sm" style="margin:0;">Sin eventos en los próximos 7 días. <a href="#calendar">Añadir</a></p>';
            } else {
                calendarEl.innerHTML = upcoming.slice(0, 5).map(({ date, events: evs }) =>
                    `<p style="margin:0 0 6px; font-size:0.85rem;"><strong>${DateUtils.format(date, 'short')}</strong>: ${evs.map(e => UI.esc(e.titulo)).join(', ')}</p>`
                ).join('');
            }
        }
    },

    _getGreeting() {
        const h = new Date().getHours();
        if (h < 6) return 'Buenas noches';
        if (h < 12) return 'Buenos días';
        if (h < 18) return 'Buenas tardes';
        return 'Buenas noches';
    },

    _formatFullDate() {
        const d = new Date();
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
    },

    _habitIcon(name) {
        const lower = name.toLowerCase();
        if (lower.includes('agua') || lower.includes('beber')) return '💧';
        if (lower.includes('ejercicio') || lower.includes('gym') || lower.includes('gimnasio')) return '🏋️';
        if (lower.includes('leer') || lower.includes('lectura')) return '📖';
        if (lower.includes('meditar') || lower.includes('meditación')) return '🧘';
        if (lower.includes('dormir') || lower.includes('sueño')) return '😴';
        if (lower.includes('caminar')) return '🚶';
        if (lower.includes('correr')) return '🏃';
        if (lower.includes('estudi') || lower.includes('program')) return '💻';
        if (lower.includes('cocin') || lower.includes('comida')) return '🍳';
        if (lower.includes('social') || lower.includes('redes')) return '📵';
        if (lower.includes('biblia') || lower.includes('oración') || lower.includes('orar')) return '✝️';
        if (lower.includes('diario') || lower.includes('escribir')) return '✍️';
        if (lower.includes('vitamina') || lower.includes('suplement')) return '💊';
        if (lower.includes('fruta') || lower.includes('verdura') || lower.includes('salud')) return '🥗';
        return '✅';
    },

    /** Returns array of { hash, label, icon } for the current user (used by dashboard grid and bottom nav). */
    getToolsList(user, opts, isManager) {
        const tools = [];
        if (isManager) {
            tools.push({ hash: '#manager', label: 'Admin', icon: '🛡️', color: 'var(--tool-1)' });
        }
        tools.push(
            { hash: '#calendar', label: 'Calendario', icon: '📅', color: 'var(--tool-1)' },
            { hash: '#finance', label: 'Finanzas', icon: '💰', color: 'var(--tool-2)' },
            { hash: '#summary', label: 'Resumen', icon: '📊', color: 'var(--tool-3)' },
        );
        if (opts.gastosCompartidos === true) {
            tools.push({ hash: '#shared-expenses', label: 'Gastos Compartidos', icon: '🤝', color: 'var(--tool-4)' });
        }
        if (opts.estudios !== false) {
            tools.push({ hash: '#studies', label: 'Estudios', icon: '🎓', color: 'var(--tool-5)' });
        }
        if (opts.biblia !== false) {
            tools.push({ hash: '#religion', label: 'Biblia', icon: '✝️', color: 'var(--tool-6)' });
        }
        if (opts.habitos !== false) {
            tools.push({ hash: '#habits', label: 'Hábitos', icon: '🎯', color: 'var(--tool-7)' });
        }
        if (opts.ejercicios !== false) {
            tools.push({ hash: '#exercises', label: 'Ejercicios', icon: '💪', color: 'var(--tool-8)' });
        }
        if (opts.cicloMenstrual !== false && user?.perfil?.genero === 'mujer') {
            tools.push({ hash: '#cycle', label: 'Ciclo', icon: '🌸', color: 'var(--tool-9)' });
        }
        if (opts.juegos !== false) {
            tools.push({ hash: '#games', label: 'Juegos', icon: '🎮', color: 'var(--tool-10)' });
        }
        if (opts.documentos !== false) {
            tools.push({ hash: '#documents', label: 'Documentos', icon: '📁', color: 'var(--tool-11)' });
        }
        if (opts.diario !== false) {
            tools.push({ hash: '#diary', label: 'Diario', icon: '📝', color: 'var(--tool-5)' });
        }
        if (opts.foda !== false) {
            tools.push({ hash: '#foda', label: 'FODA', icon: '🎯', color: 'var(--tool-4)' });
        }
        if (opts.registroIntimo !== false && user?.perfil?.genero !== 'mujer') {
            tools.push({ hash: '#intimate', label: 'Registro Íntimo', icon: '❤️', color: 'var(--tool-3)' });
        }
        if (opts.gratitud !== false) {
            tools.push({ hash: '#gratitud', label: 'Gratitud', icon: '🙏', color: 'var(--tool-4)' });
        }
        if (opts.salud !== false) {
            tools.push({ hash: '#salud', label: 'Salud', icon: '🩺', color: 'var(--tool-2)' });
        }
        if (opts.biografia !== false) {
            tools.push({ hash: '#biografia', label: 'Biografía', icon: '📜', color: 'var(--tool-5)' });
        }
        if (opts.viajes !== false) {
            tools.push({ hash: '#viajes', label: 'Viajes', icon: '✈️', color: 'var(--tool-6)' });
        }
        tools.push({ hash: '#settings', label: 'Configuración', icon: '⚙️', color: 'var(--tool-12)' });
        return tools.sort((a, b) => {
            if (a.hash === '#settings') return 1;
            if (b.hash === '#settings') return -1;
            return (a.label || '').localeCompare(b.label || '', 'es');
        });
    },

    _renderTools(user, opts, isManager) {
        const tools = this.getToolsList(user, opts, isManager);
        return tools.map(t => `
            <a href="${t.hash}" class="dash-tool-btn">
                <span class="dash-tool-icon">${t.icon}</span>
                <span class="dash-tool-label">${t.label}</span>
            </a>
        `).join('');
    },

    _renderDayRing(pct) {
        const canvas = document.getElementById('dash-day-ring');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = 120;
        const lineWidth = 8;
        const radius = (size - lineWidth) / 2;
        const cx = size / 2;
        const cy = size / 2;

        ctx.clearRect(0, 0, size, size);

        // Background ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Progress ring
        if (pct > 0) {
            const start = -Math.PI / 2;
            const end = start + (Math.PI * 2 * pct / 100);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, start, end);
            const grad = ctx.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, '#818cf8');
            grad.addColorStop(1, '#a855f7');
            ctx.strokeStyle = grad;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    },

    _bindEvents(container, email, data, viewDate, today) {
        // Return to manager
        if (document.getElementById('btn-return-manager')) {
            UI.bindButton('btn-return-manager', () => Manager.returnToManager());
        }

        // Date navigation
        UI.bindButton('dash-date-prev', () => {
            this.selectedViewDate = DateUtils.addDays(viewDate, -1);
            this.render(container);
        });
        UI.bindButton('dash-date-today', () => {
            this.selectedViewDate = null;
            this.render(container);
        });
        UI.bindButton('dash-date-next', () => {
            const next = DateUtils.addDays(viewDate, 1);
            this.selectedViewDate = next;
            this.render(container);
        });

        // Actividades del día (marcar evento completado + prioridad vinculada si es estudios)
        container.querySelectorAll('.dash-activity-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const eventId = cb.dataset.eventId;
                const udata = Storage.getUserData(email);
                const ev = (udata.calendario?.eventos || []).find(e => e.id === eventId);
                if (ev) {
                    ev.completado = cb.checked;
                    if (ev.moduloOrigen === 'estudios' && typeof PrioritiesSync !== 'undefined') {
                        PrioritiesSync.syncPriorityFromEvent(udata, ev.id, ev.completado);
                    }
                    Storage.saveUserData(email, udata);
                    this.render(container);
                }
            });
        });

        // Habit toggle
        container.querySelectorAll('.dash-habit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.habitId;
                const udata = Storage.getUserData(email);
                if (!udata.habitos.registros[viewDate]) udata.habitos.registros[viewDate] = {};
                udata.habitos.registros[viewDate][id] = !udata.habitos.registros[viewDate][id];
                Storage.saveUserData(email, udata);
                this.render(container);
            });
        });

        // Habits calendar / config
        UI.bindButton('btn-habits-calendar', () => { window.location.hash = '#habits'; });
        UI.bindButton('btn-habits-config', () => { window.location.hash = '#habits'; });

        // Priority inline add
        const addPriority = () => {
            const input = document.getElementById('new-priority-text');
            const text = input?.value?.trim();
            if (!text) return;
            const udata = Storage.getUserData(email);
            if (!udata.prioridadesDia) udata.prioridadesDia = [];
            udata.prioridadesDia.push({
                id: DateUtils.generateId(),
                texto: text,
                orden: udata.prioridadesDia.length,
                completado: false,
                fecha: viewDate
            });
            Storage.saveUserData(email, udata);
            this.render(container);
        };

        UI.bindButton('btn-add-priority-inline', addPriority);

        const priorityInput = document.getElementById('new-priority-text');
        if (priorityInput) {
            priorityInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addPriority();
                }
            });
        }

        // Priority check (sincroniza evento del calendario si hay eventoId)
        container.querySelectorAll('.dash-priority-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const id = cb.dataset.id;
                const udata = Storage.getUserData(email);
                const p = (udata.prioridadesDia || []).find(x => x.id === id);
                if (p) {
                    p.completado = cb.checked;
                    if (typeof PrioritiesSync !== 'undefined') {
                        PrioritiesSync.syncEventFromPriority(udata, id, p.completado);
                    }
                    Storage.saveUserData(email, udata);
                    this.render(container);
                }
            });
        });

        // Priority delete
        container.querySelectorAll('.dash-priority-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const udata = Storage.getUserData(email);
                udata.prioridadesDia = (udata.prioridadesDia || []).filter(x => x.id !== id);
                Storage.saveUserData(email, udata);
                this.render(container);
            });
        });

        // Gratitud quick-add (widget)
        const gratitudInput = document.getElementById('dash-gratitud-input');
        const gratitudAdd = () => {
            const input = document.getElementById('dash-gratitud-input');
            const text = (input?.value || '').trim();
            if (!text) return;
            const udata = Storage.getUserData(email);
            if (!udata.gratitud) udata.gratitud = { entradas: [] };
            udata.gratitud.entradas.push({
                id: DateUtils.generateId(),
                fecha: DateUtils.today(),
                texto: text,
                creado: new Date().toISOString()
            });
            Storage.saveUserData(email, udata);
            if (input) input.value = '';
            UI.toast('Añadido a tu gratitud', 'success');
            this.render(container);
        };
        if (document.getElementById('btn-dash-gratitud-add')) {
            UI.bindButton('btn-dash-gratitud-add', gratitudAdd);
        }
        if (gratitudInput) {
            gratitudInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); gratitudAdd(); } });
        }
        container.querySelectorAll('.dash-gratitud-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('dash-gratitud-input');
                if (input) input.value = btn.dataset.texto || '';
            });
        });

        // Close Day / Summary
        UI.bindButton('btn-close-day', () => this._showDaySummary(container, email, data, viewDate));
    },

    _showDaySummary(container, email, data, viewDate) {
        const fresh = Storage.getUserData(email);
        const habits = fresh.habitos?.lista || [];
        const habitRec = fresh.habitos?.registros || {};
        const todayEvents = (fresh.calendario?.eventos || []).filter(e => e.fecha === viewDate);
        const priorities = (fresh.prioridadesDia || []).filter(p => p.fecha === viewDate);
        const todayGastos = (fresh.finanzas?.gastos || []).filter(g => g.fecha === viewDate);
        const todayIngresos = (fresh.finanzas?.ingresos || []).filter(i => i.fecha === viewDate);

        const completedH = habits.filter(h => habitRec[viewDate]?.[h.id]).length;
        const completedP = priorities.filter(p => p.completado).length;
        const attendedE = todayEvents.filter(e => e.completado).length;

        const totalIncome = todayIngresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = todayGastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);

        // Mini mapa de hábitos: últimos 7 días, cada hábito una fila
        const weekDays = [];
        for (let i = 6; i >= 0; i--) weekDays.push(DateUtils.addDays(viewDate, -i));
        const habitsMapHtml = habits.length > 0 ? `
            <div class="day-summary-habits-map">
                <h4 class="mb-sm">Hábitos esta semana</h4>
                <div class="habits-map-grid">
                    <div class="habits-map-row-header"></div>
                    ${weekDays.map(d => `<div class="habits-map-col-header" title="${DateUtils.format(d, 'short')}">${d === viewDate ? 'Hoy' : ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(d + 'T12:00:00').getDay()]}</div>`).join('')}
                    ${habits.map(h => `
                        <div class="habits-map-row-label" title="${UI.esc(h.nombre)}">${UI.esc(h.nombre.substring(0, 12))}${h.nombre.length > 12 ? '…' : ''}</div>
                        ${weekDays.map(d => {
                            const done = habitRec[d]?.[h.id];
                            return `<div class="habits-map-cell ${done ? 'done' : ''}" title="${DateUtils.format(d, 'short')} - ${UI.esc(h.nombre)}"></div>`;
                        }).join('')}
                    `).join('')}
                </div>
            </div>
        ` : '';

        UI.showModal(`
            <h3 class="modal-title">Resumen del Día</h3>
            <p class="text-secondary mb-md">${DateUtils.format(viewDate, 'long')}</p>

            <div class="summary-grid">
                <div class="summary-stat">
                    <span class="summary-stat-value">${completedH}/${habits.length}</span>
                    <span class="summary-stat-label">Hábitos</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${completedP}/${priorities.length}</span>
                    <span class="summary-stat-label">Prioridades</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-stat-value">${attendedE}/${todayEvents.length}</span>
                    <span class="summary-stat-label">Eventos</span>
                </div>
            </div>

            <div class="day-summary-section">
                <h4 class="mb-sm">Gastos realizados hoy</h4>
                ${todayGastos.length > 0 ? `
                    <ul class="day-summary-list">
                        ${todayGastos.map(g => `<li><span class="text-error">-${UI.money(parseFloat(g.monto) || 0)}</span> ${UI.esc(g.descripcion || g.categoria || 'Gasto')}</li>`).join('')}
                    </ul>
                    <p class="text-sm text-secondary">Total gastado: <strong class="text-error">${UI.money(totalExpense)}</strong></p>
                ` : '<p class="text-muted text-sm">Sin gastos registrados hoy.</p>'}
                ${todayIngresos.length > 0 ? `<p class="text-sm text-success mt-xs">Ingresos: +${UI.money(totalIncome)}</p>` : ''}
            </div>

            <div class="day-summary-section">
                <h4 class="mb-sm">Eventos: asistidos y no asistidos</h4>
                ${todayEvents.length > 0 ? `
                    <ul class="day-summary-list">
                        ${todayEvents.filter(e => e.completado).map(e => `<li class="text-success">✓ ${UI.esc(e.titulo)}</li>`).join('')}
                        ${todayEvents.filter(e => !e.completado).map(e => `<li class="text-muted">○ ${UI.esc(e.titulo)}</li>`).join('')}
                    </ul>
                    ${(() => {
                        const clases = todayEvents.filter(e => e.moduloOrigen === 'estudios');
                        if (clases.length === 0) return '';
                        const ok = clases.filter(e => e.completado).length;
                        return `<p class="text-sm text-secondary mt-sm">Clases / pruebas (estudios): <strong>${ok}/${clases.length}</strong> marcadas como realizadas.</p>`;
                    })()}
                ` : '<p class="text-muted text-sm">Sin eventos en esta fecha.</p>'}
            </div>

            ${habitsMapHtml}

            <div class="mt-lg" style="border-top: 1px solid var(--border); padding-top: var(--spacing-md);">
                <h4 style="margin-bottom: var(--spacing-sm);">Marcar completados:</h4>
                <div id="close-day-items" style="max-height: 220px; overflow-y: auto;">
                    ${habits.map(h => `
                        <label class="form-check" style="padding:8px;">
                            <input type="checkbox" data-item-id="${h.id}" data-type="habit" ${habitRec[viewDate]?.[h.id] ? 'checked' : ''}>
                            <span class="form-check-label">${UI.esc(h.nombre)}</span>
                            <span class="badge badge-info" style="margin-left:auto;font-size:0.65rem;">Hábito</span>
                        </label>
                    `).join('')}
                    ${todayEvents.map(e => `
                        <label class="form-check" style="padding:8px;">
                            <input type="checkbox" data-item-id="${e.id}" data-type="event" ${e.completado ? 'checked' : ''}>
                            <span class="form-check-label">${UI.esc(e.titulo)}</span>
                            <span class="badge badge-warning" style="margin-left:auto;font-size:0.65rem;">Evento</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="modal-actions">
                <button id="btn-close-day-save" class="btn btn-primary btn-lg">Cerrar y Guardar</button>
            </div>
        `, {
            onReady: () => {
                UI.bindButton('btn-close-day-save', () => {
                    const udata = Storage.getUserData(email);
                    document.querySelectorAll('#close-day-items input[type="checkbox"]').forEach(cb => {
                        const id = cb.dataset.itemId;
                        const type = cb.dataset.type;
                        if (type === 'habit') {
                            if (!udata.habitos) udata.habitos = { lista: [], registros: {} };
                            if (!udata.habitos.registros[viewDate]) udata.habitos.registros[viewDate] = {};
                            udata.habitos.registros[viewDate][id] = cb.checked;
                        } else {
                            const ev = (udata.calendario?.eventos || []).find(e => e.id === id);
                            if (ev) {
                                ev.completado = cb.checked;
                                if (ev.moduloOrigen === 'estudios' && typeof PrioritiesSync !== 'undefined') {
                                    PrioritiesSync.syncPriorityFromEvent(udata, ev.id, ev.completado);
                                }
                            }
                        }
                    });
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Día cerrado. ¡Buen trabajo!', 'success');
                    this.render(container);
                });
            }
        });
    }
};
