/* ============================================
   HELP - Ayuda por sección (?)
   Descripción y paso a paso por pantalla
   ============================================ */

const Help = {
    CONTENT: {
        dashboard: {
            title: 'Inicio (Dashboard)',
            description: 'Tu centro de control del día: progreso, actividades, hábitos y acceso rápido a todas las herramientas.',
            steps: [
                'Usa la navegación por fecha para ver otro día.',
                'Revisa las actividades del día (calendario) y márcalas al completarlas.',
                'Marca tus hábitos diarios en el tracker.',
                'Añade prioridades del día y ciérralo cuando termines.',
                'Entra a cada herramienta desde la cuadrícula inferior.'
            ]
        },
        habits: {
            title: 'Hábitos',
            description: 'Define y sigue hábitos diarios o semanales. Puedes ver progreso por día o por aspecto (físico, mental, etc.).',
            steps: [
                'Crea hábitos con "+ Hábito" (nombre, icono, frecuencia).',
                'Marca el cumplimiento cada día en la vista de tracker.',
                'Usa las pestañas para cambiar entre vista por día o por hábito.'
            ]
        },
        finance: {
            title: 'Finanzas',
            description: 'Lleva ingresos, gastos, deudas y ahorros. El balance del mes se calcula automáticamente.',
            steps: [
                'Agrega ingresos y gastos con "+ Agregar".',
                'Registra deudas para ver cuotas y plazos (usa "Calcular cuotas" si aplica).',
                'Revisa el resumen y el balance en la parte superior.'
            ]
        },
        calendar: {
            title: 'Calendario',
            description: 'Eventos y recordatorios: citas, clases, medicación, estudios. Se muestran en el inicio del día.',
            steps: [
                'Crea eventos con "+ Evento" (título, fecha, hora, opcional: módulo de origen).',
                'Los eventos de salud o estudios aparecen también en el dashboard como "Tomar hoy" o "Clases hoy".',
                'Puedes marcar eventos como realizados desde el inicio o desde aquí.'
            ]
        },
        gratitud: {
            title: 'Gratitud',
            description: 'Anota brevemente aquello por lo que estás agradecido. Aparece un resumen en el inicio.',
            steps: [
                'Escribe en el campo de texto y pulsa "Añadir".',
                'Puedes usar los botones rápidos (ej. "Mi familia") para añadir con un clic.',
                'Las entradas se listan por fecha; en el inicio ves las últimas.'
            ]
        },
        foda: {
            title: 'Análisis FODA',
            description: 'Fortalezas, Oportunidades, Debilidades y Amenazas. Organiza ideas en cada cuadrante.',
            steps: [
                'Añade ítems en Fortalezas, Debilidades, Oportunidades y Amenazas.',
                'Puedes editar o eliminar cada ítem. Úsalo para planificación personal o profesional.'
            ]
        },
        salud: {
            title: 'Salud',
            description: 'Registro de medicación, citas y datos de salud. Los recordatorios pueden aparecer en el calendario.',
            steps: [
                'Registra medicación y horarios para ver "Tomar hoy" en el inicio.',
                'Añade citas médicas o notas que quieras tener centralizadas.'
            ]
        },
        biografia: {
            title: 'Biografía',
            description: 'Tu historia o notas personales por etapas o temas. Solo tú las ves.',
            steps: [
                'Crea secciones o entradas con el botón correspondiente.',
                'Úsalo como diario largo plazo o autobiografía por capítulos.'
            ]
        },
        studies: {
            title: 'Estudios',
            description: 'Ramos, notas y fechas de pruebas. Las clases o pruebas del día pueden mostrarse en el inicio.',
            steps: [
                'Crea ramos y añade fechas de pruebas o clases.',
                'Los eventos vinculados a estudios aparecen en el dashboard en "Clases / Pruebas hoy".'
            ]
        },
        exercises: {
            title: 'Ejercicios',
            description: 'Sesiones de entrenamiento: tipo, duración, notas. Lleva un historial de tu actividad física.',
            steps: [
                'Crea una sesión con "+ Nueva Sesión".',
                'Indica tipo, duración y opcionalmente notas.',
                'Revisa el historial en la lista de sesiones.'
            ]
        },
        summary: {
            title: 'Resumen General',
            description: 'Vista consolidada de tus datos: finanzas, eventos próximos y resúmenes por módulo.',
            steps: [
                'Revisa los bloques de cada sección.',
                'Usa los enlaces para ir a cada módulo y detallar.'
            ]
        },
        settings: {
            title: 'Configuración',
            description: 'Ajustes de perfil, módulos activos y opciones de la cuenta.',
            steps: [
                'Activa o desactiva módulos (gratitud, FODA, etc.) según lo que uses.',
                'Si tienes rol manager, aquí puedes gestionar usuarios.'
            ]
        }
    },

    get(key) {
        return this.CONTENT[key] || {
            title: 'Ayuda',
            description: 'Aquí puedes consultar qué hacer en esta pantalla.',
            steps: []
        };
    },

    button(helpKey) {
        if (!helpKey) return '';
        return `<button type="button" class="btn btn-icon help-btn" data-help-key="${helpKey}" title="Ayuda sobre esta sección" aria-label="Ayuda">?</button>`;
    },

    show(helpKey) {
        const data = this.get(helpKey);
        const stepsHtml = (data.steps || []).length > 0
            ? `<ol class="help-steps">${data.steps.map(s => `<li>${UI.esc(s)}</li>`).join('')}</ol>`
            : '';
        const html = `
            <h3 class="modal-title">${UI.esc(data.title)}</h3>
            <p class="text-secondary mb-md">${UI.esc(data.description)}</p>
            ${stepsHtml}
        `;
        UI.showModal(html, { size: 'sm' });
    }
};

// Delegación: clic en cualquier botón .help-btn
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.help-btn');
        if (btn && btn.dataset.helpKey && typeof Help !== 'undefined') {
            Help.show(btn.dataset.helpKey);
        }
    });
});
