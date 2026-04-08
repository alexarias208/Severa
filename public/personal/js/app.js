/* ============================================
   APP.JS - Main Orchestrator
   Dashboard-centric navigation (no sidebar)
   ============================================ */

const App = {
    async init() {
        if (typeof Logger !== 'undefined' && Logger.init) {
            Logger.init({ max: 100 });
        }
        if (typeof FeatureFlags !== 'undefined' && FeatureFlags.init) {
            FeatureFlags.init();
        }
        const _t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        // Load Tauri SQLite data first if in Tauri
        if (typeof TauriStorage !== 'undefined' && TauriStorage.isTauri()) {
            await TauriStorage.init();
            // Auto-save cada 30 s
            setInterval(() => TauriStorage.saveNow(), 30000);
            // Menú nativo
            await this._initTauriMenu();
        }

        // Initialize auth (creates manager if needed)
        await Auth.init();

        // Initialize IndexedDB (no bloquear arranque si falla, p. ej. en file:// o modo privado)
        try {
            await Storage.initDB();
        } catch (e) {
            if (typeof Logger !== 'undefined' && Logger.warn) Logger.warn('IndexedDB no disponible:', e);
            else console.warn('IndexedDB no disponible:', e);
        }

        // Initialize global modules config
        Storage.getModulesGlobal();

        // Register routes
        this._registerRoutes();

        // Bind global events
        this._bindGlobalEvents();

        // Start router (mostrar login o dashboard)
        try {
            Router.init();
            const _t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            if (typeof Logger !== 'undefined' && Logger.info) Logger.info('[Perf] App.init → Router.init (ms):', Math.round(_t1 - _t0));
        } catch (e) {
            if (typeof Logger !== 'undefined' && Logger.error) Logger.error('Router init error:', e);
            else console.error('Router init error:', e);
            const authScreen = document.getElementById('auth-screen');
            const shell = document.getElementById('app-shell');
            if (shell) shell.classList.add('hidden');
            if (authScreen && typeof LoginPage !== 'undefined') {
                authScreen.style.display = 'flex';
                authScreen.style.visibility = 'visible';
                authScreen.classList.add('auth-screen--scroll-top');
                LoginPage.render(authScreen);
            } else {
                throw e;
            }
        }

        // Estado retráctil de la barra lateral (solo escritorio)
        this._applySidebarCollapsedState();
        this._bindSidebarToggle();

        // Render header, sidebar (escritorio) y bottom nav si está logueado
        if (Auth.isLoggedIn()) {
            this.renderHeader();
            this.renderSidebar();
            this.renderBottomNav();
        }
    },

    _applySidebarCollapsedState() {
        const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        const shell = document.getElementById('app-shell');
        if (!shell) return;
        if (collapsed) shell.classList.add('sidebar-collapsed');
        else shell.classList.remove('sidebar-collapsed');
        this._syncSidebarExpandButton();
    },

    _syncSidebarExpandButton() {
        const shell = document.getElementById('app-shell');
        const expandBtn = document.getElementById('btn-sidebar-expand');
        if (!shell || !expandBtn) return;
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
        if (isDesktop && shell.classList.contains('sidebar-collapsed')) {
            expandBtn.classList.remove('hidden');
        } else {
            expandBtn.classList.add('hidden');
        }
    },

    _bindSidebarToggle() {
        const shell = document.getElementById('app-shell');
        const collapseBtn = document.getElementById('btn-sidebar-collapse');
        const expandBtn = document.getElementById('btn-sidebar-expand');
        if (!shell || !collapseBtn || !expandBtn) return;

        collapseBtn.addEventListener('click', () => {
            shell.classList.add('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', 'true');
            this._syncSidebarExpandButton();
        });
        expandBtn.addEventListener('click', () => {
            shell.classList.remove('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', 'false');
            this._syncSidebarExpandButton();
        });
    },

    async _initTauriMenu() {
        if (!window.__TAURI__?.menu) return;
        try {
            const { Menu, Submenu, MenuItem } = window.__TAURI__.menu;
            const exportItem = await MenuItem.new({
                id: 'export',
                text: 'Exportar',
                action: () => document.getElementById('btn-export')?.click()
            });
            const aboutItem = await MenuItem.new({
                id: 'about',
                text: 'Sobre Severa',
                action: () => UI.showModal('<p>Severa - Mi Plataforma Personal</p><p>Versión 1.0</p>', { size: 'sm' })
            });
            const fileSub = await Submenu.new({ text: 'Archivo', items: [exportItem] });
            const helpSub = await Submenu.new({ text: 'Ayuda', items: [aboutItem] });
            const appMenu = await Menu.new({ items: [fileSub, helpSub] });
            await appMenu.setAsAppMenu();
        } catch (e) {
            if (typeof Logger !== 'undefined' && Logger.warn) Logger.warn('Tauri menu init failed', e);
            else console.warn('Tauri menu init failed', e);
        }
    },

    _registerRoutes() {
        // Auth routes
        Router.register('#landing', (c) => LandingPage.render(c));
        Router.register('#login', (c) => LoginPage.render(c));
        Router.register('#register', (c) => LoginPage.render(c));
        Router.register('#setup', (c) => this._renderSetup(c));
        Router.register('#select-profile', (c) => SelectProfilePage.render(c));

        // Main dashboard (home)
        Router.register('#dashboard', (c) => DashboardPage.render(c));

        // Module pages (back button added via UI.pageTitle)
        Router.register('#calendar', (c) => CalendarPage.render(c));
        Router.register('#finance', (c) => FinancePage.render(c));
        Router.register('#shared-expenses', (c) => SharedExpensesPage.render(c), { moduleKey: 'gastosCompartidos' });
        Router.register('#summary', (c) => SummaryPage.render(c));
        Router.register('#studies', (c) => StudiesPage.render(c), { moduleKey: 'estudios' });
        Router.register('#religion', async (c) => {
            c.innerHTML = UI.emptyState('Cargando Biblia…', '📖');
            if (typeof ScriptLoader !== 'undefined' && ScriptLoader.loadAll) {
                await ScriptLoader.loadAll([
                    'js/data/biblia-embed.js',
                    'js/pages/religion.js'
                ]);
            }
            if (typeof ReligionPage !== 'undefined' && ReligionPage && ReligionPage.render) {
                return ReligionPage.render(c);
            }
            UI.toast('No se pudo cargar el módulo Biblia.', 'error');
        }, { moduleKey: 'biblia' });
        Router.register('#cycle', (c) => CyclePage.render(c), { moduleKey: 'cicloMenstrual' });
        Router.register('#habits', (c) => HabitsPage.render(c), { moduleKey: 'habitos' });
        Router.register('#exercises', (c) => ExercisesPage.render(c), { moduleKey: 'ejercicios' });
        Router.register('#games', (c) => GamesPage.render(c), { moduleKey: 'juegos' });
        Router.register('#documents', (c) => DocumentsPage.render(c), { moduleKey: 'documentos' });
        Router.register('#diary', (c) => DiaryPage.render(c), { moduleKey: 'diario' });
        Router.register('#foda', (c) => FodaPage.render(c), { moduleKey: 'foda' });
        Router.register('#intimate', (c) => IntimatePage.render(c), { moduleKey: 'registroIntimo' });
        Router.register('#gratitud', (c) => GratitudPage.render(c), { moduleKey: 'gratitud' });
        Router.register('#salud', (c) => SaludPage.render(c), { moduleKey: 'salud' });
        Router.register('#biografia', (c) => BiografiaPage.render(c), { moduleKey: 'biografia' });
        Router.register('#viajes', (c) => ViajesPage.render(c), { moduleKey: 'viajes' });
        Router.register('#settings', (c) => SettingsPage.render(c));

        // Manager routes
        Router.register('#manager', (c) => Manager.render(c), { managerOnly: true });
    },

    _initTheme() {
        const saved = (typeof Storage !== 'undefined' && Storage._get ? Storage._get('plataforma_theme') : null) || localStorage.getItem('plataforma_theme') || 'dark';
        const theme = ['dark', 'light', 'pink', 'blue'].includes(saved) ? saved : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        if (typeof Storage !== 'undefined' && Storage._set) Storage._set('plataforma_theme', theme);
        else localStorage.setItem('plataforma_theme', theme);
        this._updateThemeIcons();
        // Re-render charts when theme changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'plataforma_theme') {
                setTimeout(() => {
                    if (Router.currentRoute) Router.refresh();
                }, 100);
            }
        });
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const themes = ['dark', 'light', 'pink', 'blue'];
        const currentIdx = themes.indexOf(current);
        const nextIdx = (currentIdx + 1) % themes.length;
        const nextTheme = themes[nextIdx];
        document.documentElement.setAttribute('data-theme', nextTheme);
        if (typeof Storage !== 'undefined' && Storage._set) Storage._set('plataforma_theme', nextTheme);
        else localStorage.setItem('plataforma_theme', nextTheme);
        this._updateThemeIcons();
        // Refresh charts by triggering a custom event
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextTheme } }));
        // Refresh current page to re-render charts
        setTimeout(() => {
            if (Router.currentRoute) Router.refresh();
        }, 100);
    },

    _updateThemeIcons() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const sun = document.getElementById('theme-icon-sun');
        const moon = document.getElementById('theme-icon-moon');
        if (sun && moon) {
            const isLight = theme === 'light' || theme === 'pink';
            sun.classList.toggle('hidden', !isLight);
            moon.classList.toggle('hidden', isLight);
        }
    },

    _updateViewport() {
        const desktop = window.matchMedia('(min-width: 1024px)').matches;
        document.documentElement.setAttribute('data-view', desktop ? 'desktop' : 'mobile');
        this._isDesktop = desktop;
    },

    _bindGlobalEvents() {
        this._updateViewport();
        window.addEventListener('resize', () => {
            this._updateViewport();
            this._syncSidebarExpandButton();
        });

        // Theme toggle
        this._initTheme();
        UI.bindButton('btn-theme-toggle', () => this.toggleTheme());

        // Header date/time (actualizar cada minuto)
        const updateHeaderDateTime = () => {
            const el = document.getElementById('header-datetime');
            if (!el) return;
            const d = new Date();
            const dateStr = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStr = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            el.textContent = `${dateStr} ${timeStr}`;
        };
        updateHeaderDateTime();
        setInterval(updateHeaderDateTime, 60000);

        // Quick expense: unified form
        UI.bindButton('btn-quick-expense', (e) => {
            if (!Auth.isLoggedIn()) return;
            e.preventDefault();
            e.stopPropagation();
            const email = Auth.getCurrentEmail();
            const globalConfig = Storage.getModulesGlobal();
            this._showUnifiedQuickExpense(email, globalConfig);
        });

        // Quick event button
        UI.bindButton('btn-quick-event', () => {
            if (!Auth.isLoggedIn()) return;
            const email = Auth.getCurrentEmail();
            UI.showModal(`
                <h3 class="modal-title">Evento Rápido</h3>
                <form id="quick-event-form">
                    ${UI.formGroup('Título', UI.input('qev_titulo', { placeholder: 'Título del evento', required: true }))}
                    <div class="form-row">
                        ${UI.formGroup('Fecha', UI.input('qev_fecha', { type: 'date', value: DateUtils.today(), required: true }))}
                        ${UI.formGroup('Hora', UI.input('qev_hora', { type: 'time' }))}
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="btn-qev-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `, {
                size: 'sm',
                onReady: () => {
                    UI.bindButton('btn-qev-cancel', () => UI.closeModal());
                    UI.bindForm('quick-event-form', (fd) => {
                        if (!fd.qev_titulo.trim()) return;
                        const data = Storage.getUserData(email);
                        data.calendario.eventos.push({
                            id: DateUtils.generateId(),
                            titulo: fd.qev_titulo,
                            fecha: fd.qev_fecha || DateUtils.today(),
                            hora: fd.qev_hora || '',
                            tipo: 'General',
                            color: '',
                            completado: false
                        });
                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        UI.toast('Evento creado', 'success');
                        Router.refresh();
                    });
                }
            });
        });

        // Export button
        UI.bindButton('btn-export', async () => {
            if (!Auth.isLoggedIn()) return;
            const email = Auth.getCurrentEmail();
            const data = Storage.getUserData(email);
            if (typeof TauriStorage !== 'undefined' && TauriStorage.isTauri()) {
                const sheets = ExportUtils._buildSheets(data);
                if (Object.keys(sheets).length === 0) {
                    UI.toast('No hay datos para exportar', 'warning');
                    return;
                }
                try {
                    const path = await window.__TAURI__.dialog.save({
                        defaultPath: 'Severa/Exports/export.xlsx',
                        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
                    });
                    if (path) {
                        await window.__TAURI__.core.invoke('export_to_excel', {
                            path,
                            sheetsJson: JSON.stringify(sheets)
                        });
                        UI.toast('Archivo exportado exitosamente', 'success');
                    }
                } catch (e) {
                    if (typeof Logger !== 'undefined' && Logger.error) Logger.error('Export error:', e);
                    else console.error('Export error:', e);
                    UI.toast('Error al exportar', 'error');
                }
            } else {
                ExportUtils.exportDashboard(data);
            }
        });

        // User avatar: menú con Perfil, Configuración y Cerrar sesión
        UI.bindButton('btn-user-avatar', () => {
            if (!Auth.isLoggedIn()) return;
            const user = Auth.getCurrentUser();
            const isViewMode = Auth.isManagerViewMode();

            if (isViewMode) {
                // Manager viendo usuario: modal con volver a Manager, Configuración y Cerrar sesión
                UI.showModal(`
                    <div class="text-center">
                        <div class="user-avatar" style="width:56px;height:56px;font-size:var(--font-2xl);margin:0 auto var(--spacing-md);">
                            ${(user.perfil?.nombre || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <h3 style="margin-bottom:2px;">${UI.esc(user.perfil?.nombre || user.email)}</h3>
                        <p class="text-secondary text-sm">${UI.esc(user.email)}</p>
                        <p class="text-warning mt-sm text-sm">Modo vista (solo lectura)</p>
                    </div>
                    <div class="flex flex-col gap-sm mt-lg">
                        <button id="btn-av-return" class="btn btn-primary btn-block">Volver a Manager</button>
                        <button id="btn-av-settings" class="btn btn-secondary btn-block">Configuración</button>
                        <button id="btn-av-logout" class="btn btn-danger btn-block">Cerrar Sesión</button>
                    </div>
                `, {
                    size: 'sm',
                    onReady: () => {
                        UI.bindButton('btn-av-settings', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            UI.closeModal();
                            window.location.hash = '#settings';
                        });
                        UI.bindButton('btn-av-logout', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            UI.closeModal();
                            Auth.logout();
                        });
                        UI.bindButton('btn-av-return', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            UI.closeModal();
                            Manager.returnToManager();
                        });
                    }
                });
                return;
            }

            // Usuario normal: menú con Editar perfil, Configuración y Cerrar sesión
            UI.showModal(`
                <div class="text-center">
                    <div class="user-avatar" style="width:56px;height:56px;font-size:var(--font-2xl);margin:0 auto var(--spacing-md);">
                        ${(user.perfil?.nombre || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <h3 style="margin-bottom:2px;">${UI.esc(user.perfil?.nombre || user.email)}</h3>
                    <p class="text-secondary text-sm">${UI.esc(user.email)}</p>
                </div>
                <div class="flex flex-col gap-sm mt-lg">
                    <button id="btn-av-profile" class="btn btn-primary btn-block">Editar perfil</button>
                    <button id="btn-av-settings" class="btn btn-secondary btn-block">Configuración</button>
                    <button id="btn-av-logout" class="btn btn-danger btn-block">Cerrar Sesión</button>
                </div>
            `, {
                size: 'sm',
                onReady: () => {
                    UI.bindButton('btn-av-profile', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        UI.closeModal();
                        Profile.showEditModal();
                    });
                    UI.bindButton('btn-av-settings', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        UI.closeModal();
                        window.location.hash = '#settings';
                    });
                    UI.bindButton('btn-av-logout', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        UI.closeModal();
                        Auth.logout();
                    });
                }
            });
        });

        // Header, sidebar y bottom nav se actualizan al cambiar de ruta
        window.addEventListener('hashchange', () => {
            if (Auth.isLoggedIn()) {
                this.renderHeader();
                this.renderSidebar();
                this.renderBottomNav();
            }
        });
    },

    renderBottomNav() {
        const nav = document.getElementById('bottom-nav');
        if (!nav) return;
        const route = (window.location.hash || '').split('?')[0];
        const isAuthScreen = route === '#login' || route === '#register' || route === '#setup' || route === '#select-profile';
        if (!Auth.isLoggedIn() || isAuthScreen) {
            nav.classList.add('hidden');
            nav.innerHTML = '';
            return;
        }
        nav.classList.remove('hidden');
        const user = Auth.getCurrentUser();
        const opts = user?.perfil?.opcionesActivas || {};
        const isManager = Auth.isManager();
        const allTools = DashboardPage.getToolsList(user, opts, isManager);
        const restBottom = allTools.filter(t => t.hash !== '#manager');
        const bottomTools = [
            { hash: '#dashboard', label: 'Inicio', icon: '🏠', color: 'var(--tool-1)' },
            ...restBottom
        ];
        nav.innerHTML = `
            <div class="bottom-nav-inner">
                ${bottomTools.map(t => {
                    const isActive = route === t.hash;
                    return `<a href="${t.hash}" class="${isActive ? 'active' : ''}" title="${t.label}">
                        <span class="bottom-nav-icon">${t.icon}</span>
                        <span>${t.label}</span>
                    </a>`;
                }).join('')}
            </div>
        `;
    },

    renderHeader() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const initial = document.getElementById('user-initial');
        if (initial) {
            initial.textContent = (user.perfil?.nombre || user.email || 'U').charAt(0).toUpperCase();
        }

        const notifBadge = document.getElementById('header-profile-notif');
        if (notifBadge) {
            const faltaTipoCuerpo = !user.perfil || user.perfil.tipoCuerpo === undefined || user.perfil.tipoCuerpo === null || user.perfil.tipoCuerpo === '';
            notifBadge.classList.toggle('hidden', !faltaTipoCuerpo);
        }
    },

    renderSidebar() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        const route = (window.location.hash || '').split('?')[0];
        const isAuthScreen = route === '#login' || route === '#register' || route === '#setup' || route === '#select-profile';
        if (!Auth.isLoggedIn() || isAuthScreen) {
            nav.innerHTML = '';
            return;
        }
        const user = Auth.getCurrentUser();
        const opts = user?.perfil?.opcionesActivas || {};
        const isManager = Auth.isManager();
        const allTools = DashboardPage.getToolsList(user, opts, isManager);
        const rest = allTools.filter(t => t.hash !== '#manager');
        const sidebarTools = [
            { hash: '#dashboard', label: 'Inicio', icon: '🏠', isInicio: true },
            ...rest
        ];
        nav.innerHTML = sidebarTools.map(t => {
            const isActive = route === t.hash;
            const extraClass = t.isInicio ? ' sidebar-item-inicio' : '';
            return `<a href="${t.hash}" class="${isActive ? 'active' : ''}${extraClass}" title="${t.label}">
                <span class="sidebar-icon">${t.icon}</span>
                <span>${t.label}</span>
            </a>`;
        }).join('');

        const footer = document.getElementById('sidebar-footer');
        if (footer) footer.innerHTML = '';
    },

    _renderSetup(container) {
        const user = Auth.getCurrentUser();
        if (!user || user.configuracionCompleta) {
            window.location.hash = '#dashboard';
            return;
        }
        container.classList.add('auth-screen--scroll-top', 'auth-screen--setup-severance');
        container.innerHTML = `
            <div class="auth-card auth-card--setup setup-full-wrap">
                <div class="auth-logo setup-logo">
                    <h1>Completa tu perfil</h1>
                    <p>Un último paso antes de comenzar</p>
                </div>
                <div id="setup-form-container" class="setup-form-container"></div>
            </div>
        `;
        Profile.renderForm('setup-form-container', user, {
            isSetup: true,
            onSave: (profileData) => {
                Auth.completeSetup(profileData);
                UI.toast('¡Perfil completado! Bienvenido.', 'success');
                const email = Auth.getCurrentEmail();
                const finish = () => {
                    window.location.hash = '#select-profile';
                    if (typeof Router !== 'undefined') Router.forceRender('#select-profile');
                    this.renderHeader();
                    this.renderSidebar();
                    this.renderBottomNav();
                };
                if (typeof Onboarding !== 'undefined' && email && !Onboarding.isDone(email)) {
                    Onboarding.showOffer(email, finish);
                } else {
                    finish();
                }
            }
        });
    },

    _showUnifiedQuickExpense(email, globalConfig) {
        const data = Storage.getUserData(email);
        const shared = data.gastosCompartidos || { participantes: [], gastos: [] };
        SharedExpensesPage.migrateToRendidorFormat(shared);
        const participants = shared.participantes || [];
        const me = Auth.getCurrentUser();
        const hasParticipants = participants.length >= 1;
        const allUsers = Storage.getUsers();
        const otherUsers = Object.values(allUsers).filter(u => u.rol !== 'manager' && u.email !== email);
        const canUseShared = hasParticipants || otherUsers.length > 0;

        const quienOptions = participants.map((p, i) => ({
            value: String(i),
            label: typeof p === 'string' ? p : (p.nombre || p.email || 'Invitado')
        }));

        UI.showModal(`
            <h3 class="modal-title">Registrar Gasto</h3>
            <form id="unified-expense-form">
                <div class="form-row">
                    ${UI.formGroup('Fecha', UI.input('ue_fecha', { type: 'date', value: DateUtils.today() }))}
                    ${UI.formGroup('Hora', UI.input('ue_hora', { type: 'time' }))}
                </div>
                ${UI.formGroup('Descripción', UI.input('ue_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto', UI.input('ue_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                ${UI.formGroup('Categoría', UI.select('ue_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                
                <div class="form-group">
                    <label class="form-label">Tipo de Gasto</label>
                    <div style="display:flex; gap:var(--spacing-md); margin-top:8px;">
                        <label class="form-check" style="flex:1;">
                            <input type="radio" name="ue_type" value="personal" checked>
                            <span class="form-check-label">Personal</span>
                        </label>
                        <label class="form-check" style="flex:1;">
                            <input type="radio" name="ue_type" value="compartido" ${!canUseShared ? 'disabled' : ''}>
                            <span class="form-check-label">Compartido</span>
                        </label>
                    </div>
                    ${!canUseShared ? '<p class="text-secondary text-sm mt-xs">Agrega participantes en Gastos Compartidos para usar esta opción</p>' : ''}
                </div>

                <div id="ue-shared-fields" style="display:none;">
                    ${UI.formGroup('Quién pagó', `<select id="ue_quien" name="ue_quien" class="form-select">${quienOptions.map((o, i) => `<option value="${UI.esc(o.value)}" ${i === 0 ? 'selected' : ''}>${UI.esc(o.label)}</option>`).join('')}</select>`)}
                </div>

                <div class="modal-actions">
                    <button type="button" id="btn-ue-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-ue-save" class="btn btn-success">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-ue-cancel', () => UI.closeModal());
                
                // Toggle shared fields based on radio selection
                const typeRadios = document.querySelectorAll('input[name="ue_type"]');
                const sharedFields = document.getElementById('ue-shared-fields');
                
                typeRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (radio.value === 'compartido' && canUseShared) {
                            sharedFields.style.display = 'block';
                        } else {
                            sharedFields.style.display = 'none';
                        }
                    });
                });

                UI.bindButton('btn-ue-save', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const descInput = document.getElementById('input-ue_desc');
                    const montoInput = document.getElementById('input-ue_monto');
                    const catInput = document.getElementById('input-ue_cat');
                    const fechaInput = document.getElementById('input-ue_fecha');
                    const horaInput = document.getElementById('input-ue_hora');
                    const typeRadio = document.querySelector('input[name="ue_type"]:checked');
                    const quienSelect = document.getElementById('ue_quien');
                    
                    const desc = descInput?.value?.trim();
                    const monto = montoInput?.value;
                    const cat = catInput?.value || '';
                    const fecha = fechaInput?.value || DateUtils.today();
                    const hora = horaInput?.value || '';
                    const type = typeRadio?.value || 'personal';
                    const quienPagadorIdx = quienSelect?.value != null ? String(quienSelect.value) : '0';

                    if (!desc || !monto) {
                        UI.toast('Completa descripción y monto', 'warning');
                        return;
                    }

                    if (type === 'compartido') {
                        if (!canUseShared) {
                            UI.toast('Primero agrega participantes en Gastos Compartidos', 'warning');
                            return;
                        }
                        this._saveQuickExpenseShared(email, desc, monto, quienPagadorIdx, fecha, hora);
                    } else {
                        this._saveQuickExpensePersonal(email, desc, monto, cat, fecha, hora);
                    }
                });
            }
        });
    },

    _getUserTotalIncome(user) {
        if (!user || !user.perfil) return 0;
        const ingresos = user.perfil.ingresos || [];
        return ingresos.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
    },

    _saveQuickExpensePersonal(email, desc, monto, cat, fecha, hora) {
        const data = Storage.getUserData(email);
        if (!data.finanzas) data.finanzas = { ingresos: [], gastos: [], deudas: [], balances: [] };
        const g = { id: DateUtils.generateId(), descripcion: desc, monto: parseFloat(monto) || 0, fecha: fecha || DateUtils.today(), categoria: cat };
        if (hora) g.hora = hora;
        data.finanzas.gastos.push(g);
        Storage.saveUserData(email, data);
        UI.closeModal();
        UI.toast('Gasto personal registrado', 'success');
        Router.refresh();
    },

    _saveQuickExpenseShared(email, desc, monto, pagadorIdxStr, fecha, hora) {
        const udata = Storage.getUserData(email);
        if (!udata.gastosCompartidos) udata.gastosCompartidos = { participantes: [], gastos: [] };
        SharedExpensesPage.migrateToRendidorFormat(udata.gastosCompartidos);
        const participantes = udata.gastosCompartidos.participantes;
        if (participantes.length === 0) {
            UI.toast('Agrega participantes en Gastos Compartidos primero.', 'warning');
            return;
        }
        const pagadorIdx = Math.min(parseInt(pagadorIdxStr, 10) || 0, participantes.length - 1);
        const reparto = participantes.map((_, i) => i);
        const gasto = { concepto: desc, tipo: 'gasto', monto: Math.round(parseFloat(monto) || 0), pagadorIdx, reparto };
        if (fecha) gasto.fecha = fecha;
        if (hora) gasto.hora = hora;
        udata.gastosCompartidos.gastos.push(gasto);
        Storage.saveUserData(email, udata);
        UI.closeModal();
        UI.toast('Gasto compartido registrado. Ve a Gastos Compartidos para rendir cuentas.', 'success');
        Router.refresh();
    },

    _showQuickExpensePersonal(email, globalConfig) {
        UI.showModal(`
            <h3 class="modal-title">Gasto Personal</h3>
            <form id="quick-expense-form">
                ${UI.formGroup('Descripción', UI.input('qe_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto', UI.input('qe_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                ${UI.formGroup('Categoría', UI.select('qe_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                <div class="modal-actions">
                    <button type="button" id="btn-qe-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-qe-save" class="btn btn-success">Guardar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-qe-cancel', () => UI.closeModal());
                UI.bindButton('btn-qe-save', () => {
                    const desc = document.getElementById('input-qe_desc')?.value?.trim();
                    const monto = document.getElementById('input-qe_monto')?.value;
                    const cat = document.getElementById('input-qe_cat')?.value || '';
                    if (!desc || !monto) {
                        UI.toast('Completa todos los campos', 'warning');
                        return;
                    }
                    const data = Storage.getUserData(email);
                    data.finanzas.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: desc,
                        monto: parseFloat(monto) || 0,
                        fecha: DateUtils.today(),
                        categoria: cat
                    });
                    Storage.saveUserData(email, data);
                    UI.closeModal();
                    UI.toast('Gasto personal registrado', 'success');
                    Router.refresh();
                });
            }
        });
    },

    _showQuickExpenseShared(email, globalConfig) {
        const data = Storage.getUserData(email);
        const shared = data.gastosCompartidos || { participantes: [], gastos: [] };
        let participants = shared.participantes || [];
        const me = Auth.getCurrentUser();
        if (!participants.find(p => p.email === email)) {
            participants = [{ email: email, nombre: me?.perfil?.nombre || email, ingresoMensual: me?.perfil?.ingresos || 0 }].concat(participants);
        }
        const hasParticipants = participants.length >= 2;
        const allUsers = Storage.getUsers();
        const otherUsers = Object.values(allUsers).filter(u => u.rol !== 'manager' && u.email !== email);

        if (!hasParticipants && otherUsers.length === 0) {
            UI.showModal(`
                <h3 class="modal-title">Gasto Compartido</h3>
                <p class="text-secondary">Para registrar gastos compartidos primero agrega al menos un participante en <strong>Gastos Compartidos</strong>.</p>
                <div class="modal-actions mt-md">
                    <button type="button" id="btn-qe-close" class="btn btn-secondary">Cerrar</button>
                    <button type="button" id="btn-qe-go-shared" class="btn btn-primary">Ir a Gastos Compartidos</button>
                </div>
            `, {
                onReady: () => {
                    UI.bindButton('btn-qe-close', () => UI.closeModal());
                    UI.bindButton('btn-qe-go-shared', () => { UI.closeModal(); window.location.hash = '#shared-expenses'; });
                }
            });
            return;
        }

        const quienOptions = participants.map(p => ({
            value: p.email,
            label: p.email === email ? 'Yo' : (p.nombre || p.email)
        }));

        UI.showModal(`
            <h3 class="modal-title">Gasto Compartido</h3>
            <form id="quick-expense-shared-form">
                ${UI.formGroup('Descripción', UI.input('qes_desc', { placeholder: 'Descripción', required: true }))}
                ${UI.formGroup('Monto total', UI.input('qes_monto', { type: 'number', placeholder: '0', required: true, min: 0 }))}
                ${UI.formGroup('Quién pagó', `<select id="qes_quien" class="form-select">${quienOptions.map(o => `<option value="${UI.esc(o.value)}">${UI.esc(o.label)}</option>`).join('')}</select>`)}
                ${UI.formGroup('Categoría', UI.select('qes_cat', globalConfig.categoriasGastos, '', { placeholder: 'Seleccionar' }))}
                <div class="modal-actions">
                    <button type="button" id="btn-qes-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="button" id="btn-qes-save" class="btn btn-success">Guardar en Compartidos</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-qes-cancel', () => UI.closeModal());
                UI.bindButton('btn-qes-save', () => {
                    const form = document.getElementById('quick-expense-shared-form');
                    if (!form) return;
                    const formData = new FormData(form);
                    const fd = {};
                    formData.forEach((value, key) => { fd[key] = value; });
                    
                    if (!fd.qes_desc?.trim() || !fd.qes_monto) {
                        UI.toast('Completa descripción y monto', 'warning');
                        return;
                    }
                    const udata = Storage.getUserData(email);
                    if (!udata.gastosCompartidos) udata.gastosCompartidos = { participantes: [], gastos: [] };
                    if (!udata.gastosCompartidos.participantes.find(p => p.email === email)) {
                        udata.gastosCompartidos.participantes.push({
                            email: email,
                            nombre: me?.perfil?.nombre || email,
                            ingresoMensual: me?.perfil?.ingresos || 0
                        });
                    }
                    const totalIngresos = udata.gastosCompartidos.participantes.reduce((s, p) => s + (parseFloat(p.ingresoMensual) || 0), 0);
                    const myIncome = parseFloat(me?.perfil?.ingresos) || 0;
                    const myShare = totalIngresos > 0 ? (myIncome / totalIngresos) * parseFloat(fd.qes_monto) : parseFloat(fd.qes_monto);

                    udata.gastosCompartidos.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: fd.qes_desc,
                        monto: parseFloat(fd.qes_monto) || 0,
                        fecha: DateUtils.today(),
                        quienPago: fd.qes_quien || email,
                        categoria: fd.qes_cat || ''
                    });
                    udata.finanzas.gastos.push({
                        id: DateUtils.generateId(),
                        descripcion: '[Compartido] ' + fd.qes_desc,
                        monto: myShare,
                        fecha: DateUtils.today(),
                        categoria: fd.qes_cat || 'Compartido'
                    });
                    Storage.saveUserData(email, udata);
                    UI.closeModal();
                    UI.toast('Gasto compartido registrado. Tu parte se reflejó en Finanzas.', 'success');
                    Router.refresh();
                });
            }
        });
    },

    _icon(name) {
        const icons = {
            home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            dollar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
            users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
            chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
            settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
            shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
        };
        return icons[name] || '';
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    const authScreen = document.getElementById('auth-screen');
    const showAuthError = (msg) => {
        if (!authScreen) return;
        authScreen.style.display = 'flex';
        authScreen.classList.add('auth-screen--scroll-top');
        authScreen.innerHTML = `
            <div class="auth-card" style="padding: 2rem; max-width: 400px;">
                <h2 style="margin: 0 0 1rem; color: var(--text-primary);">Error al cargar</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${typeof msg === 'string' ? msg : 'Revisa la consola (F12) para más detalles.'}</p>
                <button type="button" onclick="location.reload()" class="btn btn-primary">Reintentar</button>
            </div>`;
    };
    App.init()
        .then(() => {
            // Asegurar que la pantalla de auth sea visible si estamos en ruta de login/setup/select-profile
            const hash = (window.location.hash || '#login').split('?')[0];
            if (['#login', '#register', '#setup', '#select-profile'].includes(hash)) {
                const shell = document.getElementById('app-shell');
                if (shell) shell.classList.add('hidden');
                if (authScreen) {
                    authScreen.classList.remove('hidden');
                    authScreen.style.display = 'flex';
                    authScreen.style.visibility = 'visible';
                }
            }
        })
        .catch(err => {
            if (typeof Logger !== 'undefined' && Logger.error) Logger.error('App init error:', err);
            else console.error('App init error:', err);
            showAuthError(err && err.message ? err.message : 'Error al iniciar la aplicación.');
        });
});
