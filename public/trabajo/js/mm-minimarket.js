/**
 * Minimarket — UI finanzas (tabs estilo Persona), proveedores, recepciones, precios.
 * Depende de MMFinance, TrabajoStorage, TrabajoApp (toast opcional).
 */
const TrabajoMinimarket = {
    TABS: ['situacion', 'flujo', 'balance', 'resultado', 'facturas', 'movimientos'],
    MAX_FOTO_B64: 240000,

    _toast(msg, kind) {
        if (typeof TrabajoApp !== 'undefined' && TrabajoApp.toast) TrabajoApp.toast(msg, kind);
        else alert(msg);
    },

    renderFinanzas(P, d, subId, bc, hoy, mes) {
        const MF = MMFinance;
        const fin = d.finanzas || {};
        const mesVista = (fin.mesVista && /^\d{4}-\d{2}$/.test(fin.mesVista)) ? fin.mesVista : mes;
        const tab = TrabajoMinimarket.TABS.includes(subId) ? subId : 'situacion';
        const cats = (fin.categorias || ['Operación', 'Insumos', 'Servicios', 'Otros']).map(c => `<option value="${P.esc(c)}">${P.esc(c)}</option>`).join('');

        const ingAll = MF.sumAll(fin.ingresos);
        const gasAll = MF.sumAll(fin.gastos);
        const saldoAcum = ingAll - gasAll;
        const ta = MF.totalActivos(fin.activos);
        const tp = MF.totalPasivos(fin.pasivos);
        const patrimonio = ta - tp;

        const ingMes = MF.sumMovimientosMes(fin.ingresos, mesVista);
        const gasMes = MF.sumMovimientosMes(fin.gastos, mesVista);
        const netoMes = ingMes - gasMes;
        const tasaMes = ingMes > 0 ? (netoMes / ingMes * 100) : 0;

        const pagos = fin.pagosProgramados || [];
        const proximos = pagos.filter(p => (p.fecha || '') >= hoy).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
        const nextP = proximos[0] || null;

        const pagosMes = pagos.filter(p => MF.monthKeyFromDate(p.fecha) === mesVista);
        const topIng = MF.topCategories(MF.byCategory(fin.ingresos, mesVista), 5);
        const topGas = MF.topCategories(MF.byCategory(fin.gastos, mesVista), 5);

        const tabLink = t => {
            const href = P.linkPerfil('minimarket', 'finanzas', t);
            const labels = { situacion: 'Situación actual', flujo: 'Flujo de caja', balance: 'Balance', resultado: 'Estado de resultado', facturas: 'Facturas', movimientos: 'Movimientos' };
            return `<a href="${href}" class="tab-btn ${tab === t ? 'active' : ''}" role="tab">${P.esc(labels[t] || t)}</a>`;
        };

        let body = '';
        if (tab === 'situacion') {
            body = `
            <div class="finance-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Saldo (movimientos)</p>
                    <p style="font-size:1.35rem; font-weight:700;" class="${saldoAcum >= 0 ? 'positive' : 'negative'}">${P.money(saldoAcum)}</p>
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Patrimonio neto</p>
                    <p style="font-size:1.35rem; font-weight:700;" class="${patrimonio >= 0 ? 'positive' : 'negative'}">${P.money(patrimonio)}</p>
                    <p class="text-secondary text-sm">Activos ${P.money(ta)} · Pasivos ${P.money(tp)}</p>
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Próximo pago programado</p>
                    ${nextP ? `<p style="font-weight:600;">${P.money(parseFloat(nextP.monto) || 0)}</p><p class="text-secondary text-sm">${P.esc(nextP.titulo || '')} · ${P.esc(nextP.fecha || '')}</p>` : '<p class="text-secondary text-sm">Sin pagos programados</p>'}
                </div>
                <div class="card" style="text-align:center; padding:var(--spacing-lg);">
                    <p class="text-secondary" style="font-size:0.8rem; margin-bottom:4px;">Resultado ${P.esc(mesVista)}</p>
                    <p style="font-size:1.35rem; font-weight:700;" class="${netoMes >= 0 ? 'positive' : 'negative'}">${P.money(netoMes)}</p>
                    <p class="text-secondary text-sm">Tasa sobre ingresos: ${tasaMes.toFixed(1)}%</p>
                </div>
            </div>
            <div class="cards-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card"><h4 class="card-title mb-md">Ingresos por categoría (${P.esc(mesVista)})</h4>
                    ${topIng.length ? `<ul class="text-sm" style="margin:0; padding-left:1.1rem;">${topIng.map(([k, v]) => `<li>${P.esc(k)}: <strong class="positive">${P.money(v)}</strong></li>`).join('')}</ul>` : '<p class="muted text-sm">Sin datos este mes.</p>'}
                </div>
                <div class="card"><h4 class="card-title mb-md">Gastos por categoría (${P.esc(mesVista)})</h4>
                    ${topGas.length ? `<ul class="text-sm" style="margin:0; padding-left:1.1rem;">${topGas.map(([k, v]) => `<li>${P.esc(k)}: <strong class="negative">${P.money(v)}</strong></li>`).join('')}</ul>` : '<p class="muted text-sm">Sin datos este mes.</p>'}
                </div>
            </div>
            <div class="card"><h4 class="card-title mb-md">Pagos programados en ${P.esc(mesVista)}</h4>
                ${pagosMes.length ? pagosMes.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).map(p => `<div class="row-item"><span>${P.esc(p.fecha)} · ${P.esc(p.titulo || '')} · ${P.money(parseFloat(p.monto) || 0)}</span>
                    <button type="button" class="btn-sm btn-mm-pago-agenda" data-id="${P.esc(p.id)}" title="Añadir a agenda">📅 Agenda</button></div>`).join('') : '<p class="muted text-sm">Ninguno este mes. Añádelos en la pestaña Flujo de caja.</p>'}
            </div>`;
        } else if (tab === 'flujo') {
            body = `
            <div class="card mb-md">
                <label class="text-secondary text-sm">Mes en análisis</label>
                <input type="month" id="mm-fin-mes-vista" value="${P.esc(mesVista)}" class="input" style="max-width:12rem;"/>
            </div>
            <div class="finance-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Ingresos</p><p class="positive" style="font-size:1.25rem;font-weight:700;">${P.money(ingMes)}</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Gastos</p><p class="negative" style="font-size:1.25rem;font-weight:700;">${P.money(gasMes)}</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Neto</p><p style="font-size:1.25rem;font-weight:700;" class="${netoMes >= 0 ? 'positive' : 'negative'}">${P.money(netoMes)}</p></div>
            </div>
            <div class="card mb-md"><h4 class="card-title mb-md">Gastos por categoría (${P.esc(mesVista)})</h4>
                ${topGas.length ? topGas.map(([k, v]) => `<div class="row-item"><span>${P.esc(k)}</span><strong class="negative">${P.money(v)}</strong></div>`).join('') : '<p class="muted text-sm">Sin gastos este mes.</p>'}
            </div>
            <div class="card"><h4 class="card-title mb-md">Pagos y recordatorios programados</h4>
                <div class="form-row" style="flex-wrap:wrap; align-items:flex-end;">
                    <input type="text" id="mm-pago-titulo" placeholder="Concepto (ej. arriendo máquina)" aria-label="Título"/>
                    <input type="date" id="mm-pago-fecha" value="${hoy}" aria-label="Fecha"/>
                    <input type="number" id="mm-pago-monto" step="0.01" placeholder="Monto (opcional)" aria-label="Monto"/>
                    <input type="text" id="mm-pago-notas" placeholder="Notas" style="min-width:140px;" aria-label="Notas"/>
                    <button type="button" id="btn-mm-pago-add" class="btn btn-primary btn-sm">Añadir</button>
                </div>
                <div style="margin-top:1rem;">
                    ${pagos.length ? pagos.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(p => `<div class="row-item">
                        <span>${P.esc(p.fecha)} · ${P.esc(p.titulo || '')} ${p.monto != null && p.monto !== '' ? '· ' + P.money(parseFloat(p.monto) || 0) : ''}</span>
                        <span>
                            <button type="button" class="btn-sm btn-mm-pago-agenda" data-id="${P.esc(p.id)}">📅 Agenda</button>
                            <button type="button" class="btn-sm btn-del-mm-pago" data-id="${P.esc(p.id)}" aria-label="Eliminar">✕</button>
                        </span>
                    </div>`).join('') : '<p class="muted text-sm">Sin registros.</p>'}
                </div>
            </div>`;
        } else if (tab === 'balance') {
            const lista = (arr, tipo) => (arr || []).map(a => `<div class="row-item"><span>${P.esc(a.nombre || '—')} · ${P.money(parseFloat(a.monto) || 0)}</span><button type="button" class="btn-sm btn-del-mm-${tipo}" data-id="${P.esc(a.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted text-sm">Vacío.</p>';
            body = `
            <div class="cards-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:var(--spacing-md);">
                <div class="card"><h4 class="card-title mb-md">Activos</h4><div id="mm-act-list">${lista(fin.activos, 'act')}</div>
                    <div class="form-row" style="margin-top:0.75rem;">
                        <input type="text" id="mm-act-nombre" placeholder="Nombre" aria-label="Nombre activo"/>
                        <input type="number" id="mm-act-monto" step="0.01" placeholder="Monto" aria-label="Monto"/>
                        <button type="button" id="btn-mm-act-add" class="btn btn-primary btn-sm">Añadir</button>
                    </div>
                </div>
                <div class="card"><h4 class="card-title mb-md">Pasivos</h4><div id="mm-pas-list">${lista(fin.pasivos, 'pas')}</div>
                    <div class="form-row" style="margin-top:0.75rem;">
                        <input type="text" id="mm-pas-nombre" placeholder="Nombre" aria-label="Nombre pasivo"/>
                        <input type="number" id="mm-pas-monto" step="0.01" placeholder="Monto" aria-label="Monto"/>
                        <button type="button" id="btn-mm-pas-add" class="btn btn-primary btn-sm">Añadir</button>
                    </div>
                </div>
            </div>
            <div class="card mt-md"><p><strong>Patrimonio neto:</strong> <span class="${patrimonio >= 0 ? 'positive' : 'negative'}">${P.money(patrimonio)}</span></p></div>`;
        } else if (tab === 'resultado') {
            const resPct = ingMes > 0 ? (netoMes / ingMes * 100) : 0;
            body = `
            <div class="card mb-md">
                <label class="text-secondary text-sm">Mes</label>
                <input type="month" id="mm-fin-mes-vista" value="${P.esc(mesVista)}" class="input" style="max-width:12rem;"/>
            </div>
            <div class="finance-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:var(--spacing-md);">
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Ingresos</p><p class="positive" style="font-size:1.35rem;font-weight:700;">${P.money(ingMes)}</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Gastos</p><p class="negative" style="font-size:1.35rem;font-weight:700;">${P.money(gasMes)}</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Resultado neto</p><p style="font-size:1.35rem;font-weight:700;" class="${netoMes >= 0 ? 'positive' : 'negative'}">${P.money(netoMes)}</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Margen / ingresos</p><p style="font-size:1.35rem;font-weight:700;">${resPct.toFixed(1)}%</p></div>
            </div>
            <div class="card mt-md"><h4 class="card-title mb-md">Detalle por categoría — gastos</h4>
                ${topGas.length ? topGas.map(([k, v]) => `<div class="row-item"><span>${P.esc(k)}</span><strong class="negative">${P.money(v)}</strong></div>`).join('') : '<p class="muted">Sin gastos.</p>'}
            </div>`;
        } else if (tab === 'facturas') {
            const filtroFt = fin.filtroFacturasTipo || 'todos';
            const facturas = d.facturas || [];
            const totF = MF.totalesFacturasMes(facturas, mesVista);
            const listF = MF.facturasEnMes(facturas, mesVista, filtroFt).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
            const cajaVM = MF.cajaVentasMes(d.cajasTurno, d.finanzas, mesVista);
            const sii = d.siiReferencia || {};
            const V = totF.ventas;
            const C = totF.compras;
            const sumDoc = V + C;
            const ratioVC = C > 0 ? (V / C) : null;
            const pctPart = sumDoc > 0 ? (100 * V / sumDoc) : null;
            const factorEst = typeof sii.factorEstimacionIVA === 'number' ? sii.factorEstimacionIVA : 0.19;
            const estimIVA = (V - C) * factorEst;
            body = `
            <div class="card mb-md">
                <div class="form-row" style="flex-wrap:wrap; align-items:center; gap:1rem;">
                    <div><label class="text-secondary text-sm">Mes</label><br/>
                    <input type="month" id="mm-fin-mes-vista" value="${P.esc(mesVista)}" class="input" style="max-width:12rem;"/></div>
                    <div><label class="text-secondary text-sm">Filtro tipo</label><br/>
                    <select id="mm-fact-filtro-tipo" class="input" aria-label="Tipo factura">
                        <option value="todos" ${filtroFt === 'todos' ? 'selected' : ''}>Todos</option>
                        <option value="compra" ${filtroFt === 'compra' ? 'selected' : ''}>Compra</option>
                        <option value="venta" ${filtroFt === 'venta' ? 'selected' : ''}>Venta</option>
                    </select></div>
                </div>
            </div>
            <div class="finance-summary" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:var(--spacing-md); margin-bottom:var(--spacing-lg);">
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Compras (facturas)</p><p class="negative" style="font-size:1.15rem;font-weight:700;">${P.money(C)}</p><p class="text-sm text-secondary">${totF.nCompras} doc.</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Ventas (facturas)</p><p class="positive" style="font-size:1.15rem;font-weight:700;">${P.money(V)}</p><p class="text-sm text-secondary">${totF.nVentas} doc.</p></div>
                <div class="card" style="text-align:center;"><p class="text-secondary text-sm">Ventas caja (turnos)</p><p class="positive" style="font-size:1.15rem;font-weight:700;">${P.money(cajaVM.montoVendido)}</p><p class="text-sm text-secondary">${cajaVM.transacciones} transacciones</p></div>
            </div>
            <div class="card mb-md" style="border-left:3px solid var(--color-warning, #fbbf24);">
                <h4 class="card-title mb-sm">Referencia SII / IVA</h4>
                <p class="text-sm text-secondary mb-md">Indicadores calculados solo con los montos que registras aquí. <strong>No sustituyen asesoría tributaria ni declaraciones al SII.</strong></p>
                <div class="form-row" style="flex-wrap:wrap; align-items:flex-end; gap:0.75rem;">
                    <label>Tasa IVA referencia %<input type="number" id="mm-sii-tasa" step="0.1" class="input" style="display:block;max-width:6rem;margin-top:4px;" value="${P.esc(sii.tasaIVA != null ? sii.tasaIVA : 19)}" aria-label="Tasa IVA"/></label>
                    <label>Factor estimación IVA<input type="number" id="mm-sii-factor" step="0.0001" class="input" style="display:block;max-width:7rem;margin-top:4px;" value="${P.esc(factorEst)}" title="Se aplica como (ventas − compras) × factor" aria-label="Factor"/></label>
                    <label style="min-width:10rem;">Régimen (texto libre)<input type="text" id="mm-sii-regimen" class="input" style="display:block;margin-top:4px;width:100%;" value="${P.esc(sii.regimen || '')}" placeholder="Ej. primera categoría" aria-label="Régimen"/></label>
                    <label class="text-sm" style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="mm-sii-mostrar-est" ${sii.mostrarEstimacionIVA !== false ? 'checked' : ''}/> Mostrar estimación IVA</label>
                    <button type="button" id="btn-mm-sii-save" class="btn btn-secondary btn-sm">Guardar parámetros</button>
                </div>
                <div class="mt-md text-sm" style="display:grid; gap:8px;">
                    <p title="Ventas documentadas del mes ÷ Compras documentadas del mes (solo facturas registradas en esta app). Si compras = 0, no aplica."><strong>Ratio ventas ÷ compras:</strong> ${ratioVC != null && Number.isFinite(ratioVC) ? ratioVC.toFixed(3) : '—'}</p>
                    <p title="Porcentaje = 100 × ventas ÷ (ventas + compras), usando totales de facturas del mes."><strong>% legal SII (panel):</strong> ${pctPart != null ? pctPart.toFixed(1) + '%' : '—'} <span class="muted">(100 × ventas ÷ (ventas + compras))</span></p>
                    ${sii.mostrarEstimacionIVA !== false ? `<p><strong>Estimación referencia IVA:</strong> ${P.money(estimIVA)} <span class="muted">= (ventas − compras) × ${factorEst.toFixed(4)}</span></p>
                    <p class="muted" style="margin:0;">Estimación no sustituye asesoría contable ni el cálculo oficial de débito/fisco.</p>` : ''}
                </div>
            </div>
            <div class="card mb-md"><h4 class="card-title mb-md">Registrar factura</h4>
                <div class="form-row" style="flex-wrap:wrap;">
                    <select id="mm-fact-tipo" aria-label="Tipo"><option value="compra">Compra</option><option value="venta">Venta</option></select>
                    <input type="text" id="mm-fact-folio" placeholder="Folio / N° (opc.)" style="max-width:10rem;" aria-label="Folio"/>
                    <input type="date" id="mm-fact-fecha" value="${hoy}" aria-label="Fecha"/>
                    <input type="text" id="mm-fact-contraparte" placeholder="Proveedor o cliente" style="min-width:140px;" aria-label="Contraparte"/>
                </div>
                <div class="form-row" style="flex-wrap:wrap;margin-top:0.5rem;">
                    <label>Monto neto<input type="number" id="mm-fact-neto" step="0.01" class="input" style="display:block;max-width:8rem;margin-top:4px;" placeholder="0" aria-label="Neto"/></label>
                    <label>Monto exento<input type="number" id="mm-fact-exento" step="0.01" class="input" style="display:block;max-width:8rem;margin-top:4px;" placeholder="0" aria-label="Exento"/></label>
                    <input type="text" id="mm-fact-notas" placeholder="Notas" style="min-width:180px;flex:1;" aria-label="Notas"/>
                </div>
                <div style="margin-top:0.5rem;"><label class="text-sm text-secondary">Archivo o foto (opc.)</label><input type="file" id="mm-fact-archivo" accept="image/*,.pdf" aria-label="Archivo"/></div>
                <button type="button" id="btn-mm-fact-add" class="btn btn-primary btn-sm" style="margin-top:0.75rem;">Guardar factura</button>
            </div>
            <div class="card"><h4 class="card-title mb-md">Facturas del mes (${P.esc(mesVista)})</h4>
                ${listF.length ? listF.map(f => {
                const totL = MF.facturaMontoTotal(f);
                const thumb = f.archivoBase64 && String(f.archivoBase64).startsWith('data:image') ? `<img src="${f.archivoBase64}" alt="" width="40" height="40" style="object-fit:cover;border-radius:4px;"/>` : '';
                return `<div class="row-item" style="align-items:flex-start;gap:8px;">
                    ${thumb || '<span class="muted text-sm">·</span>'}
                    <div style="flex:1;min-width:0;">
                        <strong>${f.tipo === 'compra' ? 'Compra' : 'Venta'}</strong> · ${P.esc(f.fecha || '')} · ${P.esc(f.contraparte || '—')}
                        ${f.folio ? ' · Folio ' + P.esc(f.folio) : ''}
                        <br/><span class="text-sm">${P.money(totL)} neto+exento</span> ${f.notas ? '<span class="muted text-sm">' + P.esc(f.notas) + '</span>' : ''}
                    </div>
                    <button type="button" class="btn-sm btn-del-mm-fact" data-id="${P.esc(f.id)}" aria-label="Eliminar">✕</button>
                </div>`;
            }).join('') : '<p class="muted">Ninguna factura en este mes con el filtro actual.</p>'}
            </div>`;
        } else {
            const ing = (fin.ingresos || []).filter(i => MF.monthKeyFromDate(i.fecha) === mesVista);
            const gas = (fin.gastos || []).filter(g => MF.monthKeyFromDate(g.fecha) === mesVista);
            const movs = [...ing.map(i => ({ ...i, tipo: 'ingreso' })), ...gas.map(g => ({ ...g, tipo: 'gasto' }))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
            body = `
            <div class="card mb-md">
                <label class="text-secondary text-sm">Mes listado</label>
                <input type="month" id="mm-fin-mes-vista" value="${P.esc(mesVista)}" class="input" style="max-width:12rem;"/>
            </div>
            <div class="card mb-md"><h4 class="card-title mb-md">Registrar</h4>
                <p class="text-sm text-secondary mb-sm">Ingreso</p>
                <div class="form-row">
                    <input type="number" id="mm-fin-ing-m" step="0.01" placeholder="Monto" aria-label="Monto ingreso"/>
                    <input type="text" id="mm-fin-ing-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="mm-fin-ing-f" value="${hoy}" aria-label="Fecha"/>
                    <select id="mm-fin-ing-c" aria-label="Categoría">${cats}</select>
                    <button type="button" id="btn-mm-fin-ing" class="btn btn-primary">Registrar</button>
                </div>
                <p class="text-sm text-secondary mb-sm mt-md">Gasto</p>
                <div class="form-row">
                    <input type="number" id="mm-fin-gas-m" step="0.01" placeholder="Monto" aria-label="Monto gasto"/>
                    <input type="text" id="mm-fin-gas-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="mm-fin-gas-f" value="${hoy}" aria-label="Fecha"/>
                    <select id="mm-fin-gas-c" aria-label="Categoría">${cats}</select>
                    <button type="button" id="btn-mm-fin-gas" class="btn btn-primary">Registrar</button>
                </div>
            </div>
            <div class="card"><h4 class="card-title mb-md">Movimientos (${P.esc(mesVista)})</h4>
                <div id="mm-fin-list">${movs.length ? movs.map(m => `<div class="row-item">${P.esc(m.fecha)} ${m.tipo === 'ingreso' ? '+' : '-'} ${P.money(parseFloat(m.monto) || 0)} ${P.esc(m.concepto || '')} <button type="button" class="btn-sm btn-del-mm-fin" data-tipo="${m.tipo}" data-id="${P.esc(m.id)}" aria-label="Eliminar">✕</button></div>`).join('') : '<p class="muted">Sin movimientos este mes.</p>'}</div>
            </div>`;
        }

        const tabsHtml = `<div class="tabs" style="margin-bottom:var(--spacing-lg);flex-wrap:wrap;">${TrabajoMinimarket.TABS.map(tabLink).join('')}</div>`;
        return P.wrap('minimarket', 'Finanzas', bc, tabsHtml + `<div class="tab-content active">${body}</div>`);
    },

    renderProveedores(P, d, bc) {
        const list = (d.proveedores || []).length
            ? d.proveedores.map(p => `<div class="row-item"><span><strong>${P.esc(p.nombre)}</strong> ${p.contacto ? '· ' + P.esc(p.contacto) : ''} ${p.notas ? '<span class="muted text-sm">' + P.esc(p.notas) + '</span>' : ''}</span>
                <button type="button" class="btn-sm btn-del-mm-prov" data-id="${P.esc(p.id)}" aria-label="Eliminar">✕</button></div>`).join('')
            : '<p class="muted">Sin proveedores.</p>';
        return P.wrap('minimarket', 'Proveedores', bc, `
            <div class="card"><h2>Listado</h2><div id="mm-prov-list">${list}</div></div>
            <div class="card"><h2>Nuevo proveedor</h2>
                <div class="form-row">
                    <input type="text" id="mm-prov-nombre" placeholder="Nombre" aria-label="Nombre"/>
                    <input type="text" id="mm-prov-contacto" placeholder="Contacto (tel, mail)" aria-label="Contacto"/>
                    <input type="text" id="mm-prov-notas" placeholder="Notas" style="min-width:180px;" aria-label="Notas"/>
                    <button type="button" id="btn-mm-prov-add" class="btn btn-primary">Añadir</button>
                </div>
            </div>`);
    },

    renderRecepciones(P, d, bc, hoy) {
        const provMap = Object.fromEntries((d.proveedores || []).map(p => [p.id, p.nombre]));
        const list = (d.recepciones || []).length
            ? d.recepciones.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(r => {
                const thumb = r.fotoFacturaBase64 ? `<img src="${r.fotoFacturaBase64}" alt="" class="mm-rec-thumb" width="56" height="56" style="object-fit:cover;border-radius:6px;"/>` : '<span class="muted text-sm">—</span>';
                return `<div class="row-item mm-rec-row" style="align-items:flex-start;">
                    <div style="display:flex;gap:10px;align-items:flex-start;flex:1;">
                        ${thumb}
                        <div><strong>${P.esc(r.fecha || '')}</strong> · ${P.esc(provMap[r.proveedorId] || 'Proveedor')}</div>
                        <div class="text-sm" style="flex:1;min-width:0;">${P.esc((r.detalle || '').slice(0, 200))}${(r.detalle || '').length > 200 ? '…' : ''}</div>
                    </div>
                    <button type="button" class="btn-sm btn-del-mm-rec" data-id="${P.esc(r.id)}" aria-label="Eliminar">✕</button>
                </div>`;
            }).join('')
            : '<p class="muted">Sin recepciones.</p>';
        const opts = (d.proveedores || []).map(p => `<option value="${P.esc(p.id)}">${P.esc(p.nombre)}</option>`).join('');
        return P.wrap('minimarket', 'Recepciones', bc, `
            <p class="muted text-sm">Registra qué se recibió y adjunta una foto de factura (se comprime en el navegador; tamaño máximo ~200 KB en base64).</p>
            <div class="card"><h2>Historial</h2><div id="mm-rec-list">${list}</div></div>
            <div class="card"><h2>Nueva recepción</h2>
                <div class="form-row" style="flex-wrap:wrap;">
                    <select id="mm-rec-prov" aria-label="Proveedor">${opts || '<option value="">— Cree un proveedor —</option>'}</select>
                    <input type="date" id="mm-rec-fecha" value="${hoy}" aria-label="Fecha"/>
                </div>
                <textarea id="mm-rec-detalle" rows="3" class="input" style="width:100%;max-width:520px;margin-top:0.5rem;" placeholder="Qué trajo (detalle)" aria-label="Detalle"></textarea>
                <div style="margin-top:0.5rem;">
                    <label class="text-sm text-secondary">Foto factura</label>
                    <input type="file" id="mm-rec-foto" accept="image/*" aria-label="Foto factura"/>
                </div>
                <button type="button" id="btn-mm-rec-add" class="btn btn-primary" style="margin-top:0.75rem;">Guardar recepción</button>
            </div>`);
    },

    renderPrecios(P, d, bc) {
        const prec = d.precios || { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} };
        const prods = d.inventario?.productos || [];
        const rows = prods.length ? prods.map(p => {
            const ov = prec.productosMargen && prec.productosMargen[p.id] != null ? prec.productosMargen[p.id] : '';
            return `<div class="row-item"><span>${P.esc(p.nombre)}</span>
                <input type="number" class="input mm-margen-prod" data-id="${P.esc(p.id)}" step="0.1" placeholder="Margen % (vacío = global)" value="${ov !== '' && ov != null ? P.esc(ov) : ''}" style="max-width:11rem;" aria-label="Margen override"/></div>`;
        }).join('') : '<p class="muted">Sin productos en inventario. Añádelos en Inventario.</p>';

        const sel = prods.map(p => `<option value="${P.esc(p.id)}">${P.esc(p.nombre)}</option>`).join('');
        return P.wrap('minimarket', 'Precios y margen', bc, `
            <div class="card"><h2>Parámetros</h2>
                <div class="form-row" style="flex-wrap:wrap; align-items:flex-end;">
                    <label>% comisión máquinas (u otro concepto)<input type="number" id="mm-prec-comision" step="0.1" value="${P.esc(prec.comisionMaquinasPct)}" class="input" style="display:block;max-width:8rem;margin-top:4px;" aria-label="Comisión"/></label>
                    <label>Margen global %<input type="number" id="mm-prec-margen-global" step="0.1" value="${P.esc(prec.margenGlobalPct)}" class="input" style="display:block;max-width:8rem;margin-top:4px;" aria-label="Margen global"/></label>
                    <button type="button" id="btn-mm-prec-save" class="btn btn-primary">Guardar parámetros</button>
                </div>
            </div>
            <div class="card"><h2>Margen por producto</h2><p class="muted text-sm mb-md">Dejar vacío usa el margen global.</p><div id="mm-margen-list">${rows}</div>
                <button type="button" id="btn-mm-margen-save" class="btn btn-secondary btn-sm" style="margin-top:0.75rem;">Guardar márgenes por producto</button>
            </div>
            <div class="card"><h2>Calculador</h2>
                <div class="form-row" style="flex-wrap:wrap; align-items:flex-end;">
                    <label>Costo base<input type="number" id="mm-calc-costo" step="0.01" class="input" style="display:block;max-width:10rem;margin-top:4px;" placeholder="0" aria-label="Costo"/></label>
                    <label>Producto (opcional, para margen)
                        <select id="mm-calc-prod" class="input" style="display:block;max-width:14rem;margin-top:4px;" aria-label="Producto">
                            <option value="">— Margen global —</option>${sel}
                        </select>
                    </label>
                </div>
                <p class="mt-md"><strong>Precio sugerido:</strong> <span id="mm-calc-out" class="positive" style="font-size:1.25rem;">—</span></p>
                <p class="text-sm text-secondary" id="mm-calc-detail"></p>
            </div>`);
    },

    renderCajaPOS(P, d, subId, bc, hoy) {
        const MF = MMFinance;
        const prods = d.inventario?.productos || [];
        const prec = d.precios || { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} };
        const subnav = `<div class="tabs" style="margin-bottom:1rem;flex-wrap:wrap;"><a href="${P.linkPerfil('minimarket', 'caja')}" class="tab-btn active">Caja cajero (POS)</a><a href="${P.linkPerfil('minimarket', 'caja', 'turno')}" class="tab-btn">Cierre por turno</a></div>`;
        const rows = prods.map(p => {
            const search = `${(p.nombre || '')} ${(p.codigo || '')}`.trim().toLowerCase();
            const pv = p.precioVenta != null && String(p.precioVenta).trim() !== '' ? parseFloat(p.precioVenta) : NaN;
            const sug = MF.precioSugerido(parseFloat(p.costoBase) || 0, parseFloat(prec.comisionMaquinasPct) || 0, MF.margenEfectivoProducto(p.id, prec, p));
            const precioMostrar = Number.isFinite(pv) && pv >= 0 ? pv : sug;
            return `<button type="button" class="mm-pos-prod-row row-item" style="text-align:left;width:100%;cursor:pointer;border:1px solid var(--border-color,#333);border-radius:8px;padding:8px;margin-bottom:6px;background:transparent;color:inherit;" data-id="${P.esc(p.id)}" data-search="${P.esc(search)}" data-precio-ref="${String(precioMostrar)}">
                <strong>${P.esc(p.nombre)}</strong>${p.codigo ? ' <span class="muted text-sm">· ' + P.esc(p.codigo) + '</span>' : ''}<br/>
                <span class="text-sm">Stock: ${p.stock ?? 0} ${P.esc(p.unidad || 'u.')} · Ref. ${P.money(precioMostrar)}</span>
            </button>`;
        }).join('') || '<p class="muted">Sin productos. Crea productos en Inventario (código y costo opcionales para el calculador).</p>';
        return P.wrap('minimarket', 'Caja cajero', bc, subnav + `
            <p class="muted text-sm">Ventas con descuento de stock e ingreso en Finanzas (<code>origenCaja: pos</code>). Precio ref.: venta manual o calculado (costo + margen de Precios).</p>
            <div class="card mb-md">
                <h2 class="card-title">Productos</h2>
                <input type="search" id="mm-pos-buscar" class="input" style="width:100%;max-width:420px;margin-bottom:0.75rem;" placeholder="Buscar por nombre o código…" autocomplete="off"/>
                <div id="mm-pos-lista" style="max-height:280px;overflow-y:auto;">${rows}</div>
            </div>
            <div class="card">
                <h2 class="card-title">Venta</h2>
                <input type="hidden" id="mm-pos-pid" value=""/>
                <p id="mm-pos-sel-label" class="text-secondary text-sm mb-md">Selecciona un producto arriba.</p>
                <div class="form-row" style="flex-wrap:wrap;align-items:flex-end;">
                    <label>Precio unitario<input type="number" id="mm-pos-precio" step="0.01" class="input" style="display:block;max-width:10rem;margin-top:4px;" placeholder="0" disabled aria-label="Precio unitario"/></label>
                    <button type="button" id="btn-mm-pos-aplicar-precio" class="btn btn-secondary btn-sm" disabled>Aplicar precio calculado</button>
                    <label>Cantidad<input type="number" id="mm-pos-cant" min="1" step="1" value="1" class="input" style="display:block;max-width:6rem;margin-top:4px;" aria-label="Cantidad"/></label>
                    <label>Medio de pago
                        <select id="mm-pos-medio" class="input" style="display:block;margin-top:4px;">
                            <option value="efectivo">Efectivo</option>
                            <option value="debito">Débito / transferencia</option>
                        </select>
                    </label>
                </div>
                <p class="mt-md"><strong>Total:</strong> <span id="mm-pos-total" class="positive">—</span></p>
                <button type="button" id="btn-mm-pos-venta" class="btn btn-primary mt-md" disabled>Registrar venta</button>
            </div>`);
    },

    _bindCajaPOS(slug, rerender) {
        const sync = () => { try { TrabajoStorage.syncIngresoNetoToPersonal(); } catch (e) {} };
        const money = n => (typeof TrabajoApp !== 'undefined' ? TrabajoApp.money(n) : String(n));

        const updateTotal = () => {
            const pr = parseFloat(document.getElementById('mm-pos-precio')?.value) || 0;
            const q = parseInt(document.getElementById('mm-pos-cant')?.value, 10) || 0;
            const el = document.getElementById('mm-pos-total');
            if (el) el.textContent = money(pr * q);
        };

        document.getElementById('mm-pos-buscar')?.addEventListener('input', e => {
            const q = (e.target.value || '').toLowerCase().trim();
            document.querySelectorAll('.mm-pos-prod-row').forEach(row => {
                const s = (row.dataset.search || '').toLowerCase();
                row.style.display = !q || s.includes(q) ? '' : 'none';
            });
        });

        document.querySelectorAll('.mm-pos-prod-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.dataset.id;
                const ref = parseFloat(btn.dataset.precioRef) || 0;
                document.getElementById('mm-pos-pid').value = pid;
                const precioEl = document.getElementById('mm-pos-precio');
                precioEl.disabled = false;
                precioEl.value = ref > 0 ? String(Math.round(ref)) : '';
                document.getElementById('btn-mm-pos-aplicar-precio').disabled = false;
                document.getElementById('btn-mm-pos-venta').disabled = false;
                const d = TrabajoStorage.getPerfilData(slug);
                const p = (d.inventario?.productos || []).find(x => x.id === pid);
                const lab = document.getElementById('mm-pos-sel-label');
                if (lab) lab.textContent = p ? `Seleccionado: ${p.nombre}` : '';
                updateTotal();
            });
        });

        document.getElementById('mm-pos-precio')?.addEventListener('input', updateTotal);
        document.getElementById('mm-pos-cant')?.addEventListener('input', updateTotal);

        document.getElementById('btn-mm-pos-aplicar-precio')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const pid = document.getElementById('mm-pos-pid').value;
            if (!pid) return;
            const p = (d.inventario?.productos || []).find(x => x.id === pid);
            if (!p) return;
            const prec = d.precios || { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} };
            const calc = MMFinance.precioSugerido(parseFloat(p.costoBase) || 0, parseFloat(prec.comisionMaquinasPct) || 0, MMFinance.margenEfectivoProducto(p.id, prec, p));
            const inp = document.getElementById('mm-pos-precio');
            if (inp) inp.value = calc > 0 ? String(Math.round(calc)) : '';
            updateTotal();
        });

        document.getElementById('btn-mm-pos-venta')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const pid = document.getElementById('mm-pos-pid').value;
            const cant = parseInt(document.getElementById('mm-pos-cant').value, 10) || 0;
            const precio = parseFloat(document.getElementById('mm-pos-precio').value) || 0;
            const medio = document.getElementById('mm-pos-medio').value;
            if (!pid || cant < 1 || precio <= 0) {
                this._toast('Selecciona producto, cantidad y precio válidos.', 'warning');
                return;
            }
            const p = (d.inventario.productos || []).find(x => x.id === pid);
            if (!p) return;
            const stock = parseInt(p.stock, 10) || 0;
            if (stock < cant) {
                this._toast('Stock insuficiente.', 'warning');
                return;
            }
            p.stock = stock - cant;
            if (!d.inventario.movimientos) d.inventario.movimientos = [];
            const fecha = new Date().toISOString().slice(0, 10);
            d.inventario.movimientos.push({
                id: Date.now().toString(),
                fecha,
                tipo: 'salida',
                productoId: pid,
                detalle: `Venta POS ${cant} · ${p.nombre} · ${medio}`
            });
            if (!d.finanzas.ingresos) d.finanzas.ingresos = [];
            const cat = 'Ventas POS';
            if (!Array.isArray(d.finanzas.categorias)) d.finanzas.categorias = ['Operación', 'Insumos', 'Servicios', 'Otros'];
            if (!d.finanzas.categorias.includes(cat)) d.finanzas.categorias.push(cat);
            const total = cant * precio;
            d.finanzas.ingresos.push({
                id: Date.now().toString() + 'i',
                monto: String(total),
                concepto: `Venta POS: ${p.nombre} ×${cant} (${medio})`,
                fecha,
                categoria: cat,
                origenCaja: 'pos'
            });
            TrabajoStorage.savePerfilData(slug, d);
            sync();
            this._toast('Venta registrada.', 'success');
            rerender();
        });
    },

    _archivoFacturaOpcional(file) {
        if (!file) return Promise.resolve('');
        if (file.type && file.type.startsWith('image/')) return this._compressImageFile(file);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const s = reader.result;
                if (typeof s === 'string' && s.length > this.MAX_FOTO_B64) reject(new Error('Archivo demasiado grande (máx. ~200 KB en base64).'));
                else resolve(s);
            };
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsDataURL(file);
        });
    },

    _compressImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const maxW = 1000;
                    let w = img.width;
                    let h = img.height;
                    if (w > maxW) {
                        h = Math.round(h * maxW / w);
                        w = maxW;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    let q = 0.82;
                    let dataUrl = canvas.toDataURL('image/jpeg', q);
                    while (dataUrl.length > this.MAX_FOTO_B64 && q > 0.35) {
                        q -= 0.07;
                        dataUrl = canvas.toDataURL('image/jpeg', q);
                    }
                    if (dataUrl.length > this.MAX_FOTO_B64) reject(new Error('La imagen sigue siendo demasiado grande. Prueba otra foto.'));
                    else resolve(dataUrl);
                };
                img.onerror = () => reject(new Error('No se pudo leer la imagen'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(reader.error || new Error('Lectura'));
            reader.readAsDataURL(file);
        });
    },

    bind(P, slug, section, subId, subId2, rerender) {
        const sync = () => { try { TrabajoStorage.syncIngresoNetoToPersonal(); } catch (e) {} };

        const on = (sel, ev, fn) => {
            const el = typeof sel === 'string' ? document.getElementById(sel) : sel;
            el && el.addEventListener(ev, fn);
        };

        if (section === 'finanzas') {
            on('mm-fin-mes-vista', 'change', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const v = document.getElementById('mm-fin-mes-vista').value;
                if (/^\d{4}-\d{2}$/.test(v)) {
                    d.finanzas.mesVista = v;
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                }
            });
            on('btn-mm-fin-ing', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas.ingresos) d.finanzas.ingresos = [];
                d.finanzas.ingresos.push({
                    id: Date.now().toString(),
                    monto: document.getElementById('mm-fin-ing-m').value,
                    concepto: document.getElementById('mm-fin-ing-d').value.trim(),
                    fecha: document.getElementById('mm-fin-ing-f').value,
                    categoria: document.getElementById('mm-fin-ing-c').value
                });
                TrabajoStorage.savePerfilData(slug, d);
                sync();
                rerender();
            });
            on('btn-mm-fin-gas', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas.gastos) d.finanzas.gastos = [];
                d.finanzas.gastos.push({
                    id: Date.now().toString(),
                    monto: document.getElementById('mm-fin-gas-m').value,
                    concepto: document.getElementById('mm-fin-gas-d').value.trim(),
                    fecha: document.getElementById('mm-fin-gas-f').value,
                    categoria: document.getElementById('mm-fin-gas-c').value
                });
                TrabajoStorage.savePerfilData(slug, d);
                sync();
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-fin').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const key = btn.dataset.tipo === 'ingreso' ? 'ingresos' : 'gastos';
                    d.finanzas[key] = (d.finanzas[key] || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    sync();
                    rerender();
                });
            });
            on('btn-mm-act-add', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('mm-act-nombre').value.trim();
                if (!nombre) return;
                if (!d.finanzas.activos) d.finanzas.activos = [];
                d.finanzas.activos.push({ id: Date.now().toString(), nombre, monto: document.getElementById('mm-act-monto').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            on('btn-mm-pas-add', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('mm-pas-nombre').value.trim();
                if (!nombre) return;
                if (!d.finanzas.pasivos) d.finanzas.pasivos = [];
                d.finanzas.pasivos.push({ id: Date.now().toString(), nombre, monto: document.getElementById('mm-pas-monto').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-act').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.finanzas.activos = (d.finanzas.activos || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.querySelectorAll('.btn-del-mm-pas').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.finanzas.pasivos = (d.finanzas.pasivos || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            on('btn-mm-pago-add', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const titulo = document.getElementById('mm-pago-titulo').value.trim();
                const fecha = document.getElementById('mm-pago-fecha').value;
                if (!titulo || !fecha) {
                    this._toast('Indica concepto y fecha.', 'warning');
                    return;
                }
                if (!d.finanzas.pagosProgramados) d.finanzas.pagosProgramados = [];
                d.finanzas.pagosProgramados.push({
                    id: Date.now().toString(),
                    titulo,
                    fecha,
                    monto: document.getElementById('mm-pago-monto').value,
                    notas: document.getElementById('mm-pago-notas').value.trim()
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-pago').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.finanzas.pagosProgramados = (d.finanzas.pagosProgramados || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.querySelectorAll('.btn-mm-pago-agenda').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const p = (d.finanzas.pagosProgramados || []).find(x => x.id === btn.dataset.id);
                    if (!p) return;
                    TrabajoStorage.ensurePerfilAgenda(d);
                    const t = TrabajoStorage.normalizeAgendaTarea({
                        titulo: `Pago: ${p.titulo || 'Recordatorio'}`,
                        fecha: p.fecha,
                        descripcion: [p.monto != null && p.monto !== '' ? `Monto: ${p.monto}` : '', p.notas || ''].filter(Boolean).join(' · '),
                        enlaceSeccion: 'minimarket/finanzas/flujo',
                        prioridad: 'media',
                        origen: 'manual'
                    });
                    d.agenda.tareasAgenda.push(t);
                    TrabajoStorage.savePerfilData(slug, d);
                    this._toast('Añadido a la agenda del perfil.', 'success');
                });
            });
            on('mm-fact-filtro-tipo', 'change', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.finanzas.filtroFacturasTipo = document.getElementById('mm-fact-filtro-tipo').value;
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            on('btn-mm-sii-save', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.siiReferencia) d.siiReferencia = { tasaIVA: 19, regimen: '', factorEstimacionIVA: 0.19, mostrarEstimacionIVA: true };
                d.siiReferencia.tasaIVA = parseFloat(document.getElementById('mm-sii-tasa').value) || 0;
                d.siiReferencia.factorEstimacionIVA = parseFloat(document.getElementById('mm-sii-factor').value) || 0;
                d.siiReferencia.regimen = document.getElementById('mm-sii-regimen').value.trim();
                d.siiReferencia.mostrarEstimacionIVA = !!document.getElementById('mm-sii-mostrar-est')?.checked;
                TrabajoStorage.savePerfilData(slug, d);
                this._toast('Parámetros de referencia guardados.', 'success');
                rerender();
            });
            on('btn-mm-fact-add', 'click', async () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const fecha = document.getElementById('mm-fact-fecha').value;
                const contraparte = document.getElementById('mm-fact-contraparte').value.trim();
                if (!fecha || !contraparte) {
                    this._toast('Fecha y contraparte son obligatorios.', 'warning');
                    return;
                }
                let archivoBase64 = '';
                const finput = document.getElementById('mm-fact-archivo');
                if (finput && finput.files && finput.files[0]) {
                    try {
                        archivoBase64 = await this._archivoFacturaOpcional(finput.files[0]);
                    } catch (err) {
                        this._toast(err.message || 'No se pudo adjuntar el archivo', 'error');
                        return;
                    }
                }
                if (!d.facturas) d.facturas = [];
                d.facturas.push({
                    id: Date.now().toString(),
                    tipo: document.getElementById('mm-fact-tipo').value === 'venta' ? 'venta' : 'compra',
                    folio: document.getElementById('mm-fact-folio').value.trim(),
                    fecha,
                    contraparte,
                    montoNeto: document.getElementById('mm-fact-neto').value,
                    montoExento: document.getElementById('mm-fact-exento').value,
                    notas: document.getElementById('mm-fact-notas').value.trim(),
                    archivoBase64: archivoBase64 || undefined
                });
                TrabajoStorage.savePerfilData(slug, d);
                this._toast('Factura guardada.', 'success');
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-fact').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.facturas = (d.facturas || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }

        if (section === 'proveedores') {
            on('btn-mm-prov-add', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('mm-prov-nombre').value.trim();
                if (!nombre) return;
                if (!d.proveedores) d.proveedores = [];
                d.proveedores.push({
                    id: Date.now().toString(),
                    nombre,
                    contacto: document.getElementById('mm-prov-contacto').value.trim(),
                    notas: document.getElementById('mm-prov-notas').value.trim()
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-prov').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.proveedores = (d.proveedores || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }

        if (section === 'recepciones') {
            on('btn-mm-rec-add', 'click', async () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const proveedorId = document.getElementById('mm-rec-prov').value;
                const detalle = document.getElementById('mm-rec-detalle').value.trim();
                const fecha = document.getElementById('mm-rec-fecha').value;
                if (!proveedorId || !detalle || !fecha) {
                    this._toast('Proveedor, fecha y detalle son obligatorios.', 'warning');
                    return;
                }
                const fileInput = document.getElementById('mm-rec-foto');
                let foto = '';
                if (fileInput.files && fileInput.files[0]) {
                    try {
                        foto = await this._compressImageFile(fileInput.files[0]);
                    } catch (err) {
                        this._toast(err.message || 'No se pudo procesar la imagen', 'error');
                        return;
                    }
                }
                if (!d.recepciones) d.recepciones = [];
                d.recepciones.push({
                    id: Date.now().toString(),
                    proveedorId,
                    fecha,
                    detalle,
                    fotoFacturaBase64: foto || undefined
                });
                TrabajoStorage.savePerfilData(slug, d);
                this._toast('Recepción guardada.', 'success');
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-rec').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.recepciones = (d.recepciones || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }

        if (section === 'precios') {
            const updateCalc = () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const costo = parseFloat(document.getElementById('mm-calc-costo')?.value) || 0;
                const pid = document.getElementById('mm-calc-prod')?.value || '';
                const prec = d.precios || {};
                const prod = pid ? (d.inventario?.productos || []).find(p => p.id === pid) : null;
                const m = MMFinance.margenEfectivoProducto(pid || null, prec, prod);
                const com = parseFloat(prec.comisionMaquinasPct) || 0;
                const precio = MMFinance.precioSugerido(costo, com, m);
                const out = document.getElementById('mm-calc-out');
                const det = document.getElementById('mm-calc-detail');
                if (out) out.textContent = typeof TrabajoApp !== 'undefined' ? TrabajoApp.money(precio) : precio.toFixed(0);
                if (det) det.textContent = `Comisión ${com}% · Margen aplicado ${m.toFixed(1)}% · Fórmula: costo × (1+comisión) × (1+margen)`;
            };
            on('btn-mm-prec-save', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.precios) d.precios = { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} };
                d.precios.comisionMaquinasPct = parseFloat(document.getElementById('mm-prec-comision').value) || 0;
                d.precios.margenGlobalPct = parseFloat(document.getElementById('mm-prec-margen-global').value) || 0;
                TrabajoStorage.savePerfilData(slug, d);
                this._toast('Parámetros guardados.', 'success');
                updateCalc();
            });
            on('btn-mm-margen-save', 'click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.precios) d.precios = { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} };
                if (!d.precios.productosMargen) d.precios.productosMargen = {};
                document.querySelectorAll('.mm-margen-prod').forEach(inp => {
                    const id = inp.dataset.id;
                    const v = inp.value.trim();
                    if (v === '') delete d.precios.productosMargen[id];
                    else d.precios.productosMargen[id] = parseFloat(v) || 0;
                });
                TrabajoStorage.savePerfilData(slug, d);
                this._toast('Márgenes por producto guardados.', 'success');
                updateCalc();
            });
            on('mm-calc-costo', 'input', updateCalc);
            on('mm-calc-prod', 'change', updateCalc);
            updateCalc();
        }

        if (section === 'caja' && subId !== 'turno') {
            this._bindCajaPOS(slug, rerender);
        }
    }
};
