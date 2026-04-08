/* ============================================
   SALUD - Enfermedades/condiciones + Medicamentos + Añadir al calendario
   ============================================ */

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SINTOMAS_PREDET = ['Mareos', 'Dolor de cabeza', 'Náuseas', 'Fiebre', 'Cansancio', 'Dolor muscular', 'Tos', 'Dolor de garganta', 'Otro'];

const SaludPage = {
    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const salud = data.salud || { enfermedades: [], medicamentos: [], sintomas: [], tomas: {} };
        const enfermedades = salud.enfermedades || [];
        const medicamentos = salud.medicamentos || [];
        const sintomas = (salud.sintomas || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        const sintomasFrecuentes = this._sintomasFrecuentes(salud.sintomas || [], 30, 3);

        container.innerHTML = `
            ${UI.pageTitle('Salud', '<a href="#dashboard" class="btn btn-ghost btn-sm">← Inicio</a>', 'salud')}
            <p class="text-secondary mb-lg">Registra enfermedades o condiciones con fechas, y medicamentos con horarios. Puedes añadir los recordatorios de medicación al calendario.</p>

            <!-- Enfermedades / Condiciones -->
            <div class="card mb-lg">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <h4 class="card-title mb-0">Enfermedades o condiciones</h4>
                    <button type="button" id="btn-add-enfermedad" class="btn btn-primary btn-sm">+ Añadir</button>
                </div>
                ${enfermedades.length === 0 ? `
                    <div class="empty-state">
                        <p class="text-secondary">No hay registros. Añade una enfermedad o condición (ej. hipertensión, diabetes, alergia).</p>
                    </div>
                ` : `
                    <ul class="salud-list" id="salud-enfermedades-list">
                        ${enfermedades.map(e => `
                            <li class="salud-item" data-id="${UI.esc(e.id)}">
                                <div>
                                    <strong>${UI.esc(e.nombre || '')}</strong>
                                    <span class="text-secondary text-sm"> desde ${DateUtils.format(e.fechaInicio || '', 'medium')}${e.fechaFin ? ' hasta ' + DateUtils.format(e.fechaFin, 'medium') : ''}</span>
                                    ${e.notas ? `<p class="text-secondary text-sm mt-xs mb-0">${UI.esc(e.notas)}</p>` : ''}
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <button type="button" class="btn btn-ghost btn-sm salud-edit" data-id="${UI.esc(e.id)}" data-type="enfermedad">Editar</button>
                                    <button type="button" class="btn btn-ghost btn-sm text-error salud-del" data-id="${UI.esc(e.id)}" data-type="enfermedad">Eliminar</button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                `}
            </div>

            <!-- Medicamentos -->
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <h4 class="card-title mb-0">Medicamentos</h4>
                    <button type="button" id="btn-add-medicamento" class="btn btn-primary btn-sm">+ Añadir medicamento</button>
                </div>
                ${medicamentos.length === 0 ? `
                    <div class="empty-state">
                        <p class="text-secondary">No hay medicamentos. Añade nombre, dosis y horarios para recordar tomas.</p>
                    </div>
                ` : `
                    <ul class="salud-list" id="salud-medicamentos-list">
                        ${medicamentos.map(m => `
                            <li class="salud-item" data-id="${UI.esc(m.id)}">
                                <div>
                                    <strong>${UI.esc(m.nombre || '')}</strong>${m.dosis ? ` <span class="text-secondary">${UI.esc(m.dosis)}</span>` : ''}
                                    ${(m.horarios || []).length > 0 ? `<p class="text-secondary text-sm mt-xs mb-0">Horarios: ${(m.horarios || []).map(h => h.hora + (h.dias && h.dias.length < 7 ? ' (' + h.dias.map(d => DIAS_SEMANA[d]).join(', ') + ')' : '')).join('; ')}</p>` : ''}
                                    ${m.notas ? `<p class="text-secondary text-sm mt-xs mb-0">${UI.esc(m.notas)}</p>` : ''}
                                </div>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    ${(m.horarios || []).length > 0 ? `<button type="button" class="btn btn-secondary btn-sm salud-add-calendar" data-id="${UI.esc(m.id)}">Añadir al calendario</button>` : ''}
                                    <button type="button" class="btn btn-ghost btn-sm salud-edit" data-id="${UI.esc(m.id)}" data-type="medicamento">Editar</button>
                                    <button type="button" class="btn btn-ghost btn-sm text-error salud-del" data-id="${UI.esc(m.id)}" data-type="medicamento">Eliminar</button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                `}
            </div>

            <!-- Registro de síntomas -->
            <div class="card mt-lg">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <h4 class="card-title mb-0">Registro de síntomas</h4>
                    <button type="button" id="btn-add-sintoma" class="btn btn-primary btn-sm">+ Anotar síntoma</button>
                </div>
                ${sintomasFrecuentes.length > 0 ? `
                    <div class="alert alert-warning mb-md" style="font-size:0.9rem;">
                        <strong>Retroalimentación:</strong> Has registrado estos síntomas varias veces en los últimos 30 días: <strong>${sintomasFrecuentes.map(s => UI.esc(s)).join(', ')}</strong>. Si persisten, considera consultar a un profesional de salud.
                    </div>
                ` : ''}
                ${sintomas.length === 0 ? `
                    <div class="empty-state">
                        <p class="text-secondary">Anota síntomas como mareos o dolor de cabeza para llevar un registro. Si un síntoma se repite con frecuencia, te lo recordaremos.</p>
                    </div>
                ` : `
                    <ul class="salud-list" id="salud-sintomas-list">
                        ${sintomas.slice(0, 30).map(s => `
                            <li class="salud-item" data-id="${UI.esc(s.id)}">
                                <div>
                                    <strong>${UI.esc(s.sintoma || '')}</strong>
                                    <span class="text-secondary text-sm"> ${DateUtils.format(s.fecha || '', 'medium')}</span>
                                    ${s.notas ? `<p class="text-secondary text-sm mt-xs mb-0">${UI.esc(s.notas)}</p>` : ''}
                                </div>
                                <button type="button" class="btn btn-ghost btn-sm text-error salud-del" data-id="${UI.esc(s.id)}" data-type="sintoma">Eliminar</button>
                            </li>
                        `).join('')}
                    </ul>
                    ${sintomas.length > 30 ? `<p class="text-secondary text-sm mt-sm">Mostrando los 30 más recientes.</p>` : ''}
                `}
            </div>
        `;

        this._bindEvents(container, email);
    },

    _sintomasFrecuentes(sintomas, diasReciente, umbral) {
        const cutoff = DateUtils.addDays(DateUtils.today(), -diasReciente);
        const recientes = sintomas.filter(s => (s.fecha || '') >= cutoff);
        const porNombre = {};
        recientes.forEach(s => {
            const n = (s.sintoma || '').trim() || 'Otro';
            porNombre[n] = (porNombre[n] || 0) + 1;
        });
        return Object.keys(porNombre).filter(n => porNombre[n] >= umbral);
    },

    _renderEnfermedadForm(item) {
        const isEdit = !!item;
        return `
            <h3 class="modal-title">${isEdit ? 'Editar' : 'Nueva'} enfermedad/condición</h3>
            <form id="form-enfermedad">
                ${UI.formGroup('Nombre', UI.input('enf_nombre', { placeholder: 'Ej. Hipertensión, alergia al polen', value: item?.nombre, required: true }))}
                ${UI.formGroup('Fecha inicio', UI.input('enf_fechaInicio', { type: 'date', value: item?.fechaInicio || DateUtils.today(), required: true }))}
                ${UI.formGroup('Fecha fin (opcional)', UI.input('enf_fechaFin', { type: 'date', value: item?.fechaFin || '' }))}
                ${UI.formGroup('Notas', '<textarea id="enf_notas" name="enf_notas" class="form-input" rows="2" placeholder="Detalles opcionales">' + UI.esc(item?.notas || '') + '</textarea>')}
                <div class="modal-actions">
                    <button type="button" id="btn-enf-cancel" class="btn btn-ghost">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar' : 'Añadir'}</button>
                </div>
            </form>
        `;
    },

    _renderMedicamentoForm(item) {
        const isEdit = !!item;
        const horarios = item?.horarios || [{ hora: '08:00', dias: null }];
        const horariosHtml = horarios.map((h, i) => {
            const diasVal = !h.dias || h.dias.length === 7 ? '' : h.dias.join(',');
            return `
                <div class="form-row horario-row" data-index="${i}" style="align-items:center; gap:8px; margin-bottom:8px;">
                    ${UI.input('med_hora_' + i, { type: 'time', value: h.hora || '08:00' })}
                    <input type="text" id="med_dias_${i}" class="form-input" placeholder="Días (opcional: 0-6 o vacío=todos)" style="width:180px;" value="${UI.esc(diasVal)}" />
                    <button type="button" class="btn btn-ghost btn-sm remove-horario" data-index="${i}">−</button>
                </div>
            `;
        }).join('');
        return `
            <h3 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} medicamento</h3>
            <form id="form-medicamento">
                ${UI.formGroup('Nombre', UI.input('med_nombre', { placeholder: 'Ej. Paracetamol', value: item?.nombre, required: true }))}
                ${UI.formGroup('Dosis (opcional)', UI.input('med_dosis', { placeholder: 'Ej. 500 mg cada 8h', value: item?.dosis || '' }))}
                <div class="form-group">
                    <label class="form-label">Horarios (hora y días opcional: 0=Dom, 1=Lun… 7=daily)</label>
                    <div id="med-horarios-container">${horariosHtml}</div>
                    <button type="button" id="btn-add-horario" class="btn btn-ghost btn-sm mt-sm">+ Otro horario</button>
                </div>
                ${UI.formGroup('Fecha inicio (opcional)', UI.input('med_fechaInicio', { type: 'date', value: item?.fechaInicio || '' }))}
                ${UI.formGroup('Fecha fin (opcional)', UI.input('med_fechaFin', { type: 'date', value: item?.fechaFin || '' }))}
                ${UI.formGroup('Notas', '<textarea id="med_notas" name="med_notas" class="form-input" rows="2" placeholder="Indicaciones">' + UI.esc(item?.notas || '') + '</textarea>')}
                <div class="modal-actions">
                    <button type="button" id="btn-med-cancel" class="btn btn-ghost">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar' : 'Añadir'}</button>
                </div>
            </form>
        `;
    },

    _parseDias(str) {
        if (!str || !String(str).trim()) return null;
        const parts = String(str).trim().split(/[\s,]+/).map(p => parseInt(p, 10));
        const valid = parts.filter(n => !isNaN(n) && n >= 0 && n <= 6);
        if (valid.length === 0) return null;
        return [...new Set(valid)].sort((a, b) => a - b);
    },

    _bindEvents(container, email) {
        const self = this;

        // --- Enfermedades ---
        UI.bindButton('btn-add-enfermedad', () => {
            UI.showModal(this._renderEnfermedadForm(null), {
                onReady: () => {
                    UI.bindButton('btn-enf-cancel', () => UI.closeModal());
                    UI.bindForm('form-enfermedad', (fd) => {
                        const udata = Storage.getUserData(email);
                        if (!udata.salud) udata.salud = { enfermedades: [], medicamentos: [] };
                        const ent = {
                            id: DateUtils.generateId(),
                            nombre: (fd.enf_nombre || '').trim(),
                            fechaInicio: fd.enf_fechaInicio || DateUtils.today(),
                            fechaFin: fd.enf_fechaFin || null,
                            notas: (fd.enf_notas || '').trim() || null,
                            creado: new Date().toISOString()
                        };
                        if (!ent.fechaFin) delete ent.fechaFin;
                        udata.salud.enfermedades.push(ent);
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        UI.toast('Enfermedad/condición añadida', 'success');
                        self.render(container);
                    });
                }
            });
        });

        container.querySelectorAll('.salud-edit[data-type="enfermedad"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const udata = Storage.getUserData(email);
                const item = (udata.salud?.enfermedades || []).find(e => e.id === btn.dataset.id);
                if (!item) return;
                UI.showModal(this._renderEnfermedadForm(item), {
                    onReady: () => {
                        UI.bindButton('btn-enf-cancel', () => UI.closeModal());
                        UI.bindForm('form-enfermedad', (fd) => {
                            const data = Storage.getUserData(email);
                            const ent = (data.salud?.enfermedades || []).find(e => e.id === item.id);
                            if (ent) {
                                ent.nombre = (fd.enf_nombre || '').trim();
                                ent.fechaInicio = fd.enf_fechaInicio || DateUtils.today();
                                ent.fechaFin = fd.enf_fechaFin || null;
                                ent.notas = (fd.enf_notas || '').trim() || null;
                                if (!ent.fechaFin) delete ent.fechaFin;
                            }
                            Storage.saveUserData(email, data);
                            UI.closeModal();
                            UI.toast('Actualizado', 'success');
                            self.render(container);
                        });
                    }
                });
            });
        });

        container.querySelectorAll('.salud-del[data-type="enfermedad"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('¿Eliminar este registro?')) return;
                const udata = Storage.getUserData(email);
                udata.salud.enfermedades = (udata.salud?.enfermedades || []).filter(e => e.id !== btn.dataset.id);
                Storage.saveUserData(email, udata);
                UI.toast('Eliminado', 'success');
                self.render(container);
            });
        });

        // --- Medicamentos ---
        UI.bindButton('btn-add-medicamento', () => {
            UI.showModal(this._renderMedicamentoForm(null), {
                onReady: () => this._bindMedicamentoForm(container, email, null)
            });
        });

        container.querySelectorAll('.salud-edit[data-type="medicamento"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const udata = Storage.getUserData(email);
                const item = (udata.salud?.medicamentos || []).find(m => m.id === btn.dataset.id);
                if (!item) return;
                UI.showModal(this._renderMedicamentoForm(item), {
                    onReady: () => this._bindMedicamentoForm(container, email, item)
                });
            });
        });

        container.querySelectorAll('.salud-del[data-type="medicamento"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('¿Eliminar este medicamento?')) return;
                const udata = Storage.getUserData(email);
                udata.salud.medicamentos = (udata.salud?.medicamentos || []).filter(m => m.id !== btn.dataset.id);
                Storage.saveUserData(email, udata);
                UI.toast('Eliminado', 'success');
                self.render(container);
            });
        });

        // --- Síntomas ---
        UI.bindButton('btn-add-sintoma', () => {
            const html = `
                <h3 class="modal-title">Anotar síntoma</h3>
                <p class="text-secondary text-sm mb-md">Haz clic en una opción para preseleccionar o escribe el tuyo.</p>
                <div class="salud-sintoma-presets mb-md" style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${SINTOMAS_PREDET.map(s => `<button type="button" class="btn btn-ghost btn-sm preset-sintoma" data-sintoma="${UI.esc(s)}">${UI.esc(s)}</button>`).join('')}
                </div>
                <form id="form-sintoma">
                    ${UI.formGroup('Síntoma', UI.input('sint_nombre', { placeholder: 'Ej. Mareos, dolor de cabeza', required: true }))}
                    ${UI.formGroup('Fecha', UI.input('sint_fecha', { type: 'date', value: DateUtils.today(), required: true }))}
                    ${UI.formGroup('Notas (opcional)', '<textarea name="sint_notas" id="input-sint_notas" class="form-input" rows="2" placeholder="Detalles"></textarea>')}
                    <div class="modal-actions">
                        <button type="button" id="btn-sint-cancel" class="btn btn-ghost">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            `;
            UI.showModal(html, {
                onReady: () => {
                    document.querySelectorAll('.preset-sintoma').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const input = document.getElementById('input-sint_nombre');
                            if (input) input.value = btn.dataset.sintoma;
                        });
                    });
                    UI.bindButton('btn-sint-cancel', () => UI.closeModal());
                    UI.bindForm('form-sintoma', (fd) => {
                        const udata = Storage.getUserData(email);
                        if (!udata.salud) udata.salud = { enfermedades: [], medicamentos: [], sintomas: [], tomas: {} };
                        if (!udata.salud.sintomas) udata.salud.sintomas = [];
                        udata.salud.sintomas.push({
                            id: DateUtils.generateId(),
                            fecha: fd.sint_fecha || DateUtils.today(),
                            sintoma: (fd.sint_nombre || '').trim(),
                            notas: (fd.sint_notas || '').trim() || undefined,
                            creado: new Date().toISOString()
                        });
                        Storage.saveUserData(email, udata);
                        UI.closeModal();
                        UI.toast('Síntoma registrado', 'success');
                        self.render(container);
                    });
                }
            });
        });

        container.querySelectorAll('.salud-del[data-type="sintoma"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const udata = Storage.getUserData(email);
                if (!udata.salud.sintomas) udata.salud.sintomas = [];
                udata.salud.sintomas = udata.salud.sintomas.filter(s => s.id !== btn.dataset.id);
                Storage.saveUserData(email, udata);
                UI.toast('Eliminado', 'success');
                self.render(container);
            });
        });

        // Añadir al calendario
        container.querySelectorAll('.salud-add-calendar').forEach(btn => {
            btn.addEventListener('click', () => {
                const udata = Storage.getUserData(email);
                const med = (udata.salud?.medicamentos || []).find(m => m.id === btn.dataset.id);
                if (!med || !(med.horarios || []).length) return;
                this._addMedicamentoToCalendar(email, med);
                UI.toast('Recordatorios añadidos al calendario (próximos 30 días)', 'success');
            });
        });
    },

    _bindMedicamentoForm(container, email, item) {
        const self = this;
        let horarioCount = document.querySelectorAll('.horario-row').length;

        UI.bindButton('btn-med-cancel', () => UI.closeModal());

        document.getElementById('btn-add-horario')?.addEventListener('click', () => {
            const containerEl = document.getElementById('med-horarios-container');
            if (!containerEl) return;
            const div = document.createElement('div');
            div.className = 'form-row horario-row';
            div.setAttribute('data-index', horarioCount);
            div.style = 'align-items:center; gap:8px; margin-bottom:8px;';
            div.innerHTML = `
                <input type="time" id="input-med_hora_${horarioCount}" name="med_hora_${horarioCount}" class="form-input" value="08:00" />
                <input type="text" id="med_dias_${horarioCount}" class="form-input" placeholder="Días (opcional)" style="width:180px;" />
                <button type="button" class="btn btn-ghost btn-sm remove-horario" data-index="${horarioCount}">−</button>
            `;
            containerEl.appendChild(div);
            div.querySelector('.remove-horario').addEventListener('click', () => { div.remove(); });
            horarioCount++;
        });

        document.querySelectorAll('.remove-horario').forEach(b => {
            b.addEventListener('click', () => b.closest('.horario-row')?.remove());
        });

        UI.bindForm('form-medicamento', (fd) => {
            const horarios = [];
            document.querySelectorAll('.horario-row').forEach(row => {
                const idx = row.getAttribute('data-index');
                const horaEl = document.getElementById('input-med_hora_' + idx) || document.getElementById('med_hora_' + idx);
                const diasEl = document.getElementById('med_dias_' + idx);
                const hora = horaEl?.value || '08:00';
                const diasStr = diasEl?.value || '';
                const dias = self._parseDias(diasStr);
                horarios.push({ hora, dias: dias || undefined });
            });
            if (horarios.length === 0) horarios.push({ hora: '08:00', dias: undefined });

            const udata = Storage.getUserData(email);
            if (!udata.salud) udata.salud = { enfermedades: [], medicamentos: [] };

            if (item) {
                const med = (udata.salud.medicamentos || []).find(m => m.id === item.id);
                if (med) {
                    med.nombre = (fd.med_nombre || '').trim();
                    med.dosis = (fd.med_dosis || '').trim() || undefined;
                    med.horarios = horarios;
                    med.fechaInicio = fd.med_fechaInicio || undefined;
                    med.fechaFin = fd.med_fechaFin || undefined;
                    med.notas = (fd.med_notas || '').trim() || undefined;
                }
            } else {
                udata.salud.medicamentos.push({
                    id: DateUtils.generateId(),
                    nombre: (fd.med_nombre || '').trim(),
                    dosis: (fd.med_dosis || '').trim() || undefined,
                    horarios,
                    fechaInicio: fd.med_fechaInicio || undefined,
                    fechaFin: fd.med_fechaFin || undefined,
                    notas: (fd.med_notas || '').trim() || undefined,
                    creado: new Date().toISOString()
                });
            }
            Storage.saveUserData(email, udata);
            UI.closeModal();
            UI.toast(item ? 'Medicamento actualizado' : 'Medicamento añadido', 'success');
            self.render(container);
        });
    },

    /** Añade eventos de recordatorio de medicamento al calendario (próximos 30 días). */
    _addMedicamentoToCalendar(email, med) {
        if (typeof CalendarPage === 'undefined' || !CalendarPage.addAutoEvent) return;
        const today = DateUtils.today();
        const titulo = `💊 ${med.nombre}`;
        for (let offset = 0; offset < 30; offset++) {
            const fecha = DateUtils.addDays(today, offset);
            const dayOfWeek = new Date(fecha + 'T12:00:00').getDay();
            for (const h of med.horarios || []) {
                const dias = h.dias;
                const applies = !dias || dias.length === 0 || dias.includes(dayOfWeek);
                if (applies) {
                    CalendarPage.addAutoEvent(email, titulo, fecha, 'Salud', 'salud', { hora: h.hora || '' });
                }
            }
        }
    }
};
