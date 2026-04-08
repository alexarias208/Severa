/**
 * Educación — salas, actividades con horario, planificación, conflictos de sala, informes.
 * Depende de TrabajoStorage, TrabajoPerfiles (wrap), TrabajoApp (esc opcional).
 */
const TrabajoEducacion = {
    timeToMinutes(t) {
        if (!t || typeof t !== 'string') return 0;
        const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return 0;
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    },

    minutesToTime(mins) {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },

    overlapRanges(a0, a1, b0, b1) {
        return a0 < b1 && b0 < a1;
    },

    mondayISO(isoDate) {
        const d = new Date(isoDate + 'T12:00:00');
        if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        return d.toISOString().slice(0, 10);
    },

    addDaysISO(iso, n) {
        const d = new Date(iso + 'T12:00:00');
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
    },

    collectEventos(d) {
        const salas = Object.fromEntries((d.salas || []).map(s => [s.id, s]));
        const planes = Object.fromEntries((d.planes || []).map(p => [p.id, p]));
        const ev = [];
        (d.cursos || []).forEach(c => {
            (c.sesiones || []).forEach(s => {
                const fecha = (s.fecha || '').slice(0, 10);
                const hi = s.horaInicio || '09:00';
                const hf = s.horaFin || '10:00';
                ev.push({
                    key: `s-${s.id}`,
                    kind: 'sesion',
                    cursoId: c.id,
                    sesionId: s.id,
                    titulo: s.titulo || 'Sesión',
                    fecha,
                    horaInicio: hi,
                    horaFin: hf,
                    salaId: s.salaId || '',
                    planId: s.planId || '',
                    cursoNombre: c.nombre,
                    notas: '',
                    planNombre: s.planId && planes[s.planId] ? planes[s.planId].nombre || '' : ''
                });
            });
        });
        (d.actividades || []).forEach(a => {
            ev.push({
                key: `a-${a.id}`,
                kind: 'actividad',
                titulo: a.titulo || 'Actividad',
                fecha: (a.fecha || '').slice(0, 10),
                horaInicio: a.horaInicio || '09:00',
                horaFin: a.horaFin || '10:00',
                salaId: a.salaId || '',
                planId: a.planId || '',
                cursoNombre: '',
                notas: a.notas || '',
                planNombre: a.planId && planes[a.planId] ? planes[a.planId].nombre || '' : ''
            });
        });
        return ev.map(e => ({
            ...e,
            salaNombre: e.salaId && salas[e.salaId] ? salas[e.salaId].nombre : '',
            t0: this.timeToMinutes(e.horaInicio),
            t1: Math.max(this.timeToMinutes(e.horaFin), this.timeToMinutes(e.horaInicio) + 1)
        }));
    },

    countEventosDia(d, iso) {
        return this.collectEventos(d).filter(e => e.fecha === iso).length;
    },

    conflictKeysForEvent(all, ev) {
        if (!ev.salaId) return [];
        const out = [];
        all.forEach(o => {
            if (o.key === ev.key) return;
            if (o.fecha !== ev.fecha || !o.salaId || o.salaId !== ev.salaId) return;
            if (this.overlapRanges(ev.t0, ev.t1, o.t0, o.t1)) out.push(o.key);
        });
        return out;
    },

    eventsWithConflictFlags(d) {
        const all = this.collectEventos(d);
        const flags = {};
        all.forEach(ev => {
            if (!ev.salaId) return;
            const ck = this.conflictKeysForEvent(all, ev);
            if (ck.length) flags[ev.key] = ck;
        });
        return { all, flags };
    },

    salaOptionsHtml(P, d, selectedId) {
        const opts = (d.salas || []).map(s =>
            `<option value="${P.esc(s.id)}" ${s.id === selectedId ? 'selected' : ''}>${P.esc(s.nombre)}</option>`).join('');
        return `<option value="">— Sin sala —</option>${opts}`;
    },

    planOptionsHtml(P, d, selectedId) {
        const opts = (d.planes || []).map(p =>
            `<option value="${P.esc(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${P.esc(p.nombre || 'Plan')}</option>`).join('');
        return `<option value="">— Ninguno —</option>${opts}`;
    },

    renderCalendarioTabs(P, monthKey, selDay) {
        return `<div class="tabs edu-cal-tabs" style="margin-bottom:1rem;flex-wrap:wrap;">
            <a href="${P.linkPerfil('educacion', 'calendario', monthKey, selDay)}" class="tab-btn active">Mes</a>
            <a href="${P.linkPerfil('educacion', 'calendario', 'semana', TrabajoEducacion.mondayISO(selDay))}" class="tab-btn">Semana</a>
        </div>`;
    },

    renderSemana(P, d, bc, weekMondayIso) {
        const mon = /^\d{4}-\d{2}-\d{2}$/.test(weekMondayIso || '') ? weekMondayIso : this.mondayISO(new Date().toISOString().slice(0, 10));
        const prev = this.addDaysISO(mon, -7);
        const next = this.addDaysISO(mon, 7);
        const dias = [];
        for (let i = 0; i < 7; i++) dias.push(this.addDaysISO(mon, i));
        const { all, flags } = this.eventsWithConflictFlags(d);
        const byDay = {};
        dias.forEach(iso => { byDay[iso] = []; });
        all.filter(e => dias.includes(e.fecha)).forEach(e => {
            byDay[e.fecha].push(e);
        });
        Object.keys(byDay).forEach(iso => {
            byDay[iso].sort((a, b) => a.t0 - b.t0);
        });

        const cells = dias.map(iso => {
            const list = (byDay[iso] || []).map(e => {
                const bad = flags[e.key] && flags[e.key].length;
                const conf = bad ? ` <span class="edu-conflict-badge" title="Solape de sala">⚠</span>` : '';
                const sala = e.salaNombre ? ` · ${P.esc(e.salaNombre)}` : '';
                const curso = e.kind === 'sesion' ? ` <span class="muted">(${P.esc(e.cursoNombre)})</span>` : '';
                const link = e.kind === 'sesion'
                    ? P.linkPerfil('educacion', 'curso', e.cursoId)
                    : P.linkPerfil('educacion', 'actividades');
                return `<div class="edu-week-event ${bad ? 'edu-week-event--conflict' : ''}">
                    <a href="${link}" class="text-sm"><strong>${P.esc(e.horaInicio)}–${P.esc(e.horaFin)}</strong> ${P.esc(e.titulo)}${curso}${conf}</a>
                    <span class="muted text-sm">${sala}</span>
                </div>`;
            }).join('') || '<p class="muted text-sm">Sin eventos</p>';
            const hoy = new Date().toISOString().slice(0, 10) === iso;
            return `<div class="edu-week-col ${hoy ? 'edu-week-col--today' : ''}">
                <div class="edu-week-col-head">${new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div class="edu-week-col-body">${list}</div>
            </div>`;
        }).join('');

        const monthKey = mon.slice(0, 7);
        return P.wrap('educacion', 'Vista semana', bc, `
            <p class="muted text-sm">Eventos de cursos, actividades y uso de sala. <span class="edu-conflict-badge">⚠</span> indica solape en la misma sala.</p>
            <div class="tabs edu-cal-tabs" style="margin-bottom:1rem;flex-wrap:wrap;">
                <a href="${P.linkPerfil('educacion', 'calendario', monthKey)}" class="tab-btn">Mes</a>
                <a href="${P.linkPerfil('educacion', 'calendario', 'semana', mon)}" class="tab-btn active">Semana</a>
            </div>
            <div class="trabajo-cal-nav">
                <a href="${P.linkPerfil('educacion', 'calendario', 'semana', prev)}" class="btn btn-ghost btn-sm">← Semana anterior</a>
                <strong class="trabajo-cal-title">Desde ${P.esc(mon)}</strong>
                <a href="${P.linkPerfil('educacion', 'calendario', 'semana', next)}" class="btn btn-ghost btn-sm">Semana siguiente →</a>
            </div>
            <div class="card edu-week-wrap"><div class="edu-week-grid">${cells}</div></div>`);
    },

    renderSalas(P, d, bc) {
        const rows = (d.salas || []).length
            ? (d.salas || []).map(s => `<div class="row-item">
                <span><strong>${P.esc(s.nombre)}</strong>${s.capacidad != null && s.capacidad !== '' ? ` <span class="muted">· cap. ${P.esc(s.capacidad)}</span>` : ''}
                ${s.notas ? `<br/><span class="text-sm muted">${P.esc(s.notas)}</span>` : ''}</span>
                <button type="button" class="btn-sm btn-edu-del-sala" data-id="${P.esc(s.id)}" aria-label="Eliminar sala">Eliminar</button>
            </div>`).join('')
            : '<p class="muted">No hay salas definidas.</p>';
        return P.wrap('educacion', 'Salas y espacios', bc, `
            <p class="muted text-sm">Aulas, laboratorios u otros espacios. Las sesiones de curso y las actividades pueden asignar sala; se advierte si hay solape horario en la misma sala.</p>
            <div class="card"><h2>Nueva sala</h2>
                <div class="form-row" style="flex-wrap:wrap;">
                    <input type="text" id="edu-sala-nombre" placeholder="Nombre" aria-label="Nombre sala"/>
                    <input type="number" id="edu-sala-cap" placeholder="Capacidad (opc.)" min="0" aria-label="Capacidad"/>
                    <input type="text" id="edu-sala-notas" placeholder="Notas" style="min-width:200px;" aria-label="Notas"/>
                    <button type="button" id="btn-edu-sala-add" class="btn btn-primary">Añadir</button>
                </div>
            </div>
            <div class="card"><h2>Listado</h2><div id="edu-salas-list">${rows}</div></div>`);
    },

    renderActividades(P, d, bc) {
        const { flags } = this.eventsWithConflictFlags(d);
        const list = (d.actividades || []).slice().sort((a, b) => ((a.fecha || '') + (a.horaInicio || '')).localeCompare((b.fecha || '') + (b.horaInicio || '')));
        const salaMap = Object.fromEntries((d.salas || []).map(s => [s.id, s.nombre]));
        const rows = list.length ? list.map(a => {
            const key = `a-${a.id}`;
            const bad = flags[key] && flags[key].length;
            const sn = a.salaId && salaMap[a.salaId] ? salaMap[a.salaId] : '—';
            return `<div class="row-item ${bad ? 'edu-row-conflict' : ''}">
                <span>${P.esc(a.fecha)} ${P.esc(a.horaInicio)}–${P.esc(a.horaFin)} · <strong>${P.esc(a.titulo || '')}</strong>
                <span class="muted"> · Sala: ${P.esc(sn)}</span>${bad ? ' <span class="edu-conflict-badge" title="Solape">⚠</span>' : ''}
                ${a.notas ? `<br/><span class="text-sm">${P.esc(a.notas)}</span>` : ''}</span>
                <button type="button" class="btn-sm btn-edu-del-act" data-id="${P.esc(a.id)}" aria-label="Eliminar">Eliminar</button>
            </div>`;
        }).join('') : '<p class="muted">Sin actividades. Crea eventos que no dependan de un curso (reuniones, usos de sala, etc.).</p>';

        return P.wrap('educacion', 'Actividades con horario', bc, `
            <p class="muted text-sm">Eventos fuera de un curso concreto. Opcionalmente enlaza una sala y un bloque de planificación.</p>
            <div class="card"><h2>Nueva actividad</h2>
                <div class="form-row" style="flex-wrap:wrap;align-items:flex-end;">
                    <input type="text" id="edu-act-tit" placeholder="Título" aria-label="Título"/>
                    <input type="date" id="edu-act-fecha" value="${new Date().toISOString().slice(0, 10)}" aria-label="Fecha"/>
                    <input type="time" id="edu-act-ini" value="09:00" aria-label="Inicio"/>
                    <input type="time" id="edu-act-fin" value="10:00" aria-label="Fin"/>
                    <label>Sala<select id="edu-act-sala" class="input" style="display:block;margin-top:4px;" aria-label="Sala">${this.salaOptionsHtml(P, d, '')}</select></label>
                    <label>Plan<select id="edu-act-plan" class="input" style="display:block;margin-top:4px;" aria-label="Plan">${this.planOptionsHtml(P, d, '')}</select></label>
                    <input type="text" id="edu-act-notas" placeholder="Notas" style="min-width:180px;" aria-label="Notas"/>
                    <button type="button" id="btn-edu-act-add" class="btn btn-primary">Guardar</button>
                </div>
            </div>
            <div class="card"><h2>Lista</h2><div id="edu-act-list">${rows}</div></div>`);
    },

    renderPlanificacion(P, d, bc) {
        const cursos = d.cursos || [];
        const optsC = cursos.map(c => `<option value="${P.esc(c.id)}">${P.esc(c.nombre)}</option>`).join('');
        const rows = (d.planes || []).length
            ? (d.planes || []).map(p => {
                const c = cursos.find(x => x.id === p.cursoId);
                return `<div class="row-item">
                    <span><strong>${P.esc(p.nombre || 'Plan')}</strong>
                    <span class="muted text-sm"> · ${P.esc(p.unidad || '')} · ${P.esc(p.tema || '')}</span><br/>
                    ${P.esc((p.fechaInicio || '').slice(0, 10))} → ${P.esc((p.fechaFin || '').slice(0, 10))}
                    ${c ? ` · Curso: ${P.esc(c.nombre)}` : ''}
                    ${p.notas ? `<br/><span class="text-sm">${P.esc(p.notas)}</span>` : ''}</span>
                    <button type="button" class="btn-sm btn-edu-del-plan" data-id="${P.esc(p.id)}" aria-label="Eliminar">Eliminar</button>
                </div>`;
            }).join('')
            : '<p class="muted">Sin planes. Define unidades o temas con ventana de fechas objetivo.</p>';

        return P.wrap('educacion', 'Planificación', bc, `
            <p class="muted text-sm">Bloques de planificación (unidad, tema, fechas). Puedes vincularlos al crear sesiones o actividades.</p>
            <div class="card"><h2>Nuevo bloque</h2>
                <div class="form-row" style="flex-wrap:wrap;align-items:flex-end;">
                    <input type="text" id="edu-plan-nombre" placeholder="Nombre del bloque" aria-label="Nombre"/>
                    <input type="text" id="edu-plan-unidad" placeholder="Unidad" aria-label="Unidad"/>
                    <input type="text" id="edu-plan-tema" placeholder="Tema" aria-label="Tema"/>
                    <input type="date" id="edu-plan-ini" aria-label="Desde"/>
                    <input type="date" id="edu-plan-fin" aria-label="Hasta"/>
                    <label>Curso (opc.)<select id="edu-plan-curso" class="input" style="display:block;margin-top:4px;"><option value="">— Ninguno —</option>${optsC}</select></label>
                    <input type="text" id="edu-plan-notas" placeholder="Notas" style="min-width:200px;" aria-label="Notas"/>
                    <button type="button" id="btn-edu-plan-add" class="btn btn-primary">Añadir</button>
                </div>
            </div>
            <div class="card"><h2>Planes</h2><div id="edu-plan-list">${rows}</div></div>`);
    },

    renderInformes(P, d, bc, desde, hasta) {
        const hoy = new Date().toISOString().slice(0, 10);
        const ds = /^\d{4}-\d{2}-\d{2}$/.test(desde) ? desde : hoy.slice(0, 8) + '01';
        const hs = /^\d{4}-\d{2}-\d{2}$/.test(hasta) ? hasta : hoy;
        const { all, flags } = this.eventsWithConflictFlags(d);
        const inRange = all.filter(e => e.fecha >= ds && e.fecha <= hs).sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));
        const bySala = {};
        (d.salas || []).forEach(s => { bySala[s.id] = { nombre: s.nombre, horas: 0, eventos: 0 }; });
        inRange.forEach(e => {
            if (!e.salaId || !bySala[e.salaId]) return;
            const mins = Math.max(0, e.t1 - e.t0);
            bySala[e.salaId].horas += mins / 60;
            bySala[e.salaId].eventos += 1;
        });
        const occRows = (d.salas || []).map(s => {
            const o = bySala[s.id];
            return `<tr><td>${P.esc(s.nombre)}</td><td>${o ? o.eventos : 0}</td><td>${o ? o.horas.toFixed(1) : '0'}</td></tr>`;
        }).join('');
        const actRows = inRange.map(e => {
            const bad = flags[e.key] && flags[e.key].length;
            const tipo = e.kind === 'sesion' ? 'Sesión curso' : 'Actividad';
            const curso = e.cursoNombre ? P.esc(e.cursoNombre) : '—';
            const sala = e.salaNombre || '—';
            return `<tr class="${bad ? 'edu-row-conflict' : ''}"><td>${P.esc(e.fecha)}</td><td>${P.esc(e.horaInicio)}–${P.esc(e.horaFin)}</td><td>${P.esc(tipo)}</td><td>${P.esc(e.titulo)}</td><td>${curso}</td><td>${P.esc(sala)}</td><td>${bad ? '⚠' : '—'}</td></tr>`;
        }).join('');

        return P.wrap('educacion', 'Informes', bc, `
            <p class="muted text-sm">Ocupación de salas y actividades en un rango. Usa imprimir del navegador para PDF o papel.</p>
            <div class="card edu-informes-filtro no-print"><h2>Rango</h2>
                <div class="form-row" style="flex-wrap:wrap;align-items:flex-end;">
                    <label>Desde<input type="date" id="edu-inf-desde" value="${P.esc(ds)}" class="input" style="display:block;margin-top:4px;"/></label>
                    <label>Hasta<input type="date" id="edu-inf-hasta" value="${P.esc(hs)}" class="input" style="display:block;margin-top:4px;"/></label>
                    <button type="button" id="btn-edu-inf-apply" class="btn btn-primary">Actualizar</button>
                    <button type="button" id="btn-edu-inf-print" class="btn btn-secondary">Imprimir / PDF</button>
                </div>
            </div>
            <div id="edu-informes-print" class="edu-informes-print">
                <div class="card"><h2>Resumen ocupación por sala</h2>
                    <p class="muted text-sm">${P.esc(ds)} — ${P.esc(hs)} · Total eventos en rango: <strong>${inRange.length}</strong></p>
                    <table class="trabajo-table"><thead><tr><th>Sala</th><th>Eventos</th><th>Horas aprox.</th></tr></thead>
                    <tbody>${occRows || '<tr><td colspan="3" class="muted">Sin salas o sin uso en el rango.</td></tr>'}</tbody></table>
                </div>
                <div class="card"><h2>Actividades y sesiones</h2>
                    <div style="overflow-x:auto;">
                    <table class="trabajo-table"><thead><tr><th>Fecha</th><th>Horario</th><th>Tipo</th><th>Título</th><th>Curso</th><th>Sala</th><th>Solape</th></tr></thead>
                    <tbody>${actRows || '<tr><td colspan="7" class="muted">Sin eventos en el rango.</td></tr>'}</tbody></table>
                    </div>
                </div>
            </div>`);
    },

    bindSalas(slug, rerender) {
        document.getElementById('btn-edu-sala-add')?.addEventListener('click', () => {
            const nombre = document.getElementById('edu-sala-nombre')?.value.trim();
            if (!nombre) return;
            const d = TrabajoStorage.getPerfilData(slug);
            if (!d.salas) d.salas = [];
            d.salas.push({
                id: Date.now().toString(),
                nombre,
                capacidad: document.getElementById('edu-sala-cap')?.value || '',
                notas: document.getElementById('edu-sala-notas')?.value.trim() || ''
            });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-edu-del-sala').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.salas = (d.salas || []).filter(s => s.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindActividades(slug, rerender) {
        const toast = (m, k) => {
            if (typeof TrabajoApp !== 'undefined' && TrabajoApp.toast) TrabajoApp.toast(m, k);
            else console.warn('[Educación]', m);
        };
        document.getElementById('btn-edu-act-add')?.addEventListener('click', () => {
            const tit = document.getElementById('edu-act-tit')?.value.trim();
            const fecha = document.getElementById('edu-act-fecha')?.value;
            const hi = document.getElementById('edu-act-ini')?.value;
            const hf = document.getElementById('edu-act-fin')?.value;
            if (!tit || !fecha) {
                toast('Título y fecha son obligatorios.', 'warning');
                return;
            }
            const d = TrabajoStorage.getPerfilData(slug);
            if (!d.actividades) d.actividades = [];
            const salaId = document.getElementById('edu-act-sala')?.value || '';
            const planId = document.getElementById('edu-act-plan')?.value || '';
            const ev = {
                id: Date.now().toString(),
                titulo: tit,
                fecha,
                horaInicio: hi || '09:00',
                horaFin: hf || '10:00',
                salaId,
                planId,
                notas: document.getElementById('edu-act-notas')?.value.trim() || ''
            };
            const all = this.collectEventos(d);
            const t0 = this.timeToMinutes(ev.horaInicio);
            const t1 = Math.max(this.timeToMinutes(ev.horaFin), t0 + 1);
            const probe = { ...ev, key: `a-${ev.id}`, t0, t1, kind: 'actividad', cursoNombre: '' };
            if (salaId && this.conflictKeysForEvent([...all, probe], probe).length) {
                toast('Hay solape con otro evento en la misma sala. Se guardará igual; revisa el calendario.', 'warning');
            }
            d.actividades.push(ev);
            TrabajoPerfiles._eduSyncCalendario(d);
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-edu-del-act').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.actividades = (d.actividades || []).filter(a => a.id !== btn.dataset.id);
                TrabajoPerfiles._eduSyncCalendario(d);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindPlanificacion(slug, rerender) {
        document.getElementById('btn-edu-plan-add')?.addEventListener('click', () => {
            const nombre = document.getElementById('edu-plan-nombre')?.value.trim();
            if (!nombre) return;
            const d = TrabajoStorage.getPerfilData(slug);
            if (!d.planes) d.planes = [];
            const cursoId = document.getElementById('edu-plan-curso')?.value || '';
            d.planes.push({
                id: Date.now().toString(),
                nombre,
                unidad: document.getElementById('edu-plan-unidad')?.value.trim() || '',
                tema: document.getElementById('edu-plan-tema')?.value.trim() || '',
                fechaInicio: document.getElementById('edu-plan-ini')?.value || '',
                fechaFin: document.getElementById('edu-plan-fin')?.value || '',
                cursoId: cursoId || '',
                notas: document.getElementById('edu-plan-notas')?.value.trim() || ''
            });
            TrabajoStorage.savePerfilData(slug, d);
            rerender();
        });
        document.querySelectorAll('.btn-edu-del-plan').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = TrabajoStorage.getPerfilData(slug);
                d.planes = (d.planes || []).filter(p => p.id !== btn.dataset.id);
                TrabajoStorage.savePerfilData(slug, d);
                rerender();
            });
        });
    },

    bindInformes(slug, rerender) {
        document.getElementById('btn-edu-inf-apply')?.addEventListener('click', () => {
            const ds = document.getElementById('edu-inf-desde')?.value;
            const hs = document.getElementById('edu-inf-hasta')?.value;
            if (ds && hs) {
                try {
                    sessionStorage.setItem('trabajo_edu_inf_desde', ds);
                    sessionStorage.setItem('trabajo_edu_inf_hasta', hs);
                } catch (e) {}
            }
            rerender();
        });
        document.getElementById('btn-edu-inf-print')?.addEventListener('click', () => {
            window.print();
        });
    }
};
