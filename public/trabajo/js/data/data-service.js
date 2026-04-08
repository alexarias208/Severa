/**
 * Capa fina sobre `TrabajoStorage` — sin duplicar `_migrateData` ni lógica de versión.
 */

var TrabajoDataService = {
    getData() {
        return TrabajoStorage.getData();
    },

    saveData(data) {
        TrabajoStorage.saveData(data);
    },

    getPerfilData(slug) {
        return TrabajoStorage.getPerfilData(slug);
    },

    savePerfilData(slug, data) {
        TrabajoStorage.savePerfilData(slug, data);
    }
};
