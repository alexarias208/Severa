/* ============================================
   GAMES PAGE - Word of Day, Crossword, Sudoku
   ============================================ */

// Crucigrama chileno: pistas y respuestas (fuente única de verdad)
const CRUCI_CLUES = [
    { id: 'h1', dir: 'h', row: 1, col: 1, clue: 'Capital de Chile', answer: 'SANTIAGO', len: 8 },
    { id: 'v1', dir: 'v', row: 1, col: 1, clue: 'Bebida caliente muy tomada', answer: 'CAFE', len: 4 },
    { id: 'h2', dir: 'h', row: 3, col: 0, clue: 'Fruta que Chile exporta', answer: 'UVA', len: 3 },
    { id: 'v2', dir: 'v', row: 0, col: 3, clue: 'Condimento del completo', answer: 'MAYO', len: 4 },
    { id: 'h3', dir: 'h', row: 5, col: 1, clue: 'Donde se juega fútbol', answer: 'CANCHA', len: 6 },
    { id: 'v3', dir: 'v', row: 3, col: 5, clue: 'Empanada de ____', answer: 'HORNO', len: 5 },
];

// Orden canónico: primero por fila, luego columna, luego horizontales antes que verticales (para poder escribir palabra por palabra)
function getCruciCluesOrder() {
    return [...CRUCI_CLUES].sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        if (a.col !== b.col) return a.col - b.col;
        return a.dir === 'h' && b.dir === 'v' ? -1 : a.dir === 'v' && b.dir === 'h' ? 1 : 0;
    });
}

