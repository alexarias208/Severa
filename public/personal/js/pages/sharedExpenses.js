/* ============================================
   GASTOS COMPARTIDOS — Rendición de cuentas
   Participantes: { nombre, ingreso }[].
   Gastos: { concepto, tipo, categoria, fecha, monto, pagadorIdx, reparto, repartoModo?, repartoPorcentajes? }.
   repartoModo: 'igual' | 'ingresos' | 'personalizado'
   ============================================ */

const SharedExpensesPage = {
    _charts: {
        participantes: null,
        conceptos: null,
        categorias: null
    },
    _gastosGroupBy: 'fecha',

    _nombre(p) {
        return p == null ? '' : (typeof p === 'string' ? p : (p.nombre || p.email || 'Invitado'));
    },
    _ingreso(p) {
        if (p == null) return 0;
        if (typeof p !== 'object') return 0;
        const v = p.ingreso ?? p.ingresoMensual;
        return parseFloat(v) || 0;
    },

    /** Normaliza participante a { nombre, ingreso }. */
    _normalizeParticipante(p) {
        if (typeof p === 'string') return { nombre: p, ingreso: 0 };
        return { nombre: p?.nombre || p?.email || 'Invitado', ingreso: this._ingreso(p) };
    },

    /** Migra formato antiguo. Participantes a { nombre, ingreso }[]. Gastos con repartoModo (default 'igual'). */
    migrateToRendidorFormat(shared) {
        if (!shared) return false;
        if (!shared.participantes) shared.participantes = [];
        if (!shared.gastos) shared.gastos = [];
        let changed = false;

        const needParticipantesMigration = shared.participantes.length > 0 && (
            typeof shared.participantes[0] === 'string' || !('ingreso' in shared.participantes[0])
        );
        if (needParticipantesMigration) {
            shared.participantes = shared.participantes.map(p => this._normalizeParticipante(p));
            changed = true;
        }

        const needGastosMigration = shared.gastos.length > 0 && (shared.gastos[0].quienPago !== undefined || shared.gastos[0].pagadorIdx === undefined);
        if (needGastosMigration) {
            shared.gastos = shared.gastos.map(g => {
                const concepto = g.descripcion || g.concepto || 'Sin concepto';
                const monto = Math.round(parseFloat(g.monto) || 0);
                let pagadorIdx = 0;
                if (typeof g.quienPago === 'number') {
                    pagadorIdx = g.quienPago;
                } else {
                    const idx = shared.participantes.findIndex(p => {
                        const n = this._nombre(p);
                        return n === g.quienPago || (p && (p.email === g.quienPago || p.nombre === g.quienPago));
                    });
                    pagadorIdx = idx >= 0 ? idx : 0;
                }
                const reparto = shared.participantes.map((_, i) => i);
                return {
                    concepto,
                    tipo: g.tipo || 'gasto',
                    categoria: g.categoria || 'Otro',
                    fecha: g.fecha || DateUtils.today(),
                    monto,
                    pagadorIdx,
                    reparto,
                    repartoModo: 'igual'
                };
            });
            changed = true;
        }
        shared.gastos.forEach(g => {
            if (!g.repartoModo) { g.repartoModo = 'igual'; changed = true; }
            if (!g.categoria) { g.categoria = 'Otro'; changed = true; }
            if (!g.fecha) { g.fecha = DateUtils.today(); changed = true; }
        });
        if (!Array.isArray(shared.periodosCerrados)) {
            shared.periodosCerrados = [];
            changed = true;
        }
        if (!Array.isArray(shared.transferenciasReales)) {
            shared.transferenciasReales = [];
            changed = true;
        }
        return changed;
    },

    /** Etiqueta legible tipo "Enero 2026" desde YYYY-MM-DD */
    _etiquetaDesdeFecha(dateStr) {
        const d = DateUtils.fromDateStr(dateStr || DateUtils.today());
        const m = d.getMonth();
        const y = d.getFullYear();
        return `${DateUtils.MONTHS[m]} ${y}`;
    },

    /**
     * Cálculo completo de rendición (saldos, transferencias, detalle por persona).
     * @param {Array} gastos Lista de gastos a considerar (ya filtrada por período si aplica)
     */
    _computeRendicionCompleta(participantes, gastos, transferenciasReales = []) {
        if (!participantes || participantes.length === 0) return null;
        const pagado = participantes.map(() => 0);
        const debe = participantes.map(() => 0);
        gastos.forEach(g => {
            pagado[g.pagadorIdx] += g.monto || 0;
            const cuotas = this._cuotaPorParticipante(g, participantes);
            Object.entries(cuotas).forEach(([idx, amount]) => {
                debe[Number(idx)] = (debe[Number(idx)] || 0) + amount;
            });
        });
        const balanceBase = participantes.map((_, i) => Math.round(pagado[i] - debe[i]));

        // Ajuste por transferencias reales: A -> B incrementa balance de A y reduce el de B
        const balance = [...balanceBase];
        (transferenciasReales || []).forEach(t => {
            const de = Number.isFinite(t.de) ? t.de : parseInt(t.de, 10);
            const a = Number.isFinite(t.a) ? t.a : parseInt(t.a, 10);
            const monto = Math.round(parseFloat(t.monto) || 0);
            if (!(monto > 0)) return;
            if (de >= 0 && de < balance.length) balance[de] = Math.round((balance[de] || 0) + monto);
            if (a >= 0 && a < balance.length) balance[a] = Math.round((balance[a] || 0) - monto);
        });
        const deudores = balance.map((b, i) => ({ i, b })).filter(x => x.b < 0).sort((a, b) => a.b - b.b);
        const acreedores = balance.map((b, i) => ({ i, b })).filter(x => x.b > 0).sort((a, b) => b.b - a.b);
        const transferencias = [];
        const deudoresCopy = deudores.map(x => ({ i: x.i, b: x.b }));
        const acreedoresCopy = acreedores.map(x => ({ i: x.i, b: x.b }));
        let d = 0; let a = 0;
        while (d < deudoresCopy.length && a < acreedoresCopy.length) {
            const deudor = deudoresCopy[d];
            const acreedor = acreedoresCopy[a];
            const monto = Math.round(Math.min(-deudor.b, acreedor.b));
            if (monto > 0) {
                transferencias.push({ de: deudor.i, a: acreedor.i, monto });
                deudor.b += monto;
                acreedor.b -= monto;
            }
            if (deudor.b >= -0.5) d++;
            if (acreedor.b <= 0.5) a++;
        }
        const tipoEtiqueta = (t) => (t === 'abono' ? ' (Abono)' : ' (Gasto)');
        const detalle = participantes.map((p, idx) => {
            const nombre = this._nombre(p);
            const pagadoList = gastos.filter(g => g.pagadorIdx === idx).map(g => ({ concepto: g.concepto, tipo: g.tipo || 'gasto', monto: g.monto }));
            const debidoList = [];
            gastos.forEach(g => {
                const cuotas = this._cuotaPorParticipante(g, participantes);
                const miCuota = cuotas[idx];
                if (miCuota != null && miCuota > 0) debidoList.push({ concepto: g.concepto, tipo: g.tipo || 'gasto', monto: Math.round(miCuota) });
            });
            const totalPagado = pagadoList.reduce((s, x) => s + x.monto, 0);
            const totalDebido = debidoList.reduce((s, x) => s + x.monto, 0);
            return { nombre, pagado: pagadoList, debido: debidoList, totalPagado, totalDebido, balance: Math.round(balance[idx] || 0) };
        });
        return { pagado, debe, balanceBase, balance, transferencias, detalle };
    },

    _filterGastosPorRango(gastos, desde, hasta) {
        return (gastos || []).filter(g => {
            if (!g.fecha) return false;
            return g.fecha >= desde && g.fecha <= hasta;
        });
    },

    _filterTransferenciasPorRango(transferencias, desde, hasta) {
        return (transferencias || []).filter(t => {
            if (!t.fecha) return false;
            return t.fecha >= desde && t.fecha <= hasta;
        });
    },

    _cloneJson(x) {
        return JSON.parse(JSON.stringify(x));
    },

    _renderHistorial(container, email, periodosCerrados) {
        const wrap = document.getElementById('rendidor-historial-list');
        if (!wrap) return;
        const list = periodosCerrados || [];
        if (list.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><p>Aún no hay períodos cerrados. Usa «Cerrar período» con el rango de fechas deseado.</p></div>';
            return;
        }
        const sorted = [...list].sort((a, b) => (b.cerradoEn || '').localeCompare(a.cerradoEn || ''));
        wrap.innerHTML = `
            <div class="table-wrapper">
                <table class="table rendidor-table-stack">
                    <thead>
                        <tr>
                            <th>Período</th>
                            <th style="width:220px;">Rango</th>
                            <th style="width:160px;">Cerrado</th>
                            <th style="width:140px; text-align:right;">Total gastos</th>
                            <th style="width:160px; text-align:right;">Total transferencias</th>
                            <th style="width:260px; text-align:right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map(s => {
                            const cerrado = s.cerradoEn
                                ? `${DateUtils.format(s.cerradoEn.slice(0, 10), 'short')} ${s.cerradoEn.slice(11, 16) || ''}`
                                : '—';
                            const totalGastos = Math.round((s.gastos || []).filter(g => (g.tipo || 'gasto') !== 'abono').reduce((acc, g) => acc + (g.monto || 0), 0));
                            const totalTrans = Math.round((s.transferenciasReales || []).reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0));
                            return `
                                <tr>
                                    <td data-label="Período"><strong>${UI.esc(s.etiqueta || 'Período')}</strong></td>
                                    <td data-label="Rango"><span class="text-secondary">${UI.esc(s.desde || '')} → ${UI.esc(s.hasta || '')}</span></td>
                                    <td data-label="Cerrado"><span class="text-secondary">${UI.esc(cerrado)}</span></td>
                                    <td data-label="Total gastos" style="text-align:right;"><strong>$${this._formatPesos(totalGastos)}</strong></td>
                                    <td data-label="Total transferencias" style="text-align:right;"><strong>$${this._formatPesos(totalTrans)}</strong></td>
                                    <td data-label="Acciones" style="text-align:right;">
                                        <div class="flex gap-sm" style="justify-content:flex-end; flex-wrap:wrap;">
                                            <button type="button" class="btn btn-ghost btn-sm rendidor-hist-ver" data-snap-id="${UI.esc(s.id)}">Ver detalle</button>
                                            <button type="button" class="btn btn-ghost btn-sm rendidor-hist-fin" data-snap-id="${UI.esc(s.id)}">Registrar en Finanzas</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const refreshList = () => {
            const d = Storage.getUserData(email);
            const p = (d.gastosCompartidos?.periodosCerrados || []);
            this._renderHistorial(container, email, p);
        };

        wrap.querySelectorAll('.rendidor-hist-ver').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.snapId;
                const d = Storage.getUserData(email);
                const snap = (d.gastosCompartidos?.periodosCerrados || []).find(x => x.id === id);
                if (snap) this._showPeriodoDetalleModal(snap);
            });
        });
        wrap.querySelectorAll('.rendidor-hist-fin').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.snapId;
                const d = Storage.getUserData(email);
                const snap = (d.gastosCompartidos?.periodosCerrados || []).find(x => x.id === id);
                if (snap) this._registrarFinanzasConfirm(email, snap, refreshList);
            });
        });
    },

    _showPeriodoDetalleModal(snap) {
        const part = snap.participantes || [];
        const tipoEtiqueta = (t) => (t === 'abono' ? ' (Abono)' : ' (Gasto)');
        const detalleHtml = (snap.detalle || []).map(d => {
            const lineasPagado = (d.pagado || []).length === 0
                ? '<div class="rendidor-detalle-linea concepto">— No pagó ningún gasto</div>'
                : (d.pagado || []).map(x => `<div class="rendidor-detalle-linea concepto">${UI.esc(x.concepto)}${tipoEtiqueta(x.tipo)}: $${this._formatPesos(x.monto)}</div>`).join('');
            const lineasDebido = (d.debido || []).length === 0
                ? '<div class="rendidor-detalle-linea concepto">— No participó en ningún gasto</div>'
                : (d.debido || []).map(x => `<div class="rendidor-detalle-linea concepto">${UI.esc(x.concepto)}${tipoEtiqueta(x.tipo)}: $${this._formatPesos(x.monto)}</div>`).join('');
            const saldoText = d.balance > 0 ? `A favor: $${this._formatPesos(d.balance)}` : d.balance < 0 ? `En contra: $${this._formatPesos(Math.abs(d.balance))}` : 'En cero';
            return `<div class="rendidor-detalle-participante mb-md">
                <h4>${UI.esc(d.nombre)}</h4>
                <div>Pagó:</div>${lineasPagado}
                <div class="rendidor-detalle-total">Total pagado: $${this._formatPesos(d.totalPagado)}</div>
                <div class="mt-sm">Le corresponde:</div>${lineasDebido}
                <div class="rendidor-detalle-total">Total debido: $${this._formatPesos(d.totalDebido)} — Saldo: ${saldoText}</div>
            </div>`;
        }).join('');

        const balanceHtml = (snap.balance || []).map((b, i) => {
            const nom = part[i] ? this._nombre(part[i]) : `Persona ${i}`;
            const cls = b > 0 ? 'favor' : b < 0 ? 'contra' : '';
            const text = b > 0 ? `A favor: $${this._formatPesos(b)}` : b < 0 ? `En contra: $${this._formatPesos(Math.abs(b))}` : 'En cero';
            return `<div class="rendidor-balance ${cls}">${UI.esc(nom)}: ${text}</div>`;
        }).join('');

        const transHtml = (snap.transferencias || []).length === 0
            ? '<p class="text-secondary">Nadie debe nada.</p>'
            : (snap.transferencias || []).map(t => {
                const deN = t.deNombre || (part[t.de] ? this._nombre(part[t.de]) : '?');
                const aN = t.aNombre || (part[t.a] ? this._nombre(part[t.a]) : '?');
                return `<div class="rendidor-transfer">${UI.esc(deN)} debe transferir <strong>$${this._formatPesos(t.monto)}</strong> a ${UI.esc(aN)}</div>`;
            }).join('');

        const trReales = (snap.transferenciasReales || []);
        const transRealesHtml = trReales.length === 0
            ? '<p class="text-secondary text-sm">Sin transferencias registradas en este período.</p>'
            : `<div class="rendidor-transfers-real">` + trReales.map(t => {
                const deN = part[t.de] ? this._nombre(part[t.de]) : '?';
                const aN = part[t.a] ? this._nombre(part[t.a]) : '?';
                const fecha = t.fecha || '—';
                const nota = (t.nota || '').trim();
                return `<div class="rendidor-transfer">
                    <div><strong>${UI.esc(deN)}</strong> → ${UI.esc(aN)} · <strong>$${this._formatPesos(t.monto)}</strong></div>
                    <div class="text-secondary text-sm">${UI.esc(fecha)}${nota ? ' · ' + UI.esc(nota) : ''}</div>
                </div>`;
            }).join('') + `</div>`;

        const tablaHtml = '<table class="rendidor-table"><thead><tr><th>Participante</th><th>Total pagado</th><th>Total debido</th><th>Saldo</th></tr></thead><tbody>' +
            (snap.detalle || []).map(d => {
                const saldoStr = d.balance > 0 ? '$' + this._formatPesos(d.balance) + ' (a favor)' : d.balance < 0 ? '$' + this._formatPesos(Math.abs(d.balance)) + ' (en contra)' : 'En cero';
                return `<tr><td>${UI.esc(d.nombre)}</td><td>$${this._formatPesos(d.totalPagado)}</td><td>$${this._formatPesos(d.totalDebido)}</td><td>${saldoStr}</td></tr>`;
            }).join('') + '</tbody></table>';

        const gastosOnly = (snap.gastos || []).filter(g => (g.tipo || 'gasto') !== 'abono');
        const totalGastos = Math.round(gastosOnly.reduce((s, g) => s + (g.monto || 0), 0));
        const totalTrans = Math.round((snap.transferenciasReales || []).reduce((s, t) => s + (parseFloat(t.monto) || 0), 0));
        const saldosMini = (snap.balance || []).map((b, i) => {
            const nom = part[i] ? this._nombre(part[i]) : `Persona ${i}`;
            const cls = b > 0 ? 'favor' : b < 0 ? 'contra' : '';
            const txt = b > 0 ? `+$${this._formatPesos(b)}` : b < 0 ? `-$${this._formatPesos(Math.abs(b))}` : '$0';
            return `<div class="rendidor-balance ${cls}" style="padding:6px 10px; margin:4px 0;">${UI.esc(nom)}: ${txt}</div>`;
        }).join('');

        UI.showModal(`
            <h3 class="modal-title">${UI.esc(snap.etiqueta || 'Período cerrado')}</h3>
            <p class="text-secondary text-sm mb-md">${UI.esc(snap.desde || '')} → ${UI.esc(snap.hasta || '')} · Cierre ${snap.cerradoEn ? UI.esc(new Date(snap.cerradoEn).toLocaleString('es-CL')) : '—'}</p>
            <p class="text-sm text-secondary mb-md">${(snap.gastos || []).length} movimiento(s) incluido(s) en el cierre.</p>

            <div class="cards-grid cards-grid-sm mb-md" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:var(--spacing-md);">
                <div class="finance-stat-card blue">
                    <div class="finance-stat-value">$${this._formatPesos(totalGastos)}</div>
                    <div class="finance-stat-label">Total gastos (consumo real)</div>
                </div>
                <div class="finance-stat-card purple">
                    <div class="finance-stat-value">$${this._formatPesos(totalTrans)}</div>
                    <div class="finance-stat-label">Total transferencias</div>
                </div>
                <div class="finance-stat-card ${((snap.balance || []).some(x => x < 0)) ? 'red' : 'green'}">
                    <div class="finance-stat-value">Saldos</div>
                    <div class="finance-stat-label">Neto final (gastos + transferencias)</div>
                    <div class="mt-sm">${saldosMini || '<div class="text-secondary text-sm">—</div>'}</div>
                </div>
            </div>

            <div class="cards-grid mb-lg" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
                <div class="card">
                    <h4 class="card-title mb-sm">Gastos por categoría</h4>
                    <div id="cierre-chart-cat-empty" class="text-secondary text-sm" style="display:none;">Sin datos suficientes.</div>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-cierre-cat"></canvas></div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-sm">Pagos por participante</h4>
                    <div id="cierre-chart-pay-empty" class="text-secondary text-sm" style="display:none;">Sin datos suficientes.</div>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-cierre-pay"></canvas></div>
                </div>
                <div class="card">
                    <h4 class="card-title mb-sm">Balance neto</h4>
                    <div id="cierre-chart-bal-empty" class="text-secondary text-sm" style="display:none;">Sin datos suficientes.</div>
                    <div class="chart-container" style="height:220px;"><canvas id="chart-cierre-bal"></canvas></div>
                </div>
            </div>

            <h4 class="mb-sm">Saldos</h4>
            <div class="mb-md">${balanceHtml}</div>
            <h4 class="mb-sm">Transferencias sugeridas</h4>
            <div class="mb-md">${transHtml}</div>
            <h4 class="mb-sm">Transferencias registradas</h4>
            <div class="mb-md">${transRealesHtml}</div>
            <h4 class="mb-sm">Detalle por persona</h4>
            <div style="max-height:280px;overflow-y:auto;">${detalleHtml}</div>
            <h4 class="mt-md mb-sm">Tabla resumen</h4>
            <div class="table-wrapper">${tablaHtml.replace('class=\"rendidor-table\"', 'class=\"table rendidor-table-stack\"')}</div>
        `, {
            size: 'lg',
            onReady: () => {
                this._renderCierreCharts(snap);
                if (this._onThemeChangedForCierre) {
                    document.removeEventListener('theme-changed', this._onThemeChangedForCierre);
                }
                this._onThemeChangedForCierre = () => this._renderCierreCharts(snap);
                document.addEventListener('theme-changed', this._onThemeChangedForCierre);
            }
        });
    },

    _renderCierreCharts(snap) {
        if (typeof Chart === 'undefined' || typeof ChartUtils === 'undefined') return;
        // Limpiar instancias previas (mismo modal, distintos cierres)
        ChartUtils.destroy('chart-cierre-cat');
        ChartUtils.destroy('chart-cierre-pay');
        ChartUtils.destroy('chart-cierre-bal');

        const gastos = (snap.gastos || []).filter(g => (g.tipo || 'gasto') !== 'abono');
        const participantes = snap.participantes || [];

        // 1) Categorías (donut)
        const catMap = {};
        gastos.forEach(g => {
            const c = (g.categoria || 'Otro').trim() || 'Otro';
            catMap[c] = (catMap[c] || 0) + (g.monto || 0);
        });
        const catLabels = Object.keys(catMap);
        const catVals = catLabels.map(k => Math.round(catMap[k] || 0));
        const catEmpty = document.getElementById('cierre-chart-cat-empty');
        if (catLabels.length >= 1 && catVals.some(v => v > 0)) {
            if (catEmpty) catEmpty.style.display = 'none';
            ChartUtils.doughnut('chart-cierre-cat', catLabels, catVals, { title: '' });
        } else {
            if (catEmpty) catEmpty.style.display = '';
        }

        // 2) Pagos por participante (donut)
        const pay = participantes.map(() => 0);
        gastos.forEach(g => {
            const idx = Number.isFinite(g.pagadorIdx) ? g.pagadorIdx : parseInt(g.pagadorIdx, 10);
            if (idx >= 0 && idx < pay.length) pay[idx] += (g.monto || 0);
        });
        const payLabels = participantes.map(p => this._nombre(p));
        const payVals = pay.map(v => Math.round(v || 0));
        const payEmpty = document.getElementById('cierre-chart-pay-empty');
        if (payLabels.length >= 1 && payVals.some(v => v > 0)) {
            if (payEmpty) payEmpty.style.display = 'none';
            ChartUtils.doughnut('chart-cierre-pay', payLabels, payVals, { title: '' });
        } else {
            if (payEmpty) payEmpty.style.display = '';
        }

        // 3) Balance neto (bar)
        const bal = (snap.balance || []).map(v => Math.round(v || 0));
        const balEmpty = document.getElementById('cierre-chart-bal-empty');
        if (payLabels.length >= 1 && bal.length === payLabels.length && bal.some(v => v !== 0)) {
            if (balEmpty) balEmpty.style.display = 'none';
            ChartUtils.bar('chart-cierre-bal', payLabels, [{ label: 'Balance', data: bal }], { title: '' });
        } else {
            if (balEmpty) balEmpty.style.display = '';
        }
    },

    _registrarFinanzasConfirm(email, snap, onDone) {
        const participantes = snap.participantes || [];
        if (participantes.length === 0) {
            UI.toast('Este cierre no tiene participantes.', 'warning');
            return;
        }

        const opts = participantes.map((p, i) => `<option value="${i}">${UI.esc(this._nombre(p))}</option>`).join('');
        const fechaFin = snap.hasta || DateUtils.today();

        const getNeto = (idx) => {
            const i = parseInt(idx, 10) || 0;
            const det = (snap.detalle || [])[i];
            let totalPagado = Math.round(det?.totalPagado || 0);
            if (!totalPagado) {
                // Fallback: calcular desde gastos del snapshot si el detalle no existe
                totalPagado = Math.round((snap.gastos || [])
                    .filter(g => (g.tipo || 'gasto') !== 'abono' && g.pagadorIdx === i)
                    .reduce((s, g) => s + (g.monto || 0), 0));
            }
            const tr = snap.transferenciasReales || [];
            const recibidas = Math.round(tr.filter(t => t.a === i).reduce((s, t) => s + (parseFloat(t.monto) || 0), 0));
            const enviadas = Math.round(tr.filter(t => t.de === i).reduce((s, t) => s + (parseFloat(t.monto) || 0), 0));
            // netoUsuario = totalPagado - transferenciasRecibidas + transferenciasEnviadas
            return { neto: Math.round(totalPagado - recibidas + enviadas), totalPagado, recibidas, enviadas };
        };

        UI.showModal(`
            <h3 class="modal-title">Registrar en Finanzas</h3>
            <p class="text-secondary text-sm mb-md">Se registrará tu <strong>neto personal</strong> del cierre (esto <strong>considera transferencias</strong> registradas en el período).</p>
            <form id="rendidor-finanzas-form">
                ${UI.formGroup('¿Qué participante eres en este cierre?', `<select id="rendidor-finanzas-idx" name="idx" class="form-select" required>${opts}</select>`)}
                <div class="card" style="padding:12px; margin-top: var(--spacing-md);">
                    <div class="text-secondary text-sm">Neto a registrar (gastos + transferencias)</div>
                    <div id="rendidor-finanzas-neto" style="font-size: var(--font-2xl); font-weight: var(--font-weight-bold); margin-top:4px;">—</div>
                    <div id="rendidor-finanzas-exp" class="text-secondary text-sm" style="margin-top:6px;"></div>
                </div>
                <div class="modal-actions mt-md">
                    <button type="button" id="rendidor-finanzas-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Registrar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('rendidor-finanzas-cancel', () => UI.closeModal());
                const sel = document.getElementById('rendidor-finanzas-idx');
                const netoEl = document.getElementById('rendidor-finanzas-neto');
                const expEl = document.getElementById('rendidor-finanzas-exp');
                const render = () => {
                    const idx = sel?.value || '0';
                    const { neto, totalPagado, recibidas, enviadas } = getNeto(idx);
                    const abs = Math.abs(neto);
                    const sign = neto > 0 ? '+' : neto < 0 ? '−' : '';
                    if (netoEl) netoEl.textContent = neto === 0 ? '$0' : `${sign}$${this._formatPesos(abs)}`;
                    if (expEl) {
                        expEl.textContent = `Pagado: $${this._formatPesos(totalPagado)} · Recibidas: $${this._formatPesos(recibidas)} · Enviadas: $${this._formatPesos(enviadas)} · Fecha ${fechaFin}`;
                    }
                };
                if (sel) sel.addEventListener('change', render);
                render();

                const form = document.getElementById('rendidor-finanzas-form');
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const idx = sel?.value || '0';
                    const { neto } = getNeto(idx);
                    const nombre = this._nombre(participantes[parseInt(idx, 10) || 0]);
                    if (!neto) {
                        UI.toast('Tu neto es $0; no hay nada que registrar.', 'info');
                        UI.closeModal();
                        return;
                    }
                    const abs = Math.abs(neto);
                    const tipo = neto > 0 ? 'gasto' : 'ingreso';
                    const texto = neto > 0
                        ? `Se registrará un <strong>gasto</strong> por $${this._formatPesos(abs)} (tu neto pagado) en fecha ${fechaFin}. Esto considera transferencias. ¿Confirmar?`
                        : `Se registrará un <strong>ingreso</strong> por $${this._formatPesos(abs)} (reembolso neto) en fecha ${fechaFin}. Esto considera transferencias. ¿Confirmar?`;

                    UI.confirm(texto, () => {
                        const udata = Storage.getUserData(email);
                        if (!udata.finanzas) udata.finanzas = { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
                        if (!udata.finanzas.ingresos) udata.finanzas.ingresos = [];
                        if (!udata.finanzas.gastos) udata.finanzas.gastos = [];
                        const item = {
                            id: DateUtils.generateId(),
                            descripcion: `Gastos compartidos — ${snap.etiqueta || 'Período'} (${snap.desde} a ${snap.hasta}) · Neto ${nombre}`,
                            monto: Math.round(abs),
                            fecha: fechaFin,
                            categoria: 'Otro'
                        };
                        if (tipo === 'gasto') udata.finanzas.gastos.push(item);
                        else udata.finanzas.ingresos.push(item);
                        Storage.saveUserData(email, udata);
                        UI.toast(`Registrado en Finanzas como ${tipo}. Revisa #finance → Movimientos.`, 'success');
                        UI.closeModal();
                        if (typeof onDone === 'function') onDone();
                    });
                });
            }
        });
    },

    _openCerrarPeriodoModal(container, email, participantes, gastos) {
        if (participantes.length === 0) {
            UI.toast('Añade participantes antes de cerrar un período.', 'warning');
            return;
        }
        const today = DateUtils.today();
        const monthStart = today.substring(0, 8) + '01';
        const defaultEtiqueta = this._etiquetaDesdeFecha(monthStart);

        UI.showModal(`
            <h3 class="modal-title">Cerrar período (historial)</h3>
            <p class="text-secondary text-sm mb-md">Se guardará una copia de solo lectura con totales y saldos para el rango elegido (solo gastos con fecha dentro del rango). No se borran datos actuales.</p>
            <form id="rendidor-cerrar-periodo-form">
                ${UI.formGroup('Etiqueta del período', UI.input('cp_etiqueta', { value: defaultEtiqueta, placeholder: 'Ej: Enero 2026', required: true }))}
                <div class="form-row">
                    ${UI.formGroup('Desde', UI.input('cp_desde', { type: 'date', value: monthStart, required: true }))}
                    ${UI.formGroup('Hasta', UI.input('cp_hasta', { type: 'date', value: today, required: true }))}
                </div>
                <div class="modal-actions mt-md">
                    <button type="button" id="rendidor-cp-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar cierre</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('rendidor-cp-cancel', () => UI.closeModal());
                const form = document.getElementById('rendidor-cerrar-periodo-form');
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const fd = new FormData(form);
                    const desde = (fd.get('cp_desde') || '').toString();
                    const hasta = (fd.get('cp_hasta') || '').toString();
                    const etiqueta = (fd.get('cp_etiqueta') || '').trim();
                    if (!desde || !hasta) {
                        UI.toast('Indica desde y hasta.', 'error');
                        return;
                    }
                    if (desde > hasta) {
                        UI.toast('La fecha «Desde» no puede ser posterior a «Hasta».', 'error');
                        return;
                    }
                    const gastosRango = this._filterGastosPorRango(gastos, desde, hasta);
                    if (gastosRango.length === 0) {
                        UI.toast('No hay gastos en ese rango de fechas.', 'warning');
                        return;
                    }
                    const dataNow = Storage.getUserData(email);
                    const transNow = dataNow.gastosCompartidos?.transferenciasReales || [];
                    const transRango = this._filterTransferenciasPorRango(transNow, desde, hasta);

                    const comp = this._computeRendicionCompleta(participantes, gastosRango, transRango);
                    if (!comp) {
                        UI.toast('No se pudo calcular el cierre.', 'error');
                        return;
                    }
                    const snapshot = {
                        id: DateUtils.generateId(),
                        etiqueta: etiqueta || this._etiquetaDesdeFecha(desde),
                        desde,
                        hasta,
                        cerradoEn: new Date().toISOString(),
                        participantes: this._cloneJson(participantes),
                        gastos: this._cloneJson(gastosRango),
                        transferenciasReales: this._cloneJson(transRango),
                        balance: comp.balance,
                        transferencias: comp.transferencias.map(t => ({
                            de: t.de,
                            a: t.a,
                            monto: t.monto,
                            deNombre: this._nombre(participantes[t.de]),
                            aNombre: this._nombre(participantes[t.a])
                        })),
                        detalle: this._cloneJson(comp.detalle)
                    };
                    const data = Storage.getUserData(email);
                    if (!data.gastosCompartidos) data.gastosCompartidos = { participantes: [], gastos: [], periodosCerrados: [] };
                    if (!Array.isArray(data.gastosCompartidos.periodosCerrados)) data.gastosCompartidos.periodosCerrados = [];
                    data.gastosCompartidos.periodosCerrados.unshift(snapshot);
                    Storage.saveUserData(email, data);
                    UI.closeModal();
                    UI.toast(`Período «${snapshot.etiqueta}» guardado en el historial.`, 'success');
                    const p = data.gastosCompartidos.periodosCerrados;
                    this._renderHistorial(container, email, p);
                });
            }
        });
    },

    /** Dado un gasto y la lista de participantes, devuelve el monto que le corresponde a cada índice en reparto. */
    _cuotaPorParticipante(g, participantes) {
        const reparto = g.reparto || [];
        if (reparto.length === 0) return {};
        const monto = g.monto || 0;
        const modo = g.repartoModo || 'igual';
        const out = {};
        if (modo === 'igual') {
            const cadaUno = monto / reparto.length;
            reparto.forEach(idx => { out[idx] = (out[idx] || 0) + cadaUno; });
            return out;
        }
        if (modo === 'ingresos') {
            const totalIng = reparto.reduce((s, idx) => s + this._ingreso(participantes[idx]), 0);
            if (totalIng <= 0) {
                const cadaUno = monto / reparto.length;
                reparto.forEach(idx => { out[idx] = (out[idx] || 0) + cadaUno; });
            } else {
                reparto.forEach(idx => {
                    out[idx] = (out[idx] || 0) + monto * (this._ingreso(participantes[idx]) / totalIng);
                });
            }
            return out;
        }
        if (modo === 'personalizado' && Array.isArray(g.repartoPorcentajes) && g.repartoPorcentajes.length === reparto.length) {
            let totalPct = g.repartoPorcentajes.reduce((s, p) => s + (parseFloat(p) || 0), 0);
            if (totalPct <= 0) totalPct = 100;
            reparto.forEach((idx, j) => {
                const pct = parseFloat(g.repartoPorcentajes[j]) || 0;
                out[idx] = (out[idx] || 0) + monto * (pct / totalPct);
            });
            return out;
        }
        const cadaUno = monto / reparto.length;
        reparto.forEach(idx => { out[idx] = (out[idx] || 0) + cadaUno; });
        return out;
    },

    _formatPesos(num) {
        const entero = Math.round(Number(num));
        return entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    _save(email, participantes, gastos, transferenciasReales) {
        const data = Storage.getUserData(email);
        if (!data.gastosCompartidos) data.gastosCompartidos = { participantes: [], gastos: [] };
        data.gastosCompartidos.participantes = participantes;
        data.gastosCompartidos.gastos = gastos;
        if (transferenciasReales !== undefined) {
            data.gastosCompartidos.transferenciasReales = transferenciasReales;
        } else if (!Array.isArray(data.gastosCompartidos.transferenciasReales)) {
            data.gastosCompartidos.transferenciasReales = [];
        }
        Storage.saveUserData(email, data);
    },

    _load(email) {
        const data = Storage.getUserData(email);
        const shared = data.gastosCompartidos || { participantes: [], gastos: [] };
        if (this.migrateToRendidorFormat(shared)) {
            data.gastosCompartidos = shared;
            Storage.saveUserData(email, data);
        }
        return {
            participantes: [...(shared.participantes || [])],
            gastos: (shared.gastos || []).map(g => ({ ...g, reparto: [...(g.reparto || [])] })),
            transferenciasReales: (shared.transferenciasReales || []).map(t => ({ ...t })),
            periodosCerrados: [...(shared.periodosCerrados || [])]
        };
    },

    render(container) {
        const email = Auth.getCurrentEmail();
        const { participantes, gastos, transferenciasReales, periodosCerrados } = this._load(email);

        container.innerHTML = `
            ${UI.pageTitle('Gastos Compartidos — Rendición de cuentas', '')}

            <div class="rendidor-wrap rendidor-layout">
                <div class="rendidor-main">
                ${this._htmlResumenKpis(participantes, gastos, transferenciasReales)}
                <section class="card mb-md">
                    <h2 class="card-title mb-sm">Participantes</h2>
                    <p class="text-secondary text-sm mb-sm">Ingreso mensual se usa para repartir gastos &quot;Por ingresos&quot; (ej. gastos de casa).</p>
                    <div class="rendidor-row">
                        <input type="text" id="rendidor-nombre" class="form-input" placeholder="Nombre" style="flex:1; min-width:120px;" />
                        <input type="number" id="rendidor-ingreso" class="form-input" placeholder="Ingreso $ (opcional)" min="0" step="1" style="width:140px;" />
                        <button type="button" id="rendidor-add-part" class="btn btn-primary">Añadir</button>
                    </div>
                    <div class="rendidor-participants" id="rendidor-participantes"></div>
                </section>

                <section class="card mb-md">
                    <h2 class="card-title mb-sm">Nuevo gasto</h2>
                    <div class="rendidor-row">
                        <label class="rendidor-label">Concepto:</label>
                        <input type="text" id="rendidor-concepto" class="form-input" placeholder="Ej: Cabaña, Supermercado, Combustible" style="flex:1; min-width:180px;" />
                    </div>
                    <div class="rendidor-row">
                        <label class="rendidor-label">Tipo:</label>
                        <select id="rendidor-tipo" class="form-select" style="width:auto;">
                            <option value="gasto">Gasto (pago normal)</option>
                            <option value="abono">Abono (depósito / anticipo)</option>
                        </select>
                    </div>
                    <div class="rendidor-row">
                        <label class="rendidor-label">Categoría:</label>
                        <select id="rendidor-categoria" class="form-select" style="width:auto;">
                            <option value="Comida">Comida</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Hogar / Servicios">Hogar / Servicios</option>
                            <option value="Servicios">Servicios (internet, luz, agua)</option>
                            <option value="Entretenimiento">Entretenimiento</option>
                            <option value="Salud">Salud</option>
                            <option value="Educación">Educación</option>
                            <option value="Viaje">Viaje</option>
                            <option value="Otro" selected>Otro</option>
                        </select>
                    </div>
                    <div class="rendidor-row">
                        <label class="rendidor-label">Monto ($):</label>
                        <input type="number" id="rendidor-monto" class="form-input" min="0" step="1" placeholder="0" style="width:120px;" />
                    </div>
                    <div class="rendidor-row">
                        <label class="rendidor-label">Fecha:</label>
                        <input type="date" id="rendidor-fecha" class="form-input" style="width:160px;" />
                    </div>
                    <div class="rendidor-row">
                        <label class="rendidor-label">Pagó:</label>
                        <select id="rendidor-pago" class="form-select" style="width:auto;"></select>
                    </div>
                    <p class="text-secondary text-sm mt-xs mb-sm">Repartir entre (marca solo quienes participan en este gasto):</p>
                    <div class="rendidor-row" id="rendidor-reparto"></div>
                    <div class="rendidor-row mt-sm">
                        <label class="rendidor-label">Cómo repartir:</label>
                        <select id="rendidor-reparto-modo" class="form-select" style="width:auto;">
                            <option value="igual">Todos por igual</option>
                            <option value="ingresos">Proporcional a ingresos</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>
                    <div id="rendidor-reparto-personalizado" class="rendidor-personalizado-wrap" style="display:none;">
                        <p class="text-secondary text-sm mt-xs mb-xs">Porcentaje por participante (debe sumar 100%):</p>
                        <div id="rendidor-reparto-pct"></div>
                    </div>
                    <button type="button" id="rendidor-add-gasto" class="btn btn-primary mt-sm">Añadir gasto</button>
                </section>

                <section class="card mb-md">
                    <h2 class="card-title mb-sm">Gastos cargados</h2>
                    <div class="flex items-center justify-between gap-sm mb-sm" style="flex-wrap:wrap;">
                        <div class="text-secondary text-sm">Orden / agrupación</div>
                        <select id="rendidor-gastos-group" class="form-select" style="width:auto;">
                            <option value="fecha">Por fecha</option>
                            <option value="categoria">Por categoría</option>
                            <option value="pagador">Por pagador</option>
                        </select>
                    </div>
                    <div id="rendidor-gastos"></div>
                </section>

                <section class="card mb-md">
                    <div class="flex items-center justify-between gap-sm" style="flex-wrap:wrap;">
                        <h2 class="card-title mb-sm" style="margin:0;">Transferencias / liquidaciones</h2>
                        <button type="button" id="rendidor-add-transfer" class="btn btn-secondary btn-sm">Registrar transferencia</button>
                    </div>
                    <p class="text-secondary text-sm mb-sm">Úsalas cuando alguien transfiere para “ponerse al día”. No cuentan como gasto real, pero ajustan saldos.</p>
                    <div id="rendidor-transferencias-reales"></div>
                </section>

                <section class="card mb-md" id="rendidor-historial-section">
                    <h2 class="card-title mb-sm">Historial de períodos cerrados</h2>
                    <p class="text-secondary text-sm mb-sm">Cierres inmutables: totales, saldos y transferencias al momento del cierre. Los cambios posteriores en la lista de gastos no modifican un cierre guardado.</p>
                    <div id="rendidor-historial-list"></div>
                </section>

                <div class="flex gap-sm mt-md" style="flex-wrap:wrap;">
                    <button type="button" id="rendidor-rendir" class="btn btn-primary btn-lg">Rendir cuentas</button>
                    <button type="button" id="rendidor-cerrar-periodo" class="btn btn-secondary btn-lg">Cerrar período</button>
                </div>

                <div class="card mt-lg rendidor-results" id="rendidor-resultados" style="display:none;">
                    <div class="rendidor-export-actions">
                        <button type="button" id="rendidor-btn-excel" class="btn btn-secondary">Descargar Excel</button>
                        <button type="button" id="rendidor-btn-pdf" class="btn btn-secondary">PDF por participante</button>
                    </div>
                    <div class="rendidor-tabs">
                        <button type="button" class="rendidor-tab active" data-vista="detalle">Detalle por persona</button>
                        <button type="button" class="rendidor-tab" data-vista="tabla">Tabla resumen</button>
                        <button type="button" class="rendidor-tab" data-vista="saldos">Saldos y transferencias</button>
                    </div>
                    <div id="rendidor-vista-detalle" class="rendidor-panel activa">
                        <h3 class="card-title mb-sm">Detalle por participante</h3>
                        <div id="rendidor-detalle-participantes"></div>
                    </div>
                    <div id="rendidor-vista-tabla" class="rendidor-panel">
                        <h3 class="card-title mb-sm">Tabla de rendición</h3>
                        <div id="rendidor-tabla"></div>
                    </div>
                    <div id="rendidor-vista-saldos" class="rendidor-panel">
                        <h3 class="card-title mb-sm">Saldos</h3>
                        <div id="rendidor-saldos"></div>
                        <h3 class="card-title mt-md mb-sm">Transferencias para cuadrar</h3>
                        <div id="rendidor-transferencias"></div>
                    </div>
                </div>
                </div>
                <aside class="rendidor-sidebar" aria-label="Gráficos de gastos">
                    <div class="card mb-md">
                        <h3 class="card-title mb-sm">Total por participante</h3>
                        <div class="rendidor-chart-wrap" style="position:relative; height:220px;">
                            <canvas id="rendidor-chart-participantes"></canvas>
                        </div>
                    </div>
                    <div class="card mb-md">
                        <h3 class="card-title mb-sm">Gastos por concepto</h3>
                        <div class="rendidor-chart-wrap" style="position:relative; height:220px;">
                            <canvas id="rendidor-chart-conceptos"></canvas>
                        </div>
                    </div>
                    <div class="card mb-md">
                        <h3 class="card-title mb-sm">Gastos por categoría</h3>
                        <div class="rendidor-chart-wrap" style="position:relative; height:220px;">
                            <canvas id="rendidor-chart-categorias"></canvas>
                        </div>
                    </div>
                </aside>
            </div>
        `;

        this._renderParticipantes(container, email, participantes, gastos);
        this._renderReparto(participantes);
        this._renderGastosList(container, email, participantes, gastos);
        this._renderTransferenciasRealesList(container, email, participantes, transferenciasReales, gastos);
        this._renderHistorial(container, email, periodosCerrados);
        this._bindDraftGuardOnce();
        this._bindRendir(container, email, participantes, gastos, transferenciasReales);
        document.getElementById('rendidor-gastos-group')?.addEventListener('change', (e) => {
            this._gastosGroupBy = e.target.value || 'fecha';
            this._renderGastosList(container, email, participantes, gastos);
        });
        const groupSel = document.getElementById('rendidor-gastos-group');
        if (groupSel) groupSel.value = this._gastosGroupBy || 'fecha';
        this._bindTabs();
        this._bindExport(container, email, participantes, gastos);
        this._renderCharts(participantes, gastos);
    },

    _htmlResumenKpis(participantes, gastos, transferenciasReales) {
        const gastosOnly = (gastos || []).filter(g => (g.tipo || 'gasto') !== 'abono');
        const totalGastos = Math.round(gastosOnly.reduce((s, g) => s + (g.monto || 0), 0));
        const totalTrans = Math.round((transferenciasReales || []).reduce((s, t) => s + (parseFloat(t.monto) || 0), 0));
        const comp = (participantes && participantes.length > 0)
            ? this._computeRendicionCompleta(participantes, gastosOnly, transferenciasReales || [])
            : null;
        const bal = comp?.balance || [];
        const balMini = (participantes || []).length === 0
            ? '<div class="text-secondary text-sm">—</div>'
            : (participantes || []).map((p, i) => {
                const b = Math.round(bal[i] || 0);
                const cls = b > 0 ? 'favor' : b < 0 ? 'contra' : '';
                const txt = b > 0 ? `+$${this._formatPesos(b)}` : b < 0 ? `-$${this._formatPesos(Math.abs(b))}` : '$0';
                return `<div class="rendidor-balance ${cls}" style="padding:6px 10px; margin:4px 0;">${UI.esc(this._nombre(p))}: ${txt}</div>`;
            }).join('');

        return `
            <div class="cards-grid cards-grid-sm mb-md" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:var(--spacing-md);">
                <div class="finance-stat-card blue">
                    <div class="finance-stat-value">$${this._formatPesos(totalGastos)}</div>
                    <div class="finance-stat-label">Total gastos (consumo real)</div>
                </div>
                <div class="finance-stat-card purple">
                    <div class="finance-stat-value">$${this._formatPesos(totalTrans)}</div>
                    <div class="finance-stat-label">Total transferencias</div>
                </div>
                <div class="finance-stat-card ${bal.some(x => x < 0) ? 'red' : 'green'}">
                    <div class="finance-stat-value">Saldos</div>
                    <div class="finance-stat-label">Neto actual (gastos + transferencias)</div>
                    <div class="mt-sm">${balMini}</div>
                </div>
            </div>
        `;
    },

    /** Aviso al cerrar pestaña/recargar si hay texto en nuevo gasto sin enviar */
    _bindDraftGuardOnce() {
        if (this._draftGuardBound) return;
        this._draftGuardBound = true;
        window.addEventListener('beforeunload', (e) => {
            if (window.location.hash !== '#shared-expenses') return;
            const c = document.getElementById('rendidor-concepto')?.value?.trim();
            const m = document.getElementById('rendidor-monto')?.value;
            if (c || m) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    },

    _renderCharts(participantes, gastos) {
        const gastosOnly = (gastos || []).filter(g => g.tipo !== 'abono');
        if (typeof Chart === 'undefined') return;

        // Destruir instancias anteriores para evitar fugas y permitir re-render dinámico
        if (this._charts.participantes) {
            this._charts.participantes.destroy();
            this._charts.participantes = null;
        }
        if (this._charts.conceptos) {
            this._charts.conceptos.destroy();
            this._charts.conceptos = null;
        }
        if (this._charts.categorias) {
            this._charts.categorias.destroy();
            this._charts.categorias = null;
        }

        const ctxPart = document.getElementById('rendidor-chart-participantes');
        if (ctxPart && participantes.length > 0 && gastosOnly.length > 0) {
            const totalPorPart = participantes.map((_, idx) => {
                let total = 0;
                gastosOnly.forEach(g => {
                    const cuotas = this._cuotaPorParticipante(g, participantes);
                    total += cuotas[idx] || 0;
                });
                return total;
            });
            this._charts.participantes = new Chart(ctxPart.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: participantes.map(p => this._nombre(p)),
                    datasets: [{ label: 'Total ($)', data: totalPorPart, backgroundColor: 'rgba(99, 102, 241, 0.6)' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
        const ctxConcepto = document.getElementById('rendidor-chart-conceptos');
        if (ctxConcepto && gastosOnly.length > 0) {
            const porConcepto = {};
            gastosOnly.forEach(g => {
                const c = (g.concepto || 'Sin concepto').trim() || 'Sin concepto';
                porConcepto[c] = (porConcepto[c] || 0) + (g.monto || 0);
            });
            const labels = Object.keys(porConcepto);
            const data = labels.map(l => porConcepto[l]);
            const colors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6'];
            this._charts.conceptos = new Chart(ctxConcepto.getContext('2d'), {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => colors[i % colors.length]) }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        const ctxCategorias = document.getElementById('rendidor-chart-categorias');
        if (ctxCategorias && gastosOnly.length > 0) {
            const porCat = {};
            gastosOnly.forEach(g => {
                const c = (g.categoria || 'Otro').trim() || 'Otro';
                porCat[c] = (porCat[c] || 0) + (g.monto || 0);
            });
            const labels = Object.keys(porCat);
            const data = labels.map(l => porCat[l]);
            const colors = ['#6366f1','#22c55e','#f97316','#eab308','#ec4899','#0ea5e9','#14b8a6','#a855f7'];
            this._charts.categorias = new Chart(ctxCategorias.getContext('2d'), {
                type: 'pie',
                data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => colors[i % colors.length]) }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    },

    _renderParticipantes(container, email, participantes, gastos) {
        const el = document.getElementById('rendidor-participantes');
        if (!el) return;
        el.innerHTML = participantes.length === 0
            ? '<p class="text-secondary text-sm">Sin participantes. Añade al menos uno.</p>'
            : participantes.map((p, i) => {
                const nom = this._nombre(p);
                const ing = this._ingreso(p);
                const ingStr = ing > 0 ? ` — $${this._formatPesos(ing)}/mes` : '';
                return `<span class="rendidor-chip" data-i="${i}" title="Clic para editar">${UI.esc(nom)}${ingStr}<button type="button" class="rendidor-chip-remove" data-i="${i}" aria-label="Quitar">×</button></span>`;
            }).join('');

        el.querySelectorAll('.rendidor-chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const i = parseInt(btn.dataset.i, 10);
                participantes.splice(i, 1);
                gastos.forEach(g => {
                    g.pagadorIdx = g.pagadorIdx > i ? g.pagadorIdx - 1 : g.pagadorIdx === i ? 0 : g.pagadorIdx;
                    g.reparto = g.reparto.filter(r => r !== i).map(r => r > i ? r - 1 : r);
                });
                const data = Storage.getUserData(email);
                const trans = (data.gastosCompartidos?.transferenciasReales || [])
                    .filter(t => t && t.de !== i && t.a !== i)
                    .map(t => ({
                        ...t,
                        de: t.de > i ? t.de - 1 : t.de,
                        a: t.a > i ? t.a - 1 : t.a
                    }));
                this._save(email, participantes, gastos, trans);
                this.render(container);
            });
        });

        el.querySelectorAll('.rendidor-chip').forEach(chip => {
            if (chip.querySelector('.rendidor-chip-remove')?.dataset.i === chip.dataset.i) return;
            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('rendidor-chip-remove')) return;
                const i = parseInt(chip.dataset.i, 10);
                const p = participantes[i];
                const nom = this._nombre(p);
                const ing = this._ingreso(p);
                UI.showModal(`
                    <h3 class="modal-title">Editar participante</h3>
                    <form id="edit-part-rendidor">
                        ${UI.formGroup('Nombre', UI.input('edit_nombre', { value: nom, required: true }))}
                        ${UI.formGroup('Ingreso mensual ($)', UI.input('edit_ingreso', { type: 'number', value: ing || '', min: 0, step: 1 }))}
                        <div class="modal-actions mt-md">
                            <button type="button" id="btn-edit-part-cancel" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                `, {
                    size: 'sm',
                    onReady: () => {
                        UI.bindButton('btn-edit-part-cancel', () => UI.closeModal());
                        UI.bindForm('edit-part-rendidor', (fd) => {
                            participantes[i] = { nombre: (fd.edit_nombre || '').trim() || nom, ingreso: parseFloat(fd.edit_ingreso) || 0 };
                            this._save(email, participantes, gastos);
                            UI.closeModal();
                            this._renderParticipantes(container, email, participantes, gastos);
                            this._renderReparto(participantes);
                        });
                    }
                });
            });
        });

        const pago = document.getElementById('rendidor-pago');
        if (pago) {
            pago.innerHTML = participantes.map((p, i) => `<option value="${i}">${UI.esc(this._nombre(p))}</option>`).join('');
        }
    },

    _renderReparto(participantes) {
        const el = document.getElementById('rendidor-reparto');
        if (!el) return;
        el.innerHTML = participantes.map((p, i) =>
            `<label class="rendidor-check"><input type="checkbox" name="rendidor-reparto" value="${i}" checked> ${UI.esc(this._nombre(p))}</label>`
        ).join('');
        this._updateRepartoPersonalizado(participantes);
    },

    _updateRepartoPersonalizado(participantes) {
        const modo = document.getElementById('rendidor-reparto-modo')?.value;
        const wrap = document.getElementById('rendidor-reparto-personalizado');
        const pctEl = document.getElementById('rendidor-reparto-pct');
        if (!wrap || !pctEl) return;
        if (modo !== 'personalizado') {
            wrap.style.display = 'none';
            return;
        }
        const checked = Array.from(document.querySelectorAll('input[name="rendidor-reparto"]:checked')).map(c => parseInt(c.value, 10));
        wrap.style.display = checked.length ? 'block' : 'none';
        const defaultPct = checked.length > 0 ? (100 / checked.length).toFixed(1) : '0';
        pctEl.innerHTML = checked.map((idx, j) =>
            `<div class="rendidor-row"><label class="rendidor-label">${UI.esc(this._nombre(participantes[idx]))} %:</label><input type="number" min="0" max="100" step="0.5" data-reparto-idx="${j}" data-participante-idx="${idx}" class="form-input rendidor-pct-input" value="${defaultPct}" style="width:80px;" /></div>`
        ).join('');
    },

    _repartoModoLabel(modo) {
        return modo === 'ingresos' ? 'por ingresos' : modo === 'personalizado' ? 'personalizado %' : 'igual';
    },

    _renderGastosList(container, email, participantes, gastos) {
        const el = document.getElementById('rendidor-gastos');
        if (!el) return;
        if (gastos.length === 0) {
            el.innerHTML = '<div class="empty-state"><p>Sin gastos</p></div>';
            return;
        }

        const items = gastos
            .map((g, idx) => ({ g, idx }))
            .sort((a, b) => (b.g.fecha || '').localeCompare(a.g.fecha || ''));

        const groupBy = this._gastosGroupBy || 'fecha';
        const groups = [];
        const pushGroup = (title, list) => groups.push({ title, list });

        if (groupBy === 'categoria') {
            const m = {};
            items.forEach(it => {
                const k = (it.g.categoria || 'Otro').trim() || 'Otro';
                if (!m[k]) m[k] = [];
                m[k].push(it);
            });
            Object.keys(m).sort().forEach(k => pushGroup(k, m[k]));
        } else if (groupBy === 'pagador') {
            const m = {};
            items.forEach(it => {
                const k = this._nombre(participantes[it.g.pagadorIdx]) || '—';
                if (!m[k]) m[k] = [];
                m[k].push(it);
            });
            Object.keys(m).sort().forEach(k => pushGroup(k, m[k]));
        } else {
            pushGroup('', items);
        }

        const renderTable = (list) => {
            return `
                <div class="table-wrapper">
                    <table class="table rendidor-table-stack">
                        <thead>
                            <tr>
                                <th style="width:110px;">Fecha</th>
                                <th>Concepto</th>
                                <th style="width:140px;">Categoría</th>
                                <th style="width:140px;">Pagó</th>
                                <th style="width:120px;">Reparto</th>
                                <th style="width:110px;">Método</th>
                                <th style="width:120px; text-align:right;">Monto</th>
                                <th style="width:110px; text-align:right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${list.map(({ g, idx }) => {
                                const tipoLabel = g.tipo === 'abono' ? 'Abono' : 'Gasto';
                                const tipoClass = g.tipo === 'abono' ? 'abono' : 'gasto';
                                const metodo = this._repartoModoLabel(g.repartoModo);
                                const pagador = this._nombre(participantes[g.pagadorIdx]) || '—';
                                const cat = (g.categoria || 'Otro');
                                const fecha = g.fecha || '—';
                                const repartoCount = (g.reparto || []).length;
                                const repartoTxt = repartoCount === participantes.length ? `Todos (${repartoCount})` : `${repartoCount}`;
                                return `
                                    <tr>
                                        <td data-label="Fecha"><span class="text-secondary">${UI.esc(fecha)}</span></td>
                                        <td data-label="Concepto">
                                            <div class="flex items-center gap-sm" style="flex-wrap:wrap;">
                                                <strong>${UI.esc(g.concepto || 'Sin concepto')}</strong>
                                                <span class="rendidor-tipo-badge ${tipoClass}">${tipoLabel}</span>
                                            </div>
                                        </td>
                                        <td data-label="Categoría">${UI.esc(cat)}</td>
                                        <td data-label="Pagó">${UI.esc(pagador)}</td>
                                        <td data-label="Reparto">
                                            <button type="button" class="btn btn-ghost btn-sm rendidor-ver-reparto" data-i="${idx}">Ver (${UI.esc(repartoTxt)})</button>
                                        </td>
                                        <td data-label="Método"><span class="rendidor-modo-badge">${UI.esc(metodo)}</span></td>
                                        <td data-label="Monto" style="text-align:right;"><strong>$${this._formatPesos(g.monto || 0)}</strong></td>
                                        <td data-label="Acciones" style="text-align:right;">
                                            <button type="button" class="btn btn-ghost btn-sm" data-i="${idx}">Quitar</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };

        el.innerHTML = groups.map(gr => {
            const total = Math.round((gr.list || []).reduce((s, it) => s + (it.g.monto || 0), 0));
            const head = gr.title
                ? `<div class="flex items-center justify-between gap-sm mb-sm mt-sm"><strong>${UI.esc(gr.title)}</strong><span class="text-secondary text-sm">$${this._formatPesos(total)}</span></div>`
                : '';
            return head + renderTable(gr.list);
        }).join('');

        el.querySelectorAll('button[data-i]:not(.rendidor-ver-reparto)').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.i, 10);
                gastos.splice(i, 1);
                this._save(email, participantes, gastos);
                this._renderGastosList(container, email, participantes, gastos);
                this._renderCharts(participantes, gastos);
            });
        });
        el.querySelectorAll('.rendidor-ver-reparto').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.i, 10);
                const g = gastos[i];
                if (g) this._showRepartoModal(g, participantes);
            });
        });
    },

    _showRepartoModal(g, participantes) {
        const cuotas = this._cuotaPorParticipante(g, participantes);
        const rows = (g.reparto || []).map(idx => {
            const nombre = this._nombre(participantes[idx]);
            const monto = Math.round(cuotas[idx] || 0);
            return `<tr><td>${UI.esc(nombre)}</td><td style="text-align:right;"><strong>$${this._formatPesos(monto)}</strong></td></tr>`;
        }).join('');
        UI.showModal(`
            <h3 class="modal-title">Reparto — ${UI.esc(g.concepto || 'Gasto')}</h3>
            <p class="text-secondary text-sm mb-md">${UI.esc(g.fecha || '—')} · Total $${this._formatPesos(g.monto || 0)} · ${UI.esc(this._repartoModoLabel(g.repartoModo))}</p>
            <div class="table-wrapper">
                <table class="table">
                    <thead><tr><th>Participante</th><th style="text-align:right;">Parte</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="2" class="text-secondary">Sin reparto</td></tr>'}</tbody>
                </table>
            </div>
        `, { size: 'sm' });
    },

    _renderTransferenciasRealesList(container, email, participantes, transferenciasReales, gastos) {
        const el = document.getElementById('rendidor-transferencias-reales');
        if (!el) return;
        if (!Array.isArray(transferenciasReales) || transferenciasReales.length === 0) {
            el.innerHTML = '<div class="empty-state"><p>Sin transferencias</p></div>';
            return;
        }
        const items = [...transferenciasReales].map((t, i) => ({ t, i }))
            .sort((a, b) => (b.t.fecha || '').localeCompare(a.t.fecha || ''));

        el.innerHTML = `
            <div class="table-wrapper">
                <table class="table rendidor-table-stack">
                    <thead>
                        <tr>
                            <th style="width:110px;">Fecha</th>
                            <th style="width:160px;">De</th>
                            <th style="width:160px;">A</th>
                            <th>Nota</th>
                            <th style="width:120px; text-align:right;">Monto</th>
                            <th style="width:110px; text-align:right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(({ t, i }) => {
                            const deN = participantes[t.de] ? this._nombre(participantes[t.de]) : '?';
                            const aN = participantes[t.a] ? this._nombre(participantes[t.a]) : '?';
                            const fecha = t.fecha || '—';
                            const nota = (t.nota || '').trim();
                            return `
                                <tr>
                                    <td data-label="Fecha"><span class="text-secondary">${UI.esc(fecha)}</span></td>
                                    <td data-label="De"><strong>${UI.esc(deN)}</strong></td>
                                    <td data-label="A">${UI.esc(aN)}</td>
                                    <td data-label="Nota">${nota ? UI.esc(nota) : '<span class="text-secondary">—</span>'}</td>
                                    <td data-label="Monto" style="text-align:right;"><strong>$${this._formatPesos(t.monto || 0)}</strong></td>
                                    <td data-label="Acciones" style="text-align:right;">
                                        <button type="button" class="btn btn-ghost btn-sm" data-ti="${i}">Quitar</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        el.querySelectorAll('button[data-ti]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.ti, 10);
                transferenciasReales.splice(i, 1);
                this._save(email, participantes, gastos, transferenciasReales);
                this._renderTransferenciasRealesList(container, email, participantes, transferenciasReales, gastos);
                const resultados = document.getElementById('rendidor-resultados');
                if (resultados && resultados.style.display !== 'none') {
                    document.getElementById('rendidor-rendir')?.click();
                }
            });
        });
    },

    _openTransferModal(container, email, participantes, gastos, transferenciasReales) {
        if (participantes.length < 2) {
            UI.toast('Necesitas al menos 2 participantes para registrar una transferencia.', 'warning');
            return;
        }
        const today = DateUtils.today();
        const opts = participantes.map((p, i) => `<option value="${i}">${UI.esc(this._nombre(p))}</option>`).join('');
        UI.showModal(`
            <h3 class="modal-title">Registrar transferencia</h3>
            <p class="text-secondary text-sm mb-md">Esto no es un gasto real: solo ajusta saldos (evita duplicar el flujo).</p>
            <form id="rendidor-transfer-form">
                <div class="form-row">
                    ${UI.formGroup('Fecha', UI.input('t_fecha', { type: 'date', value: today, required: true }))}
                    ${UI.formGroup('Monto ($)', UI.input('t_monto', { type: 'number', min: 1, step: 1, placeholder: '0', required: true }))}
                </div>
                <div class="form-row">
                    ${UI.formGroup('De', `<select class="form-select" name="t_de" required>${opts}</select>`)}
                    ${UI.formGroup('A', `<select class="form-select" name="t_a" required>${opts}</select>`)}
                </div>
                ${UI.formGroup('Nota (opcional)', UI.input('t_nota', { placeholder: 'Ej: Transferencia para quedar en cero' }))}
                <div class="modal-actions mt-md">
                    <button type="button" id="rendidor-transfer-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('rendidor-transfer-cancel', () => UI.closeModal());
                const form = document.getElementById('rendidor-transfer-form');
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const fd = new FormData(form);
                    const fecha = (fd.get('t_fecha') || '').toString();
                    const monto = Math.round(parseFloat((fd.get('t_monto') || '0').toString()) || 0);
                    const de = parseInt((fd.get('t_de') || '0').toString(), 10);
                    const a = parseInt((fd.get('t_a') || '0').toString(), 10);
                    const nota = (fd.get('t_nota') || '').toString().trim();
                    if (!fecha) { UI.toast('Fecha inválida.', 'error'); return; }
                    if (!(monto > 0)) { UI.toast('Monto inválido.', 'error'); return; }
                    if (de === a) { UI.toast('“De” y “A” no pueden ser la misma persona.', 'error'); return; }
                    transferenciasReales.push({ id: DateUtils.generateId(), fecha, de, a, monto, nota });
                    this._save(email, participantes, gastos, transferenciasReales);
                    UI.closeModal();
                    UI.toast('Transferencia registrada.', 'success');
                    this._renderTransferenciasRealesList(container, email, participantes, transferenciasReales, gastos);
                    const resultados = document.getElementById('rendidor-resultados');
                    if (resultados && resultados.style.display !== 'none') {
                        document.getElementById('rendidor-rendir')?.click();
                    }
                });
            }
        });
    },

    _bindRendir(container, email, participantes, gastos, transferenciasReales) {
        const btn = document.getElementById('rendidor-rendir');
        const resultados = document.getElementById('rendidor-resultados');
        if (!btn || !resultados) return;

        const doRendir = () => {
            if (participantes.length === 0) { UI.toast('Añade participantes.', 'warning'); return; }
            if (gastos.length === 0) { UI.toast('Añade al menos un gasto.', 'warning'); return; }

            const comp = this._computeRendicionCompleta(participantes, gastos, transferenciasReales);
            if (!comp) return;
            const { balance, transferencias, detalle } = comp;

            const saldosEl = document.getElementById('rendidor-saldos');
            if (saldosEl) {
                saldosEl.innerHTML = balance.map((b, i) => {
                    const cls = b > 0 ? 'favor' : b < 0 ? 'contra' : '';
                    const text = b > 0 ? `A favor: $${this._formatPesos(b)}` : b < 0 ? `En contra: $${this._formatPesos(Math.abs(b))}` : 'En cero';
                    return `<div class="rendidor-balance ${cls}">${UI.esc(this._nombre(participantes[i]))}: ${text}</div>`;
                }).join('');
            }

            const transEl = document.getElementById('rendidor-transferencias');
            if (transEl) {
                transEl.innerHTML = transferencias.length === 0
                    ? '<p class="text-secondary">Nadie debe nada.</p>'
                    : transferencias.map(t =>
                        `<div class="rendidor-transfer">${UI.esc(this._nombre(participantes[t.de]))} debe transferir <strong>$${this._formatPesos(t.monto)}</strong> a ${UI.esc(this._nombre(participantes[t.a]))}</div>`
                    ).join('');
            }

            const tipoEtiqueta = (t) => t === 'abono' ? ' (Abono)' : ' (Gasto)';
            const detalleEl = document.getElementById('rendidor-detalle-participantes');
            if (detalleEl) {
                detalleEl.innerHTML = detalle.map(d => {
                    const lineasPagado = d.pagado.length === 0
                        ? '<div class="rendidor-detalle-linea concepto">— No pagó ningún gasto</div>'
                        : d.pagado.map(x => `<div class="rendidor-detalle-linea concepto">${UI.esc(x.concepto)}${tipoEtiqueta(x.tipo)}: $${this._formatPesos(x.monto)}</div>`).join('');
                    const lineasDebido = d.debido.length === 0
                        ? '<div class="rendidor-detalle-linea concepto">— No participó en ningún gasto</div>'
                        : d.debido.map(x => `<div class="rendidor-detalle-linea concepto">${UI.esc(x.concepto)}${tipoEtiqueta(x.tipo)}: $${this._formatPesos(x.monto)}</div>`).join('');
                    const saldoText = d.balance > 0 ? `A favor: $${this._formatPesos(d.balance)}` : d.balance < 0 ? `En contra: $${this._formatPesos(Math.abs(d.balance))}` : 'En cero';
                    return `
                        <div class="rendidor-detalle-participante">
                            <h4>${UI.esc(d.nombre)}</h4>
                            <div>Pagó:</div>${lineasPagado}
                            <div class="rendidor-detalle-total">Total pagado: $${this._formatPesos(d.totalPagado)}</div>
                            <div class="mt-sm">Le corresponde (su parte):</div>${lineasDebido}
                            <div class="rendidor-detalle-total">Total debido: $${this._formatPesos(d.totalDebido)} — Saldo: ${saldoText}</div>
                        </div>`;
                }).join('');
            }

            const tablaEl = document.getElementById('rendidor-tabla');
            if (tablaEl) {
                tablaEl.innerHTML = '<table class="rendidor-table"><thead><tr><th>Participante</th><th>Total pagado</th><th>Total debido</th><th>Saldo</th></tr></thead><tbody>' +
                    detalle.map(d => {
                        const saldoStr = d.balance > 0 ? '$' + this._formatPesos(d.balance) + ' (a favor)' : d.balance < 0 ? '$' + this._formatPesos(Math.abs(d.balance)) + ' (en contra)' : 'En cero';
                        return `<tr><td>${UI.esc(d.nombre)}</td><td>$${this._formatPesos(d.totalPagado)}</td><td>$${this._formatPesos(d.totalDebido)}</td><td>${saldoStr}</td></tr>`;
                    }).join('') + '</tbody></table>';
            }

            resultados.style.display = 'block';
            resultados._ultimosDatos = { balance, transferencias, detalle };
        };

        btn.addEventListener('click', doRendir);

        document.getElementById('rendidor-cerrar-periodo')?.addEventListener('click', () => {
            this._openCerrarPeriodoModal(container, email, participantes, gastos);
        });

        document.getElementById('rendidor-add-transfer')?.addEventListener('click', () => {
            this._openTransferModal(container, email, participantes, gastos, transferenciasReales);
        });

        document.getElementById('rendidor-add-part')?.addEventListener('click', () => {
            const inputNombre = document.getElementById('rendidor-nombre');
            const inputIngreso = document.getElementById('rendidor-ingreso');
            const n = (inputNombre?.value || '').trim();
            if (!n) return;
            const ingreso = parseFloat(inputIngreso?.value) || 0;
            if (participantes.some(p => this._nombre(p) === n)) { UI.toast('Ese nombre ya está.', 'warning'); return; }
            participantes.push({ nombre: n, ingreso });
            if (inputNombre) inputNombre.value = '';
            if (inputIngreso) inputIngreso.value = '';
            this._save(email, participantes, gastos);
            this._renderParticipantes(container, email, participantes, gastos);
            this._renderReparto(participantes);
        });

        document.getElementById('rendidor-nombre')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); document.getElementById('rendidor-add-part')?.click(); }
        });

        document.getElementById('rendidor-reparto-modo')?.addEventListener('change', () => this._updateRepartoPersonalizado(participantes));
        const repartoEl = document.getElementById('rendidor-reparto');
        if (repartoEl) repartoEl.addEventListener('change', () => this._updateRepartoPersonalizado(participantes));

        document.getElementById('rendidor-add-gasto')?.addEventListener('click', () => {
            if (participantes.length === 0) { UI.toast('Añade al menos un participante.', 'warning'); return; }
            const concepto = (document.getElementById('rendidor-concepto')?.value || '').trim() || 'Sin concepto';
            const montoRaw = parseFloat(document.getElementById('rendidor-monto')?.value);
            if (!montoRaw || montoRaw <= 0) { UI.toast('Monto inválido.', 'warning'); return; }
            const monto = Math.round(montoRaw);
            const pagadorIdx = parseInt(document.getElementById('rendidor-pago')?.value, 10) || 0;
            const reparto = Array.from(document.querySelectorAll('input[name="rendidor-reparto"]:checked')).map(c => parseInt(c.value, 10));
            if (reparto.length === 0) { UI.toast('Elige al menos un participante para repartir.', 'warning'); return; }
            const tipo = document.getElementById('rendidor-tipo')?.value || 'gasto';
            const categoria = document.getElementById('rendidor-categoria')?.value || 'Otro';
            if ((tipo || 'gasto') !== 'abono') {
                const maybeTransfer = /(transfer|liquid|rendir|settle)/i.test(concepto) || /(transfer|liquid|rendir|settle)/i.test(categoria);
                if (maybeTransfer) {
                    UI.toast('Tip: esto parece una transferencia. Para no duplicar el flujo, usa “Registrar transferencia”.', 'warning');
                }
            }
            let fecha = document.getElementById('rendidor-fecha')?.value;
            if (!fecha) fecha = DateUtils.today();
            const repartoModo = document.getElementById('rendidor-reparto-modo')?.value || 'igual';
            let repartoPorcentajes;
            if (repartoModo === 'personalizado') {
                const pctInputs = Array.from(document.querySelectorAll('.rendidor-pct-input')).sort((a, b) => (a.dataset.repartoIdx || 0) - (b.dataset.repartoIdx || 0));
                repartoPorcentajes = pctInputs.map(inp => parseFloat(inp.value) || 0);
                if (repartoPorcentajes.length !== reparto.length) repartoPorcentajes = reparto.map(() => 100 / reparto.length);
            }
            const nuevoGasto = { concepto, tipo, categoria, fecha, monto, pagadorIdx, reparto, repartoModo };
            if (repartoPorcentajes) nuevoGasto.repartoPorcentajes = repartoPorcentajes;
            gastos.push(nuevoGasto);
            document.getElementById('rendidor-concepto').value = '';
            document.getElementById('rendidor-monto').value = '';
            if (document.getElementById('rendidor-fecha')) document.getElementById('rendidor-fecha').value = '';
            this._save(email, participantes, gastos);
            this._renderGastosList(container, email, participantes, gastos);
            this._renderCharts(participantes, gastos);
        });

        ['rendidor-concepto', 'rendidor-tipo', 'rendidor-monto', 'rendidor-pago'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); document.getElementById('rendidor-add-gasto')?.click(); }
            });
        });
    },

    _bindTabs() {
        document.querySelectorAll('.rendidor-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.rendidor-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.rendidor-panel').forEach(p => p.classList.remove('activa'));
                btn.classList.add('active');
                const id = 'rendidor-vista-' + btn.dataset.vista;
                const panel = document.getElementById(id);
                if (panel) panel.classList.add('activa');
            });
        });
    },

    _bindExport(container, email, participantes, gastos) {
        const excelBtn = document.getElementById('rendidor-btn-excel');
        const pdfBtn = document.getElementById('rendidor-btn-pdf');
        if (excelBtn) {
            excelBtn.addEventListener('click', () => {
                const resultados = document.getElementById('rendidor-resultados');
                const datos = resultados?._ultimosDatos;
                if (!datos) { UI.toast('Primero haz clic en "Rendir cuentas".', 'warning'); return; }
                this._descargarExcel(participantes, gastos, datos);
            });
        }
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                const resultados = document.getElementById('rendidor-resultados');
                const datos = resultados?._ultimosDatos;
                if (!datos) { UI.toast('Primero haz clic en "Rendir cuentas".', 'warning'); return; }
                if (typeof jspdf === 'undefined') { UI.toast('PDF no disponible. Falta cargar la librería.', 'warning'); return; }
                const { jsPDF } = window.jspdf;
                datos.detalle.forEach((_, i) => this._generarPdfParticipante(participantes, datos, i, jsPDF));
            });
        }
    },

    _descargarExcel(participantes, gastos, datos) {
        if (typeof XLSX === 'undefined') { UI.toast('Excel no disponible.', 'warning'); return; }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Participante', 'Ingreso ($)']].concat(participantes.map(p => [this._nombre(p), this._ingreso(p)]))), 'Participantes');
        const gastosRows = [['Concepto', 'Tipo', 'Monto ($)', 'Pagó', 'Repartido entre', 'Modo reparto']];
        gastos.forEach(g => {
            gastosRows.push([
                g.concepto,
                g.tipo === 'abono' ? 'Abono' : 'Gasto',
                g.monto,
                this._nombre(participantes[g.pagadorIdx]),
                g.reparto.map(i => this._nombre(participantes[i])).join(', '),
                g.repartoModo || 'igual'
            ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gastosRows), 'Gastos');
        const saldosRows = [['Participante', 'Saldo ($)']];
        datos.detalle.forEach(d => { saldosRows.push([d.nombre, d.balance]); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(saldosRows), 'Saldos');
        const transRows = [['De', 'A', 'Monto ($)']];
        datos.transferencias.forEach(t => { transRows.push([this._nombre(participantes[t.de]), this._nombre(participantes[t.a]), t.monto]); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transRows), 'Transferencias');
        XLSX.writeFile(wb, 'Rendicion_de_cuentas.xlsx');
    },

    _generarPdfParticipante(participantes, datos, idx, jsPDF) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const d = datos.detalle[idx];
        let y = 20;
        doc.setFontSize(16);
        doc.text('Rendición de cuentas — ' + d.nombre, 14, y);
        y += 12;
        doc.setFontSize(11);
        doc.text('Total pagado: $' + this._formatPesos(d.totalPagado), 14, y);
        y += 7;
        doc.text('Total debido (su parte): $' + this._formatPesos(d.totalDebido), 14, y);
        y += 7;
        const saldoStr = d.balance > 0 ? 'A favor: $' + this._formatPesos(d.balance) : d.balance < 0 ? 'En contra: $' + this._formatPesos(Math.abs(d.balance)) : 'En cero';
        doc.text('Saldo: ' + saldoStr, 14, y);
        y += 12;
        doc.text('Transferencias que te afectan:', 14, y);
        y += 7;
        const trans = datos.transferencias.filter(t => t.de === idx || t.a === idx);
        if (trans.length === 0) doc.text('Ninguna.', 20, y);
        else trans.forEach(t => {
            const texto = t.de === idx
                ? 'Tú debes transferir $' + this._formatPesos(t.monto) + ' a ' + this._nombre(participantes[t.a])
                : this._nombre(participantes[t.de]) + ' debe transferirte $' + this._formatPesos(t.monto);
            doc.text(texto, 20, y);
            y += 6;
        });
        doc.save('Rendicion_' + d.nombre.replace(/\s+/g, '_') + '.pdf');
    }
};
