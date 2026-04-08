/* ============================================
   BIOGRAFÍA - Línea de tiempo personal
   Eventos, fotos (URL o IndexedDB), filtros; vínculo con Viajes.
   ============================================ */

const BIOGRAFIA_TIPOS = [
    { value: 'nacimiento', label: 'Nacimiento / Origen', icon: '🌟' },
    { value: 'lugar', label: 'Ciudad o lugar donde viví', icon: '📍' },
    { value: 'evento', label: 'Evento (terremoto, fiesta, concierto, etc.)', icon: '🎉' },
    { value: 'estudio', label: 'Estudios', icon: '📚' },
    { value: 'trabajo', label: 'Trabajo', icon: '💼' },
    { value: 'familia', label: 'Familia', icon: '👨‍👩‍👧' },
    { value: 'otro', label: 'Otro', icon: '📌' }
];

const BiografiaPage = {
    _filterTipo: '',
    _filterYear: '',
    _formFotos: [],

    _getFotosForEvent(ev, data) {
        if (ev.origen === 'viaje' && ev.viajeId) {
            const v = (data.viajes || []).find(x => x.id === ev.viajeId);
            if (v && Array.isArray(v.fotos) && v.fotos.length) return { fotos: v.fotos, desdeViaje: true };
        }
        return { fotos: ev.fotos || [], desdeViaje: false };
    },

    _yearFromFecha(fecha) {
        if (!fecha || typeof fecha !== 'string') return '';
        return fecha.slice(0, 4) || '';
    },

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const bio = data.biografia || { eventos: [] };
        let eventos = (bio.eventos || []).slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
        if (this._filterTipo) eventos = eventos.filter(e => (e.tipo || 'otro') === this._filterTipo);
        if (this._filterYear) eventos = eventos.filter(e => this._yearFromFecha(e.fecha) === this._filterYear);

        const allEventos = (bio.eventos || []).slice();
        const yearsSet = new Set(allEventos.map(e => this._yearFromFecha(e.fecha)).filter(Boolean));
        const years = Array.from(yearsSet).sort();

        const filterOptions = [{ value: '', label: 'Todos los tipos' }, ...BIOGRAFIA_TIPOS];
        const yearOptions = [{ value: '', label: 'Todos los años' }, ...years.map(y => ({ value: y, label: y }))];

        const viajesConFotos = (data.viajes || []).filter(v => v.anadidoALineaVida && Array.isArray(v.fotos) && v.fotos.length);
        const resumenViajes = viajesConFotos.length
            ? `<div class="card mb-lg bio-viajes-resumen">
                <h4 class="card-title mb-sm">Desde viajes</h4>
                <p class="text-secondary text-sm mb-md">Hitos enlazados a un viaje muestran las mismas fotos que en <a href="#viajes">Viajes</a>.</p>
                <div class="bio-viajes-chips">${viajesConFotos.map(v => `
                    <a href="#viajes" class="badge badge-ghost bio-viaje-chip" title="${UI.esc(v.destino || '')}">${UI.esc(v.destino || 'Viaje')} · ${this._yearFromFecha(v.fechaInicio) || '—'}</a>
                `).join('')}</div>
               </div>`
            : '';

        container.innerHTML = `
            ${UI.pageTitle('Biografía', '<a href="#dashboard" class="btn btn-ghost btn-sm">← Inicio</a>', 'biografia')}
            <p class="text-secondary mb-lg">Construye tu línea de tiempo con lugares, eventos, fotos y recuerdos. Los viajes en línea de vida se reflejan aquí con sus fotos.</p>

            ${resumenViajes}

            <div class="card mb-lg">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                    <h4 class="card-title mb-0">Nuevo hito</h4>
                    <button type="button" id="btn-add-evento" class="btn btn-primary btn-sm">+ Añadir</button>
                </div>
                <form id="bio-form" style="display:none;" class="p-md">
                    ${UI.formGroup('Fecha (aproximada)', UI.input('bio_fecha', { type: 'date', required: true }))}
                    ${UI.formGroup('Tipo', UI.select('bio_tipo', BIOGRAFIA_TIPOS, '', { placeholder: 'Seleccionar' }))}
                    ${UI.formGroup('Título', UI.input('bio_titulo', { placeholder: 'Ej: Nací en Santiago', required: true }))}
                    ${UI.formGroup('Lugar (opcional)', UI.input('bio_lugar', { placeholder: 'Ciudad, país' }))}
                    ${UI.formGroup('Descripción', '<textarea name="bio_desc" id="input-bio_desc" class="form-input" rows="3" placeholder="Detalles, recuerdos..."></textarea>')}
                    <div class="form-group">
                        <label class="form-label">Fotos (opcional)</label>
                        <p class="text-secondary text-xs mb-sm">URL o imágenes desde tu dispositivo (máx. ~600 KB c/u). Se guardan en el navegador (IndexedDB).</p>
                        <div id="bio-foto-url-row" class="form-row mb-sm">
                            <input type="url" id="input-bio_foto_url" class="form-input" placeholder="https://… imagen"/>
                            <button type="button" id="btn-bio-add-url" class="btn btn-ghost btn-sm">Añadir URL</button>
                        </div>
                        <input type="file" id="bio-fotos-files" accept="image/*" multiple class="sr-only" />
                        <button type="button" id="btn-bio-pick-files" class="btn btn-ghost btn-sm">Elegir imágenes</button>
                        <div id="bio-fotos-draft" class="bio-fotos-draft mt-sm"></div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" id="btn-bio-cancel" class="btn btn-ghost">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>

            <div class="card">
                <div class="card-header bio-filters-header">
                    <h4 class="card-title mb-0">Línea de tiempo</h4>
                    <div class="bio-filters">
                        <label class="text-sm text-secondary">Año</label>
                        <select id="bio-filter-year" class="form-input bio-filter-select">${yearOptions.map(o => `<option value="${o.value}" ${this._filterYear === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
                        <label class="text-sm text-secondary">Tipo</label>
                        <select id="bio-filter-tipo" class="form-input bio-filter-select">${filterOptions.map(o => `<option value="${o.value}" ${this._filterTipo === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
                    </div>
                </div>
                ${years.length > 1 && !this._filterYear ? `
                <div class="bio-year-jump text-sm mb-md">
                    <span class="text-secondary">Ir a:</span>
                    ${years.map(y => `<a href="#bio-anchor-${y}" class="bio-year-link">${y}</a>`).join(' · ')}
                </div>` : ''}
                ${eventos.length === 0 ? `
                    <div class="empty-state">
                        <p class="text-secondary">${this._filterTipo || this._filterYear ? 'No hay hitos con estos filtros.' : 'Aún no hay hitos. Añade uno arriba o desde el Diario / Viajes marcando "Añadir a línea de vida".'}</p>
                        <p class="text-sm mt-sm"><a href="#diary">Ir al Diario</a> · <a href="#viajes">Viajes</a></p>
                    </div>
                ` : this._renderTimelineGrouped(eventos, data)}
            </div>
        `;

        this._bindEvents(container, email);
        this._hydrateBioFotos(container, email);
    },

    _renderTimelineGrouped(eventos, data) {
        const byYear = {};
        eventos.forEach(ev => {
            const y = this._yearFromFecha(ev.fecha) || '—';
            if (!byYear[y]) byYear[y] = [];
            byYear[y].push(ev);
        });
        const yearsOrder = Object.keys(byYear).sort((a, b) => a.localeCompare(b));
        return `
            <p class="text-secondary text-sm mb-md">Orden cronológico. Las fotos de viajes enlazados se muestran automáticamente.</p>
            <div class="bio-timeline bio-timeline-interactive bio-timeline-visual bio-timeline--scroll">
                ${yearsOrder.map(y => `
                    <div class="bio-year-block" id="bio-anchor-${y}">
                        <h3 class="bio-year-title">${UI.esc(y)}</h3>
                        ${byYear[y].map((ev, i) => this._renderTimelineItem(ev, i, data)).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    },

    _renderTimelineItem(ev, i, data) {
        const hasDesc = !!(ev.descripcion && ev.descripcion.trim());
        const tipoInfo = BIOGRAFIA_TIPOS.find(t => t.value === (ev.tipo || 'otro')) || { label: 'Otro', icon: '📌' };
        const side = i % 2 === 0 ? 'left' : 'right';
        const { fotos, desdeViaje } = this._getFotosForEvent(ev, data);
        const galeria = fotos.length
            ? `<div class="bio-foto-grid" data-event-id="${UI.esc(ev.id)}">${fotos.map((f, idx) => this._fotoThumbPlaceholder(f, idx)).join('')}</div>`
            : '';
        const viajeNote = desdeViaje ? '<p class="text-xs text-secondary mt-xs mb-0">📷 Fotos del viaje (sincronizadas desde Viajes)</p>' : '';

        return `
            <div class="bio-timeline-item bio-timeline-item--${side}" data-id="${UI.esc(ev.id)}">
                <div class="bio-timeline-marker" role="presentation" title="${UI.esc(tipoInfo.label)}">${tipoInfo.icon}</div>
                <div class="bio-timeline-content">
                    <div class="bio-timeline-header">
                        <span class="bio-timeline-fecha">${DateUtils.format(ev.fecha || '', 'medium')}</span>
                        ${ev.origen === 'diario' ? '<span class="badge badge-info bio-badge">Diario</span>' : ''}
                        ${ev.origen === 'viaje' ? '<span class="badge badge-success bio-badge">Viaje</span>' : ''}
                        <span class="badge badge-ghost bio-tipo-badge">${tipoInfo.icon} ${tipoInfo.label}</span>
                    </div>
                    <h5 class="bio-timeline-titulo">${UI.esc(ev.titulo || '')}</h5>
                    ${ev.lugar ? `<p class="text-secondary text-sm mb-0">📍 ${UI.esc(ev.lugar)}</p>` : ''}
                    ${viajeNote}
                    ${galeria}
                    ${hasDesc ? `
                        <div class="bio-desc-wrap">
                            <p class="text-secondary text-sm mt-xs bio-desc-text" data-expanded="false">${UI.esc(ev.descripcion)}</p>
                            <button type="button" class="btn btn-ghost btn-xs bio-desc-toggle-btn">Ver más</button>
                        </div>
                    ` : ''}
                    <div class="bio-timeline-actions mt-xs">
                        ${ev.origen !== 'diario' ? `<button type="button" class="btn btn-ghost btn-sm btn-edit-evento" data-id="${UI.esc(ev.id)}">Editar</button>` : ''}
                        <button type="button" class="btn btn-ghost btn-sm btn-del-evento" data-id="${UI.esc(ev.id)}">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    },

    _fotoThumbPlaceholder(f, idx) {
        if (f.url) {
            return `<div class="bio-foto-cell"><img src="${UI.esc(f.url)}" alt="" class="bio-foto-img" loading="lazy"/>${f.caption ? `<span class="bio-foto-cap">${UI.esc(f.caption)}</span>` : ''}</div>`;
        }
        if (f.idbKey) {
            return `<div class="bio-foto-cell"><img alt="" class="bio-foto-img" data-idb-key="${UI.esc(f.idbKey)}" loading="lazy"/>${f.caption ? `<span class="bio-foto-cap">${UI.esc(f.caption)}</span>` : ''}</div>`;
        }
        return '';
    },

    async _hydrateBioFotos(container, email) {
        const imgs = container.querySelectorAll('img[data-idb-key]');
        for (const img of imgs) {
            const key = img.getAttribute('data-idb-key');
            const url = await Storage.getFotoDataUrl(key);
            if (url) img.src = url;
        }
    },

    _renderFotoDraft() {
        const el = document.getElementById('bio-fotos-draft');
        if (!el) return;
        el.innerHTML = this._formFotos.length ? `
            <div class="bio-fotos-draft-grid">
                ${this._formFotos.map((f, i) => `
                    <div class="bio-foto-draft" data-idx="${i}">
                        ${f.url ? `<img src="${UI.esc(f.url)}" class="bio-foto-img" alt=""/>` : `<img data-draft-idb="${UI.esc(f.idbKey)}" class="bio-foto-img" alt=""/>`}
                        <button type="button" class="btn btn-ghost btn-xs bio-foto-remove" data-idx="${i}">Quitar</button>
                    </div>
                `).join('')}
            </div>
        ` : '<p class="text-secondary text-xs">Sin fotos añadidas aún.</p>';
        el.querySelectorAll('img[data-draft-idb]').forEach(async (img) => {
            const u = await Storage.getFotoDataUrl(img.getAttribute('data-draft-idb'));
            if (u) img.src = u;
        });
        el.querySelectorAll('.bio-foto-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const f = this._formFotos[idx];
                if (f && f.idbKey) Storage.deleteFotoRecord(f.idbKey);
                this._formFotos.splice(idx, 1);
                this._renderFotoDraft();
            });
        });
    },

    _bindEvents(container, email) {
        const self = this;
        const form = document.getElementById('bio-form');
        const btnAdd = document.getElementById('btn-add-evento');
        const btnCancel = document.getElementById('btn-bio-cancel');

        const filterTipo = document.getElementById('bio-filter-tipo');
        if (filterTipo) {
            filterTipo.addEventListener('change', () => {
                self._filterTipo = filterTipo.value || '';
                self.render(container);
            });
        }
        const filterYear = document.getElementById('bio-filter-year');
        if (filterYear) {
            filterYear.addEventListener('change', () => {
                self._filterYear = filterYear.value || '';
                self.render(container);
            });
        }

        container.querySelectorAll('.bio-desc-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const wrap = btn.closest('.bio-desc-wrap');
                const p = wrap?.querySelector('.bio-desc-text');
                if (!p) return;
                const expanded = p.getAttribute('data-expanded') === 'true';
                p.setAttribute('data-expanded', !expanded);
                p.classList.toggle('bio-desc-expanded', !expanded);
                btn.textContent = expanded ? 'Ver más' : 'Ver menos';
            });
        });

        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                if (form) {
                    form.style.display = form.style.display === 'none' ? 'block' : 'none';
                    if (form.style.display === 'block') {
                        self._formFotos = [];
                        self._renderFotoDraft();
                        document.getElementById('input-bio_fecha').value = DateUtils.today();
                        document.getElementById('input-bio_titulo').value = '';
                        document.getElementById('input-bio_lugar').value = '';
                        document.getElementById('input-bio_desc').value = '';
                        document.getElementById('input-bio_foto_url').value = '';
                    }
                }
            });
        }
        if (btnCancel) btnCancel.addEventListener('click', () => {
            if (form) form.style.display = 'none';
            self._formFotos.forEach(f => { if (f.idbKey) Storage.deleteFotoRecord(f.idbKey); });
            self._formFotos = [];
        });

        document.getElementById('btn-bio-add-url')?.addEventListener('click', () => {
            const input = document.getElementById('input-bio_foto_url');
            const url = (input?.value || '').trim();
            if (!url || !/^https?:\/\//i.test(url)) {
                UI.toast('Introduce una URL http(s) válida', 'warning');
                return;
            }
            self._formFotos.push({ id: DateUtils.generateId(), url });
            input.value = '';
            self._renderFotoDraft();
        });

        document.getElementById('btn-bio-pick-files')?.addEventListener('click', () => {
            document.getElementById('bio-fotos-files')?.click();
        });

        document.getElementById('bio-fotos-files')?.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || !files.length) return;
            for (const file of Array.from(files)) {
                if (file.size > Storage.MAX_FOTO_FILE_BYTES) {
                    UI.toast(`"${file.name}" supera el máximo (~600 KB)`, 'warning');
                    continue;
                }
                const reader = new FileReader();
                reader.onload = async () => {
                    const key = await Storage.saveFotoDataUrl(email, reader.result);
                    if (key) {
                        self._formFotos.push({ id: DateUtils.generateId(), idbKey: key });
                        self._renderFotoDraft();
                    } else UI.toast('No se pudo guardar la imagen', 'error');
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });

        UI.bindForm('bio-form', async (fd) => {
            const data = Storage.getUserData(email);
            if (!data.biografia) data.biografia = { eventos: [] };
            const fotos = self._formFotos.map(f => ({
                id: f.id,
                ...(f.url ? { url: f.url } : {}),
                ...(f.idbKey ? { idbKey: f.idbKey } : {}),
                ...(f.caption ? { caption: f.caption } : {})
            }));
            data.biografia.eventos.push({
                id: DateUtils.generateId(),
                fecha: fd.bio_fecha || DateUtils.today(),
                tipo: fd.bio_tipo || 'otro',
                titulo: (fd.bio_titulo || '').trim(),
                lugar: (fd.bio_lugar || '').trim() || undefined,
                descripcion: (fd.bio_desc || '').trim() || undefined,
                fotos: fotos.length ? fotos : undefined,
                creado: new Date().toISOString(),
                origen: 'manual'
            });
            Storage.saveUserData(email, data);
            if (form) form.style.display = 'none';
            self._formFotos = [];
            UI.toast('Añadido a tu línea de tiempo', 'success');
            self.render(container);
        });

        container.querySelectorAll('.btn-del-evento').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este hito?')) return;
                const data = Storage.getUserData(email);
                const ev = (data.biografia?.eventos || []).find(e => e.id === btn.dataset.id);
                if (ev && ev.fotos) await Storage.deleteFotoRefs(ev.fotos);
                data.biografia.eventos = (data.biografia?.eventos || []).filter(e => e.id !== btn.dataset.id);
                Storage.saveUserData(email, data);
                UI.toast('Eliminado', 'success');
                self.render(container);
            });
        });

        container.querySelectorAll('.btn-edit-evento').forEach(btn => {
            btn.addEventListener('click', () => self._openEditModal(container, email, btn.dataset.id));
        });
    },

    _openEditModal(container, email, eventId) {
        const data = Storage.getUserData(email);
        const ev = (data.biografia?.eventos || []).find(e => e.id === eventId);
        if (!ev || ev.origen === 'diario') return;

        const esViaje = ev.origen === 'viaje' && ev.viajeId;
        let draft = esViaje ? [] : (ev.fotos || []).map(f => ({ ...f }));

        const self = this;
        const renderDraft = (wrapEl) => {
            wrapEl.innerHTML = draft.length ? `
                <div class="bio-fotos-draft-grid">
                    ${draft.map((f, i) => `
                        <div class="bio-foto-draft" data-idx="${i}">
                            ${f.url ? `<img src="${UI.esc(f.url)}" class="bio-foto-img" alt=""/>` : `<img data-draft-idb="${UI.esc(f.idbKey)}" class="bio-foto-img" alt=""/>`}
                            <button type="button" class="btn btn-ghost btn-xs bio-edit-foto-remove" data-idx="${i}">Quitar</button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-xs text-secondary">Sin fotos.</p>';
            wrapEl.querySelectorAll('img[data-draft-idb]').forEach(async (img) => {
                const u = await Storage.getFotoDataUrl(img.getAttribute('data-draft-idb'));
                if (u) img.src = u;
            });
            wrapEl.querySelectorAll('.bio-edit-foto-remove').forEach(b => {
                b.addEventListener('click', async () => {
                    const idx = parseInt(b.dataset.idx, 10);
                    const fo = draft[idx];
                    if (fo && fo.idbKey) await Storage.deleteFotoRecord(fo.idbKey);
                    draft.splice(idx, 1);
                    renderDraft(wrapEl);
                });
            });
        };

        const bloqueFotos = esViaje ? `
                <p class="text-secondary text-sm">Las fotos de este hito vienen del <a href="#viajes">viaje enlazado</a>. Edítalas allí.</p>
            ` : `
                <div class="form-group">
                    <label class="form-label">Fotos</label>
                    <div class="form-row mb-sm">
                        <input type="url" id="be_foto_url" class="form-input" placeholder="URL imagen"/>
                        <button type="button" id="be_add_url" class="btn btn-ghost btn-sm">Añadir URL</button>
                    </div>
                    <input type="file" id="be_fotos_files" accept="image/*" multiple class="sr-only"/>
                    <button type="button" id="be_pick_files" class="btn btn-ghost btn-sm">Elegir imágenes</button>
                    <div id="be-fotos-wrap" class="mt-sm"></div>
                </div>
            `;

        UI.showModal(`
            <h3 class="modal-title">Editar hito</h3>
            <form id="bio-edit-form">
                ${UI.formGroup('Fecha', UI.input('be_fecha', { type: 'date', value: ev.fecha || DateUtils.today(), required: true }))}
                ${UI.formGroup('Tipo', UI.select('be_tipo', BIOGRAFIA_TIPOS, ev.tipo || 'otro', {}))}
                ${UI.formGroup('Título', UI.input('be_titulo', { value: ev.titulo || '', required: true }))}
                ${UI.formGroup('Lugar', UI.input('be_lugar', { value: ev.lugar || '' }))}
                ${UI.formGroup('Descripción', `<textarea name="be_desc" class="form-input" rows="3">${UI.esc(ev.descripcion || '')}</textarea>`)}
                ${bloqueFotos}
                <div class="modal-actions">
                    <button type="button" id="be-cancel" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        `, {
            size: 'lg',
            onReady: () => {
                const wrap = document.getElementById('be-fotos-wrap');
                if (wrap) renderDraft(wrap);
                document.getElementById('be_add_url')?.addEventListener('click', () => {
                    const url = (document.getElementById('be_foto_url')?.value || '').trim();
                    if (!url || !/^https?:\/\//i.test(url)) {
                        UI.toast('URL no válida', 'warning');
                        return;
                    }
                    draft.push({ id: DateUtils.generateId(), url });
                    document.getElementById('be_foto_url').value = '';
                    renderDraft(wrap);
                });
                document.getElementById('be_pick_files')?.addEventListener('click', () => document.getElementById('be_fotos_files')?.click());
                document.getElementById('be_fotos_files')?.addEventListener('change', async (e) => {
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
                                draft.push({ id: DateUtils.generateId(), idbKey: key });
                                renderDraft(wrap);
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                });
                UI.bindButton('be-cancel', () => UI.closeModal());
                UI.bindForm('bio-edit-form', async (fd) => {
                    const d = Storage.getUserData(email);
                    const list = d.biografia.eventos;
                    const idx = list.findIndex(x => x.id === eventId);
                    if (idx < 0) return;
                    const old = list[idx];
                    if (!esViaje) {
                        const oldFotos = old.fotos || [];
                        const removed = oldFotos.filter(o => !draft.some(n => (n.idbKey && n.idbKey === o.idbKey) || (n.url && n.url === o.url)));
                        await Storage.deleteFotoRefs(removed);
                    }
                    list[idx] = {
                        ...old,
                        fecha: fd.be_fecha || old.fecha,
                        tipo: fd.be_tipo || old.tipo,
                        titulo: (fd.be_titulo || '').trim(),
                        lugar: (fd.be_lugar || '').trim() || undefined,
                        descripcion: (fd.be_desc || '').trim() || undefined,
                        ...(esViaje ? {} : {
                            fotos: draft.length ? draft.map(x => ({ id: x.id, ...(x.url ? { url: x.url } : {}), ...(x.idbKey ? { idbKey: x.idbKey } : {}) })) : undefined
                        })
                    };
                    Storage.saveUserData(email, d);
                    UI.closeModal();
                    UI.toast('Hito actualizado', 'success');
                    self.render(container);
                });
            }
        });
    },

    addFromDiario(email, fecha, titulo, descripcion) {
        const data = Storage.getUserData(email);
        if (!data.biografia) data.biografia = { eventos: [] };
        data.biografia.eventos.push({
            id: DateUtils.generateId(),
            fecha: fecha || DateUtils.today(),
            tipo: 'otro',
            titulo: (titulo || 'Entrada del día').substring(0, 100),
            descripcion: descripcion || undefined,
            creado: new Date().toISOString(),
            origen: 'diario'
        });
        Storage.saveUserData(email, data);
    }
};
