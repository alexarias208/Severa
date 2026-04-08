/* ============================================
   LOGIN PAGE - Landing Severa Lab + Login + Multi-step Registration
   ============================================
   Acceso rápido (solo desarrollo): pon DEV_QUICK_LOGIN = true y abre con ?dev=1
   o ejecuta localStorage.setItem('severa_dev','1'). Crea/usa demo@severa.local.
   En producción debe permanecer false.
   ============================================ */

const DEV_QUICK_LOGIN = false;

const LoginPage = {
    currentStep: 0,
    mode: 'login', // 'login', 'register' (en personal la landing es LandingPage)
    regData: {},

    render(container) {
        const route = (window.location.hash || '#login').split('?')[0];
        if (route === '#register') {
            this.mode = 'register';
            this.currentStep = 0;
            this.regData = {};
            this._renderRegisterStep(container);
            return;
        }
        this.mode = 'login';
        this._renderLogin(container);
    },

    _renderLanding(container) {
        container.innerHTML = `
            <div class="auth-card landing-card" style="max-width: 520px;">
                <div class="auth-logo landing-logo">
                    <div class="landing-spiral" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" width="56" height="56">
                            <path d="M12 2 C12 2 4 6 4 12 C4 18 12 22 12 22 C12 22 20 18 20 12 C20 6 12 2 12 2Z" stroke="currentColor" stroke-width="1.8" fill="none"/>
                            <path d="M12 5 C12 5 8 7.5 8 12 C8 16.5 12 19 12 19" stroke="var(--accent-orange)" stroke-width="1.2" fill="none"/>
                        </svg>
                    </div>
                    <h1 style="margin: 0.5rem 0 0; font-size: 1.9rem; letter-spacing: 0.05em;">SEVERA LAB</h1>
                    <p class="text-secondary" style="margin: 0.5rem 0 0; font-size: 0.95rem;">Pronto más divisiones</p>
                    <p style="margin: 1.25rem 0 0; font-size: 1rem; line-height: 1.5; color: var(--text-secondary); max-width: 400px;">
                        Herramienta de uso <strong style="color: var(--text-primary);">personal y profesional</strong>. Organiza tu día, finanzas, hábitos, estudios y más en un solo lugar.
                    </p>
                </div>
                <div class="auth-question" style="margin-top: 2rem;">
                    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">¿Qué quieres hacer?</h2>
                    <div class="auth-buttons" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button id="btn-landing-login" class="btn btn-success btn-xl btn-block">Iniciar sesión</button>
                        <button id="btn-landing-register" class="btn btn-primary btn-xl btn-block">Crear cuenta</button>
                    </div>
                </div>
            </div>
        `;
        UI.bindButton('btn-landing-login', () => {
            this.mode = 'login';
            this._renderLogin(container);
        });
        UI.bindButton('btn-landing-register', () => {
            this.mode = 'register';
            this._renderRegisterStep(container);
        });
    },

    _renderAsk(container) {
        container.innerHTML = `
            <div class="auth-card">
                <div class="auth-logo">
                    <h1>Severa</h1>
                    <p>¿Estás registrado?</p>
                </div>
                <div class="auth-question">
                    <h2>¿Tienes ya una cuenta?</h2>
                    <div class="auth-buttons">
                        <button id="btn-has-account" class="btn btn-success btn-xl">Sí</button>
                        <button id="btn-no-account" class="btn btn-primary btn-xl">No</button>
                    </div>
                </div>
                <div class="text-center mt-md">
                    <button id="btn-ask-back-landing" class="btn btn-ghost btn-sm">← Volver al inicio</button>
                </div>
            </div>
        `;
        UI.bindButton('btn-has-account', () => this._renderLogin(container));
        UI.bindButton('btn-no-account', () => this._renderRegisterStep(container));
        UI.bindButton('btn-ask-back-landing', () => this._renderLanding(container));
    },

    _isDevQuickLoginEnabled() {
        if (!DEV_QUICK_LOGIN) return false;
        try {
            if (new URLSearchParams(window.location.search).get('dev') === '1') return true;
            if (localStorage.getItem('severa_dev') === '1') return true;
        } catch (e) {}
        return false;
    },

    _renderLogin(container) {
        this.mode = 'login';
        const showDev = this._isDevQuickLoginEnabled();
        container.innerHTML = `
            <div class="auth-card auth-card--register">
                <div class="auth-logo">
                    <h1>Iniciar sesión</h1>
                    <p>Ingresa con tu cuenta</p>
                </div>
                <div id="login-error"></div>
                <form id="login-form">
                    ${UI.formGroup('Correo / Usuario', UI.input('email', { placeholder: 'tu@correo.com', required: true, extra: 'autocomplete="username" inputmode="email"' }))}
                    ${UI.formGroup('Contraseña', UI.input('password', { type: 'password', placeholder: '••••••', required: true, extra: 'autocomplete="current-password"' }))}
                    <button type="submit" class="btn btn-success btn-lg btn-block mt-md">Iniciar Sesión</button>
                </form>
                <div id="login-dev-quick" class="text-center mt-md" style="display:${showDev ? 'block' : 'none'}">
                    <button type="button" id="btn-dev-quick-login" class="btn btn-ghost btn-sm">Acceso rápido demo (solo desarrollo)</button>
                </div>
                <div class="text-center mt-lg">
                    <button id="btn-go-register" class="btn btn-ghost">¿No tienes cuenta? Regístrate</button>
                </div>
                <div class="text-center mt-sm">
                    <a href="#landing" id="btn-go-back" class="btn btn-ghost btn-sm">← Volver al inicio</a>
                </div>
            </div>
        `;

        UI.bindButton('btn-go-register', () => {
            window.location.hash = '#register';
            Router.navigate();
        });
        container.querySelector('#btn-go-back')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#landing';
            Router.navigate();
        });

        if (showDev) {
            UI.bindButton('btn-dev-quick-login', async () => {
                const email = 'demo@severa.local';
                const password = 'demo';
                let user = Storage.getUser(email);
                if (!user) {
                    const res = await Auth.register(email, password, {
                        nombre: 'Demo',
                        genero: 'otro',
                        opcionesActivas: {
                            biblia: true, habitos: true, ejercicios: true, estudios: true,
                            gastosCompartidos: false, juegos: true, documentos: true,
                            cicloMenstrual: false, diario: true, gratitud: true, salud: true,
                            biografia: true, viajes: true
                        }
                    });
                    if (!res.success) {
                        UI.toast(res.error, 'error');
                        return;
                    }
                    const users = Storage.getUsers();
                    if (users[email]) {
                        users[email].configuracionCompleta = true;
                        users[email].perfil.nombre = 'Demo';
                        Storage.saveUsers(users);
                    }
                }
                const result = await Auth.login(email, password);
                if (result.success) {
                    UI.toast('Sesión demo (desarrollo)', 'success');
                    window.location.hash = '#select-profile';
                    if (typeof Router !== 'undefined') Router.forceRender('#select-profile');
                    if (typeof App !== 'undefined') {
                        App.renderHeader();
                        App.renderSidebar();
                        App.renderBottomNav();
                    }
                }
            });
        }

        UI.bindForm('login-form', async (data) => {
            const errorDiv = document.getElementById('login-error');
            const result = await Auth.login(data.email, data.password);
            if (result.success) {
                UI.toast(`Bienvenido, ${result.user.perfil?.nombre || result.user.email}`, 'success');
                Router.navigate();
            } else {
                errorDiv.innerHTML = `<div class="auth-error">${result.error}</div>`;
            }
        });

    },

    _scrollAuthToRegisterError() {
        requestAnimationFrame(() => {
            const auth = document.getElementById('auth-screen');
            const err = document.getElementById('register-error');
            if (err && err.firstElementChild) err.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (auth) auth.scrollTop = Math.min(auth.scrollHeight - auth.clientHeight, auth.scrollTop + 80);
        });
    },

    _renderRegisterStep(container) {
        this.mode = 'register';
        const totalSteps = 2;

        container.innerHTML = `
            <div class="auth-card auth-card--register">
                <div class="auth-logo">
                    <h1>Crear cuenta</h1>
                    <p>Paso ${this.currentStep + 1} de ${totalSteps}</p>
                </div>
                <div class="steps-bar">
                    ${Array.from({ length: totalSteps }, (_, i) => `
                        <div class="step-indicator ${i < this.currentStep ? 'completed' : ''} ${i === this.currentStep ? 'active' : ''}"></div>
                    `).join('')}
                </div>
                <div id="register-error"></div>
                <div id="step-container"></div>
                <div class="step-nav" style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <button id="btn-step-back" class="btn btn-secondary" ${this.currentStep === 0 ? 'style="visibility:hidden"' : ''}>← Anterior</button>
                    <button id="btn-step-next" class="btn btn-primary">${this.currentStep === totalSteps - 1 ? 'Crear cuenta' : 'Siguiente →'}</button>
                </div>
                <div class="text-center mt-sm">
                    <button id="btn-register-back-landing" class="btn btn-ghost btn-sm">← Volver al inicio</button>
                </div>
            </div>
        `;

        this._renderStepContent(this.currentStep);

        UI.bindButton('btn-register-back-landing', () => {
            window.location.hash = '#landing';
            Router.navigate();
        });

        UI.bindButton('btn-step-back', () => {
            if (this.currentStep > 0) {
                this._saveStepData();
                this.currentStep--;
                this._renderRegisterStep(container);
            }
        });

        UI.bindButton('btn-step-next', async () => {
            this._saveStepData();
            const errorDiv = document.getElementById('register-error');
            errorDiv.innerHTML = '';

            if (this.currentStep === 0) {
                if (!this.regData.nombre?.trim()) {
                    errorDiv.innerHTML = '<div class="auth-error">El nombre es obligatorio</div>';
                    this._scrollAuthToRegisterError();
                    return;
                }
                if (!this.regData.genero) {
                    errorDiv.innerHTML = '<div class="auth-error">Selecciona tu género</div>';
                    this._scrollAuthToRegisterError();
                    return;
                }
                if (!this.regData.email?.trim()) {
                    errorDiv.innerHTML = '<div class="auth-error">El correo es obligatorio</div>';
                    this._scrollAuthToRegisterError();
                    return;
                }
                if (!this.regData.password || this.regData.password.length < 3) {
                    errorDiv.innerHTML = '<div class="auth-error">La contraseña debe tener al menos 3 caracteres</div>';
                    this._scrollAuthToRegisterError();
                    return;
                }
                this.currentStep++;
                this._renderRegisterStep(container);
                return;
            }

            if (this.currentStep === 1) {
                if (!this.regData.objetivoPrincipal) {
                    this.regData.objetivoPrincipal = 'todo';
                    this._applySuggestedModulesForObjective();
                }

                const result = await Auth.register(this.regData.email, this.regData.password, {
                    nombre: this.regData.nombre,
                    genero: this.regData.genero,
                    edad: this.regData.edad,
                    objetivoPrincipal: this.regData.objetivoPrincipal || null,
                    opcionesActivas: this.regData.opcionesActivas || {}
                });

                if (result.success) {
                    UI.toast('¡Cuenta creada exitosamente!', 'success');
                    window.location.hash = '#setup';
                    if (typeof Router !== 'undefined') Router.forceRender('#setup');
                } else {
                    errorDiv.innerHTML = `<div class="auth-error">${result.error}</div>`;
                    this._scrollAuthToRegisterError();
                }
            }
        });
    },

    _renderStepContent(step) {
        const stepContainer = document.getElementById('step-container');
        if (!stepContainer) return;

        switch (step) {
            case 0:
                stepContainer.innerHTML = `
                    <h3 class="step-title">Tu cuenta</h3>
                    <p class="text-secondary text-sm mb-md">Nombre, acceso y opcionalmente tu edad.</p>
                    ${UI.formGroup('Nombre', UI.input('reg_nombre', { value: this.regData.nombre || '', placeholder: 'Tu nombre', required: true }))}
                    ${UI.formGroup('Género', UI.select('reg_genero', [
                        { value: '', label: 'Seleccionar' },
                        { value: 'hombre', label: 'Hombre' },
                        { value: 'mujer', label: 'Mujer' },
                        { value: 'otro', label: 'Otro' }
                    ], this.regData.genero || ''))}
                    ${UI.formGroup('Edad (opcional)', UI.input('reg_edad', { type: 'number', value: this.regData.edad || '', placeholder: 'Años', min: 1, max: 120 }))}
                    ${UI.formGroup('Correo', UI.input('reg_email', { type: 'email', value: this.regData.email || '', placeholder: 'tu@correo.com', required: true, extra: 'autocomplete="email" inputmode="email"' }))}
                    ${UI.formGroup('Contraseña', UI.input('reg_password', { type: 'password', value: this.regData.password || '', placeholder: 'Mínimo 3 caracteres', required: true, extra: 'autocomplete="new-password"' }))}
                    <button type="button" id="btn-gen-pass" class="btn btn-ghost btn-sm">Generar contraseña temporal</button>
                `;
                UI.bindButton('btn-gen-pass', () => {
                    const pass = Math.random().toString(36).substring(2, 10);
                    const input = document.getElementById('input-reg_password');
                    if (input) {
                        input.value = pass;
                        input.type = 'text';
                    }
                    UI.toast(`Contraseña generada: ${pass}`, 'info', 6000);
                });
                break;

            case 1:
                if (!this.regData.objetivoPrincipal) this.regData.objetivoPrincipal = 'todo';
                this._applySuggestedModulesForObjective();
                const suggestedLabels = this._getSuggestedModuleLabels();
                const obj = this.regData.objetivoPrincipal || 'todo';
                stepContainer.innerHTML = `
                    <h3 class="step-title">¿Qué te gustaría organizar?</h3>
                    <p class="text-secondary text-sm mb-md">Elige una opción y activaremos los módulos recomendados. Puedes personalizarlos después si quieres.</p>
                    <div class="reg-objective-options" id="reg-objective-options">
                        <label class="reg-objective-option ${obj === 'dia' ? 'selected' : ''}" data-value="dia">
                            <input type="radio" name="reg_objetivo" value="dia" ${obj === 'dia' ? 'checked' : ''}>
                            <div>
                                <span class="label">Organizar mi día</span>
                                <p class="desc">Calendario, hábitos, tareas y recordatorios.</p>
                            </div>
                        </label>
                        <label class="reg-objective-option ${obj === 'finanzas' ? 'selected' : ''}" data-value="finanzas">
                            <input type="radio" name="reg_objetivo" value="finanzas" ${obj === 'finanzas' ? 'checked' : ''}>
                            <div>
                                <span class="label">Finanzas y hábitos</span>
                                <p class="desc">Gastos, ingresos, deudas y seguimiento de hábitos.</p>
                            </div>
                        </label>
                        <label class="reg-objective-option ${obj === 'salud' ? 'selected' : ''}" data-value="salud">
                            <input type="radio" name="reg_objetivo" value="salud" ${obj === 'salud' ? 'checked' : ''}>
                            <div>
                                <span class="label">Salud y ejercicio</span>
                                <p class="desc">Rutinas, peso, alimentación y bienestar.</p>
                            </div>
                        </label>
                        <label class="reg-objective-option ${obj === 'trabajo' ? 'selected' : ''}" data-value="trabajo">
                            <input type="radio" name="reg_objetivo" value="trabajo" ${obj === 'trabajo' ? 'checked' : ''}>
                            <div>
                                <span class="label">Trabajo y estudios</span>
                                <p class="desc">Documentos, estudios, proyectos y Modo Trabajo.</p>
                            </div>
                        </label>
                        <label class="reg-objective-option ${obj === 'todo' ? 'selected' : ''}" data-value="todo">
                            <input type="radio" name="reg_objetivo" value="todo" ${obj === 'todo' ? 'checked' : ''}>
                            <div>
                                <span class="label">Explorar todo</span>
                                <p class="desc">Quiero ver todas las opciones y elegir después.</p>
                            </div>
                        </label>
                    </div>
                    <div class="reg-summary mt-md" id="reg-modules-summary">
                        <p class="text-secondary text-sm mb-0"><strong class="reg-summary-label">Módulos activados:</strong> ${suggestedLabels}</p>
                        <p class="text-secondary text-xs mt-xs mb-0">Puedes cambiarlo en tu perfil cuando quieras.</p>
                    </div>
                    <details class="reg-personalize-details mt-md" id="reg-personalize-details">
                        <summary class="reg-personalize-summary">Personalizar módulos (opcional)</summary>
                        <div class="reg-personalize-inner mt-sm" id="reg-personalize-inner">
                            ${this._renderRegisterModuleCards()}
                        </div>
                    </details>
                `;
                stepContainer.querySelectorAll('.reg-objective-option').forEach(lbl => {
                    lbl.addEventListener('click', () => {
                        stepContainer.querySelectorAll('.reg-objective-option').forEach(o => o.classList.remove('selected'));
                        lbl.classList.add('selected');
                        this.regData.objetivoPrincipal = lbl.dataset.value;
                        this._applySuggestedModulesForObjective();
                        const summaryEl = document.getElementById('reg-modules-summary');
                        if (summaryEl) {
                            const firstP = summaryEl.querySelector('p');
                            if (firstP) firstP.innerHTML = `<strong class="reg-summary-label">Módulos activados:</strong> ${this._getSuggestedModuleLabels()}`;
                        }
                        const innerEl = document.getElementById('reg-personalize-inner');
                        if (innerEl) {
                            innerEl.innerHTML = this._renderRegisterModuleCards();
                            innerEl.querySelectorAll('.module-card-personalize').forEach(card => {
                                card.addEventListener('click', () => {
                                    const cb = card.querySelector('input[type="checkbox"]');
                                    if (!cb) return;
                                    cb.checked = !cb.checked;
                                    card.classList.toggle('selected', cb.checked);
                                });
                            });
                        }
                    });
                });
                stepContainer.querySelectorAll('#reg-personalize-inner .module-card-personalize').forEach(card => {
                    card.addEventListener('click', () => {
                        const cb = card.querySelector('input[type="checkbox"]');
                        if (!cb) return;
                        cb.checked = !cb.checked;
                        card.classList.toggle('selected', cb.checked);
                    });
                });
                break;
        }
    },

    /** Módulos sugeridos por objetivo (solo keys). gastosCompartidos off por defecto. */
    _getSuggestedModuleKeys(objetivo) {
        const map = {
            dia: ['habitos', 'gratitud', 'diario', 'juegos'],
            finanzas: ['habitos', 'gastosCompartidos', 'documentos'],
            salud: ['ejercicios', 'salud', 'habitos', 'gratitud'],
            trabajo: ['documentos', 'estudios', 'habitos'],
            todo: ['habitos', 'ejercicios', 'estudios', 'documentos', 'gratitud', 'diario', 'salud', 'juegos', 'biblia']
        };
        return map[objetivo] || map.todo;
    },

    _applySuggestedModulesForObjective() {
        const obj = this.regData.objetivoPrincipal || 'todo';
        const keysOn = this._getSuggestedModuleKeys(obj);
        const allKeys = ['biblia', 'habitos', 'ejercicios', 'estudios', 'gastosCompartidos', 'juegos', 'documentos', 'cicloMenstrual', 'diario', 'gratitud', 'salud', 'foda', 'registroIntimo', 'biografia', 'viajes'];
        this.regData.opcionesActivas = {};
        allKeys.forEach(k => { this.regData.opcionesActivas[k] = keysOn.includes(k); });
    },

    _getSuggestedModuleLabels() {
        const labels = {
            biblia: 'Biblia', habitos: 'Hábitos', ejercicios: 'Ejercicios', estudios: 'Estudios',
            gastosCompartidos: 'Gastos compartidos', juegos: 'Juegos', documentos: 'Documentos',
            cicloMenstrual: 'Ciclo menstrual', diario: 'Diario', gratitud: 'Gratitud', salud: 'Salud'
        };
        const opts = this.regData.opcionesActivas || {};
        const active = Object.keys(opts).filter(k => opts[k]).map(k => labels[k] || k);
        return active.length ? active.join(', ') : 'ninguno';
    },

    _renderRegisterModuleCards() {
        const modules = [
            { key: 'biblia', label: 'Biblia / Religión', desc: 'Avance de lectura, versículos favoritos, reflexiones por pasaje.' },
            { key: 'habitos', label: 'Hábitos', desc: 'Lista de hábitos diarios, rachas, registro por fecha.' },
            { key: 'ejercicios', label: 'Ejercicios', desc: 'Sesiones, rutinas, peso y repeticiones por ejercicio.' },
            { key: 'estudios', label: 'Estudios', desc: 'Ramos o cursos, pruebas, fechas y notas.' },
            { key: 'gastosCompartidos', label: 'Gastos Compartidos', desc: 'Participantes, gastos repartidos, quién pagó qué.' },
            { key: 'juegos', label: 'Juegos', desc: 'Palabra del día, crucigramas, sudoku, historial.' },
            { key: 'documentos', label: 'Documentos', desc: 'Grupos de archivos y notas que tú organices.' },
            { key: 'cicloMenstrual', label: 'Ciclo Menstrual', desc: 'Registro de ciclo, síntomas, encuentros.' },
            { key: 'diario', label: 'Diario de Vida', desc: 'Entradas por día, cómo fue el día, actividades.' },
            { key: 'gratitud', label: 'Gratitud', desc: 'Lista de cosas por las que estás agradecido, por fecha.' },
            { key: 'salud', label: 'Salud', desc: 'Enfermedades, medicamentos, síntomas, toma de medicación.' }
        ];
        const saved = this.regData.opcionesActivas || {};
        return modules.map(m => {
            const checked = m.key === 'gastosCompartidos' ? saved[m.key] === true : saved[m.key] !== false;
            return `
                <div class="module-option module-card-personalize ${checked ? 'selected' : ''}" data-module="${m.key}">
                    <div class="module-card-check" aria-hidden="true"></div>
                    <input type="checkbox" name="reg_mod_${m.key}" ${checked ? 'checked' : ''} class="sr-only" aria-label="Activar ${UI.esc(m.label)}">
                    <div class="module-card-body">
                        <h4>${UI.esc(m.label)}</h4>
                        <p class="module-card-desc">${UI.esc(m.desc)}</p>
                    </div>
                </div>
            `;
        }).join('');
    },

    _saveStepData() {
        switch (this.currentStep) {
            case 0:
                this.regData.nombre = document.getElementById('input-reg_nombre')?.value?.trim() || '';
                this.regData.genero = document.getElementById('input-reg_genero')?.value || '';
                this.regData.edad = parseInt(document.getElementById('input-reg_edad')?.value) || null;
                this.regData.email = document.getElementById('input-reg_email')?.value?.trim() || '';
                this.regData.password = document.getElementById('input-reg_password')?.value || '';
                break;
            case 1:
                this.regData.objetivoPrincipal = document.querySelector('input[name="reg_objetivo"]:checked')?.value || null;
                this._applySuggestedModulesForObjective();
                const personalizeInner = document.getElementById('reg-personalize-inner');
                if (personalizeInner) {
                    personalizeInner.querySelectorAll('.module-card-personalize').forEach(card => {
                        const key = card.dataset.module;
                        const cb = card.querySelector('input[type="checkbox"]');
                        if (key && cb) this.regData.opcionesActivas[key] = cb.checked;
                    });
                }
                break;
        }
    }
};
