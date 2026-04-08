/**
 * Pastelería — stock desde movimientos, costos por receta (insumos + manual).
 * Depende de TrabajoStorage.
 */
const TrabajoPasteleria = {
    ensureModel(d) {
        if (!d) return;
        if (!Array.isArray(d.insumos)) d.insumos = [];
        if (!Array.isArray(d.movimientosInsumos)) d.movimientosInsumos = [];
        if (!d.calculadora || typeof d.calculadora !== 'object') {
            d.calculadora = { costosFijos: 0, costosVariables: 0, indirectos: 0, margenPct: 30, unidadesLote: 1 };
        }
        (d.recetas || []).forEach(r => {
            if (!Array.isArray(r.ingredientes)) r.ingredientes = [];
            const rp = parseFloat(r.rendimientoPorciones);
            if (r.rendimientoPorciones == null || isNaN(rp) || rp <= 0) r.rendimientoPorciones = 1;
        });
    },

    stockInsumo(d, insumoId) {
        this.ensureModel(d);
        let s = 0;
        (d.movimientosInsumos || []).filter(m => m.insumoId === insumoId).forEach(m => {
            const c = parseFloat(m.cantidad) || 0;
            s += m.tipo === 'entrada' ? c : -c;
        });
        return s;
    },

    tieneMovimientos(d, insumoId) {
        return (d.movimientosInsumos || []).some(m => m.insumoId === insumoId);
    },

    costoLineaIngrediente(d, ing) {
        this.ensureModel(d);
        const cant = parseFloat(ing.cantidad) || 0;
        const modoManual = ing.origen === 'man' || ing.origen === 'manual';
        if (!modoManual && ing.insumoId) {
            const ins = (d.insumos || []).find(x => x.id === ing.insumoId);
            const cu = ins ? (parseFloat(ins.costoUnitario) || 0) : 0;
            return { subtotal: cant * cu, fuente: ins ? 'inventario' : 'sin-insumo' };
        }
        const cuM = parseFloat(ing.costoManual);
        const unit = !isNaN(cuM) && cuM >= 0 ? cuM : 0;
        return { subtotal: cant * unit, fuente: 'manual' };
    },

    labelIngrediente(d, ing) {
        const modoManual = ing.origen === 'man' || ing.origen === 'manual';
        if (modoManual) return ing.nombreManual || 'Manual';
        if (ing.insumoId) {
            const ins = (d.insumos || []).find(x => x.id === ing.insumoId);
            return ins ? ins.nombre : '—';
        }
        return ing.nombreManual || 'Manual';
    },

    costoTotalReceta(d, r) {
        if (!r || !Array.isArray(r.ingredientes)) return 0;
        let t = 0;
        r.ingredientes.forEach(ing => { t += this.costoLineaIngrediente(d, ing).subtotal; });
        return t;
    },

    /**
     * @param {string} slug
     * @param {{ insumoId: string, tipo: 'entrada'|'salida', cantidad: number, fecha?: string, nota?: string, subtipo?: string, recetaId?: string|null, costoUnitarioCompra?: string|number }} payload
     */
    addMovimiento(slug, payload) {
        const d = TrabajoStorage.getPerfilData(slug);
        this.ensureModel(d);
        const { insumoId, tipo, cantidad, fecha, nota, subtipo, recetaId, costoUnitarioCompra } = payload;
        const ins = (d.insumos || []).find(x => x.id === insumoId);
        if (!ins) return { ok: false, msg: 'Insumo no encontrado' };
        const c = parseFloat(cantidad) || 0;
        if (c <= 0) return { ok: false, msg: 'La cantidad debe ser mayor a 0' };
        if (tipo === 'salida') {
            const st = this.stockInsumo(d, insumoId);
            if (c > st + 1e-9) return { ok: false, msg: 'Stock insuficiente' };
        }
        const mov = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            insumoId,
            tipo,
            cantidad: c,
            fecha: fecha || new Date().toISOString().slice(0, 10),
            nota: nota || '',
            subtipo: subtipo || '',
            recetaId: recetaId || null
        };
        if (tipo === 'entrada' && costoUnitarioCompra != null && String(costoUnitarioCompra).trim() !== '') {
            const cc = parseFloat(costoUnitarioCompra);
            if (!isNaN(cc) && cc >= 0) {
                mov.costoUnitarioCompra = cc;
                const oldStock = this.stockInsumo(d, insumoId);
                const oldCost = parseFloat(ins.costoUnitario) || 0;
                const newStock = oldStock + c;
                if (newStock > 0) {
                    ins.costoUnitario = (oldStock * oldCost + c * cc) / newStock;
                }
            }
        }
        d.movimientosInsumos.push(mov);
        TrabajoStorage.savePerfilData(slug, d);
        return { ok: true };
    }
};