const GamesPage = {
    currentTab: 'word',
    cruciActiveClueIndex: 0,

    _normalizeWord(str) {
        return (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
    },

    // Palabra del día: 5 letras, estilo Wordle / lapalabradeldia.com
    WORDS_5: [
        'SOLAR','PLUMA','CIELO','MANGO','FELIZ','TIGRE','NOCHE','MUNDO','RELOJ','ARENA',
        'PLAYA','FUEGO','CAMPO','PERRO','GATOS','LUCES','HOJAS','NUBES','PIANO','BARCO',
        'DULCE','BRISA','MONTE','SELVA','DANZA','CANTO','FLORA','HIELO','ROCAS','SALUD',
        'VERDE','ROSAS','PECES','TRIGO','SILLA','LIBRO','LAPIZ','GLOBO','PASEO','VUELO',
        'RUTAS','CLASE','JEFES','ZONAS','QUIEN','HECHO','TEXTO','NIVEL','JOVEN','PUNTO'
    ],

    render(container) {
        const email = Auth.getCurrentEmail();
        const data = Storage.getUserData(email);
        const juegos = data.juegos || { palabraDia: {}, crucigrama: {}, sudoku: {}, historial: [] };

        container.innerHTML = `
            ${UI.pageTitle('Juegos')}

            <div class="tabs">
                <button class="tab-btn ${this.currentTab === 'word' ? 'active' : ''}" data-tab="word">Palabra del Día</button>
                <button class="tab-btn ${this.currentTab === 'crucigrama' ? 'active' : ''}" data-tab="crucigrama">Crucigrama</button>
                <button class="tab-btn ${this.currentTab === 'sudoku' ? 'active' : ''}" data-tab="sudoku">Sudoku</button>
                <button class="tab-btn ${this.currentTab === 'scores' ? 'active' : ''}" data-tab="scores">Puntajes</button>
            </div>

            <div id="tab-word" class="tab-content ${this.currentTab === 'word' ? 'active' : ''}">
                ${this._renderWordGame(juegos, email)}
            </div>

            <div id="tab-crucigrama" class="tab-content ${this.currentTab === 'crucigrama' ? 'active' : ''}">
                ${this._renderCrucigrama(juegos)}
            </div>

            <div id="tab-sudoku" class="tab-content ${this.currentTab === 'sudoku' ? 'active' : ''}">
                ${this._renderSudoku(juegos)}
            </div>

            <div id="tab-scores" class="tab-content ${this.currentTab === 'scores' ? 'active' : ''}">
                ${this._renderScores(juegos)}
            </div>
        `;

        this._bindEvents(container, email, juegos);
    },

    _renderWordGame(juegos, email) {
        const today = DateUtils.today();
        const wordData = juegos.palabraDia || {};
        const isToday = wordData.fecha === today;
        const word = this._getDailyWord();
        const maxAttempts = 6;
        const wordLen = 5;

        const guesses = (isToday && wordData.guesses) ? wordData.guesses : [];
        const resolved = isToday && wordData.resuelto;
        const noAttempts = isToday && guesses.length >= maxAttempts && !wordData.resuelto;

        if (resolved) {
            return `
                <div class="card text-center p-lg">
                    <h3 class="text-success mb-md">¡Acertaste!</h3>
                    <div class="wordle-grid mb-md">${word.split('').map(l => `<div class="wordle-cell correct">${l}</div>`).join('')}</div>
                    <p class="text-secondary mt-md">Intentos: ${guesses.length}</p>
                    <p class="text-muted mt-sm">Vuelve mañana para una nueva palabra.</p>
                </div>
            `;
        }

        if (noAttempts) {
            return `
                <div class="card text-center p-lg">
                    <h3 class="text-error mb-md">Sin intentos</h3>
                    <p class="text-secondary">La palabra era: <strong>${word}</strong></p>
                    <p class="text-muted mt-sm">Vuelve mañana para una nueva palabra.</p>
                </div>
            `;
        }

        let gridHtml = '';
        for (let row = 0; row < maxAttempts; row++) {
            for (let col = 0; col < wordLen; col++) {
                if (row < guesses.length) {
                    const g = guesses[row];
                    const fb = (g.feedback || [])[col] || 'empty';
                    const letter = (g.word || '')[col] || '';
                    gridHtml += `<div class="wordle-cell ${fb}">${letter}</div>`;
                } else {
                    gridHtml += `<div class="wordle-cell empty"></div>`;
                }
            }
        }

        const letterStates = {};
        'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('').forEach(l => { letterStates[l] = ''; });
        guesses.forEach(g => {
            (g.word || '').split('').forEach((l, i) => {
                const fb = (g.feedback || [])[i] || '';
                if (fb === 'correct' || (fb === 'present' && letterStates[l] !== 'correct') || (fb === 'absent' && !letterStates[l])) letterStates[l] = fb;
            });
        });
        const keyboardRow1 = 'QWERTYUIOP'.split('').map(l => `<span class="wordle-key ${letterStates[l] || ''}">${l}</span>`).join('');
        const keyboardRow2 = 'ASDFGHJKLÑ'.split('').map(l => `<span class="wordle-key ${letterStates[l] || ''}">${l}</span>`).join('');
        const keyboardRow3 = 'ZXCVBNM'.split('').map(l => `<span class="wordle-key ${letterStates[l] || ''}">${l}</span>`).join('');
        const keyboardHtml = `<div class="wordle-keyboard-row">${keyboardRow1}</div><div class="wordle-keyboard-row">${keyboardRow2}</div><div class="wordle-keyboard-row">${keyboardRow3}</div>`;

        return `
            <div class="card text-center p-lg">
                <h3 class="mb-sm">La palabra del día</h3>
                <p class="text-secondary text-sm mb-md">${wordLen} letras, ${maxAttempts} intentos. Estilo Wordle.</p>
                <div class="wordle-grid mb-md" id="wordle-grid">${gridHtml}</div>
                <div class="flex justify-center gap-sm mb-md">
                    <input type="text" id="word-guess" class="form-input" maxlength="${wordLen}" placeholder="Palabra de ${wordLen} letras" autocomplete="off" style="width:180px;text-align:center;text-transform:uppercase;font-size:1.2rem;">
                    <button type="button" id="btn-guess" class="btn btn-primary">Adivinar</button>
                </div>
                <p class="text-xs text-secondary mb-xs">Enter para validar · Escribe y prueba de nuevo</p>
                <div id="word-keyboard-wrap" class="wordle-keyboard-wrap mt-md">
                    <p class="text-secondary text-xs mb-xs">Letras usadas y disponibles (referencia)</p>
                    <div id="word-keyboard" class="wordle-keyboard">${keyboardHtml}</div>
                </div>
                <div id="word-feedback" class="mt-md"></div>
            </div>
        `;
    },

    _getDailyWord() {
        const today = DateUtils.today();
        let hash = 0;
        for (let i = 0; i < today.length; i++) {
            hash = ((hash << 5) - hash) + today.charCodeAt(i);
            hash = hash & hash;
        }
        return this.WORDS_5[Math.abs(hash) % this.WORDS_5.length];
    },

    _wordleFeedback(target, guess) {
        const t = target.toUpperCase().split('');
        const g = guess.toUpperCase().split('');
        const result = ['absent','absent','absent','absent','absent'];
        const used = [false, false, false, false, false];
        for (let i = 0; i < 5; i++) {
            if (g[i] === t[i]) {
                result[i] = 'correct';
                used[i] = true;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (result[i] === 'correct') continue;
            for (let j = 0; j < 5; j++) {
                if (!used[j] && t[j] === g[i]) {
                    result[i] = 'present';
                    used[j] = true;
                    break;
                }
            }
        }
        return result;
    },

    _renderCrucigrama(juegos) {
        const data = juegos.crucigrama || { respuestas: {}, grid: null };
        const clues = CRUCI_CLUES;
        const gridSize = 10;
        let grid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(''));
        const saved = data.respuestas || {};
        const savedGrid = data.grid || {};

        // Place saved grid values
        Object.entries(savedGrid).forEach(([key, val]) => {
            const [r, c] = key.split(',').map(Number);
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                grid[r][c] = val.toUpperCase();
            }
        });

        // Build grid HTML with clue numbers
        const clueNumbers = {}; // { "row,col": number }
        let clueNum = 1;
        clues.forEach(cl => {
            const key = `${cl.row},${cl.col}`;
            if (!clueNumbers[key]) {
                clueNumbers[key] = clueNum++;
            }
        });

        let gridHtml = '';
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const hasClue = clues.some(cl => {
                    if (cl.dir === 'h' && cl.row === r && c >= cl.col && c < cl.col + cl.len) return true;
                    if (cl.dir === 'v' && cl.col === c && r >= cl.row && r < cl.row + cl.len) return true;
                    return false;
                });
                if (!hasClue) {
                    gridHtml += '<div class="cruci-cell cruci-block"></div>';
                } else {
                    const val = grid[r][c] || '';
                    const clueIds = clues.filter(cl => {
                        if (cl.dir === 'h' && cl.row === r && c >= cl.col && c < cl.col + cl.len) return true;
                        if (cl.dir === 'v' && cl.col === c && r >= cl.row && r < cl.row + cl.len) return true;
                        return false;
                    }).map(cl => cl.id);
                    const key = `${r},${c}`;
                    const num = clueNumbers[key];
                    const numHtml = num ? `<span class="cruci-number">${num}</span>` : '';
                    gridHtml += `<div class="cruci-cell" data-r="${r}" data-c="${c}" data-clues="${clueIds.join(',')}">${numHtml}<input type="text" maxlength="1" value="${UI.esc(val)}" class="cruci-input" data-r="${r}" data-c="${c}" style="text-transform:uppercase;text-align:center;"></div>`;
                }
            }
        }

        return `
            <div class="card">
                <h3 class="card-title mb-md">Crucigrama chileno</h3>
                <p class="text-secondary text-sm mb-md">Las palabras se cruzan y comparten letras. Completa según las pistas.</p>
                <div class="cruci-grid-container" style="display:flex;gap:var(--spacing-lg);flex-wrap:wrap;">
                    <div>
                        <div class="cruci-grid" id="cruci-grid" style="display:grid;grid-template-columns:repeat(${gridSize},32px);gap:2px;">${gridHtml}</div>
                    </div>
                    <div style="flex:1;min-width:250px;">
                        <h4 class="mb-sm">HORIZONTALES</h4>
                        <ul class="text-sm mb-md cruci-clues-list" style="list-style:none;padding:0;max-height:200px;overflow-y:auto;">
                            ${clues.filter(x => x.dir === 'h').sort((a,b) => (a.row - b.row) || (a.col - b.col)).map((x) => {
                                const num = clueNumbers[`${x.row},${x.col}`];
                                return `<li class="mb-xs cruci-clue" data-clue-id="${x.id}"><strong>${num}.</strong> ${UI.esc(x.clue)}</li>`;
                            }).join('')}
                        </ul>
                        <h4 class="mb-sm">VERTICALES</h4>
                        <ul class="text-sm cruci-clues-list" style="list-style:none;padding:0;max-height:200px;overflow-y:auto;">
                            ${clues.filter(x => x.dir === 'v').sort((a,b) => (a.col - b.col) || (a.row - b.row)).map((x) => {
                                const num = clueNumbers[`${x.row},${x.col}`];
                                return `<li class="mb-xs cruci-clue" data-clue-id="${x.id}"><strong>${num}.</strong> ${UI.esc(x.clue)}</li>`;
                            }).join('')}
                        </ul>
                        <div class="mt-md">
                            <button id="btn-cruci-verify" class="btn btn-primary btn-sm">Verificar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    _renderSudoku(juegos) {
        return `
            <div class="card">
                <div class="flex justify-between items-center mb-md">
                    <h3>Sudoku</h3>
                    <button id="btn-new-sudoku" class="btn btn-primary btn-sm">Nuevo Juego</button>
                </div>
                <div id="sudoku-grid" class="game-grid sudoku"></div>
                <div class="flex justify-center gap-sm mt-md">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `
                        <button class="btn btn-ghost sudoku-num" data-num="${n}" style="width:36px;height:36px;font-weight:bold;">${n}</button>
                    `).join('')}
                    <button class="btn btn-ghost sudoku-num" data-num="0" style="width:36px;height:36px;">✕</button>
                </div>
                <div class="flex justify-center gap-sm mt-sm">
                    <button id="btn-check-sudoku" class="btn btn-success btn-sm">Verificar</button>
                </div>
                <p class="text-secondary text-center mt-sm">Usa teclas 1-9 para escribir, Borrar para limpiar. Resueltos: ${juegos.sudoku?.resueltos || 0}</p>
            </div>
        `;
    },

    _renderScores(juegos) {
        const historial = juegos.historial || [];
        return `
            <div class="card">
                <h3 class="card-title mb-md">Historial de Puntajes</h3>
                ${historial.length > 0 ? `
                    <div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr><th>Juego</th><th>Fecha</th><th>Resultado</th></tr>
                            </thead>
                            <tbody>
                                ${historial.slice(-20).reverse().map(h => `
                                    <tr>
                                        <td>${UI.esc(h.tipo)}</td>
                                        <td>${h.fecha ? DateUtils.format(h.fecha, 'short') : '-'}</td>
                                        <td>${UI.esc(h.score)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : UI.emptyState('Sin puntajes aún. ¡Juega para acumular!')}
            </div>
        `;
    },

    _bindEvents(container, email, juegos) {
        // Tabs
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTab = btn.dataset.tab;
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });

        // Word guessing (Wordle-style)
        const doGuess = () => {
            const input = document.getElementById('word-guess');
            if (!input) return;
            const guess = input.value.trim().toUpperCase().replace(/Ñ/g, 'N');
            const word = this._getDailyWord();
            const today = DateUtils.today();

            if (guess.length !== 5) {
                const fb = document.getElementById('word-feedback');
                if (fb) fb.innerHTML = '<p class="text-warning">Escribe una palabra de 5 letras.</p>';
                return;
            }

            const data = Storage.getUserData(email);
            if (!data.juegos.palabraDia || data.juegos.palabraDia.fecha !== today) {
                data.juegos.palabraDia = { fecha: today, guesses: [], resuelto: false };
            }
            if (!data.juegos.palabraDia.guesses) data.juegos.palabraDia.guesses = [];

            const feedback = this._wordleFeedback(word, guess);
            data.juegos.palabraDia.guesses.push({ word: guess, feedback });

            if (guess === word) {
                data.juegos.palabraDia.resuelto = true;
                data.juegos.historial = data.juegos.historial || [];
                data.juegos.historial.push({
                    tipo: 'Palabra del Día',
                    fecha: today,
                    score: `Resuelto en ${data.juegos.palabraDia.guesses.length} intentos`
                });
                Storage.saveUserData(email, data);
                UI.toast('¡Correcto!', 'success');
                this.render(container);
            } else if (data.juegos.palabraDia.guesses.length >= 6) {
                Storage.saveUserData(email, data);
                UI.toast('La palabra era: ' + word, 'warning');
                this.render(container);
            } else {
                Storage.saveUserData(email, data);
                input.value = '';
                const fbEl = document.getElementById('word-feedback');
                if (fbEl) fbEl.innerHTML = '';
                this.render(container);
                setTimeout(() => document.getElementById('word-guess')?.focus(), 80);
            }
        };

        UI.bindButton('btn-guess', doGuess);
        const wordInput = document.getElementById('word-guess');
        if (wordInput) {
            wordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); doGuess(); }
            });
            if (window.innerWidth >= 768) wordInput.focus();
        }

        // Crucigrama: auto-guardar y navegación
        const cruciVerify = document.getElementById('btn-cruci-verify');
        const cruciInputs = container.querySelectorAll('.cruci-input');
        const saveCruciGrid = () => {
            const data = Storage.getUserData(email);
            if (!data.juegos.crucigrama) data.juegos.crucigrama = { respuestas: {}, grid: {} };
            const grid = {};
            cruciInputs.forEach(inp => {
                const r = inp.dataset.r;
                const c = inp.dataset.c;
                if (r !== undefined && c !== undefined) {
                    grid[`${r},${c}`] = inp.value.toUpperCase();
                }
            });
            data.juegos.crucigrama.grid = grid;
            Storage.saveUserData(email, data);
        };
        if (cruciInputs.length > 0) {
            const cluesOrder = getCruciCluesOrder();
            cruciInputs.forEach(inp => {
                inp.addEventListener('focus', () => {
                    const r = parseInt(inp.dataset.r, 10);
                    const c = parseInt(inp.dataset.c, 10);
                    const idx = cluesOrder.findIndex(cl => cl.row === r && cl.col === c);
                    if (idx >= 0) this.cruciActiveClueIndex = idx;
                });
                inp.addEventListener('input', (e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                    e.target.value = val;
                    saveCruciGrid();
                    if (!val) return;
                    const r = parseInt(inp.dataset.r, 10);
                    const c = parseInt(inp.dataset.c, 10);
                    const cl = cluesOrder[this.cruciActiveClueIndex];
                    if (!cl) return;
                    const pos = cl.dir === 'h' ? (c - cl.col) : (r - cl.row);
                    if (pos >= 0 && pos < cl.len - 1) {
                        const nextR = cl.dir === 'h' ? r : r + 1;
                        const nextC = cl.dir === 'h' ? c + 1 : c;
                        const nextInp = container.querySelector(`.cruci-input[data-r="${nextR}"][data-c="${nextC}"]`);
                        if (nextInp) setTimeout(() => nextInp.focus(), 10);
                    }
                });
                inp.addEventListener('keydown', (e) => {
                    const r = parseInt(inp.dataset.r, 10);
                    const c = parseInt(inp.dataset.c, 10);
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextIndex = (this.cruciActiveClueIndex + 1) % cluesOrder.length;
                        const nextCl = cluesOrder[nextIndex];
                        const firstInp = container.querySelector(`.cruci-input[data-r="${nextCl.row}"][data-c="${nextCl.col}"]`);
                        if (firstInp) {
                            firstInp.focus();
                            this.cruciActiveClueIndex = nextIndex;
                        }
                        return;
                    }
                    if (e.key === 'Backspace' && !inp.value) {
                        const prevInp = Array.from(cruciInputs).reverse().find(i => {
                            const ir = parseInt(i.dataset.r, 10);
                            const ic = parseInt(i.dataset.c, 10);
                            return (ir === r && ic < c) || (ir < r && ic === c);
                        });
                        if (prevInp) prevInp.focus();
                    } else if (e.key === 'ArrowLeft') {
                        const prevInp = Array.from(cruciInputs).find(i => parseInt(i.dataset.r, 10) === r && parseInt(i.dataset.c, 10) === c - 1);
                        if (prevInp) prevInp.focus();
                    } else if (e.key === 'ArrowRight') {
                        const nextInp = Array.from(cruciInputs).find(i => parseInt(i.dataset.r, 10) === r && parseInt(i.dataset.c, 10) === c + 1);
                        if (nextInp) nextInp.focus();
                    } else if (e.key === 'ArrowUp') {
                        const upInp = Array.from(cruciInputs).find(i => parseInt(i.dataset.r, 10) === r - 1 && parseInt(i.dataset.c, 10) === c);
                        if (upInp) upInp.focus();
                    } else if (e.key === 'ArrowDown') {
                        const downInp = Array.from(cruciInputs).find(i => parseInt(i.dataset.r, 10) === r + 1 && parseInt(i.dataset.c, 10) === c);
                        if (downInp) downInp.focus();
                    }
                });
            });
            this.cruciActiveClueIndex = 0;
            const firstCl = cluesOrder[0];
            const firstInp = container.querySelector(`.cruci-input[data-r="${firstCl.row}"][data-c="${firstCl.col}"]`);
            if (firstInp) setTimeout(() => firstInp.focus(), 100);
        }
        if (cruciVerify) {
            cruciVerify.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const data = Storage.getUserData(email);
                if (!data.juegos.crucigrama) data.juegos.crucigrama = { respuestas: {}, grid: null };
                const clues = CRUCI_CLUES;
                const tabCruci = document.getElementById('tab-crucigrama');
                const searchRoot = tabCruci || document;
                const inputsByKey = {};
                searchRoot.querySelectorAll('.cruci-input').forEach(inp => {
                    const r = inp.getAttribute('data-r');
                    const c = inp.getAttribute('data-c');
                    if (r != null && c != null) inputsByKey[r + ',' + c] = inp;
                });
                let correct = 0;
                clues.forEach(cl => {
                    let word = '';
                    for (let i = 0; i < cl.len; i++) {
                        const r = cl.dir === 'h' ? cl.row : cl.row + i;
                        const c = cl.dir === 'h' ? cl.col + i : cl.col;
                        const inp = inputsByKey[r + ',' + c];
                        if (inp) word += (inp.value || '').trim();
                    }
                    const normalizedWord = this._normalizeWord(word);
                    const normalizedAnswer = this._normalizeWord(cl.answer);
                    if (normalizedWord === normalizedAnswer) {
                        correct++;
                        data.juegos.crucigrama.respuestas[cl.id] = normalizedWord;
                    }
                });
                Storage.saveUserData(email, data);
                UI.toast(correct === clues.length ? '¡Crucigrama completado!' : `Correctas: ${correct}/${clues.length}`, correct === clues.length ? 'success' : 'info');
                if (correct === clues.length) {
                    data.juegos.historial = data.juegos.historial || [];
                    data.juegos.historial.push({ tipo: 'Crucigrama', fecha: DateUtils.today(), score: 'Completado' });
                    Storage.saveUserData(email, data);
                    this.render(container);
                }
            });
        }

        // Sudoku
        this._initSudoku(container, email, juegos);
    },

    _sudokuPuzzle: null,
    _sudokuSolution: null,
    _sudokuSelected: null,

    _initSudoku(container, email, juegos) {
        const grid = document.getElementById('sudoku-grid');
        if (!grid) return;

        if (!this._sudokuPuzzle) {
            this._generateSudoku();
        }

        this._renderSudokuGrid(grid);

        // Cell selection
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('.game-cell');
            if (!cell || cell.classList.contains('fixed')) return;
            grid.querySelectorAll('.game-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            this._sudokuSelected = parseInt(cell.dataset.idx);
        });

        // Number input (buttons)
        container.querySelectorAll('.sudoku-num').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this._sudokuSelected === null) return;
                const num = parseInt(btn.dataset.num, 10);
                this._sudokuPuzzle[this._sudokuSelected] = num;
                this._renderSudokuGrid(grid);
            });
        });

        // Keyboard input: 1-9 to write, 0 or Backspace to clear (when a cell is selected and focus is in sudoku tab)
        const sudokuKeyHandler = (e) => {
            if (this._sudokuSelected === null) return;
            const tabSudoku = document.getElementById('tab-sudoku');
            if (!tabSudoku || !tabSudoku.classList.contains('active')) return;
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            const key = e.key;
            if (key >= '1' && key <= '9') {
                const num = parseInt(key, 10);
                this._sudokuPuzzle[this._sudokuSelected] = num;
                this._renderSudokuGrid(grid);
                e.preventDefault();
            } else if (key === 'Backspace' || key === '0' || key === 'Delete') {
                this._sudokuPuzzle[this._sudokuSelected] = 0;
                this._renderSudokuGrid(grid);
                e.preventDefault();
            }
        };
        container.addEventListener('keydown', sudokuKeyHandler);

        // New game
        UI.bindButton('btn-new-sudoku', () => {
            this._generateSudoku();
            this._sudokuSelected = null;
            this._renderSudokuGrid(grid);
        });

        // Check
        UI.bindButton('btn-check-sudoku', () => {
            let correct = true;
            for (let i = 0; i < 81; i++) {
                if (this._sudokuPuzzle[i] !== this._sudokuSolution[i]) {
                    correct = false;
                    break;
                }
            }
            if (correct) {
                const data = Storage.getUserData(email);
                data.juegos.sudoku.resueltos = (data.juegos.sudoku.resueltos || 0) + 1;
                data.juegos.historial.push({
                    tipo: 'Sudoku',
                    fecha: DateUtils.today(),
                    score: 'Completado'
                });
                Storage.saveUserData(email, data);
                UI.toast('¡Sudoku resuelto!', 'success');
                this._generateSudoku();
                this.render(container);
            } else {
                UI.toast('Hay errores. Sigue intentando.', 'warning');
                // Highlight errors
                const grid = document.getElementById('sudoku-grid');
                if (grid) {
                    grid.querySelectorAll('.game-cell').forEach((cell, i) => {
                        if (this._sudokuPuzzle[i] !== 0 && this._sudokuPuzzle[i] !== this._sudokuSolution[i]) {
                            cell.classList.add('error');
                        }
                    });
                }
            }
        });
    },

    _generateSudoku() {
        // Generate a simple valid sudoku
        const solution = this._solvableSudoku();
        this._sudokuSolution = [...solution];
        this._sudokuPuzzle = [...solution];

        // Remove cells for puzzle (easy: remove 35)
        const indices = Array.from({ length: 81 }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        for (let i = 0; i < 35; i++) {
            this._sudokuPuzzle[indices[i]] = 0;
        }
        this._sudokuFixed = this._sudokuPuzzle.map(v => v !== 0);
    },

    _solvableSudoku() {
        // Generate a valid completed sudoku using simple pattern
        const base = [1,2,3,4,5,6,7,8,9];
        const grid = new Array(81).fill(0);

        const shuffle = (arr) => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        // Use a pattern-based approach for guaranteed valid grid
        const pattern = (r, c) => (3 * (r % 3) + Math.floor(r / 3) + c) % 9;
        const rows = shuffle([0,1,2]).concat(shuffle([3,4,5])).concat(shuffle([6,7,8]));
        const cols = shuffle([0,1,2]).concat(shuffle([3,4,5])).concat(shuffle([6,7,8]));
        const nums = shuffle(base);

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                grid[rows[r] * 9 + cols[c]] = nums[pattern(r, c)];
            }
        }
        return grid;
    },

    _renderSudokuGrid(gridEl) {
        if (!gridEl || !this._sudokuPuzzle) return;
        gridEl.innerHTML = this._sudokuPuzzle.map((val, idx) => {
            const isFixed = this._sudokuFixed?.[idx];
            const isSelected = this._sudokuSelected === idx;
            const row = Math.floor(idx / 9);
            const col = idx % 9;
            const borderRight = (col + 1) % 3 === 0 && col < 8 ? 'border-right:2px solid #999;' : '';
            const borderBottom = (row + 1) % 3 === 0 && row < 8 ? 'border-bottom:2px solid #999;' : '';
            return `<div class="game-cell ${isFixed ? 'fixed' : ''} ${isSelected ? 'selected' : ''}" data-idx="${idx}" style="${borderRight}${borderBottom}">
                ${val || ''}
            </div>`;
        }).join('');
    }
};
