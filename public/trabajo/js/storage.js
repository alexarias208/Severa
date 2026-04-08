/* Almacenamiento local Modo Trabajo */
const TrabajoStorage = {
    KEY_AREA: 'trabajo_area',
    KEY_PERFIL: 'trabajo_perfil',
    KEY_DATA: 'trabajo_data',
    KEY_SESSION: 'plataforma_session',
    KEY_USERS: 'plataforma_users',
    SCHEMA_VERSION: 12,

    /**
     * Perfiles profesionales (Modo Trabajo v2). Hash: #<slug>/<sección>/[subId]
     * Nuevos perfiles: incluir desde el diseño rutas globales Mi día + Agenda y una vista
     * Calendario (o equivalente) con la misma fuente de datos fechados del perfil.
     */
    PERFILES: [
        { slug: 'minimarket', name: 'Minimarket', icon: '🏪', desc: 'Caja por turno, inventario y flujo de caja.' },
        { slug: 'educacion', name: 'Educación', icon: '📚', desc: 'Cursos, salas, calendario, planificación e informes.' },
        { slug: 'prevencionista', name: 'Prevención de riesgos', icon: '🦺', desc: 'Clientes, obras, tareas, documentación y EPP.' },
        { slug: 'administrativo', name: 'Administrativo / RRHH', icon: '📋', desc: 'Fechas, procesos, prioridades y contactos.' },
        { slug: 'pasteleria', name: 'Pastelería', icon: '🎂', desc: 'Entregas, precios, recetas y pedidos.' },
        { slug: 'cabanas', name: 'Arriendo cabañas', icon: '🏕️', desc: 'Reservas, clientes y evaluación al retiro.' },
        { slug: 'laboratorio', name: 'Laboratorio / balanzas', icon: '⚖️', desc: 'Equipos, visitas y finanzas por servicio.' },
        { slug: 'salud', name: 'Consulta independiente', icon: '🩺', desc: 'Pacientes, sesiones, planes y notas (sin historia clínica certificada).' }
    ],

    slugToPerfil(slug) {
        return (this.PERFILES || []).find(p => p.slug === slug) || null;
    },

    getPerfilSlug() {
        return localStorage.getItem(this.KEY_PERFIL) || '';
    },
    setPerfilSlug(slug) {
        if (slug) localStorage.setItem(this.KEY_PERFIL, slug);
    },

    /** Áreas permitidas (valor en perfil) → slug para hash */
    AREAS: ['Salud', 'Educación', 'Tecnología', 'Servicios/Comercial', 'Administración/Gestión', 'Logística/Operaciones', 'Consultoría/Estratégica'],
    areaToSlug(area) {
        const map = { 'Salud': 'salud', 'Educación': 'educacion', 'Tecnología': 'tecnologia', 'Servicios/Comercial': 'servicios', 'Administración/Gestión': 'administracion', 'Logística/Operaciones': 'logistica', 'Consultoría/Estratégica': 'consultoria' };
        return map[area] || (area || '').toLowerCase().replace(/\s*\/\s*/g, '-').replace(/[^a-z0-9-]/g, '');
    },
    slugToArea(slug) {
        const map = { salud: 'Salud', educacion: 'Educación', tecnologia: 'Tecnología', servicios: 'Servicios/Comercial', administracion: 'Administración/Gestión', logistica: 'Logística/Operaciones', consultoria: 'Consultoría/Estratégica' };
        return map[slug] || null;
    },

    getArea() {
        return localStorage.getItem(this.KEY_AREA) || '';
    },
    setArea(area) {
        localStorage.setItem(this.KEY_AREA, area);
    },

    /** Obtiene el área principal del perfil del usuario (app Persona) */
    getAreaFromProfile() {
        try {
            const session = JSON.parse(localStorage.getItem(this.KEY_SESSION) || '{}');
            const email = session.email;
            if (!email) return null;
            const users = JSON.parse(localStorage.getItem(this.KEY_USERS) || '{}');
            const user = users[email];
            const area = user?.perfil?.areaPrincipal || null;
            if (area) return area;
            const prof = user?.perfil?.profesionTrabajo;
            if (prof === 'kinesiologo') return 'Salud';
            if (prof === 'profesor') return 'Educación';
            if (prof === 'barbero') return 'Servicios/Comercial';
            return null;
        } catch (e) {
            return null;
        }
    },
    /** Guarda el área en el perfil del usuario */
    saveAreaToProfile(area) {
        try {
            const session = JSON.parse(localStorage.getItem(this.KEY_SESSION) || '{}');
            const email = session.email;
            if (!email) return;
            const users = JSON.parse(localStorage.getItem(this.KEY_USERS) || '{}');
            const user = users[email];
            if (!user || !user.perfil) return;
            user.perfil.areaPrincipal = area || null;
            users[email] = user;
            localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
        } catch (e) {}
    },

    getData() {
        try {
            const d = JSON.parse(localStorage.getItem(this.KEY_DATA) || '{}');
            return this._migrateData(d);
        } catch (e) {
            return this._migrateData({});
        }
    },

    _migrateData(d) {
        if (!d || typeof d !== 'object') d = {};
        let needSave = false;
        if ((d._schemaVersion || 0) < 2) {
            this._migrateToV2(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 3) {
            this._migrateToV3(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 4) {
            this._migrateToV4(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 5) {
            this._migrateToV5(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 6) {
            this._migrateToV6(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 7) {
            this._migrateToV7(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 8) {
            this._migrateToV8(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 9) {
            this._migrateToV9(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 10) {
            this._migrateToV10(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 11) {
            this._migrateToV11(d);
            needSave = true;
        }
        if ((d._schemaVersion || 0) < 12) {
            this._migrateToV12(d);
            needSave = true;
        }
        if (!d.perfiles) d.perfiles = {};
        (this.PERFILES || []).forEach(p => {
            if (!d.perfiles[p.slug]) {
                d.perfiles[p.slug] = this._defaultPerfil(p.slug);
                needSave = true;
            }
        });
        if (needSave) this.saveData(d);
        return d;
    },
    saveData(data) {
        localStorage.setItem(this.KEY_DATA, JSON.stringify(data));
    },

    _defaultPerfil(slug) {
        const finanzasBase = () => ({ ingresos: [], gastos: [], categorias: ['Operación', 'Insumos', 'Servicios', 'Otros'] });
        const bases = {
            minimarket: {
                version: 1,
                cajasTurno: [],
                inventario: { productos: [], movimientos: [] },
                finanzas: {
                    ...finanzasBase(),
                    activos: [],
                    pasivos: [],
                    pagosProgramados: [],
                    mesVista: new Date().toISOString().slice(0, 7),
                    filtroFacturasTipo: 'todos'
                },
                proveedores: [],
                recepciones: [],
                precios: { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} },
                facturas: [],
                siiReferencia: {
                    tasaIVA: 19,
                    regimen: '',
                    factorEstimacionIVA: 0.19,
                    mostrarEstimacionIVA: true
                },
                agenda: { version: 1, tareasAgenda: [] }
            },
            educacion: {
                version: 1,
                cursos: [],
                eventosCalendario: [],
                prioridadesDia: [],
                agenda: { version: 1, tareasAgenda: [] },
                salas: [],
                actividades: [],
                planes: []
            },
            prevencionista: {
                version: 3,
                clientes: [],
                obras: [],
                tareas: [],
                eppCatalogo: [],
                visitas: [],
                agenda: { version: 1, tareasAgenda: [] }
            },
            administrativo: {
                version: 1,
                fechasImportantes: [],
                procesos: [],
                prioridadesInicio: [],
                notasDestacadas: '',
                contactos: [],
                agenda: { version: 1, tareasAgenda: [] }
            },
            pasteleria: {
                version: 2,
                entregas: [],
                calculadora: { costosFijos: 0, costosVariables: 0, indirectos: 0, margenPct: 30, unidadesLote: 1 },
                tarifas: [],
                productos: [],
                insumos: [],
                movimientosInsumos: [],
                recetas: [],
                presetsReceta: {
                    tipoMasa: ['Bizcocho', 'Hojaldre', 'Galleta', 'Otro'],
                    relleno: ['Crema', 'Manjar', 'Fruta', 'Chocolate', 'Otro'],
                    cobertura: ['Fondant', 'Crema', 'Ganache', 'Naked', 'Otro']
                },
                historialPedidos: [],
                agenda: { version: 1, tareasAgenda: [] }
            },
            cabanas: {
                version: 2,
                unidades: [{ id: 'cab-u-default', nombre: 'Unidad principal', notas: '', fotos: [] }],
                clientes: [],
                reservas: [],
                evaluacionesRetiro: [],
                finanzas: {
                    ingresos: [],
                    gastos: [],
                    categoriasGasto: ['Sin categoría', 'Operación', 'Mantenimiento', 'Insumos', 'Servicios', 'Otros']
                },
                agenda: { version: 1, tareasAgenda: [] }
            },
            laboratorio: {
                version: 2,
                equipos: [],
                visitas: [],
                finanzas: {
                    ingresos: [],
                    gastos: [],
                    categoriasGasto: ['Sin categoría', 'Repuestos', 'Calibración', 'Servicios', 'Otros']
                },
                agenda: { version: 1, tareasAgenda: [] }
            },
            salud: {
                version: 1,
                pacientes: [],
                sesiones: [],
                planes: [],
                finanzas: {
                    ingresos: [],
                    gastos: [],
                    categoriasGasto: ['Sin categoría', 'Consulta', 'Control', 'Material', 'Servicios', 'Otros']
                },
                agenda: { version: 1, tareasAgenda: [] }
            }
        };
        return bases[slug] ? JSON.parse(JSON.stringify(bases[slug])) : {};
    },

    _migrateToV2(d) {
        const id = () => Date.now().toString() + Math.random().toString(36).slice(2, 8);
        if (!d.perfiles) d.perfiles = {};
        (this.PERFILES || []).forEach(p => {
            if (!d.perfiles[p.slug]) d.perfiles[p.slug] = this._defaultPerfil(p.slug);
        });
        const edu = d.perfiles.educacion;
        const oldP = d.profesor;
        if (oldP && edu && (!edu.cursos || edu.cursos.length === 0) && ((oldP.alumnos || []).length > 0 || (oldP.horario || []).length > 0)) {
            const cursoId = id();
            const participantes = (oldP.alumnos || []).map(a => ({
                id: a.id || id(),
                nombre: a.nombre || 'Sin nombre',
                datos: a.curso || '',
                notas: '',
                evaluaciones: [],
                seguimiento: [],
                tareas: []
            }));
            const sesiones = (oldP.horario || []).map(h => ({
                id: id(),
                fecha: new Date().toISOString().slice(0, 10),
                horaInicio: h.horaInicio || '09:00',
                horaFin: h.horaFin || '10:00',
                titulo: h.asignatura || 'Sesión',
                cursoId
            }));
            edu.cursos = [{
                id: cursoId,
                nombre: 'Importado (Modo Trabajo anterior)',
                notas: 'Migrado desde datos de profesor.',
                participantes,
                sesiones
            }];
            edu.eventosCalendario = sesiones.map(s => ({ ...s, cursoId }));
        }
        d._schemaVersion = 2;
    },

    /** Normaliza ítem de tarea/prioridad (educación o agenda global). */
    normalizeTareaItem(t, defaultFecha) {
        const id = () => Date.now().toString() + Math.random().toString(36).slice(2, 8);
        const hoy = new Date().toISOString().slice(0, 10);
        const titulo = (t.titulo != null && String(t.titulo).trim() !== '') ? String(t.titulo).trim() : String(t.texto || '').trim();
        const pr = t.prioridad;
        const prioridad = pr === 'baja' || pr === 'alta' || pr === 'media' ? pr : 'media';
        return {
            id: t.id || id(),
            titulo: titulo || '(sin título)',
            fecha: t.fecha || defaultFecha || hoy,
            hora: t.hora || '',
            prioridad,
            hecha: !!t.hecha,
            descripcion: t.descripcion || '',
            etiqueta: t.etiqueta || '',
            enlaceSeccion: t.enlaceSeccion || ''
        };
    },

    normalizeAgendaTarea(t) {
        const b = this.normalizeTareaItem(t, t.fecha);
        return {
            ...b,
            esPrioridadDelDia: !!t.esPrioridadDelDia,
            origen: t.origen === 'educacion' ? 'educacion' : 'manual',
            soloLectura: !!t.soloLectura,
            refCursoId: t.refCursoId || null,
            refSesionId: t.refSesionId || null
        };
    },

    _migrateToV3(d) {
        if (!d.agendaTrabajo) d.agendaTrabajo = { version: 1, tareasAgenda: [] };
        if (!Array.isArray(d.agendaTrabajo.tareasAgenda)) d.agendaTrabajo.tareasAgenda = [];
        d.agendaTrabajo.tareasAgenda = d.agendaTrabajo.tareasAgenda.map(t => this.normalizeAgendaTarea(t));
        const edu = d.perfiles && d.perfiles.educacion;
        const hoy = new Date().toISOString().slice(0, 10);
        if (edu && Array.isArray(edu.prioridadesDia)) {
            edu.prioridadesDia = edu.prioridadesDia.map(p => this.normalizeTareaItem(p, p.fecha || hoy));
        }
        if (edu && Array.isArray(edu.cursos)) {
            edu.cursos.forEach(c => {
                (c.participantes || []).forEach(part => {
                    if (!Array.isArray(part.tareas)) part.tareas = [];
                    part.tareas = part.tareas.map(t => this.normalizeTareaItem(t, hoy));
                });
            });
        }
        d._schemaVersion = 3;
    },

    /**
     * v4: agenda por perfil (`perfiles.<slug>.agenda`), `perfilesActivos`, migración desde `agendaTrabajo`.
     * Tareas con origen educacion → educacion; resto → minimarket (heurística documentada en README).
     */
    _migrateToV4(d) {
        if (!d.perfiles) d.perfiles = {};
        if (!d.perfilesActivos || typeof d.perfilesActivos !== 'object') {
            d.perfilesActivos = {};
            (this.PERFILES || []).forEach(p => {
                d.perfilesActivos[p.slug] = true;
            });
        }
        (this.PERFILES || []).forEach(p => {
            if (!d.perfiles[p.slug]) d.perfiles[p.slug] = this._defaultPerfil(p.slug);
            else {
                if (!d.perfiles[p.slug].agenda) d.perfiles[p.slug].agenda = { version: 1, tareasAgenda: [] };
                if (!Array.isArray(d.perfiles[p.slug].agenda.tareasAgenda)) d.perfiles[p.slug].agenda.tareasAgenda = [];
            }
        });
        const global = d.agendaTrabajo && Array.isArray(d.agendaTrabajo.tareasAgenda) ? d.agendaTrabajo.tareasAgenda : [];
        global.forEach(t => {
            const norm = this.normalizeAgendaTarea(t);
            const destSlug = norm.origen === 'educacion' ? 'educacion' : 'minimarket';
            const pd = d.perfiles[destSlug] || this._defaultPerfil(destSlug);
            if (!pd.agenda) pd.agenda = { version: 1, tareasAgenda: [] };
            if (!Array.isArray(pd.agenda.tareasAgenda)) pd.agenda.tareasAgenda = [];
            pd.agenda.tareasAgenda.push(norm);
            d.perfiles[destSlug] = pd;
        });
        d.agendaTrabajo = { version: 1, tareasAgenda: [] };
        d._schemaVersion = 4;
    },

    /** v5: Educación — salas, actividades con horario, planes de unidad/tema. */
    _migrateToV5(d) {
        const edu = d.perfiles && d.perfiles.educacion;
        if (edu) {
            if (!Array.isArray(edu.salas)) edu.salas = [];
            if (!Array.isArray(edu.actividades)) edu.actividades = [];
            if (!Array.isArray(edu.planes)) edu.planes = [];
        }
        d._schemaVersion = 5;
    },

    /** v6: Prevención — tareas, EPP, documentación por obra. */
    _migrateToV6(d) {
        const prev = d.perfiles && d.perfiles.prevencionista;
        if (prev) {
            if (!Array.isArray(prev.tareas)) prev.tareas = [];
            if (!Array.isArray(prev.eppCatalogo)) prev.eppCatalogo = [];
            (prev.clientes || []).forEach(c => {
                if (c.activo === undefined) c.activo = true;
                if (c.notas === undefined) c.notas = '';
                if (c.contacto === undefined) c.contacto = '';
            });
            (prev.obras || []).forEach(o => {
                if (!o.estado) o.estado = 'activa';
                if (o.fechaInicio === undefined) o.fechaInicio = '';
                if (o.fechaFin === undefined) o.fechaFin = '';
                if (o.direccion === undefined) o.direccion = o.ubicacion || '';
                if (!Array.isArray(o.documentos)) o.documentos = [];
                if (!Array.isArray(o.docsRequeridos)) o.docsRequeridos = [];
                if (!Array.isArray(o.eppObra)) o.eppObra = [];
            });
            (prev.tareas || []).forEach(t => {
                if (!t.estado) t.estado = 'pendiente';
                if (!Array.isArray(t.documentos)) t.documentos = [];
                if (!Array.isArray(t.eppTarea)) t.eppTarea = [];
            });
        }
        d._schemaVersion = 6;
    },

    /** v7: Prevención — trabajadores por cliente, EPP por persona en obra, cumplimiento. */
    _migrateToV7(d) {
        const prev = d.perfiles && d.perfiles.prevencionista;
        if (prev) {
            (prev.clientes || []).forEach(c => {
                if (!Array.isArray(c.trabajadores)) c.trabajadores = [];
            });
            (prev.obras || []).forEach(o => {
                if (!Array.isArray(o.trabajadoresIds)) o.trabajadoresIds = [];
                if (!Array.isArray(o.eppCumplimientoPersona)) o.eppCumplimientoPersona = [];
            });
        }
        d._schemaVersion = 7;
    },

    /** v8: Pastelería — inventario de insumos, movimientos, ingredientes en recetas. */
    _migrateToV8(d) {
        const p = d.perfiles && d.perfiles.pasteleria;
        if (p) {
            if (!Array.isArray(p.insumos)) p.insumos = [];
            if (!Array.isArray(p.movimientosInsumos)) p.movimientosInsumos = [];
            (p.recetas || []).forEach(r => {
                if (!Array.isArray(r.ingredientes)) r.ingredientes = [];
                const rp = parseFloat(r.rendimientoPorciones);
                if (r.rendimientoPorciones == null || isNaN(rp) || rp <= 0) r.rendimientoPorciones = 1;
            });
            if ((p.version || 0) < 2) p.version = 2;
        }
        d._schemaVersion = 8;
    },

    /** v9: Cabañas — unidades, ficha cliente, reservas con unidad, evaluación con puntuación, ingresos con reserva. */
    _migrateToV9(d) {
        const p = d.perfiles && d.perfiles.cabanas;
        if (p) {
            if (!Array.isArray(p.unidades)) p.unidades = [];
            if (p.unidades.length === 0) {
                p.unidades.push({
                    id: 'cab-u-' + Date.now().toString(36),
                    nombre: 'Unidad principal',
                    notas: '',
                    fotos: []
                });
            }
            const uid0 = p.unidades[0].id;
            (p.clientes || []).forEach(c => {
                if (c.email === undefined) c.email = '';
                if (c.notas === undefined) c.notas = '';
            });
            (p.reservas || []).forEach(r => {
                if (r.unidadId === undefined || r.unidadId === '') r.unidadId = uid0;
                if (r.notas === undefined) r.notas = '';
                if (r.montoEstimado === undefined) r.montoEstimado = '';
                if (!Array.isArray(r.fotos)) r.fotos = [];
            });
            (p.evaluacionesRetiro || []).forEach(e => {
                if (e.puntuacion === undefined) e.puntuacion = null;
                if (!e.fecha) e.fecha = new Date().toISOString().slice(0, 10);
                if (e.clienteId === undefined) {
                    const res = (p.reservas || []).find(x => x.id === e.reservaId);
                    e.clienteId = res ? res.clienteId : '';
                }
                if (!Array.isArray(e.fotos)) e.fotos = [];
            });
            if (!p.finanzas) p.finanzas = { ingresos: [], gastos: [] };
            (p.finanzas.ingresos || []).forEach(i => {
                if (i.reservaId === undefined) i.reservaId = '';
            });
            (p.unidades || []).forEach(u => {
                if (!Array.isArray(u.fotos)) u.fotos = [];
            });
            if ((p.version || 0) < 2) p.version = 2;
        }
        d._schemaVersion = 9;
    },

    /** v10: Cabañas finanzas — categorías en gastos. */
    _migrateToV10(d) {
        const p = d.perfiles && d.perfiles.cabanas;
        if (p && p.finanzas) {
            if (!Array.isArray(p.finanzas.categoriasGasto)) {
                p.finanzas.categoriasGasto = ['Sin categoría', 'Operación', 'Mantenimiento', 'Insumos', 'Servicios', 'Otros'];
            }
            (p.finanzas.gastos || []).forEach(g => {
                if (!g.categoria || String(g.categoria).trim() === '') g.categoria = 'Sin categoría';
            });
        }
        d._schemaVersion = 10;
    },

    /** v11: Laboratorio — equipos ampliados, visitas con estado/diagnóstico/cierre, finanzas con vínculos. */
    _migrateToV11(d) {
        const lab = d.perfiles && d.perfiles.laboratorio;
        if (lab) {
            (lab.equipos || []).forEach(e => {
                if (e.modelo === undefined) e.modelo = '';
                if (e.clienteSitio === undefined) e.clienteSitio = '';
            });
            (lab.visitas || []).forEach(v => {
                if (v.estado === undefined) v.estado = 'cerrada';
                if (v.tecnico === undefined) v.tecnico = '';
                if (v.hallazgos === undefined) v.hallazgos = v.analisis || '';
                if (v.diagnostico === undefined) v.diagnostico = '';
                if (v.acciones === undefined) v.acciones = '';
                if (!Array.isArray(v.fotos)) v.fotos = [];
                if (v.resumenCierre === undefined) v.resumenCierre = '';
                if (v.condicionAntes === undefined) v.condicionAntes = null;
                if (v.condicionDespues === undefined) v.condicionDespues = null;
                if (v.cerradaEn === undefined) v.cerradaEn = v.estado === 'cerrada' ? (v.fecha || '').slice(0, 10) : '';
            });
            if (!lab.finanzas) lab.finanzas = { ingresos: [], gastos: [], categoriasGasto: [] };
            if (!Array.isArray(lab.finanzas.categoriasGasto)) {
                lab.finanzas.categoriasGasto = ['Sin categoría', 'Repuestos', 'Calibración', 'Servicios', 'Otros'];
            }
            (lab.finanzas.ingresos || []).forEach(i => {
                if (i.visitaId === undefined) i.visitaId = '';
                if (i.equipoId === undefined) i.equipoId = '';
            });
            (lab.finanzas.gastos || []).forEach(g => {
                if (!g.categoria || String(g.categoria).trim() === '') g.categoria = 'Sin categoría';
                if (g.visitaId === undefined) g.visitaId = '';
                if (g.equipoId === undefined) g.equipoId = '';
            });
            if ((lab.version || 0) < 2) lab.version = 2;
        }
        d._schemaVersion = 11;
    },

    /** v12: Perfil Consulta independiente (salud) — pacientes, sesiones, planes, finanzas. */
    _migrateToV12(d) {
        d._schemaVersion = 12;
    },

    /** Normaliza modelo Consulta independiente (salud) en memoria. */
    ensureSaludModel(p) {
        let dirty = false;
        if (!p) return false;
        if (!Array.isArray(p.pacientes)) {
            p.pacientes = [];
            dirty = true;
        }
        p.pacientes.forEach(c => {
            if (c.contacto === undefined) {
                c.contacto = '';
                dirty = true;
            }
            if (c.email === undefined) {
                c.email = '';
                dirty = true;
            }
            if (c.etiquetas === undefined) {
                c.etiquetas = '';
                dirty = true;
            }
        });
        if (!Array.isArray(p.sesiones)) {
            p.sesiones = [];
            dirty = true;
        }
        p.sesiones.forEach(s => {
            if (s.estado === undefined) {
                s.estado = 'programada';
                dirty = true;
            }
            if (s.duracionMin === undefined) {
                s.duracionMin = null;
                dirty = true;
            }
            if (s.monto === undefined) {
                s.monto = '';
                dirty = true;
            }
        });
        if (!Array.isArray(p.planes)) {
            p.planes = [];
            dirty = true;
        }
        p.planes.forEach(pl => {
            if (pl.fechaInicio === undefined) {
                pl.fechaInicio = '';
                dirty = true;
            }
            if (pl.fechaFin === undefined) {
                pl.fechaFin = '';
                dirty = true;
            }
        });
        if (!p.finanzas) {
            p.finanzas = {
                ingresos: [],
                gastos: [],
                categoriasGasto: ['Sin categoría', 'Consulta', 'Control', 'Material', 'Servicios', 'Otros']
            };
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.ingresos)) {
            p.finanzas.ingresos = [];
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.gastos)) {
            p.finanzas.gastos = [];
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.categoriasGasto)) {
            p.finanzas.categoriasGasto = ['Sin categoría', 'Consulta', 'Control', 'Material', 'Servicios', 'Otros'];
            dirty = true;
        }
        (p.finanzas.ingresos || []).forEach(i => {
            if (i.sesionId === undefined) {
                i.sesionId = '';
                dirty = true;
            }
        });
        (p.finanzas.gastos || []).forEach(g => {
            if (!g.categoria || String(g.categoria).trim() === '') {
                g.categoria = 'Sin categoría';
                dirty = true;
            }
        });
        this.ensurePerfilAgenda(p);
        return dirty;
    },

    /** Normaliza modelo Cabañas en memoria. */
    ensureCabanasModel(p) {
        let dirty = false;
        if (!p) return false;
        if (!Array.isArray(p.unidades)) {
            p.unidades = [];
            dirty = true;
        }
        if (p.unidades.length === 0) {
            p.unidades.push({
                id: 'cab-u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                nombre: 'Unidad principal',
                notas: '',
                fotos: []
            });
            dirty = true;
        }
        const defUid = p.unidades[0].id;
        if (!Array.isArray(p.clientes)) {
            p.clientes = [];
            dirty = true;
        }
        p.clientes.forEach(c => {
            if (c.email === undefined) {
                c.email = '';
                dirty = true;
            }
            if (c.notas === undefined) {
                c.notas = '';
                dirty = true;
            }
        });
        if (!Array.isArray(p.reservas)) {
            p.reservas = [];
            dirty = true;
        }
        p.reservas.forEach(r => {
            if (!r.unidadId) {
                r.unidadId = defUid;
                dirty = true;
            }
            if (r.notas === undefined) {
                r.notas = '';
                dirty = true;
            }
            if (r.montoEstimado === undefined) {
                r.montoEstimado = '';
                dirty = true;
            }
            if (!Array.isArray(r.fotos)) {
                r.fotos = [];
                dirty = true;
            }
        });
        if (!Array.isArray(p.evaluacionesRetiro)) {
            p.evaluacionesRetiro = [];
            dirty = true;
        }
        p.evaluacionesRetiro.forEach(e => {
            if (e.puntuacion === undefined) {
                e.puntuacion = null;
                dirty = true;
            }
            if (!e.fecha) {
                e.fecha = new Date().toISOString().slice(0, 10);
                dirty = true;
            }
            if (e.clienteId === undefined) {
                const res = (p.reservas || []).find(x => x.id === e.reservaId);
                e.clienteId = res ? res.clienteId : '';
                dirty = true;
            }
            if (!Array.isArray(e.fotos)) {
                e.fotos = [];
                dirty = true;
            }
        });
        if (!p.finanzas) {
            p.finanzas = {
                ingresos: [],
                gastos: [],
                categoriasGasto: ['Sin categoría', 'Operación', 'Mantenimiento', 'Insumos', 'Servicios', 'Otros']
            };
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.ingresos)) {
            p.finanzas.ingresos = [];
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.gastos)) {
            p.finanzas.gastos = [];
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.categoriasGasto)) {
            p.finanzas.categoriasGasto = ['Sin categoría', 'Operación', 'Mantenimiento', 'Insumos', 'Servicios', 'Otros'];
            dirty = true;
        }
        p.finanzas.ingresos.forEach(i => {
            if (i.reservaId === undefined) {
                i.reservaId = '';
                dirty = true;
            }
        });
        p.finanzas.gastos.forEach(g => {
            if (!g.categoria || String(g.categoria).trim() === '') {
                g.categoria = 'Sin categoría';
                dirty = true;
            }
        });
        p.unidades.forEach(u => {
            if (!Array.isArray(u.fotos)) {
                u.fotos = [];
                dirty = true;
            }
        });
        this.ensurePerfilAgenda(p);
        return dirty;
    },

    /** Normaliza modelo Laboratorio en memoria. */
    ensureLaboratorioModel(p) {
        let dirty = false;
        if (!p) return false;
        if (!Array.isArray(p.equipos)) {
            p.equipos = [];
            dirty = true;
        }
        p.equipos.forEach(e => {
            if (e.modelo === undefined) {
                e.modelo = '';
                dirty = true;
            }
            if (e.clienteSitio === undefined) {
                e.clienteSitio = '';
                dirty = true;
            }
        });
        if (!Array.isArray(p.visitas)) {
            p.visitas = [];
            dirty = true;
        }
        p.visitas.forEach(v => {
            if (v.estado === undefined) {
                v.estado = 'cerrada';
                dirty = true;
            }
            if (v.tecnico === undefined) {
                v.tecnico = '';
                dirty = true;
            }
            if (v.hallazgos === undefined) {
                v.hallazgos = v.analisis || '';
                dirty = true;
            }
            if (v.diagnostico === undefined) {
                v.diagnostico = '';
                dirty = true;
            }
            if (v.acciones === undefined) {
                v.acciones = '';
                dirty = true;
            }
            if (!Array.isArray(v.fotos)) {
                v.fotos = [];
                dirty = true;
            }
            if (v.resumenCierre === undefined) {
                v.resumenCierre = '';
                dirty = true;
            }
            if (v.condicionAntes === undefined) {
                v.condicionAntes = null;
                dirty = true;
            }
            if (v.condicionDespues === undefined) {
                v.condicionDespues = null;
                dirty = true;
            }
            if (v.cerradaEn === undefined) {
                v.cerradaEn = v.estado === 'cerrada' ? (v.fecha || '').slice(0, 10) : '';
                dirty = true;
            }
        });
        if (!p.finanzas) {
            p.finanzas = {
                ingresos: [],
                gastos: [],
                categoriasGasto: ['Sin categoría', 'Repuestos', 'Calibración', 'Servicios', 'Otros']
            };
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.ingresos)) {
            p.finanzas.ingresos = [];
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.gastos)) {
            p.finanzas.gastos = [];
            dirty = true;
        }
        if (!Array.isArray(p.finanzas.categoriasGasto)) {
            p.finanzas.categoriasGasto = ['Sin categoría', 'Repuestos', 'Calibración', 'Servicios', 'Otros'];
            dirty = true;
        }
        p.finanzas.ingresos.forEach(i => {
            if (i.visitaId === undefined) {
                i.visitaId = '';
                dirty = true;
            }
            if (i.equipoId === undefined) {
                i.equipoId = '';
                dirty = true;
            }
        });
        p.finanzas.gastos.forEach(g => {
            if (!g.categoria || String(g.categoria).trim() === '') {
                g.categoria = 'Sin categoría';
                dirty = true;
            }
            if (g.visitaId === undefined) {
                g.visitaId = '';
                dirty = true;
            }
            if (g.equipoId === undefined) {
                g.equipoId = '';
                dirty = true;
            }
        });
        this.ensurePerfilAgenda(p);
        return dirty;
    },

    /** Normaliza modelo Pastelería en memoria (sin forzar persistir salvo cambios). */
    ensurePasteleriaModel(p) {
        let dirty = false;
        if (!p) return false;
        if (!Array.isArray(p.insumos)) { p.insumos = []; dirty = true; }
        if (!Array.isArray(p.movimientosInsumos)) { p.movimientosInsumos = []; dirty = true; }
        (p.recetas || []).forEach(r => {
            if (!Array.isArray(r.ingredientes)) { r.ingredientes = []; dirty = true; }
            const rp = parseFloat(r.rendimientoPorciones);
            if (r.rendimientoPorciones == null || isNaN(rp) || rp <= 0) { r.rendimientoPorciones = 1; dirty = true; }
        });
        this.ensurePerfilAgenda(p);
        return dirty;
    },

    /** Garantiza `d.agenda` en memoria (sin persistir). */
    ensurePerfilAgenda(d) {
        if (!d.agenda) d.agenda = { version: 1, tareasAgenda: [] };
        if (!Array.isArray(d.agenda.tareasAgenda)) d.agenda.tareasAgenda = [];
        return d.agenda;
    },

    /**
     * Completa el modelo Minimarket (Prompt 6) sin borrar datos existentes.
     * @returns {boolean} true si se aplicó algún valor por defecto (para persistir).
     */
    ensureMinimarketModel(d) {
        let dirty = false;
        if (!d.cajasTurno) { d.cajasTurno = []; dirty = true; }
        if (!d.inventario) { d.inventario = { productos: [], movimientos: [] }; dirty = true; }
        if (!Array.isArray(d.inventario.productos)) { d.inventario.productos = []; dirty = true; }
        if (!Array.isArray(d.inventario.movimientos)) { d.inventario.movimientos = []; dirty = true; }
        if (!d.finanzas) { d.finanzas = { ingresos: [], gastos: [], categorias: ['Operación', 'Insumos', 'Servicios', 'Otros'] }; dirty = true; }
        if (!Array.isArray(d.finanzas.ingresos)) { d.finanzas.ingresos = []; dirty = true; }
        if (!Array.isArray(d.finanzas.gastos)) { d.finanzas.gastos = []; dirty = true; }
        if (!Array.isArray(d.finanzas.categorias) || d.finanzas.categorias.length === 0) {
            d.finanzas.categorias = ['Operación', 'Insumos', 'Servicios', 'Otros'];
            dirty = true;
        }
        if (!Array.isArray(d.finanzas.activos)) { d.finanzas.activos = []; dirty = true; }
        if (!Array.isArray(d.finanzas.pasivos)) { d.finanzas.pasivos = []; dirty = true; }
        if (!Array.isArray(d.finanzas.pagosProgramados)) { d.finanzas.pagosProgramados = []; dirty = true; }
        if (!d.finanzas.mesVista || !/^\d{4}-\d{2}$/.test(String(d.finanzas.mesVista))) {
            d.finanzas.mesVista = new Date().toISOString().slice(0, 7);
            dirty = true;
        }
        if (!Array.isArray(d.proveedores)) { d.proveedores = []; dirty = true; }
        if (!Array.isArray(d.recepciones)) { d.recepciones = []; dirty = true; }
        if (!d.precios || typeof d.precios !== 'object') {
            d.precios = { comisionMaquinasPct: 0, margenGlobalPct: 25, productosMargen: {} };
            dirty = true;
        } else {
            if (typeof d.precios.comisionMaquinasPct !== 'number' || Number.isNaN(d.precios.comisionMaquinasPct)) {
                d.precios.comisionMaquinasPct = parseFloat(d.precios.comisionMaquinasPct) || 0;
                dirty = true;
            }
            if (typeof d.precios.margenGlobalPct !== 'number' || Number.isNaN(d.precios.margenGlobalPct)) {
                d.precios.margenGlobalPct = parseFloat(d.precios.margenGlobalPct) || 25;
                dirty = true;
            }
            if (!d.precios.productosMargen || typeof d.precios.productosMargen !== 'object') {
                d.precios.productosMargen = {};
                dirty = true;
            }
        }
        if (!Array.isArray(d.facturas)) { d.facturas = []; dirty = true; }
        if (!d.siiReferencia || typeof d.siiReferencia !== 'object') {
            d.siiReferencia = { tasaIVA: 19, regimen: '', factorEstimacionIVA: 0.19, mostrarEstimacionIVA: true };
            dirty = true;
        } else {
            if (typeof d.siiReferencia.tasaIVA !== 'number' || Number.isNaN(d.siiReferencia.tasaIVA)) {
                d.siiReferencia.tasaIVA = parseFloat(d.siiReferencia.tasaIVA) || 19;
                dirty = true;
            }
            if (typeof d.siiReferencia.factorEstimacionIVA !== 'number' || Number.isNaN(d.siiReferencia.factorEstimacionIVA)) {
                d.siiReferencia.factorEstimacionIVA = parseFloat(d.siiReferencia.factorEstimacionIVA) || (d.siiReferencia.tasaIVA / 100);
                dirty = true;
            }
            if (typeof d.siiReferencia.regimen !== 'string') { d.siiReferencia.regimen = ''; dirty = true; }
            if (typeof d.siiReferencia.mostrarEstimacionIVA !== 'boolean') { d.siiReferencia.mostrarEstimacionIVA = true; dirty = true; }
        }
        if (!d.finanzas.filtroFacturasTipo || !['todos', 'compra', 'venta'].includes(d.finanzas.filtroFacturasTipo)) {
            d.finanzas.filtroFacturasTipo = 'todos';
            dirty = true;
        }
        this.ensurePerfilAgenda(d);
        return dirty;
    },

    getPerfilesActivosMap() {
        const d = this.getData();
        if (!d.perfilesActivos || typeof d.perfilesActivos !== 'object') {
            d.perfilesActivos = {};
            (this.PERFILES || []).forEach(p => {
                d.perfilesActivos[p.slug] = true;
            });
            this.saveData(d);
        }
        return d.perfilesActivos;
    },

    setPerfilActivo(slug, activo) {
        const d = this.getData();
        if (!d.perfilesActivos) d.perfilesActivos = {};
        d.perfilesActivos[slug] = !!activo;
        this.saveData(d);
    },

    isPerfilActivo(slug) {
        const d = this.getData();
        const pa = d.perfilesActivos;
        if (!pa || pa[slug] === undefined) return true;
        return !!pa[slug];
    },

    getSlugsActivos() {
        return (this.PERFILES || []).map(p => p.slug).filter(s => this.isPerfilActivo(s));
    },

    /** Mapea área legada del perfil Persona → slug de perfil v2 (si aplica). */
    areaLegacyToPerfilSlug(area) {
        const map = {
            'Educación': 'educacion',
            'Administración/Gestión': 'administrativo',
            'Servicios/Comercial': 'minimarket',
            'Salud': 'prevencionista',
            'Tecnología': 'laboratorio',
            'Logística/Operaciones': 'cabanas',
            'Consultoría/Estratégica': 'administrativo'
        };
        return map[area] || null;
    },

    getPerfilData(slug) {
        const d = this.getData();
        if (!d.perfiles) d.perfiles = {};
        if (!d.perfiles[slug]) {
            d.perfiles[slug] = this._defaultPerfil(slug);
            this.saveData(d);
        }
        const p = d.perfiles[slug];
        if (slug === 'minimarket' && this.ensureMinimarketModel(p)) this.saveData(d);
        if (slug === 'pasteleria' && this.ensurePasteleriaModel(p)) this.saveData(d);
        if (slug === 'cabanas' && this.ensureCabanasModel(p)) this.saveData(d);
        if (slug === 'laboratorio' && this.ensureLaboratorioModel(p)) this.saveData(d);
        if (slug === 'salud' && this.ensureSaludModel(p)) this.saveData(d);
        return p;
    },

    /** Persiste el objeto ya mutado en memoria (misma referencia que devolvió getPerfilData). No re-leer con get antes de asignar. */
    savePerfilData(slug, data) {
        const d = this.getData();
        if (!d.perfiles) d.perfiles = {};
        d.perfiles[slug] = data;
        this.saveData(d);
    },

    getBarbero() {
        const d = this.getData();
        if (!d.barbero) d.barbero = {
            horariosDisponibles: [],
            citas: [],
            finanzas: { ingresos: [], gastos: [], balances: [] },
            clientes: [],
            ventas: { productos: [] } // { id, nombre, precio, stock, unidad }
        };
        if (!d.barbero.ventas) d.barbero.ventas = { productos: [] };
        return d.barbero;
    },
    getKinesiologo() {
        const d = this.getData();
        if (!d.kinesiologo) d.kinesiologo = {
            citas: [],
            pacientes: [],
            recordatorios: [],
            horariosDisponibles: [],
            finanzas: { ingresos: [], gastos: [] },
            contactos: [],
            ventas: { productos: [] }
        };
        if (!d.kinesiologo.horariosDisponibles) d.kinesiologo.horariosDisponibles = [];
        if (!d.kinesiologo.ventas) d.kinesiologo.ventas = { productos: [] };
        if (!d.kinesiologo.finanzas) d.kinesiologo.finanzas = { ingresos: [], gastos: [] };
        if (!d.kinesiologo.contactos) d.kinesiologo.contactos = [];
        return d.kinesiologo;
    },
    getProfesor() {
        const d = this.getData();
        if (!d.profesor) d.profesor = {
            horario: [],
            alumnos: [],
            avances: [],
            ventas: { productos: [] }
        };
        if (!d.profesor.ventas) d.profesor.ventas = { productos: [] };
        return d.profesor;
    },

    /** Datos genéricos por área (administracion, tecnologia, logistica, consultoria) */
    _defaultAreaData(slug) {
        const bases = {
            administracion: {
                reportes: [],
                documentos: [],
                personal: [],
                horarios: [],
                cargos: [],
                procesos: [],
                contactos: [],
                finanzas: { ingresos: [], gastos: [] }
            },
            tecnologia: {
                proyectos: [],
                timing: [],
                contactos: [],
                ventas: { productos: [] }
            },
            logistica: {
                entregas: [],
                inventario: [],
                rutas: [],
                horarios: [],
                contactos: []
            },
            consultoria: {
                pipeline: { etapas: ['Prospecto', 'Reunión', 'Propuesta', 'Cierre'], items: [] },
                kpi: [],
                propuestas: [],
                contactos: []
            }
        };
        return bases[slug] ? JSON.parse(JSON.stringify(bases[slug])) : {};
    },
    getAreaData(slug) {
        const d = this.getData();
        if (!d.areas) d.areas = {};
        if (!d.areas[slug]) d.areas[slug] = this._defaultAreaData(slug);
        return d.areas[slug];
    },
    saveAreaData(slug, data) {
        const d = this.getData();
        if (!d.areas) d.areas = {};
        d.areas[slug] = data;
        this.saveData(d);
    },

    saveBarbero(barbero) {
        const d = this.getData();
        d.barbero = barbero;
        this.saveData(d);
    },
    saveKinesiologo(k) {
        const d = this.getData();
        d.kinesiologo = k;
        this.saveData(d);
    },
    saveProfesor(p) {
        const d = this.getData();
        d.profesor = p;
        this.saveData(d);
    },

    /** Ingreso neto total desde áreas con finanzas (por ahora solo barbero/servicios). */
    getIngresoNetoTrabajo() {
        const barbero = this.getBarbero();
        const fin = barbero.finanzas || {};
        const ingB = (fin.ingresos || []).reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        const gasB = (fin.gastos || []).reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
        let net = ingB - gasB;
        try {
            const mm = this.getPerfilData('minimarket');
            const fm = mm.finanzas || {};
            const ingM = (fm.ingresos || []).reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
            const gasM = (fm.gastos || []).reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
            net += ingM - gasM;
        } catch (e) {}
        return net;
    },

    /** Si el usuario tiene puente financiero activo, escribe ingreso neto en datos de Persona (Finanzas). */
    syncIngresoNetoToPersonal() {
        try {
            const session = JSON.parse(localStorage.getItem(this.KEY_SESSION) || '{}');
            const email = session.email;
            if (!email) return;
            const key = 'plataforma_data_' + email;
            const raw = localStorage.getItem(key);
            const data = raw ? JSON.parse(raw) : null;
            if (!data || !data.config || !data.config.puenteFinanciero) return;
            const net = this.getIngresoNetoTrabajo();
            if (!data.finanzas) data.finanzas = { ingresos: [], gastos: [], deudas: [], activos: [], balances: [] };
            if (!Array.isArray(data.finanzas.ingresos)) data.finanzas.ingresos = [];
            const hoy = new Date().toISOString().slice(0, 10);
            const mes = hoy.slice(0, 7);
            data.finanzas.ingresos = data.finanzas.ingresos.filter(i => !(i.descripcion === 'Ingreso Laboral Neto' && (i.fecha || '').slice(0, 7) === mes));
            data.finanzas.ingresos.push({
                descripcion: 'Ingreso Laboral Neto',
                monto: net,
                fecha: hoy,
                categoria: 'trabajo',
                origenPuente: true
            });
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {}
    }
};
