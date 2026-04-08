/* ============================================
   EXPORT UTILS - Excel/CSV Export with SheetJS
   ============================================ */

const ExportUtils = {
    toExcel(data, filename = 'export.xlsx') {
        if (typeof XLSX === 'undefined') {
            UI.toast('Librería de exportación no disponible', 'error');
            return;
        }
        const wb = XLSX.utils.book_new();

        if (Array.isArray(data)) {
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Datos');
        } else {
            // data is an object with sheet names as keys
            for (const [sheetName, sheetData] of Object.entries(data)) {
                if (Array.isArray(sheetData) && sheetData.length > 0) {
                    const ws = XLSX.utils.json_to_sheet(sheetData);
                    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
                }
            }
        }

        XLSX.writeFile(wb, filename);
        UI.toast('Archivo exportado exitosamente', 'success');
    },

    toCSV(data, filename = 'export.csv') {
        if (!Array.isArray(data) || data.length === 0) {
            UI.toast('No hay datos para exportar', 'warning');
            return;
        }
        const headers = Object.keys(data[0]);
        const rows = data.map(row =>
            headers.map(h => {
                let val = row[h] ?? '';
                val = String(val).replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        );
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        this._download(blob, filename);
    },

    _buildSheets(userData) {
        if (!userData) return {};
        const sheets = {};

        // Finanzas
        if (userData.finanzas) {
            if (userData.finanzas.ingresos?.length) {
                sheets['Ingresos'] = userData.finanzas.ingresos.map(i => ({
                    Descripción: i.descripcion, Monto: i.monto, Fecha: i.fecha, Categoría: i.categoria
                }));
            }
            if (userData.finanzas.gastos?.length) {
                sheets['Gastos'] = userData.finanzas.gastos.map(g => ({
                    Descripción: g.descripcion, Monto: g.monto, Fecha: g.fecha, Categoría: g.categoria
                }));
            }
            if (userData.finanzas.deudas?.length) {
                sheets['Deudas'] = userData.finanzas.deudas.map(d => ({
                    Descripción: d.descripcion, Monto: d.monto, Vencimiento: d.fechaVence, Porcentaje: d.porcentaje
                }));
            }
        }

        // Gastos Compartidos (formato Rendición de cuentas)
        if (userData.gastosCompartidos?.gastos?.length) {
            const part = userData.gastosCompartidos.participantes || [];
            const partNombre = (p) => p == null ? '' : (typeof p === 'string' ? p : (p.nombre || p.email || ''));
            sheets['Gastos Compartidos'] = userData.gastosCompartidos.gastos.map(g => {
                const pagador = typeof g.pagadorIdx === 'number' ? partNombre(part[g.pagadorIdx]) : (g.quienPago || '');
                const repartoStr = Array.isArray(g.reparto) ? g.reparto.map(i => partNombre(part[i])).filter(Boolean).join(', ') : '';
                return {
                    Concepto: g.concepto || g.descripcion,
                    Tipo: g.tipo === 'abono' ? 'Abono' : 'Gasto',
                    Monto: g.monto,
                    'Pagó': pagador,
                    'Repartido entre': repartoStr,
                    'Modo reparto': g.repartoModo || 'igual'
                };
            });
        }

        // Hábitos
        if (userData.habitos?.lista?.length) {
            sheets['Hábitos'] = userData.habitos.lista.map(h => ({
                Nombre: h.nombre, Frecuencia: h.frecuencia, Creado: h.creado
            }));
        }

        // Eventos
        if (userData.calendario?.eventos?.length) {
            sheets['Eventos'] = userData.calendario.eventos.map(e => ({
                Título: e.titulo, Fecha: e.fecha, Tipo: e.tipo, Completado: e.completado ? 'Sí' : 'No'
            }));
        }

        return sheets;
    },

    exportDashboard(userData) {
        const sheets = this._buildSheets(userData);
        if (Object.keys(sheets).length === 0) {
            UI.toast('No hay datos para exportar', 'warning');
            return;
        }
        this.toExcel(sheets, `dashboard_${DateUtils.today()}.xlsx`);
    },

    _download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
