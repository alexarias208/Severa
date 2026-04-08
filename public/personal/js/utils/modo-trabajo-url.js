/**
 * Resuelve la URL de entrada de Modo Trabajo según dónde esté cargada la app Persona.
 * Deploy definitivo (mismo origen): /trabajo/index.html
 */
function resolveModoTrabajoIndexUrl() {
    // Deploy definitivo: Persona + Trabajo viven en el mismo origen.
    // Usar ruta absoluta para evitar depender de ../ en distintos hosts/rewrites.
    return '/trabajo/index.html';
}
