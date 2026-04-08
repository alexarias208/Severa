/* ============================================
   FINANCE PAGE - 5-Tab Financial Dashboard
   Situación Actual | Flujo de Caja | Balance General
   Estado de Resultado | Movimientos
   ============================================ */

const FinancePage = {
    currentTab: 'situacion',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    dateFilterStart: '',
    dateFilterEnd: '',
    sortBy: 'fecha-desc',

    _addMonths(dateStr, months) {
        if (!dateStr) return '';
        const d = DateUtils.fromDateStr(dateStr);
        const day = d.getDate();
        d.setMonth(d.getMonth() + (parseInt(months, 10) || 0));
        // Ajuste por meses con menos días (ej. 31 -> 30/28)
        if (d.getDate() !== day) d.setDate(0);
        return DateUtils.toDateStr(d);
    },

    _deudaMontoCuota(d) {
        const total = parseFloat(d?.monto) || 0;
        const n = parseInt(d?.totalCuotas, 10) || 0;
        const mc = parseFloat(d?.montoCuota);
        if (mc && mc > 0) return mc;
        if (d?.enCuotas && n > 0) return total / n;
        return 0;
    },

    _deudaCuotasPagadas(d) {
        if (Array.isArray(d?.cuotasPagadas)) return d.cuotasPagadas.filter(x => Number.isFinite(x) || (parseInt(x, 10) > 0)).map(x => parseInt(x, 10));
        return [];
    },

    _deudaCuotaActual(d) {
        const ca = parseInt(d?.cuotaActual, 10);
        return ca > 0 ? ca : 1;
    },

    _deudaSaldoRestante(d) {
        const total = parseFloat(d?.monto) || 0;
        if (!d?.enCuotas || !(parseInt(d?.totalCuotas, 10) > 0)) return total;
        const cuota = this._deudaMontoCuota(d);
        const pagadas = this._deudaCuotasPagadas(d);
        const paidCount = pagadas.length > 0 ? new Set(pagadas).size : Math.max(this._deudaCuotaActual(d) - 1, 0);
        const restante = total - (paidCount * cuota);
        return Math.max(restante, 0);
    },

    _projectCuotas(fin) {
        const deudas = fin?.deudas || [];
        const out = [];
        deudas.forEach(d => {
            if (!d?.enCuotas) return;
            const totalCuotas = parseInt(d.totalCuotas, 10) || 0;
            if (totalCuotas <= 0) return;
            if (!d.fechaVence) return;
            const cuota = this._deudaMontoCuota(d);
            if (!(cuota > 0)) return;

            const cuotaActual = this._deudaCuotaActual(d);
            const pagadas = new Set(this._deudaCuotasPagadas(d));

            // Generamos desde la próxima cuota (fechaVence) hasta completar totalCuotas
            for (let n = cuotaActual; n <= totalCuotas; n++) {
                const offset = n - cuotaActual;
                const fecha = this._addMonths(d.fechaVence, offset);
                const estado = pagadas.has(n) ? 'pagada' : 'pendiente';
                out.push({
                    _type: 'cuota',
                    deudaId: d.id,
                    descripcion: d.descripcion || 'Deuda',
                    fecha,
                    monto: cuota,
                    nCuota: n,
                    totalCuotas
                });
            }
        });
        return out;
    },

    _cuotasPendientes(fin) {
        return this._projectCuotas(fin).filter(c => c && c.fecha && c.monto > 0);
    },

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const fin = data.finanzas || { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
        if (!fin.balances) fin.balances = [];
        if (!fin.activos) fin.activos = [];
        const globalConfig = Storage.getModulesGlobal();

        container.innerHTML = `
            ${UI.pageTitle('Finanzas', '<div style="display:flex; gap:8px; flex-wrap:wrap;"><button id="btn-calc-cuotas" class="btn btn-secondary btn-sm">Calcular cuotas</button><button id="btn-add-finance" class="btn btn-primary btn-sm">+ Agregar</button></div>', 'finance')}

            <div class="tabs" style="margin-bottom:var(--spacing-lg);">
                <button class="tab-btn ${this.currentTab === 'situacion' ? 'active' : ''}" data-tab="situacion">Situación Actual</button>
                <button class="tab-btn ${this.currentTab === 'flujo' ? 'active' : ''}" data-tab="flujo">Flujo de Caja</button>
                <button class="tab-btn ${this.currentTab === 'balance' ? 'active' : ''}" data-tab="balance">Balance General</button>
                <button class="tab-btn ${this.currentTab === 'resultado' ? 'active' : ''}" data-tab="resultado">Estado de Resultado</button>
                <button class="tab-btn ${this.currentTab === 'movimientos' ? 'active' : ''}" data-tab="movimientos">Movimientos</button>
            </div>

            <div id="tab-situacion" class="tab-content ${this.currentTab === 'situacion' ? 'active' : ''}">
                ${this._renderSituacion(fin)}
            </div>
            <div id="tab-flujo" class="tab-content ${this.currentTab === 'flujo' ? 'active' : ''}">
                ${this._renderFlujo(fin)}
            </div>
            <div id="tab-balance" class="tab-content ${this.currentTab === 'balance' ? 'active' : ''}">
                ${this._renderBalance(fin)}
            </div>
            <div id="tab-resultado" class="tab-content ${this.currentTab === 'resultado' ? 'active' : ''}">
                ${this._renderResultado(fin)}
            </div>
            <div id="tab-movimientos" class="tab-content ${this.currentTab === 'movimientos' ? 'active' : ''}">
                ${this._renderMovimientos(fin)}
            </div>
        `;

        this._bindEvents(container, email, fin, globalConfig);

        setTimeout(() => {
            this._renderChartsForTab(fin, email, data);
        }, 50);
    },

    /* ==============================================
       TAB 1: SITUACIÓN ACTUAL
       ============================================== */
    _renderSituacion(fin) {
        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const totalDebt = fin.deudas.reduce((s, d) => s + this._deudaSaldoRestante(d), 0);
        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;

        const today = DateUtils.today();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const cuotas = this._cuotasPendientes(fin);
        const upcomingCuotas = cuotas
            .filter(c => c.fecha && c.fecha >= today)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
        const nextCuota = upcomingCuotas[0] || null;

        // Overdue cuotas (solo si hay fechaVence/agenda)
        const overdueCuotas = cuotas.filter(c => c.fecha && c.fecha < today);

        // This month's cuotas
        const { start: monthStart, end: monthEnd } = DateUtils.getMonthRange(currentYear, currentMonth);
        const monthCuotas = cuotas.filter(c => c.fecha && DateUtils.isInRange(c.fecha, monthStart, monthEnd));

        return `
            <!-- Summary Cards -->
            <div class="finance-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Saldo Disponible</p>
                    <p style="font-size:1.5rem; font-weight:700; color:${balance >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                        ${UI.money(balance)}
                    </p>
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Deudas (saldo)</p>
                    <p style="font-size:1.5rem; font-weight:700; color:var(--color-error, #f43f5e);">
                        ${UI.money(totalDebt)}
                    </p>
                    ${overdueCuotas.length > 0 ? `<span class="badge badge-danger" style="margin-top:4px;">${overdueCuotas.length} cuota(s) vencida(s)</span>` : ''}
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Próximo Pago</p>
                    ${nextCuota ? `
                        <p style="font-size:1.1rem; font-weight:600;">${UI.money(nextCuota.monto)}</p>
                        <p class="text-secondary" style="font-size:0.75rem;">${UI.esc(nextCuota.descripcion)} · Cuota ${nextCuota.nCuota}/${nextCuota.totalCuotas} · ${DateUtils.format(nextCuota.fecha, 'short')}</p>
                        <div class="mt-sm"><button class="btn btn-secondary btn-sm btn-cuota-pagar" data-deuda-id="${UI.esc(nextCuota.deudaId)}" data-ncuota="${nextCuota.nCuota}">Marcar cuota pagada</button></div>
                    ` : `<p class="text-secondary" style="font-size:0.85rem;">Sin pagos pendientes</p>`}
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Tasa de Ahorro</p>
                    <p style="font-size:1.5rem; font-weight:700; color:${savingsRate >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                        ${savingsRate.toFixed(1)}%
                    </p>
                </div>
            </div>

            <!-- Income vs Expenses summary -->
            <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card">
                    <h4 class="card-title mb-md">Ingresos por Categoría</h4>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-sit-income-pie"></canvas></div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Gastos por Categoría</h4>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-sit-expense-pie"></canvas></div>
                </div>
            </div>

            <!-- Upcoming payments this month -->
            <div class="card">
                <h4 class="card-title mb-md">Pagos de este mes (${DateUtils.MONTHS[currentMonth]})</h4>
                ${monthCuotas.length > 0 ? `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${monthCuotas.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(c => {
                            const overdue = c.fecha < today;
                            return `
                                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.03); border-left:3px solid ${overdue ? 'var(--color-error, #f43f5e)' : 'var(--color-warning, #fbbf24)'};">
                                    <div>
                                        <strong>${UI.esc(c.descripcion)}</strong>
                                        <span class="text-secondary" style="margin-left:8px; font-size:0.8rem;">
                                            ${c.fecha ? DateUtils.format(c.fecha, 'short') : ''}
                                        </span>
                                        ${overdue ? '<span class="badge badge-danger" style="margin-left:6px;">Vencida</span>' : ''}
                                        <span class="badge" style="margin-left:6px;">Cuota ${c.nCuota}/${c.totalCuotas}</span>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        <span style="font-weight:600; color:var(--color-error, #f43f5e);">${UI.money(c.monto)}</span>
                                        <button class="btn btn-ghost btn-sm btn-cuota-pagar" data-deuda-id="${UI.esc(c.deudaId)}" data-ncuota="${c.nCuota}">Pagada</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : UI.emptyState('Sin pagos programados este mes')}
            </div>

            <!-- Retroalimentación financiera -->
            ${this._getFinancialFeedback('situacion', { balance, savingsRate, totalDebt, overdueDebts: overdueCuotas, totalIncome, totalExpense })}
        `;
    },

    _getFinancialFeedback(tab, data) {
        let feedback = [];
        let type = 'info';

        if (tab === 'situacion') {
            const { balance, savingsRate, totalDebt, overdueDebts, totalIncome, totalExpense } = data;
            if (balance < 0) {
                feedback.push('⚠️ Tienes un saldo negativo. Prioriza reducir gastos no esenciales este mes.');
                type = 'error';
            } else if (balance > 0 && balance < totalIncome * 0.1) {
                feedback.push('💡 Tu saldo es positivo pero bajo. Intenta ahorrar al menos el 10% de tus ingresos.');
                type = 'warning';
            }
            if (savingsRate < 0) {
                feedback.push('📉 Estás gastando más de lo que ganas. Revisa tus gastos y considera reducir categorías no esenciales.');
                type = 'error';
            } else if (savingsRate >= 0 && savingsRate < 10) {
                feedback.push('💪 Estás ahorrando, pero podrías aumentar tu tasa de ahorro al 10-20% para mayor seguridad financiera.');
                type = 'warning';
            } else if (savingsRate >= 20) {
                feedback.push('🎉 ¡Excelente! Tu tasa de ahorro es superior al 20%. Estás en buen camino hacia la libertad financiera.');
                type = 'success';
            }
            if (overdueDebts.length > 0) {
                feedback.push(`🚨 Tienes ${overdueDebts.length} deuda(s) vencida(s). Prioriza pagarlas para evitar intereses y afectar tu historial crediticio.`);
                type = 'error';
            } else if (totalDebt > 0 && totalDebt > totalIncome * 3) {
                feedback.push('⚠️ Tu nivel de deuda es alto (más de 3 veces tus ingresos). Considera un plan de pago agresivo.');
                type = 'warning';
            }
            if (totalIncome > 0 && totalExpense / totalIncome > 0.9) {
                feedback.push('💡 Estás gastando más del 90% de tus ingresos. Intenta reducir gastos fijos o aumentar ingresos.');
                type = 'warning';
            }
        } else if (tab === 'flujo') {
            const { fin, selectedYear, selectedMonth } = data;
            const { start, end } = DateUtils.getMonthRange(selectedYear, selectedMonth);
            const monthIncome = fin.ingresos.filter(i => DateUtils.isInRange(i.fecha, start, end));
            const monthExpenses = fin.gastos.filter(g => DateUtils.isInRange(g.fecha, start, end));
            const totalInc = monthIncome.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
            const totalExp = monthExpenses.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            const saldoBruto = totalInc - totalExp;
            
            if (saldoBruto < 0) {
                feedback.push('📊 Este mes tienes un flujo negativo. Revisa las categorías de gastos más altas y considera ajustes.');
                type = 'error';
            } else if (saldoBruto > 0 && saldoBruto < totalInc * 0.1) {
                feedback.push('💡 Tu flujo es positivo pero conservador. Podrías optimizar para aumentar el ahorro mensual.');
                type = 'warning';
            } else if (saldoBruto >= totalInc * 0.2) {
                feedback.push('✅ Excelente flujo de caja este mes. Estás generando un buen excedente.');
                type = 'success';
            }
            
            const expByCat = {};
            monthExpenses.forEach(g => {
                const cat = g.categoria || 'Otro';
                expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
            });
            const maxCat = Object.entries(expByCat).sort((a, b) => b[1] - a[1])[0];
            if (maxCat && maxCat[1] > totalExp * 0.4) {
                feedback.push(`💡 La categoría "${maxCat[0]}" representa más del 40% de tus gastos. Considera revisar si hay oportunidades de optimización.`);
                if (type !== 'error') type = 'warning';
            }
        } else if (tab === 'balance') {
            const { activos, pasivos, patrimonio } = data;
            if (patrimonio < 0) {
                feedback.push('🚨 Tu patrimonio neto es negativo. Prioriza reducir pasivos y aumentar activos.');
                type = 'error';
            } else if (pasivos > activos * 0.5) {
                feedback.push('⚠️ Tus pasivos representan más del 50% de tus activos. Considera un plan para reducir deudas.');
                type = 'warning';
            } else if (patrimonio > 0 && pasivos < activos * 0.3) {
                feedback.push('✅ Excelente relación activos/pasivos. Tu patrimonio está bien estructurado.');
                type = 'success';
            }
            if (activos === 0) {
                feedback.push('💡 No tienes activos registrados. Considera agregar activos fijos (propiedades, vehículos) para un balance más completo.');
                if (type !== 'error') type = 'warning';
            }
        } else if (tab === 'resultado') {
            const { monthData } = data;
            const allNetos = monthData.map(m => m.neto);
            const avgNeto = allNetos.reduce((s, v) => s + v, 0) / allNetos.length;
            const trend = allNetos[allNetos.length - 1] - allNetos[0];
            
            if (avgNeto < 0) {
                feedback.push('📉 En promedio, tus resultados netos son negativos. Revisa ingresos y gastos para mejorar la rentabilidad.');
                type = 'error';
            } else if (trend < 0 && avgNeto > 0) {
                feedback.push('⚠️ Aunque tienes resultados positivos, hay una tendencia a la baja. Identifica qué está cambiando.');
                type = 'warning';
            } else if (trend > 0 && avgNeto > 0) {
                feedback.push('📈 Excelente tendencia: tus resultados están mejorando mes a mes. Sigue así.');
                type = 'success';
            }
            
            const lastMonth = monthData[monthData.length - 1];
            if (lastMonth && lastMonth.neto < 0) {
                feedback.push('💡 El último mes cerró en negativo. Analiza qué categorías de gastos aumentaron.');
                if (type !== 'error') type = 'warning';
            }
        }

        if (feedback.length === 0) {
            feedback.push('✅ Tu situación financiera se ve estable. Sigue monitoreando tus gastos y mantén el buen hábito de ahorrar.');
            type = 'success';
        }

        return `
            <div class="card mt-lg" style="border-left:4px solid var(--state-${type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success'});">
                <h4 class="card-title mb-sm">💡 Retroalimentación Financiera</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${feedback.map(f => `<p class="text-sm" style="margin:0;">${f}</p>`).join('')}
                </div>
            </div>
        `;
    },

    /* ==============================================
       TAB 2: FLUJO DE CAJA
       ============================================== */
    _renderFlujo(fin) {
        const monthOptions = DateUtils.MONTHS.map((m, i) =>
            ({ value: String(i), label: m })
        );
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let y = currentYear - 3; y <= currentYear + 1; y++) {
            yearOptions.push({ value: String(y), label: String(y) });
        }

        return `
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap; margin-bottom:var(--spacing-md);">
                    <label class="text-secondary" style="font-size:0.85rem;">Período:</label>
                    ${UI.select('flujo_month', monthOptions, String(this.selectedMonth))}
                    ${UI.select('flujo_year', yearOptions, String(this.selectedYear))}
                </div>

                <h4 class="card-title mb-md">Waterfall del Mes</h4>
                <div id="flujo-waterfall"></div>
            </div>

            <div class="card mb-md">
                <h4 class="card-title mb-md">Cuotas del mes (proyección)</h4>
                <div id="flujo-cuotas-mes"></div>
                <p class="text-secondary text-sm mt-sm">Estas cuotas son <strong>proyección</strong>: no se registran como gastos reales hasta que marques “cuota pagada”.</p>
            </div>

            <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:var(--spacing-md);">
                <div class="card">
                    <h4 class="card-title mb-md">Ingresos vs Gastos por Categoría</h4>
                    <div class="chart-container" style="height:280px;"><canvas id="chart-flujo-stacked"></canvas></div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-md">Tendencia Últimos 6 Meses</h4>
                    <div class="chart-container" style="height:280px;"><canvas id="chart-flujo-trend"></canvas></div>
                </div>
            </div>

            <!-- Retroalimentación Flujo de Caja -->
            ${this._getFinancialFeedback('flujo', { fin, selectedYear: this.selectedYear, selectedMonth: this.selectedMonth })}
        `;
    },

    _renderWaterfall(fin) {
        const { start, end } = DateUtils.getMonthRange(this.selectedYear, this.selectedMonth);

        const monthIncome = fin.ingresos.filter(i => DateUtils.isInRange(i.fecha, start, end));
        const monthExpenses = fin.gastos.filter(g => DateUtils.isInRange(g.fecha, start, end));
        const cuotasMes = this._cuotasPendientes(fin).filter(c => c.fecha && DateUtils.isInRange(c.fecha, start, end));

        const totalIncome = monthIncome.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);

        // Group expenses by category
        const expByCat = {};
        monthExpenses.forEach(g => {
            const cat = g.categoria || 'Otro';
            expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
        });
        const cuotasTotal = cuotasMes.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
        if (cuotasTotal > 0) {
            expByCat['Cuotas / Deudas'] = (expByCat['Cuotas / Deudas'] || 0) + cuotasTotal;
        }

        const totalExpense = Object.values(expByCat).reduce((s, v) => s + v, 0);
        const saldoBruto = totalIncome - totalExpense;

        const container = document.getElementById('flujo-waterfall');
        if (!container) return;

        let running = totalIncome;
        let rows = `
            <div style="display:flex; justify-content:space-between; padding:10px 14px; border-radius:8px; background:rgba(52,211,153,0.12); margin-bottom:6px;">
                <span style="font-weight:600;">Total Ingresos</span>
                <span style="font-weight:700; color:var(--color-success, #34d399);">+${UI.money(totalIncome)}</span>
            </div>
        `;

        const catEntries = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
        catEntries.forEach(([cat, amount]) => {
            running -= amount;
            rows += `
                <div style="display:flex; justify-content:space-between; padding:8px 14px; border-radius:6px; background:rgba(244,63,94,0.08); margin-bottom:4px; margin-left:16px;">
                    <span class="text-secondary">${UI.esc(cat)}</span>
                    <span style="color:var(--color-error, #f43f5e);">-${UI.money(amount)}</span>
                </div>
            `;
        });

        rows += `
            <div style="display:flex; justify-content:space-between; padding:10px 14px; border-radius:8px; background:${saldoBruto >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(244,63,94,0.12)'}; margin-top:8px; border-top:2px solid rgba(255,255,255,0.1);">
                <span style="font-weight:700;">Saldo Bruto</span>
                <span style="font-weight:700; color:${saldoBruto >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">${UI.money(saldoBruto)}</span>
            </div>
        `;

        container.innerHTML = rows;
    },

    _renderFlujoCuotasMes(fin) {
        const { start, end } = DateUtils.getMonthRange(this.selectedYear, this.selectedMonth);
        const cuotasMes = this._cuotasPendientes(fin)
            .filter(c => c.fecha && DateUtils.isInRange(c.fecha, start, end))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
        const el = document.getElementById('flujo-cuotas-mes');
        if (!el) return;
        if (cuotasMes.length === 0) {
            el.innerHTML = UI.emptyState('Sin cuotas proyectadas este mes (o faltan fechas en deudas).');
            return;
        }
        const total = cuotasMes.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
        el.innerHTML = `
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width:110px;">Fecha</th>
                            <th>Deuda</th>
                            <th style="width:120px;">Cuota</th>
                            <th style="width:140px; text-align:right;">Monto</th>
                            <th style="width:160px; text-align:right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cuotasMes.map(c => `
                            <tr>
                                <td>${c.fecha ? DateUtils.format(c.fecha, 'short') : '—'}</td>
                                <td><strong>${UI.esc(c.descripcion)}</strong></td>
                                <td>${c.nCuota}/${c.totalCuotas}</td>
                                <td style="text-align:right;"><strong>${UI.money(c.monto)}</strong></td>
                                <td style="text-align:right;">
                                    <button class="btn btn-ghost btn-sm btn-cuota-pagar" data-deuda-id="${UI.esc(c.deudaId)}" data-ncuota="${c.nCuota}">Marcar pagada</button>
                                </td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" class="text-secondary" style="font-weight:600;">Total</td>
                            <td style="text-align:right; font-weight:700;">${UI.money(total)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    _renderFlujoCharts(fin) {
        if (typeof Chart === 'undefined') return;

        // Stacked bar: income categories + expense categories for selected month
        const { start, end } = DateUtils.getMonthRange(this.selectedYear, this.selectedMonth);
        const monthIncome = fin.ingresos.filter(i => DateUtils.isInRange(i.fecha, start, end));
        const monthExpenses = fin.gastos.filter(g => DateUtils.isInRange(g.fecha, start, end));
        const cuotasMes = this._cuotasPendientes(fin).filter(c => c.fecha && DateUtils.isInRange(c.fecha, start, end));

        const incByCat = {};
        monthIncome.forEach(i => {
            const cat = i.categoria || 'Otro';
            incByCat[cat] = (incByCat[cat] || 0) + (parseFloat(i.monto) || 0);
        });
        const expByCat = {};
        monthExpenses.forEach(g => {
            const cat = g.categoria || 'Otro';
            expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
        });
        const cuotasTotal = cuotasMes.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
        if (cuotasTotal > 0) expByCat['Cuotas / Deudas'] = (expByCat['Cuotas / Deudas'] || 0) + cuotasTotal;

        const allCats = [...new Set([...Object.keys(incByCat), ...Object.keys(expByCat)])];
        if (allCats.length > 0) {
            ChartUtils.bar('chart-flujo-stacked', allCats, [
                { label: 'Ingresos', data: allCats.map(c => incByCat[c] || 0), color: '#34d399' },
                { label: 'Egresos (incluye cuotas)', data: allCats.map(c => expByCat[c] || 0), color: '#f43f5e' }
            ]);
        }

        // 6-month trend
        const now = new Date(this.selectedYear, this.selectedMonth, 1);
        const labels = [];
        const incData = [];
        const expData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            labels.push(DateUtils.MONTHS_SHORT[m] + ' ' + y);
            const { start: ms, end: me } = DateUtils.getMonthRange(y, m);
            const mInc = fin.ingresos
                .filter(x => DateUtils.isInRange(x.fecha, ms, me))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            const mExp = fin.gastos
                .filter(x => DateUtils.isInRange(x.fecha, ms, me))
                .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            const mCuotas = this._cuotasPendientes(fin)
                .filter(c => c.fecha && DateUtils.isInRange(c.fecha, ms, me))
                .reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
            incData.push(mInc);
            expData.push(mExp + mCuotas);
        }

        ChartUtils.bar('chart-flujo-trend', labels, [
            { label: 'Ingresos', data: incData, color: '#34d399' },
            { label: 'Egresos (incluye cuotas)', data: expData, color: '#f43f5e' }
        ]);
    },

    /* ==============================================
       TAB 3: BALANCE GENERAL
       ============================================== */
    _renderBalance(fin) {
        const monthOptions = DateUtils.MONTHS.map((m, i) =>
            ({ value: String(i), label: m })
        );
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let y = currentYear - 3; y <= currentYear + 1; y++) {
            yearOptions.push({ value: String(y), label: String(y) });
        }

        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const efectivo = Math.max(totalIncome - totalExpense, 0);
        const activosManuales = (fin.activos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0);
        const activos = activosManuales + efectivo;
        const pasivos = fin.deudas.reduce((s, d) => s + this._deudaSaldoRestante(d), 0);
        const patrimonio = activos - pasivos;

        return `
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap; margin-bottom:var(--spacing-md);">
                    <label class="text-secondary" style="font-size:0.85rem;">Período:</label>
                    ${UI.select('balance_month', monthOptions, String(this.selectedMonth))}
                    ${UI.select('balance_year', yearOptions, String(this.selectedYear))}
                    <button id="btn-add-activo" class="btn btn-ghost btn-sm">+ Activo</button>
                    <button id="btn-save-balance-snapshot" class="btn btn-secondary btn-sm" style="margin-left:auto;">Guardar Snapshot</button>
                </div>

                <!-- Balance Table -->
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid rgba(255,255,255,0.1);">
                            <th style="text-align:left; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">Concepto</th>
                            <th style="text-align:right; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background:rgba(52,211,153,0.06);">
                            <td style="padding:12px; font-weight:700; font-size:0.95rem;">ACTIVOS</td>
                            <td style="padding:12px; text-align:right; font-weight:700; color:var(--color-success, #34d399);">${UI.money(activos)}</td>
                        </tr>
                        ${(fin.activos || []).map(a => `
                            <tr class="finance-item ${a.id ? 'clickable' : ''}" ${a.id ? `data-id="${UI.esc(a.id)}" data-type="activo"` : ''} style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                <td style="padding:8px 12px 8px 28px; font-size:0.85rem;">${UI.esc(a.nombre || a.descripcion || 'Activo')} ${a.tipo ? '(' + UI.esc(a.tipo) + ')' : ''}</td>
                                <td style="padding:8px 12px; text-align:right; font-size:0.85rem;">${UI.money(parseFloat(a.monto) || 0)}</td>
                            </tr>
                        `).join('')}
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                            <td style="padding:8px 12px 8px 28px; font-size:0.85rem;">Efectivo / Disponible</td>
                            <td style="padding:8px 12px; text-align:right; font-size:0.85rem;">${UI.money(efectivo)}</td>
                        </tr>
                        <tr style="background:rgba(244,63,94,0.06); margin-top:8px;">
                            <td style="padding:12px; font-weight:700; font-size:0.95rem;">PASIVOS</td>
                            <td style="padding:12px; text-align:right; font-weight:700; color:var(--color-error, #f43f5e);">${UI.money(pasivos)}</td>
                        </tr>
                        ${fin.deudas.map(d => {
                            const cuotaInfo = d.enCuotas && d.totalCuotas ? ` (Cuota ${d.cuotaActual != null ? d.cuotaActual : 0}/${d.totalCuotas})` : '';
                            const saldo = this._deudaSaldoRestante(d);
                            return `
                            <tr class="finance-item clickable" data-id="${UI.esc(d.id)}" data-type="deuda" style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                <td style="padding:8px 12px 8px 28px; font-size:0.85rem;">${UI.esc(d.descripcion)}${cuotaInfo}</td>
                                <td style="padding:8px 12px; text-align:right; font-size:0.85rem;">${UI.money(saldo)}</td>
                            </tr>
                        `}).join('')}
                        <tr style="border-top:2px solid rgba(255,255,255,0.15); background:${patrimonio >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)'};">
                            <td style="padding:14px 12px; font-weight:700; font-size:1rem;">PATRIMONIO NETO</td>
                            <td style="padding:14px 12px; text-align:right; font-weight:700; font-size:1.1rem; color:${patrimonio >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">${UI.money(patrimonio)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h4 class="card-title mb-md">Activos vs Pasivos</h4>
                <div class="chart-container" style="height:200px;"><canvas id="chart-balance-hbar"></canvas></div>
            </div>

            <!-- Retroalimentación Balance General -->
            ${this._getFinancialFeedback('balance', { activos, pasivos, patrimonio })}
        `;
    },

    _renderBalanceChart(fin) {
        if (typeof Chart === 'undefined') return;

        const totalIncome = fin.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const totalExpense = fin.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        const efectivo = Math.max(totalIncome - totalExpense, 0);
        const activosManuales = (fin.activos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0);
        const activos = activosManuales + efectivo;
        const pasivos = fin.deudas.reduce((s, d) => s + this._deudaSaldoRestante(d), 0);

        ChartUtils.horizontalBar('chart-balance-hbar',
            ['Activos', 'Pasivos'],
            [{
                label: 'Monto',
                data: [activos, pasivos],
                backgroundColor: ['#34d399', '#f43f5e']
            }]
        );
    },

    /* ==============================================
       TAB 4: ESTADO DE RESULTADO
       ============================================== */
    _renderResultado(fin) {
        const now = new Date();
        const months = [];
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth(), label: DateUtils.MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear() });
        }

        // Compute per-month data
        const monthData = months.map(m => {
            const { start, end } = DateUtils.getMonthRange(m.year, m.month);
            const mInc = fin.ingresos.filter(x => DateUtils.isInRange(x.fecha, start, end));
            const mExp = fin.gastos.filter(x => DateUtils.isInRange(x.fecha, start, end));

            const incByCat = {};
            mInc.forEach(i => {
                const cat = i.categoria || 'Otro';
                incByCat[cat] = (incByCat[cat] || 0) + (parseFloat(i.monto) || 0);
            });
            const expByCat = {};
            mExp.forEach(g => {
                const cat = g.categoria || 'Otro';
                expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
            });

            const totalInc = Object.values(incByCat).reduce((s, v) => s + v, 0);
            const totalExp = Object.values(expByCat).reduce((s, v) => s + v, 0);

            return { ...m, incByCat, expByCat, totalInc, totalExp, neto: totalInc - totalExp };
        });

        // All unique categories
        const allIncCats = [...new Set(monthData.flatMap(m => Object.keys(m.incByCat)))];
        const allExpCats = [...new Set(monthData.flatMap(m => Object.keys(m.expByCat)))];

        return `
            <div class="card mb-md">
                <h4 class="card-title mb-md">Estado de Resultados - Últimos 3 Meses</h4>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; min-width:500px;">
                        <thead>
                            <tr style="border-bottom:2px solid rgba(255,255,255,0.1);">
                                <th style="text-align:left; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">Concepto</th>
                                ${monthData.map(m => `<th style="text-align:right; padding:10px 12px; font-size:0.85rem; color:var(--text-secondary);">${m.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Income Section -->
                            <tr style="background:rgba(52,211,153,0.06);">
                                <td style="padding:10px 12px; font-weight:700;">INGRESOS</td>
                                ${monthData.map(m => `<td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--color-success, #34d399);">${UI.money(m.totalInc)}</td>`).join('')}
                            </tr>
                            ${allIncCats.map(cat => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                    <td style="padding:6px 12px 6px 28px; font-size:0.85rem;">${UI.esc(cat)}</td>
                                    ${monthData.map(m => `<td style="padding:6px 12px; text-align:right; font-size:0.85rem;">${UI.money(m.incByCat[cat] || 0)}</td>`).join('')}
                                </tr>
                            `).join('')}

                            <!-- Expense Section -->
                            <tr style="background:rgba(244,63,94,0.06);">
                                <td style="padding:10px 12px; font-weight:700;">(-) GASTOS</td>
                                ${monthData.map(m => `<td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--color-error, #f43f5e);">${UI.money(m.totalExp)}</td>`).join('')}
                            </tr>
                            ${allExpCats.map(cat => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                                    <td style="padding:6px 12px 6px 28px; font-size:0.85rem;">${UI.esc(cat)}</td>
                                    ${monthData.map(m => `<td style="padding:6px 12px; text-align:right; font-size:0.85rem;">${UI.money(m.expByCat[cat] || 0)}</td>`).join('')}
                                </tr>
                            `).join('')}

                            <!-- Net Result -->
                            <tr style="border-top:2px solid rgba(255,255,255,0.15);">
                                <td style="padding:12px; font-weight:700; font-size:1rem;">= RESULTADO NETO</td>
                                ${monthData.map(m => `
                                    <td style="padding:12px; text-align:right; font-weight:700; font-size:1rem; color:${m.neto >= 0 ? 'var(--color-success, #34d399)' : 'var(--color-error, #f43f5e)'};">
                                        ${UI.money(m.neto)}
                                    </td>
                                `).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <h4 class="card-title mb-md">Tendencia Resultado Neto (6 Meses)</h4>
                <div class="chart-container" style="height:260px;"><canvas id="chart-resultado-trend"></canvas></div>
            </div>

            <!-- Retroalimentación Estado de Resultado -->
            ${this._getFinancialFeedback('resultado', { monthData })}
        `;
    },

    _renderResultadoChart(fin) {
        if (typeof Chart === 'undefined') return;

        const now = new Date();
        const labels = [];
        const netData = [];
        const incData = [];
        const expData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            labels.push(DateUtils.MONTHS_SHORT[m] + ' ' + y);
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

        ChartUtils.area('chart-resultado-trend', labels, [
            { label: 'Ingresos', data: incData, color: '#34d399' },
            { label: 'Gastos', data: expData, color: '#f43f5e' },
            { label: 'Neto', data: netData, color: '#818cf8' }
        ]);
    },

    /* ==============================================
       TAB 5: MOVIMIENTOS
       ============================================== */
    _renderMovimientos(fin) {
        const sortOptions = [
            { value: 'fecha-desc', label: 'Fecha (reciente)' },
            { value: 'fecha-asc', label: 'Fecha (antigua)' },
            { value: 'monto-desc', label: 'Monto (mayor)' },
            { value: 'monto-asc', label: 'Monto (menor)' }
        ];

        // Combine and filter
        let allItems = [
            ...fin.ingresos.map(i => ({ ...i, _type: 'ingreso' })),
            ...fin.gastos.map(g => ({ ...g, _type: 'gasto' })),
            ...fin.deudas.map(d => ({ ...d, _type: 'deuda' }))
        ];
        let cuotasPend = this._cuotasPendientes(fin).map(c => ({ ...c, _type: 'cuota' }));

        // Date filter
        if (this.dateFilterStart) {
            allItems = allItems.filter(x => (x.fecha || x.fechaVence || '') >= this.dateFilterStart);
            cuotasPend = cuotasPend.filter(x => (x.fecha || '') >= this.dateFilterStart);
        }
        if (this.dateFilterEnd) {
            allItems = allItems.filter(x => (x.fecha || x.fechaVence || '') <= this.dateFilterEnd);
            cuotasPend = cuotasPend.filter(x => (x.fecha || '') <= this.dateFilterEnd);
        }

        // Sort
        switch (this.sortBy) {
            case 'fecha-desc':
                allItems.sort((a, b) => (b.fecha || b.fechaVence || '').localeCompare(a.fecha || a.fechaVence || ''));
                break;
            case 'fecha-asc':
                allItems.sort((a, b) => (a.fecha || a.fechaVence || '').localeCompare(b.fecha || b.fechaVence || ''));
                break;
            case 'monto-desc':
                allItems.sort((a, b) => (parseFloat(b.monto) || 0) - (parseFloat(a.monto) || 0));
                break;
            case 'monto-asc':
                allItems.sort((a, b) => (parseFloat(a.monto) || 0) - (parseFloat(b.monto) || 0));
                break;
        }

        return `
            <div class="card mb-md">
                <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap;">
                    <label class="text-secondary" style="font-size:0.85rem;">Desde:</label>
                    ${UI.input('mov_start', { type: 'date', value: this.dateFilterStart })}
                    <label class="text-secondary" style="font-size:0.85rem;">Hasta:</label>
                    ${UI.input('mov_end', { type: 'date', value: this.dateFilterEnd })}
                    <label class="text-secondary" style="font-size:0.85rem; margin-left:auto;">Ordenar:</label>
                    ${UI.select('mov_sort', sortOptions, this.sortBy)}
                    <button id="btn-mov-filter" class="btn btn-secondary btn-sm">Aplicar</button>
                    <button id="btn-mov-clear" class="btn btn-ghost btn-sm">Limpiar</button>
                </div>
            </div>

            <!-- Income -->
            <div class="card mb-md">
                <h4 class="card-title mb-sm" style="color:var(--color-success, #34d399);">Ingresos</h4>
                ${allItems.filter(x => x._type === 'ingreso').length > 0 ?
                    allItems.filter(x => x._type === 'ingreso').map(i => `
                        <div class="finance-item" data-id="${i.id}" data-type="ingreso" style="cursor:pointer;">
                            <div class="item-info">
                                <strong>${UI.esc(i.descripcion)}</strong>
                                <span class="text-secondary">${i.categoria || ''} · ${i.fecha ? DateUtils.format(i.fecha, 'short') : ''}</span>
                            </div>
                            <span class="item-amount income">${UI.money(i.monto)}</span>
                        </div>
                    `).join('') : UI.emptyState('Sin ingresos')}
            </div>

            <!-- Expenses -->
            <div class="card mb-md">
                <h4 class="card-title mb-sm" style="color:var(--color-error, #f43f5e);">Gastos</h4>
                ${allItems.filter(x => x._type === 'gasto').length > 0 ?
                    allItems.filter(x => x._type === 'gasto').map(g => `
                        <div class="finance-item" data-id="${g.id}" data-type="gasto" style="cursor:pointer;">
                            <div class="item-info">
                                <strong>${UI.esc(g.descripcion)}</strong>
                                <span class="text-secondary">${g.categoria || ''} · ${g.fecha ? DateUtils.format(g.fecha, 'short') : ''}</span>
                            </div>
                            <span class="item-amount expense">${UI.money(g.monto)}</span>
                        </div>
                    `).join('') : UI.emptyState('Sin gastos')}
            </div>

            <!-- Debts -->
            <div class="card">
                <h4 class="card-title mb-sm" style="color:var(--color-warning, #fbbf24);">Deudas</h4>
                ${allItems.filter(x => x._type === 'deuda').length > 0 ?
                    allItems.filter(x => x._type === 'deuda').map(d => `
                        <div class="finance-item" data-id="${d.id}" data-type="deuda" style="cursor:pointer;">
                            <div class="item-info">
                                <strong>${UI.esc(d.descripcion)}</strong>
                                <span class="text-secondary">Vence: ${d.fechaVence ? DateUtils.format(d.fechaVence, 'short') : 'Sin fecha'} · ${d.porcentaje || 0}%</span>
                            </div>
                            <span class="item-amount expense">${UI.money(d.monto)}</span>
                        </div>
                    `).join('') : UI.emptyState('Sin deudas')}
            </div>

            <div class="card mt-md">
                <h4 class="card-title mb-sm" style="color:var(--color-warning, #fbbf24);">Cuotas (pendientes / proyección)</h4>
                ${cuotasPend.length > 0 ? `
                    ${cuotasPend
                        .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
                        .slice(0, 50)
                        .map(c => `
                            <div class="finance-item" style="cursor:default;">
                                <div class="item-info">
                                    <strong>${UI.esc(c.descripcion)}</strong>
                                    <span class="text-secondary">${c.fecha ? DateUtils.format(c.fecha, 'short') : ''} · Cuota ${c.nCuota}/${c.totalCuotas}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span class="item-amount expense">${UI.money(c.monto)}</span>
                                    <button class="btn btn-ghost btn-sm btn-cuota-pagar" data-deuda-id="${UI.esc(c.deudaId)}" data-ncuota="${c.nCuota}">Pagada</button>
                                </div>
                            </div>
                        `).join('')}
                    ${cuotasPend.length > 50 ? `<p class="text-secondary text-sm mt-sm">Mostrando 50 de ${cuotasPend.length} cuotas (usa filtros de fecha).</p>` : ''}
                ` : UI.emptyState('Sin cuotas proyectadas (o faltan fechas en deudas).')}
            </div>
        `;
    },

    /* ==============================================
       CHART RENDERING DISPATCHER
       ============================================== */
    _renderChartsForTab(fin, email, data) {
        if (typeof Chart === 'undefined') return;

        if (this.currentTab === 'situacion') {
            this._renderSituacionCharts(fin, email);
        } else if (this.currentTab === 'flujo') {
            this._renderWaterfall(fin);
            this._renderFlujoCuotasMes(fin);
            this._renderFlujoCharts(fin);
        } else if (this.currentTab === 'balance') {
            this._renderBalanceChart(fin);
        } else if (this.currentTab === 'resultado') {
            this._renderResultadoChart(fin);
        }
    },

    _renderSituacionCharts(fin, email) {
        const self = this;
        // Income by category pie
        const incByCat = {};
        fin.ingresos.forEach(i => {
            const cat = i.categoria || 'Otro';
            incByCat[cat] = (incByCat[cat] || 0) + (parseFloat(i.monto) || 0);
        });
        if (Object.keys(incByCat).length > 0) {
            ChartUtils.doughnut('chart-sit-income-pie', Object.keys(incByCat), Object.values(incByCat), {
                onClick: (ev, elements, chart) => {
                    if (elements.length === 0) return;
                    const cat = chart.config.data.labels[elements[0].index];
                    self._showCategoryDetail(email, cat, 'ingreso', fin);
                }
            });
        }

        // Expense by category pie
        const expByCat = {};
        fin.gastos.forEach(g => {
            const cat = g.categoria || 'Otro';
            expByCat[cat] = (expByCat[cat] || 0) + (parseFloat(g.monto) || 0);
        });
        if (Object.keys(expByCat).length > 0) {
            ChartUtils.doughnut('chart-sit-expense-pie', Object.keys(expByCat), Object.values(expByCat), {
                onClick: (ev, elements, chart) => {
                    if (elements.length === 0) return;
                    const cat = chart.config.data.labels[elements[0].index];
                    self._showCategoryDetail(email, cat, 'gasto', fin);
                }
            });
        }
    },

    _showCategoryDetail(email, categoryName, type, fin) {
        const items = type === 'ingreso'
            ? (fin.ingresos || []).filter(i => (i.categoria || 'Otro') === categoryName)
            : (fin.gastos || []).filter(g => (g.categoria || 'Otro') === categoryName);
        const total = items.reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        const title = type === 'ingreso' ? `Ingresos: ${categoryName}` : `Gastos: ${categoryName}`;
        const html = `
            <h3 class="modal-title">${title}</h3>
            <p class="text-secondary mb-md">Total: ${UI.money(total)} (${items.length} movimiento${items.length !== 1 ? 's' : ''})</p>
            <div class="finance-list" style="max-height:60vh; overflow:auto;">
                ${items.length > 0 ? items.map(x => `
                    <div class="finance-item" style="padding:8px 0; border-bottom:1px solid var(--border-color, rgba(255,255,255,0.08));">
                        <div class="item-info"><strong>${UI.esc(x.descripcion)}</strong><span class="text-secondary">${x.fecha ? DateUtils.format(x.fecha, 'short') : ''}</span></div>
                        <span class="item-amount ${type === 'ingreso' ? 'income' : 'expense'}">${UI.money(x.monto)}</span>
                    </div>
                `).join('') : '<p class="text-muted">Sin movimientos</p>'}
            </div>
            <div class="modal-actions mt-md"><button id="btn-cat-detail-close" class="btn btn-primary">Cerrar</button></div>
        `;
        UI.showModal(html, { size: 'sm', onReady: () => UI.bindButton('btn-cat-detail-close', () => UI.closeModal()) });
    },

    /* ==============================================
       EVENT BINDING
       ============================================== */
    _bindEvents(container, email, fin, globalConfig) {
        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTab = btn.dataset.tab;
                this.render(container);
            });
        });

        // Add finance item
        UI.bindButton('btn-add-finance', () => {
            this._showAddModal(container, email, globalConfig);
        });
        UI.bindButton('btn-calc-cuotas', () => this._showCalcCuotasModal(container, email));

        // Flujo month/year selectors
        const flujoMonth = document.getElementById('input-flujo_month');
        const flujoYear = document.getElementById('input-flujo_year');
        if (flujoMonth) {
            flujoMonth.addEventListener('change', () => {
                this.selectedMonth = parseInt(flujoMonth.value);
                this.render(container);
            });
        }
        if (flujoYear) {
            flujoYear.addEventListener('change', () => {
                this.selectedYear = parseInt(flujoYear.value);
                this.render(container);
            });
        }

        // Balance month/year selectors
        const balMonth = document.getElementById('input-balance_month');
        const balYear = document.getElementById('input-balance_year');
        if (balMonth) {
            balMonth.addEventListener('change', () => {
                this.selectedMonth = parseInt(balMonth.value);
                this.render(container);
            });
        }
        if (balYear) {
            balYear.addEventListener('change', () => {
                this.selectedYear = parseInt(balYear.value);
                this.render(container);
            });
        }

        // Save balance snapshot
        UI.bindButton('btn-save-balance-snapshot', () => {
            const udata = Storage.getUserData(email);
            const f = udata.finanzas || { ingresos: [], gastos: [], deudas: [], balances: [] };
            if (!f.balances) f.balances = [];

            const totalInc = f.ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
            const totalExp = f.gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            const activos = totalInc - totalExp;
            const pasivos = f.deudas.reduce((s, d) => s + this._deudaSaldoRestante(d), 0);

            const snapshotKey = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}`;
            const existingIdx = f.balances.findIndex(b => b.periodo === snapshotKey);
            const snapshot = {
                periodo: snapshotKey,
                fecha: DateUtils.today(),
                activos: Math.max(activos, 0),
                pasivos,
                patrimonio: activos - pasivos
            };

            if (existingIdx >= 0) {
                f.balances[existingIdx] = snapshot;
            } else {
                f.balances.push(snapshot);
            }

            Storage.saveUserData(email, udata);
            UI.toast('Snapshot de balance guardado', 'success');
        });

        // Movimientos filter
        UI.bindButton('btn-mov-filter', () => {
            const startInput = document.getElementById('input-mov_start');
            const endInput = document.getElementById('input-mov_end');
            const sortInput = document.getElementById('input-mov_sort');
            this.dateFilterStart = startInput?.value || '';
            this.dateFilterEnd = endInput?.value || '';
            this.sortBy = sortInput?.value || 'fecha-desc';
            this.render(container);
        });

        UI.bindButton('btn-mov-clear', () => {
            this.dateFilterStart = '';
            this.dateFilterEnd = '';
            this.sortBy = 'fecha-desc';
            this.render(container);
        });

        // Click finance items to edit/delete (in movimientos tab)
        container.querySelectorAll('.finance-item[data-id]').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                this._showEditModal(container, email, id, type);
            });
        });

        // Marcar cuota pagada (proyección -> gasto real + update deuda)
        container.querySelectorAll('.btn-cuota-pagar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const deudaId = btn.dataset.deudaId;
                const nCuota = parseInt(btn.dataset.ncuota, 10) || 0;
                if (!deudaId || !nCuota) return;

                const udata = Storage.getUserData(email);
                const f = udata.finanzas || { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
                if (!f.gastos) f.gastos = [];
                if (!f.deudas) f.deudas = [];
                const deuda = f.deudas.find(d => d.id === deudaId);
                if (!deuda) { UI.toast('No se encontró la deuda.', 'error'); return; }

                // Encontrar fecha/monto de la cuota desde proyección
                const cuota = this._projectCuotas(f).find(c => c.deudaId === deudaId && c.nCuota === nCuota);
                const montoCuota = cuota?.monto || this._deudaMontoCuota(deuda);
                const fechaCuota = cuota?.fecha || deuda.fechaVence || DateUtils.today();

                // Evitar duplicados por deudaId+nCuota
                const ya = f.gastos.some(g => g && g.deudaId === deudaId && parseInt(g.nCuota, 10) === nCuota);
                if (ya) {
                    UI.toast('Esa cuota ya está registrada como gasto.', 'warning');
                    return;
                }

                const texto = `Se registrará un gasto real por ${UI.money(montoCuota)} (Cuota ${nCuota}/${parseInt(deuda.totalCuotas, 10) || '?'}) y se actualizará el estado de la deuda. ¿Confirmar?`;
                UI.confirm(texto, () => {
                    f.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: `Cuota ${nCuota}/${parseInt(deuda.totalCuotas, 10) || ''} — ${deuda.descripcion || 'Deuda'}`,
                        monto: Math.round(montoCuota),
                        fecha: fechaCuota,
                        categoria: 'Deudas',
                        deudaId,
                        nCuota,
                        totalCuotas: parseInt(deuda.totalCuotas, 10) || undefined
                    });

                    if (!Array.isArray(deuda.cuotasPagadas)) deuda.cuotasPagadas = [];
                    if (!deuda.cuotasPagadas.includes(nCuota)) deuda.cuotasPagadas.push(nCuota);
                    deuda.cuotasPagadas = deuda.cuotasPagadas
                        .map(x => parseInt(x, 10))
                        .filter(x => x > 0)
                        .sort((a, b) => a - b);

                    const ca = this._deudaCuotaActual(deuda);
                    if (nCuota === ca) {
                        deuda.cuotaActual = ca + 1;
                        if (deuda.fechaVence) deuda.fechaVence = this._addMonths(deuda.fechaVence, 1);
                    } else if (deuda.cuotaActual == null) {
                        deuda.cuotaActual = Math.max(ca, nCuota + 1);
                    }

                    udata.finanzas = f;
                    Storage.saveUserData(email, udata);
                    UI.toast('Cuota registrada como pagada.', 'success');
                    this.render(container);
                });
            });
        });
    },

    /* ==============================================
       CÁLCULO DE CUOTAS (evaluar ofertas financieras)
       ============================================== */
    _showCalcCuotasModal(container, email) {
        const self = this;
        const calcCuota = (P, tasaAnual, n) => {
            if (!n || n < 1) return { cuota: 0, total: 0 };
            const r = (parseFloat(tasaAnual) || 0) / 100 / 12;
            const Pval = parseFloat(P) || 0;
            if (r <= 0) return { cuota: Pval / n, total: Pval };
            const factor = Math.pow(1 + r, n);
            const cuota = Pval * (r * factor) / (factor - 1);
            return { cuota, total: cuota * n };
        };
        UI.showModal(`
            <h3 class="modal-title">Calcular cuotas</h3>
            <p class="text-secondary text-sm mb-md">Ingresa los datos de la oferta para ver la cuota mensual y el total. Si la aceptas, puedes añadirla a Deudas.</p>
            <form id="calc-cuotas-form">
                ${UI.formGroup('Descripción', UI.input('cc_desc', { placeholder: 'Ej. Crédito consumo, Tienda X' }))}
                ${UI.formGroup('Monto financiado ($)', UI.input('cc_monto', { type: 'number', placeholder: '0', min: 0, step: 1 }))}
                <div class="form-row">
                    ${UI.formGroup('Nº cuotas', UI.input('cc_cuotas', { type: 'number', placeholder: '12', min: 1, value: '12' }))}
                    ${UI.formGroup('Tasa anual (%)', UI.input('cc_tasa', { type: 'number', placeholder: '0', min: 0, step: '0.1' }))}
                </div>
                ${UI.formGroup('CAE (%) opcional', UI.input('cc_cae', { type: 'number', placeholder: 'Opcional', min: 0, step: '0.1' }))}
                ${UI.formGroup('Fecha primera cuota', UI.input('cc_fecha_primera', { type: 'date', value: DateUtils.today() }))}
                <div id="calc-cuotas-result" class="card mt-md p-md" style="display:none;">
                    <p class="mb-xs"><strong>Cuota mensual:</strong> <span id="cc-result-cuota"></span></p>
                    <p class="mb-xs"><strong>Total a pagar:</strong> <span id="cc-result-total"></span></p>
                </div>
                <div class="modal-actions mt-md">
                    <button type="button" id="btn-cc-calc" class="btn btn-secondary">Calcular</button>
                    <button type="button" id="btn-cc-cancel" class="btn btn-ghost">Cerrar</button>
                    <button type="button" id="btn-cc-add-deuda" class="btn btn-primary" style="display:none;">Añadir a Deudas</button>
                </div>
            </form>
            <p class="text-sm mt-sm"><a href="#finance" id="link-cc-ver-deudas">Ver Deudas en Finanzas</a></p>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-cc-cancel', () => UI.closeModal());
                UI.bindButton('btn-cc-calc', () => {
                    const monto = document.getElementById('input-cc_monto')?.value;
                    const cuotas = parseInt(document.getElementById('input-cc_cuotas')?.value, 10) || 0;
                    const tasa = document.getElementById('input-cc_tasa')?.value || document.getElementById('input-cc_cae')?.value || '0';
                    const { cuota, total } = calcCuota(monto, tasa, cuotas);
                    const resultEl = document.getElementById('calc-cuotas-result');
                    const cuotaEl = document.getElementById('cc-result-cuota');
                    const totalEl = document.getElementById('cc-result-total');
                    const btnAdd = document.getElementById('btn-cc-add-deuda');
                    if (resultEl && cuotaEl && totalEl) {
                        resultEl.style.display = 'block';
                        cuotaEl.textContent = UI.money(cuota);
                        totalEl.textContent = UI.money(total);
                        if (btnAdd && monto && cuotas > 0) btnAdd.style.display = 'inline-block';
                    }
                });
                UI.bindButton('btn-cc-add-deuda', () => {
                    const desc = document.getElementById('input-cc_desc')?.value?.trim() || 'Crédito (calculado)';
                    const monto = parseFloat(document.getElementById('input-cc_monto')?.value) || 0;
                    const cuotas = parseInt(document.getElementById('input-cc_cuotas')?.value, 10) || 12;
                    const tasa = document.getElementById('input-cc_tasa')?.value || document.getElementById('input-cc_cae')?.value || '0';
                    const fechaPrimera = document.getElementById('input-cc_fecha_primera')?.value || DateUtils.today();
                    const { cuota, total } = calcCuota(monto, tasa, cuotas);
                    const udata = Storage.getUserData(email);
                    if (!udata.finanzas) udata.finanzas = { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
                    const lastPayment = DateUtils.addDays(fechaPrimera, (cuotas - 1) * 30);
                    udata.finanzas.deudas.push({
                        id: DateUtils.generateId(),
                        descripcion: desc,
                        monto: total,
                        fechaVence: lastPayment,
                        porcentaje: parseFloat(tasa) || 0,
                        enCuotas: true,
                        cuotaActual: 1,
                        totalCuotas: cuotas,
                        fechaPrimeraCuota: fechaPrimera,
                        montoPorCuota: Math.round(cuota * 100) / 100,
                        notas: 'Añadido desde cálculo de cuotas'
                    });
                    Storage.saveUserData(email, udata);
                    if (typeof CalendarPage !== 'undefined' && CalendarPage.addAutoEvent) {
                        CalendarPage.addAutoEvent(email, `Pago: ${desc}`, fechaPrimera, 'Urgente', 'finanzas');
                    }
                    UI.closeModal();
                    UI.toast('Añadido a Deudas. Ver en Situación actual.', 'success');
                    self.currentTab = 'situacion';
                    self.render(container);
                });
                document.getElementById('link-cc-ver-deudas')?.addEventListener('click', () => {
                    UI.closeModal();
                    window.location.hash = '#finance';
                    self.currentTab = 'situacion';
                    self.render(document.getElementById('page-container'));
                });
            }
        });
    },

    /* ==============================================
       ADD MODAL
       ============================================== */
    _showAddModal(container, email, globalConfig, preselectType) {
        const catsIngreso = globalConfig.categoriasIngresos || ['Salario', 'Segundo ingreso', 'Freelance', 'Ventas', 'Inversiones', 'Otro'];
        const catsGasto = globalConfig.categoriasGastos || [];
        const tiposActivo = ['Cuenta banco', 'Efectivo', 'Inversión', 'Propiedad', 'Vehículo', 'Otro'];
        UI.showModal(`
            <h3 class="modal-title">Agregar Registro Financiero</h3>
            <form id="finance-add-form">
                ${UI.formGroup('Tipo', UI.select('fin_type', [
                    { value: 'ingreso', label: 'Ingreso' },
                    { value: 'gasto', label: 'Gasto' },
                    { value: 'deuda', label: 'Deuda' },
                    { value: 'activo', label: 'Activo' }
                ], (preselectType || 'ingreso'), { required: true }))}
                ${UI.formGroup('Descripción', UI.input('fin_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto', UI.input('fin_monto', { type: 'number', placeholder: '0', required: true, min: 0, step: '1' }))}
                ${UI.formGroup('Fecha', UI.input('fin_fecha', { type: 'date', value: DateUtils.today() }))}
                ${UI.formGroup('Categoría', UI.select('fin_cat',
                    catsIngreso, '', { placeholder: 'Seleccionar' }))}
                <div id="fin-extra-fields"></div>
                <div class="modal-actions">
                    <button type="button" id="btn-fin-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-fin-save" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            onReady: () => {
                const typeSelect = document.getElementById('input-fin_type');
                const extraDiv = document.getElementById('fin-extra-fields');
                const updateCatAndExtra = () => {
                    if (typeSelect.value === 'deuda') {
                        extraDiv.innerHTML = `
                            ${UI.formGroup('Fecha Vencimiento', UI.input('fin_vence', { type: 'date' }))}
                            ${UI.formGroup('Interés (%)', UI.input('fin_pct', { type: 'number', step: '0.1', min: 0, max: 100 }))}
                            <div class="form-group">
                                <label><input type="checkbox" id="input-fin_en_cuotas" /> En cuotas</label>
                            </div>
                            <div id="fin-cuotas-fields" style="display:none;">
                                ${UI.formGroup('Cuota actual', UI.input('fin_cuota_actual', { type: 'number', min: 1, placeholder: 'Ej: 3' }))}
                                ${UI.formGroup('Total cuotas', UI.input('fin_total_cuotas', { type: 'number', min: 1, placeholder: 'Ej: 12' }))}
                                ${UI.formGroup('Fecha primera cuota', UI.input('fin_fecha_primera', { type: 'date' }))}
                                ${UI.formGroup('Monto por cuota', UI.input('fin_monto_cuota', { type: 'number', min: 0, step: '0.01', placeholder: '0' }))}
                                ${UI.formGroup('Notas', UI.input('fin_notas_deuda', { placeholder: 'Opcional' }))}
                            </div>
                        `;
                        const enCuotasCb = document.getElementById('input-fin_en_cuotas');
                        const cuotasFields = document.getElementById('fin-cuotas-fields');
                        if (enCuotasCb) enCuotasCb.addEventListener('change', () => { cuotasFields.style.display = enCuotasCb.checked ? 'block' : 'none'; });
                    } else if (typeSelect.value === 'activo') {
                        extraDiv.innerHTML = `
                            ${UI.formGroup('Tipo (opcional)', UI.select('fin_activo_tipo', tiposActivo.map(t => ({ value: t, label: t })), '', { placeholder: 'Seleccionar' }))}
                        `;
                    } else {
                        extraDiv.innerHTML = '';
                    }
                    const catSelect = document.getElementById('input-fin_cat');
                    const cats = typeSelect.value === 'ingreso'
                        ? catsIngreso
                        : (typeSelect.value === 'gasto' ? catsGasto : typeSelect.value === 'activo' ? [] : []);
                    if (catSelect) {
                        catSelect.innerHTML = `<option value="">Seleccionar</option>` +
                            (typeSelect.value === 'activo' ? '' : cats.map(c => `<option value="${UI.esc(c)}">${UI.esc(c)}</option>`).join(''));
                        catSelect.closest('.form-group').style.display = typeSelect.value === 'activo' ? 'none' : '';
                    }
                };
                typeSelect.addEventListener('change', updateCatAndExtra);
                if (preselectType) typeSelect.value = preselectType;
                updateCatAndExtra();

                UI.bindButton('btn-fin-cancel', () => UI.closeModal());
                UI.bindButton('btn-fin-save', () => {
                    const form = document.getElementById('finance-add-form');
                    if (!form) return;
                    const formData = new FormData(form);
                    const fd = {};
                    formData.forEach((value, key) => { fd[key] = value; });
                    
                    if (!fd.fin_desc?.trim() || !fd.fin_monto) {
                        UI.toast('Completa descripción y monto', 'error');
                        return;
                    }
                    const udata = Storage.getUserData(email);
                    if (!udata.finanzas) udata.finanzas = { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
                    if (!udata.finanzas.activos) udata.finanzas.activos = [];
                    const item = {
                        id: DateUtils.generateId(),
                        descripcion: fd.fin_desc,
                        monto: parseFloat(fd.fin_monto) || 0,
                        fecha: fd.fin_fecha || DateUtils.today(),
                        categoria: fd.fin_cat || ''
                    };
                    if (fd.fin_type === 'ingreso') {
                        udata.finanzas.ingresos.push(item);
                    } else if (fd.fin_type === 'gasto') {
                        udata.finanzas.gastos.push(item);
                    } else if (fd.fin_type === 'activo') {
                        udata.finanzas.activos.push({
                            id: item.id,
                            nombre: fd.fin_desc.trim(),
                            monto: item.monto,
                            tipo: fd.fin_activo_tipo || ''
                        });
                    } else {
                        item.fechaVence = fd.fin_vence || '';
                        item.porcentaje = parseFloat(fd.fin_pct) || 0;
                        item.pagos = [];
                        if (document.getElementById('input-fin_en_cuotas')?.checked) {
                            item.enCuotas = true;
                            item.cuotaActual = parseInt(fd.fin_cuota_actual, 10) || 0;
                            item.totalCuotas = parseInt(fd.fin_total_cuotas, 10) || 0;
                            item.fechaPrimeraCuota = fd.fin_fecha_primera || '';
                            item.montoPorCuota = parseFloat(fd.fin_monto_cuota) || 0;
                            item.notas = fd.fin_notas_deuda || '';
                        }
                        udata.finanzas.deudas.push(item);
                        if (item.fechaVence) {
                            CalendarPage.addAutoEvent(email, `Pago: ${item.descripcion}`, item.fechaVence, 'Urgente', 'finanzas');
                        }
                    }
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Registro guardado', 'success');
                    this.render(container);
                });
            }
        });
    },

    /* ==============================================
       EDIT MODAL
       ============================================== */
    _showEditModal(container, email, id, type) {
        const data = Storage.getUserData(email);
        let item;
        if (type === 'ingreso') item = data.finanzas.ingresos.find(i => i.id === id);
        else if (type === 'gasto') item = data.finanzas.gastos.find(g => g.id === id);
        else if (type === 'activo') item = (data.finanzas.activos || []).find(a => a.id === id);
        else item = data.finanzas.deudas.find(d => d.id === id);

        if (!item) return;

        const isActivo = type === 'activo';
        const nombreVal = isActivo ? (item.nombre || item.descripcion || '') : item.descripcion;

        UI.showModal(`
            <h3 class="modal-title">Editar ${isActivo ? 'Activo' : type}</h3>
            <form id="finance-edit-form">
                ${UI.formGroup(isActivo ? 'Nombre' : 'Descripción', UI.input('ed_desc', { value: nombreVal, required: true }))}
                ${UI.formGroup('Monto', UI.input('ed_monto', { type: 'number', value: item.monto, required: true, min: 0 }))}
                ${!isActivo ? `
                    ${UI.formGroup('Fecha', UI.input('ed_fecha', { type: 'date', value: item.fecha || '' }))}
                    ${UI.formGroup('Categoría', UI.input('ed_cat', { value: item.categoria || '' }))}
                ` : UI.formGroup('Tipo (opcional)', UI.input('ed_tipo', { value: item.tipo || '' }))}
                ${type === 'deuda' ? `
                    ${UI.formGroup('Fecha Vencimiento', UI.input('ed_vence', { type: 'date', value: item.fechaVence || '' }))}
                    ${UI.formGroup('Interés (%)', UI.input('ed_pct', { type: 'number', value: item.porcentaje || 0, step: '0.1' }))}
                    <div class="form-group"><label><input type="checkbox" id="ed_en_cuotas" ${item.enCuotas ? 'checked' : ''} /> En cuotas</label></div>
                    <div id="ed-cuotas-fields" style="display:${item.enCuotas ? 'block' : 'none'};">
                        ${UI.formGroup('Cuota actual', UI.input('ed_cuota_actual', { type: 'number', value: item.cuotaActual ?? '', min: 1 }))}
                        ${UI.formGroup('Total cuotas', UI.input('ed_total_cuotas', { type: 'number', value: item.totalCuotas ?? '', min: 1 }))}
                        ${UI.formGroup('Fecha primera cuota', UI.input('ed_fecha_primera', { type: 'date', value: item.fechaPrimeraCuota || '' }))}
                        ${UI.formGroup('Monto por cuota', UI.input('ed_monto_cuota', { type: 'number', value: item.montoPorCuota ?? '', min: 0, step: '0.01' }))}
                        ${UI.formGroup('Notas', UI.input('ed_notas_deuda', { value: item.notas || '' }))}
                    </div>
                ` : ''}
                <div class="modal-actions">
                    <button type="button" id="btn-ed-delete" class="btn btn-danger">Eliminar</button>
                    <button type="button" id="btn-ed-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            onReady: () => {
                const edEnCuotas = document.getElementById('ed_en_cuotas');
                const edCuotasFields = document.getElementById('ed-cuotas-fields');
                if (edEnCuotas && edCuotasFields) edEnCuotas.addEventListener('change', () => { edCuotasFields.style.display = edEnCuotas.checked ? 'block' : 'none'; });
                UI.bindButton('btn-ed-cancel', () => UI.closeModal());
                UI.bindButton('btn-ed-delete', () => {
                    const udata = Storage.getUserData(email);
                    if (type === 'ingreso') udata.finanzas.ingresos = udata.finanzas.ingresos.filter(i => i.id !== id);
                    else if (type === 'gasto') udata.finanzas.gastos = udata.finanzas.gastos.filter(g => g.id !== id);
                    else if (type === 'activo') udata.finanzas.activos = (udata.finanzas.activos || []).filter(a => a.id !== id);
                    else udata.finanzas.deudas = udata.finanzas.deudas.filter(d => d.id !== id);
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Registro eliminado', 'success');
                    this.render(container);
                });
                UI.bindForm('finance-edit-form', (fd) => {
                    const udata = Storage.getUserData(email);
                    let target;
                    if (type === 'ingreso') target = udata.finanzas.ingresos.find(i => i.id === id);
                    else if (type === 'gasto') target = udata.finanzas.gastos.find(g => g.id === id);
                    else if (type === 'activo') target = (udata.finanzas.activos || []).find(a => a.id === id);
                    else target = udata.finanzas.deudas.find(d => d.id === id);
                    if (target) {
                        if (isActivo) {
                            target.nombre = fd.ed_desc;
                            target.monto = parseFloat(fd.ed_monto) || 0;
                            target.tipo = fd.ed_tipo || '';
                        } else {
                            target.descripcion = fd.ed_desc;
                            target.monto = parseFloat(fd.ed_monto) || 0;
                            target.fecha = fd.ed_fecha;
                            target.categoria = fd.ed_cat;
                            if (type === 'deuda') {
                                target.fechaVence = fd.ed_vence || '';
                                target.porcentaje = parseFloat(fd.ed_pct) || 0;
                                target.enCuotas = document.getElementById('ed_en_cuotas')?.checked || false;
                                if (target.enCuotas) {
                                    target.cuotaActual = parseInt(fd.ed_cuota_actual, 10) || 0;
                                    target.totalCuotas = parseInt(fd.ed_total_cuotas, 10) || 0;
                                    target.fechaPrimeraCuota = fd.ed_fecha_primera || '';
                                    target.montoPorCuota = parseFloat(fd.ed_monto_cuota) || 0;
                                    target.notas = fd.ed_notas_deuda || '';
                                }
                            }
                        }
                    }
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Registro actualizado', 'success');
                    this.render(container);
                });
            }
        });
    }
};
