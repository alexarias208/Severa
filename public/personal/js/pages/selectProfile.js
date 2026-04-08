/* ============================================
   SELECT PROFILE PAGE - Severance: elegir perfil
   Logo: círculo partido = Persona/Trabajo, juntos pero no unidos
   ============================================ */

const SelectProfilePage = {
    render(container) {
        document.getElementById('auth-screen').classList.add('theme-persona');

        container.innerHTML = `
            <div class="auth-card select-profile-card select-profile-card--compact" style="font-family: 'Montserrat', 'Inter', sans-serif; max-width: 420px;">
                <div class="auth-logo" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <a href="#dashboard" title="Volver al inicio" aria-label="Volver al inicio" style="flex-shrink: 0;"><img src="assets/logo-severa.svg" alt="Severa" style="width: 40px; height: 40px; display: block;" class="persona-logo-img"/></a>
                    <div>
                        <h1 style="margin: 0; font-size: 1.4rem; color: #3d3a35; font-weight: 700;">Severa</h1>
                        <p style="margin: 0.15rem 0 0; color: #5a7a5a; font-size: 0.85rem;">¿A qué perfil deseas ingresar?</p>
                    </div>
                </div>
                <div class="select-profile-grid" style="display: flex; flex-direction: column; gap: 0.6rem;">
                    <button id="btn-profile-persona" class="profile-option profile-option--active" style="text-align: left; padding: 0.75rem 1rem;">
                        <span class="profile-option-icon">👤</span>
                        <span><strong class="profile-option-title">Perfil Persona</strong><br><span class="profile-option-desc text-secondary" style="font-size: 0.8rem;">Calendario, finanzas, hábitos, Biblia y más</span></span>
                    </button>
                    <button id="btn-profile-trabajador" class="profile-option" style="text-align: left; padding: 0.75rem 1rem;">
                        <span class="profile-option-icon">💼</span>
                        <span><strong class="profile-option-title">Perfil Trabajador</strong><br><span class="profile-option-desc text-secondary" style="font-size: 0.8rem;">Herramientas por profesión, finanzas NIIF</span></span>
                    </button>
                </div>
                <div class="select-profile-actions" style="margin-top: 0.75rem;">
                    <button id="btn-select-profile-logout" class="btn btn-ghost btn-sm">Cerrar sesión</button>
                </div>
            </div>
        `;

        UI.bindButton('btn-profile-persona', () => this._selectPersona());
        UI.bindButton('btn-profile-trabajador', () => this._selectTrabajador());
        UI.bindButton('btn-select-profile-logout', () => Auth.logout());
    },

    _selectPersona() {
        Storage.setActiveMode('persona');
        Router.forceRender('#dashboard');
    },

    _selectTrabajador() {
        document.getElementById('auth-screen').classList.remove('theme-persona');
        Storage.setActiveMode('trabajo');
        window.location.href = typeof resolveModoTrabajoIndexUrl === 'function'
            ? resolveModoTrabajoIndexUrl()
            : '/trabajo/index.html';
    }
};
