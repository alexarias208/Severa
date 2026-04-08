/* ============================================
   ROUTER - Hash-based SPA Router with Guards
   ============================================ */

const Router = {
    routes: {},
    currentRoute: null,

    register(hash, renderFn, options = {}) {
        this.routes[hash] = { render: renderFn, ...options };
    },

    init() {
        window.addEventListener('hashchange', () => this.navigate());

        try {
            // Entrada directa desde el index raíz: ?modo=persona → ir al dashboard sin pasar por selección
            const params = new URLSearchParams(window.location.search);
            if (Auth.isLoggedIn() && params.get('modo') === 'persona') {
                Storage.setActiveMode('persona');
                const cleanUrl = window.location.pathname + '#dashboard';
                try { window.history.replaceState(null, '', cleanUrl); } catch (e) { window.location.hash = 'dashboard'; }
                this.forceRender('#dashboard');
                return;
            }
            this.navigate();
        } catch (e) {
            if (typeof Logger !== 'undefined' && Logger.error) Logger.error('Router.init:', e);
            else console.error('Router.init:', e);
            const route = (window.location.hash || '#login').split('?')[0];
            if (this.routes[route]) this._render(route);
            else if (this.routes['#login']) this._render('#login');
            throw e;
        }
    },

    /** Ir a una ruta sin pasar por guards (p. ej. tras elegir perfil). Evita pantalla en blanco / doble elección. */
    forceRender(route) {
        const r = (route || '').replace(/^#/, '#') || '#dashboard';
        this.currentRoute = r;
        this._render(r);
        if (window.location.hash !== r) {
            window.location.hash = r;
        }
    },

    navigate(hash) {
        if (hash) {
            window.location.hash = hash;
            return;
        }

        const rawHash = window.location.hash || '';
        let route = rawHash.split('?')[0];
        if (!route || route === '#') {
            if (!Auth.isLoggedIn()) {
                window.location.hash = '#landing';
                return;
            }
            window.location.hash = '#select-profile';
            route = '#select-profile';
        }
        const params = new URLSearchParams(window.location.search);

        // Si llegaron a selección de perfil con ?modo=persona (p. ej. tras login), ir directo al dashboard
        if (route === '#select-profile' && params.get('modo') === 'persona') {
            Storage.setActiveMode('persona');
            window.history.replaceState(null, '', window.location.pathname + '#dashboard');
            this.forceRender('#dashboard');
            return;
        }

        // Auth guard: sin sesión solo permitir landing, login, register
        if (!Auth.isLoggedIn() && route !== '#login' && route !== '#register' && route !== '#landing') {
            window.location.hash = '#landing';
            return;
        }

        // If logged in and trying to access login/register, redirect
        if (Auth.isLoggedIn() && (route === '#login' || route === '#register')) {
            const user = Auth.getCurrentUser();
            if (user.rol === 'manager') {
                window.location.hash = '#manager';
            } else if (!user.configuracionCompleta) {
                window.location.hash = '#setup';
            } else {
                window.location.hash = '#select-profile';
            }
            return;
        }

        // Profile selection guard (Severance): must select Persona/Trabajador before app
        if (Auth.isLoggedIn() && route !== '#select-profile' && route !== '#login' && route !== '#register') {
            const user = Auth.getCurrentUser();
            const isManager = user?.rol === 'manager';
            const needsSetup = user && !user.configuracionCompleta;
            let hasMode = Storage.getActiveMode();
            // En la app Persona (este HTML), si no hay modo guardado asumir 'persona' para no bloquear
            if (!hasMode) {
                Storage.setActiveMode('persona');
                hasMode = 'persona';
            }
            if (!isManager && !needsSetup && !hasMode) {
                window.location.hash = '#select-profile';
                return;
            }
        }

        // Setup guard: if user hasn't completed setup, force it
        if (Auth.isLoggedIn() && route !== '#setup' && route !== '#login') {
            const user = Auth.getCurrentUser();
            if (user && user.rol !== 'manager' && !user.configuracionCompleta) {
                window.location.hash = '#setup';
                return;
            }
        }

        // Manager guard
        const routeConfig = this.routes[route];
        if (routeConfig && routeConfig.managerOnly && !Auth.isManager()) {
            window.location.hash = '#dashboard';
            return;
        }

        // Module visibility guard (only block if explicitly set to false)
        if (routeConfig && routeConfig.moduleKey) {
            const user = Auth.getCurrentUser();
            if (user && user.perfil && user.perfil.opcionesActivas) {
                if (user.perfil.opcionesActivas[routeConfig.moduleKey] === false) {
                    window.location.hash = '#dashboard';
                    UI.toast('Módulo no activo. Actívalo en tu perfil.', 'warning');
                    return;
                }
            }
        }

        this.currentRoute = route;
        this._render(route);
    },

    _render(route) {
        const routeConfig = this.routes[route];

        // Auth screen (landing, login, register, setup, select-profile)
        if (route === '#landing' || route === '#login' || route === '#register' || route === '#setup' || route === '#select-profile') {
            const appShell = document.getElementById('app-shell');
            const authScreen = document.getElementById('auth-screen');
            if (route !== '#setup') {
                authScreen.classList.remove('auth-screen--setup-severance');
            }
            appShell.classList.add('hidden');
            appShell.style.display = 'none';
            appShell.style.visibility = 'hidden';
            authScreen.classList.remove('hidden');
            authScreen.style.display = 'flex';
            authScreen.style.visibility = 'visible';
            authScreen.style.zIndex = '9999';
            if (route === '#select-profile') {
                authScreen.classList.add('auth-screen--choice');
                authScreen.classList.remove('auth-screen--scroll-top');
                authScreen.classList.remove('theme-persona');
            } else if (route === '#landing') {
                authScreen.classList.add('auth-screen--landing');
                authScreen.classList.remove('auth-screen--choice');
                authScreen.classList.remove('auth-screen--scroll-top');
            } else if (route === '#login' || route === '#register') {
                authScreen.classList.add('auth-screen--landing', 'auth-screen--scroll-top');
                authScreen.classList.remove('auth-screen--choice');
            } else {
                authScreen.classList.remove('auth-screen--choice', 'auth-screen--landing');
                authScreen.classList.add('auth-screen--scroll-top');
                if (route !== '#select-profile') authScreen.classList.remove('theme-persona');
            }
            if (routeConfig) {
                routeConfig.render(authScreen);
            }
            authScreen.scrollTop = 0;
            return;
        }

        // App shell pages: los 4 temas (data-theme) rigen toda la app; no usar theme-persona en body
        const authEl = document.getElementById('auth-screen');
        const shellEl = document.getElementById('app-shell');
        authEl.classList.add('hidden');
        authEl.classList.remove('theme-persona');
        authEl.classList.remove('auth-screen--choice');
        authEl.innerHTML = '';
        authEl.style.display = '';
        authEl.style.visibility = '';
        authEl.style.zIndex = '';
        shellEl.classList.remove('hidden');
        shellEl.style.display = '';
        shellEl.style.visibility = '';

        const container = document.getElementById('page-container');
        if (!container) return;

        container.innerHTML = '';
        container.className = 'page-container fade-in';

        // Update sidebar active state
        document.querySelectorAll('.sidebar-menu a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === route);
        });

        if (routeConfig) {
            try {
                const out = routeConfig.render(container);
                if (out && typeof out.then === 'function') {
                    out.catch(err => {
                        if (typeof Logger !== 'undefined' && Logger.error) Logger.error('Router render async error:', route, err);
                        else console.error('Router render async error:', route, err);
                        container.innerHTML = UI.emptyState('Error al cargar la página. Prueba recargar.', '⚠️');
                    });
                }
            } catch (err) {
                if (typeof Logger !== 'undefined' && Logger.error) Logger.error('Router render error:', route, err);
                else console.error('Router render error:', route, err);
                container.innerHTML = UI.emptyState('Error al cargar la página. Prueba recargar.', '⚠️');
            }
            if (route === '#dashboard' && typeof Tutorial !== 'undefined' && !Tutorial.isDone()) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            const r = (window.location.hash || '').split('?')[0];
                            if (r !== '#dashboard') return;
                            if (typeof Tutorial === 'undefined' || Tutorial.isDone()) return;
                            Tutorial.start('#dashboard');
                        }, 200);
                    });
                });
            }
        } else {
            container.innerHTML = UI.emptyState('Página no encontrada', '🔍');
        }

        // Scroll to top
        window.scrollTo(0, 0);
    },

    refresh() {
        if (this.currentRoute) {
            this._render(this.currentRoute);
        }
    },

    getParam(key) {
        const hash = window.location.hash;
        const queryPart = hash.split('?')[1];
        if (!queryPart) return null;
        const params = new URLSearchParams(queryPart);
        return params.get(key);
    }
};
