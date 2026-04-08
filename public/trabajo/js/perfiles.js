/**
 * Modo Trabajo v2 — UI por perfil profesional.
 * Depende de TrabajoStorage y TrabajoApp (money, esc, render) en tiempo de ejecución.
 */
const TrabajoPerfiles = {
    PAGE_SIZE: 25,

    wrap(slug, title, breadcrumb, inner) {
        const A = typeof TrabajoApp !== 'undefined' ? TrabajoApp : { esc: s => String(s || '') };
        return `
            <div class="trabajo-view-wrap">
                <nav class="trabajo-breadcrumb" aria-label="Migas de pan">${breadcrumb}</nav>
                <div class="trabajo-page-title"><h1>${A.esc(title)}</h1></div>
                ${inner}
            </div>`;
    },

    linkPerfil(slug, section, subId, subId2) {
        let h = `#${slug}/${section || 'inicio'}`;
        if (subId) h += '/' + encodeURIComponent(subId);
        if (subId2) h += '/' + encodeURIComponent(subId2);
        return h;
    },

    emptyCta(msg, label, hash) {
        return `<div class="card trabajo-empty"><p class="muted">${msg}</p><a class="btn btn-primary" href="${hash}">${label}</a></div>`;
    },

    money(n) {
        return typeof TrabajoApp !== 'undefined' ? TrabajoApp.money(n) : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);
    },
    esc(s) {
        return typeof TrabajoApp !== 'undefined' ? TrabajoApp.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    bind(slug, section, subId, subId2) {
        if (slug && TrabajoStorage.PERFILES.some(p => p.slug === slug) && (section === 'mi-dia' || section === 'agenda')) {
            if (section === 'mi-dia') {
                this.bindPerfilMiDia(slug);
                return;
            }
            this.bindPerfilAgenda(slug);
            return;
        }
        const map = {
            minimarket: this.bindMinimarket,
            educacion: this.bindEducacion,
            prevencionista: this.bindPrevencionista,
            administrativo: this.bindAdministrativo,
            pasteleria: this.bindPasteleria,
            cabanas: this.bindCabanas,
            laboratorio: this.bindLaboratorio,
            salud: this.bindSalud
        };
        const fn = map[slug];
        if (fn) fn.call(this, section || 'inicio', subId, subId2);
    },

    render(slug, section, subId, subId2) {
        if (slug && TrabajoStorage.PERFILES.some(p => p.slug === slug) && (section === 'mi-dia' || section === 'agenda')) {
            if (section === 'mi-dia') return this.renderPerfilMiDia(slug);
            return this.renderPerfilAgenda(slug, subId, subId2);
        }
        const map = {
            minimarket: this.renderMinimarket,
            educacion: this.renderEducacion,
            prevencionista: this.renderPrevencionista,
            administrativo: this.renderAdministrativo,
            pasteleria: this.renderPasteleria,
            cabanas: this.renderCabanas,
            laboratorio: this.renderLaboratorio,
            salud: this.renderSalud
        };
        const fn = map[slug];
        return fn ? fn.call(this, section || 'inicio', subId, subId2) : `<div class="trabajo-view-wrap"><p class="muted">Perfil no disponible.</p></div>`;
    },

    _sesionesEducacionPorFecha(fechaIso, slug) {
        if (slug !== 'educacion') return [];
        const edu = TrabajoStorage.getPerfilData('educacion');
        const out = [];
        (edu.cursos || []).forEach(c => {
            (c.sesiones || []).forEach(s => {
                if ((s.fecha || '').slice(0, 10) === fechaIso) {
                    out.push({
                        tipo: 'sesion',
                        titulo: s.titulo || 'Sesión',
                        hora: (s.horaInicio || '') + (s.horaFin ? '–' + s.horaFin : ''),
                        cursoNombre: c.nombre,
                        cursoId: c.id,
                        sesionId: s.id,
                        soloLectura: true
                    });
                }
            });
        });
        return out.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    },

    /** Consultas/sesiones del perfil salud en una fecha (Mi día / Agenda; mismo criterio que calendario). */
    _sesionesSaludPorFecha(fechaIso, slug) {
        if (slug !== 'salud') return [];
        const d = TrabajoStorage.getPerfilData('salud');
        const pac = Object.fromEntries((d.pacientes || []).map(p => [p.id, p.nombre || '']));
        const out = [];
        (d.sesiones || []).forEach(s => {
            if ((s.fecha || '').slice(0, 10) !== fechaIso) return;
            if (s.estado === 'cancelada') return;
            const nom = pac[s.pacienteId] || 'Paciente';
            out.push({
                tipo: 'sesion',
                titulo: `${s.tipo || 'Consulta'} · ${nom}`,
                hora: (s.hora || '') + (s.duracionMin ? ` · ${s.duracionMin} min` : ''),
                cursoNombre: s.estado === 'realizada' ? 'Realizada' : 'Programada',
                cursoId: '',
                sesionId: s.id,
                soloLectura: true
            });
        });
        return out.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    },

    _parseCalMonthKey(subId) {
        const now = new Date();
        let y = now.getFullYear();
        let m = now.getMonth() + 1;
        if (subId && /^\d{4}-\d{2}$/.test(subId)) {
            const [yy, mm] = subId.split('-');
            y = parseInt(yy, 10);
            m = parseInt(mm, 10);
        }
        const key = `${y}-${String(m).padStart(2, '0')}`;
        return { y, m, key };
    },

    _resolveCalSelDay(subId, subId2, monthKey) {
        const hoy = new Date().toISOString().slice(0, 10);
        const sel = (subId2 && /^\d{4}-\d{2}-\d{2}$/.test(subId2)) ? subId2.slice(0, 10) : hoy;
        return sel.slice(0, 7) === monthKey ? sel : `${monthKey}-01`;
    },

    _countReservasCabanasDia(reservas, iso) {
        return (reservas || []).filter(r => {
            if (r.estado === 'cancelada') return false;
            const a = (r.desde || '').slice(0, 10);
            const b = (r.hasta || r.desde || '').slice(0, 10);
            return iso >= a && iso <= b;
        }).length;
    },

    _countSesionesEducacionDia(dEdu, iso) {
        let n = 0;
        (dEdu.cursos || []).forEach(c => {
            (c.sesiones || []).forEach(s => {
                if ((s.fecha || '').slice(0, 10) === iso) n++;
            });
        });
        return n;
    },

    _countAdmCalDia(d, iso) {
        let n = 0;
        (d.fechasImportantes || []).forEach(f => {
            if ((f.fecha || '').slice(0, 10) === iso) n++;
        });
        (d.procesos || []).forEach(p => {
            if ((p.fechaLimite || '').slice(0, 10) === iso) n++;
        });
        return n;
    },

    _countAgendaTareasDia(d, iso) {
        const ag = TrabajoStorage.ensurePerfilAgenda(d);
        const tareas = ag.tareasAgenda || [];
        return tareas.filter(t => (t.fecha || '').slice(0, 10) === iso).length;
    },

    /**
     * Ítems de negocio con fecha por perfil (misma fuente que vistas de calendario / bridge Persona).
     */
    _countPerfilNegocioDia(slug, d, iso) {
        if (!d || typeof d !== 'object') return 0;
        switch (slug) {
            case 'educacion':
                return this._countSesionesEducacionDia(d, iso);
            case 'cabanas':
                return this._countReservasCabanasDia(d.reservas, iso);
            case 'prevencionista':
                return (d.visitas || []).filter(v => (v.fecha || '').slice(0, 10) === iso).length;
            case 'administrativo':
                return this._countAdmCalDia(d, iso);
            case 'laboratorio':
                return (d.visitas || []).filter(v => (v.fecha || '').slice(0, 10) === iso).length;
            case 'salud':
                return (d.sesiones || []).filter(s => (s.fecha || '').slice(0, 10) === iso && s.estado !== 'cancelada').length;
            case 'minimarket':
                return (d.cajasTurno || []).filter(c => (c.fecha || '').slice(0, 10) === iso).length;
            case 'pasteleria':
                return (d.entregas || []).filter(e => (e.fecha || '').slice(0, 10) === iso).length;
            default:
                return 0;
        }
    },

    _countPerfilCalendarioVistaDia(slug, d, iso) {
        return this._countAgendaTareasDia(d, iso) + this._countPerfilNegocioDia(slug, d, iso);
    },

    /**
     * Rejilla mensual para secciones «calendario»; feriados CL con `FeriadosCL`.
     * @param {{ countForIso: (iso: string) => number, footNote?: string }} options
     */
    _renderCalendarioMensualBlock(slug, section, subId, subId2, options) {
        const { y, m, key: monthKey } = this._parseCalMonthKey(subId);
        const first = new Date(y, m - 1, 1);
        const lastD = new Date(y, m, 0).getDate();
        const startPad = (first.getDay() + 6) % 7;
        const mesLabel = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const prev = new Date(y, m - 2, 1);
        const next = new Date(y, m, 1);
        const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        const selInMonth = this._resolveCalSelDay(subId, subId2, monthKey);
        const countForIso = options.countForIso || (() => 0);
        const footNote = options.footNote || '';

        let rowsHtml = '';
        let dayNum = 1;
        for (let w = 0; w < 6; w++) {
            let row = '';
            for (let wd = 0; wd < 7; wd++) {
                const cellIdx = w * 7 + wd;
                if (cellIdx < startPad || dayNum > lastD) {
                    row += '<td class="trabajo-cal-empty"></td>';
                } else {
                    const iso = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const cnt = countForIso(iso);
                    const feriadoNom = typeof FeriadosCL !== 'undefined' ? FeriadosCL.nombreEnFecha(iso) : '';
                    const isSel = selInMonth === iso;
                    const hrefMes = this.linkPerfil(slug, section, monthKey, iso);
                    const ferClass = feriadoNom ? ' trabajo-cal-day--feriado' : '';
                    const ferBadge = feriadoNom ? `<span class="trabajo-feriado-badge" title="${this.esc(feriadoNom)}">F</span>` : '';
                    row += `<td class="trabajo-cal-day ${isSel ? 'trabajo-cal-day--sel' : ''}${ferClass}"><a href="${hrefMes}" class="trabajo-cal-day-link">${dayNum}</a><span class="trabajo-cal-badges">${cnt ? `<span class="badge">${cnt}</span>` : ''}${ferBadge}</span></td>`;
                    dayNum++;
                }
            }
            rowsHtml += `<tr>${row}</tr>`;
        }

        return {
            html: `
                <div class="trabajo-cal-nav">
                    <a href="${this.linkPerfil(slug, section, prevKey)}" class="btn btn-ghost btn-sm" aria-label="Mes anterior">← Mes anterior</a>
                    <strong class="trabajo-cal-title">${this.esc(mesLabel)}</strong>
                    <a href="${this.linkPerfil(slug, section, nextKey)}" class="btn btn-ghost btn-sm" aria-label="Mes siguiente">Mes siguiente →</a>
                </div>
                <div class="card trabajo-cal-wrap"><table class="trabajo-table trabajo-cal-grid"><thead><tr><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
                <p class="muted text-sm">Feriados Chile: celda con <span class="trabajo-feriado-badge">F</span>. ${footNote}</p>`,
            selInMonth,
            monthKey
        };
    },

    renderPerfilMiDia(slug) {
        const pn = TrabajoStorage.slugToPerfil(slug);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <a href="#${this.esc(slug)}/inicio">${this.esc(pn?.name || slug)}</a> <span aria-hidden="true">/</span> <span>Mi día</span>`;
        const hoy = new Date().toISOString().slice(0, 10);
        const d = TrabajoStorage.getPerfilData(slug);
        const ag = TrabajoStorage.ensurePerfilAgenda(d);
        const tareas = ag.tareasAgenda || [];

        const delDia = tareas.filter(t => (t.fecha || '').slice(0, 10) === hoy).sort((a, b) => {
            const pa = a.prioridad === 'alta' ? 3 : a.prioridad === 'media' ? 2 : 1;
            const pb = b.prioridad === 'alta' ? 3 : b.prioridad === 'media' ? 2 : 1;
            if (pb !== pa) return pb - pa;
            return (a.hora || '').localeCompare(b.hora || '');
        });
        const ses = slug === 'educacion'
            ? this._sesionesEducacionPorFecha(hoy, slug)
            : slug === 'salud' ? this._sesionesSaludPorFecha(hoy, slug) : [];
        const rows = delDia.map(t => `
                <tr class="${t.hecho ? 'trabajo-task-done' : ''}" data-id="${this.esc(t.id)}">
                    <td><input type="checkbox" class="ag-global-check" data-id="${this.esc(t.id)}" ${t.hecho ? 'checked' : ''} aria-label="Hecha"/></td>
                    <td>${this.esc(t.titulo)}</td>
                    <td>${this.esc(t.hora || '—')}</td>
                    <td><span class="trabajo-prio trabajo-prio--${this.esc(t.prioridad || 'media')}">${this.esc(t.prioridad || 'media')}</span></td>
                    <td>${t.esPrioridadDelDia ? '★' : ''}</td>
                    <td>${this.esc(t.etiqueta || '')}</td>
                    <td><button type="button" class="btn-sm btn-del-ag-global" data-id="${this.esc(t.id)}" aria-label="Eliminar">✕</button></td>
                </tr>`).join('');
        const iconSes = slug === 'salud' ? '🩺' : '📖';
        const rowsSes = ses.map(s => `<tr class="trabajo-agenda-readonly"><td>${iconSes}</td><td colspan="5">${this.esc(s.titulo)} <span class="muted">(${this.esc(s.cursoNombre)})</span></td><td>${this.esc(s.hora || '')}</td></tr>`).join('');
        const sesNote = slug === 'educacion'
            ? ' Incluye sesiones de cursos (solo lectura).'
            : slug === 'salud' ? ' Incluye consultas del día (solo lectura).' : '';
        return this.wrap(slug, 'Mi día', bc, `
                <p class="muted">${hoy} · Tareas de agenda de este perfil.${sesNote}</p>
                <div class="card"><h2>Nueva tarea</h2>
                    <table class="trabajo-table trabajo-table--form"><tbody>
                        <tr><td><label for="ag-md-tit">Título</label></td><td><input type="text" id="ag-md-tit" class="trabajo-input-inline" placeholder="Obligatorio" aria-required="true"/></td></tr>
                        <tr><td>Fecha</td><td><input type="date" id="ag-md-fecha" value="${hoy}" aria-label="Fecha"/></td></tr>
                        <tr><td>Hora</td><td><input type="time" id="ag-md-hora" aria-label="Hora opcional"/></td></tr>
                        <tr><td>Prioridad</td><td><select id="ag-md-prio" aria-label="Prioridad"><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></td></tr>
                        <tr><td>Notas</td><td><input type="text" id="ag-md-desc" placeholder="Breves" aria-label="Notas"/></td></tr>
                        <tr><td>Etiqueta</td><td><input type="text" id="ag-md-etiq" placeholder="Ej. admin" aria-label="Etiqueta"/></td></tr>
                        <tr><td>Enlace</td><td><input type="text" id="ag-md-enl" placeholder="#educacion/cursos" aria-label="Enlace sección"/></td></tr>
                        <tr><td>Prioridad del día</td><td><label><input type="checkbox" id="ag-md-prio-dia"/> Marcar como prioridad destacada</label></td></tr>
                    </tbody></table>
                    <button type="button" id="btn-ag-md-add" class="btn btn-primary">Añadir tarea</button>
                </div>
                <div class="card"><h2>Tareas de hoy</h2>
                    <div class="trabajo-table-scroll">
                    <table class="trabajo-table" id="ag-md-tabla"><thead><tr><th></th><th>Título</th><th>Hora</th><th>Prio</th><th>★</th><th>Etiqueta</th><th></th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="7" class="muted">Sin tareas.</td></tr>'}${rowsSes}</tbody></table>
                    </div>
                </div>`);
    },

    renderPerfilAgenda(slug, monthKey, dayKey) {
        const pn = TrabajoStorage.slugToPerfil(slug);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <a href="#${this.esc(slug)}/inicio">${this.esc(pn?.name || slug)}</a> <span aria-hidden="true">/</span> <span>Agenda</span>`;
        const hoy = new Date().toISOString().slice(0, 10);
        const d = TrabajoStorage.getPerfilData(slug);
        const ag = TrabajoStorage.ensurePerfilAgenda(d);
        const tareas = ag.tareasAgenda || [];
        const now = new Date();
        let y = now.getFullYear();
        let m = now.getMonth() + 1;
        if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
            const [yy, mm] = monthKey.split('-');
            y = parseInt(yy, 10);
            m = parseInt(mm, 10);
        }
        const first = new Date(y, m - 1, 1);
        const lastD = new Date(y, m, 0).getDate();
        const startPad = (first.getDay() + 6) % 7;
        const mesLabel = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const prev = new Date(y, m - 2, 1);
        const next = new Date(y, m, 1);
        const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        const sel = (dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) ? dayKey : hoy;
        const selInMonth = sel.slice(0, 7) === `${y}-${String(m).padStart(2, '0')}` ? sel : `${y}-${String(m).padStart(2, '0')}-01`;

        let rowsHtml = '';
        let dayNum = 1;
        for (let w = 0; w < 6; w++) {
            let row = '';
            for (let wd = 0; wd < 7; wd++) {
                const cellIdx = w * 7 + wd;
                if (cellIdx < startPad || dayNum > lastD) {
                    row += '<td class="trabajo-cal-empty"></td>';
                } else {
                    const iso = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const cnt = tareas.filter(t => (t.fecha || '').slice(0, 10) === iso).length;
                    const sesEdu = slug === 'educacion' ? this._sesionesEducacionPorFecha(iso, slug).length : 0;
                    const sesSal = slug === 'salud' ? this._sesionesSaludPorFecha(iso, slug).length : 0;
                    const feriadoNom = typeof FeriadosCL !== 'undefined' ? FeriadosCL.nombreEnFecha(iso) : '';
                    const isSel = selInMonth === iso;
                    const hrefMes = this.linkPerfil(slug, 'agenda', `${y}-${String(m).padStart(2, '0')}`, iso);
                    const ferClass = feriadoNom ? ' trabajo-cal-day--feriado' : '';
                    const ferBadge = feriadoNom ? `<span class="trabajo-feriado-badge" title="${this.esc(feriadoNom)}">F</span>` : '';
                    row += `<td class="trabajo-cal-day ${isSel ? 'trabajo-cal-day--sel' : ''}${ferClass}"><a href="${hrefMes}" class="trabajo-cal-day-link">${dayNum}</a><span class="trabajo-cal-badges">${cnt ? `<span class="badge">${cnt}</span>` : ''}${sesEdu ? `<span class="badge badge-edu">${sesEdu}</span>` : ''}${sesSal ? `<span class="badge badge-salud">${sesSal}</span>` : ''}${ferBadge}</span></td>`;
                    dayNum++;
                }
            }
            rowsHtml += `<tr>${row}</tr>`;
        }

        const delSel = tareas.filter(t => (t.fecha || '').slice(0, 10) === selInMonth).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
        const list = delSel.map(t => `
                <tr class="${t.hecho ? 'trabajo-task-done' : ''}">
                    <td><input type="checkbox" class="ag-cal-check" data-id="${this.esc(t.id)}" ${t.hecho ? 'checked' : ''}/></td>
                    <td>${this.esc(t.titulo)}</td>
                    <td>${this.esc(t.hora || '—')}</td>
                    <td>${this.esc(t.prioridad || '')}</td>
                    <td><button type="button" class="btn-sm btn-del-ag-cal" data-id="${this.esc(t.id)}" aria-label="Eliminar">✕</button></td>
                </tr>`).join('');
        const sesListEdu = slug === 'educacion'
            ? this._sesionesEducacionPorFecha(selInMonth, slug).map(s => `<tr class="trabajo-agenda-readonly"><td>📖</td><td colspan="3">${this.esc(s.titulo)} (${this.esc(s.cursoNombre)})</td><td>${this.esc(s.hora || '')}</td></tr>`).join('')
            : '';
        const sesListSal = slug === 'salud'
            ? this._sesionesSaludPorFecha(selInMonth, slug).map(s => `<tr class="trabajo-agenda-readonly"><td>🩺</td><td colspan="3">${this.esc(s.titulo)} <span class="muted">(${this.esc(s.cursoNombre)})</span></td><td>${this.esc(s.hora || '')}</td></tr>`).join('')
            : '';
        const sesList = sesListEdu + sesListSal;
        const footNote = (slug === 'educacion'
            ? 'Cifras: tareas de agenda de este perfil · <span class="badge-edu">edu</span> sesiones de cursos (solo lectura). '
            : slug === 'salud'
                ? 'Cifras: tareas de agenda · <span class="badge-salud">salud</span> consultas (solo lectura). '
                : 'Cifras: tareas de agenda de este perfil. ') + 'Feriados Chile: <span class="trabajo-feriado-badge">F</span>.';

        return this.wrap(slug, 'Agenda', bc, `
                <div class="trabajo-cal-nav">
                    <a href="${this.linkPerfil(slug, 'agenda', prevKey)}" class="btn btn-ghost btn-sm" aria-label="Mes anterior">← Mes anterior</a>
                    <strong class="trabajo-cal-title">${this.esc(mesLabel)}</strong>
                    <a href="${this.linkPerfil(slug, 'agenda', nextKey)}" class="btn btn-ghost btn-sm" aria-label="Mes siguiente">Mes siguiente →</a>
                </div>
                <div class="card trabajo-cal-wrap"><table class="trabajo-table trabajo-cal-grid"><thead><tr><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
                <p class="muted text-sm">${footNote}</p>
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <div class="trabajo-table-scroll">
                    <table class="trabajo-table"><thead><tr><th></th><th>Título</th><th>Hora</th><th>Prio</th><th></th></tr></thead>
                    <tbody>${list || '<tr><td colspan="5" class="muted">Sin tareas este día.</td></tr>'}${sesList}</tbody></table>
                    </div>
                </div>`);
    },

    bindPerfilMiDia(slug) {
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();
        const toast = (m, k) => typeof TrabajoApp !== 'undefined' && TrabajoApp.toast(m, k);

        document.getElementById('btn-ag-md-add')?.addEventListener('click', () => {
            const tit = document.getElementById('ag-md-tit').value.trim();
            const fechaRaw = document.getElementById('ag-md-fecha').value || new Date().toISOString().slice(0, 10);
            const horaRaw = document.getElementById('ag-md-hora').value || '';
            const v = typeof DataValidate !== 'undefined'
                ? DataValidate.validateAgendaTareaDraft({ titulo: tit, fecha: fechaRaw, hora: horaRaw })
                : { ok: !!tit, errors: tit ? [] : ['El título es obligatorio.'] };
            if (!v.ok) {
                toast((typeof DataValidate !== 'undefined' && DataValidate.firstError(v)) || 'Revisa título y fecha.', 'error');
                return;
            }
            const d = TrabajoDataService.getPerfilData(slug);
            const ag = TrabajoStorage.ensurePerfilAgenda(d);
            const t = TrabajoStorage.normalizeAgendaTarea({
                titulo: tit,
                fecha: fechaRaw,
                hora: horaRaw,
                prioridad: document.getElementById('ag-md-prio').value,
                descripcion: document.getElementById('ag-md-desc').value.trim(),
                etiqueta: document.getElementById('ag-md-etiq').value.trim(),
                enlaceSeccion: document.getElementById('ag-md-enl').value.trim(),
                esPrioridadDelDia: document.getElementById('ag-md-prio-dia').checked,
                hecha: false,
                origen: slug === 'educacion' ? 'educacion' : 'manual'
            });
            ag.tareasAgenda.push(t);
            TrabajoDataService.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.ag-global-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const ag = TrabajoStorage.ensurePerfilAgenda(d);
                const x = ag.tareasAgenda.find(t => t.id === cb.dataset.id);
                if (x) x.hecho = cb.checked;
                TrabajoStorage.savePerfilData(slug, d);
            });
        });
        document.querySelectorAll('.btn-del-ag-global').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const ag = TrabajoStorage.ensurePerfilAgenda(d);
                ag.tareasAgenda = ag.tareasAgenda.filter(t => t.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindPerfilAgenda(slug) {
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        document.querySelectorAll('.ag-cal-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const ag = TrabajoStorage.ensurePerfilAgenda(d);
                const x = ag.tareasAgenda.find(t => t.id === cb.dataset.id);
                if (x) x.hecho = cb.checked;
                TrabajoStorage.savePerfilData(slug, d);
            });
        });
        document.querySelectorAll('.btn-del-ag-cal').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const ag = TrabajoStorage.ensurePerfilAgenda(d);
                ag.tareasAgenda = ag.tareasAgenda.filter(t => t.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    // ——— Minimarket ———
    renderMinimarket(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('minimarket');
        const hoy = new Date().toISOString().slice(0, 10);
        const mes = hoy.slice(0, 7);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Minimarket</span>`;
        const MF = typeof MMFinance !== 'undefined' ? MMFinance : null;

        if (section === 'inicio') {
            const cajas = d.cajasTurno || [];
            const hoyCajas = cajas.filter(c => (c.fecha || '').slice(0, 10) === hoy);
            const ingMes = (d.finanzas?.ingresos || []).filter(i => (i.fecha || '').slice(0, 7) === mes).reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
            const gasMes = (d.finanzas?.gastos || []).filter(g => (g.fecha || '').slice(0, 7) === mes).reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            const nProd = (d.inventario?.productos || []).length;
            return this.wrap('minimarket', 'Minimarket', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('minimarket', 'caja')}" class="trabajo-quick-btn">📒 Caja / turnos</a>
                    <a href="${this.linkPerfil('minimarket', 'inventario')}" class="trabajo-quick-btn">📦 Inventario</a>
                    <a href="${this.linkPerfil('minimarket', 'finanzas')}" class="trabajo-quick-btn">💰 Finanzas</a>
                </div>
                <div class="trabajo-dash-cards">
                    <div class="card trabajo-dash-card"><h3>Turnos hoy</h3><p class="trabajo-dash-value">${hoyCajas.length}</p><a href="${this.linkPerfil('minimarket', 'caja')}" class="text-sm">Ver caja</a></div>
                    <div class="card trabajo-dash-card"><h3>Flujo mes</h3><p class="trabajo-dash-value ${ingMes - gasMes >= 0 ? 'positive' : 'negative'}">${this.money(ingMes - gasMes)}</p><a href="${this.linkPerfil('minimarket', 'finanzas')}" class="text-sm">Detalle</a></div>
                    <div class="card trabajo-dash-card"><h3>Productos</h3><p class="trabajo-dash-value">${nProd}</p><a href="${this.linkPerfil('minimarket', 'inventario')}" class="text-sm">Inventario</a></div>
                </div>`);
        }

        if (section === 'caja') {
            const cajas = (d.cajasTurno || []).slice().sort((a, b) => (b.fecha + (b.turno || '')).localeCompare(a.fecha + (a.turno || '')));
            const ingDia = cajas.filter(c => (c.fecha || '') === hoy).reduce((s, c) => s + (parseFloat(c.ingresos) || 0), 0);
            const egrDia = cajas.filter(c => (c.fecha || '') === hoy).reduce((s, c) => s + (parseFloat(c.egresos) || 0), 0);
            const ingMes = cajas.filter(c => (c.fecha || '').slice(0, 7) === mes).reduce((s, c) => s + (parseFloat(c.ingresos) || 0), 0);
            const egrMes = cajas.filter(c => (c.fecha || '').slice(0, 7) === mes).reduce((s, c) => s + (parseFloat(c.egresos) || 0), 0);
            const list = cajas.length ? cajas.slice(0, this.PAGE_SIZE).map(c => `
                <div class="row-item">
                    <span>${this.esc(c.fecha)} · Turno ${this.esc(c.turno || '—')} · Ing ${this.money(parseFloat(c.ingresos) || 0)} · Egr ${this.money(parseFloat(c.egresos) || 0)} · Arqueo ${this.money(parseFloat(c.arqueo) || 0)}</span>
                    <button type="button" class="btn-sm btn-del-mm-caja" data-id="${this.esc(c.id)}" aria-label="Eliminar caja">Eliminar</button>
                </div>`).join('') : '<p class="muted">No hay cajas por turno. Registra el primero abajo.</p>';
            return this.wrap('minimarket', 'Caja por turno', bc, `
                <div class="trabajo-dash-cards" style="margin-bottom:1rem;">
                    <div class="card trabajo-dash-card"><h3>Hoy</h3><p class="trabajo-dash-value">${this.money(ingDia - egrDia)}</p><p class="muted text-sm">Ingresos ${this.money(ingDia)} · Egresos ${this.money(egrDia)}</p></div>
                    <div class="card trabajo-dash-card"><h3>Mes</h3><p class="trabajo-dash-value">${this.money(ingMes - egrMes)}</p><p class="muted text-sm">Ingresos ${this.money(ingMes)} · Egresos ${this.money(egrMes)}</p></div>
                </div>
                <div class="card"><h2>Registros</h2><div id="mm-caja-list">${list}</div></div>
                <div class="card"><h2>Nuevo turno</h2>
                    <div class="form-row">
                        <input type="date" id="mm-caja-fecha" value="${hoy}" aria-label="Fecha"/>
                        <input type="text" id="mm-caja-turno" placeholder="Turno (ej. mañana, tarde)" aria-label="Turno"/>
                        <input type="number" id="mm-caja-ing" placeholder="Ingresos" step="0.01" aria-label="Ingresos"/>
                        <input type="number" id="mm-caja-egr" placeholder="Egresos" step="0.01" aria-label="Egresos"/>
                        <input type="number" id="mm-caja-arq" placeholder="Arqueo" step="0.01" aria-label="Arqueo"/>
                        <button type="button" id="btn-mm-caja-add" class="btn btn-primary">Añadir</button>
                    </div>
                </div>`);
        }

        if (section === 'inventario') {
            const prods = d.inventario?.productos || [];
            const movs = (d.inventario?.movimientos || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 20);
            const plist = prods.length ? prods.map(p => `
                <div class="row-item">
                    <span>${this.esc(p.nombre)} · Stock ${p.stock ?? 0} ${this.esc(p.unidad || 'u.')}</span>
                    <button type="button" class="btn-sm btn-del-mm-prod" data-id="${this.esc(p.id)}" aria-label="Eliminar producto">Eliminar</button>
                </div>`).join('') : '<p class="muted">Sin productos. Añade el primero.</p>';
            const mlist = movs.length ? movs.map(m => `<div class="row-item">${this.esc(m.fecha)} · ${this.esc(m.tipo)} · ${this.esc(m.detalle || '')}</div>`).join('') : '<p class="muted">Sin movimientos.</p>';
            return this.wrap('minimarket', 'Inventario', bc, `
                <div class="card"><h2>Productos</h2><div id="mm-inv-prod">${plist}</div>
                    <div class="form-row">
                        <input type="text" id="mm-prod-nombre" placeholder="Nombre" aria-label="Nombre producto"/>
                        <input type="number" id="mm-prod-stock" placeholder="Stock" aria-label="Stock"/>
                        <input type="text" id="mm-prod-um" placeholder="Unidad" aria-label="Unidad"/>
                        <button type="button" id="btn-mm-prod-add" class="btn btn-primary">Añadir producto</button>
                    </div>
                </div>
                <div class="card"><h2>Movimiento rápido</h2>
                    <div class="form-row">
                        <select id="mm-mov-prod" aria-label="Producto">${prods.map(p => `<option value="${this.esc(p.id)}">${this.esc(p.nombre)}</option>`).join('') || '<option value="">— Cree un producto —</option>'}</select>
                        <select id="mm-mov-tipo" aria-label="Tipo movimiento"><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste</option></select>
                        <input type="number" id="mm-mov-cant" placeholder="Cantidad" aria-label="Cantidad"/>
                        <input type="date" id="mm-mov-fecha" value="${hoy}" aria-label="Fecha"/>
                        <button type="button" id="btn-mm-mov-add" class="btn btn-primary">Registrar</button>
                    </div>
                    <h3 style="margin-top:1rem;font-size:0.95rem;">Últimos movimientos</h3><div id="mm-inv-mov">${mlist}</div>
                </div>`);
        }

        if (section === 'finanzas') {
            const fin = d.finanzas || { ingresos: [], gastos: [], categorias: [] };
            const ing = (fin.ingresos || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 30);
            const gas = (fin.gastos || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 30);
            const cats = (fin.categorias || ['Operación', 'Insumos', 'Servicios', 'Otros']).map(c => `<option value="${this.esc(c)}">${this.esc(c)}</option>`).join('');
            return this.wrap('minimarket', 'Finanzas', bc, `
                <div class="card"><h2>Resumen ${mes}</h2>
                    <p>Ingresos: <strong class="positive">${this.money(ing.filter(i => (i.fecha || '').slice(0, 7) === mes).reduce((s, i) => s + (parseFloat(i.monto) || 0), 0))}</strong>
                    · Gastos: <strong class="negative">${this.money(gas.filter(g => (g.fecha || '').slice(0, 7) === mes).reduce((s, g) => s + (parseFloat(g.monto) || 0), 0))}</strong></p>
                </div>
                <div class="card"><h2>Ingreso</h2><div class="form-row">
                    <input type="number" id="mm-fin-ing-m" step="0.01" placeholder="Monto" aria-label="Monto ingreso"/>
                    <input type="text" id="mm-fin-ing-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="mm-fin-ing-f" value="${hoy}" aria-label="Fecha"/>
                    <select id="mm-fin-ing-c" aria-label="Categoría">${cats}</select>
                    <button type="button" id="btn-mm-fin-ing" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Gasto</h2><div class="form-row">
                    <input type="number" id="mm-fin-gas-m" step="0.01" placeholder="Monto" aria-label="Monto gasto"/>
                    <input type="text" id="mm-fin-gas-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="mm-fin-gas-f" value="${hoy}" aria-label="Fecha"/>
                    <select id="mm-fin-gas-c" aria-label="Categoría">${cats}</select>
                    <button type="button" id="btn-mm-fin-gas" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Movimientos recientes</h2><div id="mm-fin-list">${[...ing.map(i => ({ ...i, tipo: 'ingreso' })), ...gas.map(g => ({ ...g, tipo: 'gasto' }))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 40).map(m => `<div class="row-item">${this.esc(m.fecha)} ${m.tipo === 'ingreso' ? '+' : '-'} ${this.money(parseFloat(m.monto) || 0)} ${this.esc(m.concepto || '')} <button type="button" class="btn-sm btn-del-mm-fin" data-tipo="${m.tipo}" data-id="${this.esc(m.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin movimientos.</p>'}</div></div>`);
        }

        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('minimarket', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('minimarket', d, iso),
                footNote: 'Número en cada día: tareas de agenda + cierres de caja por turno.'
            });
            const ag = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasDia = (ag.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAg = tareasDia.length ? tareasDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const cajasDia = (d.cajasTurno || []).filter(c => (c.fecha || '').slice(0, 10) === selInMonth);
            const listCaj = cajasDia.length ? cajasDia.map(c => `<div class="row-item">${this.esc(c.fecha)} · Turno ${this.esc(c.turno || '—')} · Ing ${this.money(parseFloat(c.ingresos) || 0)} · Egr ${this.money(parseFloat(c.egresos) || 0)} · <a href="${this.linkPerfil('minimarket', 'caja')}">Ver caja</a></div>`).join('') : '<p class="muted">Sin cierres de caja este día.</p>';
            return this.wrap('minimarket', 'Calendario', bc, `
                <p class="muted">Vista unificada: <strong>agenda del perfil</strong> (<a href="${this.linkPerfil('minimarket', 'mi-dia')}">Mi día</a> / <a href="${this.linkPerfil('minimarket', 'agenda')}">Agenda</a>) y <strong>cierres de caja por turno</strong>. El número en la grilla suma ambos.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAg}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Caja por turno</h3><div>${listCaj}</div></div>`);
        }

        return this.wrap('minimarket', 'Minimarket', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindMinimarket(section) {
        const slug = 'minimarket';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        if (section === 'caja') {
            document.querySelectorAll('.btn-del-mm-caja').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.cajasTurno = (d.cajasTurno || []).filter(c => c.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.getElementById('btn-mm-caja-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.cajasTurno) d.cajasTurno = [];
                d.cajasTurno.push({
                    id: Date.now().toString(),
                    fecha: document.getElementById('mm-caja-fecha').value,
                    turno: document.getElementById('mm-caja-turno').value.trim(),
                    ingresos: document.getElementById('mm-caja-ing').value,
                    egresos: document.getElementById('mm-caja-egr').value,
                    arqueo: document.getElementById('mm-caja-arq').value
                });
                TrabajoStorage.savePerfilData(slug, d);
                TrabajoStorage.syncIngresoNetoToPersonal();
                rerender();
            });
        }
        if (section === 'inventario') {
            document.querySelectorAll('.btn-del-mm-prod').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.inventario.productos = (d.inventario.productos || []).filter(p => p.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.getElementById('btn-mm-prod-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('mm-prod-nombre').value.trim();
                if (!nombre) return;
                if (!d.inventario.productos) d.inventario.productos = [];
                d.inventario.productos.push({
                    id: Date.now().toString(),
                    nombre,
                    stock: parseInt(document.getElementById('mm-prod-stock').value, 10) || 0,
                    unidad: document.getElementById('mm-prod-um').value.trim() || 'u.'
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.getElementById('btn-mm-mov-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const pid = document.getElementById('mm-mov-prod').value;
                const cant = parseInt(document.getElementById('mm-mov-cant').value, 10) || 0;
                const tipo = document.getElementById('mm-mov-tipo').value;
                if (!pid || !cant) return;
                const p = (d.inventario.productos || []).find(x => x.id === pid);
                if (!p) return;
                if (!d.inventario.movimientos) d.inventario.movimientos = [];
                let delta = tipo === 'entrada' ? cant : tipo === 'salida' ? -cant : cant;
                p.stock = (parseInt(p.stock, 10) || 0) + delta;
                d.inventario.movimientos.push({
                    id: Date.now().toString(),
                    fecha: document.getElementById('mm-mov-fecha').value,
                    tipo,
                    productoId: pid,
                    detalle: `${tipo} ${cant} · ${p.nombre}`
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        }
        if (section === 'finanzas') {
            document.getElementById('btn-mm-fin-ing')?.addEventListener('click', () => {
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
                TrabajoStorage.syncIngresoNetoToPersonal();
                rerender();
            });
            document.getElementById('btn-mm-fin-gas')?.addEventListener('click', () => {
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
                TrabajoStorage.syncIngresoNetoToPersonal();
                rerender();
            });
            document.querySelectorAll('.btn-del-mm-fin').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const key = btn.dataset.tipo === 'ingreso' ? 'ingresos' : 'gastos';
                    d.finanzas[key] = (d.finanzas[key] || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
    },

    _eduSyncCalendario(d) {
        const ev = [];
        (d.cursos || []).forEach(c => {
            (c.sesiones || []).forEach(s => {
                ev.push({ ...s, cursoId: c.id, cursoNombre: c.nombre });
            });
        });
        d.eventosCalendario = ev;
    },

    renderEducacion(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('educacion');
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Educación</span>`;

        if (typeof TrabajoEducacion !== 'undefined') {
            if (section === 'salas') return TrabajoEducacion.renderSalas(this, d, bc);
            if (section === 'actividades') return TrabajoEducacion.renderActividades(this, d, bc);
            if (section === 'planificacion') return TrabajoEducacion.renderPlanificacion(this, d, bc);
            if (section === 'informes') return TrabajoEducacion.renderInformes(this, d, bc, subId, subId2);
        }

        if (section === 'inicio') {
            const nC = (d.cursos || []).length;
            const prio = (d.prioridadesDia || []).filter(p => p.fecha === hoy && !p.hecho).length;
            return this.wrap('educacion', 'Educación', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('educacion', 'mi-dia')}" class="trabajo-quick-btn">☀️ Mi día</a>
                    <a href="${this.linkPerfil('educacion', 'agenda')}" class="trabajo-quick-btn">📅 Agenda</a>
                    <a href="${this.linkPerfil('educacion', 'cursos')}" class="trabajo-quick-btn">📚 Cursos</a>
                    <a href="${this.linkPerfil('educacion', 'calendario')}" class="trabajo-quick-btn">📆 Calendario</a>
                    <a href="${this.linkPerfil('educacion', 'prioridades')}" class="trabajo-quick-btn">✅ Prioridades (perfil)</a>
                </div>
                <div class="trabajo-dash-cards">
                    <div class="card trabajo-dash-card"><h3>Cursos</h3><p class="trabajo-dash-value">${nC}</p><a href="${this.linkPerfil('educacion', 'cursos')}" class="text-sm">Gestionar</a></div>
                    <div class="card trabajo-dash-card"><h3>Pendientes hoy</h3><p class="trabajo-dash-value">${prio}</p><a href="${this.linkPerfil('educacion', 'prioridades')}" class="text-sm">Ver</a></div>
                </div>`);
        }

        if (section === 'calendario' && subId === 'semana' && typeof TrabajoEducacion !== 'undefined') {
            return TrabajoEducacion.renderSemana(this, d, bc, subId2);
        }

        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('educacion', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('educacion', d, iso),
                footNote: 'Número en cada día: tareas de agenda + sesiones de cursos.'
            });
            const ag = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasDia = (ag.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAgendaDia = tareasDia.length
                ? tareasDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('')
                : '<p class="muted">Sin tareas de agenda este día.</p>';
            const ev = [];
            (d.cursos || []).forEach(c => {
                (c.sesiones || []).forEach(s => {
                    ev.push({ ...s, cursoId: c.id, cursoNombre: c.nombre });
                });
            });
            ev.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
            const delDia = ev.filter(s => (s.fecha || '').slice(0, 10) === selInMonth);
            const listSesDia = delDia.length
                ? delDia.map(s => `<div class="row-item">${this.esc(s.horaInicio || '')}-${this.esc(s.horaFin || '')} · ${this.esc(s.titulo || '')} <span class="muted">(${this.esc(s.cursoNombre || '')})</span></div>`).join('')
                : '<p class="muted">Sin sesiones este día.</p>';
            const list = ev.length ? ev.map(s => `<div class="row-item">${this.esc(s.fecha)} ${this.esc(s.horaInicio || '')}-${this.esc(s.horaFin || '')} · ${this.esc(s.titulo || '')} <span class="muted">(${this.esc(s.cursoNombre || '')})</span></div>`).join('') : '<p class="muted">Sin sesiones. Añade cursos y sesiones.</p>';
            return this.wrap('educacion', 'Calendario de cursos', bc, `
                <p class="muted">Vista unificada: <strong>tareas de agenda</strong> (<a href="${this.linkPerfil('educacion', 'mi-dia')}">Mi día</a> / <a href="${this.linkPerfil('educacion', 'agenda')}">Agenda</a>) y <strong>sesiones de cursos</strong>. El número en la grilla suma ambos.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAgendaDia}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Sesiones de cursos</h3><div>${listSesDia}</div></div>
                <div class="card"><h2>Todas las sesiones</h2><div id="edu-cal-list">${list}</div></div>`);
        }

        if (section === 'cursos' && !subId) {
            const cursos = d.cursos || [];
            const list = cursos.length ? cursos.map(c => `
                <div class="row-item">
                    <a href="${this.linkPerfil('educacion', 'curso', c.id)}">${this.esc(c.nombre)}</a>
                    <span class="muted">${(c.participantes || []).length} participantes</span>
                    <button type="button" class="btn-sm btn-del-edu-curso" data-id="${this.esc(c.id)}" aria-label="Eliminar curso">Eliminar</button>
                </div>`).join('') : this.emptyCta('Crea tu primer curso para organizar participantes y sesiones.', 'Crear curso', this.linkPerfil('educacion', 'cursos') + '#form');
            return this.wrap('educacion', 'Cursos', bc, `
                <div class="card" id="edu-form-curso"><h2>Nuevo curso</h2>
                    <div class="form-row">
                        <input type="text" id="edu-curso-nombre" placeholder="Nombre del curso" aria-label="Nombre curso"/>
                        <input type="text" id="edu-curso-notas" placeholder="Notas" aria-label="Notas"/>
                        <button type="button" id="btn-edu-add-curso" class="btn btn-primary">Crear</button>
                    </div>
                </div>
                <div class="card"><h2>Lista</h2><div id="edu-cursos-list">${list}</div></div>`);
        }

        if (section === 'curso' && subId) {
            const c = (d.cursos || []).find(x => x.id === subId);
            if (!c) return this.wrap('educacion', 'Curso', bc, '<p class="muted">Curso no encontrado.</p>');
            const parts = (c.participantes || []).map(p => `
                <div class="row-item">
                    <a href="${this.linkPerfil('educacion', 'participante', c.id, p.id)}">${this.esc(p.nombre)}</a>
                    <button type="button" class="btn-sm btn-del-edu-part" data-cid="${this.esc(c.id)}" data-pid="${this.esc(p.id)}" aria-label="Quitar participante">Quitar</button>
                </div>`).join('') || '<p class="muted">Sin participantes.</p>';
            const ses = (c.sesiones || []).map(s => `
                <div class="row-item">${this.esc(s.fecha)} ${this.esc(s.horaInicio)}-${this.esc(s.horaFin)} · ${this.esc(s.titulo)}
                    <button type="button" class="btn-sm btn-del-edu-ses" data-cid="${this.esc(c.id)}" data-sid="${this.esc(s.id)}" aria-label="Eliminar sesión">✕</button>
                </div>`).join('') || '<p class="muted">Sin sesiones.</p>';
            return this.wrap('educacion', this.esc(c.nombre), `${bc} <span aria-hidden="true">/</span> <span>Curso</span>`, `
                <p class="muted">${this.esc(c.notas || '')}</p>
                <div class="card"><h2>Participantes / niños</h2><div>${parts}</div>
                    <div class="form-row">
                        <input type="text" id="edu-part-nombre" placeholder="Nombre" aria-label="Nombre participante"/>
                        <input type="text" id="edu-part-datos" placeholder="Datos básicos" aria-label="Datos"/>
                        <button type="button" id="btn-edu-add-part" class="btn btn-primary" data-cid="${this.esc(c.id)}">Añadir</button>
                    </div>
                </div>
                <div class="card"><h2>Sesiones a las que asistir</h2><div>${ses}</div>
                    <div class="form-row">
                        <input type="date" id="edu-ses-fecha" value="${hoy}" aria-label="Fecha sesión"/>
                        <input type="time" id="edu-ses-ini" value="09:00" aria-label="Inicio"/>
                        <input type="time" id="edu-ses-fin" value="10:00" aria-label="Fin"/>
                        <input type="text" id="edu-ses-tit" placeholder="Título" aria-label="Título"/>
                        <button type="button" id="btn-edu-add-ses" class="btn btn-primary" data-cid="${this.esc(c.id)}">Añadir sesión</button>
                    </div>
                </div>`);
        }

        if (section === 'participante' && subId && subId2) {
            const c = (d.cursos || []).find(x => x.id === subId);
            const p = c && (c.participantes || []).find(x => x.id === subId2);
            if (!c || !p) return this.wrap('educacion', 'Participante', bc, '<p class="muted">No encontrado.</p>');
            if (!p.evaluaciones) p.evaluaciones = [];
            if (!p.seguimiento) p.seguimiento = [];
            if (!p.tareas) p.tareas = [];
            const ev = p.evaluaciones.map((e, i) => `<div class="row-item">${this.esc(e.texto)} <button type="button" class="btn-sm btn-del-edu-ev" data-i="${i}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin evaluaciones.</p>';
            const sg = p.seguimiento.map((e, i) => `<div class="row-item">${this.esc(e.texto)} <button type="button" class="btn-sm btn-del-edu-sg" data-i="${i}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin notas de seguimiento.</p>';
            const tarRows = p.tareas.map(t => {
                const label = this.esc(t.titulo || t.texto || '');
                return `<tr class="${t.hecho ? 'trabajo-task-done' : ''}"><td><input type="checkbox" class="edu-tar-check" data-id="${this.esc(t.id)}" ${t.hecho ? 'checked' : ''} aria-label="Hecha"/></td><td>${label}</td><td>${this.esc((t.fecha || '').slice(0, 10))}</td><td>${this.esc(t.hora || '—')}</td><td><span class="trabajo-prio trabajo-prio--${this.esc(t.prioridad || 'media')}">${this.esc(t.prioridad || 'media')}</span></td><td>${this.esc(t.etiqueta || '')}</td><td><button type="button" class="btn-sm btn-del-edu-tar" data-id="${this.esc(t.id)}" aria-label="Eliminar tarea">✕</button></td></tr>`;
            }).join('');
            return this.wrap('educacion', this.esc(p.nombre), `${bc} <span aria-hidden="true">/</span> Participante`, `
                <div class="card"><h2>Ficha</h2><p>${this.esc(p.datos || '')}</p><textarea id="edu-part-notas" rows="3" class="trabajo-input" aria-label="Notas generales">${this.esc(p.notas || '')}</textarea><button type="button" id="btn-edu-save-notas" class="btn btn-primary" data-cid="${this.esc(c.id)}" data-pid="${this.esc(p.id)}">Guardar notas</button></div>
                <div class="card"><h2>Evaluaciones</h2><div>${ev}</div><div class="form-row"><input type="text" id="edu-ev-text" placeholder="Nueva evaluación"/><button type="button" id="btn-edu-add-ev" class="btn btn-primary" data-cid="${this.esc(c.id)}" data-pid="${this.esc(p.id)}">Añadir</button></div></div>
                <div class="card"><h2>Seguimiento</h2><div>${sg}</div><div class="form-row"><input type="text" id="edu-sg-text" placeholder="Nota de seguimiento"/><button type="button" id="btn-edu-add-sg" class="btn btn-primary" data-cid="${this.esc(c.id)}" data-pid="${this.esc(p.id)}">Añadir</button></div></div>
                <div class="card"><h2>Tareas</h2>
                    <table class="trabajo-table"><thead><tr><th></th><th>Título</th><th>Fecha</th><th>Hora</th><th>Prio</th><th>Etiqueta</th><th></th></tr></thead><tbody id="edu-tar-list">${tarRows || '<tr><td colspan="7" class="muted">Sin tareas.</td></tr>'}</tbody></table>
                    <table class="trabajo-table trabajo-table--form" style="margin-top:0.75rem;"><tbody>
                        <tr><td>Título</td><td><input type="text" id="edu-tar-titulo" class="trabajo-input-inline" placeholder="Obligatorio" aria-required="true"/></td></tr>
                        <tr><td>Fecha</td><td><input type="date" id="edu-tar-fecha" value="${hoy}" aria-label="Fecha"/></td></tr>
                        <tr><td>Hora</td><td><input type="time" id="edu-tar-hora" aria-label="Hora"/></td></tr>
                        <tr><td>Prioridad</td><td><select id="edu-tar-prio" aria-label="Prioridad"><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></td></tr>
                        <tr><td>Notas</td><td><input type="text" id="edu-tar-desc" placeholder="Breves" aria-label="Notas"/></td></tr>
                        <tr><td>Etiqueta</td><td><input type="text" id="edu-tar-etiq" placeholder="Opcional" aria-label="Etiqueta"/></td></tr>
                        <tr><td>Enlace</td><td><input type="text" id="edu-tar-enlace" placeholder="#educacion/cursos" aria-label="Enlace"/></td></tr>
                    </tbody></table>
                    <button type="button" id="btn-edu-add-tar" class="btn btn-primary" data-cid="${this.esc(c.id)}" data-pid="${this.esc(p.id)}">Añadir tarea</button>
                </div>`);
        }

        if (section === 'prioridades') {
            let filtro = hoy;
            try {
                const s = sessionStorage.getItem('trabajo_edu_prio_fecha');
                if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) filtro = s;
            } catch (e) {}
            const list = (d.prioridadesDia || []).filter(x => (x.fecha || hoy).slice(0, 10) === filtro).map(p => `
                <tr class="${p.hecho ? 'trabajo-task-done' : ''}">
                    <td><input type="checkbox" class="edu-prio-check" data-id="${this.esc(p.id)}" ${p.hecho ? 'checked' : ''} aria-label="Hecha"/></td>
                    <td>${this.esc(p.titulo || p.texto || '')}</td>
                    <td>${this.esc((p.fecha || '').slice(0, 10))}</td>
                    <td>${this.esc(p.hora || '—')}</td>
                    <td><span class="trabajo-prio trabajo-prio--${this.esc(p.prioridad || 'media')}">${this.esc(p.prioridad || 'media')}</span></td>
                    <td>${this.esc(p.etiqueta || '')}</td>
                    <td>${this.esc((p.descripcion || '').slice(0, 40))}${(p.descripcion || '').length > 40 ? '…' : ''}</td>
                    <td><button type="button" class="btn-sm btn-del-edu-prio" data-id="${this.esc(p.id)}" aria-label="Eliminar">✕</button></td>
                </tr>`).join('');
            return this.wrap('educacion', 'Prioridades del día', bc, `
                <div class="card"><h2>Filtrar por fecha</h2><div class="form-row">
                    <input type="date" id="edu-prio-filtro-fecha" value="${filtro}" aria-label="Fecha"/>
                    <button type="button" id="btn-edu-prio-filtro" class="btn btn-ghost btn-sm">Aplicar</button>
                </div></div>
                <div class="card"><h2>Tareas · ${this.esc(filtro)}</h2>
                    <table class="trabajo-table" id="edu-prio-list"><thead><tr><th></th><th>Título</th><th>Fecha</th><th>Hora</th><th>Prio</th><th>Etiqueta</th><th>Notas</th><th></th></tr></thead>
                    <tbody>${list || '<tr><td colspan="8" class="muted">Nada en esta fecha.</td></tr>'}</tbody></table>
                    <table class="trabajo-table trabajo-table--form" style="margin-top:0.75rem;"><tbody>
                        <tr><td>Título</td><td><input type="text" id="edu-prio-titulo" class="trabajo-input-inline" placeholder="Obligatorio" aria-required="true"/></td></tr>
                        <tr><td>Fecha</td><td><input type="date" id="edu-prio-fecha" value="${filtro}" aria-label="Fecha"/></td></tr>
                        <tr><td>Hora</td><td><input type="time" id="edu-prio-hora" aria-label="Hora"/></td></tr>
                        <tr><td>Prioridad</td><td><select id="edu-prio-prio" aria-label="Prioridad"><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></td></tr>
                        <tr><td>Notas</td><td><input type="text" id="edu-prio-desc" placeholder="Breves" aria-label="Notas"/></td></tr>
                        <tr><td>Etiqueta</td><td><input type="text" id="edu-prio-etiq" placeholder="Opcional" aria-label="Etiqueta"/></td></tr>
                        <tr><td>Enlace</td><td><input type="text" id="edu-prio-enlace" placeholder="#educacion/cursos" aria-label="Enlace"/></td></tr>
                    </tbody></table>
                    <button type="button" id="btn-edu-prio-add" class="btn btn-primary">Añadir</button>
                </div>`);
        }

        return this.wrap('educacion', 'Educación', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindEducacion(section, subId, subId2) {
        const slug = 'educacion';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        if (section === 'cursos' && !subId) {
            document.getElementById('btn-edu-add-curso')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('edu-curso-nombre').value.trim();
                if (!nombre) return;
                if (!d.cursos) d.cursos = [];
                d.cursos.push({ id: Date.now().toString(), nombre, notas: document.getElementById('edu-curso-notas').value.trim(), participantes: [], sesiones: [] });
                this._eduSyncCalendario(d);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-edu-curso').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.cursos = (d.cursos || []).filter(c => c.id !== btn.dataset.id);
                    this._eduSyncCalendario(d);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'curso' && subId) {
            document.getElementById('btn-edu-add-part')?.addEventListener('click', e => {
                const cid = e.currentTarget.dataset.cid;
                const d = TrabajoStorage.getPerfilData(slug);
                const c = d.cursos.find(x => x.id === cid);
                const nombre = document.getElementById('edu-part-nombre').value.trim();
                if (!c || !nombre) return;
                if (!c.participantes) c.participantes = [];
                c.participantes.push({ id: Date.now().toString(), nombre, datos: document.getElementById('edu-part-datos').value.trim(), notas: '', evaluaciones: [], seguimiento: [], tareas: [] });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-edu-part').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const c = d.cursos.find(x => x.id === btn.dataset.cid);
                    if (c) c.participantes = (c.participantes || []).filter(p => p.id !== btn.dataset.pid);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.getElementById('btn-edu-add-ses')?.addEventListener('click', e => {
                const cid = e.currentTarget.dataset.cid;
                const d = TrabajoStorage.getPerfilData(slug);
                const c = d.cursos.find(x => x.id === cid);
                if (!c) return;
                if (!c.sesiones) c.sesiones = [];
                c.sesiones.push({
                    id: Date.now().toString(),
                    fecha: document.getElementById('edu-ses-fecha').value,
                    horaInicio: document.getElementById('edu-ses-ini').value,
                    horaFin: document.getElementById('edu-ses-fin').value,
                    titulo: document.getElementById('edu-ses-tit').value.trim() || 'Sesión'
                });
                this._eduSyncCalendario(d);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-edu-ses').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const c = d.cursos.find(x => x.id === btn.dataset.cid);
                    if (c) c.sesiones = (c.sesiones || []).filter(s => s.id !== btn.dataset.sid);
                    this._eduSyncCalendario(d);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'participante' && subId && subId2) {
            document.getElementById('btn-edu-save-notas')?.addEventListener('click', e => {
                const d = TrabajoStorage.getPerfilData(slug);
                const c = d.cursos.find(x => x.id === e.currentTarget.dataset.cid);
                const p = c && (c.participantes || []).find(x => x.id === e.currentTarget.dataset.pid);
                if (p) p.notas = document.getElementById('edu-part-notas').value;
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.getElementById('btn-edu-add-ev')?.addEventListener('click', e => {
                const t = document.getElementById('edu-ev-text').value.trim();
                if (!t) return;
                const d = TrabajoStorage.getPerfilData(slug);
                const c = d.cursos.find(x => x.id === e.currentTarget.dataset.cid);
                const p = c && (c.participantes || []).find(x => x.id === e.currentTarget.dataset.pid);
                if (p) { if (!p.evaluaciones) p.evaluaciones = []; p.evaluaciones.push({ texto: t, fecha: new Date().toISOString().slice(0, 10) }); }
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-edu-ev').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const c = d.cursos.find(x => x.id === subId);
                    const p = c && (c.participantes || []).find(x => x.id === subId2);
                    if (p && p.evaluaciones) p.evaluaciones.splice(parseInt(btn.dataset.i, 10), 1);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.getElementById('btn-edu-add-sg')?.addEventListener('click', e => {
                const t = document.getElementById('edu-sg-text').value.trim();
                if (!t) return;
                const d = TrabajoStorage.getPerfilData(slug);
                const c = d.cursos.find(x => x.id === e.currentTarget.dataset.cid);
                const p = c && (c.participantes || []).find(x => x.id === e.currentTarget.dataset.pid);
                if (p) { if (!p.seguimiento) p.seguimiento = []; p.seguimiento.push({ texto: t, fecha: new Date().toISOString().slice(0, 10) }); }
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-edu-sg').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const c = d.cursos.find(x => x.id === subId);
                    const p = c && (c.participantes || []).find(x => x.id === subId2);
                    if (p && p.seguimiento) p.seguimiento.splice(parseInt(btn.dataset.i, 10), 1);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.getElementById('btn-edu-add-tar')?.addEventListener('click', e => {
                const tit = document.getElementById('edu-tar-titulo').value.trim();
                if (!tit) {
                    if (typeof TrabajoApp !== 'undefined') TrabajoApp.toast('El título es obligatorio.', 'error');
                    return;
                }
                const d = TrabajoStorage.getPerfilData(slug);
                const c = d.cursos.find(x => x.id === e.currentTarget.dataset.cid);
                const p = c && (c.participantes || []).find(x => x.id === e.currentTarget.dataset.pid);
                if (!p) return;
                if (!p.tareas) p.tareas = [];
                const item = TrabajoStorage.normalizeTareaItem({
                    titulo: tit,
                    fecha: document.getElementById('edu-tar-fecha').value || new Date().toISOString().slice(0, 10),
                    hora: document.getElementById('edu-tar-hora').value || '',
                    prioridad: document.getElementById('edu-tar-prio').value,
                    descripcion: document.getElementById('edu-tar-desc').value.trim(),
                    etiqueta: document.getElementById('edu-tar-etiq').value.trim(),
                    enlaceSeccion: document.getElementById('edu-tar-enlace').value.trim(),
                    hecha: false
                }, document.getElementById('edu-tar-fecha').value);
                p.tareas.push(item);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.edu-tar-check').forEach(cb => {
                cb.addEventListener('change', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const c = d.cursos.find(x => x.id === subId);
                    const p = c && (c.participantes || []).find(x => x.id === subId2);
                    const tar = p && (p.tareas || []).find(t => t.id === cb.dataset.id);
                    if (tar) tar.hecho = cb.checked;
                    TrabajoStorage.savePerfilData(slug, d);
                });
            });
            document.querySelectorAll('.btn-del-edu-tar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const c = d.cursos.find(x => x.id === subId);
                    const p = c && (c.participantes || []).find(x => x.id === subId2);
                    if (p) p.tareas = (p.tareas || []).filter(t => t.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'prioridades') {
            document.getElementById('btn-edu-prio-filtro')?.addEventListener('click', () => {
                const v = document.getElementById('edu-prio-filtro-fecha').value;
                if (v) {
                    try { sessionStorage.setItem('trabajo_edu_prio_fecha', v); } catch (e) {}
                }
                rerender();
            });
            document.getElementById('btn-edu-prio-add')?.addEventListener('click', () => {
                const tit = document.getElementById('edu-prio-titulo').value.trim();
                if (!tit) {
                    if (typeof TrabajoApp !== 'undefined') TrabajoApp.toast('El título es obligatorio.', 'error');
                    return;
                }
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.prioridadesDia) d.prioridadesDia = [];
                const item = TrabajoStorage.normalizeTareaItem({
                    titulo: tit,
                    fecha: document.getElementById('edu-prio-fecha').value || new Date().toISOString().slice(0, 10),
                    hora: document.getElementById('edu-prio-hora').value || '',
                    prioridad: document.getElementById('edu-prio-prio').value,
                    descripcion: document.getElementById('edu-prio-desc').value.trim(),
                    etiqueta: document.getElementById('edu-prio-etiq').value.trim(),
                    enlaceSeccion: document.getElementById('edu-prio-enlace').value.trim(),
                    hecha: false
                }, document.getElementById('edu-prio-fecha').value);
                d.prioridadesDia.push(item);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.edu-prio-check').forEach(cb => {
                cb.addEventListener('change', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const p = (d.prioridadesDia || []).find(x => x.id === cb.dataset.id);
                    if (p) p.hecho = cb.checked;
                    TrabajoStorage.savePerfilData(slug, d);
                });
            });
            document.querySelectorAll('.btn-del-edu-prio').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.prioridadesDia = (d.prioridadesDia || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'salas' && typeof TrabajoEducacion !== 'undefined') {
            TrabajoEducacion.bindSalas(slug, rerender);
        }
        if (section === 'actividades' && typeof TrabajoEducacion !== 'undefined') {
            TrabajoEducacion.bindActividades(slug, rerender);
        }
        if (section === 'planificacion' && typeof TrabajoEducacion !== 'undefined') {
            TrabajoEducacion.bindPlanificacion(slug, rerender);
        }
        if (section === 'informes' && typeof TrabajoEducacion !== 'undefined') {
            TrabajoEducacion.bindInformes(slug, rerender);
        }
    },

    renderPrevencionista(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('prevencionista');
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Prevención</span>`;
        if (typeof TrabajoPrevencion !== 'undefined') {
            if (section === 'tareas') return TrabajoPrevencion.renderTareas(this, d, bc);
            if (section === 'epp') {
                if (subId === 'catalogo') return TrabajoPrevencion.renderEppCatalogo(this, d, bc);
                return TrabajoPrevencion.renderEppPanel(this, d, bc);
            }
        }

        if (section === 'inicio') {
            return this.wrap('prevencionista', 'Prevención de riesgos', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('prevencionista', 'clientes')}" class="trabajo-quick-btn">👥 Clientes</a>
                    <a href="${this.linkPerfil('prevencionista', 'obras')}" class="trabajo-quick-btn">🏗️ Obras</a>
                    <a href="${this.linkPerfil('prevencionista', 'calendario')}" class="trabajo-quick-btn">📆 Visitas</a>
                </div>
                <div class="trabajo-dash-cards">
                    <div class="card trabajo-dash-card"><h3>Clientes</h3><p class="trabajo-dash-value">${(d.clientes || []).length}</p></div>
                    <div class="card trabajo-dash-card"><h3>Obras</h3><p class="trabajo-dash-value">${(d.obras || []).length}</p></div>
                    <div class="card trabajo-dash-card"><h3>Visitas</h3><p class="trabajo-dash-value">${(d.visitas || []).length}</p></div>
                </div>`);
        }
        if (section === 'clientes') {
            const list = (d.clientes || []).length ? (d.clientes || []).map(c => `<div class="row-item">${this.esc(c.nombre)} ${this.esc(c.empresa || '')} <button type="button" class="btn-sm btn-del-prev-cli" data-id="${this.esc(c.id)}" aria-label="Eliminar">✕</button></div>`).join('') : this.emptyCta('Crea tu primer cliente.', 'Ir a formulario', this.linkPerfil('prevencionista', 'clientes'));
            return this.wrap('prevencionista', 'Clientes', bc, `
                <div class="card"><h2>Ingreso de cliente</h2><div class="form-row">
                    <input type="text" id="prev-cli-nombre" placeholder="Nombre / contacto" aria-label="Nombre"/>
                    <input type="text" id="prev-cli-emp" placeholder="Empresa" aria-label="Empresa"/>
                    <input type="text" id="prev-cli-tel" placeholder="Teléfono" aria-label="Teléfono"/>
                    <button type="button" id="btn-prev-cli-add" class="btn btn-primary">Guardar</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div id="prev-cli-list">${list}</div></div>`);
        }
        if (section === 'obras') {
            const clis = d.clientes || [];
            const opts = clis.map(c => `<option value="${this.esc(c.id)}">${this.esc(c.nombre)}</option>`).join('');
            const list = (d.obras || []).length ? (d.obras || []).map(o => {
                const cl = clis.find(c => c.id === o.clienteId);
                return `<div class="row-item">${this.esc(o.nombre)} · ${this.esc(cl?.nombre || 'Cliente')} <button type="button" class="btn-sm btn-del-prev-obra" data-id="${this.esc(o.id)}" aria-label="Eliminar">✕</button></div>`;
            }).join('') : this.emptyCta('Registra la primera obra.', 'Añadir obra', this.linkPerfil('prevencionista', 'obras'));
            return this.wrap('prevencionista', 'Obras / proyectos', bc, `
                <div class="card"><h2>Ingreso de obra</h2><div class="form-row">
                    <select id="prev-obra-cli" aria-label="Cliente">${opts || '<option value="">— Cree un cliente —</option>'}</select>
                    <input type="text" id="prev-obra-nombre" placeholder="Nombre obra" aria-label="Nombre obra"/>
                    <input type="text" id="prev-obra-datos" placeholder="Datos del proyecto" aria-label="Datos"/>
                    <input type="text" id="prev-obra-ubic" placeholder="Ubicación" aria-label="Ubicación"/>
                    <button type="button" id="btn-prev-obra-add" class="btn btn-primary">Guardar</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div id="prev-obra-list">${list}</div></div>`);
        }
        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('prevencionista', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('prevencionista', d, iso),
                footNote: 'Número en cada día: tareas de agenda + visitas a obras.'
            });
            const agPrev = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasPrevDia = (agPrev.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAgendaPrev = tareasPrevDia.length ? tareasPrevDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const vis = (d.visitas || []).slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
            const visDia = vis.filter(v => (v.fecha || '').slice(0, 10) === selInMonth);
            const listDia = visDia.length ? visDia.map(v => {
                const o = (d.obras || []).find(x => x.id === v.obraId);
                return `<div class="row-item">${this.esc(v.hora || '')} · ${this.esc(v.tipo || 'Visita')} · ${this.esc(o?.nombre || '')} <button type="button" class="btn-sm btn-del-prev-vis" data-id="${this.esc(v.id)}" aria-label="Eliminar">✕</button></div>`;
            }).join('') : '<p class="muted">Sin visitas este día.</p>';
            const list = vis.length ? vis.map(v => {
                const o = (d.obras || []).find(x => x.id === v.obraId);
                return `<div class="row-item">${this.esc(v.fecha)} ${this.esc(v.hora || '')} · ${this.esc(v.tipo || 'Visita')} · ${this.esc(o?.nombre || '')} <button type="button" class="btn-sm btn-del-prev-vis" data-id="${this.esc(v.id)}" aria-label="Eliminar">✕</button></div>`;
            }).join('') : '<p class="muted">Sin visitas. Añade una abajo.</p>';
            const obras = d.obras || [];
            const oopts = obras.map(o => `<option value="${this.esc(o.id)}">${this.esc(o.nombre)}</option>`).join('');
            return this.wrap('prevencionista', 'Calendario de visitas', bc, `
                <p class="muted">Vista unificada: <strong>agenda</strong> y <strong>visitas a obras</strong>. El número en la grilla suma ambos. Añade visitas abajo; la <a href="${this.linkPerfil('prevencionista', 'agenda')}">Agenda</a> cubre tareas puntuales.</p>
                ${html}
                <div class="card"><h2>Nueva visita</h2><div class="form-row">
                    <select id="prev-vis-obra" aria-label="Obra">${oopts || '<option value="">— Cree una obra —</option>'}</select>
                    <input type="date" id="prev-vis-fecha" value="${hoy}" aria-label="Fecha"/>
                    <input type="time" id="prev-vis-hora" value="09:00" aria-label="Hora"/>
                    <input type="text" id="prev-vis-tipo" placeholder="Tipo (inspección, reunión…)" aria-label="Tipo"/>
                    <input type="text" id="prev-vis-anal" placeholder="Análisis / hallazgos" aria-label="Análisis"/>
                    <button type="button" id="btn-prev-vis-add" class="btn btn-primary">Añadir</button>
                </div></div>
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAgendaPrev}</div>
                <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Visitas</h3><div id="prev-vis-dia">${listDia}</div></div>
                <div class="card"><h2>Todas las visitas</h2><div id="prev-vis-list">${list}</div></div>`);
        }
        return this.wrap('prevencionista', 'Prevención', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindPrevencionista(section, subId, subId2) {
        const slug = 'prevencionista';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        if (section === 'clientes') {
            document.getElementById('btn-prev-cli-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('prev-cli-nombre').value.trim();
                if (!nombre) return;
                if (!d.clientes) d.clientes = [];
                d.clientes.push({ id: Date.now().toString(), nombre, empresa: document.getElementById('prev-cli-emp').value.trim(), telefono: document.getElementById('prev-cli-tel').value.trim() });
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
        }
        if (section === 'obras') {
            document.getElementById('btn-prev-obra-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('prev-obra-nombre').value.trim();
                if (!nombre) return;
                if (!d.obras) d.obras = [];
                d.obras.push({ id: Date.now().toString(), clienteId: document.getElementById('prev-obra-cli').value, nombre, datos: document.getElementById('prev-obra-datos').value.trim(), ubicacion: document.getElementById('prev-obra-ubic').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-prev-obra').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.obras = (d.obras || []).filter(o => o.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'calendario') {
            document.getElementById('btn-prev-vis-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const oid = document.getElementById('prev-vis-obra').value;
                if (!oid) return;
                if (!d.visitas) d.visitas = [];
                d.visitas.push({ id: Date.now().toString(), obraId: oid, fecha: document.getElementById('prev-vis-fecha').value, hora: document.getElementById('prev-vis-hora').value, tipo: document.getElementById('prev-vis-tipo').value.trim(), analisis: document.getElementById('prev-vis-anal').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-prev-vis').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.visitas = (d.visitas || []).filter(v => v.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'tareas' && typeof TrabajoPrevencion !== 'undefined') {
            TrabajoPrevencion.bindTareas(slug, rerender);
        }
        if (section === 'epp' && typeof TrabajoPrevencion !== 'undefined') {
            if (subId === 'catalogo') TrabajoPrevencion.bindEppCatalogo(slug, rerender);
            else TrabajoPrevencion.bindEppPanel(slug, rerender);
        }
    },

    renderAdministrativo(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('administrativo');
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Administrativo</span>`;

        if (section === 'inicio') {
            const pri = (d.prioridadesInicio || []).map((p, i) => `<div class="row-item"><label><input type="checkbox" class="adm-prio-check" data-i="${i}" ${p.hecho ? 'checked' : ''}/> ${this.esc(p.texto)}</label>
                <button type="button" class="btn-sm btn-del-adm-prio" data-i="${i}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin prioridades. Añade abajo.</p>';
            return this.wrap('administrativo', 'Inicio', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('administrativo', 'fechas')}" class="trabajo-quick-btn">📅 Fechas importantes</a>
                    <a href="${this.linkPerfil('administrativo', 'procesos')}" class="trabajo-quick-btn">🔄 Procesos</a>
                    <a href="${this.linkPerfil('administrativo', 'contactos')}" class="trabajo-quick-btn">📇 Contactos</a>
                </div>
                <div class="card"><h2>Prioridades</h2><div id="adm-prio-list">${pri}</div>
                    <div class="form-row"><input type="text" id="adm-prio-text" placeholder="Nueva prioridad"/><button type="button" id="btn-adm-prio-add" class="btn btn-primary">Añadir</button></div>
                </div>
                <div class="card"><h2>Notas destacadas</h2>
                    <textarea id="adm-notas" class="trabajo-input" rows="4" aria-label="Notas">${this.esc(d.notasDestacadas || '')}</textarea>
                    <button type="button" id="btn-adm-notas-save" class="btn btn-primary">Guardar notas</button>
                </div>`);
        }
        if (section === 'fechas') {
            const alerta = 30;
            const fut = (d.fechasImportantes || []).filter(f => f.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
            const prox = fut.filter(f => {
                const d0 = new Date(f.fecha);
                const d1 = new Date(hoy);
                const diff = (d0 - d1) / 864e5;
                return diff >= 0 && diff <= alerta;
            });
            const list = (d.fechasImportantes || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(f => `<div class="row-item">${this.esc(f.fecha)} · ${this.esc(f.titulo)} <button type="button" class="btn-sm btn-del-adm-fecha" data-id="${this.esc(f.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin fechas.</p>';
            return this.wrap('administrativo', 'Fechas importantes', bc, `
                <div class="card"><p class="muted">Alertas próximas (${alerta} días): <strong>${prox.length}</strong></p>
                    <div id="adm-fecha-prox">${prox.map(f => `<div class="row-item">${this.esc(f.fecha)} · ${this.esc(f.titulo)}</div>`).join('') || '<p class="muted">Ninguna en ventana.</p>'}</div>
                </div>
                <div class="card"><h2>Todas</h2><div id="adm-fecha-list">${list}</div>
                    <div class="form-row">
                        <input type="text" id="adm-fecha-tit" placeholder="Título" aria-label="Título"/>
                        <input type="date" id="adm-fecha-d" value="${hoy}" aria-label="Fecha"/>
                        <button type="button" id="btn-adm-fecha-add" class="btn btn-primary">Añadir</button>
                    </div>
                </div>`);
        }
        if (section === 'procesos') {
            const list = (d.procesos || []).map(p => `<div class="row-item">${this.esc(p.nombre)} · ${this.esc(p.fechaLimite || '')} <a href="${this.linkPerfil('administrativo', 'calendario')}" class="text-sm">Calendario</a>
                <button type="button" class="btn-sm btn-del-adm-proc" data-id="${this.esc(p.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin procesos.</p>';
            return this.wrap('administrativo', 'Procesos administrativos', bc, `
                <div class="card"><h2>Lista</h2><div id="adm-proc-list">${list}</div>
                    <div class="form-row">
                        <input type="text" id="adm-proc-nombre" placeholder="Nombre del proceso" aria-label="Nombre"/>
                        <input type="date" id="adm-proc-fecha" value="${hoy}" aria-label="Fecha límite"/>
                        <input type="text" id="adm-proc-notas" placeholder="Notas" aria-label="Notas"/>
                        <button type="button" id="btn-adm-proc-add" class="btn btn-primary">Añadir</button>
                    </div>
                </div>`);
        }
        if (section === 'contactos') {
            const list = (d.contactos || []).map(c => `<div class="row-item">${this.esc(c.nombre)} ${this.esc(c.telefono || '')} <button type="button" class="btn-sm btn-del-adm-con" data-id="${this.esc(c.id)}" aria-label="Eliminar">✕</button></div>`).join('') || this.emptyCta('Añade primer contacto.', 'Crear', this.linkPerfil('administrativo', 'contactos'));
            return this.wrap('administrativo', 'Contactos', bc, `
                <div class="card"><h2>Lista</h2><div id="adm-con-list">${list}</div>
                    <div class="form-row">
                        <input type="text" id="adm-con-nombre" placeholder="Nombre" aria-label="Nombre"/>
                        <input type="text" id="adm-con-tel" placeholder="Teléfono" aria-label="Teléfono"/>
                        <input type="text" id="adm-con-notas" placeholder="Notas" aria-label="Notas"/>
                        <button type="button" id="btn-adm-con-add" class="btn btn-primary">Añadir</button>
                    </div>
                </div>`);
        }
        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('administrativo', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('administrativo', d, iso),
                footNote: 'Número en cada día: tareas de agenda + fechas importantes y plazos de proceso.'
            });
            const agAdm = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasAdmDia = (agAdm.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAgendaAdm = tareasAdmDia.length ? tareasAdmDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const fechas = [...(d.fechasImportantes || []).map(f => ({ fecha: f.fecha, txt: f.titulo, tipo: 'fecha' })), ...(d.procesos || []).map(p => ({ fecha: p.fechaLimite || hoy, txt: p.nombre, tipo: 'proceso' }))].sort((a, b) => a.fecha.localeCompare(b.fecha));
            const delDia = fechas.filter(x => (x.fecha || '').slice(0, 10) === selInMonth);
            const listDiaNeg = delDia.length ? delDia.map(x => `<div class="row-item">${this.esc(x.fecha)} · ${this.esc(x.txt)} <span class="muted">(${x.tipo})</span></div>`).join('') : '<p class="muted">Sin fechas ni plazos este día.</p>';
            const list = fechas.length ? fechas.map(x => `<div class="row-item">${this.esc(x.fecha)} · ${this.esc(x.txt)} <span class="muted">(${x.tipo})</span></div>`).join('') : '<p class="muted">Vacío. Añade fechas o procesos con fecha.</p>';
            return this.wrap('administrativo', 'Calendario', bc, `
                <p class="muted">Vista unificada: <strong>agenda</strong> y <strong>fechas / plazos</strong> (edita en <a href="${this.linkPerfil('administrativo', 'fechas')}">Fechas importantes</a> y <a href="${this.linkPerfil('administrativo', 'procesos')}">Procesos</a>). El número en la grilla suma ambos tipos.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAgendaAdm}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Fechas y plazos</h3><div>${listDiaNeg}</div></div>
                <div class="card"><h2>Todo</h2><div>${list}</div></div>`);
        }
        return this.wrap('administrativo', 'RRHH', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindAdministrativo(section) {
        const slug = 'administrativo';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        if (section === 'inicio') {
            document.getElementById('btn-adm-prio-add')?.addEventListener('click', () => {
                const t = document.getElementById('adm-prio-text').value.trim();
                if (!t) return;
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.prioridadesInicio) d.prioridadesInicio = [];
                d.prioridadesInicio.push({ texto: t, hecho: false });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.adm-prio-check').forEach(cb => {
                cb.addEventListener('change', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const p = d.prioridadesInicio[parseInt(cb.dataset.i, 10)];
                    if (p) p.hecho = cb.checked;
                    TrabajoStorage.savePerfilData(slug, d);
                });
            });
            document.querySelectorAll('.btn-del-adm-prio').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.prioridadesInicio.splice(parseInt(btn.dataset.i, 10), 1);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
            document.getElementById('btn-adm-notas-save')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.notasDestacadas = document.getElementById('adm-notas').value;
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        }
        if (section === 'fechas') {
            document.getElementById('btn-adm-fecha-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const tit = document.getElementById('adm-fecha-tit').value.trim();
                if (!tit) return;
                if (!d.fechasImportantes) d.fechasImportantes = [];
                d.fechasImportantes.push({ id: Date.now().toString(), titulo: tit, fecha: document.getElementById('adm-fecha-d').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-adm-fecha').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.fechasImportantes = (d.fechasImportantes || []).filter(f => f.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'procesos') {
            document.getElementById('btn-adm-proc-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('adm-proc-nombre').value.trim();
                if (!nombre) return;
                if (!d.procesos) d.procesos = [];
                d.procesos.push({ id: Date.now().toString(), nombre, fechaLimite: document.getElementById('adm-proc-fecha').value, notas: document.getElementById('adm-proc-notas').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-adm-proc').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.procesos = (d.procesos || []).filter(p => p.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'contactos') {
            document.getElementById('btn-adm-con-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('adm-con-nombre').value.trim();
                if (!nombre) return;
                if (!d.contactos) d.contactos = [];
                d.contactos.push({ id: Date.now().toString(), nombre, telefono: document.getElementById('adm-con-tel').value.trim(), notas: document.getElementById('adm-con-notas').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-adm-con').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.contactos = (d.contactos || []).filter(c => c.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
    },

    renderPasteleria(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('pasteleria');
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Pastelería</span>`;
        const calc = d.calculadora || {};

        if (section === 'inicio') {
            return this.wrap('pasteleria', 'Pastelería', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('pasteleria', 'entregas')}" class="trabajo-quick-btn">📆 Entregas</a>
                    <a href="${this.linkPerfil('pasteleria', 'precios')}" class="trabajo-quick-btn">🧮 Precios</a>
                    <a href="${this.linkPerfil('pasteleria', 'recetario')}" class="trabajo-quick-btn">📖 Recetario</a>
                </div>
                <div class="trabajo-dash-cards">
                    <div class="card trabajo-dash-card"><h3>Entregas</h3><p class="trabajo-dash-value">${(d.entregas || []).length}</p></div>
                    <div class="card trabajo-dash-card"><h3>Pedidos</h3><p class="trabajo-dash-value">${(d.historialPedidos || []).length}</p></div>
                </div>`);
        }
        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('pasteleria', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('pasteleria', d, iso),
                footNote: 'Número en cada día: tareas de agenda + entregas programadas.'
            });
            const agPast = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasPastDia = (agPast.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAg = tareasPastDia.length ? tareasPastDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const entDia = (d.entregas || []).filter(e => (e.fecha || '').slice(0, 10) === selInMonth);
            const listEnt = entDia.length ? entDia.map(e => `<div class="row-item">${this.esc(e.cliente || '')} · ${this.esc(e.producto || '')} · <a href="${this.linkPerfil('pasteleria', 'entregas')}">Entregas</a></div>`).join('') : '<p class="muted">Sin entregas este día.</p>';
            return this.wrap('pasteleria', 'Calendario', bc, `
                <p class="muted">Vista unificada: <strong>agenda</strong> y <strong>entregas</strong>. El número en la grilla suma ambos.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAg}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Entregas</h3><div>${listEnt}</div></div>`);
        }
        if (section === 'entregas') {
            const list = (d.entregas || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(e => `<div class="row-item">${this.esc(e.fecha)} · ${this.esc(e.cliente || '')} · ${this.esc(e.producto || '')} <button type="button" class="btn-sm btn-del-past-ent" data-id="${this.esc(e.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin entregas programadas.</p>';
            return this.wrap('pasteleria', 'Calendario de entregas', bc, `
                <div class="card"><h2>Próximas entregas</h2><div id="past-ent-list">${list}</div>
                    <div class="form-row">
                        <input type="date" id="past-ent-fecha" value="${hoy}" aria-label="Fecha"/>
                        <input type="text" id="past-ent-cli" placeholder="Cliente" aria-label="Cliente"/>
                        <input type="text" id="past-ent-prod" placeholder="Producto" aria-label="Producto"/>
                        <button type="button" id="btn-past-ent-add" class="btn btn-primary">Añadir</button>
                    </div>
                </div>`);
        }
        if (section === 'precios') {
            const cf = parseFloat(calc.costosFijos) || 0;
            const cv = parseFloat(calc.costosVariables) || 0;
            const ind = parseFloat(calc.indirectos) || 0;
            const u = parseInt(calc.unidadesLote, 10) || 1;
            const margen = parseFloat(calc.margenPct) || 0;
            const costoTotal = cf + cv + ind;
            const costoUnit = u ? costoTotal / u : costoTotal;
            const sugerido = costoUnit * (1 + margen / 100);
            return this.wrap('pasteleria', 'Calculador de precios', bc, `
                <div class="card"><h2>Costos</h2>
                    <div class="form-row">
                        <label>Costos fijos <input type="number" id="past-cf" value="${cf}" step="0.01" aria-label="Fijos"/></label>
                        <label>Variables <input type="number" id="past-cv" value="${cv}" step="0.01" aria-label="Variables"/></label>
                        <label>Indirectos <input type="number" id="past-ind" value="${ind}" step="0.01" aria-label="Indirectos"/></label>
                        <label>Unidades/lote <input type="number" id="past-u" value="${u}" min="1" aria-label="Unidades"/></label>
                        <label>Margen % <input type="number" id="past-marg" value="${margen}" step="0.1" aria-label="Margen"/></label>
                        <button type="button" id="btn-past-calc-save" class="btn btn-primary">Guardar parámetros</button>
                    </div>
                    <p><strong>Costo total:</strong> ${this.money(costoTotal)} · <strong>Costo/unidad:</strong> ${this.money(costoUnit)} · <strong>Precio sugerido:</strong> ${this.money(sugerido)}</p>
                </div>`);
        }
        if (section === 'tarifas') {
            const list = (d.tarifas || []).map(t => `<div class="row-item">${this.esc(t.nombre)} · ${this.money(parseFloat(t.precio) || 0)} <button type="button" class="btn-sm btn-del-past-tar" data-id="${this.esc(t.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin tarifas.</p>';
            return this.wrap('pasteleria', 'Tarifas / catálogo', bc, `
                <div class="card"><h2>Productos con precio</h2><div id="past-tar-list">${list}</div>
                    <div class="form-row">
                        <input type="text" id="past-tar-nombre" placeholder="Nombre" aria-label="Nombre"/>
                        <input type="number" id="past-tar-precio" placeholder="Precio" step="0.01" aria-label="Precio"/>
                        <button type="button" id="btn-past-tar-add" class="btn btn-primary">Añadir</button>
                    </div>
                </div>`);
        }
        if (section === 'productos' && !subId) {
            const recs = d.recetas || [];
            const ropts = recs.map(r => `<option value="${this.esc(r.id)}">${this.esc(r.nombre)}</option>`).join('');
            const list = (d.productos || []).map(p => `<div class="row-item"><a href="${this.linkPerfil('pasteleria', 'producto', p.id)}">${this.esc(p.nombre)}</a> <button type="button" class="btn-sm btn-del-past-prod" data-id="${this.esc(p.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin productos.</p>';
            return this.wrap('pasteleria', 'Productos', bc, `
                <div class="card"><h2>Nuevo producto</h2><div class="form-row">
                    <input type="text" id="past-prod-nombre" placeholder="Nombre" aria-label="Nombre"/>
                    <input type="url" id="past-prod-img" placeholder="URL imagen" aria-label="URL imagen"/>
                    <select id="past-prod-rec" aria-label="Receta">${ropts || '<option value="">— Sin receta —</option>'}</select>
                    <button type="button" id="btn-past-prod-add" class="btn btn-primary">Crear</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div>${list}</div></div>`);
        }
        if (section === 'producto' && subId) {
            const p = (d.productos || []).find(x => x.id === subId);
            if (!p) return this.wrap('pasteleria', 'Producto', bc, '<p class="muted">No encontrado.</p>');
            const rec = (d.recetas || []).find(r => r.id === p.recetaId);
            return this.wrap('pasteleria', this.esc(p.nombre), bc + ` <span aria-hidden="true">/</span> Producto`, `
                <div class="card"><p><img src="${this.esc(p.imagenUrl || '')}" alt="" style="max-width:200px;border-radius:8px;" loading="lazy"/></p>
                    <textarea id="past-prod-com" class="trabajo-input" rows="3" aria-label="Comentarios">${this.esc(p.comentarios || '')}</textarea>
                    <p class="muted">Receta vinculada: ${this.esc(rec?.nombre || '—')}</p>
                    <button type="button" id="btn-past-prod-save" class="btn btn-primary" data-id="${this.esc(p.id)}">Guardar comentarios</button>
                </div>`);
        }
        if (section === 'recetario') {
            const pr = d.presetsReceta || { tipoMasa: [], relleno: [], cobertura: [] };
            const list = (d.recetas || []).map(r => `<div class="row-item">${this.esc(r.nombre)} <button type="button" class="btn-sm btn-del-past-rec" data-id="${this.esc(r.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin recetas.</p>';
            return this.wrap('pasteleria', 'Recetario', bc, `
                <div class="card"><h2>Alta rápida</h2>
                    <div class="form-row"><input type="text" id="past-rec-nombre" placeholder="Nombre receta" aria-label="Nombre"/></div>
                    <div class="form-row"><label>Tipo masa <select id="past-rec-masa">${(pr.tipoMasa || []).map(x => `<option>${this.esc(x)}</option>`).join('')}</select></label>
                    <label>Relleno <select id="past-rec-rel">${(pr.relleno || []).map(x => `<option>${this.esc(x)}</option>`).join('')}</select></label>
                    <label>Cobertura <select id="past-rec-cob">${(pr.cobertura || []).map(x => `<option>${this.esc(x)}</option>`).join('')}</select></label></div>
                    <textarea id="past-rec-text" class="trabajo-input" rows="4" placeholder="Pasos / notas" aria-label="Texto receta"></textarea>
                    <button type="button" id="btn-past-rec-add" class="btn btn-primary">Guardar receta</button>
                </div>
                <div class="card"><h2>Lista</h2><div>${list}</div></div>`);
        }
        if (section === 'pedidos') {
            const list = (d.historialPedidos || []).slice().reverse().slice(0, 40).map(p => `<div class="row-item">${this.esc(p.fecha)} · ${this.esc(p.cliente)} · ${this.money(parseFloat(p.monto) || 0)} · ${this.esc(p.detalle || '')} <button type="button" class="btn-sm btn-del-past-ped" data-id="${this.esc(p.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin pedidos.</p>';
            return this.wrap('pasteleria', 'Historial de pedidos', bc, `
                <div class="card"><h2>Nuevo pedido</h2><div class="form-row">
                    <input type="date" id="past-ped-f" value="${hoy}" aria-label="Fecha"/>
                    <input type="text" id="past-ped-cli" placeholder="Cliente" aria-label="Cliente"/>
                    <input type="number" id="past-ped-monto" placeholder="Monto" step="0.01" aria-label="Monto"/>
                    <input type="text" id="past-ped-det" placeholder="Detalle" aria-label="Detalle"/>
                    <button type="button" id="btn-past-ped-add" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Historial</h2><div id="past-ped-list">${list}</div></div>`);
        }
        return this.wrap('pasteleria', 'Pastelería', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindPasteleria(section, subId) {
        const slug = 'pasteleria';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        if (section === 'entregas') {
            document.getElementById('btn-past-ent-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.entregas) d.entregas = [];
                d.entregas.push({ id: Date.now().toString(), fecha: document.getElementById('past-ent-fecha').value, cliente: document.getElementById('past-ent-cli').value.trim(), producto: document.getElementById('past-ent-prod').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-past-ent').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.entregas = (d.entregas || []).filter(e => e.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'precios') {
            document.getElementById('btn-past-calc-save')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.calculadora = {
                    costosFijos: document.getElementById('past-cf').value,
                    costosVariables: document.getElementById('past-cv').value,
                    indirectos: document.getElementById('past-ind').value,
                    unidadesLote: document.getElementById('past-u').value,
                    margenPct: document.getElementById('past-marg').value
                };
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        }
        if (section === 'tarifas') {
            document.getElementById('btn-past-tar-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('past-tar-nombre').value.trim();
                if (!nombre) return;
                if (!d.tarifas) d.tarifas = [];
                d.tarifas.push({ id: Date.now().toString(), nombre, precio: document.getElementById('past-tar-precio').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-past-tar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.tarifas = (d.tarifas || []).filter(t => t.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'productos' && !subId) {
            document.getElementById('btn-past-prod-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('past-prod-nombre').value.trim();
                if (!nombre) return;
                if (!d.productos) d.productos = [];
                const rid = document.getElementById('past-prod-rec').value;
                d.productos.push({ id: Date.now().toString(), nombre, imagenUrl: document.getElementById('past-prod-img').value.trim(), recetaId: rid || null, comentarios: '' });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-past-prod').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.productos = (d.productos || []).filter(p => p.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'producto' && subId) {
            document.getElementById('btn-past-prod-save')?.addEventListener('click', e => {
                const d = TrabajoStorage.getPerfilData(slug);
                const p = (d.productos || []).find(x => x.id === e.currentTarget.dataset.id);
                if (p) p.comentarios = document.getElementById('past-prod-com').value;
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        }
        if (section === 'recetario') {
            document.getElementById('btn-past-rec-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('past-rec-nombre').value.trim();
                if (!nombre) return;
                if (!d.recetas) d.recetas = [];
                d.recetas.push({
                    id: Date.now().toString(),
                    nombre,
                    tipoMasa: document.getElementById('past-rec-masa').value,
                    relleno: document.getElementById('past-rec-rel').value,
                    cobertura: document.getElementById('past-rec-cob').value,
                    texto: document.getElementById('past-rec-text').value.trim()
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-past-rec').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.recetas = (d.recetas || []).filter(r => r.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'pedidos') {
            document.getElementById('btn-past-ped-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.historialPedidos) d.historialPedidos = [];
                d.historialPedidos.push({ id: Date.now().toString(), fecha: document.getElementById('past-ped-f').value, cliente: document.getElementById('past-ped-cli').value.trim(), monto: document.getElementById('past-ped-monto').value, detalle: document.getElementById('past-ped-det').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-past-ped').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.historialPedidos = (d.historialPedidos || []).filter(p => p.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
    },

    renderCabanas(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('cabanas');
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Cabañas</span>`;

        if (section === 'inicio') {
            return this.wrap('cabanas', 'Arriendo de cabañas', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('cabanas', 'reservas')}" class="trabajo-quick-btn">📅 Reservas</a>
                    <a href="${this.linkPerfil('cabanas', 'clientes')}" class="trabajo-quick-btn">👥 Clientes</a>
                    <a href="${this.linkPerfil('cabanas', 'evaluaciones')}" class="trabajo-quick-btn">⭐ Evaluaciones</a>
                    <a href="${this.linkPerfil('cabanas', 'finanzas')}" class="trabajo-quick-btn">💰 Finanzas</a>
                </div>`);
        }
        if (section === 'clientes') {
            const list = (d.clientes || []).map(c => `<div class="row-item">${this.esc(c.nombre)} ${this.esc(c.telefono || '')} <button type="button" class="btn-sm btn-del-cab-cli" data-id="${this.esc(c.id)}" aria-label="Eliminar">✕</button></div>`).join('') || this.emptyCta('Primer cliente.', 'Crear', this.linkPerfil('cabanas', 'clientes'));
            return this.wrap('cabanas', 'Clientes', bc, `
                <div class="card"><div class="form-row">
                    <input type="text" id="cab-cli-nom" placeholder="Nombre" aria-label="Nombre"/>
                    <input type="text" id="cab-cli-tel" placeholder="Teléfono" aria-label="Teléfono"/>
                    <button type="button" id="btn-cab-cli-add" class="btn btn-primary">Añadir</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div id="cab-cli-list">${list}</div></div>`);
        }
        if (section === 'reservas') {
            const clis = d.clientes || [];
            const opts = clis.map(c => `<option value="${this.esc(c.id)}">${this.esc(c.nombre)}</option>`).join('');
            const list = (d.reservas || []).map(r => {
                const cl = clis.find(c => c.id === r.clienteId);
                return `<div class="row-item">${this.esc(r.desde)} → ${this.esc(r.hasta)} · ${this.esc(cl?.nombre || '')} · ${this.esc(r.estado || '')} <button type="button" class="btn-sm btn-del-cab-res" data-id="${this.esc(r.id)}" aria-label="Eliminar">✕</button></div>`;
            }).join('') || '<p class="muted">Sin reservas.</p>';
            return this.wrap('cabanas', 'Reservas / ocupación', bc, `
                <div class="card"><h2>Nueva reserva</h2><div class="form-row">
                    <select id="cab-res-cli" aria-label="Cliente">${opts || '<option value="">— Cliente —</option>'}</select>
                    <input type="date" id="cab-res-ini" value="${hoy}" aria-label="Desde"/>
                    <input type="date" id="cab-res-fin" value="${hoy}" aria-label="Hasta"/>
                    <select id="cab-res-est" aria-label="Estado"><option>confirmada</option><option>opción</option><option>cancelada</option></select>
                    <button type="button" id="btn-cab-res-add" class="btn btn-primary">Guardar</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div>${list}</div></div>`);
        }
        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('cabanas', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('cabanas', d, iso),
                footNote: 'Número en cada día: tareas de agenda + reservas activas que cubren el día.'
            });
            const agCab = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasCabDia = (agCab.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAgendaCab = tareasCabDia.length ? tareasCabDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const res = (d.reservas || []).filter(r => r.estado !== 'cancelada').sort((a, b) => a.desde.localeCompare(b.desde));
            const delDia = res.filter(r => {
                const a = (r.desde || '').slice(0, 10);
                const b = (r.hasta || r.desde || '').slice(0, 10);
                return selInMonth >= a && selInMonth <= b;
            });
            const listDia = delDia.length ? delDia.map(r => `<div class="row-item">${this.esc(r.desde)} – ${this.esc(r.hasta)} · ${this.esc((d.clientes || []).find(c => c.id === r.clienteId)?.nombre || '')}</div>`).join('') : '<p class="muted">Sin ocupación este día.</p>';
            const list = res.length ? res.map(r => `<div class="row-item">${this.esc(r.desde)} – ${this.esc(r.hasta)} · ${this.esc((d.clientes || []).find(c => c.id === r.clienteId)?.nombre || '')}</div>`).join('') : '<p class="muted">Sin reservas activas.</p>';
            return this.wrap('cabanas', 'Calendario', bc, `
                <p class="muted">Vista unificada: <strong>agenda</strong> y <strong>reservas</strong> (detalle en <a href="${this.linkPerfil('cabanas', 'reservas')}">Reservas</a>). El número en la grilla suma ambos.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAgendaCab}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Reservas</h3><div>${listDia}</div></div>
                <div class="card"><h2>Reservas activas</h2><div>${list}</div></div>`);
        }
        if (section === 'evaluaciones') {
            const reservas = d.reservas || [];
            const ro = reservas.map(r => `<option value="${this.esc(r.id)}">${this.esc(r.desde)} ${this.esc((d.clientes || []).find(c => c.id === r.clienteId)?.nombre || '')}</option>`).join('');
            const list = (d.evaluacionesRetiro || []).map(e => `<div class="row-item">${this.esc(e.comentarios || '').slice(0, 80)}… ${(e.fotos || []).length} foto(s) <button type="button" class="btn-sm btn-del-cab-ev" data-id="${this.esc(e.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin evaluaciones.</p>';
            return this.wrap('cabanas', 'Evaluación al retiro', bc, `
                <div class="card"><p class="muted">Fotos: URL separadas por coma o una imagen en base64 (uso moderado; localStorage tiene límite).</p>
                    <div class="form-row">
                        <select id="cab-ev-res" aria-label="Reserva">${ro || '<option value="">—</option>'}</select>
                        <textarea id="cab-ev-com" class="trabajo-input" placeholder="Comentarios" aria-label="Comentarios"></textarea>
                        <input type="text" id="cab-ev-fotos" placeholder="URLs foto (coma)" aria-label="Fotos"/>
                        <button type="button" id="btn-cab-ev-add" class="btn btn-primary">Guardar</button>
                    </div>
                </div>
                <div class="card"><h2>Lista</h2><div>${list}</div></div>`);
        }
        if (section === 'finanzas') {
            const fin = d.finanzas || { ingresos: [], gastos: [] };
            const mov = [...(fin.ingresos || []).map(i => ({ ...i, tipo: 'ingreso' })), ...(fin.gastos || []).map(g => ({ ...g, tipo: 'gasto' }))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 40);
            return this.wrap('cabanas', 'Finanzas', bc, `
                <div class="card"><h2>Ingreso</h2><div class="form-row">
                    <input type="number" id="cab-fin-ing-m" step="0.01" placeholder="Monto" aria-label="Monto"/>
                    <input type="text" id="cab-fin-ing-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="cab-fin-ing-f" value="${hoy}" aria-label="Fecha"/>
                    <button type="button" id="btn-cab-fin-ing" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Gasto</h2><div class="form-row">
                    <input type="number" id="cab-fin-gas-m" step="0.01" placeholder="Monto" aria-label="Monto"/>
                    <input type="text" id="cab-fin-gas-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="cab-fin-gas-f" value="${hoy}" aria-label="Fecha"/>
                    <button type="button" id="btn-cab-fin-gas" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Movimientos</h2><div id="cab-fin-list">${mov.map(m => `<div class="row-item">${this.esc(m.fecha)} ${m.tipo === 'ingreso' ? '+' : '-'} ${this.money(parseFloat(m.monto) || 0)} ${this.esc(m.concepto || '')} <button type="button" class="btn-del-cab-fin" data-tipo="${m.tipo}" data-id="${this.esc(m.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Vacío.</p>'}</div></div>`);
        }
        if (section === 'unidades') {
            const units = d.unidades || [];
            const rows = units.map(u => `<div class="row-item"><strong>${this.esc(u.nombre)}</strong>${u.notas ? `<span class="muted"> · ${this.esc(u.notas)}</span>` : ''}</div>`).join('') || '<p class="muted">Sin unidades.</p>';
            return this.wrap('cabanas', 'Unidades', bc, `
                <p class="muted text-sm">Espacios de arriendo registrados en el perfil. Reservas en <a href="${this.linkPerfil('cabanas', 'reservas')}">Reservas</a>.</p>
                <div class="card"><h2>Listado</h2><div>${rows}</div></div>`);
        }
        if (section === 'fotos') {
            return this.wrap('cabanas', 'Fotos', bc, `
                <p class="muted">Para adjuntar imágenes por estancia usa <a href="${this.linkPerfil('cabanas', 'evaluaciones')}">Evaluaciones al retiro</a> (URLs o referencias).</p>
                <div class="card"><h2>Enlace útil</h2><p><a href="${this.linkPerfil('cabanas', 'evaluaciones')}" class="btn btn-primary btn-sm">Ir a evaluaciones</a></p></div>`);
        }

        return this.wrap('cabanas', 'Cabañas', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindCabanas(section) {
        const slug = 'cabanas';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();
        const toast = (m, k) => typeof TrabajoApp !== 'undefined' && TrabajoApp.toast(m, k);

        if (section === 'clientes') {
            document.getElementById('btn-cab-cli-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('cab-cli-nom').value.trim();
                if (!nombre) return;
                if (!d.clientes) d.clientes = [];
                d.clientes.push({ id: Date.now().toString(), nombre, telefono: document.getElementById('cab-cli-tel').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-cab-cli').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.clientes = (d.clientes || []).filter(c => c.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'reservas') {
            document.getElementById('btn-cab-res-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.reservas) d.reservas = [];
                d.reservas.push({ id: Date.now().toString(), clienteId: document.getElementById('cab-res-cli').value, desde: document.getElementById('cab-res-ini').value, hasta: document.getElementById('cab-res-fin').value, estado: document.getElementById('cab-res-est').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-cab-res').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.reservas = (d.reservas || []).filter(r => r.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'evaluaciones') {
            document.getElementById('btn-cab-ev-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const rid = document.getElementById('cab-ev-res').value;
                const com = document.getElementById('cab-ev-com').value.trim();
                if (!rid) return;
                if (!d.evaluacionesRetiro) d.evaluacionesRetiro = [];
                const fotosRaw = document.getElementById('cab-ev-fotos').value.trim();
                const fotos = fotosRaw ? fotosRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
                d.evaluacionesRetiro.push({ id: Date.now().toString(), reservaId: rid, comentarios: com, fotos });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-cab-ev').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.evaluacionesRetiro = (d.evaluacionesRetiro || []).filter(e => e.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'finanzas') {
            document.getElementById('btn-cab-fin-ing')?.addEventListener('click', () => {
                const monto = document.getElementById('cab-fin-ing-m').value;
                const fecha = document.getElementById('cab-fin-ing-f').value;
                const v = typeof DataValidate !== 'undefined'
                    ? DataValidate.validateFinanzaMovimientoIngreso({ monto, fecha })
                    : { ok: true, errors: [] };
                if (!v.ok) {
                    toast((typeof DataValidate !== 'undefined' && DataValidate.firstError(v)) || 'Revisa monto y fecha.', 'error');
                    return;
                }
                const d = TrabajoDataService.getPerfilData(slug);
                if (!d.finanzas) d.finanzas = { ingresos: [], gastos: [] };
                if (!d.finanzas.ingresos) d.finanzas.ingresos = [];
                const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                    ? crypto.randomUUID()
                    : Date.now().toString();
                d.finanzas.ingresos.push({ id, monto, concepto: document.getElementById('cab-fin-ing-d').value.trim(), fecha });
                TrabajoDataService.savePerfilData(slug, d);
                rerender();
            });
            document.getElementById('btn-cab-fin-gas')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas) d.finanzas = { ingresos: [], gastos: [] };
                if (!d.finanzas.gastos) d.finanzas.gastos = [];
                d.finanzas.gastos.push({ id: Date.now().toString(), monto: document.getElementById('cab-fin-gas-m').value, concepto: document.getElementById('cab-fin-gas-d').value.trim(), fecha: document.getElementById('cab-fin-gas-f').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-cab-fin').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const key = btn.dataset.tipo === 'ingreso' ? 'ingresos' : 'gastos';
                    d.finanzas[key] = (d.finanzas[key] || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
    },

    renderLaboratorio(section, subId, subId2) {
        const d = TrabajoStorage.getPerfilData('laboratorio');
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Laboratorio</span>`;

        if (section === 'inicio') {
            return this.wrap('laboratorio', 'Laboratorio / balanzas', bc, `
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil('laboratorio', 'equipos')}" class="trabajo-quick-btn">🔧 Equipos</a>
                    <a href="${this.linkPerfil('laboratorio', 'visitas')}" class="trabajo-quick-btn">📋 Visitas</a>
                    <a href="${this.linkPerfil('laboratorio', 'finanzas')}" class="trabajo-quick-btn">💰 Finanzas</a>
                </div>
                <div class="trabajo-dash-cards">
                    <div class="card trabajo-dash-card"><h3>Equipos</h3><p class="trabajo-dash-value">${(d.equipos || []).length}</p></div>
                    <div class="card trabajo-dash-card"><h3>Visitas</h3><p class="trabajo-dash-value">${(d.visitas || []).length}</p></div>
                </div>`);
        }
        if (section === 'equipos') {
            const list = (d.equipos || []).map(e => `<div class="row-item">${this.esc(e.nombre)} · ${this.esc(e.tipo || '')} · ${this.esc(e.notas || '')} <button type="button" class="btn-sm btn-del-lab-eq" data-id="${this.esc(e.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin equipos.</p>';
            return this.wrap('laboratorio', 'Máquinas / equipos', bc, `
                <div class="card"><h2>Nuevo equipo</h2><div class="form-row">
                    <input type="text" id="lab-eq-nom" placeholder="Nombre / serie" aria-label="Nombre"/>
                    <select id="lab-eq-tipo" aria-label="Tipo"><option>industrial</option><option>milimétrica</option><option>otro</option></select>
                    <input type="text" id="lab-eq-notas" placeholder="Metadatos / modelo" aria-label="Notas"/>
                    <button type="button" id="btn-lab-eq-add" class="btn btn-primary">Añadir</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div id="lab-eq-list">${list}</div></div>`);
        }
        if (section === 'visitas') {
            const eqs = d.equipos || [];
            const opts = eqs.map(e => `<option value="${this.esc(e.id)}">${this.esc(e.nombre)}</option>`).join('');
            const list = (d.visitas || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(v => {
                const eq = eqs.find(e => e.id === v.equipoId);
                return `<div class="row-item">${this.esc(v.fecha)} · ${this.esc(eq?.nombre || '')} · ${this.money(parseFloat(v.monto) || 0)} <button type="button" class="btn-sm btn-del-lab-vis" data-id="${this.esc(v.id)}" aria-label="Eliminar">✕</button></div>`;
            }).join('') || '<p class="muted">Sin visitas.</p>';
            return this.wrap('laboratorio', 'Visitas técnicas', bc, `
                <div class="card"><h2>Nueva visita</h2><div class="form-row">
                    <select id="lab-vis-eq" aria-label="Equipo">${opts || '<option value="">— Cree equipo —</option>'}</select>
                    <input type="date" id="lab-vis-fecha" value="${hoy}" aria-label="Fecha"/>
                    <input type="text" id="lab-vis-anal" placeholder="Análisis / hallazgos" aria-label="Análisis"/>
                    <input type="number" id="lab-vis-monto" placeholder="Monto cobrado (opcional)" step="0.01" aria-label="Monto"/>
                    <button type="button" id="btn-lab-vis-add" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div>${list}</div></div>`);
        }
        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock('laboratorio', 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia('laboratorio', d, iso),
                footNote: 'Número en cada día: tareas de agenda + visitas técnicas.'
            });
            const agLab = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasLabDia = (agLab.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAgendaLab = tareasLabDia.length ? tareasLabDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const visAll = (d.visitas || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
            const visDia = visAll.filter(v => (v.fecha || '').slice(0, 10) === selInMonth);
            const listDia = visDia.length ? visDia.map(v => `<div class="row-item">${this.esc((d.equipos || []).find(e => e.id === v.equipoId)?.nombre || '')} · ${this.money(parseFloat(v.monto) || 0)}</div>`).join('') : '<p class="muted">Sin visitas este día.</p>';
            const visFut = (d.visitas || []).filter(v => v.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
            const listFut = visFut.length ? visFut.map(v => `<div class="row-item">${this.esc(v.fecha)} · ${this.esc((d.equipos || []).find(e => e.id === v.equipoId)?.nombre || '')}</div>`).join('') : '<p class="muted">Sin visitas futuras.</p>';
            const listAll = visAll.length ? visAll.map(v => `<div class="row-item">${this.esc(v.fecha)} · ${this.esc((d.equipos || []).find(e => e.id === v.equipoId)?.nombre || '')}</div>`).join('') : '<p class="muted">Sin visitas.</p>';
            return this.wrap('laboratorio', 'Calendario mantenciones', bc, `
                <p class="muted">Visitas programadas. La <a href="${this.linkPerfil('laboratorio', 'agenda')}">Agenda</a> es para tareas puntuales.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAgendaLab}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Visitas</h3><div>${listDia}</div></div>
                <div class="card"><h2>Próximas visitas</h2><div>${listFut}</div></div>
                <div class="card"><h2>Todas las visitas</h2><div>${listAll}</div></div>`);
        }
        if (section === 'finanzas') {
            const fin = d.finanzas || { ingresos: [], gastos: [] };
            const byVis = (d.visitas || []).reduce((s, v) => s + (parseFloat(v.monto) || 0), 0);
            const mov = [...(fin.ingresos || []).map(i => ({ ...i, tipo: 'ingreso' })), ...(fin.gastos || []).map(g => ({ ...g, tipo: 'gasto' }))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 40);
            return this.wrap('laboratorio', 'Finanzas', bc, `
                <div class="card"><p class="muted">Suma cobrada en visitas (campo monto): <strong>${this.money(byVis)}</strong></p></div>
                <div class="card"><h2>Ingreso global</h2><div class="form-row">
                    <input type="number" id="lab-fin-ing-m" step="0.01" placeholder="Monto" aria-label="Monto"/>
                    <input type="text" id="lab-fin-ing-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="lab-fin-ing-f" value="${hoy}" aria-label="Fecha"/>
                    <button type="button" id="btn-lab-fin-ing" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Gasto</h2><div class="form-row">
                    <input type="number" id="lab-fin-gas-m" step="0.01" placeholder="Monto" aria-label="Monto"/>
                    <input type="text" id="lab-fin-gas-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="lab-fin-gas-f" value="${hoy}" aria-label="Fecha"/>
                    <button type="button" id="btn-lab-fin-gas" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Movimientos</h2><div>${mov.map(m => `<div class="row-item">${this.esc(m.fecha)} ${m.tipo === 'ingreso' ? '+' : '-'} ${this.money(parseFloat(m.monto) || 0)} ${this.esc(m.concepto || '')} <button type="button" class="btn-del-lab-fin" data-tipo="${m.tipo}" data-id="${this.esc(m.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Vacío.</p>'}</div></div>`);
        }
        return this.wrap('laboratorio', 'Laboratorio', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindLaboratorio(section) {
        const slug = 'laboratorio';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();

        if (section === 'equipos') {
            document.getElementById('btn-lab-eq-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('lab-eq-nom').value.trim();
                if (!nombre) return;
                if (!d.equipos) d.equipos = [];
                d.equipos.push({ id: Date.now().toString(), nombre, tipo: document.getElementById('lab-eq-tipo').value, notas: document.getElementById('lab-eq-notas').value.trim() });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-lab-eq').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.equipos = (d.equipos || []).filter(e => e.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'visitas') {
            document.getElementById('btn-lab-vis-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const eid = document.getElementById('lab-vis-eq').value;
                if (!eid) return;
                if (!d.visitas) d.visitas = [];
                d.visitas.push({
                    id: Date.now().toString(),
                    equipoId: eid,
                    fecha: document.getElementById('lab-vis-fecha').value,
                    analisis: document.getElementById('lab-vis-anal').value.trim(),
                    monto: document.getElementById('lab-vis-monto').value
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-lab-vis').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.visitas = (d.visitas || []).filter(v => v.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'finanzas') {
            document.getElementById('btn-lab-fin-ing')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas) d.finanzas = { ingresos: [], gastos: [] };
                if (!d.finanzas.ingresos) d.finanzas.ingresos = [];
                d.finanzas.ingresos.push({ id: Date.now().toString(), monto: document.getElementById('lab-fin-ing-m').value, concepto: document.getElementById('lab-fin-ing-d').value.trim(), fecha: document.getElementById('lab-fin-ing-f').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.getElementById('btn-lab-fin-gas')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas) d.finanzas = { ingresos: [], gastos: [] };
                if (!d.finanzas.gastos) d.finanzas.gastos = [];
                d.finanzas.gastos.push({ id: Date.now().toString(), monto: document.getElementById('lab-fin-gas-m').value, concepto: document.getElementById('lab-fin-gas-d').value.trim(), fecha: document.getElementById('lab-fin-gas-f').value });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-lab-fin').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const key = btn.dataset.tipo === 'ingreso' ? 'ingresos' : 'gastos';
                    d.finanzas[key] = (d.finanzas[key] || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
    },

    renderSalud(section, subId, subId2) {
        const slug = 'salud';
        const d = TrabajoStorage.getPerfilData(slug);
        const hoy = new Date().toISOString().slice(0, 10);
        const bc = `<a href="#perfil">Perfiles</a> <span aria-hidden="true">/</span> <span>Consulta independiente</span>`;
        const pacMap = Object.fromEntries((d.pacientes || []).map(p => [p.id, p.nombre || '']));
        const optsPac = (d.pacientes || []).map(p => `<option value="${this.esc(p.id)}">${this.esc(p.nombre)}</option>`).join('');
        const catOpts = (d.finanzas?.categoriasGasto || ['Sin categoría']).map(c => `<option>${this.esc(c)}</option>`).join('');

        const pacRows = (d.pacientes || []).map(p => {
            const hay = [p.nombre, p.contacto, p.email, p.notas, p.etiquetas].map(x => String(x || '').toLowerCase()).join(' ');
            return `<div class="row-item salud-pac-row" data-salud-search="${this.esc(hay)}">
                <strong>${this.esc(p.nombre)}</strong> · ${this.esc(p.contacto || '')} · ${this.esc(p.email || '')}
                <span class="muted text-sm">${this.esc(p.etiquetas || '')}</span>
                <button type="button" class="btn-sm btn-del-salud-pac" data-id="${this.esc(p.id)}" aria-label="Eliminar">✕</button></div>`;
        }).join('') || '<p class="muted">Sin pacientes.</p>';

        const sesRows = (d.sesiones || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (a.hora || '').localeCompare(b.hora || ''))
            .map(s => `<div class="row-item">${this.esc(s.fecha)} ${this.esc(s.hora || '')} · ${this.esc(pacMap[s.pacienteId] || '?')} · ${this.esc(s.tipo || '')} · <em>${this.esc(s.estado || '')}</em>
                <button type="button" class="btn-sm btn-del-salud-ses" data-id="${this.esc(s.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin sesiones.</p>';

        const planRows = (d.planes || []).slice().sort((a, b) => (b.id || '').localeCompare(a.id || ''))
            .map(pl => `<div class="row-item"><strong>${this.esc(pl.titulo || '')}</strong> · ${this.esc(pacMap[pl.pacienteId] || '?')}
                <div class="muted text-sm">${this.esc((pl.contenido || '').slice(0, 120))}${(pl.contenido || '').length > 120 ? '…' : ''}</div>
                <button type="button" class="btn-sm btn-del-salud-plan" data-id="${this.esc(pl.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Sin planes.</p>';

        if (section === 'inicio') {
            return this.wrap(slug, 'Consulta independiente', bc, `
                <p class="muted text-sm">Esta sección es para organización personal. No constituye historia clínica certificada ni cumplimiento legal sanitario.</p>
                <div class="trabajo-inicio-actions">
                    <a href="${this.linkPerfil(slug, 'pacientes')}" class="trabajo-quick-btn">👥 Pacientes</a>
                    <a href="${this.linkPerfil(slug, 'sesiones')}" class="trabajo-quick-btn">📋 Sesiones</a>
                    <a href="${this.linkPerfil(slug, 'planes')}" class="trabajo-quick-btn">📝 Planes</a>
                    <a href="${this.linkPerfil(slug, 'calendario')}" class="trabajo-quick-btn">📆 Calendario</a>
                    <a href="${this.linkPerfil(slug, 'finanzas')}" class="trabajo-quick-btn">💰 Finanzas</a>
                </div>
                <div class="trabajo-dash-cards">
                    <div class="card trabajo-dash-card"><h3>Pacientes</h3><p class="trabajo-dash-value">${(d.pacientes || []).length}</p></div>
                    <div class="card trabajo-dash-card"><h3>Sesiones</h3><p class="trabajo-dash-value">${(d.sesiones || []).length}</p></div>
                    <div class="card trabajo-dash-card"><h3>Planes</h3><p class="trabajo-dash-value">${(d.planes || []).length}</p></div>
                </div>`);
        }
        if (section === 'pacientes') {
            return this.wrap(slug, 'Pacientes / clientes', bc, `
                <div class="card"><h2>Buscar</h2><input type="search" id="salud-pac-q" class="trabajo-input-inline" placeholder="Nombre, contacto, notas, etiquetas…" aria-label="Buscar pacientes"/></div>
                <div class="card"><h2>Nuevo paciente</h2><div class="form-row">
                    <input type="text" id="salud-pac-nom" placeholder="Nombre" aria-label="Nombre"/>
                    <input type="text" id="salud-pac-tel" placeholder="Teléfono / contacto" aria-label="Contacto"/>
                    <input type="email" id="salud-pac-mail" placeholder="Email" aria-label="Email"/>
                    <input type="text" id="salud-pac-etiq" placeholder="Etiquetas (texto libre)" aria-label="Etiquetas"/>
                    <input type="text" id="salud-pac-notas" placeholder="Notas breves" aria-label="Notas"/>
                    <button type="button" id="btn-salud-pac-add" class="btn btn-primary">Añadir</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div id="salud-pac-list">${pacRows}</div></div>`);
        }
        if (section === 'sesiones') {
            return this.wrap(slug, 'Sesiones / consultas', bc, `
                <div class="card"><h2>Nueva sesión</h2><div class="form-row form-row--wrap">
                    <select id="salud-ses-pac" aria-label="Paciente">${optsPac || '<option value="">— Cree un paciente —</option>'}</select>
                    <input type="date" id="salud-ses-fecha" value="${hoy}" aria-label="Fecha"/>
                    <input type="time" id="salud-ses-hora" aria-label="Hora"/>
                    <input type="number" id="salud-ses-dur" min="1" step="5" placeholder="Duración (min)" aria-label="Duración minutos"/>
                    <input type="text" id="salud-ses-tipo" placeholder="Tipo (consulta, control…)" aria-label="Tipo"/>
                    <select id="salud-ses-estado" aria-label="Estado">
                        <option value="programada">Programada</option>
                        <option value="realizada">Realizada</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                    <input type="number" id="salud-ses-monto" step="0.01" placeholder="Monto (opcional)" aria-label="Monto"/>
                    <input type="text" id="salud-ses-notas" placeholder="Notas" aria-label="Notas"/>
                    <button type="button" id="btn-salud-ses-add" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Lista</h2><div>${sesRows}</div></div>`);
        }
        if (section === 'planes') {
            return this.wrap(slug, 'Planes / documentación', bc, `
                <div class="card"><h2>Nuevo plan</h2><div class="form-row form-row--wrap">
                    <select id="salud-plan-pac" aria-label="Paciente">${optsPac || '<option value="">— Cree un paciente —</option>'}</select>
                    <input type="text" id="salud-plan-tit" placeholder="Título" aria-label="Título"/>
                    <input type="date" id="salud-plan-fi" aria-label="Desde"/>
                    <input type="date" id="salud-plan-ff" aria-label="Hasta"/>
                    <textarea id="salud-plan-cont" rows="3" placeholder="Contenido (texto libre)" aria-label="Contenido"></textarea>
                    <button type="button" id="btn-salud-plan-add" class="btn btn-primary">Guardar plan</button>
                </div></div>
                <div class="card"><h2>Planes</h2><div>${planRows}</div></div>`);
        }
        if (section === 'calendario') {
            const { html, selInMonth } = this._renderCalendarioMensualBlock(slug, 'calendario', subId, subId2, {
                countForIso: iso => this._countPerfilCalendarioVistaDia(slug, d, iso),
                footNote: 'Número en cada día: tareas de agenda + consultas (no canceladas).'
            });
            const agSal = TrabajoStorage.ensurePerfilAgenda(d);
            const tareasDia = (agSal.tareasAgenda || []).filter(t => (t.fecha || '').slice(0, 10) === selInMonth)
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listAgenda = tareasDia.length ? tareasDia.map(t => `<div class="row-item">${t.hecho ? '✓' : '○'} ${this.esc(t.titulo)} · ${this.esc(t.hora || '—')}</div>`).join('') : '<p class="muted">Sin tareas de agenda este día.</p>';
            const sesDia = (d.sesiones || []).filter(s => (s.fecha || '').slice(0, 10) === selInMonth && s.estado !== 'cancelada')
                .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
            const listSes = sesDia.length ? sesDia.map(s => `<div class="row-item">${this.esc(s.hora || '—')} · ${this.esc(pacMap[s.pacienteId] || '')} · ${this.esc(s.tipo || '')} · ${this.esc(s.estado || '')}</div>`).join('') : '<p class="muted">Sin consultas este día.</p>';
            const sesFut = (d.sesiones || []).filter(s => s.estado !== 'cancelada' && s.estado !== 'realizada' && (s.fecha || '') >= hoy)
                .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || ''));
            const listFut = sesFut.length ? sesFut.map(s => `<div class="row-item">${this.esc(s.fecha)} ${this.esc(s.hora || '')} · ${this.esc(pacMap[s.pacienteId] || '')}</div>`).join('') : '<p class="muted">Sin próximas programadas.</p>';
            return this.wrap(slug, 'Calendario', bc, `
                <p class="muted">Consultas y <a href="${this.linkPerfil(slug, 'agenda')}">Agenda</a> de tareas.</p>
                ${html}
                <div class="card"><h2>${this.esc(selInMonth)}</h2>
                    <h3 class="text-sm" style="margin:0 0 0.35rem;">Agenda</h3><div>${listAgenda}</div>
                    <h3 class="text-sm" style="margin:1rem 0 0.35rem;">Consultas</h3><div>${listSes}</div></div>
                <div class="card"><h2>Próximas consultas</h2><div>${listFut}</div></div>`);
        }
        if (section === 'finanzas') {
            const fin = d.finanzas || { ingresos: [], gastos: [] };
            const bySes = (d.sesiones || []).reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
            const mov = [...(fin.ingresos || []).map(i => ({ ...i, tipo: 'ingreso' })), ...(fin.gastos || []).map(g => ({ ...g, tipo: 'gasto' }))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 40);
            return this.wrap(slug, 'Finanzas', bc, `
                <div class="card"><p class="muted">Suma en campo monto de sesiones: <strong>${this.money(bySes)}</strong></p></div>
                <div class="card"><h2>Ingreso</h2><div class="form-row">
                    <input type="number" id="salud-fin-ing-m" step="0.01" placeholder="Monto" aria-label="Monto"/>
                    <input type="text" id="salud-fin-ing-d" placeholder="Concepto" aria-label="Concepto"/>
                    <input type="date" id="salud-fin-ing-f" value="${hoy}" aria-label="Fecha"/>
                    <button type="button" id="btn-salud-fin-ing" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Gasto</h2><div class="form-row">
                    <input type="number" id="salud-fin-gas-m" step="0.01" placeholder="Monto" aria-label="Monto"/>
                    <input type="text" id="salud-fin-gas-d" placeholder="Concepto" aria-label="Concepto"/>
                    <select id="salud-fin-gas-cat" aria-label="Categoría">${catOpts}</select>
                    <input type="date" id="salud-fin-gas-f" value="${hoy}" aria-label="Fecha"/>
                    <button type="button" id="btn-salud-fin-gas" class="btn btn-primary">Registrar</button>
                </div></div>
                <div class="card"><h2>Movimientos</h2><div>${mov.map(m => `<div class="row-item">${this.esc(m.fecha)} ${m.tipo === 'ingreso' ? '+' : '-'} ${this.money(parseFloat(m.monto) || 0)} ${this.esc(m.concepto || '')} <button type="button" class="btn-del-salud-fin" data-tipo="${m.tipo}" data-id="${this.esc(m.id)}" aria-label="Eliminar">✕</button></div>`).join('') || '<p class="muted">Vacío.</p>'}</div></div>`);
        }
        return this.wrap(slug, 'Consulta independiente', bc, '<p class="muted">Sección no encontrada.</p>');
    },

    bindSalud(section) {
        const slug = 'salud';
        const rerender = () => typeof TrabajoApp !== 'undefined' && TrabajoApp.render();
        const newId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : Date.now().toString() + Math.random().toString(36).slice(2, 8);

        if (section === 'pacientes') {
            const filterPac = () => {
                const q = (document.getElementById('salud-pac-q')?.value || '').trim().toLowerCase();
                document.querySelectorAll('.salud-pac-row').forEach(el => {
                    const hay = (el.dataset.saludSearch || '').toLowerCase();
                    el.style.display = !q || hay.includes(q) ? '' : 'none';
                });
            };
            document.getElementById('salud-pac-q')?.addEventListener('input', filterPac);
            document.getElementById('btn-salud-pac-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const nombre = document.getElementById('salud-pac-nom').value.trim();
                if (!nombre) return;
                if (!d.pacientes) d.pacientes = [];
                d.pacientes.push({
                    id: newId(),
                    nombre,
                    contacto: document.getElementById('salud-pac-tel').value.trim(),
                    email: document.getElementById('salud-pac-mail').value.trim(),
                    etiquetas: document.getElementById('salud-pac-etiq').value.trim(),
                    notas: document.getElementById('salud-pac-notas').value.trim()
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-salud-pac').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const pid = btn.dataset.id;
                    const sesToDelete = (d.sesiones || []).filter(s => s && s.pacienteId === pid).map(s => s.id);
                    d.pacientes = (d.pacientes || []).filter(p => p.id !== pid);
                    d.sesiones = (d.sesiones || []).filter(s => s.pacienteId !== pid);
                    d.planes = (d.planes || []).filter(pl => pl.pacienteId !== pid);
                    const ag = TrabajoStorage.ensurePerfilAgenda(d);
                    ag.tareasAgenda = (ag.tareasAgenda || []).filter(t => !sesToDelete.includes(t.refSesionId));
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'sesiones') {
            document.getElementById('btn-salud-ses-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const pacienteId = document.getElementById('salud-ses-pac').value;
                if (!pacienteId) return;
                if (!d.sesiones) d.sesiones = [];
                const durRaw = document.getElementById('salud-ses-dur').value;
                const sesId = newId();
                const ses = {
                    id: sesId,
                    pacienteId,
                    fecha: document.getElementById('salud-ses-fecha').value,
                    hora: document.getElementById('salud-ses-hora').value,
                    duracionMin: durRaw === '' ? null : parseInt(durRaw, 10),
                    tipo: document.getElementById('salud-ses-tipo').value.trim(),
                    notas: document.getElementById('salud-ses-notas').value.trim(),
                    estado: document.getElementById('salud-ses-estado').value,
                    monto: document.getElementById('salud-ses-monto').value
                };
                d.sesiones.push(ses);

                // Alimenta agenda del perfil (fuente unificada para Calendario + bridge Persona).
                if (ses.estado !== 'cancelada') {
                    const pac = (d.pacientes || []).find(p => p.id === pacienteId);
                    const titulo = `Consulta · ${(pac && pac.nombre) ? pac.nombre : 'Paciente'}`;
                    const ag = TrabajoStorage.ensurePerfilAgenda(d);
                    ag.tareasAgenda.push(TrabajoStorage.normalizeAgendaTarea({
                        titulo,
                        fecha: ses.fecha,
                        hora: ses.hora || '',
                        prioridad: 'media',
                        descripcion: ses.tipo ? `Tipo: ${ses.tipo}` : '',
                        etiqueta: 'salud',
                        enlaceSeccion: `#${slug}/sesiones`,
                        esPrioridadDelDia: false,
                        hecha: ses.estado === 'realizada',
                        origen: 'manual',
                        soloLectura: true,
                        refSesionId: sesId
                    }));
                }
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-salud-ses').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const sid = btn.dataset.id;
                    d.sesiones = (d.sesiones || []).filter(s => s.id !== sid);
                    const ag = TrabajoStorage.ensurePerfilAgenda(d);
                    ag.tareasAgenda = (ag.tareasAgenda || []).filter(t => t.refSesionId !== sid);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'planes') {
            document.getElementById('btn-salud-plan-add')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                const pacienteId = document.getElementById('salud-plan-pac').value;
                const titulo = document.getElementById('salud-plan-tit').value.trim();
                if (!pacienteId || !titulo) return;
                if (!d.planes) d.planes = [];
                d.planes.push({
                    id: newId(),
                    pacienteId,
                    titulo,
                    contenido: document.getElementById('salud-plan-cont').value.trim(),
                    fechaInicio: document.getElementById('salud-plan-fi').value,
                    fechaFin: document.getElementById('salud-plan-ff').value
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-salud-plan').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    d.planes = (d.planes || []).filter(pl => pl.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
        if (section === 'finanzas') {
            document.getElementById('btn-salud-fin-ing')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas) d.finanzas = { ingresos: [], gastos: [], categoriasGasto: [] };
                if (!d.finanzas.ingresos) d.finanzas.ingresos = [];
                d.finanzas.ingresos.push({
                    id: newId(),
                    monto: document.getElementById('salud-fin-ing-m').value,
                    concepto: document.getElementById('salud-fin-ing-d').value.trim(),
                    fecha: document.getElementById('salud-fin-ing-f').value,
                    sesionId: ''
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.getElementById('btn-salud-fin-gas')?.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                if (!d.finanzas) d.finanzas = { ingresos: [], gastos: [], categoriasGasto: [] };
                if (!d.finanzas.gastos) d.finanzas.gastos = [];
                d.finanzas.gastos.push({
                    id: newId(),
                    monto: document.getElementById('salud-fin-gas-m').value,
                    concepto: document.getElementById('salud-fin-gas-d').value.trim(),
                    fecha: document.getElementById('salud-fin-gas-f').value,
                    categoria: document.getElementById('salud-fin-gas-cat').value
                });
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
            document.querySelectorAll('.btn-del-salud-fin').forEach(btn => {
                btn.addEventListener('click', () => {
                    const d = TrabajoStorage.getPerfilData(slug);
                    const key = btn.dataset.tipo === 'ingreso' ? 'ingresos' : 'gastos';
                    d.finanzas[key] = (d.finanzas[key] || []).filter(x => x.id !== btn.dataset.id);
                    TrabajoStorage.savePerfilData(slug, d);
                    rerender();
                });
            });
        }
    }
};
