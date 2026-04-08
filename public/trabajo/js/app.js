/* Modo Trabajo v2 — perfiles, agenda y Mi día por perfil (#<slug>/agenda, #<slug>/mi-dia) */
const TrabajoApp = {
    /** Slugs válidos en tiempo de render (no cachear al cargar: depende de TrabajoStorage.PERFILES). */
    getPerfilSlugs() {
        try {
            const arr = typeof TrabajoStorage !== 'undefined' && Array.isArray(TrabajoStorage.PERFILES)
                ? TrabajoStorage.PERFILES
                : [];
            return arr.map(p => (p && p.slug ? String(p.slug) : '')).filter(Boolean);
        } catch (e) {
            return [];
        }
    },

    /** @deprecated usar getPerfilSlugs() */
    get PERFIL_SLUGS() {
        return this.getPerfilSlugs();
    },

    parseHash() {
        const raw = (window.location.hash || '#perfil').replace(/^#/, '');
        const parts = raw.split('/').map(p => decodeURIComponent(p)).filter(Boolean);
        if (!parts.length || parts[0] === 'area' || parts[0] === 'profesion') {
            return { mode: 'perfil', slug: null, section: null, subId: null, subId2: null };
        }
        if (parts[0] === 'perfil') {
            return {
                mode: 'perfil',
                slug: null,
                section: parts[1] || null,
                subId: parts[2] || null,
                subId2: parts[3] || null
            };
        }
        if (parts[0] === 'trabajo') {
            return {
                mode: 'legacy-trabajo',
                slug: 'trabajo',
                section: parts[1] || 'mi-dia',
                subId: parts[2] || null,
                subId2: parts[3] || null
            };
        }
        const slug = String(parts[0] || '').trim();
        const section = String(parts[1] || 'inicio').trim() || 'inicio';
        const subId = parts[2] != null && String(parts[2]).trim() !== '' ? String(parts[2]).trim() : null;
        const subId2 = parts[3] != null && String(parts[3]).trim() !== '' ? String(parts[3]).trim() : null;
        return { mode: 'app', slug, section, subId, subId2 };
    },

    _redirectLegacyTrabajoHash() {
        const raw = (window.location.hash || '').replace(/^#/, '');
        if (!raw.startsWith('trabajo')) return false;
        const parts = raw.split('/').filter(Boolean);
        if (parts[0] !== 'trabajo') return false;
        const rest = parts.slice(1).join('/') || 'mi-dia';
        const last = TrabajoStorage.getPerfilSlug();
        const activos = TrabajoStorage.getSlugsActivos();
        const target = (last && activos.includes(last)) ? last : activos[0];
        if (target) {
            window.location.replace('#' + target + '/' + rest);
        } else {
            window.location.replace('#perfil/profesiones');
        }
        return true;
    },

    init() {
        if (typeof Logger !== 'undefined' && Logger.init) {
            Logger.init({ max: 100 });
        }
        if (typeof FeatureFlags !== 'undefined' && FeatureFlags.init) {
            FeatureFlags.init();
        }

        window.addEventListener('hashchange', () => this.render());
        if (this._redirectLegacyTrabajoHash()) return;

        const areaFromProfile = TrabajoStorage.getAreaFromProfile();
        const mapped = areaFromProfile ? TrabajoStorage.areaLegacyToPerfilSlug(areaFromProfile) : null;
        const saved = TrabajoStorage.getPerfilSlug();
        const activos = TrabajoStorage.getSlugsActivos();
        const hashRaw = (window.location.hash || '').replace(/^#/, '');
        if (!hashRaw || hashRaw === 'area' || hashRaw === 'profesion') {
            const go = (mapped && activos.includes(mapped)) ? mapped : (saved && activos.includes(saved) ? saved : null);
            if (go) {
                window.location.replace('#' + go + '/inicio');
                return;
            }
        }
        this.render();
    },

    toast(msg, kind) {
        const k = kind || 'info';
        let host = document.getElementById('trabajo-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'trabajo-toast-host';
            host.setAttribute('aria-live', 'polite');
            host.className = 'trabajo-toast-host';
            document.body.appendChild(host);
        }
        const el = document.createElement('div');
        el.className = 'trabajo-toast trabajo-toast--' + k;
        el.textContent = msg;
        host.appendChild(el);
        setTimeout(() => {
            el.classList.add('trabajo-toast--out');
            setTimeout(() => el.remove(), 300);
        }, 3200);
    },

    render() {
        const main = document.getElementById('trabajo-main');
        const sidebar = document.getElementById('trabajo-sidebar');
        if (!main) return;

        if (this._redirectLegacyTrabajoHash()) return;

        const { mode, slug, section, subId, subId2 } = this.parseHash();

        if (mode === 'perfil' && section === 'profesiones') {
            if (sidebar) sidebar.style.display = 'none';
            main.innerHTML = this.renderProfesionesGestion();
            this.bindProfesionesGestion();
            return;
        }

        if (mode === 'legacy-trabajo' || slug === 'trabajo') {
            this._redirectLegacyTrabajoHash();
            return;
        }

        const slugsValidos = this.getPerfilSlugs();
        if (mode === 'perfil' || !slug || !slugsValidos.includes(slug)) {
            if (sidebar) sidebar.style.display = 'none';
            main.innerHTML = this.renderPerfilSelector();
            main.querySelectorAll('.prof-card').forEach(a => {
                a.addEventListener('click', e => {
                    e.preventDefault();
                    const raw = a.getAttribute('href') || '';
                    const path = raw.replace(/^#+/, '');
                    const s = path.split('/')[0];
                    TrabajoStorage.setPerfilSlug(s);
                    window.location.hash = path ? '#' + path : '#perfil';
                });
            });
            return;
        }

        if (!TrabajoStorage.isPerfilActivo(slug)) {
            if (sidebar) sidebar.style.display = 'none';
            main.innerHTML = this.renderPerfilSelector();
            this.toast('Ese perfil está desactivado. Actívalo en «Gestionar profesiones».', 'info');
            main.querySelectorAll('.prof-card').forEach(a => {
                a.addEventListener('click', e => {
                    e.preventDefault();
                    const raw = a.getAttribute('href') || '';
                    const path = raw.replace(/^#+/, '');
                    const s = path.split('/')[0];
                    TrabajoStorage.setPerfilSlug(s);
                    window.location.hash = path ? '#' + path : '#perfil';
                });
            });
            return;
        }

        TrabajoStorage.setPerfilSlug(slug);
        if (sidebar) {
            sidebar.style.removeProperty('display');
            const nav = sidebar.querySelector('.sidebar-menu');
            if (nav) {
                nav.innerHTML = this.renderSidebar(slug);
                nav.querySelectorAll('a').forEach(a => {
                    a.addEventListener('click', e => {
                        e.preventDefault();
                        const raw = a.getAttribute('href') || '#perfil';
                        const path = raw.replace(/^#+/, '');
                        window.location.hash = path ? '#' + path : '#perfil';
                    });
                });
            }
        }

        const html = TrabajoPerfiles.render(slug, section, subId, subId2);
        main.innerHTML = html || '<div class="page-container"><p class="muted">Sin contenido.</p></div>';
        TrabajoPerfiles.bind(slug, section, subId, subId2);
    },

    renderProfesionesGestion() {
        const list = (TrabajoStorage.PERFILES || []).map(p => {
            const on = TrabajoStorage.isPerfilActivo(p.slug);
            return `<label class="prof-toggle-row" style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-subtle, #3333);cursor:pointer;">
                <input type="checkbox" data-slug="${this.esc(p.slug)}" ${on ? 'checked' : ''} style="margin-top:4px;"/>
                <span><strong>${p.icon} ${this.esc(p.name)}</strong><br/><span class="muted text-sm">${this.esc(p.desc)}</span></span>
            </label>`;
        }).join('');
        return `
            <div class="prof-selector page-container">
                <h1>Gestionar profesiones</h1>
                <p class="sub">Activa o desactiva qué perfiles aparecen en el selector. Por defecto están todos activos. Debe quedar al menos uno activo.</p>
                <div class="card" style="padding:16px;">${list}</div>
                <p style="margin-top:16px;"><a href="#perfil" class="btn btn-primary">Volver al selector de perfil</a></p>
            </div>`;
    },

    bindProfesionesGestion() {
        document.querySelectorAll('.prof-toggle-row input[data-slug]').forEach(cb => {
            cb.addEventListener('change', () => {
                TrabajoStorage.setPerfilActivo(cb.dataset.slug, cb.checked);
                const activos = TrabajoStorage.getSlugsActivos();
                if (activos.length === 0) {
                    TrabajoStorage.setPerfilActivo(cb.dataset.slug, true);
                    cb.checked = true;
                    this.toast('Debe haber al menos un perfil activo.', 'error');
                }
            });
        });
    },

    renderPerfilSelector() {
        const activos = TrabajoStorage.getSlugsActivos();
        const list = (TrabajoStorage.PERFILES || []).filter(p => activos.includes(p.slug)).map(p => `
            <a href="#${p.slug}/inicio" class="prof-card">
                <span class="prof-icon">${p.icon}</span>
                <h2>${this.esc(p.name)}</h2>
                <p>${this.esc(p.desc)}</p>
            </a>`).join('');
        const empty = activos.length === 0
            ? '<p class="muted">No hay profesiones activas. <a href="#perfil/profesiones">Gestionar profesiones</a>.</p>'
            : '';
        return `
            <div class="prof-selector page-container">
                <h1>Perfil profesional</h1>
                <p class="sub">Elige el perfil con el que trabajarás. Los datos se guardan en este dispositivo (localStorage). Mi día y la agenda son específicos de cada perfil.</p>
                <p><a href="#perfil/profesiones" class="text-sm">Gestionar profesiones</a></p>
                ${empty}
                <div class="prof-cards">${list}</div>
            </div>`;
    },

    renderSidebar(slug) {
        const base = `#${slug}`;
        const globalTop = `
            <a href="${base}/mi-dia" class="sidebar-item-global ${this._sidebarGlobalActive(slug, 'mi-dia')}" title="Mi día"><span class="sidebar-icon">☀️</span><span>Mi día</span></a>
            <a href="${base}/agenda" class="sidebar-item-global ${this._sidebarGlobalActive(slug, 'agenda')}" title="Agenda"><span class="sidebar-icon">📅</span><span>Agenda</span></a>`;
        const menus = {
            minimarket: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' },
                { href: base + '/caja', label: 'Caja (POS)', icon: '📒' },
                { href: base + '/finanzas', label: 'Finanzas', icon: '💰' }
            ],
            educacion: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' },
                { href: base + '/cursos', label: 'Cursos', icon: '📚' },
                { href: base + '/salas', label: 'Salas', icon: '🏫' },
                { href: base + '/actividades', label: 'Actividades', icon: '📌' },
                { href: base + '/planificacion', label: 'Planificación', icon: '🗓️' },
                { href: base + '/informes', label: 'Informes', icon: '📊' },
                { href: base + '/prioridades', label: 'Prioridades del día', icon: '✅' }
            ],
            prevencionista: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/clientes', label: 'Clientes', icon: '👥' },
                { href: base + '/obras', label: 'Obras', icon: '🏗️' },
                { href: base + '/tareas', label: 'Tareas', icon: '✅' },
                { href: base + '/epp', label: 'EPP', icon: '🦺' },
                { href: base + '/calendario', label: 'Visitas', icon: '📆' }
            ],
            administrativo: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/fechas', label: 'Fechas importantes', icon: '📅' },
                { href: base + '/procesos', label: 'Procesos', icon: '🔄' },
                { href: base + '/contactos', label: 'Contactos', icon: '📇' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' }
            ],
            pasteleria: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' },
                { href: base + '/entregas', label: 'Entregas', icon: '📆' },
                { href: base + '/precios', label: 'Precios', icon: '🧮' },
                { href: base + '/precios/receta', label: 'Costos receta', icon: '📐' },
                { href: base + '/tarifas', label: 'Tarifas', icon: '🏷️' },
                { href: base + '/productos', label: 'Productos', icon: '🍰' },
                { href: base + '/recetario', label: 'Recetario', icon: '📖' },
                { href: base + '/pedidos', label: 'Pedidos', icon: '📋' }
            ],
            cabanas: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/unidades', label: 'Unidades', icon: '🛖' },
                { href: base + '/reservas', label: 'Reservas', icon: '📅' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' },
                { href: base + '/clientes', label: 'Clientes', icon: '👥' },
                { href: base + '/evaluaciones', label: 'Evaluaciones', icon: '⭐' },
                { href: base + '/fotos', label: 'Fotos', icon: '🖼️' },
                { href: base + '/finanzas', label: 'Finanzas', icon: '💰' }
            ],
            laboratorio: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/equipos', label: 'Equipos', icon: '🔧' },
                { href: base + '/visitas', label: 'Visitas', icon: '📋' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' },
                { href: base + '/finanzas', label: 'Finanzas', icon: '💰' }
            ],
            salud: [
                { href: base + '/inicio', label: 'Inicio', icon: '🏠' },
                { href: base + '/pacientes', label: 'Pacientes', icon: '👥' },
                { href: base + '/sesiones', label: 'Sesiones', icon: '📋' },
                { href: base + '/planes', label: 'Planes', icon: '📝' },
                { href: base + '/calendario', label: 'Calendario', icon: '📆' },
                { href: base + '/finanzas', label: 'Finanzas', icon: '💰' }
            ]
        };
        let links = menus[slug] || [{ href: base + '/inicio', label: 'Inicio', icon: '🏠' }];
        const inicioLink = links.find(l => l.label === 'Inicio');
        const rest = links.filter(l => l !== inicioLink).sort((a, b) => (a.label || '').localeCompare(b.label || '', 'es'));
        links = inicioLink ? [inicioLink, ...rest] : rest;
        const current = (window.location.hash || '').replace(/^#/, '');
        const list = links.map(l => {
            const path = l.href.replace(/^#/, '');
            const isActive = current === path || current.startsWith(path + '/');
            const extraClass = l.label === 'Inicio' ? ' sidebar-item-inicio' : '';
            return `<a href="${l.href}" class="${isActive ? 'active' : ''}${extraClass}" title="${this.esc(l.label)}"><span class="sidebar-icon">${l.icon}</span><span>${this.esc(l.label)}</span></a>`;
        }).join('');
        return `${globalTop}<a href="#perfil" class="nav-back" title="Cambiar perfil"><span class="sidebar-icon">←</span><span>Cambiar perfil</span></a>${list}`;
    },

    _sidebarGlobalActive(slug, sub) {
        const prefix = `${slug}/${sub}`;
        const c = (window.location.hash || '').replace(/^#/, '');
        return c === prefix || c.startsWith(prefix + '/') ? 'active' : '';
    },

    money(n) {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(n) || 0);
    },
    esc(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = String(s);
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => TrabajoApp.init());
