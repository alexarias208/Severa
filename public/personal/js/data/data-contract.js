/**
 * @fileoverview Contrato de datos Persona + Modo Trabajo (nombres alineados a storage.js / trabajo/js/storage.js).
 * Supabase (fase posterior, tentativo): persona_user_data (JSON por usuario), trabajo_workspace (JSON trabajo_data),
 * o tablas hijas normalizadas por entidad.
 * IDs legacy: strings arbitrarios; nuevos pueden usar crypto.randomUUID() si está disponible.
 */

var DataContract = {
    VERSION: '2026-04-02'
};

/**
 * @typedef {Object} PersonaUserData
 * @property {Object} finanzas — ingresos, gastos, deudas, activos, balances
 * @property {Object} calendario — eventos[], mostrarTrabajo
 * @property {Array<Object>} prioridadesDia
 * @property {Object} config — p.ej. puenteFinanciero
 */

/**
 * @typedef {Object} CalendarioEventoPersona
 * @property {string} id
 * @property {string} titulo
 * @property {string} fecha YYYY-MM-DD
 * @property {string} [hora]
 * @property {string} [tipo]
 * @property {boolean} [completado]
 */

/**
 * @typedef {Object} TrabajoRootData
 * @property {number} [_schemaVersion]
 * @property {Object<string, Object>} perfiles — slug → datos de perfil
 */

/**
 * @typedef {Object} TrabajoAgendaTarea
 * @property {string} id
 * @property {string} titulo
 * @property {string} fecha YYYY-MM-DD
 * @property {boolean} [hecha]
 * @property {string} [hora]
 */

/**
 * Cabañas: reserva.clienteId → clientes[].id
 * @typedef {Object} CabanasReserva
 * @property {string} id
 * @property {string} clienteId
 * @property {string} desde
 * @property {string} hasta
 */
