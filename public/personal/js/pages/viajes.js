/* ============================================
   VIAJES - Registro de viajes + fotos + opción a línea de vida
   ============================================ */

const ViajesPage = {
    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const viajes = (data.viajes || []).slice().sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));

        container.innerHTML = `
            ${UI.pageTitle('Viajes', '<button id="btn-add-viaje" class="btn btn-primary btn-sm">+ Nuevo viaje</button>')}
            <p class="text-secondary mb-lg">Registra tus viajes y fotos. Puedes añadirlos a tu línea de vida (Biografía) para verlos también en tu historia.</p>

            ${viajes.length === 0 ? `
                <div class="card">
                    <div class="empty-state">
                        <p class="text-secondary">Aún no hay viajes. Añade uno para comenzar.</p>
                        <button type="button" id="btn-empty-add-viaje" class="btn btn-primary btn-sm mt-md">+ Nuevo viaje</button>
                    </div>
                </div>
            ` : `
                <div class="cards-grid">
                    ${viajes.map(v => `
                        <div class="card" data-viaje-id="${UI.esc(v.id)}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                                <h4 class="card-title mb-0">${UI.esc(v.destino || 'Sin destino')}</h4>
                                <span class="badge ${v.anadidoALineaVida ? 'badge-success' : 'badge-ghost'}">${v.anadidoALineaVida ? 'En línea de vida' : 'No en línea'}</span>
                            </div>
                            <p class="text-secondary text-sm mt-sm mb-0">
                                ${DateUtils.format(v.fechaInicio || '', 'medium')}${v.fechaFin ? ' – ' + DateUtils.format(v.fechaFin, 'medium') : ''}
                            </p>
                            ${v.conQuien ? `<p class="text-secondary text-sm">👥 ${UI.esc(v.conQuien)}</p>` : ''}
                            ${v.notas ? `<p class="text-secondary text-sm mt-xs">${UI.esc(v.notas)}</p>` : ''}
                            ${(v.fotos && v.fotos.length) ? `<div class="viaje-foto-strip" data-viaje-strip="${UI.esc(v.id)}">${v.fotos.map((f, i) => this._fotoThumbHtml(f, i)).join('')}</div>` : ''}
                            <div class="mt-md" style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button type="button" class="btn btn-ghost btn-sm btn-edit-viaje" data-id="${UI.esc(v.id)}">Editar</button>
                                <button type="button" class="btn btn-ghost btn-sm btn-to-linea-vida" data-id="${UI.esc(v.id)}" ${v.anadidoALineaVida ? 'disabled' : ''}>Añadir a línea de vida</button>
                                <button type="button" class="btn btn-danger btn-sm btn-del-viaje" data-id="${UI.esc(v.id)}">Eliminar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
            <p class="text-sm text-secondary mt-lg"><a href="#biografia">Ver línea de vida (Biografía)</a></p>
        `;

        this._hydrateViajeFotos(container);
        this._bindEvents(container, email);
    },

    _fotoThumbHtml(f, i) {
        if (f.url) return `<div class="viaje-foto-cell"><img src="${UI.esc(f.url)}" alt="" class="viaje-foto-img" loading="lazy"/></div>`;
        if (f.idbKey) return `<div class="viaje-foto-cell"><img alt="" class="viaje-foto-img" data-idb-key="${UI.esc(f.idbKey)}" loading="lazy"/></div>`;
        return '';
    },

    async _hydrateViajeFotos(container) {
        const imgs = container.querySelectorAll('.viaje-foto-img[data-idb-key]');
        for (const img of imgs) {
            const key = img.getAttribute('data-idb-key');
            const url = await Storage.getFotoDataUrl(key);
            if (url) img.src = url;
        }
    },

    _bindEvents(container, email) {
        const self = this;

        const openForm = (viajeId = null) => {
            const data = Storage.getUserData(email);
            const v = viajeId ? (data.viajes || []).find(x => x.id === viajeId) : null;
            let fotoDraft = (v?.fotos || []).map(x => ({ ...x }));

            const renderFotoDraft = (wrapEl) => {
                if (!wrapEl) return;
                wrapEl.innerHTML = fotoDraft.length ? `
                    <div class="bio-fotos-draft-grid">
                        ${fotoDraft.map((f, i) => `
                            <div class="bio-foto-draft" data-idx="${i}">
                                ${f.url ? `<img src="${UI.esc(f.url)}" class="bio-foto-img" alt=""/>` : `<img data-draft-idb="${UI.esc(f.idbKey)}" class="bio-foto-img" alt=""/>`}
                                <button type="button" class="btn btn-ghost btn-xs v-foto-remove" data-idx="${i}">Quitar</button>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-xs text-secondary">Sin fotos.</p>';
                wrapEl.querySelectorAll('img[data-draft-idb]').forEach(async (img) => {
                    const u = await Storage.getFotoDataUrl(img.getAttribute('data-draft-idb'));
                    if (u) img.src = u;
                });
                wrapEl.querySelectorAll('.v-foto-remove').forEach(b => {
                    b.addEventListener('click', async () => {
                        const idx = parseInt(b.dataset.idx, 10);
                        const fo = fotoDraft[idx];
                        if (fo && fo.idbKey) await Storage.deleteFotoRecord(fo.idbKey);
                        fotoDraft.splice(idx, 1);
                        renderFotoDraft(wrapEl);
                    });
                });
            };

            UI.showModal(`
                <h3 class="modal-title">${v ? 'Editar viaje' : 'Nuevo viaje'}</h3>
                <form id="viaje-form">
                    ${UI.formGroup('Destino', UI.input('v_destino', { value: v?.destino || '', placeholder: 'Ciudad, país, lugar', required: true }))}
                    <div class="form-row">
                        ${UI.formGroup('Fecha inicio', UI.input('v_fechaInicio', { type: 'date', value: v?.fechaInicio || DateUtils.today(), required: true }))}
                        ${UI.formGroup('Fecha fin (opcional)', UI.input('v_fechaFin', { type: 'date', value: v?.fechaFin || '' }))}
                    </div>
                    ${UI.formGroup('Con quién (opcional)', UI.input('v_conQuien', { value: v?.conQuien || '', placeholder: 'Familia, amigos, solo...' }))}
                    ${UI.formGroup('Notas', `<textarea name="v_notas" id="input-v_notas" class="form-input" rows="3" placeholder="Qué hiciste, anécdotas...">${v?.notas ? UI.esc(v.notas) : ''}</textarea>`)}
                    <div class="form-group">
                        <label class="form-label">Fotos (opcional)</label>
                        <p class="text-secondary text-xs mb-sm">URL o imágenes (máx. ~600 KB c/u).</p>
                        <div class="form-row mb-sm">
                            <input type="url" id="v_foto_url" class="form-input" placeholder="https://…"/>
                            <button type="button" id="v_add_url" class="btn btn-ghost btn-sm">Añadir URL</button>
                        </div>
                        <input type="file" id="v_fotos_files" accept="image/*" multiple class="sr-only"/>
                        <button type="button" id="v_pick_files" class="btn btn-ghost btn-sm">Elegir imágenes</button>
                        <div id="v-fotos-wrap" class="mt-sm"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-check">
                            <input type="checkbox" name="v_linea_vida" id="input-v_linea_vida" value="1" ${v?.anadidoALineaVida ? 'checked' : ''}>
                            <span class="form-check-label">Añadir a línea de vida (Biografía)</span>
                        </label>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="btn-viaje-cancel" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${v ? 'Guardar' : 'Crear'}</button>
                    </div>
                </form>
            `, {
                size: 'lg',
                onReady: () => {
                    const wrap = document.getElementById('v-fotos-wrap');
                    renderFotoDraft(wrap);
                    document.getElementById('v_add_url')?.addEventListener('click', () => {
                        const url = (document.getElementById('v_foto_url')?.value || '').trim();
                        if (!url || !/^https?:\/\//i.test(url)) {
                            UI.toast('URL no válida', 'warning');
                            return;
                        }
                        fotoDraft.push({ id: DateUtils.generateId(), url });
                        document.getElementById('v_foto_url').value = '';
                        renderFotoDraft(wrap);
                    });
                    document.getElementById('v_pick_files')?.addEventListener('click', () => document.getElementById('v_fotos_files')?.click());
                    document.getElementById('v_fotos_files')?.addEventListener('change', async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        for (const file of Array.from(files)) {
                            if (file.size > Storage.MAX_FOTO_FILE_BYTES) {
                                UI.toast(`"${file.name}" demasiado grande`, 'warning');
                                continue;
                            }
                            const reader = new FileReader();
                            reader.onload = async () => {
                                const key = await Storage.saveFotoDataUrl(email, reader.result);
                                if (key) {
                                    fotoDraft.push({ id: DateUtils.generateId(), idbKey: key });
                                    renderFotoDraft(wrap);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                        e.target.value = '';
                    });
                    UI.bindButton('btn-viaje-cancel', () => UI.closeModal());
                    UI.bindForm('viaje-form', async (fd) => {
                        const destino = (fd.v_destino || '').trim();
                        if (!destino) return;
                        const d = Storage.getUserData(email);
                        if (!d.viajes) d.viajes = [];

                        const oldV = v ? { ...v } : null;
                        const oldFotos = oldV?.fotos || [];
                        const removed = oldFotos.filter(o => !fotoDraft.some(n => (n.idbKey && n.idbKey === o.idbKey) || (n.url && n.url === o.url)));
                        await Storage.deleteFotoRefs(removed);

                        const payload = {
                            id: v?.id || DateUtils.generateId(),
                            destino,
                            fechaInicio: fd.v_fechaInicio || DateUtils.today(),
                            fechaFin: (fd.v_fechaFin || '').trim() || undefined,
                            conQuien: (fd.v_conQuien || '').trim() || undefined,
                            notas: (fd.v_notas || '').trim() || undefined,
                            fotos: fotoDraft.length ? fotoDraft.map(x => ({ id: x.id, ...(x.url ? { url: x.url } : {}), ...(x.idbKey ? { idbKey: x.idbKey } : {}) })) : undefined,
                            creado: v?.creado || new Date().toISOString(),
                            anadidoALineaVida: !!document.getElementById('input-v_linea_vida')?.checked
                        };
                        if (v) {
                            const idx = d.viajes.findIndex(x => x.id === v.id);
                            if (idx >= 0) d.viajes[idx] = payload;
                        } else {
                            d.viajes.push(payload);
                        }
                        if (payload.anadidoALineaVida) {
                            if (!d.biografia) d.biografia = { eventos: [] };
                            const titulo = `Viaje: ${destino}`;
                            const desc = [payload.fechaInicio, payload.fechaFin, payload.conQuien, payload.notas].filter(Boolean).join(' · ');
                            const yaIdx = (d.biografia.eventos || []).findIndex(e => e.origen === 'viaje' && e.viajeId === payload.id);
                            const evObj = {
                                id: yaIdx >= 0 ? d.biografia.eventos[yaIdx].id : DateUtils.generateId(),
                                fecha: payload.fechaInicio,
                                tipo: 'evento',
                                titulo,
                                descripcion: desc || undefined,
                                lugar: destino,
                                creado: yaIdx >= 0 ? d.biografia.eventos[yaIdx].creado : new Date().toISOString(),
                                origen: 'viaje',
                                viajeId: payload.id
                            };
                            if (yaIdx >= 0) d.biografia.eventos[yaIdx] = evObj;
                            else d.biografia.eventos.push(evObj);
                        } else {
                            if (d.biografia?.eventos) {
                                d.biografia.eventos = d.biografia.eventos.filter(e => e.viajeId !== payload.id);
                            }
                        }
                        Storage.saveUserData(email, d);
                        UI.closeModal();
                        UI.toast(v ? 'Viaje actualizado' : 'Viaje creado', 'success');
                        self.render(container);
                    });
                }
            });
        };

        UI.bindButton('btn-add-viaje', () => openForm());
        const emptyBtn = document.getElementById('btn-empty-add-viaje');
        if (emptyBtn) emptyBtn.addEventListener('click', () => openForm());

        container.querySelectorAll('.btn-edit-viaje').forEach(btn => {
            btn.addEventListener('click', () => openForm(btn.dataset.id));
        });
        container.querySelectorAll('.btn-to-linea-vida').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = Storage.getUserData(email);
                const v = (d.viajes || []).find(x => x.id === btn.dataset.id);
                if (!v || v.anadidoALineaVida) return;
                v.anadidoALineaVida = true;
                if (!d.biografia) d.biografia = { eventos: [] };
                const yaExiste = (d.biografia.eventos || []).some(e => e.origen === 'viaje' && e.viajeId === v.id);
                if (!yaExiste) {
                    d.biografia.eventos.push({
                        id: DateUtils.generateId(),
                        fecha: v.fechaInicio,
                        tipo: 'evento',
                        titulo: `Viaje: ${v.destino || 'Sin destino'}`,
                        descripcion: [v.fechaFin, v.conQuien, v.notas].filter(Boolean).join(' · ') || undefined,
                        lugar: v.destino,
                        creado: new Date().toISOString(),
                        origen: 'viaje',
                        viajeId: v.id
                    });
                }
                Storage.saveUserData(email, d);
                UI.toast('Añadido a línea de vida', 'success');
                self.render(container);
            });
        });
        container.querySelectorAll('.btn-del-viaje').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este viaje?')) return;
                const d = Storage.getUserData(email);
                const victim = (d.viajes || []).find(x => x.id === btn.dataset.id);
                if (victim?.fotos) await Storage.deleteFotoRefs(victim.fotos);
                d.viajes = (d.viajes || []).filter(x => x.id !== btn.dataset.id);
                if (d.biografia?.eventos) {
                    d.biografia.eventos = d.biografia.eventos.filter(e => e.viajeId !== btn.dataset.id);
                }
                Storage.saveUserData(email, d);
                UI.toast('Viaje eliminado', 'success');
                self.render(container);
            });
        });
    }
};
