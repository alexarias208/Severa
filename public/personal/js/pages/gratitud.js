/* ============================================
   GRATITUD - Agradecer, perspectiva positiva
   ============================================ */

const GRATITUD_PRESETS = [
    'Mi familia', 'Tener salud', 'Un techo', 'Poder trabajar', 'La comida del día',
    'Poder caminar', 'Un día más de vida', 'Mis amigos', 'El sol', 'El agua',
    'Haberme levantado hoy', 'Mis mascotas', 'La naturaleza', 'Paz interior', 'Aprender algo nuevo'
];

const GratitudPage = {
    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const gratitud = data.gratitud || { entradas: [] };
        const entradas = (gratitud.entradas || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

        container.innerHTML = `
            ${UI.pageTitle('Gratitud', '<a href="#dashboard" class="btn btn-ghost btn-sm">← Inicio</a>', 'gratitud')}
            <p class="text-secondary mb-md">Escribe algo por lo que estés agradecido. Haz clic en una opción para preseleccionar y luego Añadir, o escribe el tuyo.</p>

            <div class="card mb-lg">
                <h4 class="card-title mb-sm">Nueva entrada</h4>
                <div class="gratitud-presets mb-md" style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${GRATITUD_PRESETS.map(t => `<button type="button" class="btn btn-ghost btn-sm gratitud-preset" data-texto="${UI.esc(t)}">${UI.esc(t)}</button>`).join('')}
                </div>
                <form id="gratitud-form">
                    <div class="form-row" style="align-items: flex-end;">
                        ${UI.formGroup('Fecha', UI.input('grat_fecha', { type: 'date', value: DateUtils.today(), required: true }))}
                        <div class="form-group" style="flex:1;">
                            <label class="form-label">Por qué agradezco</label>
                            <input type="text" id="input-grat_texto" name="grat_texto" class="form-input" placeholder="Ej: Tener un techo, poder caminar, mi familia…" required />
                        </div>
                        <button type="submit" class="btn btn-primary">Añadir</button>
                    </div>
                </form>
            </div>

            <div class="card">
                <h4 class="card-title mb-sm">Mis agradecimientos (${entradas.length})</h4>
                ${entradas.length === 0 ? `
                    <div class="empty-state">
                        <p class="text-secondary">Aún no hay entradas. Añade la primera arriba.</p>
                    </div>
                ` : `
                    <ul class="gratitud-list" id="gratitud-list">
                        ${entradas.map(e => `
                            <li class="gratitud-item" data-id="${UI.esc(e.id)}">
                                <span class="gratitud-fecha">${DateUtils.format(e.fecha || '', 'medium')}</span>
                                <span class="gratitud-texto">${UI.esc(e.texto || '')}</span>
                                <button type="button" class="btn btn-ghost btn-sm gratitud-del" data-id="${UI.esc(e.id)}" aria-label="Eliminar">×</button>
                            </li>
                        `).join('')}
                    </ul>
                `}
            </div>
        `;

        container.querySelectorAll('.gratitud-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('input-grat_texto');
                if (input) input.value = btn.dataset.texto || '';
            });
        });

        UI.bindForm('gratitud-form', (fd) => {
            const id = DateUtils.generateId();
            const entrada = { id, fecha: fd.grat_fecha || DateUtils.today(), texto: (fd.grat_texto || '').trim(), creado: new Date().toISOString() };
            if (!entrada.texto) return;
            const udata = Storage.getUserData(email);
            if (!udata.gratitud) udata.gratitud = { entradas: [] };
            udata.gratitud.entradas.push(entrada);
            Storage.saveUserData(email, udata);
            document.getElementById('input-grat_texto').value = '';
            document.getElementById('grat_fecha').value = DateUtils.today();
            UI.toast('Añadido a tu gratitud', 'success');
            this.render(container);
        });

        container.querySelectorAll('.gratitud-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const udata = Storage.getUserData(email);
                if (!udata.gratitud) udata.gratitud = { entradas: [] };
                udata.gratitud.entradas = udata.gratitud.entradas.filter(e => e.id !== id);
                Storage.saveUserData(email, udata);
                UI.toast('Entrada eliminada', 'success');
                this.render(container);
            });
        });
    }
};
