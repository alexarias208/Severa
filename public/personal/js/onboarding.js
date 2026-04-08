/* ============================================
   ONBOARDING - Autocompletado según objetivo
   Ofrece prellenar hábitos, estudios, salud, FODA, gratitud, biografía, ejercicios, finanzas
   ============================================ */

const Onboarding = {
    KEY_DONE: 'severa_onboarding_done',

    isDone(email) {
        try {
            const raw = localStorage.getItem(this.KEY_DONE);
            if (!raw) return false;
            const set = JSON.parse(raw);
            return set && set[email] === true;
        } catch (e) { return false; }
    },

    setDone(email) {
        try {
            const raw = localStorage.getItem(this.KEY_DONE) || '{}';
            const set = JSON.parse(raw);
            set[email] = true;
            localStorage.setItem(this.KEY_DONE, JSON.stringify(set));
        } catch (e) {}
    },

    /** Objetivos con plantillas de datos por módulo */
    OBJECTIVES: [
        { value: 'bienestar', label: 'Bienestar general', desc: 'Equilibrio entre salud, hábitos y gratitud' },
        { value: 'salud', label: 'Salud y ejercicio', desc: 'Enfocado en hábitos saludables y actividad física' },
        { value: 'ahorro', label: 'Ahorro y finanzas', desc: 'Control de gastos e ingresos desde el inicio' },
        { value: 'productividad', label: 'Productividad y estudios', desc: 'Ramos, pruebas y organización' },
        { value: 'organizacion', label: 'Organización personal', desc: 'FODA, biografía y claridad de objetivos' }
    ],

    _templates(objective) {
        const today = typeof DateUtils !== 'undefined' ? DateUtils.today() : new Date().toISOString().slice(0, 10);
        const id = () => (Date.now() + Math.random()).toString(36).replace('.', '');
        const templates = {
            bienestar: {
                habitos: [
                    { id: id(), nombre: 'Beber 8 vasos de agua' },
                    { id: id(), nombre: 'Caminar 30 min' },
                    { id: id(), nombre: 'Dormir 7-8 horas' },
                    { id: id(), nombre: 'Gratitud (3 cosas)' }
                ],
                gratitud: [
                    { id: id(), fecha: today, texto: 'Tener salud', creado: new Date().toISOString() },
                    { id: id(), fecha: today, texto: 'Un techo', creado: new Date().toISOString() },
                    { id: id(), fecha: today, texto: 'Poder trabajar', creado: new Date().toISOString() }
                ],
                foda: {
                    fortalezas: [{ id: id(), texto: 'Constancia', creado: new Date().toISOString() }],
                    oportunidades: [{ id: id(), texto: 'Mejorar hábitos día a día', creado: new Date().toISOString() }],
                    debilidades: [],
                    amenazas: [],
                    estrategias: []
                }
            },
            salud: {
                habitos: [
                    { id: id(), nombre: 'Beber 8 vasos de agua' },
                    { id: id(), nombre: 'Ejercicio o caminata' },
                    { id: id(), nombre: 'Estirar o yoga' },
                    { id: id(), nombre: 'Comer fruta/verdura' }
                ],
                gratitud: [
                    { id: id(), fecha: today, texto: 'Tener salud', creado: new Date().toISOString() },
                    { id: id(), fecha: today, texto: 'Poder moverme', creado: new Date().toISOString() }
                ],
                salud: {
                    enfermedades: [],
                    medicamentos: [],
                    sintomas: []
                }
            },
            ahorro: {
                habitos: [
                    { id: id(), nombre: 'Revisar gastos del día' },
                    { id: id(), nombre: 'Anotar gastos' }
                ],
                gratitud: [
                    { id: id(), fecha: today, texto: 'Un techo', creado: new Date().toISOString() }
                ],
                finanzas: {
                    ingresos: [{ id: id(), descripcion: 'Salario (ejemplo)', monto: 0, fecha: today, categoria: 'Salario' }],
                    gastos: [],
                    deudas: []
                }
            },
            productividad: {
                habitos: [
                    { id: id(), nombre: 'Estudiar o formarme' },
                    { id: id(), nombre: 'Leer 20-30 min' }
                ],
                estudios: {
                    ramos: [{ id: id(), nombre: 'Mi ramo o curso (editar)', creado: new Date().toISOString() }],
                    pruebas: []
                },
                gratitud: [
                    { id: id(), fecha: today, texto: 'Aprender algo nuevo', creado: new Date().toISOString() }
                ]
            },
            organizacion: {
                habitos: [
                    { id: id(), nombre: 'Ordenar 10 min' },
                    { id: id(), nombre: 'Escribir en el diario' }
                ],
                foda: {
                    fortalezas: [{ id: id(), texto: 'Organización (editar)', creado: new Date().toISOString() }],
                    oportunidades: [{ id: id(), texto: 'Usar Severa a diario', creado: new Date().toISOString() }],
                    debilidades: [],
                    amenazas: [],
                    estrategias: []
                },
                gratitud: [
                    { id: id(), fecha: today, texto: 'Herramientas para organizarme', creado: new Date().toISOString() }
                ]
            }
        };
        return templates[objective] || templates.bienestar;
    },

    applyTemplates(email, objective) {
        const data = Storage.getUserData(email);
        const t = this._templates(objective);
        if (t.habitos && t.habitos.length) {
            if (!data.habitos) data.habitos = { lista: [], registros: {}, vicios: [], registrosVicios: {} };
            t.habitos.forEach(h => {
                if (!data.habitos.lista.some(x => x.nombre === h.nombre)) data.habitos.lista.push(h);
            });
        }
        if (t.gratitud && t.gratitud.length) {
            if (!data.gratitud) data.gratitud = { entradas: [] };
            t.gratitud.forEach(e => { data.gratitud.entradas.push(e); });
        }
        if (t.foda) {
            if (!data.foda) data.foda = { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [], estrategias: [] };
            ['fortalezas', 'oportunidades', 'debilidades', 'amenazas', 'estrategias'].forEach(q => {
                if (t.foda[q] && t.foda[q].length) data.foda[q].push(...t.foda[q]);
            });
        }
        if (t.estudios && t.estudios.ramos) {
            if (!data.estudios) data.estudios = { ramos: [], pruebas: [] };
            t.estudios.ramos.forEach(r => { data.estudios.ramos.push(r); });
        }
        if (t.finanzas) {
            if (!data.finanzas) data.finanzas = { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
            if (t.finanzas.ingresos) data.finanzas.ingresos.push(...t.finanzas.ingresos);
            if (t.finanzas.gastos) data.finanzas.gastos.push(...t.finanzas.gastos);
            if (t.finanzas.deudas) data.finanzas.deudas.push(...(t.finanzas.deudas || []));
        }
        Storage.saveUserData(email, data);
    },

    /** Muestra el modal de bienvenida y opción de prellenado. onDone() se llama al final (con o sin prellenar). */
    showOffer(email, onDone) {
        if (this.isDone(email)) {
            onDone();
            return;
        }
        const self = this;
        const step1 = `
            <h3 class="modal-title">¡Bienvenido a Severa!</h3>
            <p class="text-secondary mb-md">¿Quieres que prellenemos algunos datos según tu objetivo? Podrás personalizar nombres y montos después.</p>
            <div class="flex gap-sm justify-center">
                <button id="onb-yes" class="btn btn-primary">Sí, prellenar</button>
                <button id="onb-no" class="btn btn-ghost">No, empezar desde cero</button>
            </div>
        `;
        const step2 = `
            <h3 class="modal-title">Elige tu objetivo principal</h3>
            <p class="text-secondary mb-md">Según tu respuesta prellenaremos hábitos, gratitud, FODA, estudios o finanzas para que solo ajustes lo que necesites.</p>
            <select id="onb-objective" class="form-input mb-md" style="width:100%;">
                ${this.OBJECTIVES.map(o => `<option value="${o.value}">${o.label} — ${o.desc}</option>`).join('')}
            </select>
            <div class="flex gap-sm justify-center">
                <button id="onb-apply" class="btn btn-primary">Prellenar y continuar</button>
            </div>
        `;
        UI.showModal(step1, {
            onReady: () => {
                document.getElementById('onb-yes')?.addEventListener('click', () => {
                    const body = document.getElementById('modal-body');
                    if (body) {
                        body.innerHTML = step2;
                        document.getElementById('onb-apply')?.addEventListener('click', () => {
                            const objective = document.getElementById('onb-objective')?.value || 'bienestar';
                            self.applyTemplates(email, objective);
                            self.setDone(email);
                            UI.toast('Datos prellenados. Puedes editarlos en cada sección.', 'success');
                            UI.closeModal();
                            onDone();
                        });
                    }
                });
                document.getElementById('onb-no')?.addEventListener('click', () => {
                    self.setDone(email);
                    UI.closeModal();
                    onDone();
                });
            }
        });
    }
};
