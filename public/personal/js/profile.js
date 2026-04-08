/* ============================================
   PROFILE - Shared Profile Form (Setup & Edit)
   ============================================ */

const Profile = {
    /**
     * Renders the profile form into a container.
     * Used both during initial setup and profile editing.
     * @param {HTMLElement|string} container - DOM element or ID
     * @param {Object} userData - current user data
     * @param {Object} options - { isSetup: bool, onSave: fn }
     */
    renderForm(container, userData, options = {}) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        const p = userData.perfil || {};
        const isSetup = options.isSetup || false;

        const moreDetailsHtml = `
                <h4 class="step-title">Tipo de cuerpo</h4>
                <p class="text-secondary text-sm mb-sm">Opcional. Sirve para personalizar recomendaciones de ejercicio.</p>
                <div class="tipo-cuerpo-options" id="tipo-cuerpo-options">
                    <label class="tipo-cuerpo-option ${(p.tipoCuerpo || '') === 'ectomorfo' ? 'selected' : ''}" data-value="ectomorfo">
                        <input type="radio" name="tipoCuerpo" value="ectomorfo" ${(p.tipoCuerpo || '') === 'ectomorfo' ? 'checked' : ''}>
                        <span class="tipo-cuerpo-title">Ectomorfo</span>
                        <span class="tipo-cuerpo-desc">Delgado, extremidades largas. Objetivo: fuerza y masa, ejercicios compuestos.</span>
                    </label>
                    <label class="tipo-cuerpo-option ${(p.tipoCuerpo || '') === 'mesomorfo' ? 'selected' : ''}" data-value="mesomorfo">
                        <input type="radio" name="tipoCuerpo" value="mesomorfo" ${(p.tipoCuerpo || '') === 'mesomorfo' ? 'checked' : ''}>
                        <span class="tipo-cuerpo-title">Mesomorfo</span>
                        <span class="tipo-cuerpo-desc">Athlético, proporciones equilibradas. Objetivo: equilibrio fuerza / cardio.</span>
                    </label>
                    <label class="tipo-cuerpo-option ${(p.tipoCuerpo || '') === 'endomorfo' ? 'selected' : ''}" data-value="endomorfo">
                        <input type="radio" name="tipoCuerpo" value="endomorfo" ${(p.tipoCuerpo || '') === 'endomorfo' ? 'checked' : ''}>
                        <span class="tipo-cuerpo-title">Endomorfo</span>
                        <span class="tipo-cuerpo-desc">Más volumen, dificultad para bajar peso. Objetivo: gasto calórico, fuerza y cardio.</span>
                    </label>
                </div>

                <h4 class="step-title">Ingresos (opcional)</h4>
                <div id="ingresos-list" class="dynamic-list"></div>
                <button type="button" id="btn-add-ingreso" class="btn btn-ghost btn-sm mt-sm">+ Agregar ingreso</button>

                <h4 class="step-title">Deudas (opcional)</h4>
                <div id="deudas-list" class="dynamic-list"></div>
                <button type="button" id="btn-add-deuda" class="btn btn-ghost btn-sm mt-sm">+ Agregar deuda</button>

                <h4 class="step-title">Modo Trabajo (opcional)</h4>
                <p class="text-secondary text-sm mb-sm">Área y tipo de vinculación para personalizar módulos.</p>
                <div class="form-row">
                    ${UI.formGroup('Área', UI.select('areaPrincipal', [
                        { value: '', label: 'No uso Modo Trabajo' },
                        { value: 'Salud', label: 'Salud' },
                        { value: 'Educación', label: 'Educación' },
                        { value: 'Tecnología', label: 'Tecnología' },
                        { value: 'Servicios/Comercial', label: 'Servicios / Comercial' },
                        { value: 'Administración/Gestión', label: 'Administración / Gestión' },
                        { value: 'Logística/Operaciones', label: 'Logística / Operaciones' },
                        { value: 'Consultoría/Estratégica', label: 'Consultoría / Estratégica' }
                    ], p.areaPrincipal || (p.profesionTrabajo === 'kinesiologo' ? 'Salud' : p.profesionTrabajo === 'profesor' ? 'Educación' : p.profesionTrabajo === 'barbero' ? 'Servicios/Comercial' : '') || '', {}))}
                    ${UI.formGroup('Tipo', UI.select('tipoUsuario', [
                        { value: '', label: 'Seleccionar' },
                        { value: 'independiente', label: 'Independiente' },
                        { value: 'dependiente', label: 'Dependiente' }
                    ], p.tipoUsuario || '', {}))}
                </div>
        `;

        el.innerHTML = `
            <form id="profile-form" class="fade-in">
                ${isSetup ? '' : '<h3 class="step-title">Editar perfil</h3>'}

                <div class="form-row">
                    ${UI.formGroup('Nombre', UI.input('nombre', { value: p.nombre || '', placeholder: 'Tu nombre', required: true }))}
                    ${UI.formGroup('Género', UI.select('genero', [
                        { value: '', label: 'Seleccionar' },
                        { value: 'hombre', label: 'Hombre' },
                        { value: 'mujer', label: 'Mujer' },
                        { value: 'otro', label: 'Otro' }
                    ], p.genero || '', { required: true }))}
                </div>

                <div class="form-row">
                    ${UI.formGroup('Edad (opcional)', UI.input('edad', { type: 'number', value: p.edad || '', placeholder: 'Años', min: 1, max: 120 }))}
                    ${UI.formGroup('Peso (opcional)', UI.input('peso', { type: 'number', value: p.peso || '', placeholder: 'kg', step: '0.1', min: 1 }))}
                </div>

                <div class="form-row">
                    ${UI.formGroup('Altura (opcional)', UI.input('altura', { type: 'number', value: p.altura || '', placeholder: 'cm', min: 50, max: 250 }))}
                    <div></div>
                </div>

                <h4 class="step-title">Qué quieres usar en Severa</h4>
                <p class="text-secondary text-sm mb-md">Activa los módulos que usarás. En cada uno podrás cargar la información que se indica.</p>
                <div class="module-options" id="module-options">
                    ${this._renderModuleOptions(p.opcionesActivas)}
                </div>

                ${isSetup ? `
                <details class="profile-more-details mt-lg" id="profile-more-details">
                    <summary>Más detalles (opcional)</summary>
                    <div class="profile-more-details-inner">
                        ${moreDetailsHtml}
                    </div>
                </details>
                ` : moreDetailsHtml}

                <div class="modal-actions mt-lg profile-setup-actions">
                    ${!isSetup ? '<button type="button" id="btn-profile-cancel" class="btn btn-secondary">Cancelar</button>' : ''}
                    <button type="submit" id="${isSetup ? 'btn-profile-submit-setup' : 'btn-profile-submit'}" class="btn btn-primary btn-lg">${isSetup ? 'Completar Perfil' : 'Guardar Cambios'}</button>
                </div>
            </form>
        `;

        // Render existing income/debt lists
        this._renderIngresosList(p.ingresos || []);
        this._renderDeudasList(p.deudas || []);

        // Bind add buttons
        UI.bindButton('btn-add-ingreso', () => this._addIngresoRow());
        UI.bindButton('btn-add-deuda', () => this._addDeudaRow());

        // Bind tipo cuerpo radio selection UI
        el.querySelectorAll('.tipo-cuerpo-option').forEach(lbl => {
            lbl.addEventListener('click', () => {
                el.querySelectorAll('.tipo-cuerpo-option').forEach(o => o.classList.remove('selected'));
                lbl.classList.add('selected');
            });
        });

        // Bind module options click (cards o lista)
        el.querySelectorAll('.module-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const cb = opt.querySelector('input[type="checkbox"]');
                if (cb) {
                    cb.checked = !cb.checked;
                    opt.classList.toggle('selected', cb.checked);
                }
            });
        });

        // Bind cancel
        if (!isSetup) {
            UI.bindButton('btn-profile-cancel', () => UI.closeModal());
        }

        // Bind form submit
        UI.bindForm('profile-form', (data) => {
            const profileData = this._collectFormData();
            if (!profileData.nombre.trim()) {
                UI.toast('El nombre es obligatorio', 'error');
                this._scrollAuthToProfileIssue('#input-nombre');
                return;
            }
            if (profileData.areaPrincipal && !profileData.tipoUsuario) {
                UI.toast('Si eliges un Área Principal, selecciona también Tipo de usuario (Independiente o Dependiente)', 'error');
                this._scrollAuthToProfileIssue('#input-tipoUsuario');
                return;
            }
            if (options.onSave) {
                options.onSave(profileData);
            }
        });
    },

    /** Scroll dentro de #auth-screen (setup/login) para ver el campo con error o el botón enviar. */
    _scrollAuthToProfileIssue(focusSelector) {
        requestAnimationFrame(() => {
            const target = focusSelector ? document.querySelector(focusSelector) : null;
            if (target) {
                target.focus({ preventScroll: true });
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
            document.getElementById('btn-profile-submit-setup')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    },

    _renderModuleOptions(opts) {
        const modules = [
            { key: 'biblia', label: 'Biblia / Religión', desc: 'Avance de lectura, versículos favoritos, reflexiones por pasaje.' },
            { key: 'habitos', label: 'Hábitos', desc: 'Lista de hábitos diarios, rachas, registro por fecha.' },
            { key: 'ejercicios', label: 'Ejercicios', desc: 'Sesiones, rutinas, peso y repeticiones por ejercicio, mapa corporal.' },
            { key: 'estudios', label: 'Estudios', desc: 'Ramos o cursos, pruebas, fechas y notas.' },
            { key: 'gastosCompartidos', label: 'Gastos Compartidos', desc: 'Participantes, gastos repartidos, quién pagó qué.' },
            { key: 'juegos', label: 'Juegos', desc: 'Palabra del día, crucigramas, sudoku, historial.' },
            { key: 'documentos', label: 'Documentos', desc: 'Grupos de archivos y notas que tú organices.' },
            { key: 'cicloMenstrual', label: 'Ciclo Menstrual', desc: 'Registro de ciclo, síntomas, encuentros.' },
            { key: 'diario', label: 'Diario de Vida', desc: 'Entradas por día, cómo fue el día, nota, actividades.' },
            { key: 'foda', label: 'Análisis FODA', desc: 'Fortalezas, oportunidades, debilidades, amenazas y estrategias.' },
            { key: 'registroIntimo', label: 'Registro Íntimo', desc: 'Encuentros y notas privadas.' },
            { key: 'gratitud', label: 'Gratitud', desc: 'Lista de cosas por las que estás agradecido, por fecha.' },
            { key: 'salud', label: 'Salud', desc: 'Enfermedades, medicamentos, síntomas, toma de medicación.' },
            { key: 'biografia', label: 'Biografía', desc: 'Eventos de vida, hitos, lugares, fechas.' },
            { key: 'viajes', label: 'Viajes', desc: 'Viajes planeados o realizados, destinos, fechas.' }
        ];
        const defaults = opts || {};
        return modules.map(m => {
            const checked = m.key === 'gastosCompartidos' ? defaults[m.key] === true : defaults[m.key] !== false;
            return `
                <div class="module-option module-card-personalize ${checked ? 'selected' : ''}" data-module="${m.key}">
                    <div class="module-card-check" aria-hidden="true"></div>
                    <input type="checkbox" name="mod_${m.key}" ${checked ? 'checked' : ''} class="sr-only" aria-label="Activar ${UI.esc(m.label)}">
                    <div class="module-card-body">
                        <h4>${m.label}</h4>
                        <p class="module-card-desc">${m.desc}</p>
                    </div>
                </div>
            `;
        }).join('');
    },

    _renderIngresosList(ingresos) {
        const list = document.getElementById('ingresos-list');
        if (!list) return;
        list.innerHTML = '';
        if (ingresos.length === 0) {
            this._addIngresoRow();
            return;
        }
        ingresos.forEach(ing => this._addIngresoRow(ing));
    },

    _addIngresoRow(data = {}) {
        const list = document.getElementById('ingresos-list');
        if (!list) return;
        const id = DateUtils.generateId();
        const row = document.createElement('div');
        row.className = 'dynamic-item';
        row.dataset.id = id;
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-input" name="ing_fuente_${id}" placeholder="Fuente" value="${UI.esc(data.fuente || '')}">
            </div>
            <div class="form-group">
                <input type="number" class="form-input" name="ing_monto_${id}" placeholder="Monto" value="${data.monto || ''}" min="0">
            </div>
            <div class="form-group">
                <select class="form-select" name="ing_cat_${id}">
                    ${Storage.getModulesGlobal().categoriasIngresos.map(c =>
                        `<option value="${c}" ${c === data.categoria ? 'selected' : ''}>${c}</option>`
                    ).join('')}
                </select>
            </div>
            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
        `;
        list.appendChild(row);
    },

    _renderDeudasList(deudas) {
        const list = document.getElementById('deudas-list');
        if (!list) return;
        list.innerHTML = '';
        if (deudas.length === 0) return;
        deudas.forEach(d => this._addDeudaRow(d));
    },

    _addDeudaRow(data = {}) {
        const list = document.getElementById('deudas-list');
        if (!list) return;
        const id = DateUtils.generateId();
        const row = document.createElement('div');
        row.className = 'dynamic-item';
        row.dataset.id = id;
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-input" name="deu_desc_${id}" placeholder="Descripción" value="${UI.esc(data.descripcion || '')}">
            </div>
            <div class="form-group">
                <input type="number" class="form-input" name="deu_monto_${id}" placeholder="Monto" value="${data.monto || ''}" min="0">
            </div>
            <div class="form-group">
                <input type="date" class="form-input" name="deu_fecha_${id}" value="${data.fecha || ''}">
            </div>
            <div class="form-group">
                <input type="number" class="form-input" name="deu_pct_${id}" placeholder="%" value="${data.porcentaje || ''}" min="0" max="100" step="0.1">
            </div>
            <button type="button" class="btn-icon btn-remove" onclick="this.closest('.dynamic-item').remove()">✕</button>
        `;
        list.appendChild(row);
    },

    _collectFormData() {
        const form = document.getElementById('profile-form');
        if (!form) return {};

        const tipoCuerpoRadio = form.querySelector('input[name="tipoCuerpo"]:checked');
        const data = {
            nombre: form.querySelector('[name="nombre"]')?.value || '',
            genero: form.querySelector('[name="genero"]')?.value || null,
            edad: parseInt(form.querySelector('[name="edad"]')?.value) || null,
            peso: parseFloat(form.querySelector('[name="peso"]')?.value) || null,
            altura: parseFloat(form.querySelector('[name="altura"]')?.value) || null,
            tipoCuerpo: tipoCuerpoRadio ? tipoCuerpoRadio.value : null,
            areaPrincipal: form.querySelector('[name="areaPrincipal"]')?.value || null,
            tipoUsuario: form.querySelector('[name="tipoUsuario"]')?.value || null,
            ingresos: [],
            deudas: [],
            opcionesActivas: {}
        };
        if (!data.areaPrincipal) data.areaPrincipal = null;
        if (!data.tipoUsuario) data.tipoUsuario = null;

        // Collect ingresos
        document.querySelectorAll('#ingresos-list .dynamic-item').forEach(row => {
            const id = row.dataset.id;
            const fuente = row.querySelector(`[name="ing_fuente_${id}"]`)?.value;
            const monto = parseFloat(row.querySelector(`[name="ing_monto_${id}"]`)?.value) || 0;
            const categoria = row.querySelector(`[name="ing_cat_${id}"]`)?.value || '';
            if (fuente || monto) {
                data.ingresos.push({ fuente, monto, categoria });
            }
        });

        // Collect deudas
        document.querySelectorAll('#deudas-list .dynamic-item').forEach(row => {
            const id = row.dataset.id;
            const descripcion = row.querySelector(`[name="deu_desc_${id}"]`)?.value;
            const monto = parseFloat(row.querySelector(`[name="deu_monto_${id}"]`)?.value) || 0;
            const fecha = row.querySelector(`[name="deu_fecha_${id}"]`)?.value || '';
            const porcentaje = parseFloat(row.querySelector(`[name="deu_pct_${id}"]`)?.value) || 0;
            if (descripcion || monto) {
                data.deudas.push({ descripcion, monto, fecha, porcentaje });
            }
        });

        // Collect module options
        document.querySelectorAll('#module-options .module-option').forEach(opt => {
            const key = opt.dataset.module;
            const checked = opt.querySelector('input[type="checkbox"]').checked;
            data.opcionesActivas[key] = checked;
        });

        return data;
    },

    showEditModal() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        UI.showModal('<div id="profile-edit-container"></div>', {
            size: 'lg',
            onReady: () => {
                this.renderForm('profile-edit-container', user, {
                    isSetup: false,
                    onSave: (profileData) => {
                        Auth.updateProfile(profileData);
                        UI.closeModal();
                        UI.toast('Perfil actualizado', 'success');
                        // Refresh sidebar and current page
                        if (typeof App !== 'undefined') {
                            App.renderSidebar();
                            Router.refresh();
                        }
                    }
                });
            }
        });
    }
};
