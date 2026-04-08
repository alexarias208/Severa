/**
 * Helpers puros para finanzas Minimarket (Modo Trabajo).
 * No depende de personal/js/pages/finance.js.
 */
const MMFinance = {
    monthKeyFromDate(iso) {
        return (iso || '').slice(0, 7);
    },

    sumMovimientosMes(items, yyyymm) {
        return (items || []).filter(x => this.monthKeyFromDate(x.fecha) === yyyymm)
            .reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
    },

    sumAll(items) {
        return (items || []).reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
    },

    byCategory(items, yyyymm) {
        const map = {};
        (items || []).forEach(x => {
            if (yyyymm && this.monthKeyFromDate(x.fecha) !== yyyymm) return;
            const c = x.categoria || 'Otros';
            map[c] = (map[c] || 0) + (parseFloat(x.monto) || 0);
        });
        return map;
    },

    topCategories(map, n) {
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n || 5);
    },

    totalActivos(activos) {
        return (activos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0);
    },

    totalPasivos(pasivos) {
        return (pasivos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0);
    },

    /**
     * Precio sugerido: costo × (1 + comisión%) × (1 + margen%).
     */
    precioSugerido(costo, comisionPct, margenPct) {
        const c = parseFloat(costo) || 0;
        const co = parseFloat(comisionPct) || 0;
        const m = parseFloat(margenPct) || 0;
        return c * (1 + co / 100) * (1 + m / 100);
    },

    margenEfectivoProducto(productId, precios, producto) {
        const g = parseFloat(precios?.margenGlobalPct);
        const global = Number.isFinite(g) ? g : 25;
        if (productId && precios?.productosMargen && precios.productosMargen[productId] != null && String(precios.productosMargen[productId]).trim() !== '') {
            const v = parseFloat(precios.productosMargen[productId]);
            if (Number.isFinite(v)) return v;
        }
        if (producto?.margenPct != null && String(producto.margenPct).trim() !== '') {
            const v = parseFloat(producto.margenPct);
            if (Number.isFinite(v)) return v;
        }
        return global;
    },

    /** Total línea factura: neto + exento (montos simples referenciales). */
    facturaMontoTotal(f) {
        return (parseFloat(f?.montoNeto) || 0) + (parseFloat(f?.montoExento) || 0);
    },

    facturasEnMes(facturas, yyyymm, filtroTipo) {
        let list = (facturas || []).filter(f => this.monthKeyFromDate(f.fecha) === yyyymm);
        if (filtroTipo === 'compra' || filtroTipo === 'venta') list = list.filter(f => f.tipo === filtroTipo);
        return list;
    },

    totalesFacturasMes(facturas, yyyymm) {
        const list = this.facturasEnMes(facturas, yyyymm, 'todos');
        let compras = 0;
        let ventas = 0;
        list.forEach(f => {
            const t = this.facturaMontoTotal(f);
            if (f.tipo === 'compra') compras += t;
            else if (f.tipo === 'venta') ventas += t;
        });
        return { compras, ventas, nCompras: list.filter(f => f.tipo === 'compra').length, nVentas: list.filter(f => f.tipo === 'venta').length };
    },

    /**
     * Ventas de caja en el mes: turnos con ingresos > 0 + ingresos en finanzas con origenCaja === 'pos'.
     */
    cajaVentasMes(cajasTurno, finanzas, yyyymm) {
        const enMes = (cajasTurno || []).filter(c => this.monthKeyFromDate(c.fecha) === yyyymm);
        const conIngreso = enMes.filter(c => (parseFloat(c.ingresos) || 0) > 0);
        let montoVendido = conIngreso.reduce((s, c) => s + (parseFloat(c.ingresos) || 0), 0);
        let transacciones = conIngreso.length;
        const posIng = (finanzas?.ingresos || []).filter(i => i.origenCaja === 'pos' && this.monthKeyFromDate(i.fecha) === yyyymm);
        montoVendido += posIng.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
        transacciones += posIng.length;
        return { transacciones, montoVendido };
    }
};
