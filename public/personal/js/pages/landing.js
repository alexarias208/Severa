/* ============================================
   LANDING - Severance style, pantalla completa.
   Severa Lab. Uso personal y profesional.
   ============================================ */

const LandingPage = {
    render(container) {
        container.classList.add('landing-wrap', 'landing-severance-wrap');
        container.innerHTML = `
            <div class="landing-severance">
                <div class="landing-brand">
                    <svg class="landing-logo-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2 C12 2 4 6 4 12 C4 18 12 22 12 22 C12 22 20 18 20 12 C20 6 12 2 12 2Z" stroke="currentColor" stroke-width="1.8" fill="none"/>
                        <path d="M12 5 C12 5 8 7.5 8 12 C8 16.5 12 19 12 19" stroke="#8a8a8a" stroke-width="1.2" fill="none"/>
                    </svg>
                    <h1 class="landing-title">SEVERA</h1>
                    <p class="landing-tagline">LAB — Pronto más divisiones</p>
                    <p class="landing-sub">
                        Herramienta de uso <strong style="color: var(--severance-text, #e8e8e8);">personal y profesional</strong>.
                        Un solo lugar para organizar tu vida y trabajo.
                    </p>
                </div>
                <div class="landing-actions">
                    <button type="button" id="landing-btn-login" class="btn btn-ghost btn-lg">Iniciar sesión</button>
                    <button type="button" id="landing-btn-register" class="btn btn-primary btn-lg">Crear cuenta</button>
                </div>
                <div class="landing-features">
                    <span class="landing-feature">Calendario</span>
                    <span class="landing-feature">Finanzas</span>
                    <span class="landing-feature">Salud</span>
                    <span class="landing-feature">Hábitos</span>
                    <span class="landing-feature">Gratitud</span>
                    <span class="landing-feature">Modo Trabajo</span>
                </div>
            </div>
        `;
        container.querySelector('#landing-btn-login').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#login';
            Router.navigate();
        });
        container.querySelector('#landing-btn-register').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#register';
            Router.navigate();
        });
    }
};
