/* ============================================
   SETTINGS PAGE - User Configuration + Demo Data
   ============================================ */

const SettingsPage = {
    render(container) {
        const user = Auth.getCurrentUser();

        if (user && user.rol === 'manager') {
            Manager.render(container);
            return;
        }

        container.innerHTML = `
            ${UI.pageTitle('Configuración', '', 'settings')}

            <div class="cards-grid">
                <div class="card">
                    <h4 class="card-title mb-md">Perfil</h4>
                    <p class="text-secondary mb-md">Edita tu información personal y preferencias.</p>
                    <button id="btn-edit-profile" class="btn btn-primary">Editar Perfil</button>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Cambiar Contraseña</h4>
                    <form id="change-my-pass-form">
                        ${UI.formGroup('Contraseña Actual', UI.input('cur_pass', { type: 'password', placeholder: 'Actual', required: true }))}
                        ${UI.formGroup('Nueva Contraseña', UI.input('new_pass', { type: 'password', placeholder: 'Nueva', required: true }))}
                        <button type="submit" class="btn btn-primary btn-sm">Cambiar</button>
                    </form>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Puente Financiero</h4>
                    <p class="text-secondary mb-md">Si activas esta opción, el ingreso neto calculado en Modo Trabajo (ingresos − gastos) se copiará a Finanzas en Modo Persona como "Ingreso Laboral Neto", sin detalles sensibles.</p>
                    <label class="form-check">
                        <input type="checkbox" id="config-puente-financiero" ${(Storage.getUserData(Auth.getCurrentEmail())?.config?.puenteFinanciero) ? 'checked' : ''}>
                        <span class="form-check-label">Activar puente Modo Trabajo → Finanzas</span>
                    </label>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Datos de Ejemplo</h4>
                    <p class="text-secondary mb-md">Carga datos de ejemplo en todas las secciones para visualizar cómo funciona la plataforma.</p>
                    <button id="btn-load-demo" class="btn btn-warning">Cargar datos de ejemplo</button>
                    <button id="btn-clear-data" class="btn btn-danger btn-sm mt-sm">Limpiar todos los datos</button>
                </div>

                <div class="card">
                    <h4 class="card-title mb-md">Cerrar Sesión</h4>
                    <p class="text-secondary mb-md">Salir de tu cuenta.</p>
                    <button id="btn-logout-settings" class="btn btn-danger">Cerrar Sesión</button>
                </div>
            </div>
        `;

        UI.bindButton('btn-edit-profile', (e) => {
            e.preventDefault();
            e.stopPropagation();
            Profile.showEditModal();
        });
        const puenteCb = document.getElementById('config-puente-financiero');
        if (puenteCb) {
            puenteCb.addEventListener('change', () => {
                const email = Auth.getCurrentEmail();
                const data = Storage.getUserData(email);
                if (!data.config) data.config = {};
                data.config.puenteFinanciero = puenteCb.checked;
                Storage.saveUserData(email, data);
                UI.toast(puenteCb.checked ? 'Puente financiero activado' : 'Puente financiero desactivado', 'success');
            });
        }
        UI.bindButton('btn-logout-settings', () => Auth.logout());

        UI.bindButton('btn-load-demo', () => {
            UI.confirm('¿Cargar datos de ejemplo? Esto sobrescribirá tus datos actuales en todos los módulos.', () => {
                DemoData.loadForCurrentUser();
                UI.toast('Datos de ejemplo cargados exitosamente', 'success');
                Router.refresh();
            });
        });

        UI.bindButton('btn-clear-data', () => {
            UI.confirm('¿Limpiar TODOS los datos? Esta acción no se puede deshacer.', () => {
                const email = Auth.getCurrentEmail();
                Storage.saveUserData(email, Storage._defaultUserData());
                UI.toast('Datos limpiados', 'success');
                Router.refresh();
            });
        });

        UI.bindForm('change-my-pass-form', async (fd) => {
            const email = Auth.getCurrentEmail();
            const currentUser = Auth.getCurrentUser();
            const curHash = await UI.hashPassword(fd.cur_pass);

            if (curHash !== currentUser.password) {
                UI.toast('Contraseña actual incorrecta', 'error');
                return;
            }

            if (fd.new_pass.length < 3) {
                UI.toast('La nueva contraseña debe tener al menos 3 caracteres', 'error');
                return;
            }

            await Auth.changePassword(email, fd.new_pass);
            UI.toast('Contraseña actualizada', 'success');
            document.getElementById('change-my-pass-form').reset();
        });
    }
};

