/* ============================================
   MANAGER - Admin Panel & User Management
   ============================================ */

const Manager = {
    render(container) {
        const user = Auth.getCurrentUser();
        if (!user || user.rol !== 'manager') {
            container.innerHTML = UI.emptyState('Acceso denegado', '🔒');
            return;
        }

        const users = Storage.getUsers();
        const userList = Object.values(users).filter(u => u.rol !== 'manager');
        const globalConfig = Storage.getModulesGlobal();

        container.innerHTML = `
            ${UI.pageTitle('Panel de Administración')}

            <div class="manager-section">
                <h3>Usuarios Registrados (${userList.length})</h3>
                ${userList.length > 0 ? `
                    <div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Correo</th>
                                    <th>Nombre</th>
                                    <th>Fecha Registro</th>
                                    <th>Config. Completa</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userList.map(u => `
                                    <tr>
                                        <td>${UI.esc(u.email)}</td>
                                        <td>${UI.esc(u.perfil?.nombre || '-')}</td>
                                        <td>${u.fechaCreacion ? DateUtils.format(DateUtils.toDateStr(new Date(u.fechaCreacion)), 'short') : '-'}</td>
                                        <td>
                                            <span class="badge ${u.configuracionCompleta ? 'badge-success' : 'badge-warning'}">
                                                ${u.configuracionCompleta ? 'Completo' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn btn-ghost btn-sm" data-action="change-pass" data-email="${UI.esc(u.email)}">Cambiar Clave</button>
                                            <button class="btn btn-ghost btn-sm" data-action="view-as" data-email="${UI.esc(u.email)}">Ver como</button>
                                            <button class="btn btn-ghost btn-sm text-error" data-action="delete-user" data-email="${UI.esc(u.email)}">Eliminar</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : UI.emptyState('No hay usuarios registrados')}
            </div>

            <div class="manager-section">
                <h3>Módulos Globales</h3>
                <p class="text-secondary mb-md">Activa o desactiva módulos para todos los usuarios.</p>
                <div class="module-options" id="manager-modules">
                    ${this._renderModuleToggles(globalConfig)}
                </div>
            </div>

            <div class="manager-section">
                <h3>Categorías de Gastos</h3>
                <div id="cats-gastos" class="flex flex-wrap gap-sm mb-md">
                    ${globalConfig.categoriasGastos.map(c => `
                        <span class="chip">${UI.esc(c)}<span class="chip-remove" data-cat="gastos" data-val="${UI.esc(c)}">✕</span></span>
                    `).join('')}
                </div>
                <div class="flex gap-sm">
                    <input type="text" id="new-cat-gasto" class="form-input" placeholder="Nueva categoría" style="max-width:200px;">
                    <button id="btn-add-cat-gasto" class="btn btn-secondary btn-sm">Agregar</button>
                </div>
            </div>

            <div class="manager-section">
                <h3>Categorías de Ingresos</h3>
                <div id="cats-ingresos" class="flex flex-wrap gap-sm mb-md">
                    ${globalConfig.categoriasIngresos.map(c => `
                        <span class="chip">${UI.esc(c)}<span class="chip-remove" data-cat="ingresos" data-val="${UI.esc(c)}">✕</span></span>
                    `).join('')}
                </div>
                <div class="flex gap-sm">
                    <input type="text" id="new-cat-ingreso" class="form-input" placeholder="Nueva categoría" style="max-width:200px;">
                    <button id="btn-add-cat-ingreso" class="btn btn-secondary btn-sm">Agregar</button>
                </div>
            </div>

            <div class="manager-section mt-lg">
                <button id="btn-manager-logout" class="btn btn-danger">Cerrar Sesión</button>
            </div>
        `;

        this._bindEvents(container);
    },

    _renderModuleToggles(config) {
        // These are conceptual global toggles
        const modules = [
            { key: 'finanzas', label: 'Finanzas', active: true },
            { key: 'calendario', label: 'Calendario', active: true },
            { key: 'habitos', label: 'Hábitos', active: true },
            { key: 'ejercicios', label: 'Ejercicios', active: true },
            { key: 'estudios', label: 'Estudios', active: true },
            { key: 'religion', label: 'Religión', active: true },
            { key: 'juegos', label: 'Juegos', active: true },
            { key: 'documentos', label: 'Documentos', active: true },
            { key: 'gastosCompartidos', label: 'Gastos Compartidos', active: true },
            { key: 'cicloMenstrual', label: 'Ciclo Menstrual', active: true }
        ];
        return modules.map(m => `
            <div class="module-option selected" data-module="${m.key}">
                <input type="checkbox" checked>
                <span class="module-option-text">${m.label}</span>
            </div>
        `).join('');
    },

    _bindEvents(container) {
        // Change password
        container.querySelectorAll('[data-action="change-pass"]').forEach(btn => {
            btn.addEventListener('click', () => this._showChangePassword(btn.dataset.email));
        });

        // View as user
        container.querySelectorAll('[data-action="view-as"]').forEach(btn => {
            btn.addEventListener('click', () => {
                Storage.setSession('manager', false);
                // Temporarily store which user to view as
                const email = btn.dataset.email;
                sessionStorage.setItem('manager_view_as', email);
                Storage.setSession(email, true);
                window.location.hash = '#dashboard';
                Router.refresh();
                UI.toast(`Viendo como ${email} (solo lectura)`, 'info');
            });
        });

        // Delete user
        container.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.confirm(`¿Eliminar al usuario ${btn.dataset.email}? Esta acción no se puede deshacer.`, () => {
                    Storage.deleteUser(btn.dataset.email);
                    UI.toast('Usuario eliminado', 'success');
                    this.render(container);
                });
            });
        });

        // Remove category chips
        container.querySelectorAll('.chip-remove').forEach(chip => {
            chip.addEventListener('click', () => {
                const catType = chip.dataset.cat;
                const val = chip.dataset.val;
                const config = Storage.getModulesGlobal();
                if (catType === 'gastos') {
                    config.categoriasGastos = config.categoriasGastos.filter(c => c !== val);
                } else if (catType === 'ingresos') {
                    config.categoriasIngresos = config.categoriasIngresos.filter(c => c !== val);
                }
                Storage.saveModulesGlobal(config);
                this.render(container);
            });
        });

        // Add category
        UI.bindButton('btn-add-cat-gasto', () => {
            const input = document.getElementById('new-cat-gasto');
            const val = input.value.trim();
            if (!val) return;
            const config = Storage.getModulesGlobal();
            if (!config.categoriasGastos.includes(val)) {
                config.categoriasGastos.push(val);
                Storage.saveModulesGlobal(config);
                this.render(container);
            }
        });

        UI.bindButton('btn-add-cat-ingreso', () => {
            const input = document.getElementById('new-cat-ingreso');
            const val = input.value.trim();
            if (!val) return;
            const config = Storage.getModulesGlobal();
            if (!config.categoriasIngresos.includes(val)) {
                config.categoriasIngresos.push(val);
                Storage.saveModulesGlobal(config);
                this.render(container);
            }
        });

        // Manager logout
        UI.bindButton('btn-manager-logout', () => Auth.logout());
    },

    _showChangePassword(email) {
        UI.showModal(`
            <h3 class="modal-title">Cambiar Contraseña</h3>
            <p class="text-secondary mb-md">Usuario: ${UI.esc(email)}</p>
            <form id="change-pass-form">
                ${UI.formGroup('Nueva Contraseña', UI.input('new_password', { type: 'password', placeholder: 'Nueva contraseña', required: true }))}
                <div class="modal-actions">
                    <button type="button" id="btn-cp-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Cambiar</button>
                </div>
            </form>
        `, {
            size: 'sm',
            onReady: () => {
                UI.bindButton('btn-cp-cancel', () => UI.closeModal());
                UI.bindForm('change-pass-form', async (data) => {
                    if (!data.new_password || data.new_password.length < 3) {
                        UI.toast('La contraseña debe tener al menos 3 caracteres', 'error');
                        return;
                    }
                    await Auth.changePassword(email, data.new_password);
                    UI.closeModal();
                    UI.toast('Contraseña actualizada', 'success');
                });
            }
        });
    },

    // Return to manager from "view as" mode
    returnToManager() {
        sessionStorage.removeItem('manager_view_as');
        Storage.setSession('manager');
        window.location.hash = '#manager';
        Router.refresh();
    }
};
