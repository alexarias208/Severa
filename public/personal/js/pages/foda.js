/* ============================================
   FODA PAGE - SWOT Analysis (Personal)
   ============================================ */

const FodaPage = {
    currentTab: 'analysis',
    _container: null,
    _email: null,

    render(container) {
        this._container = container;
        this._email = Auth.getCurrentEmail();
        const data = Storage.getUserData(this._email);
        if (!data.foda) {
            data.foda = {
                fortalezas: [],
                oportunidades: [],
                debilidades: [],
                amenazas: [],
                estrategias: []
            };
        }

        const foda = data.foda;
        const totalItems = foda.fortalezas.length + foda.oportunidades.length + foda.debilidades.length + foda.amenazas.length;

        container.innerHTML = `
            ${UI.pageTitle('Análisis FODA', `<span class="text-secondary text-sm">${totalItems} elementos</span>`, 'foda')}

            <div class="tabs">
                <button class="tab-btn ${this.currentTab === 'analysis' ? 'active' : ''}" data-tab="analysis">Análisis</button>
                <button class="tab-btn ${this.currentTab === 'matrix' ? 'active' : ''}" data-tab="matrix">Matriz</button>
                <button class="tab-btn ${this.currentTab === 'summary' ? 'active' : ''}" data-tab="summary">Resumen</button>
            </div>

            <div id="tab-analysis" class="tab-content ${this.currentTab === 'analysis' ? 'active' : ''}">
                ${this._renderAnalysis(foda)}
            </div>

            <div id="tab-matrix" class="tab-content ${this.currentTab === 'matrix' ? 'active' : ''}">
                ${this._renderMatrix(foda)}
            </div>

            <div id="tab-summary" class="tab-content ${this.currentTab === 'summary' ? 'active' : ''}">
                ${this._renderSummary(foda)}
            </div>
        `;

        this._bindEvents(container);
        this._renderCharts(foda);
    },

    /* ==================== TAB: ANÁLISIS ==================== */

    _renderAnalysis(foda) {
        const quadrants = [
            {
                key: 'fortalezas',
                title: 'Fortalezas',
                color: '#2ecc71',
                bgColor: 'rgba(46,204,113,0.08)',
                borderColor: 'rgba(46,204,113,0.3)',
                icon: '💪',
                items: foda.fortalezas
            },
            {
                key: 'oportunidades',
                title: 'Oportunidades',
                color: '#3498db',
                bgColor: 'rgba(52,152,219,0.08)',
                borderColor: 'rgba(52,152,219,0.3)',
                icon: '🌟',
                items: foda.oportunidades
            },
            {
                key: 'debilidades',
                title: 'Debilidades',
                color: '#e67e22',
                bgColor: 'rgba(230,126,34,0.08)',
                borderColor: 'rgba(230,126,34,0.3)',
                icon: '⚠️',
                items: foda.debilidades
            },
            {
                key: 'amenazas',
                title: 'Amenazas',
                color: '#e74c3c',
                bgColor: 'rgba(231,76,60,0.08)',
                borderColor: 'rgba(231,76,60,0.3)',
                icon: '🔴',
                items: foda.amenazas
            }
        ];

        return `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:var(--spacing-md);">
                ${quadrants.map(q => `
                    <div class="card" style="border-left:4px solid ${q.color};">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md);">
                            <h4 class="card-title" style="margin:0; color:${q.color};">
                                ${q.icon} ${q.title}
                            </h4>
                            <button class="btn btn-sm" style="background:${q.bgColor}; color:${q.color}; border:1px solid ${q.borderColor};" 
                                data-add-quadrant="${q.key}">
                                + Agregar
                            </button>
                        </div>

                        ${q.items.length > 0 ? `
                            <div style="display:flex; flex-direction:column; gap:var(--spacing-xs);">
                                ${q.items.map(item => `
                                    <div class="foda-item" data-quadrant="${q.key}" data-item-id="${item.id}"
                                        style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-sm); 
                                               background:${q.bgColor}; border-radius:var(--radius-sm); cursor:pointer; transition:opacity 0.2s;">
                                        <span style="flex:1; word-break:break-word;">${UI.esc(item.texto)}</span>
                                        <span class="badge" style="background:${q.color}; color:#fff; margin-left:var(--spacing-sm); flex-shrink:0;">
                                            ${item.puntuacion}/10
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-muted text-sm text-center" style="padding:var(--spacing-md) 0;">
                                Sin elementos. Agrega uno.
                            </p>
                        `}

                        ${q.items.length > 0 ? `
                            <div style="margin-top:var(--spacing-sm); text-align:right;">
                                <span class="text-secondary text-sm">
                                    Promedio: <strong>${(q.items.reduce((s, i) => s + (i.puntuacion || 0), 0) / q.items.length).toFixed(1)}</strong>/10
                                </span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    /* ==================== TAB: MATRIZ ==================== */

    _renderMatrix(foda) {
        const strategies = foda.estrategias || [];

        const cells = [
            {
                tipo: 'FO',
                title: 'FO: Ofensivas',
                subtitle: 'Usar fortalezas para aprovechar oportunidades',
                color: '#2ecc71',
                bgColor: 'rgba(46,204,113,0.06)',
                borderColor: 'rgba(46,204,113,0.25)',
                items: strategies.filter(s => s.tipo === 'FO')
            },
            {
                tipo: 'FA',
                title: 'FA: Defensivas',
                subtitle: 'Usar fortalezas para enfrentar amenazas',
                color: '#3498db',
                bgColor: 'rgba(52,152,219,0.06)',
                borderColor: 'rgba(52,152,219,0.25)',
                items: strategies.filter(s => s.tipo === 'FA')
            },
            {
                tipo: 'DO',
                title: 'DO: Adaptativas',
                subtitle: 'Superar debilidades con oportunidades',
                color: '#e67e22',
                bgColor: 'rgba(230,126,34,0.06)',
                borderColor: 'rgba(230,126,34,0.25)',
                items: strategies.filter(s => s.tipo === 'DO')
            },
            {
                tipo: 'DA',
                title: 'DA: Supervivencia',
                subtitle: 'Minimizar debilidades ante amenazas',
                color: '#e74c3c',
                bgColor: 'rgba(231,76,60,0.06)',
                borderColor: 'rgba(231,76,60,0.25)',
                items: strategies.filter(s => s.tipo === 'DA')
            }
        ];

        // Header labels
        return `
            <div class="card mb-md">
                <p class="text-secondary text-sm text-center">
                    Combina los cuadrantes FODA para generar estrategias accionables.
                </p>
            </div>

            <div style="display:grid; grid-template-columns:auto 1fr 1fr; grid-template-rows:auto auto auto; gap:0;">
                <!-- Top header row -->
                <div></div>
                <div style="text-align:center; padding:var(--spacing-sm); font-weight:700; color:#2ecc71;">
                    Fortalezas (F)
                </div>
                <div style="text-align:center; padding:var(--spacing-sm); font-weight:700; color:#e67e22;">
                    Debilidades (D)
                </div>

                <!-- Row 1: Oportunidades -->
                <div style="writing-mode:vertical-lr; transform:rotate(180deg); text-align:center; padding:var(--spacing-sm); font-weight:700; color:#3498db;">
                    Oportunidades (O)
                </div>
                ${this._renderMatrixCell(cells[0])}
                ${this._renderMatrixCell(cells[2])}

                <!-- Row 2: Amenazas -->
                <div style="writing-mode:vertical-lr; transform:rotate(180deg); text-align:center; padding:var(--spacing-sm); font-weight:700; color:#e74c3c;">
                    Amenazas (A)
                </div>
                ${this._renderMatrixCell(cells[1])}
                ${this._renderMatrixCell(cells[3])}
            </div>
        `;
    },

    _renderMatrixCell(cell) {
        return `
            <div style="border:1px solid ${cell.borderColor}; background:${cell.bgColor}; padding:var(--spacing-md); min-height:180px; display:flex; flex-direction:column;">
                <div style="margin-bottom:var(--spacing-sm);">
                    <strong style="color:${cell.color};">${cell.title}</strong>
                    <p class="text-muted text-sm" style="margin:2px 0 0;">${cell.subtitle}</p>
                </div>

                <div style="flex:1; display:flex; flex-direction:column; gap:var(--spacing-xs);">
                    ${cell.items.length > 0 ? cell.items.map(s => `
                        <div class="strategy-item" data-strategy-id="${s.id}"
                            style="padding:var(--spacing-xs) var(--spacing-sm); background:rgba(255,255,255,0.6); 
                                   border-radius:var(--radius-sm); cursor:pointer; font-size:var(--font-sm); transition:opacity 0.2s;">
                            <span>${UI.esc(s.texto)}</span>
                            <span class="text-muted text-sm" style="display:block;">${s.fecha ? DateUtils.format(s.fecha, 'short') : ''}</span>
                        </div>
                    `).join('') : '<p class="text-muted text-sm" style="margin:auto; text-align:center;">Sin estrategias</p>'}
                </div>

                <button class="btn btn-sm" style="background:${cell.color}; color:#fff; margin-top:var(--spacing-sm); width:100%;"
                    data-add-strategy="${cell.tipo}">
                    + Agregar estrategia
                </button>
            </div>
        `;
    },

    /* ==================== TAB: RESUMEN ==================== */

    _renderSummary(foda) {
        const avgF = foda.fortalezas.length > 0
            ? (foda.fortalezas.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.fortalezas.length).toFixed(1)
            : 0;
        const avgO = foda.oportunidades.length > 0
            ? (foda.oportunidades.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.oportunidades.length).toFixed(1)
            : 0;
        const avgD = foda.debilidades.length > 0
            ? (foda.debilidades.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.debilidades.length).toFixed(1)
            : 0;
        const avgA = foda.amenazas.length > 0
            ? (foda.amenazas.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.amenazas.length).toFixed(1)
            : 0;

        const internalScore = ((parseFloat(avgF) - parseFloat(avgD)) / 2 + 5).toFixed(1);
        const externalScore = ((parseFloat(avgO) - parseFloat(avgA)) / 2 + 5).toFixed(1);
        const totalStrategies = (foda.estrategias || []).length;

        const totalItems = foda.fortalezas.length + foda.oportunidades.length + foda.debilidades.length + foda.amenazas.length;

        if (totalItems === 0) {
            return `
                <div class="card">
                    ${UI.emptyState('Agrega elementos en el tab Análisis para ver el resumen.', '📊')}
                </div>
            `;
        }

        return `
            <div class="cards-grid">
                <div class="card">
                    <h4 class="card-title mb-md">Puntuaciones por Cuadrante</h4>
                    <div class="chart-container" style="height:280px;">
                        <canvas id="foda-bar-chart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Distribución de Elementos</h4>
                    <div class="chart-container" style="height:280px;">
                        <canvas id="foda-pie-chart"></canvas>
                    </div>
                </div>
            </div>

            <div class="cards-grid mt-lg">
                <div class="card text-center">
                    <p class="text-secondary">Factor Interno</p>
                    <p class="text-sm text-muted mb-sm">Fortalezas vs Debilidades</p>
                    <div style="display:flex; align-items:center; justify-content:center; gap:var(--spacing-md);">
                        <div>
                            <span style="font-size:var(--font-sm); color:#2ecc71;">F: ${avgF}</span>
                        </div>
                        <div style="font-size:var(--font-2xl); font-weight:700; color:${parseFloat(internalScore) >= 5 ? '#2ecc71' : '#e74c3c'};">
                            ${internalScore}
                        </div>
                        <div>
                            <span style="font-size:var(--font-sm); color:#e67e22;">D: ${avgD}</span>
                        </div>
                    </div>
                    <div style="margin-top:var(--spacing-sm);">
                        <div style="background:#e8ecf1; border-radius:var(--radius-sm); height:8px; overflow:hidden;">
                            <div style="width:${Math.min(parseFloat(internalScore) * 10, 100)}%; height:100%; background:${parseFloat(internalScore) >= 5 ? '#2ecc71' : '#e74c3c'}; border-radius:var(--radius-sm); transition:width 0.3s;"></div>
                        </div>
                    </div>
                </div>
                <div class="card text-center">
                    <p class="text-secondary">Factor Externo</p>
                    <p class="text-sm text-muted mb-sm">Oportunidades vs Amenazas</p>
                    <div style="display:flex; align-items:center; justify-content:center; gap:var(--spacing-md);">
                        <div>
                            <span style="font-size:var(--font-sm); color:#3498db;">O: ${avgO}</span>
                        </div>
                        <div style="font-size:var(--font-2xl); font-weight:700; color:${parseFloat(externalScore) >= 5 ? '#3498db' : '#e74c3c'};">
                            ${externalScore}
                        </div>
                        <div>
                            <span style="font-size:var(--font-sm); color:#e74c3c;">A: ${avgA}</span>
                        </div>
                    </div>
                    <div style="margin-top:var(--spacing-sm);">
                        <div style="background:#e8ecf1; border-radius:var(--radius-sm); height:8px; overflow:hidden;">
                            <div style="width:${Math.min(parseFloat(externalScore) * 10, 100)}%; height:100%; background:${parseFloat(externalScore) >= 5 ? '#3498db' : '#e74c3c'}; border-radius:var(--radius-sm); transition:width 0.3s;"></div>
                        </div>
                    </div>
                </div>
                <div class="card text-center">
                    <p class="text-secondary">Estrategias</p>
                    <p style="font-size:var(--font-2xl); font-weight:700; margin:var(--spacing-sm) 0;">${totalStrategies}</p>
                    <div style="display:flex; justify-content:center; gap:var(--spacing-sm); flex-wrap:wrap;">
                        <span class="text-sm" style="color:#2ecc71;">FO: ${(foda.estrategias || []).filter(s => s.tipo === 'FO').length}</span>
                        <span class="text-sm" style="color:#3498db;">FA: ${(foda.estrategias || []).filter(s => s.tipo === 'FA').length}</span>
                        <span class="text-sm" style="color:#e67e22;">DO: ${(foda.estrategias || []).filter(s => s.tipo === 'DO').length}</span>
                        <span class="text-sm" style="color:#e74c3c;">DA: ${(foda.estrategias || []).filter(s => s.tipo === 'DA').length}</span>
                    </div>
                </div>
            </div>

            <!-- Detail table -->
            <div class="card mt-lg">
                <h4 class="card-title mb-md">Detalle por Cuadrante</h4>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Cuadrante</th>
                                <th style="text-align:center;">Elementos</th>
                                <th style="text-align:center;">Promedio</th>
                                <th style="text-align:center;">Máximo</th>
                                <th style="text-align:center;">Mínimo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this._renderSummaryRow('Fortalezas', foda.fortalezas, '#2ecc71')}
                            ${this._renderSummaryRow('Oportunidades', foda.oportunidades, '#3498db')}
                            ${this._renderSummaryRow('Debilidades', foda.debilidades, '#e67e22')}
                            ${this._renderSummaryRow('Amenazas', foda.amenazas, '#e74c3c')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    _renderSummaryRow(label, items, color) {
        if (items.length === 0) {
            return `
                <tr>
                    <td><span style="color:${color}; font-weight:600;">${label}</span></td>
                    <td style="text-align:center;">0</td>
                    <td style="text-align:center;">—</td>
                    <td style="text-align:center;">—</td>
                    <td style="text-align:center;">—</td>
                </tr>
            `;
        }
        const scores = items.map(i => i.puntuacion || 0);
        const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        return `
            <tr>
                <td><span style="color:${color}; font-weight:600;">${label}</span></td>
                <td style="text-align:center;">${items.length}</td>
                <td style="text-align:center;">${avg}</td>
                <td style="text-align:center;">${max}</td>
                <td style="text-align:center;">${min}</td>
            </tr>
        `;
    },

    /* ==================== CHARTS ==================== */

    _renderCharts(foda) {
        if (typeof Chart === 'undefined') return;

        const avgF = foda.fortalezas.length > 0
            ? foda.fortalezas.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.fortalezas.length
            : 0;
        const avgO = foda.oportunidades.length > 0
            ? foda.oportunidades.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.oportunidades.length
            : 0;
        const avgD = foda.debilidades.length > 0
            ? foda.debilidades.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.debilidades.length
            : 0;
        const avgA = foda.amenazas.length > 0
            ? foda.amenazas.reduce((s, i) => s + (i.puntuacion || 0), 0) / foda.amenazas.length
            : 0;

        // Bar chart for average scores
        ChartUtils.bar('foda-bar-chart',
            ['Fortalezas', 'Oportunidades', 'Debilidades', 'Amenazas'],
            [{
                label: 'Puntuación promedio',
                data: [avgF, avgO, avgD, avgA],
                backgroundColor: ['#2ecc71', '#3498db', '#e67e22', '#e74c3c'],
                borderRadius: 6
            }],
            { title: '' }
        );

        // Pie chart for element distribution
        const counts = [
            foda.fortalezas.length,
            foda.oportunidades.length,
            foda.debilidades.length,
            foda.amenazas.length
        ];
        if (counts.some(c => c > 0)) {
            ChartUtils.pie('foda-pie-chart',
                ['Fortalezas', 'Oportunidades', 'Debilidades', 'Amenazas'],
                counts,
                { colors: ['#2ecc71', '#3498db', '#e67e22', '#e74c3c'] }
            );
        }
    },

    /* ==================== EVENTS ==================== */

    _bindEvents(container) {
        const self = this;
        const email = this._email;

        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                self.currentTab = btn.dataset.tab;
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById(`tab-${btn.dataset.tab}`);
                if (target) target.classList.add('active');

                // Re-render charts when switching to summary tab
                if (btn.dataset.tab === 'summary') {
                    const data = Storage.getUserData(email);
                    setTimeout(() => self._renderCharts(data.foda || {}), 50);
                }
            });
        });

        // Add item to quadrant
        container.querySelectorAll('[data-add-quadrant]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const quadrant = btn.dataset.addQuadrant;
                self._showAddItemModal(container, email, quadrant);
            });
        });

        // Click on existing item (edit/delete)
        container.querySelectorAll('.foda-item').forEach(item => {
            item.addEventListener('click', () => {
                const quadrant = item.dataset.quadrant;
                const itemId = item.dataset.itemId;
                self._showEditItemModal(container, email, quadrant, itemId);
            });
        });

        // Add strategy
        container.querySelectorAll('[data-add-strategy]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tipo = btn.dataset.addStrategy;
                self._showAddStrategyModal(container, email, tipo);
            });
        });

        // Click on existing strategy (edit/delete)
        container.querySelectorAll('.strategy-item').forEach(item => {
            item.addEventListener('click', () => {
                const strategyId = item.dataset.strategyId;
                self._showEditStrategyModal(container, email, strategyId);
            });
        });
    },

    /* ==================== MODALS ==================== */

    _getQuadrantLabel(key) {
        const labels = {
            fortalezas: 'Fortaleza',
            oportunidades: 'Oportunidad',
            debilidades: 'Debilidad',
            amenazas: 'Amenaza'
        };
        return labels[key] || key;
    },

    _getQuadrantColor(key) {
        const colors = {
            fortalezas: '#2ecc71',
            oportunidades: '#3498db',
            debilidades: '#e67e22',
            amenazas: '#e74c3c'
        };
        return colors[key] || '#667eea';
    },

    _showAddItemModal(container, email, quadrant) {
        const self = this;
        const label = this._getQuadrantLabel(quadrant);
        const color = this._getQuadrantColor(quadrant);

        UI.showModal(`
            <h3 class="modal-title" style="color:${color};">Agregar ${label}</h3>
            <form id="foda-add-item-form">
                ${UI.formGroup('Descripción',
                    `<textarea name="foda_texto" id="input-foda_texto" class="form-textarea" 
                        placeholder="Describe la ${label.toLowerCase()}..." rows="3" required></textarea>`
                )}

                <div class="form-group">
                    <label class="form-label">Puntuación (1-10)</label>
                    <div style="display:flex; align-items:center; gap:var(--spacing-md);">
                        <input type="range" name="foda_puntuacion" id="input-foda_puntuacion" 
                            min="1" max="10" value="5" 
                            style="flex:1; accent-color:${color};">
                        <span id="foda-score-display" style="font-size:var(--font-xl); font-weight:700; min-width:28px; text-align:center; color:${color};">5</span>
                    </div>
                    <span class="form-hint">1 = Bajo impacto, 10 = Alto impacto</span>
                </div>

                <div class="modal-actions">
                    <button type="button" id="btn-foda-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="background:${color};">Agregar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                // Score slider display
                const slider = document.getElementById('input-foda_puntuacion');
                const display = document.getElementById('foda-score-display');
                if (slider && display) {
                    slider.addEventListener('input', () => {
                        display.textContent = slider.value;
                    });
                }

                UI.bindButton('btn-foda-cancel', () => UI.closeModal());

                UI.bindForm('foda-add-item-form', (fd) => {
                    const texto = fd.foda_texto ? fd.foda_texto.trim() : '';
                    if (!texto) {
                        UI.toast('Escribe una descripción', 'error');
                        return;
                    }

                    const data = Storage.getUserData(email);
                    if (!data.foda) data.foda = { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [], estrategias: [] };
                    if (!data.foda[quadrant]) data.foda[quadrant] = [];

                    data.foda[quadrant].push({
                        id: DateUtils.generateId(),
                        texto: texto,
                        puntuacion: parseInt(fd.foda_puntuacion) || 5
                    });

                    Storage.saveUserData(email, data);
                    UI.closeModal();
                    UI.toast(`${label} agregada`, 'success');
                    self.currentTab = 'analysis';
                    self.render(container);
                });
            }
        });
    },

    _showEditItemModal(container, email, quadrant, itemId) {
        const self = this;
        const data = Storage.getUserData(email);
        if (!data.foda || !data.foda[quadrant]) return;

        const item = data.foda[quadrant].find(i => i.id === itemId);
        if (!item) return;

        const label = this._getQuadrantLabel(quadrant);
        const color = this._getQuadrantColor(quadrant);

        UI.showModal(`
            <h3 class="modal-title" style="color:${color};">Editar ${label}</h3>
            <form id="foda-edit-item-form">
                <div class="form-group">
                    <label class="form-label">Descripción</label>
                    <textarea name="foda_texto" id="input-foda_texto" class="form-textarea" rows="3" required>${UI.esc(item.texto)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Puntuación (1-10)</label>
                    <div style="display:flex; align-items:center; gap:var(--spacing-md);">
                        <input type="range" name="foda_puntuacion" id="input-foda_puntuacion" 
                            min="1" max="10" value="${item.puntuacion || 5}" 
                            style="flex:1; accent-color:${color};">
                        <span id="foda-score-display" style="font-size:var(--font-xl); font-weight:700; min-width:28px; text-align:center; color:${color};">${item.puntuacion || 5}</span>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" id="btn-foda-delete" class="btn btn-danger">Eliminar</button>
                    <button type="button" id="btn-foda-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="background:${color};">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                // Score slider display
                const slider = document.getElementById('input-foda_puntuacion');
                const display = document.getElementById('foda-score-display');
                if (slider && display) {
                    slider.addEventListener('input', () => {
                        display.textContent = slider.value;
                    });
                }

                UI.bindButton('btn-foda-cancel', () => UI.closeModal());

                // Delete
                UI.bindButton('btn-foda-delete', () => {
                    UI.confirm(`¿Eliminar esta ${label.toLowerCase()}?`, () => {
                        const d = Storage.getUserData(email);
                        if (d.foda && d.foda[quadrant]) {
                            d.foda[quadrant] = d.foda[quadrant].filter(i => i.id !== itemId);
                        }
                        Storage.saveUserData(email, d);
                        UI.closeModal();
                        UI.toast(`${label} eliminada`, 'success');
                        self.currentTab = 'analysis';
                        self.render(container);
                    });
                });

                // Save
                UI.bindForm('foda-edit-item-form', (fd) => {
                    const texto = fd.foda_texto ? fd.foda_texto.trim() : '';
                    if (!texto) {
                        UI.toast('Escribe una descripción', 'error');
                        return;
                    }

                    const d = Storage.getUserData(email);
                    if (d.foda && d.foda[quadrant]) {
                        const target = d.foda[quadrant].find(i => i.id === itemId);
                        if (target) {
                            target.texto = texto;
                            target.puntuacion = parseInt(fd.foda_puntuacion) || 5;
                        }
                    }

                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast(`${label} actualizada`, 'success');
                    self.currentTab = 'analysis';
                    self.render(container);
                });
            }
        });
    },

    _showAddStrategyModal(container, email, tipo) {
        const self = this;
        const tipoLabels = {
            FO: 'FO: Ofensiva',
            FA: 'FA: Defensiva',
            DO: 'DO: Adaptativa',
            DA: 'DA: Supervivencia'
        };
        const tipoColors = {
            FO: '#2ecc71',
            FA: '#3498db',
            DO: '#e67e22',
            DA: '#e74c3c'
        };
        const label = tipoLabels[tipo] || tipo;
        const color = tipoColors[tipo] || '#667eea';

        UI.showModal(`
            <h3 class="modal-title" style="color:${color};">Nueva Estrategia ${label}</h3>
            <form id="foda-add-strategy-form">
                <div class="form-group">
                    <label class="form-label">Estrategia</label>
                    <textarea name="strat_texto" id="input-strat_texto" class="form-textarea" 
                        placeholder="Describe la estrategia..." rows="4" required></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" id="btn-strat-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="background:${color};">Agregar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-strat-cancel', () => UI.closeModal());

                UI.bindForm('foda-add-strategy-form', (fd) => {
                    const texto = fd.strat_texto ? fd.strat_texto.trim() : '';
                    if (!texto) {
                        UI.toast('Escribe la estrategia', 'error');
                        return;
                    }

                    const data = Storage.getUserData(email);
                    if (!data.foda) data.foda = { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [], estrategias: [] };
                    if (!data.foda.estrategias) data.foda.estrategias = [];

                    data.foda.estrategias.push({
                        id: DateUtils.generateId(),
                        tipo: tipo,
                        texto: texto,
                        fecha: DateUtils.today()
                    });

                    Storage.saveUserData(email, data);
                    UI.closeModal();
                    UI.toast('Estrategia agregada', 'success');
                    self.currentTab = 'matrix';
                    self.render(container);
                });
            }
        });
    },

    _showEditStrategyModal(container, email, strategyId) {
        const self = this;
        const data = Storage.getUserData(email);
        if (!data.foda || !data.foda.estrategias) return;

        const strategy = data.foda.estrategias.find(s => s.id === strategyId);
        if (!strategy) return;

        const tipoLabels = {
            FO: 'FO: Ofensiva',
            FA: 'FA: Defensiva',
            DO: 'DO: Adaptativa',
            DA: 'DA: Supervivencia'
        };
        const tipoColors = {
            FO: '#2ecc71',
            FA: '#3498db',
            DO: '#e67e22',
            DA: '#e74c3c'
        };
        const label = tipoLabels[strategy.tipo] || strategy.tipo;
        const color = tipoColors[strategy.tipo] || '#667eea';

        UI.showModal(`
            <h3 class="modal-title" style="color:${color};">Editar Estrategia ${label}</h3>
            <form id="foda-edit-strategy-form">
                <div class="form-group">
                    <label class="form-label">Tipo</label>
                    ${UI.select('strat_tipo', [
                        { value: 'FO', label: 'FO: Ofensiva' },
                        { value: 'FA', label: 'FA: Defensiva' },
                        { value: 'DO', label: 'DO: Adaptativa' },
                        { value: 'DA', label: 'DA: Supervivencia' }
                    ], strategy.tipo)}
                </div>

                <div class="form-group">
                    <label class="form-label">Estrategia</label>
                    <textarea name="strat_texto" id="input-strat_texto" class="form-textarea" rows="4" required>${UI.esc(strategy.texto)}</textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" id="btn-strat-delete" class="btn btn-danger">Eliminar</button>
                    <button type="button" id="btn-strat-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="background:${color};">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-strat-cancel', () => UI.closeModal());

                // Delete
                UI.bindButton('btn-strat-delete', () => {
                    UI.confirm('¿Eliminar esta estrategia?', () => {
                        const d = Storage.getUserData(email);
                        if (d.foda && d.foda.estrategias) {
                            d.foda.estrategias = d.foda.estrategias.filter(s => s.id !== strategyId);
                        }
                        Storage.saveUserData(email, d);
                        UI.closeModal();
                        UI.toast('Estrategia eliminada', 'success');
                        self.currentTab = 'matrix';
                        self.render(container);
                    });
                });

                // Save
                UI.bindForm('foda-edit-strategy-form', (fd) => {
                    const texto = fd.strat_texto ? fd.strat_texto.trim() : '';
                    if (!texto) {
                        UI.toast('Escribe la estrategia', 'error');
                        return;
                    }

                    const d = Storage.getUserData(email);
                    if (d.foda && d.foda.estrategias) {
                        const target = d.foda.estrategias.find(s => s.id === strategyId);
                        if (target) {
                            target.tipo = fd.strat_tipo || strategy.tipo;
                            target.texto = texto;
                        }
                    }

                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast('Estrategia actualizada', 'success');
                    self.currentTab = 'matrix';
                    self.render(container);
                });
            }
        });
    }
};
