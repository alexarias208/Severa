/* ============================================
   RELIGION PAGE - Bible Reader with Progress
   Modo Lectura (sequential) + Modo Explorar (browse)
   ============================================ */

const ReligionPage = {
    bibliaData: null,
    loading: false,

    async render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);

        // Ensure defaults for religion data (merge without overwriting existing progress)
        const defaultReligion = {
            posicionActual: { libro: 0, capitulo: 0, versiculo: 0 },
            posicionLectura: null,
            favoritos: [],
            reflexiones: {},
            progreso: { versiculosLeidos: 0, totalVersiculos: 0, ultimaLectura: null, versiculosHoy: 0, avanceHasta: null },
            modoLectura: true
        };
        if (!data.religion) {
            data.religion = { ...defaultReligion, posicionLectura: { libro: 0, capitulo: 0, versiculo: 0 } };
            Storage.saveUserData(email, data);
        } else {
            let needsSave = false;
            if (!data.religion.posicionActual || typeof data.religion.posicionActual.libro !== 'number') {
                data.religion.posicionActual = { ...defaultReligion.posicionActual, ...(data.religion.posicionActual || {}) };
                needsSave = true;
            }
            if (!data.religion.posicionLectura || typeof data.religion.posicionLectura.libro !== 'number') {
                data.religion.posicionLectura = data.religion.posicionActual
                    ? { libro: data.religion.posicionActual.libro, capitulo: data.religion.posicionActual.capitulo, versiculo: data.religion.posicionActual.versiculo }
                    : { libro: 0, capitulo: 0, versiculo: 0 };
                needsSave = true;
            }
            if (!data.religion.progreso || typeof data.religion.progreso.versiculosLeidos !== 'number') {
                data.religion.progreso = { ...defaultReligion.progreso, ...(data.religion.progreso || {}) };
                needsSave = true;
            }
            if (data.religion.favoritos === undefined) { data.religion.favoritos = []; needsSave = true; }
            if (data.religion.reflexiones === undefined) { data.religion.reflexiones = {}; needsSave = true; }
            if (data.religion.modoLectura === undefined) { data.religion.modoLectura = true; needsSave = true; }
            if (data.religion.progreso.ultimaLectura === undefined) { data.religion.progreso.ultimaLectura = null; needsSave = true; }
            if (data.religion.progreso.versiculosHoy === undefined) { data.religion.progreso.versiculosHoy = 0; needsSave = true; }
            if (data.religion.progreso.avanceHasta === undefined) { data.religion.progreso.avanceHasta = null; needsSave = true; }
            if (needsSave) Storage.saveUserData(email, data);
        }
        const rel = data.religion;

        // Use embedded Bible if available (no fetch/IndexedDB needed)
        if (!this.bibliaData && typeof BIBLIA_EMBED !== 'undefined' && BIBLIA_EMBED && BIBLIA_EMBED.libros) {
            this.bibliaData = BIBLIA_EMBED;
        }
        if (!this.bibliaData) {
            await this._loadBiblia();
        }

        if (!this.bibliaData) {
            container.innerHTML = `
                ${UI.pageTitle('Religión')}
                <div class="card text-center p-lg">
                    <h3>Biblia no disponible</h3>
                    <p class="text-secondary mt-md">
                        El archivo <code>data/biblia.json</code> no ha sido cargado aún.
                        Ejecuta el script de extracción o carga el JSON manualmente.
                    </p>
                    <button id="btn-load-bible" class="btn btn-primary mt-lg">Cargar archivo JSON</button>
                    <input type="file" id="bible-file-input" accept=".json" class="hidden">
                </div>
            `;
            UI.bindButton('btn-load-bible', () => {
                document.getElementById('bible-file-input').click();
            });
            document.getElementById('bible-file-input')?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    if (json.libros && Array.isArray(json.libros)) {
                        await Storage.saveBiblia(json);
                        this.bibliaData = json;
                        UI.toast('Biblia cargada exitosamente', 'success');
                        this.render(container);
                    } else {
                        UI.toast('Formato JSON inválido', 'error');
                    }
                } catch (err) {
                    UI.toast('Error al leer archivo: ' + err.message, 'error');
                }
            });
            return;
        }

        const libros = this.bibliaData.libros;
        // Migrar: si hay versiculosLeidos pero no avanceHasta, calcular posición desde el número global
        if (rel.progreso.versiculosLeidos > 0 && !rel.progreso.avanceHasta) {
            const avancePos = this._getPositionFromGlobalVerseNumber(libros, rel.progreso.versiculosLeidos);
            if (avancePos) {
                data.religion.progreso.avanceHasta = avancePos;
                Storage.saveUserData(email, data);
            }
        }
        const pos = rel.posicionActual;
        const libro = libros[pos.libro] || libros[0];
        const capitulo = libro?.capitulos?.[pos.capitulo] || libro?.capitulos?.[0];
        const versiculo = capitulo?.versiculos?.[pos.versiculo] || capitulo?.versiculos?.[0];

        // Total verses for progress
        const totalVerses = libros.reduce((s, l) =>
            s + l.capitulos.reduce((s2, c) => s2 + (c.versiculos?.length || 0), 0), 0);

        const progressPct = totalVerses > 0 ? Math.round((rel.progreso.versiculosLeidos / totalVerses) * 100) : 0;

        const favKey = `${pos.libro}-${pos.capitulo}-${pos.versiculo}`;
        const isFav = rel.favoritos.some(f => f.libro === pos.libro && f.capitulo === pos.capitulo && f.versiculo === pos.versiculo);
        const reflexion = rel.reflexiones[favKey] || '';

        // Determine current verse number in global sequence
        const globalVerseNum = this._getGlobalVerseNumber(libros, pos);

        if (rel.modoLectura) {
            this._renderModoLectura(container, email, data, rel, libros, pos, libro, capitulo, versiculo, totalVerses, progressPct, isFav, favKey, reflexion, globalVerseNum);
        } else {
            this._renderModoExplorar(container, email, data, rel, libros, pos, libro, capitulo, versiculo, totalVerses, progressPct, isFav, favKey, reflexion, globalVerseNum);
        }
    },

    // ==================== MODO LECTURA ====================
    _renderModoLectura(container, email, data, rel, libros, pos, libro, capitulo, versiculo, totalVerses, progressPct, isFav, favKey, reflexion, globalVerseNum) {
        const isAtStart = pos.libro === 0 && pos.capitulo === 0 && pos.versiculo === 0 && (rel.progreso.versiculosLeidos || 0) === 0;
        const today = DateUtils.today();
        const versiculosHoy = (rel.progreso.ultimaLectura === today) ? (rel.progreso.versiculosHoy || 0) : 0;
        const pl = rel.posicionLectura;
        const showVolver = pl && (pos.libro !== pl.libro || pos.capitulo !== pl.capitulo || pos.versiculo !== pl.versiculo);
        const avancePos = rel.progreso.avanceHasta || this._getPositionFromGlobalVerseNumber(libros, rel.progreso.versiculosLeidos || 0);
        const showIrAvance = (rel.progreso.versiculosLeidos || 0) > 0 && avancePos;

        container.innerHTML = `
            ${UI.pageTitle('Religión', `
                <div class="flex gap-sm items-center">
                    <button id="btn-bible-search" class="btn btn-ghost btn-sm">Buscar</button>
                    <button id="btn-bible-favs" class="btn btn-ghost btn-sm">Favoritos (${rel.favoritos.length})</button>
                    <button id="btn-toggle-mode" class="btn btn-ghost btn-sm">Modo Explorar</button>
                </div>
            `)}

            <!-- Progress -->
            <div class="card mb-lg">
                <div class="flex justify-between items-center mb-sm">
                    <span class="text-secondary">Progreso de lectura</span>
                    <span class="text-secondary">${progressPct}% (${rel.progreso.versiculosLeidos} de ${totalVerses})</span>
                </div>
                <div class="progress progress-lg">
                    <div class="progress-bar success" style="width: ${progressPct}%;"></div>
                </div>
                <div class="flex justify-between items-center mt-sm flex-wrap gap-sm">
                    <span class="text-secondary text-sm">Libro ${pos.libro + 1} — Capítulo ${(capitulo?.numero || pos.capitulo + 1)} — Versículo ${globalVerseNum} de ${totalVerses}</span>
                    <span class="text-secondary text-sm">Hoy: ${versiculosHoy} versículos</span>
                </div>
                ${showIrAvance ? '<div class="mt-sm"><button type="button" id="btn-ir-avance" class="btn btn-secondary btn-sm">Ir a mi avance</button></div>' : ''}
            </div>

            ${isAtStart ? `
                <!-- Start Reading CTA -->
                <div class="card text-center" style="padding: var(--spacing-xl);">
                    <div style="font-size: 3rem; margin-bottom: var(--spacing-md);">📖</div>
                    <h2 style="margin-bottom: var(--spacing-md);">Comienza tu lectura de la Biblia</h2>
                    <p class="text-secondary" style="margin-bottom: var(--spacing-lg); max-width: 480px; margin-left: auto; margin-right: auto;">
                        Lee la Biblia completa versículo por versículo. Presiona "Comenzar a Leer" para iniciar desde Génesis 1:1.
                    </p>
                    <button id="btn-start-reading" class="btn btn-primary btn-lg" style="font-size: var(--font-lg); padding: var(--spacing-md) var(--spacing-xl);">
                        Comenzar a Leer
                    </button>
                </div>
            ` : `
                <!-- Quick jump: Book / Chapter (only updates view, not reading position) -->
                <div class="card mb-lg">
                    <h4 class="card-title mb-sm">Ir a pasaje</h4>
                    <div class="form-row">
                        ${UI.formGroup('Libro', `<select id="sel-lectura-libro" class="form-select">
                            ${libros.map((l, i) => `<option value="${i}" ${i === pos.libro ? 'selected' : ''}>${UI.esc(l.nombre)}</option>`).join('')}
                        </select>`)}
                        ${UI.formGroup('Capítulo', `<select id="sel-lectura-capitulo" class="form-select">
                            ${(libro?.capitulos || []).map((c, i) => `<option value="${i}" ${i === pos.capitulo ? 'selected' : ''}>${c.numero}</option>`).join('')}
                        </select>`)}
                    </div>
                </div>

                <!-- Verse Display - Reading Mode -->
                <div class="card">
                    <div class="verse-display" style="padding: var(--spacing-xl) var(--spacing-lg);">
                        <div class="verse-text" style="font-size: 1.35rem; line-height: 1.8; margin-bottom: var(--spacing-lg);">
                            "${UI.esc(versiculo?.texto || 'Sin texto disponible')}"
                        </div>
                        <div class="verse-ref" style="font-size: var(--font-lg); font-weight: 600;">
                            ${UI.esc(libro?.nombre || '')} ${capitulo?.numero || ''}:${versiculo?.numero || ''}
                        </div>
                    </div>

                    <div class="verse-nav" style="display: flex; gap: var(--spacing-md); justify-content: center; align-items: center; flex-wrap: wrap; padding: var(--spacing-lg) 0;">
                        <button id="btn-prev-verse" class="btn btn-secondary">◀ Anterior</button>
                        <button id="btn-fav-verse" class="btn ${isFav ? 'btn-warning' : 'btn-ghost'}" title="Favorito">
                            ${isFav ? '★' : '☆'}
                        </button>
                        <button id="btn-next-verse" class="btn btn-primary btn-lg" style="font-size: var(--font-lg); padding: var(--spacing-sm) var(--spacing-xl);">
                            Continuar ▶
                        </button>
                        ${showVolver ? `<button id="btn-volver-lectura" class="btn btn-ghost" title="Volver a donde ibas leyendo">Volver a mi lectura</button>` : ''}
                    </div>

                    <!-- Quick Reflection -->
                    <div class="mt-lg" style="border-top: 1px solid var(--border); padding-top: var(--spacing-md);">
                        <h4 class="mb-sm">Reflexión personal</h4>
                        <textarea id="verse-reflection" class="form-textarea" placeholder="Escribe tu reflexión sobre este versículo..." rows="3">${UI.esc(reflexion)}</textarea>
                        <button id="btn-save-reflection" class="btn btn-ghost btn-sm mt-sm">Guardar reflexión</button>
                    </div>
                </div>
            `}
        `;

        this._bindCommonEvents(container, email, libros, pos, rel, totalVerses);

        if (isAtStart) {
            UI.bindButton('btn-start-reading', () => {
                // Start reading from Genesis 1:1
                const d = Storage.getUserData(email);
                d.religion.posicionActual = { libro: 0, capitulo: 0, versiculo: 0 };
                d.religion.posicionLectura = { libro: 0, capitulo: 0, versiculo: 0 };
                d.religion.progreso.versiculosLeidos = 1;
                d.religion.progreso.avanceHasta = { libro: 0, capitulo: 0, versiculo: 0 };
                d.religion.progreso.ultimaLectura = DateUtils.today();
                d.religion.progreso.versiculosHoy = 1;
                Storage.saveUserData(email, d);
                this._autoCompleteHabit(email);
                this.render(container);
            });
        } else {
            UI.bindButton('btn-prev-verse', () => this._navigate(container, email, -1));
            UI.bindButton('btn-next-verse', () => this._navigate(container, email, 1));

            // Volver a mi lectura (solo actualiza vista, no posicionLectura)
            const volverBtn = container.querySelector('#btn-volver-lectura');
            if (volverBtn) {
                volverBtn.addEventListener('click', () => {
                    const d = Storage.getUserData(email);
                    if (d.religion.posicionLectura) {
                        d.religion.posicionActual = {
                            libro: d.religion.posicionLectura.libro,
                            capitulo: d.religion.posicionLectura.capitulo,
                            versiculo: d.religion.posicionLectura.versiculo
                        };
                        Storage.saveUserData(email, d);
                        this.render(container);
                    }
                });
            }

            // Selectors Libro/Capítulo: only update posicionActual (not posicionLectura)
            document.getElementById('sel-lectura-libro')?.addEventListener('change', (e) => {
                const d = Storage.getUserData(email);
                d.religion.posicionActual.libro = parseInt(e.target.value);
                d.religion.posicionActual.capitulo = 0;
                d.religion.posicionActual.versiculo = 0;
                Storage.saveUserData(email, d);
                this.render(container);
            });
            document.getElementById('sel-lectura-capitulo')?.addEventListener('change', (e) => {
                const d = Storage.getUserData(email);
                d.religion.posicionActual.capitulo = parseInt(e.target.value);
                d.religion.posicionActual.versiculo = 0;
                Storage.saveUserData(email, d);
                this.render(container);
            });

            // Ir a mi avance
            const irAvanceBtn = container.querySelector('#btn-ir-avance');
            if (irAvanceBtn && avancePos) {
                irAvanceBtn.addEventListener('click', () => {
                    const d = Storage.getUserData(email);
                    d.religion.posicionActual = { libro: avancePos.libro, capitulo: avancePos.capitulo, versiculo: avancePos.versiculo };
                    d.religion.posicionLectura = { libro: avancePos.libro, capitulo: avancePos.capitulo, versiculo: avancePos.versiculo };
                    Storage.saveUserData(email, d);
                    this.render(container);
                });
            }

            // Favorite
            UI.bindButton('btn-fav-verse', () => {
                this._toggleFavorite(container, email);
            });

            // Save reflection
            UI.bindButton('btn-save-reflection', () => {
                this._saveReflection(email, pos);
            });
        }
    },

    // ==================== MODO EXPLORAR ====================
    _renderModoExplorar(container, email, data, rel, libros, pos, libro, capitulo, versiculo, totalVerses, progressPct, isFav, favKey, reflexion, globalVerseNum) {
        const avancePosExp = rel.progreso.avanceHasta || this._getPositionFromGlobalVerseNumber(libros, rel.progreso.versiculosLeidos || 0);
        const showIrAvanceExp = (rel.progreso.versiculosLeidos || 0) > 0 && avancePosExp;

        container.innerHTML = `
            ${UI.pageTitle('Religión', `
                <div class="flex gap-sm items-center">
                    <button id="btn-bible-search" class="btn btn-ghost btn-sm">Buscar</button>
                    <button id="btn-bible-favs" class="btn btn-ghost btn-sm">Favoritos (${rel.favoritos.length})</button>
                    <button id="btn-toggle-mode" class="btn btn-ghost btn-sm">Modo Lectura</button>
                </div>
            `)}

            <!-- Progress -->
            <div class="card mb-lg">
                <div class="flex justify-between items-center mb-sm">
                    <span class="text-secondary">Progreso de lectura</span>
                    <span class="text-secondary">${progressPct}% (${rel.progreso.versiculosLeidos} de ${totalVerses})</span>
                </div>
                <div class="progress progress-lg">
                    <div class="progress-bar success" style="width: ${progressPct}%;"></div>
                </div>
                ${showIrAvanceExp ? '<div class="mt-sm"><button type="button" id="btn-ir-avance-exp" class="btn btn-secondary btn-sm">Ir a mi avance</button></div>' : ''}
            </div>

            <!-- Selector -->
            <div class="card mb-lg">
                <div class="form-row">
                    ${UI.formGroup('Libro', `<select id="sel-libro" class="form-select">
                        ${libros.map((l, i) => `<option value="${i}" ${i === pos.libro ? 'selected' : ''}>${UI.esc(l.nombre)}</option>`).join('')}
                    </select>`)}
                    ${UI.formGroup('Capítulo', `<select id="sel-capitulo" class="form-select">
                        ${(libro?.capitulos || []).map((c, i) => `<option value="${i}" ${i === pos.capitulo ? 'selected' : ''}>${c.numero}</option>`).join('')}
                    </select>`)}
                </div>
            </div>

            <!-- Verse Display -->
            <div class="card">
                <div class="verse-display">
                    <div class="verse-text">"${UI.esc(versiculo?.texto || 'Sin texto disponible')}"</div>
                    <div class="verse-ref">${UI.esc(libro?.nombre || '')} ${capitulo?.numero || ''}:${versiculo?.numero || ''}</div>
                </div>

                <div class="verse-nav">
                    <button id="btn-prev-verse" class="btn btn-secondary">◀ Anterior</button>
                    <button id="btn-fav-verse" class="btn ${isFav ? 'btn-warning' : 'btn-ghost'}" title="Favorito">
                        ${isFav ? '★' : '☆'} Favorito
                    </button>
                    <button id="btn-next-verse" class="btn btn-primary">Siguiente ▶</button>
                </div>

                <!-- Reflection -->
                <div class="mt-lg">
                    <h4 class="mb-sm">Reflexión personal</h4>
                    <textarea id="verse-reflection" class="form-textarea" placeholder="Escribe tu reflexión sobre este versículo..." rows="3">${UI.esc(reflexion)}</textarea>
                    <button id="btn-save-reflection" class="btn btn-ghost btn-sm mt-sm">Guardar reflexión</button>
                </div>
            </div>
        `;

        this._bindCommonEvents(container, email, libros, pos, rel, totalVerses);

        // Book selector
        document.getElementById('sel-libro')?.addEventListener('change', (e) => {
            const d = Storage.getUserData(email);
            d.religion.posicionActual.libro = parseInt(e.target.value);
            d.religion.posicionActual.capitulo = 0;
            d.religion.posicionActual.versiculo = 0;
            Storage.saveUserData(email, d);
            this.render(container);
        });

        // Chapter selector
        document.getElementById('sel-capitulo')?.addEventListener('change', (e) => {
            const d = Storage.getUserData(email);
            d.religion.posicionActual.capitulo = parseInt(e.target.value);
            d.religion.posicionActual.versiculo = 0;
            Storage.saveUserData(email, d);
            this.render(container);
        });

        // Ir a mi avance (modo Explorar)
        const irAvanceBtnExp = container.querySelector('#btn-ir-avance-exp');
        if (irAvanceBtnExp && avancePosExp) {
            irAvanceBtnExp.addEventListener('click', () => {
                const d = Storage.getUserData(email);
                d.religion.posicionActual = { libro: avancePosExp.libro, capitulo: avancePosExp.capitulo, versiculo: avancePosExp.versiculo };
                d.religion.posicionLectura = { libro: avancePosExp.libro, capitulo: avancePosExp.capitulo, versiculo: avancePosExp.versiculo };
                Storage.saveUserData(email, d);
                this.render(container);
            });
        }

        // Prev/Next verse
        UI.bindButton('btn-prev-verse', () => this._navigate(container, email, -1));
        UI.bindButton('btn-next-verse', () => this._navigate(container, email, 1));

        // Favorite
        UI.bindButton('btn-fav-verse', () => {
            this._toggleFavorite(container, email);
        });

        // Save reflection
        UI.bindButton('btn-save-reflection', () => {
            this._saveReflection(email, pos);
        });
    },

    // ==================== COMMON EVENT BINDINGS ====================
    _bindCommonEvents(container, email, libros, pos, rel, totalVerses) {
        // Toggle mode
        UI.bindButton('btn-toggle-mode', () => {
            const d = Storage.getUserData(email);
            d.religion.modoLectura = !d.religion.modoLectura;
            Storage.saveUserData(email, d);
            this.render(container);
        });

        // Search
        UI.bindButton('btn-bible-search', () => {
            this._showSearchModal(container, email, libros);
        });

        // Favorites list
        UI.bindButton('btn-bible-favs', () => {
            this._showFavoritesModal(container, email, libros, rel);
        });
    },

    // ==================== TOGGLE FAVORITE ====================
    _toggleFavorite(container, email) {
        const data = Storage.getUserData(email);
        const p = data.religion.posicionActual;
        const idx = data.religion.favoritos.findIndex(f =>
            f.libro === p.libro && f.capitulo === p.capitulo && f.versiculo === p.versiculo
        );
        if (idx >= 0) {
            data.religion.favoritos.splice(idx, 1);
            UI.toast('Favorito eliminado', 'info');
        } else {
            const libros = this.bibliaData.libros;
            const libro = libros[p.libro];
            const cap = libro?.capitulos?.[p.capitulo];
            const ver = cap?.versiculos?.[p.versiculo];
            data.religion.favoritos.push({
                libro: p.libro,
                capitulo: p.capitulo,
                versiculo: p.versiculo,
                ref: `${libro?.nombre || ''} ${cap?.numero || ''}:${ver?.numero || ''}`,
                texto: (ver?.texto || '').substring(0, 100)
            });
            UI.toast('Versículo guardado en favoritos', 'success');
        }
        Storage.saveUserData(email, data);
        this.render(container);
    },

    // ==================== SAVE REFLECTION ====================
    _saveReflection(email, pos) {
        const text = document.getElementById('verse-reflection')?.value || '';
        const data = Storage.getUserData(email);
        const p = data.religion.posicionActual;
        const key = `${p.libro}-${p.capitulo}-${p.versiculo}`;
        if (text.trim()) {
            data.religion.reflexiones[key] = text;
        } else {
            delete data.religion.reflexiones[key];
        }
        Storage.saveUserData(email, data);
        UI.toast('Reflexión guardada', 'success');
    },

    // ==================== SEARCH MODAL ====================
    _showSearchModal(container, email, libros) {
        UI.showModal(`
            <h3 class="modal-title">Buscar en la Biblia</h3>
            <form id="bible-search-form">
                ${UI.formGroup('Buscar texto', UI.input('bs_query', { placeholder: 'Palabra o frase...', required: true }))}
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Buscar</button>
                </div>
            </form>
            <div id="search-results" class="mt-md"></div>
        `, {
            onReady: () => {
                UI.bindForm('bible-search-form', (fd) => {
                    const query = fd.bs_query.toLowerCase().trim();
                    if (!query) return;
                    const results = [];
                    libros.forEach((l, li) => {
                        l.capitulos.forEach((c, ci) => {
                            (c.versiculos || []).forEach((v, vi) => {
                                if (v.texto.toLowerCase().includes(query)) {
                                    results.push({
                                        libro: li, capitulo: ci, versiculo: vi,
                                        ref: `${l.nombre} ${c.numero}:${v.numero}`,
                                        texto: v.texto
                                    });
                                }
                            });
                        });
                    });
                    const div = document.getElementById('search-results');
                    if (results.length === 0) {
                        div.innerHTML = '<p class="text-muted text-center">Sin resultados</p>';
                    } else {
                        div.innerHTML = `<p class="text-secondary mb-sm">${results.length} resultado${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}</p>` +
                            results.slice(0, 30).map(r => `
                                <div class="finance-item search-result" data-l="${r.libro}" data-c="${r.capitulo}" data-v="${r.versiculo}" style="cursor:pointer;">
                                    <div class="item-info">
                                        <strong>${UI.esc(r.ref)}</strong>
                                        <span class="text-secondary">${UI.esc(r.texto.substring(0, 100))}${r.texto.length > 100 ? '...' : ''}</span>
                                    </div>
                                </div>
                            `).join('') + (results.length > 30 ? `<p class="text-muted mt-sm">${results.length - 30} resultados más...</p>` : '');

                        div.querySelectorAll('.search-result').forEach(sr => {
                            sr.addEventListener('click', () => {
                                const d = Storage.getUserData(email);
                                d.religion.posicionActual = {
                                    libro: parseInt(sr.dataset.l),
                                    capitulo: parseInt(sr.dataset.c),
                                    versiculo: parseInt(sr.dataset.v)
                                };
                                Storage.saveUserData(email, d);
                                UI.closeModal();
                                this.render(container);
                            });
                        });
                    }
                });
            }
        });
    },

    // ==================== FAVORITES MODAL ====================
    _showFavoritesModal(container, email, libros, rel) {
        const favs = rel.favoritos || [];
        UI.showModal(`
            <h3 class="modal-title">Favoritos (${favs.length})</h3>
            ${favs.length > 0 ? `
                <div style="max-height: 400px; overflow-y: auto;">
                    ${favs.map((f, idx) => {
                        const l = libros[f.libro];
                        const c = l?.capitulos?.[f.capitulo];
                        const v = c?.versiculos?.[f.versiculo];
                        return `
                            <div class="finance-item fav-item" data-l="${f.libro}" data-c="${f.capitulo}" data-v="${f.versiculo}" data-idx="${idx}" style="cursor:pointer;">
                                <div class="item-info">
                                    <strong>${l?.nombre || '?'} ${c?.numero || ''}:${v?.numero || ''}</strong>
                                    <span class="text-secondary">${UI.esc((v?.texto || '').substring(0, 80))}${(v?.texto || '').length > 80 ? '...' : ''}</span>
                                </div>
                                <button class="btn-icon btn-sm text-error fav-remove-btn" data-fav-idx="${idx}" title="Eliminar">✕</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : UI.emptyState('Sin favoritos aún. Marca versículos con ☆ para guardarlos.', '⭐')}
        `, {
            onReady: () => {
                // Navigate to favorite
                document.querySelectorAll('.fav-item').forEach(fi => {
                    fi.addEventListener('click', (e) => {
                        if (e.target.closest('.fav-remove-btn')) return;
                        const d = Storage.getUserData(email);
                        d.religion.posicionActual = {
                            libro: parseInt(fi.dataset.l),
                            capitulo: parseInt(fi.dataset.c),
                            versiculo: parseInt(fi.dataset.v)
                        };
                        Storage.saveUserData(email, d);
                        UI.closeModal();
                        this.render(container);
                    });
                });
                // Remove favorite
                document.querySelectorAll('.fav-remove-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.favIdx);
                        const d = Storage.getUserData(email);
                        d.religion.favoritos.splice(idx, 1);
                        Storage.saveUserData(email, d);
                        UI.toast('Favorito eliminado', 'info');
                        UI.closeModal();
                        this.render(container);
                    });
                });
            }
        });
    },

    // ==================== LOAD BIBLIA ====================
    async _loadBiblia() {
        if (this.loading) return;
        this.loading = true;
        try {
            // Try IndexedDB first
            const stored = await Storage.getBiblia();
            if (stored && stored.libros) {
                this.bibliaData = stored;
                this.loading = false;
                return;
            }
            // Try fetch from data/biblia.json
            const resp = await fetch('data/biblia.json');
            if (resp.ok) {
                const json = await resp.json();
                if (json.libros) {
                    await Storage.saveBiblia(json);
                    this.bibliaData = json;
                }
            }
        } catch (e) {
            console.log('Bible data not available:', e.message);
        }
        this.loading = false;
    },

    // ==================== NAVIGATE ====================
    _navigate(container, email, direction) {
        const data = Storage.getUserData(email);
        const p = data.religion.posicionActual;
        const libros = this.bibliaData.libros;
        const libro = libros[p.libro];
        const capitulo = libro?.capitulos?.[p.capitulo];
        const versiculos = capitulo?.versiculos || [];

        let newV = p.versiculo + direction;

        if (newV >= versiculos.length) {
            // Next chapter
            let newC = p.capitulo + 1;
            if (newC >= (libro?.capitulos?.length || 0)) {
                // Next book
                let newL = p.libro + 1;
                if (newL >= libros.length) {
                    // Finished the Bible!
                    newL = 0;
                    UI.toast('¡Felicidades! Has completado la lectura de toda la Biblia.', 'success');
                }
                p.libro = newL;
                p.capitulo = 0;
            } else {
                p.capitulo = newC;
            }
            p.versiculo = 0;
        } else if (newV < 0) {
            // Previous chapter
            let newC = p.capitulo - 1;
            if (newC < 0) {
                let newL = p.libro - 1;
                if (newL < 0) newL = libros.length - 1;
                p.libro = newL;
                p.capitulo = (libros[p.libro]?.capitulos?.length || 1) - 1;
            } else {
                p.capitulo = newC;
            }
            const prevCap = libros[p.libro]?.capitulos?.[p.capitulo];
            p.versiculo = (prevCap?.versiculos?.length || 1) - 1;
        } else {
            p.versiculo = newV;
        }

        // Avance = solo versículos leídos en orden. Solo cuenta el siguiente versículo si es exactamente "avance + 1".
        if (direction > 0) {
            const totalVerses = libros.reduce((s, l) =>
                s + l.capitulos.reduce((s2, c) => s2 + (c.versiculos?.length || 0), 0), 0);
            if (!data.religion.progreso.totalVersiculos) data.religion.progreso.totalVersiculos = totalVerses;
            const currentGlobal = this._getGlobalVerseNumber(libros, p);
            const avanceHasta = data.religion.progreso.avanceHasta;
            const avanceGlobal = avanceHasta != null
                ? this._getGlobalVerseNumber(libros, avanceHasta)
                : (data.religion.progreso.versiculosLeidos || 0);
            // Solo avanzar si llegamos al siguiente versículo en orden (uno más que el avance actual)
            if (currentGlobal === avanceGlobal + 1) {
                data.religion.progreso.avanceHasta = { libro: p.libro, capitulo: p.capitulo, versiculo: p.versiculo };
                data.religion.progreso.versiculosLeidos = Math.min(currentGlobal, totalVerses);
            }
            // Si saltamos hacia adelante (currentGlobal > avanceGlobal + 1), no actualizamos avance.

            // Track daily reading (solo cuando realmente avanzamos)
            if (currentGlobal === avanceGlobal + 1) {
                const today = DateUtils.today();
                if (data.religion.progreso.ultimaLectura !== today) {
                    data.religion.progreso.versiculosHoy = 1;
                } else {
                    data.religion.progreso.versiculosHoy = (data.religion.progreso.versiculosHoy || 0) + 1;
                }
                data.religion.progreso.ultimaLectura = today;
                this._autoCompleteHabit(email);
            }
        }

        data.religion.posicionActual = p;
        data.religion.posicionLectura = { libro: p.libro, capitulo: p.capitulo, versiculo: p.versiculo };
        Storage.saveUserData(email, data);
        this.render(container);
    },

    // ==================== HABIT AUTO-COMPLETE ====================
    _autoCompleteHabit(email) {
        const data = Storage.getUserData(email);
        if (!data.habitos || !data.habitos.lista) return;

        const today = DateUtils.today();
        if (!data.habitos.registros) data.habitos.registros = {};
        if (!data.habitos.registros[today]) data.habitos.registros[today] = {};

        const bibliaHabit = data.habitos.lista.find(h => {
            const name = (h.nombre || '').toLowerCase();
            return name.includes('biblia') || name.includes('leer');
        });

        if (bibliaHabit && !data.habitos.registros[today][bibliaHabit.id]) {
            data.habitos.registros[today][bibliaHabit.id] = true;
            const progreso = data.religion.progreso || {};
            const yaMostradoHoy = progreso.ultimaToastBibliaHabit === today;
            if (!yaMostradoHoy) {
                data.religion.progreso.ultimaToastBibliaHabit = today;
                UI.toast('Hábito de lectura completado automáticamente', 'success');
            }
            Storage.saveUserData(email, data);
        }
    },

    // ==================== GLOBAL VERSE NUMBER ====================
    _getGlobalVerseNumber(libros, pos) {
        let count = 0;
        for (let li = 0; li < libros.length; li++) {
            const libro = libros[li];
            for (let ci = 0; ci < (libro.capitulos?.length || 0); ci++) {
                const cap = libro.capitulos[ci];
                const numVerses = cap.versiculos?.length || 0;
                if (li === pos.libro && ci === pos.capitulo) {
                    return count + pos.versiculo + 1;
                }
                count += numVerses;
            }
        }
        return count + 1;
    },

    /** Dado el número global de versículo (1-based), devuelve { libro, capitulo, versiculo } (índices 0-based). */
    _getPositionFromGlobalVerseNumber(libros, globalOneBased) {
        if (!globalOneBased || globalOneBased < 1) return { libro: 0, capitulo: 0, versiculo: 0 };
        let rest = globalOneBased;
        for (let li = 0; li < libros.length; li++) {
            const libro = libros[li];
            for (let ci = 0; ci < (libro.capitulos?.length || 0); ci++) {
                const numVerses = libro.capitulos[ci].versiculos?.length || 0;
                if (rest <= numVerses) {
                    return { libro: li, capitulo: ci, versiculo: rest - 1 };
                }
                rest -= numVerses;
            }
        }
        const last = libros[libros.length - 1];
        const lastCap = last?.capitulos?.[last.capitulos?.length - 1];
        return {
            libro: libros.length - 1,
            capitulo: (last?.capitulos?.length || 1) - 1,
            versiculo: Math.max(0, (lastCap?.versiculos?.length || 1) - 1)
        };
    }
};
