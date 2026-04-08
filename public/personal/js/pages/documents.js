/* ============================================
   DOCUMENTS PAGE - Personal Document Storage
   ============================================ */

const DocumentsPage = {
    defaultGroupNames: ['Personales', 'Auto', 'Casas', 'Propiedades', 'Tarjetas', 'Datos para Transferencias', 'Otro'],

    _ensureGrupos(email) {
        const data = Storage.getUserData(email);
        if (!data.documentos) data.documentos = { grupos: [] };
        if (!data.documentos.grupos || data.documentos.grupos.length === 0) {
            data.documentos.grupos = this.defaultGroupNames.map(nombre => ({
                id: DateUtils.generateId(),
                nombre
            }));
            Storage.saveUserData(email, data);
        }
        return data.documentos.grupos;
    },

    async render(container) {
        const email = Auth.getCurrentEmail();
        const grupos = this._ensureGrupos(email);
        let docs = [];
        try {
            docs = await Storage.getDocuments(email);
        } catch (e) {
            console.error('Error loading documents:', e);
        }

        const byGrupo = {};
        grupos.forEach(g => { byGrupo[g.id] = { ...g, docs: [] }; });
        docs.forEach(d => {
            const gid = d.grupoId || (grupos.find(g => g.nombre === (d.categoria || 'Otro'))?.id) || (grupos.find(g => g.nombre === 'Otro')?.id) || grupos[0]?.id;
            if (byGrupo[gid]) byGrupo[gid].docs.push(d);
            else byGrupo[grupos[0]?.id || '']?.docs.push(d);
        });

        container.innerHTML = `
            ${UI.pageTitle('Documentos', '<div class="flex gap-sm"><button id="btn-add-group" class="btn btn-ghost btn-sm">+ Grupo</button><button id="btn-upload-doc" class="btn btn-primary btn-sm">+ Subir</button></div>')}

            <div class="filters-bar">
                <input type="text" id="doc-search" class="form-input" placeholder="Buscar documentos..." style="max-width:300px;">
            </div>

            <div id="docs-container">
                ${Object.values(byGrupo).map(grupo => `
                    <div class="mb-lg doc-group" data-grupo-id="${grupo.id}">
                        <div class="doc-group-header flex justify-between items-center mb-sm flex-wrap gap-sm">
                            <div class="flex items-center gap-sm" style="min-width:0;">
                                <button type="button" class="doc-group-toggle btn btn-ghost btn-sm" aria-expanded="true" title="Expandir/contraer">▼</button>
                                <h4 class="mb-0 doc-group-title">${UI.esc(grupo.nombre)} (${grupo.docs.length})</h4>
                            </div>
                            <div class="flex gap-xs">
                                <button class="btn btn-ghost btn-sm btn-edit-group" data-grupo-id="${grupo.id}" data-grupo-name="${UI.esc(grupo.nombre)}" title="Editar grupo">✏️</button>
                                <button class="btn btn-ghost btn-sm btn-del-group" data-grupo-id="${grupo.id}" data-grupo-name="${UI.esc(grupo.nombre)}" ${grupo.docs.length > 0 ? 'disabled title="Elimina antes los documentos del grupo"' : ''} title="Eliminar grupo">🗑️</button>
                            </div>
                        </div>
                        <div class="doc-group-body">
                        <div class="doc-grid">
                            ${grupo.docs.map(d => `
                                <div class="card card-clickable doc-card" data-doc-id="${d.id}">
                                    <div class="doc-icon">${this._getIcon(d.tipo)}</div>
                                    <div class="doc-name">${UI.esc(d.nombre)}</div>
                                    <div class="text-muted" style="font-size:0.7rem;">${d.fecha ? DateUtils.format(d.fecha, 'short') : ''}</div>
                                </div>
                            `).join('')}
                        </div>
                        </div>
                    </div>
                `).join('')}
                ${docs.length === 0 ? UI.emptyState('Sin documentos. Sube archivos o crea un grupo para organizarlos.') : ''}
            </div>
        `;

        this._bindEvents(container, email);

        container.querySelectorAll('.doc-group-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.closest('.doc-group');
                const body = group?.querySelector('.doc-group-body');
                if (!body) return;
                const isExpanded = body.classList.toggle('doc-group-body-collapsed');
                btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
                btn.textContent = isExpanded ? '▶' : '▼';
            });
        });
    },

    _getIcon(type) {
        if (!type) return '📄';
        if (type.startsWith('image/')) return '🖼️';
        if (type.includes('pdf')) return '📕';
        if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return '📊';
        if (type.includes('word') || type.includes('document')) return '📝';
        return '📄';
    },

    _bindEvents(container, email) {
        const grupos = this._ensureGrupos(email);

        // Add group
        UI.bindButton('btn-add-group', () => {
            UI.showModal(`
                <h3 class="modal-title">Nuevo grupo</h3>
                <form id="new-group-form">
                    ${UI.formGroup('Nombre del grupo', UI.input('group_name', { placeholder: 'Ej: Vehículos', required: true }))}
                    <div class="modal-actions">
                        <button type="button" id="btn-new-group-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `, {
                onReady: () => {
                    UI.bindButton('btn-new-group-cancel', () => UI.closeModal());
                    document.getElementById('new-group-form').addEventListener('submit', (e) => {
                        e.preventDefault();
                        const name = document.getElementById('input-group_name').value?.trim();
                        if (!name) return;
                        const data = Storage.getUserData(email);
                        data.documentos.grupos.push({ id: DateUtils.generateId(), nombre: name });
                        Storage.saveUserData(email, data);
                        UI.closeModal();
                        UI.toast('Grupo creado', 'success');
                        this.render(container);
                    });
                }
            });
        });

        container.querySelectorAll('.btn-edit-group').forEach(btn => {
            btn.addEventListener('click', () => {
                const gid = btn.dataset.grupoId;
                const currentName = btn.dataset.grupoName || '';
                UI.showModal(`
                    <h3 class="modal-title">Editar grupo</h3>
                    <form id="edit-group-form">
                        ${UI.formGroup('Nombre', UI.input('edit_group_name', { placeholder: 'Nombre', value: currentName, required: true }))}
                        <div class="modal-actions">
                            <button type="button" id="btn-edit-group-cancel" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                `, {
                    onReady: () => {
                        UI.bindButton('btn-edit-group-cancel', () => UI.closeModal());
                        document.getElementById('edit-group-form').addEventListener('submit', (e) => {
                            e.preventDefault();
                            const name = document.getElementById('input-edit_group_name').value?.trim();
                            if (!name) return;
                            const data = Storage.getUserData(email);
                            const g = data.documentos.grupos.find(x => x.id === gid);
                            if (g) { g.nombre = name; Storage.saveUserData(email, data); }
                            UI.closeModal();
                            UI.toast('Grupo actualizado', 'success');
                            this.render(container);
                        });
                    }
                });
            });
        });

        container.querySelectorAll('.btn-del-group').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                const gid = btn.dataset.grupoId;
                UI.confirm('¿Eliminar este grupo? (debe estar vacío)', () => {
                    const data = Storage.getUserData(email);
                    data.documentos.grupos = data.documentos.grupos.filter(x => x.id !== gid);
                    Storage.saveUserData(email, data);
                    UI.toast('Grupo eliminado', 'success');
                    this.render(container);
                });
            });
        });

        // Upload
        UI.bindButton('btn-upload-doc', () => {
            const groupOptions = this._ensureGrupos(email).map(g => ({ value: g.id, label: g.nombre }));
            UI.showModal(`
                <h3 class="modal-title">Subir Documento</h3>
                <form id="upload-form">
                    ${UI.formGroup('Nombre', UI.input('doc_name', { placeholder: 'Nombre del documento', required: true }))}
                    ${UI.formGroup('Grupo', UI.select('doc_grupo', groupOptions, groupOptions[0]?.value || '', { required: true }))}
                    ${UI.formGroup('Archivo', '<input type="file" id="doc-file" class="form-input" required>')}
                    <p class="form-hint">Máximo recomendado: 5MB por archivo.</p>
                    <div class="modal-actions">
                        <button type="button" id="btn-upload-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Subir</button>
                    </div>
                </form>
            `, {
                onReady: () => {
                    UI.bindButton('btn-upload-cancel', () => UI.closeModal());
                    const form = document.getElementById('upload-form');
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const name = document.getElementById('input-doc_name').value;
                        const grupoId = document.getElementById('input-doc_grupo').value;
                        const grupo = this._ensureGrupos(email).find(g => g.id === grupoId);
                        const fileInput = document.getElementById('doc-file');
                        const file = fileInput.files[0];

                        if (!file) {
                            UI.toast('Selecciona un archivo', 'error');
                            return;
                        }

                        if (file.size > 10 * 1024 * 1024) {
                            UI.toast('Archivo demasiado grande (máx 10MB)', 'error');
                            return;
                        }

                        try {
                            const base64 = await this._fileToBase64(file);
                            await Storage.saveDocument({
                                id: DateUtils.generateId(),
                                email,
                                nombre: name || file.name,
                                categoria: grupo?.nombre || 'Otro',
                                grupoId: grupoId || null,
                                tipo: file.type,
                                base64data: base64,
                                fecha: DateUtils.today()
                            });
                            UI.closeModal();
                            UI.toast('Documento subido exitosamente', 'success');
                            this.render(container);
                        } catch (err) {
                            UI.toast('Error al subir: ' + err.message, 'error');
                        }
                    });
                }
            });
        });

        // Click document
        container.querySelectorAll('[data-doc-id]').forEach(card => {
            card.addEventListener('click', async () => {
                const id = card.dataset.docId;
                try {
                    const doc = await Storage.idbGet('documentos', id);
                    if (!doc) {
                        UI.toast('Documento no encontrado', 'error');
                        return;
                    }
                    this._showDocPreview(container, email, doc);
                } catch (e) {
                    UI.toast('Error al cargar documento', 'error');
                }
            });
        });

        // Search
        const searchInput = document.getElementById('doc-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase();
                container.querySelectorAll('.doc-card').forEach(card => {
                    const name = card.querySelector('.doc-name')?.textContent?.toLowerCase() || '';
                    card.style.display = name.includes(query) ? '' : 'none';
                });
            });
        }
    },

    _showDocPreview(container, email, doc) {
        let previewHtml = '';
        if (doc.tipo && doc.tipo.startsWith('image/')) {
            previewHtml = `<img src="${doc.base64data}" style="max-width:100%; border-radius: var(--border-radius-sm);">`;
        } else if (doc.tipo && doc.tipo.includes('pdf')) {
            previewHtml = `<p class="text-secondary">Vista previa no disponible para PDF.</p>`;
        } else {
            previewHtml = `<p class="text-secondary">Vista previa no disponible para este tipo de archivo.</p>`;
        }

        const grupoNombre = doc.grupoId ? (Storage.getUserData(email).documentos?.grupos?.find(g => g.id === doc.grupoId)?.nombre) : doc.categoria;
        UI.showModal(`
            <h3 class="modal-title">${UI.esc(doc.nombre)}</h3>
            <p class="text-secondary mb-md">${UI.esc(grupoNombre || doc.categoria || '')} · ${doc.fecha ? DateUtils.format(doc.fecha, 'medium') : ''} · ${doc.tipo || 'Desconocido'}</p>
            ${previewHtml}
            <div class="modal-actions mt-lg">
                <button id="btn-doc-delete" class="btn btn-danger btn-sm">Eliminar</button>
                <button id="btn-doc-download" class="btn btn-primary btn-sm">Descargar</button>
            </div>
        `, {
            size: 'lg',
            onReady: () => {
                UI.bindButton('btn-doc-download', () => {
                    const a = document.createElement('a');
                    a.href = doc.base64data;
                    a.download = doc.nombre;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });

                UI.bindButton('btn-doc-delete', () => {
                    UI.confirm('¿Eliminar este documento?', async () => {
                        await Storage.deleteDocument(doc.id);
                        UI.closeModal();
                        UI.toast('Documento eliminado', 'success');
                        this.render(container);
                    });
                });
            }
        });
    },

    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};
