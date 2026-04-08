/**
 * Capa fina sobre `Storage` — API estable para páginas; migraciones siguen en `storage.js`.
 * @see Storage.getUserData / Storage.saveUserData
 */

var DataService = {
    /**
     * @param {string} email
     * @returns {Object|null} PersonaUserData (ver data-contract.js)
     */
    getUserData(email) {
        return Storage.getUserData(email);
    },

    /**
     * @param {string} email
     * @param {Object} data
     * @returns {boolean}
     */
    saveUserData(email, data) {
        return Storage.saveUserData(email, data);
    }
};
