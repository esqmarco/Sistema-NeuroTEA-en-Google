/**
 * ===========================
 * SERVICIO DE EGRESOS
 * ===========================
 *
 * Crear archivo: "EgresoService"
 */

const EgresoService = {

  /**
   * Obtiene egresos por fecha
   */
  getByDate: function(fecha) {
    return Database.getByDate(SHEETS.EGRESOS, fecha);
  },

  /**
   * Obtiene adelantos de un terapeuta
   */
  getAdelantos: function(terapeuta, fecha) {
    const all = this.getByDate(fecha);
    return all.filter(e => e.tipo === 'adelanto' && e.terapeuta === terapeuta);
  },

  /**
   * Registra un egreso
   */
  create: function(egresoData) {
    if (!egresoData.fecha) {
      return resultado(false, null, 'La fecha es requerida');
    }
    if (!egresoData.tipo) {
      return resultado(false, null, 'El tipo de egreso es requerido');
    }
    if (!egresoData.monto || egresoData.monto <= 0) {
      return resultado(false, null, 'El monto debe ser mayor a 0');
    }

    // Si es adelanto, validar terapeuta
    if (egresoData.tipo === 'adelanto' && !egresoData.terapeuta) {
      return resultado(false, null, 'Debe seleccionar un terapeuta para el adelanto');
    }

    const egreso = Database.insert(SHEETS.EGRESOS, {
      fecha: egresoData.fecha,
      tipo: egresoData.tipo,
      terapeuta: egresoData.terapeuta || '',
      concepto: egresoData.concepto || '',
      monto: parseInt(egresoData.monto),
      creadoEn: getTimestamp()
    });

    return resultado(true, egreso, 'Egreso registrado');
  },

  /**
   * Elimina un egreso
   */
  delete: function(id) {
    const egreso = Database.getById(SHEETS.EGRESOS, id);
    if (!egreso) {
      return resultado(false, null, 'Egreso no encontrado');
    }

    Database.delete(SHEETS.EGRESOS, id);
    return resultado(true, null, 'Egreso eliminado');
  },

  /**
   * Elimina egresos por fecha
   */
  deleteByDate: function(fecha) {
    const deleted = Database.deleteByColumn(SHEETS.EGRESOS, 'fecha', fecha);
    return resultado(true, { count: deleted }, deleted + ' egresos eliminados');
  },

  /**
   * Obtiene totales
   */
  getTotals: function(fecha) {
    const egresos = this.getByDate(fecha);
    const adelantos = egresos.filter(e => e.tipo === 'adelanto');
    const gastos = egresos.filter(e => e.tipo === 'gasto-neurotea');

    return {
      totalEgresos: egresos.reduce((sum, e) => sum + (e.monto || 0), 0),
      totalAdelantos: adelantos.reduce((sum, e) => sum + (e.monto || 0), 0),
      totalGastos: gastos.reduce((sum, e) => sum + (e.monto || 0), 0),
      cantidadEgresos: egresos.length
    };
  }
};

// Funciones publicas
function registrarEgreso(egresoData) {
  return EgresoService.create(egresoData);
}

function eliminarEgreso(id) {
  return EgresoService.delete(id);
}