/* ============================================
   DEMO DATA GENERATOR
   Fills all modules with realistic example data
   ============================================ */
const DemoData = {
    loadForCurrentUser() {
        const email = Auth.getCurrentEmail();
        if (!email) return;

        const today = DateUtils.today();
        const d = (offset) => DateUtils.addDays(today, offset);

        const data = {
            // ---- FINANZAS ----
            finanzas: {
                ingresos: [
                    { id: 'fi1', descripcion: 'Salario mensual', monto: 1850000, fecha: d(-25), categoria: 'Salario' },
                    { id: 'fi2', descripcion: 'Freelance diseño logo', monto: 350000, fecha: d(-18), categoria: 'Freelance' },
                    { id: 'fi3', descripcion: 'Venta artículos usados', monto: 85000, fecha: d(-10), categoria: 'Otro' },
                    { id: 'fi4', descripcion: 'Dividendos inversión', monto: 120000, fecha: d(-5), categoria: 'Inversiones' },
                ],
                gastos: [
                    { id: 'fg1', descripcion: 'Arriendo departamento', monto: 550000, fecha: d(-24), categoria: 'Hogar' },
                    { id: 'fg2', descripcion: 'Supermercado semanal', monto: 95000, fecha: d(-20), categoria: 'Comida' },
                    { id: 'fg3', descripcion: 'Cuenta de luz', monto: 42000, fecha: d(-19), categoria: 'Servicios' },
                    { id: 'fg4', descripcion: 'Netflix + Spotify', monto: 18500, fecha: d(-17), categoria: 'Entretenimiento' },
                    { id: 'fg5', descripcion: 'Gasolina auto', monto: 65000, fecha: d(-15), categoria: 'Transporte' },
                    { id: 'fg6', descripcion: 'Supermercado semanal', monto: 87000, fecha: d(-13), categoria: 'Comida' },
                    { id: 'fg7', descripcion: 'Consulta médica', monto: 35000, fecha: d(-11), categoria: 'Salud' },
                    { id: 'fg8', descripcion: 'Ropa de invierno', monto: 78000, fecha: d(-8), categoria: 'Ropa' },
                    { id: 'fg9', descripcion: 'Cena restaurante', monto: 42000, fecha: d(-6), categoria: 'Comida' },
                    { id: 'fg10', descripcion: 'Internet fibra óptica', monto: 29900, fecha: d(-3), categoria: 'Servicios' },
                    { id: 'fg11', descripcion: 'Supermercado semanal', monto: 92000, fecha: d(-2), categoria: 'Comida' },
                    { id: 'fg12', descripcion: 'Uber al trabajo', monto: 8500, fecha: d(-1), categoria: 'Transporte' },
                ],
                deudas: [
                    { id: 'fd1', descripcion: 'Crédito universitario', monto: 4500000, fechaVence: d(60), porcentaje: 5.5, pagos: [
                        { fecha: d(-30), monto: 150000 }, { fecha: d(-60), monto: 150000 }
                    ]},
                    { id: 'fd2', descripcion: 'Tarjeta de crédito', monto: 380000, fechaVence: d(15), porcentaje: 24, pagos: [] },
                ]
            },

            // ---- GASTOS COMPARTIDOS ----
            gastosCompartidos: {
                participantes: [],
                gastos: []
            },

            // ---- CALENDARIO ----
            calendario: {
                eventos: [
                    { id: 'ce1', titulo: 'Reunión de equipo', fecha: d(0), hora: '10:00', tipo: 'General', color: '', completado: false },
                    { id: 'ce2', titulo: 'Dentista', fecha: d(2), hora: '15:30', tipo: 'Salud', color: '', completado: false },
                    { id: 'ce3', titulo: 'Entrega proyecto freelance', fecha: d(4), hora: '', tipo: 'Urgente', color: '', completado: false },
                    { id: 'ce4', titulo: 'Cumpleaños mamá', fecha: d(7), hora: '', tipo: 'General', color: '', completado: false },
                    { id: 'ce5', titulo: 'Pago arriendo', fecha: d(10), hora: '', tipo: 'Finanza', color: '', completado: false },
                    { id: 'ce6', titulo: 'Examen de Cálculo II', fecha: d(5), hora: '09:00', tipo: 'Estudio', color: '', completado: false },
                    { id: 'ce7', titulo: 'Sesión gimnasio', fecha: d(-1), hora: '07:00', tipo: 'Ejercicio', color: '', completado: true },
                    { id: 'ce8', titulo: 'Lectura bíblica', fecha: d(-1), hora: '22:00', tipo: 'Hábito', color: '', completado: true },
                    { id: 'ce9', titulo: 'Revisión médica anual', fecha: d(14), hora: '11:00', tipo: 'Salud', color: '', completado: false },
                    { id: 'ce10', titulo: 'Pagar tarjeta', fecha: d(15), hora: '', tipo: 'Urgente', color: '', completado: false },
                ]
            },

            // ---- HÁBITOS ----
            habitos: {
                lista: [
                    { id: 'h1', nombre: 'Leer 30 minutos', frecuencia: 'diario', creado: d(-30) },
                    { id: 'h2', nombre: 'Ejercicio físico', frecuencia: 'diario', creado: d(-30) },
                    { id: 'h3', nombre: 'Meditar 10 minutos', frecuencia: 'diario', creado: d(-20) },
                    { id: 'h4', nombre: 'Beber 2L de agua', frecuencia: 'diario', creado: d(-25) },
                    { id: 'h5', nombre: 'Estudiar programación', frecuencia: 'diario', creado: d(-15) },
                    { id: 'h6', nombre: 'No redes sociales >1hr', frecuencia: 'diario', creado: d(-10) },
                ],
                registros: {
                    [d(-6)]: { h1: true, h2: true, h3: false, h4: true, h5: true, h6: false },
                    [d(-5)]: { h1: true, h2: false, h3: true, h4: true, h5: false, h6: true },
                    [d(-4)]: { h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
                    [d(-3)]: { h1: false, h2: true, h3: false, h4: true, h5: true, h6: false },
                    [d(-2)]: { h1: true, h2: true, h3: true, h4: false, h5: true, h6: true },
                    [d(-1)]: { h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
                    [d(0)]:  { h1: true, h2: false, h3: false, h4: true, h5: false, h6: false },
                }
            },

            // ---- ESTUDIOS ----
            estudios: {
                ramos: [
                    {
                        id: 'r1', nombre: 'Cálculo II', profesor: 'Dr. Martínez',
                        correos: 'martinez@universidad.cl',
                        companeros: 'Ana, Pedro, Lucía',
                        calificaciones: [
                            { nombre: 'Prueba 1 - Integrales', nota: 5.8, ponderacion: 25 },
                            { nombre: 'Prueba 2 - Series', nota: 6.2, ponderacion: 25 },
                            { nombre: 'Tarea 1', nota: 6.5, ponderacion: 10 },
                        ],
                        horario: [
                            { dia: 'Lunes', horaInicio: '08:30', horaFin: '10:00' },
                            { dia: 'Miércoles', horaInicio: '08:30', horaFin: '10:00' },
                        ]
                    },
                    {
                        id: 'r2', nombre: 'Programación Avanzada', profesor: 'Prof. García',
                        correos: 'garcia@universidad.cl',
                        companeros: 'Carlos, María',
                        calificaciones: [
                            { nombre: 'Proyecto 1 - API REST', nota: 6.8, ponderacion: 30 },
                            { nombre: 'Prueba 1 - Algoritmos', nota: 5.5, ponderacion: 30 },
                        ],
                        horario: [
                            { dia: 'Martes', horaInicio: '10:15', horaFin: '11:45' },
                            { dia: 'Jueves', horaInicio: '10:15', horaFin: '11:45' },
                        ]
                    },
                    {
                        id: 'r3', nombre: 'Base de Datos', profesor: 'Dra. López',
                        correos: 'lopez@universidad.cl',
                        companeros: 'Diego, Sofía, Tomás',
                        calificaciones: [
                            { nombre: 'Taller SQL', nota: 7.0, ponderacion: 20 },
                        ],
                        horario: [
                            { dia: 'Viernes', horaInicio: '14:00', horaFin: '15:30' },
                        ]
                    }
                ],
                pruebas: [
                    { id: 'p1', ramoId: 'r1', fecha: d(5), ponderacion: 25, nota: null },
                    { id: 'p2', ramoId: 'r2', fecha: d(12), ponderacion: 40, nota: null },
                ]
            },

            // ---- RELIGIÓN ----
            religion: {
                posicionActual: { libro: 0, capitulo: 0, versiculo: 0 },
                favoritos: [
                    { libro: 0, capitulo: 0, versiculo: 0 },   // Génesis 1:1
                    { libro: 18, capitulo: 22, versiculo: 0 },  // Salmos 23:1
                    { libro: 42, capitulo: 0, versiculo: 15 },  // Juan 3:16
                ],
                reflexiones: {
                    '0-0-0': 'El inicio de todo. Dios creó con propósito y orden.',
                    '42-0-15': 'La promesa más grande de amor incondicional.',
                },
                progreso: { versiculosLeidos: 156, totalVersiculos: 31102, ultimaLectura: d(-1), versiculosHoy: 0 },
                modoLectura: true
            },

            // ---- CICLO MENSTRUAL ----
            ciclo: {
                registros: {
                    [d(-28)]: { flujo: 'alto', dolor: 'moderado', mood: 'cansada', sintomas: ['Cólicos', 'Dolor de cabeza'] },
                    [d(-27)]: { flujo: 'alto', dolor: 'leve', mood: 'normal', sintomas: ['Cólicos'] },
                    [d(-26)]: { flujo: 'medio', dolor: 'ninguno', mood: 'bien', sintomas: [] },
                    [d(-25)]: { flujo: 'bajo', dolor: 'ninguno', mood: 'bien', sintomas: [] },
                    [d(-24)]: { flujo: 'bajo', dolor: 'ninguno', mood: 'energética', sintomas: [] },
                },
                duracionCiclo: 28,
                ultimoInicio: d(-28),
                encuentros: [
                    { id: 'ce1', fecha: d(-15), hora: '22:00', proteccion: true, notas: '', calificacion: 4 },
                    { id: 'ce2', fecha: d(-9), hora: '23:00', proteccion: true, notas: '', calificacion: 5 },
                ]
            },

            // ---- EJERCICIOS ----
            ejercicios: {
                sesiones: [
                    {
                        id: 'es1', fecha: d(-6),
                        ejercicios: [
                            { nombre: 'Press banca', parte: 'chest', tipo: 'strength', series: 4, reps: 10, peso: 60 },
                            { nombre: 'Press inclinado', parte: 'chest', tipo: 'strength', series: 3, reps: 12, peso: 40 },
                            { nombre: 'Curl bíceps', parte: 'biceps', tipo: 'strength', series: 3, reps: 12, peso: 15 },
                            { nombre: 'Extensión tríceps', parte: 'triceps', tipo: 'strength', series: 3, reps: 12, peso: 12 },
                        ]
                    },
                    {
                        id: 'es2', fecha: d(-5),
                        ejercicios: [
                            { nombre: 'Correr', parte: 'cardio', tipo: 'cardio', km: 5.2, tiempo: 28, calorias: 420 },
                            { nombre: 'Abdominales', parte: 'abs', tipo: 'bodyweight', series: 3, reps: 20 },
                            { nombre: 'Planchas', parte: 'abs', tipo: 'bodyweight', series: 3, reps: 1, tiempo: 1 },
                        ]
                    },
                    {
                        id: 'es3', fecha: d(-4),
                        ejercicios: [
                            { nombre: 'Sentadillas', parte: 'quads', tipo: 'strength', series: 4, reps: 8, peso: 80 },
                            { nombre: 'Peso muerto', parte: 'back', tipo: 'strength', series: 4, reps: 6, peso: 100 },
                            { nombre: 'Hip thrust', parte: 'glutes', tipo: 'strength', series: 3, reps: 12, peso: 70 },
                            { nombre: 'Elevación pantorrillas', parte: 'calves', tipo: 'strength', series: 4, reps: 15, peso: 40 },
                        ]
                    },
                    {
                        id: 'es4', fecha: d(-2),
                        ejercicios: [
                            { nombre: 'Press militar', parte: 'shoulders', tipo: 'strength', series: 4, reps: 10, peso: 35 },
                            { nombre: 'Remo con barra', parte: 'back', tipo: 'strength', series: 4, reps: 10, peso: 50 },
                            { nombre: 'Dominadas', parte: 'back', tipo: 'bodyweight', series: 3, reps: 8 },
                        ]
                    },
                    {
                        id: 'es5', fecha: d(-1),
                        ejercicios: [
                            { nombre: 'Bicicleta', parte: 'cardio', tipo: 'cardio', km: 15, tiempo: 45, calorias: 380 },
                        ]
                    }
                ]
            },

            // ---- JUEGOS ----
            juegos: {
                palabraDia: { fecha: d(-1), intentos: 3, resuelto: true },
                crucigrama: { mejorTiempo: 245, resueltos: 3 },
                sudoku: { mejorTiempo: 480, resueltos: 5 },
                historial: [
                    { tipo: 'Palabra del día', fecha: d(-1), resultado: 'Resuelto en 3 intentos' },
                    { tipo: 'Sudoku', fecha: d(-2), resultado: 'Resuelto en 8:00 min' },
                    { tipo: 'Palabra del día', fecha: d(-3), resultado: 'Resuelto en 5 intentos' },
                    { tipo: 'Crucigrama', fecha: d(-4), resultado: 'Resuelto en 4:05 min' },
                    { tipo: 'Sudoku', fecha: d(-5), resultado: 'Resuelto en 12:30 min' },
                ]
            },

            // ---- PRIORIDADES DEL DÍA ----
            prioridadesDia: [
                { id: 'pd1', texto: 'Terminar informe del proyecto', orden: 1, completado: false },
                { id: 'pd2', texto: 'Llamar al banco por crédito', orden: 2, completado: false },
                { id: 'pd3', texto: 'Estudiar para examen de Cálculo', orden: 3, completado: false },
                { id: 'pd4', texto: 'Comprar regalo cumpleaños mamá', orden: 4, completado: true },
                { id: 'pd5', texto: 'Ir al gimnasio', orden: 5, completado: false },
            ],

            enfoqueDia: { texto: 'Avanzar en el proyecto final y mantener el balance', fecha: today },

            // ---- DIARIO DE VIDA ----
            diario: {
                entradas: {
                    [d(-7)]: { texto: 'Día productivo, logré avanzar mucho en el proyecto. Me siento motivado y con energía.', calificacion: 'verde', nota: 8, actividades: ['trabajo', 'ejercicio', 'lectura'], creado: d(-7) + 'T22:00:00' },
                    [d(-6)]: { texto: 'Tuve una discusión en el trabajo que me dejó pensando. Necesito mejorar mi comunicación.', calificacion: 'amarillo', nota: 5, actividades: ['trabajo', 'reflexión'], creado: d(-6) + 'T21:30:00' },
                    [d(-5)]: { texto: 'Excelente día! Terminé el freelance y me pagaron. Salí a cenar con amigos.', calificacion: 'verde', nota: 9, actividades: ['trabajo', 'social', 'comida'], creado: d(-5) + 'T23:00:00' },
                    [d(-4)]: { texto: 'Día bastante normal, rutina habitual. Pude meditar y hacer ejercicio.', calificacion: 'verde', nota: 7, actividades: ['ejercicio', 'meditación', 'estudio'], creado: d(-4) + 'T20:00:00' },
                    [d(-3)]: { texto: 'Me sentí muy cansado todo el día, no dormí bien. Solo logré lo mínimo.', calificacion: 'rojo', nota: 3, actividades: ['descanso'], creado: d(-3) + 'T19:00:00' },
                    [d(-2)]: { texto: 'Día de recuperación. Dormí bien, hice ejercicio suave y leí un buen libro.', calificacion: 'verde', nota: 7, actividades: ['lectura', 'ejercicio', 'descanso'], creado: d(-2) + 'T21:00:00' },
                    [d(-1)]: { texto: 'Mucho estrés por la entrega del proyecto, pero logré avanzar bastante. Mañana será mejor.', calificacion: 'amarillo', nota: 5, actividades: ['trabajo', 'estudio', 'estrés'], creado: d(-1) + 'T22:30:00' },
                }
            },

            // ---- FODA PERSONAL ----
            foda: {
                fortalezas: [
                    { id: 'ff1', texto: 'Disciplina y constancia en mis hábitos', puntuacion: 8 },
                    { id: 'ff2', texto: 'Habilidades técnicas en programación', puntuacion: 9 },
                    { id: 'ff3', texto: 'Capacidad de aprendizaje rápido', puntuacion: 7 },
                    { id: 'ff4', texto: 'Buena gestión financiera personal', puntuacion: 6 },
                ],
                oportunidades: [
                    { id: 'fo1', texto: 'Mercado laboral tech en crecimiento', puntuacion: 9 },
                    { id: 'fo2', texto: 'Posibilidad de trabajo remoto internacional', puntuacion: 8 },
                    { id: 'fo3', texto: 'Cursos gratuitos de IA y machine learning', puntuacion: 7 },
                ],
                debilidades: [
                    { id: 'fd1', texto: 'Procrastinación en tareas no urgentes', puntuacion: 7 },
                    { id: 'fd2', texto: 'Poco networking profesional', puntuacion: 6 },
                    { id: 'fd3', texto: 'Inglés hablado necesita mejorar', puntuacion: 5 },
                ],
                amenazas: [
                    { id: 'fa1', texto: 'Alta competencia en el mercado tech', puntuacion: 7 },
                    { id: 'fa2', texto: 'Automatización de tareas junior', puntuacion: 6 },
                    { id: 'fa3', texto: 'Inflación y aumento costo de vida', puntuacion: 8 },
                ],
                estrategias: [
                    { id: 'fe1', tipo: 'FO', texto: 'Usar mis habilidades de programación para aplicar a puestos remotos internacionales', fecha: d(-10) },
                    { id: 'fe2', tipo: 'DO', texto: 'Aprovechar cursos gratuitos de IA para mejorar mi perfil y superar la procrastinación con metas claras', fecha: d(-8) },
                    { id: 'fe3', tipo: 'FA', texto: 'Mantener disciplina de estudio constante para diferenciarme de la competencia', fecha: d(-5) },
                    { id: 'fe4', tipo: 'DA', texto: 'Mejorar inglés y networking para reducir vulnerabilidad ante automatización', fecha: d(-3) },
                ]
            },

            // ---- REGISTRO ÍNTIMO ----
            registroIntimo: {
                encuentros: [
                    { id: 'ri1', fecha: d(-12), hora: '23:00', proteccion: true, notas: '', calificacion: 4 },
                    { id: 'ri2', fecha: d(-8), hora: '22:30', proteccion: true, notas: 'Buen momento juntos', calificacion: 5 },
                    { id: 'ri3', fecha: d(-3), hora: '21:00', proteccion: false, notas: '', calificacion: 3 },
                ]
            }
        };

        Storage.saveUserData(email, data);
    }
};
