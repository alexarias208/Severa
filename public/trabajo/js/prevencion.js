/**
 * Prevención de riesgos — clientes, obras, tareas, documentación, EPP.
 * Depende de TrabajoStorage, TrabajoPerfiles (linkPerfil), TrabajoApp (toast opcional).
 */
const TrabajoPrevencion = {
    TAREA_ESTADO: { pendiente: 'Pendiente', en_curso: 'En curso', hecha: 'Hecha' },
    OBRA_ESTADO: { planificada: 'Planificada', activa: 'Activa', suspendida: 'Suspendida', cerrada: 'Cerrada' },
    MAX_ADJUNTO_B64: 180000,

    ensureCliente(c) {
        if (!c) return;
        if (c.activo === undefined) c.activo = true;
        if (c.notas === undefined) c.notas = '';
        if (c.contacto === undefined) c.contacto = '';
        if (!Array.isArray(c.trabajadores)) c.trabajadores = [];
    },

    ensureObra(o) {
        if (!o) return;
        if (!o.estado) o.estado = 'activa';
        if (o.fechaInicio === undefined) o.fechaInicio = '';
        if (o.fechaFin === undefined) o.fechaFin = '';
        if (o.direccion === undefined) o.direccion = o.ubicacion || '';
        if (!Array.isArray(o.documentos)) o.documentos = [];
        if (!Array.isArray(o.docsRequeridos)) o.docsRequeridos = [];
        if (!Array.isArray(o.eppObra)) o.eppObra = [];
        if (!Array.isArray(o.trabajadoresIds)) o.trabajadoresIds = [];
        if (!Array.isArray(o.eppCumplimientoPersona)) o.eppCumplimientoPersona = [];
    },

    /**
     * KPI fijo: entre trabajadores asignados a la obra (IDs en obra.trabajadoresIds que existen en cliente.trabajadores),
     * porcentaje de quienes cumplen TODOS los EPP obligatorios (eppObra con obligatorio=true).
     * Sin trabajadores asignados → null (N/A). Sin EPP obligatorios pero con trabajadores → 100%.
     */
    mandatoryEppIds(o) {
        return (o.eppObra || []).filter(r => r.obligatorio).map(r => r.eppId);
    },

    trabajadoresEnObra(d, o) {
        const cli = (d.clientes || []).find(c => c.id === o.clienteId);
        if (!cli || !Array.isArray(cli.trabajadores)) return [];
        const ids = new Set(o.trabajadoresIds || []);
        return cli.trabajadores.filter(t => ids.has(t.id));
    },

    cumplePersonaEpp(o, trabajadorId, eppId) {
        const r = (o.eppCumplimientoPersona || []).find(x => x.trabajadorId === trabajadorId && x.eppId === eppId);
        return !!(r && r.cumple);
    },

    kpiObra(d, o) {
        this.ensureObra(o);
        const workers = this.trabajadoresEnObra(d, o);
        const M = this.mandatoryEppIds(o);
        if (workers.length === 0) return { pct: null, complete: 0, total: 0, missingMandatory: M.length };
        if (M.length === 0) return { pct: 100, complete: workers.length, total: workers.length, missingMandatory: 0 };
        let complete = 0;
        workers.forEach(w => {
            const ok = M.every(eid => this.cumplePersonaEpp(o, w.id, eid));
            if (ok) complete++;
        });
        return {
            pct: Math.round((100 * complete) / workers.length),
            complete,
            total: workers.length,
            missingMandatory: M.length
        };
    },

    /** Quita filas huérfanas si cambian asignación u obligatorios. */
    syncEppCumplimientoObra(d, o) {
        this.ensureObra(o);
        const workers = this.trabajadoresEnObra(d, o);
        const wids = new Set(workers.map(w => w.id));
        const M = new Set(this.mandatoryEppIds(o));
        o.eppCumplimientoPersona = (o.eppCumplimientoPersona || []).filter(r => wids.has(r.trabajadorId) && M.has(r.eppId));
    },

    eppTabsHtml(P, activePanel) {
        const p = activePanel === 'panel' ? 'active' : '';
        const c = activePanel === 'catalogo' ? 'active' : '';
        return `<div class="tabs" style="margin-bottom:1rem;flex-wrap:wrap;">
            <a href="${P.linkPerfil('prevencionista', 'epp')}" class="tab-btn ${p}">Panel obras · KPI</a>
            <a href="${P.linkPerfil('prevencionista', 'epp', 'catalogo')}" class="tab-btn ${c}">Catálogo EPP</a>
        </div>`;
    },

    ensureTarea(t) {
        if (!t) return;
        if (!t.estado || !this.TAREA_ESTADO[t.estado]) t.estado = 'pendiente';
        if (!Array.isArray(t.documentos)) t.documentos = [];
        if (!Array.isArray(t.eppTarea)) t.eppTarea = [];
    },

    _toast(msg, kind) {
        if (typeof TrabajoApp !== 'undefined' && TrabajoApp.toast) TrabajoApp.toast(msg, kind);
        else alert(msg);
    },

    renderClientes(P, d, bc) {
        const hoy = new Date().toISOString().slice(0, 10);
        const list = (d.clientes || []).map(c => {
            this.ensureCliente(c);
            const act = c.activo !== false;
            return `<div class="row-item prev-cli-row" data-nombre="${P.esc((c.nombre || '').toLowerCase())}" data-emp="${P.esc((c.empresa || '').toLowerCase())}">
                <span><a href="${P.linkPerfil('prevencionista', 'cliente', c.id)}"><strong>${P.esc(c.nombre)}</strong></a>
                ${c.empresa ? ` <span class="muted">${P.esc(c.empresa)}</span>` : ''}
                ${!act ? ' <span class="muted text-sm">(inactivo)</span>' : ''}</span>
                <span class="muted text-sm">${P.esc(c.telefono || c.contacto || '')}</span>
                <button type="button" class="btn-sm btn-prev-cli-toggle" data-id="${P.esc(c.id)}" title="Activar/desactivar">${act ? 'Desactivar' : 'Activar'}</button>
                <button type="button" class="btn-sm btn-del-prev-cli" data-id="${P.esc(c.id)}" aria-label="Eliminar">✕</button>
            </div>`;
        }).join('');
        return P.wrap('prevencionista', 'Clientes', bc, `
            <p class="muted text-sm">Cadena: <strong>cliente → obra → tareas</strong>. Desde cada cliente ves sus obras; cada obra concentra tareas, documentos y EPP.</p>
            <div class="card"><h2>Nuevo cliente</h2>
                <div class="form-row" style="flex-wrap:wrap;">
                    <input type="text" id="prev-cli-nombre" placeholder="Nombre / razón social" aria-label="Nombre"/>
                    <input type="text" id="prev-cli-contacto" placeholder="Persona de contacto" aria-label="Contacto"/>
                    <input type="text" id="prev-cli-emp" placeholder="Empresa (opc.)" aria-label="Empresa"/>
                    <input type="text" id="prev-cli-tel" placeholder="Teléfono / mail" aria-label="Teléfono"/>
                    <input type="text" id="prev-cli-notas" placeholder="Notas" style="min-width:220px;" aria-label="Notas"/>
                    <button type="button" id="btn-prev-cli-add" class="btn btn-primary">Guardar</button>
                </div>
            </div>
            <div class="card"><h2>Listado</h2>
                <div class="form-row" style="margin-bottom:0.75rem;">
                    <input type="search" id="prev-cli-buscar" class="input" style="max-width:320px;" placeholder="Buscar por nombre o empresa…" aria-label="Buscar"/>
                </div>
                <div id="prev-cli-list">${list || '<p class="muted">Sin clientes.</p>'}</div>
            </div>`);
    },

    renderCliente(P, d, bc, clienteId) {
        const c = (d.clientes || []).find(x => x.id === clienteId);
        if (!c) return P.wrap('prevencionista', 'Cliente', bc, '<p class="muted">Cliente no encontrado.</p>');
        this.ensureCliente(c);
        const obras = (d.obras || []).filter(o => o.clienteId === c.id);
        obras.forEach(o => this.ensureObra(o));
        const listaObras = obras.length ? obras.map(o => `<div class="row-item">
            <a href="${P.linkPerfil('prevencionista', 'obra', o.id)}">${P.esc(o.nombre)}</a>
            <span class="muted">${P.esc(o.estado || '')} · ${P.esc(o.direccion || o.ubicacion || '')}</span>
        </div>`).join('') : '<p class="muted">Sin obras. Crea una en <a href="' + P.linkPerfil('prevencionista', 'obras') + '">Obras</a>.</p>';

        return P.wrap('prevencionista', P.esc(c.nombre), `${bc} <span aria-hidden="true">/</span> <span>Cliente</span>`, `
            <div class="card"><h2>Ficha</h2>
                <input type="hidden" id="prev-cli-edit-id" value="${P.esc(c.id)}"/>
                <table class="trabajo-table trabajo-table--form"><tbody>
                    <tr><td>Nombre</td><td><input type="text" id="prev-cli-edit-nombre" class="trabajo-input-inline" value="${P.esc(c.nombre)}"/></td></tr>
                    <tr><td>Contacto</td><td><input type="text" id="prev-cli-edit-contacto" class="trabajo-input-inline" value="${P.esc(c.contacto || '')}"/></td></tr>
                    <tr><td>Empresa</td><td><input type="text" id="prev-cli-edit-emp" class="trabajo-input-inline" value="${P.esc(c.empresa || '')}"/></td></tr>
                    <tr><td>Teléfono</td><td><input type="text" id="prev-cli-edit-tel" class="trabajo-input-inline" value="${P.esc(c.telefono || '')}"/></td></tr>
                    <tr><td>Notas</td><td><textarea id="prev-cli-edit-notas" rows="3" class="trabajo-input">${P.esc(c.notas || '')}</textarea></td></tr>
                    <tr><td>Estado</td><td><label><input type="checkbox" id="prev-cli-edit-activo" ${c.activo !== false ? 'checked' : ''}/> Cliente activo</label></td></tr>
                </tbody></table>
                <button type="button" id="btn-prev-cli-save" class="btn btn-primary">Guardar cambios</button>
            </div>
            <div class="card"><h2>Trabajadores / funcionarios</h2>
                <p class="muted text-sm">Lista maestra del cliente. En cada obra eliges quiénes están asignados; el KPI EPP usa solo esas personas.</p>
                ${(c.trabajadores || []).length ? (c.trabajadores || []).map(t => `<div class="row-item">
                    <span><strong>${P.esc(t.nombre)}</strong> · ${P.esc(t.cargo || '')} · ${P.esc(t.contacto || '')}</span>
                    <button type="button" class="btn-sm btn-prev-trab-del" data-id="${P.esc(t.id)}" aria-label="Quitar">✕</button>
                </div>`).join('') : '<p class="muted">Sin trabajadores registrados.</p>'}
                <div class="form-row" style="flex-wrap:wrap;margin-top:0.75rem;">
                    <input type="text" id="prev-trab-nom" placeholder="Nombre" class="input"/>
                    <input type="text" id="prev-trab-cargo" placeholder="Cargo" class="input"/>
                    <input type="text" id="prev-trab-contacto" placeholder="Contacto" class="input"/>
                    <button type="button" id="btn-prev-trab-add" class="btn btn-secondary btn-sm">Añadir trabajador</button>
                </div>
            </div>
            <div class="card"><h2>Obras asociadas</h2>${listaObras}</div>`);
    },

    renderObras(P, d, bc) {
        const clis = d.clientes || [];
        const opts = clis.map(c => `<option value="${P.esc(c.id)}">${P.esc(c.nombre)}</option>`).join('');
        const list = (d.obras || []).map(o => {
            this.ensureObra(o);
            const cl = clis.find(x => x.id === o.clienteId);
            return `<div class="row-item prev-obra-row" data-nombre="${P.esc((o.nombre || '').toLowerCase())}" data-cli="${P.esc((cl?.nombre || '').toLowerCase())}">
                <span><a href="${P.linkPerfil('prevencionista', 'obra', o.id)}"><strong>${P.esc(o.nombre)}</strong></a>
                <span class="muted"> · ${P.esc(cl?.nombre || 'Cliente')} · ${P.esc(this.OBRA_ESTADO[o.estado] || o.estado)}</span></span>
                <button type="button" class="btn-sm btn-del-prev-obra" data-id="${P.esc(o.id)}" aria-label="Eliminar">✕</button>
            </div>`;
        }).join('');
        return P.wrap('prevencionista', 'Obras / sitios', bc, `
            <p class="muted text-sm">Cada obra vincula a un cliente. Desde el detalle gestionas tareas, documentos y checklist EPP.</p>
            <div class="card"><h2>Nueva obra</h2>
                <div class="form-row" style="flex-wrap:wrap;align-items:flex-end;">
                    <label>Cliente<select id="prev-obra-cli" class="input" style="display:block;margin-top:4px;">${opts || '<option value="">— Cree un cliente —</option>'}</select></label>
                    <input type="text" id="prev-obra-nombre" placeholder="Nombre obra / sitio" aria-label="Nombre"/>
                    <input type="text" id="prev-obra-direccion" placeholder="Dirección / ubicación" aria-label="Dirección"/>
                    <input type="text" id="prev-obra-datos" placeholder="Notas del proyecto" aria-label="Notas"/>
                    <label>Estado<select id="prev-obra-estado" class="input" style="display:block;margin-top:4px;">${Object.keys(this.OBRA_ESTADO).map(k => `<option value="${k}">${this.OBRA_ESTADO[k]}</option>`).join('')}</select></label>
                    <input type="date" id="prev-obra-ini" aria-label="Inicio"/>
                    <input type="date" id="prev-obra-fin" aria-label="Fin"/>
                    <button type="button" id="btn-prev-obra-add" class="btn btn-primary">Guardar</button>
                </div>
            </div>
            <div class="card"><h2>Listado</h2>
                <div class="form-row" style="margin-bottom:0.75rem;">
                    <input type="search" id="prev-obra-buscar" class="input" style="max-width:320px;" placeholder="Filtrar por obra o cliente…" aria-label="Filtrar"/>
                </div>
                <div id="prev-obra-list">${list || '<p class="muted">Sin obras.</p>'}</div>
            </div>`);
    },

    renderObra(P, d, bc, obraId) {
        const o = (d.obras || []).find(x => x.id === obraId);
        if (!o) return P.wrap('prevencionista', 'Obra', bc, '<p class="muted">Obra no encontrada.</p>');
        this.ensureObra(o);
        const cli = (d.clientes || []).find(c => c.id === o.clienteId);
        const tareas = (d.tareas || []).filter(t => t.obraId === o.id);
        tareas.forEach(t => this.ensureTarea(t));
        const cata = d.eppCatalogo || [];
        const eppRows = (o.eppObra || []).map((row, i) => {
            const ep = cata.find(e => e.id === row.eppId);
            const nom = ep ? ep.nombre : row.eppId;
            return `<div class="row-item" style="align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <label><input type="checkbox" class="prev-epp-obra-ver" data-i="${i}" ${row.verificado ? 'checked' : ''}/> ${P.esc(nom)}</label>
                <label class="text-sm">Oblig. <input type="checkbox" class="prev-epp-obra-obl" data-i="${i}" ${row.obligatorio ? 'checked' : ''}/></label>
                <input type="date" class="input prev-epp-obra-fecha" data-i="${i}" value="${P.esc(row.fechaVerificacion || '')}" aria-label="Verificación"/>
                <button type="button" class="btn-sm btn-prev-epp-obra-del" data-i="${i}" aria-label="Quitar">✕</button>
            </div>`;
        }).join('') || '<p class="muted">Sin ítems. Añade desde el catálogo EPP abajo.</p>';

        const docReq = (o.docsRequeridos || []).map((dr, i) => `<div class="row-item">
            <label><input type="checkbox" class="prev-doc-req-cargado" data-i="${i}" ${dr.cargado ? 'checked' : ''}/> ${P.esc(dr.etiqueta)}${dr.obligatorio ? ' <span class="muted">(oblig.)</span>' : ''}</label>
            <button type="button" class="btn-sm btn-prev-doc-req-del" data-i="${i}">Quitar</button>
        </div>`).join('') || '<p class="muted">Sin checklist. Añade documentos requeridos.</p>';

        const docs = (o.documentos || []).map(doc => `<div class="row-item">
            <strong>${P.esc(doc.titulo || '')}</strong> <span class="muted text-sm">${P.esc(doc.tipo || '')} · ${P.esc(doc.fecha || '')}</span>
            ${doc.nombreArchivo ? `<br/><span class="text-sm">${P.esc(doc.nombreArchivo)}</span>` : ''}
            ${doc.notas ? `<br/><span class="text-sm">${P.esc(doc.notas)}</span>` : ''}
            <button type="button" class="btn-sm btn-prev-doc-del" data-id="${P.esc(doc.id)}" aria-label="Eliminar">✕</button>
        </div>`).join('') || '<p class="muted">Sin archivos registrados.</p>';

        const tarRows = tareas.map(t => `<div class="row-item">
            <span class="trabajo-prio trabajo-prio--${t.estado === 'hecha' ? 'baja' : t.estado === 'en_curso' ? 'media' : 'alta'}">${P.esc(this.TAREA_ESTADO[t.estado])}</span>
            ${P.esc(t.descripcion || '')} · ${P.esc(t.responsable || '—')} · límite ${P.esc(t.fechaLimite || '—')}
            <button type="button" class="btn-sm btn-prev-tar-del" data-id="${P.esc(t.id)}" aria-label="Eliminar tarea">✕</button>
        </div>`).join('') || '<p class="muted">Sin tareas. Añade la primera abajo.</p>';

        const eppOpts = cata.map(e => `<option value="${P.esc(e.id)}">${P.esc(e.nombre)}</option>`).join('');
        if (cli) this.ensureCliente(cli);
        const trabList = cli ? (cli.trabajadores || []) : [];
        const trabChecks = trabList.length
            ? trabList.map(t => `<label class="prev-obra-trab-lab" style="display:block;margin:0.35rem 0;"><input type="checkbox" class="prev-obra-trab" data-tid="${P.esc(t.id)}" ${(o.trabajadoresIds || []).includes(t.id) ? 'checked' : ''}/> <strong>${P.esc(t.nombre)}</strong> <span class="muted text-sm">${P.esc(t.cargo || '')} · ${P.esc(t.contacto || '')}</span></label>`).join('')
            : '<p class="muted">No hay trabajadores en el cliente. Añádelos en la <a href="' + P.linkPerfil('prevencionista', 'cliente', o.clienteId) + '">ficha del cliente</a>.</p>';
        const M = this.mandatoryEppIds(o);
        const workers = this.trabajadoresEnObra(d, o);
        let matrixHtml = '';
        if (!workers.length || !M.length) {
            matrixHtml = '<p class="muted">' + (!workers.length ? 'Asigna trabajadores arriba.' : 'Marca ítems como obligatorios en «EPP en obra».') + '</p>';
        } else {
            const head = M.map(eid => {
                const ep = cata.find(e => e.id === eid);
                return `<th class="text-sm">${P.esc(ep ? ep.nombre : eid)}</th>`;
            }).join('');
            const body = workers.map(w => {
                const cells = M.map(eid => {
                    const c = this.cumplePersonaEpp(o, w.id, eid);
                    return `<td style="text-align:center;"><input type="checkbox" class="prev-epp-cumple" data-tid="${P.esc(w.id)}" data-eid="${P.esc(eid)}" ${c ? 'checked' : ''} title="Cumple"/></td>`;
                }).join('');
                return `<tr><td>${P.esc(w.nombre)} <span class="muted text-sm">${P.esc(w.cargo || '')}</span></td>${cells}</tr>`;
            }).join('');
            matrixHtml = `<div style="overflow-x:auto;"><table class="trabajo-table prev-epp-matrix"><thead><tr><th>Persona</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
        }

        return P.wrap('prevencionista', P.esc(o.nombre), `${bc} <span aria-hidden="true">/</span> <a href="${P.linkPerfil('prevencionista', 'cliente', o.clienteId)}">${P.esc(cli?.nombre || 'Cliente')}</a> <span aria-hidden="true">/</span> <span>Obra</span>`, `
            <input type="hidden" id="prev-obra-det-id" value="${P.esc(o.id)}"/>
            <div class="card"><h2>Datos de la obra</h2>
                <div class="form-row" style="flex-wrap:wrap;">
                    <input type="text" id="prev-obra-det-nombre" value="${P.esc(o.nombre)}" class="input" aria-label="Nombre"/>
                    <label>Estado<select id="prev-obra-det-estado" class="input">${Object.keys(this.OBRA_ESTADO).map(k => `<option value="${k}" ${o.estado === k ? 'selected' : ''}>${this.OBRA_ESTADO[k]}</option>`).join('')}</select></label>
                    <input type="text" id="prev-obra-det-dir" value="${P.esc(o.direccion || o.ubicacion || '')}" placeholder="Dirección" class="input"/>
                    <input type="text" id="prev-obra-det-datos" value="${P.esc(o.datos || '')}" placeholder="Notas" class="input" style="min-width:200px;"/>
                    <input type="date" id="prev-obra-det-ini" value="${P.esc(o.fechaInicio || '')}" aria-label="Inicio"/>
                    <input type="date" id="prev-obra-det-fin" value="${P.esc(o.fechaFin || '')}" aria-label="Fin"/>
                    <button type="button" id="btn-prev-obra-det-save" class="btn btn-primary">Guardar obra</button>
                </div>
            </div>
            <div class="card"><h2>Trabajadores en esta obra</h2>
                <p class="muted text-sm">Lista maestra en el cliente; aquí marcas quiénes están en el sitio. El KPI del panel EPP usa solo a estas personas.</p>
                ${trabChecks}
            </div>
            <div class="card"><h2>Cumplimiento EPP obligatorio (por persona)</h2>
                <p class="muted text-sm">Una fila por persona asignada; columnas = EPP marcados como obligatorios abajo.</p>
                ${matrixHtml}
            </div>
            <div class="card"><h2>Tareas</h2><div id="prev-obra-tareas">${tarRows}</div>
                <h3 class="text-sm" style="margin-top:1rem;">Nueva tarea</h3>
                <div class="form-row" style="flex-wrap:wrap;">
                    <input type="text" id="prev-tar-desc" placeholder="Descripción" class="input" style="min-width:200px;"/>
                    <input type="text" id="prev-tar-resp" placeholder="Responsable" class="input"/>
                    <input type="date" id="prev-tar-lim" value="${new Date().toISOString().slice(0, 10)}" aria-label="Límite"/>
                    <input type="date" id="prev-tar-prog" aria-label="Programada"/>
                    <label>Estado<select id="prev-tar-estado" class="input"><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="hecha">Hecha</option></select></label>
                    <button type="button" id="btn-prev-tar-add" class="btn btn-primary">Añadir tarea</button>
                </div>
            </div>
            <div class="card"><h2>Documentos requeridos (checklist)</h2>${docReq}
                <div class="form-row" style="margin-top:0.75rem;">
                    <input type="text" id="prev-doc-req-etiq" placeholder="Etiqueta (ej. PTS, permiso)" class="input"/>
                    <label><input type="checkbox" id="prev-doc-req-obl"/> Obligatorio</label>
                    <button type="button" id="btn-prev-doc-req-add" class="btn btn-secondary btn-sm">Añadir ítem</button>
                </div>
            </div>
            <div class="card"><h2>Archivos / referencias</h2>
                <p class="muted text-sm">Metadatos y opcional adjunto (base64, tamaño moderado).</p>
                <div>${docs}</div>
                <div class="form-row" style="flex-wrap:wrap;margin-top:0.75rem;">
                    <input type="text" id="prev-doc-tit" placeholder="Título" class="input"/>
                    <input type="text" id="prev-doc-tipo" placeholder="Tipo" class="input"/>
                    <input type="date" id="prev-doc-fecha" value="${new Date().toISOString().slice(0, 10)}"/>
                    <input type="text" id="prev-doc-notas" placeholder="Notas" class="input" style="min-width:180px;"/>
                    <input type="file" id="prev-doc-file" accept="*/*"/>
                    <button type="button" id="btn-prev-doc-add" class="btn btn-primary">Registrar archivo</button>
                </div>
            </div>
            <div class="card"><h2>EPP en obra</h2>${eppRows}
                <div class="form-row" style="margin-top:0.75rem;">
                    <label>Ítem catálogo<select id="prev-epp-obra-add" class="input">${eppOpts || '<option value="">— Defina EPP en el menú EPP —</option>'}</select></label>
                    <button type="button" id="btn-prev-epp-obra-add" class="btn btn-secondary btn-sm">Añadir a checklist</button>
                </div>
            </div>`);
    },

    renderTareas(P, d, bc) {
        const obras = d.obras || [];
        let filtroObra = '';
        let filtroEst = '';
        try {
            const h = (window.location.hash || '').split('?');
            if (h[1]) {
                const q = new URLSearchParams(h[1]);
                filtroObra = q.get('obra') || '';
                filtroEst = q.get('estado') || '';
            }
        } catch (e) {}
        const optsObra = obras.map(o => `<option value="${P.esc(o.id)}" ${filtroObra === o.id ? 'selected' : ''}>${P.esc(o.nombre)}</option>`).join('');
        const tareas = (d.tareas || []).filter(t => {
            this.ensureTarea(t);
            if (filtroObra && t.obraId !== filtroObra) return false;
            if (filtroEst && t.estado !== filtroEst) return false;
            return true;
        }).sort((a, b) => (a.fechaLimite || '').localeCompare(b.fechaLimite || ''));

        const rows = tareas.map(t => {
            const o = obras.find(x => x.id === t.obraId);
            return `<tr>
                <td><a href="${P.linkPerfil('prevencionista', 'obra', t.obraId)}">${P.esc(o?.nombre || 'Obra')}</a></td>
                <td>${P.esc(t.descripcion || '')}</td>
                <td>${P.esc(t.responsable || '')}</td>
                <td>${P.esc(t.fechaLimite || '')}</td>
                <td><span class="trabajo-prio trabajo-prio--${t.estado === 'hecha' ? 'baja' : 'media'}">${P.esc(this.TAREA_ESTADO[t.estado])}</span></td>
                <td><button type="button" class="btn-sm btn-prev-tar-glob-del" data-id="${P.esc(t.id)}">✕</button></td>
            </tr>`;
        }).join('');

        return P.wrap('prevencionista', 'Tareas', bc, `
            <div class="card"><h2>Filtros</h2>
                <div class="form-row" style="flex-wrap:wrap;">
                    <label>Obra<select id="prev-tar-f-obra" class="input"><option value="">Todas</option>${optsObra}</select></label>
                    <label>Estado<select id="prev-tar-f-est" class="input"><option value="">Todos</option>${Object.keys(this.TAREA_ESTADO).map(k => `<option value="${k}" ${filtroEst === k ? 'selected' : ''}>${this.TAREA_ESTADO[k]}</option>`).join('')}</select></label>
                    <button type="button" id="btn-prev-tar-f-ap" class="btn btn-primary btn-sm">Aplicar</button>
                </div>
            </div>
            <div class="card" style="overflow-x:auto;"><h2>Listado</h2>
                <table class="trabajo-table"><thead><tr><th>Obra</th><th>Descripción</th><th>Responsable</th><th>Límite</th><th>Estado</th><th></th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="muted">Sin tareas.</td></tr>'}</tbody></table>
            </div>`);
    },

    renderEppPanel(P, d, bc) {
        let fEst = '';
        let fQ = '';
        let fSort = 'kpi_desc';
        try {
            fEst = sessionStorage.getItem('trabajo_prev_epp_f_est') || '';
            fQ = sessionStorage.getItem('trabajo_prev_epp_f_q') || '';
            fSort = sessionStorage.getItem('trabajo_prev_epp_sort') || 'kpi_desc';
        } catch (e) {}
        const clis = d.clientes || [];
        const obras = (d.obras || []).map(o => {
            this.ensureObra(o);
            const cli = clis.find(c => c.id === o.clienteId);
            const k = this.kpiObra(d, o);
            const contacto = [cli?.telefono, cli?.contacto].filter(Boolean).join(' · ') || '—';
            const q = (fQ || '').toLowerCase().trim();
            const hay = !q || `${o.nombre} ${o.direccion} ${cli?.nombre || ''}`.toLowerCase().includes(q);
            const okEst = !fEst || o.estado === fEst;
            return { o, cli, k, contacto, hay, okEst };
        }).filter(x => x.hay && x.okEst);

        obras.sort((a, b) => {
            const pa = a.k.pct == null ? -1 : a.k.pct;
            const pb = b.k.pct == null ? -1 : b.k.pct;
            if (fSort === 'kpi_asc') return pa - pb;
            return pb - pa;
        });

        const rows = obras.map(({ o, cli, k, contacto }) => {
            const kpiCell = k.pct == null ? '<span class="muted">N/A</span>' : `<strong>${k.pct}%</strong> <span class="muted text-sm">(${k.complete}/${k.total})</span>`;
            return `<tr class="prev-epp-panel-row" data-obra-id="${P.esc(o.id)}" style="cursor:pointer;" title="Ver detalle">
                <td><a href="${P.linkPerfil('prevencionista', 'obra', o.id)}" onclick="event.stopPropagation()">${P.esc(o.nombre)}</a></td>
                <td class="text-sm">${P.esc(o.direccion || o.ubicacion || '—')}</td>
                <td>${P.esc(cli?.nombre || '—')}</td>
                <td class="text-sm">${P.esc(contacto)}</td>
                <td>${P.esc(this.OBRA_ESTADO[o.estado] || o.estado)}</td>
                <td>${kpiCell}</td>
            </tr>`;
        }).join('');

        const estOpts = Object.keys(this.OBRA_ESTADO).map(k => `<option value="${k}" ${fEst === k ? 'selected' : ''}>${this.OBRA_ESTADO[k]}</option>`).join('');
        const sortOpts = [
            ['kpi_desc', 'KPI: mejor primero'],
            ['kpi_asc', 'KPI: peor primero']
        ].map(([v, lab]) => `<option value="${v}" ${fSort === v ? 'selected' : ''}>${lab}</option>`).join('');

        return P.wrap('prevencionista', 'EPP — panel por obra', bc, `
            ${this.eppTabsHtml(P, 'panel')}
            <p class="muted text-sm"><strong>KPI:</strong> % de trabajadores en la obra con <em>todos</em> los EPP marcados como obligatorios cumplidos a nivel persona. Sin trabajadores asignados en la obra → N/A.</p>
            <div class="card"><h2>Filtros</h2>
                <div class="form-row" style="flex-wrap:wrap;align-items:flex-end;">
                    <label>Estado obra<select id="prev-epp-f-est" class="input"><option value="">Todos</option>${estOpts}</select></label>
                    <input type="search" id="prev-epp-f-q" class="input" style="max-width:260px;" placeholder="Buscar obra, cliente, dirección…" value="${P.esc(fQ)}"/>
                    <label>Orden<select id="prev-epp-f-sort" class="input">${sortOpts}</select></label>
                    <button type="button" id="btn-prev-epp-f-ap" class="btn btn-primary btn-sm">Aplicar</button>
                </div>
            </div>
            <div class="card" style="overflow-x:auto;"><h2>Obras</h2>
                <table class="trabajo-table prev-epp-panel-table"><thead><tr><th>Obra</th><th>Dirección</th><th>Cliente</th><th>Contacto</th><th>Estado</th><th>KPI EPP</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="muted">Sin obras que coincidan.</td></tr>'}</tbody></table>
            </div>
            <dialog id="prev-epp-modal" class="prev-epp-modal" style="max-width:min(640px,92vw);border:1px solid var(--border-color,#444);border-radius:10px;padding:0;background:var(--bg-card,#1a1a1e);color:var(--text-primary);">
                <div style="padding:1rem 1rem 0;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                    <h2 style="margin:0;font-size:1.1rem;" id="prev-epp-modal-title">Detalle</h2>
                    <button type="button" id="prev-epp-modal-close" class="btn btn-ghost btn-sm">Cerrar</button>
                </div>
                <div id="prev-epp-modal-body" style="padding:1rem;max-height:70vh;overflow-y:auto;"></div>
            </dialog>`);
    },

    modalDetalleObraHtml(P, d, obraId) {
        const o = (d.obras || []).find(x => x.id === obraId);
        if (!o) return '<p class="muted">Obra no encontrada.</p>';
        this.ensureObra(o);
        const cli = (d.clientes || []).find(c => c.id === o.clienteId);
        const cata = Object.fromEntries((d.eppCatalogo || []).map(e => [e.id, e]));
        const workers = this.trabajadoresEnObra(d, o);
        const M = this.mandatoryEppIds(o);
        const lines = [];
        workers.forEach(w => {
            const falta = M.filter(eid => !this.cumplePersonaEpp(o, w.id, eid)).map(eid => (cata[eid] && cata[eid].nombre) || eid);
            lines.push(`<div class="row-item" style="flex-direction:column;align-items:flex-start;">
                <strong>${P.esc(w.nombre)}</strong><span class="muted text-sm">${P.esc(w.cargo || '')} · ${P.esc(w.contacto || '')}</span>
                ${falta.length ? `<span class="text-sm" style="color:#f59e0b;">Falta EPP: ${falta.map(f => P.esc(f)).join(', ')}</span>` : '<span class="text-sm positive">EPP obligatorio completo</span>'}
            </div>`);
        });
        const k = this.kpiObra(d, o);
        const kpiTxt = k.pct == null ? 'N/A (sin trabajadores en obra)' : `${k.pct}% (${k.complete}/${k.total} con EPP completo)`;
        return `
            <p class="muted text-sm">Cliente: <strong>${P.esc(cli?.nombre || '')}</strong> · ${P.esc(cli?.telefono || '')} ${P.esc(cli?.contacto || '')}</p>
            <p><strong>KPI:</strong> ${kpiTxt}</p>
            <h3 class="text-sm" style="margin:0.75rem 0 0.35rem;">Trabajadores en obra</h3>
            ${workers.length ? lines.join('') : '<p class="muted">Ninguno asignado. Defínelos en el cliente y márcalos en la obra.</p>'}
            <p style="margin-top:1rem;"><a class="btn btn-primary btn-sm" href="${P.linkPerfil('prevencionista', 'obra', o.id)}">Abrir ficha obra</a></p>`;
    },

    renderEppCatalogo(P, d, bc) {
        const rows = (d.eppCatalogo || []).map(e => `<div class="row-item">
            <span><strong>${P.esc(e.nombre)}</strong> · <span class="muted text-sm">${P.esc(e.descripcion || '')}</span></span>
            <button type="button" class="btn-sm btn-prev-epp-del" data-id="${P.esc(e.id)}">Eliminar</button>
        </div>`).join('') || '<p class="muted">Sin ítems en catálogo.</p>';
        return P.wrap('prevencionista', 'EPP — catálogo', bc, `
            ${this.eppTabsHtml(P, 'catalogo')}
            <p class="muted text-sm">Ítems reutilizables. En cada obra se marcan obligatorios y el cumplimiento por trabajador.</p>
            <div class="card"><h2>Nuevo ítem</h2>
                <div class="form-row">
                    <input type="text" id="prev-epp-nom" placeholder="Nombre (ej. Casco, Arnés)" aria-label="Nombre"/>
                    <input type="text" id="prev-epp-desc" placeholder="Descripción corta" style="min-width:240px;" aria-label="Descripción"/>
                    <button type="button" id="btn-prev-epp-add" class="btn btn-primary">Añadir</button>
                </div>
            </div>
            <div class="card"><h2>Catálogo</h2><div id="prev-epp-list">${rows}</div></div>`);
    },

    bindClientes(slug, rerender) {
        const filtrar = () => {
            const q = (document.getElementById('prev-cli-buscar')?.value || '').toLowerCase().trim();
            document.querySelectorAll('.prev-cli-row').forEach(row => {
                const n = row.dataset.nombre || '';
                const e = row.dataset.emp || '';
                row.style.display = !q || n.includes(q) || e.includes(q) ? '' : 'none';
            });
        };
        document.getElementById('prev-cli-buscar')?.addEventListener('input', filtrar);
        document.getElementById('btn-prev-cli-add')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const nombre = document.getElementById('prev-cli-nombre')?.value.trim();
            if (!nombre) return;
            if (!d.clientes) d.clientes = [];
            d.clientes.push({
                id: Date.now().toString(),
                nombre,
                contacto: document.getElementById('prev-cli-contacto')?.value.trim() || '',
                empresa: document.getElementById('prev-cli-emp')?.value.trim() || '',
                telefono: document.getElementById('prev-cli-tel')?.value.trim() || '',
                notas: document.getElementById('prev-cli-notas')?.value.trim() || '',
                activo: true,
                trabajadores: []
            });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-del-prev-cli').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.clientes = (d.clientes || []).filter(c => c.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
        document.querySelectorAll('.btn-prev-cli-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const c = (d.clientes || []).find(x => x.id === btn.dataset.id);
                if (c) { c.activo = c.activo === false; TrabajoStorage.savePerfilData(slug, d); rerender(); }
            });
        });
    },

    bindClienteDetalle(slug, rerender, clienteId) {
        document.getElementById('btn-prev-cli-save')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const c = (d.clientes || []).find(x => x.id === clienteId);
            if (!c) return;
            c.nombre = document.getElementById('prev-cli-edit-nombre')?.value.trim() || c.nombre;
            c.contacto = document.getElementById('prev-cli-edit-contacto')?.value.trim() || '';
            c.empresa = document.getElementById('prev-cli-edit-emp')?.value.trim() || '';
            c.telefono = document.getElementById('prev-cli-edit-tel')?.value.trim() || '';
            c.notas = document.getElementById('prev-cli-edit-notas')?.value || '';
            c.activo = !!document.getElementById('prev-cli-edit-activo')?.checked;
            TrabajoStorage.savePerfilData(slug, d);
            this._toast('Cliente guardado.', 'success');
            rerender();
        });
        document.getElementById('btn-prev-trab-add')?.addEventListener('click', () => {
            const nom = document.getElementById('prev-trab-nom')?.value.trim();
            if (!nom) return;
            const d = TrabajoStorage.getPerfilData(slug);
            const c = (d.clientes || []).find(x => x.id === clienteId);
            if (!c) return;
            this.ensureCliente(c);
            c.trabajadores.push({
                id: Date.now().toString(),
                nombre: nom,
                cargo: document.getElementById('prev-trab-cargo')?.value.trim() || '',
                contacto: document.getElementById('prev-trab-contacto')?.value.trim() || ''
            });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-prev-trab-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const tid = btn.dataset.id;
                const d = TrabajoStorage.getPerfilData(slug);
                const c = (d.clientes || []).find(x => x.id === clienteId);
                if (!c || !Array.isArray(c.trabajadores)) return;
                c.trabajadores = c.trabajadores.filter(t => t.id !== tid);
                (d.obras || []).forEach(o => {
                    if (o.clienteId !== clienteId) return;
                    this.ensureObra(o);
                    o.trabajadoresIds = (o.trabajadoresIds || []).filter(id => id !== tid);
                    o.eppCumplimientoPersona = (o.eppCumplimientoPersona || []).filter(r => r.trabajadorId !== tid);
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindObras(slug, rerender) {
        const filtrar = () => {
            const q = (document.getElementById('prev-obra-buscar')?.value || '').toLowerCase().trim();
            document.querySelectorAll('.prev-obra-row').forEach(row => {
                const n = row.dataset.nombre || '';
                const c = row.dataset.cli || '';
                row.style.display = !q || n.includes(q) || c.includes(q) ? '' : 'none';
            });
        };
        document.getElementById('prev-obra-buscar')?.addEventListener('input', filtrar);
        document.getElementById('btn-prev-obra-add')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const nombre = document.getElementById('prev-obra-nombre')?.value.trim();
            if (!nombre) return;
            if (!d.obras) d.obras = [];
            const o = {
                id: Date.now().toString(),
                clienteId: document.getElementById('prev-obra-cli')?.value || '',
                nombre,
                datos: document.getElementById('prev-obra-datos')?.value.trim() || '',
                ubicacion: document.getElementById('prev-obra-direccion')?.value.trim() || '',
                direccion: document.getElementById('prev-obra-direccion')?.value.trim() || '',
                estado: document.getElementById('prev-obra-estado')?.value || 'activa',
                fechaInicio: document.getElementById('prev-obra-ini')?.value || '',
                fechaFin: document.getElementById('prev-obra-fin')?.value || '',
                documentos: [],
                docsRequeridos: [],
                eppObra: [],
                trabajadoresIds: [],
                eppCumplimientoPersona: []
            };
            this.ensureObra(o);
            d.obras.push(o);
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-del-prev-obra').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const oid = btn.dataset.id;
                d.obras = (d.obras || []).filter(o => o.id !== oid);
                d.tareas = (d.tareas || []).filter(t => t.obraId !== oid);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindObraDetalle(slug, rerender, obraId) {
        const saveObraFields = (d, o) => {
            o.nombre = document.getElementById('prev-obra-det-nombre')?.value.trim() || o.nombre;
            o.estado = document.getElementById('prev-obra-det-estado')?.value || o.estado;
            o.direccion = document.getElementById('prev-obra-det-dir')?.value.trim() || '';
            o.ubicacion = o.direccion;
            o.datos = document.getElementById('prev-obra-det-datos')?.value.trim() || '';
            o.fechaInicio = document.getElementById('prev-obra-det-ini')?.value || '';
            o.fechaFin = document.getElementById('prev-obra-det-fin')?.value || '';
        };

        document.getElementById('btn-prev-obra-det-save')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const o = (d.obras || []).find(x => x.id === obraId);
            if (!o) return;
            saveObraFields(d, o);
            TrabajoStorage.savePerfilData(slug, d);
            this._toast('Obra guardada.', 'success');
            rerender();
        });

        document.querySelectorAll('.prev-obra-trab').forEach(cb => {
            cb.addEventListener('change', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === obraId);
                if (!o) return;
                this.ensureObra(o);
                const tid = cb.dataset.tid;
                const ids = new Set(o.trabajadoresIds || []);
                if (cb.checked) ids.add(tid);
                else ids.delete(tid);
                o.trabajadoresIds = Array.from(ids);
                this.syncEppCumplimientoObra(d, o);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
        document.querySelectorAll('.prev-epp-cumple').forEach(cb => {
            cb.addEventListener('change', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === obraId);
                if (!o) return;
                this.ensureObra(o);
                const tid = cb.dataset.tid;
                const eid = cb.dataset.eid;
                if (!o.eppCumplimientoPersona) o.eppCumplimientoPersona = [];
                let r = o.eppCumplimientoPersona.find(x => x.trabajadorId === tid && x.eppId === eid);
                if (!r) {
                    r = { trabajadorId: tid, eppId: eid, cumple: cb.checked };
                    o.eppCumplimientoPersona.push(r);
                } else r.cumple = cb.checked;
                TrabajoStorage.savePerfilData(slug, d);
            });
        });

        document.getElementById('btn-prev-tar-add')?.addEventListener('click', () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const desc = document.getElementById('prev-tar-desc')?.value.trim();
            if (!desc) return;
            if (!d.tareas) d.tareas = [];
            d.tareas.push({
                id: Date.now().toString(),
                obraId,
                descripcion: desc,
                responsable: document.getElementById('prev-tar-resp')?.value.trim() || '',
                fechaLimite: document.getElementById('prev-tar-lim')?.value || '',
                fechaProgramada: document.getElementById('prev-tar-prog')?.value || '',
                estado: document.getElementById('prev-tar-estado')?.value || 'pendiente',
                documentos: [],
                eppTarea: []
            });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-prev-tar-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.tareas = (d.tareas || []).filter(t => t.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });

        document.getElementById('btn-prev-doc-req-add')?.addEventListener('click', () => {
            const etiq = document.getElementById('prev-doc-req-etiq')?.value.trim();
            if (!etiq) return;
            const d = TrabajoStorage.getPerfilData(slug);
            const o = (d.obras || []).find(x => x.id === obraId);
            if (!o) return;
            this.ensureObra(o);
            o.docsRequeridos.push({
                id: Date.now().toString(),
                etiqueta: etiq,
                obligatorio: !!document.getElementById('prev-doc-req-obl')?.checked,
                cargado: false
            });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-prev-doc-req-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.i, 10);
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === obraId);
                if (o && o.docsRequeridos) { o.docsRequeridos.splice(i, 1); TrabajoStorage.savePerfilData(slug, d); rerender(); }
            });
        });
        document.querySelectorAll('.prev-doc-req-cargado').forEach(cb => {
            cb.addEventListener('change', () => {
                const i = parseInt(cb.dataset.i, 10);
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === obraId);
                if (o && o.docsRequeridos && o.docsRequeridos[i]) { o.docsRequeridos[i].cargado = cb.checked; TrabajoStorage.savePerfilData(slug, d); }
            });
        });

        document.getElementById('btn-prev-doc-add')?.addEventListener('click', () => {
            const tit = document.getElementById('prev-doc-tit')?.value.trim();
            if (!tit) { this._toast('Indica un título.', 'warning'); return; }
            const d = TrabajoStorage.getPerfilData(slug);
            const o = (d.obras || []).find(x => x.id === obraId);
            if (!o) return;
            this.ensureObra(o);
            const file = document.getElementById('prev-doc-file')?.files?.[0];
            const done = (adjuntoBase64, nombreArchivo) => {
                o.documentos.push({
                    id: Date.now().toString(),
                    titulo: tit,
                    tipo: document.getElementById('prev-doc-tipo')?.value.trim() || '',
                    fecha: document.getElementById('prev-doc-fecha')?.value || '',
                    notas: document.getElementById('prev-doc-notas')?.value.trim() || '',
                    nombreArchivo: nombreArchivo || '',
                    adjuntoBase64: adjuntoBase64 || ''
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            };
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    const s = reader.result;
                    if (typeof s === 'string' && s.length > this.MAX_ADJUNTO_B64) {
                        this._toast('Archivo demasiado grande para guardar en el navegador. Registra solo metadatos.', 'warning');
                        done('', file.name);
                    } else done(typeof s === 'string' ? s : '', file.name);
                };
                reader.onerror = () => done('', file.name);
                reader.readAsDataURL(file);
            } else done();
        });
        document.querySelectorAll('.btn-prev-doc-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === obraId);
                if (o) o.documentos = (o.documentos || []).filter(doc => doc.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });

        document.getElementById('btn-prev-epp-obra-add')?.addEventListener('click', () => {
            const eid = document.getElementById('prev-epp-obra-add')?.value;
            if (!eid) return;
            const d = TrabajoStorage.getPerfilData(slug);
            const o = (d.obras || []).find(x => x.id === obraId);
            if (!o) return;
            this.ensureObra(o);
            if (o.eppObra.some(r => r.eppId === eid)) return;
            o.eppObra.push({ eppId: eid, obligatorio: true, verificado: false, fechaVerificacion: '' });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        const saveEppRows = () => {
            const d = TrabajoStorage.getPerfilData(slug);
            const o = (d.obras || []).find(x => x.id === obraId);
            if (!o || !o.eppObra) return;
            document.querySelectorAll('.prev-epp-obra-ver').forEach(cb => {
                const i = parseInt(cb.dataset.i, 10);
                if (o.eppObra[i]) o.eppObra[i].verificado = cb.checked;
            });
            document.querySelectorAll('.prev-epp-obra-obl').forEach(cb => {
                const i = parseInt(cb.dataset.i, 10);
                if (o.eppObra[i]) o.eppObra[i].obligatorio = cb.checked;
            });
            document.querySelectorAll('.prev-epp-obra-fecha').forEach(inp => {
                const i = parseInt(inp.dataset.i, 10);
                if (o.eppObra[i]) o.eppObra[i].fechaVerificacion = inp.value || '';
            });
            this.syncEppCumplimientoObra(d, o);
            TrabajoStorage.savePerfilData(slug, d);
        };
        document.querySelectorAll('.prev-epp-obra-ver, .prev-epp-obra-obl').forEach(el => {
            el.addEventListener('change', saveEppRows);
        });
        document.querySelectorAll('.prev-epp-obra-fecha').forEach(el => {
            el.addEventListener('change', saveEppRows);
        });
        document.querySelectorAll('.btn-prev-epp-obra-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.dataset.i, 10);
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === obraId);
                if (o && o.eppObra && o.eppObra[i] != null) {
                    o.eppObra.splice(i, 1);
                    this.syncEppCumplimientoObra(d, o);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                }
            });
        });
    },

    bindTareas(slug, rerender) {
        document.getElementById('btn-prev-tar-f-ap')?.addEventListener('click', () => {
            const obra = document.getElementById('prev-tar-f-obra')?.value || '';
            const est = document.getElementById('prev-tar-f-est')?.value || '';
            let h = '#prevencionista/tareas';
            const p = [];
            if (obra) p.push('obra=' + encodeURIComponent(obra));
            if (est) p.push('estado=' + encodeURIComponent(est));
            if (p.length) h += '?' + p.join('&');
            window.location.hash = h;
            rerender();
        });
        document.querySelectorAll('.btn-prev-tar-glob-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.tareas = (d.tareas || []).filter(t => t.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindEppCatalogo(slug, rerender) {
        document.getElementById('btn-prev-epp-add')?.addEventListener('click', () => {
            const nom = document.getElementById('prev-epp-nom')?.value.trim();
            if (!nom) return;
            const d = TrabajoStorage.getPerfilData(slug);
            if (!d.eppCatalogo) d.eppCatalogo = [];
            d.eppCatalogo.push({ id: Date.now().toString(), nombre: nom, descripcion: document.getElementById('prev-epp-desc')?.value.trim() || '' });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-prev-epp-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.eppCatalogo = (d.eppCatalogo || []).filter(e => e.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindEppPanel(slug, rerender) {
        document.getElementById('btn-prev-epp-f-ap')?.addEventListener('click', () => {
            try {
                sessionStorage.setItem('trabajo_prev_epp_f_est', document.getElementById('prev-epp-f-est')?.value || '');
                sessionStorage.setItem('trabajo_prev_epp_f_q', document.getElementById('prev-epp-f-q')?.value || '');
                sessionStorage.setItem('trabajo_prev_epp_sort', document.getElementById('prev-epp-f-sort')?.value || 'kpi_desc');
            } catch (e) {}
            rerender();
        });
        const dlg = document.getElementById('prev-epp-modal');
        document.getElementById('prev-epp-modal-close')?.addEventListener('click', () => dlg?.close());
        document.querySelectorAll('.prev-epp-panel-row').forEach(row => {
            row.addEventListener('click', ev => {
                if (ev.target.closest('a')) return;
                const oid = row.dataset.obraId;
                const d = TrabajoStorage.getPerfilData(slug);
                const o = (d.obras || []).find(x => x.id === oid);
                const body = document.getElementById('prev-epp-modal-body');
                const title = document.getElementById('prev-epp-modal-title');
                if (!body || !title || !dlg || !o) return;
                title.textContent = o.nombre || 'Obra';
                body.innerHTML = this.modalDetalleObraHtml(typeof TrabajoPerfiles !== 'undefined' ? TrabajoPerfiles : { linkPerfil: () => '#' }, d, oid);
                dlg.showModal();
            });
        });
    }
};
