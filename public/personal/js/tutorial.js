/* ============================================
   TUTORIAL - Tour guiado (primera vez)
   Destaca secciones y muestra descripción breve
   ============================================ */

const Tutorial = {
    KEY_DONE: 'severa_tour_done',

    isDone() {
        try {
            const email = typeof Auth !== 'undefined' ? Auth.getCurrentEmail() : '';
            if (!email) return false;
            const raw = localStorage.getItem(this.KEY_DONE);
            if (!raw) return false;
            const set = JSON.parse(raw);
            return set && set[email] === true;
        } catch (e) { return false; }
    },

    setDone() {
        try {
            const email = typeof Auth !== 'undefined' ? Auth.getCurrentEmail() : '';
            if (!email) return;
            const raw = localStorage.getItem(this.KEY_DONE) || '{}';
            const set = JSON.parse(raw);
            set[email] = true;
            localStorage.setItem(this.KEY_DONE, JSON.stringify(set));
        } catch (e) {}
    },

    STEPS_DASHBOARD: [
        { selector: '#app-sidebar', title: 'Menú principal', body: 'Desde aquí accedes a Calendario, Finanzas, Hábitos, Gratitud, Salud, FODA, Biografía, Ejercicios y más. Usa los enlaces para moverte.' },
        { selector: '.dash-date-nav', title: 'Navegación por fecha', body: 'Cambia el día que estás viendo con las flechas o el botón "Hoy". Todo el dashboard (actividades, hábitos, prioridades) se actualiza según la fecha elegida.' },
        { selector: '.dash-greeting', title: 'Saludo y nombre', body: 'Aquí ves la fecha y tu nombre. El resto del dashboard muestra el progreso y las tareas de ese día.' },
        { selector: '.dash-erp-kpi', title: 'Resumen del día', body: 'Progreso del día, número de actividades, hábitos completados y balance del mes. Los valores se actualizan según marques tareas y hábitos.' },
        { selector: '.dash-focus', title: 'Actividades del día', body: 'Eventos del calendario para esta fecha: medicación, clases, citas. Márcalos al realizarlos. Puedes agregar más desde Calendario.' },
        { selector: '.dash-section-tools', title: 'Herramientas', body: 'Acceso rápido a cada módulo: Calendario, Finanzas, Hábitos, Gratitud, Salud, FODA, Biografía, Ejercicios, etc. Haz clic en el que quieras usar.' }
    ],

    _overlay: null,
    _tooltip: null,
    _currentStep: 0,
    _steps: [],
    _keyHandler: null,

    start(route) {
        if (this.isDone()) return;
        this._steps = route === '#dashboard' ? this.STEPS_DASHBOARD : [];
        if (this._steps.length === 0) return;

        if (this._overlay) {
            this._finish();
        }

        this._currentStep = 0;
        this._createOverlay();
        this._attachGlobalKeyboard();
        this._blurFocusOutsideOverlay();
        this._showStep(0);
    },

    _blurFocusOutsideOverlay() {
        const ae = document.activeElement;
        if (ae && ae !== document.body && this._overlay && !this._overlay.contains(ae)) {
            if (typeof ae.blur === 'function') ae.blur();
        }
    },

    _attachGlobalKeyboard() {
        this._detachGlobalKeyboard();
        this._keyHandler = (e) => {
            if (!this._overlay || !this._overlay.isConnected) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this._finish();
                return;
            }

            if (e.key === 'Enter' && !e.repeat) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const t = e.target;
                if (t && t.id === 'tutorial-close') {
                    this._finish();
                } else {
                    this._advanceStep();
                }
            }
        };
        document.addEventListener('keydown', this._keyHandler, true);
    },

    _detachGlobalKeyboard() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler, true);
            this._keyHandler = null;
        }
    },

    /** Siguiente paso o cerrar en el último (mismo comportamiento que los botones). */
    _advanceStep() {
        if (this._currentStep >= this._steps.length - 1) {
            this._finish();
            return;
        }
        this._currentStep += 1;
        this._showStep(this._currentStep);
    },

    _createOverlay() {
        this._overlay = document.createElement('div');
        this._overlay.id = 'tutorial-overlay';
        this._overlay.className = 'tutorial-overlay';
        this._overlay.setAttribute('role', 'dialog');
        this._overlay.setAttribute('aria-modal', 'true');
        this._overlay.setAttribute('aria-label', 'Tutorial del dashboard');
        this._overlay.innerHTML = '<div class="tutorial-spotlight" aria-hidden="true"></div><div id="tutorial-tooltip" class="tutorial-tooltip" tabindex="-1"></div>';
        const self = this;
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) {
                e.preventDefault();
                self._finish();
            }
        });
        document.body.appendChild(this._overlay);
        this._tooltip = document.getElementById('tutorial-tooltip');
    },

    _showStep(index) {
        if (index >= this._steps.length) {
            this._finish();
            return;
        }
        const step = this._steps[index];
        const el = document.querySelector(step.selector);
        const spotlight = this._overlay.querySelector('.tutorial-spotlight');
        if (!spotlight || !this._tooltip) {
            this._finish();
            return;
        }

        if (el) {
            spotlight.style.display = '';
            const rect = el.getBoundingClientRect();
            spotlight.style.cssText = `display:block;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;`;
            spotlight.classList.add('visible');
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (err) {}
        } else {
            spotlight.classList.remove('visible');
            spotlight.style.cssText = 'display:none;';
        }

        const isLast = index === this._steps.length - 1;
        const missingHint = !el ? '<p class="tutorial-tooltip-missing text-secondary text-xs mb-sm">No se encontró este bloque en la vista; puedes seguir con el texto de ayuda.</p>' : '';

        this._tooltip.innerHTML = `
            <div class="tutorial-tooltip-content">
                <h4 class="tutorial-tooltip-title">${UI.esc(step.title)}</h4>
                ${missingHint}
                <p class="tutorial-tooltip-body">${UI.esc(step.body)}</p>
                <div class="tutorial-tooltip-actions">
                    <button type="button" id="tutorial-close" class="btn btn-ghost btn-sm">Cerrar</button>
                    ${isLast ? '<button type="button" id="tutorial-next" class="btn btn-primary btn-sm">Listo</button>' : '<button type="button" id="tutorial-next" class="btn btn-primary btn-sm">Siguiente</button>'}
                </div>
            </div>
        `;

        const self = this;
        const bindNav = () => {
            const closeBtn = document.getElementById('tutorial-close');
            const nextBtn = document.getElementById('tutorial-next');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    self._finish();
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    self._advanceStep();
                });
            }
        };

        requestAnimationFrame(() => {
            bindNav();
            self._blurFocusOutsideOverlay();
            const nextBtn = document.getElementById('tutorial-next');
            if (nextBtn) {
                nextBtn.focus();
            } else if (self._tooltip) {
                self._tooltip.focus();
            }
        });
    },

    _finish() {
        this._detachGlobalKeyboard();
        this.setDone();
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
        this._overlay = null;
        this._tooltip = null;

        const ae = document.activeElement;
        if (ae && (ae.classList?.contains('tutorial-tooltip') || ae.closest?.('#tutorial-overlay'))) {
            if (typeof ae.blur === 'function') ae.blur();
        }
    }
};
