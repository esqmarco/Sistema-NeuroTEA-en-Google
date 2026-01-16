/**
 * ===========================
 * SERVICIO DE EGRESOS
 * Gastos y adelantos a terapeutas
 * ===========================
 */

const EgresoService = {

  /**
   * Obtiene egresos por fecha
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Array<Object>} - Egresos del dia
   */
  getByDate: function(fecha) {
    return Database.getByDate(SHEETS.EGRESOS, fecha);
  },

  /**
   * Obtiene egresos por terapeuta y fecha
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Egresos
   */
  getByTherapistAndDate: function(terapeuta, fecha) {
    const egresos = this.getByDate(fecha);
    return egresos.filter(e => e.terapeuta === terapeuta);
  },

  /**
   * Obtiene un egreso por ID
   * @param {number} id - ID del egreso
   * @returns {Object|null} - Egreso encontrado
   */
  getById: function(id) {
    return Database.getById(SHEETS.EGRESOS, id);
  },

  /**
   * Registra un nuevo egreso
   * @param {Object} egresoData - Datos del egreso
   * @returns {Object} - Resultado
   */
  create: function(egresoData) {
    // Validaciones
    if (!egresoData.fecha) {
      return resultado(false, null, 'La fecha es requerida');
    }
    if (!egresoData.tipo) {
      return resultado(false, null, 'El tipo de egreso es requerido');
    }
    if (!egresoData.monto || egresoData.monto <= 0) {
      return resultado(false, null, 'El monto debe ser mayor a 0');
    }

    // Validar tipo
    const tiposValidos = [TIPOS_EGRESO.ADELANTO, TIPOS_EGRESO.GASTO_NEUROTEA];
    if (!tiposValidos.includes(egresoData.tipo)) {
      return resultado(false, null, 'Tipo de egreso no valido');
    }

    // Si es adelanto, terapeuta es requerido
    if (egresoData.tipo === TIPOS_EGRESO.ADELANTO && !egresoData.terapeuta) {
      return resultado(false, null, 'Para adelantos, el terapeuta es requerido');
    }

    // Preparar datos
    const egreso = {
      fecha: egresoData.fecha,
      tipo: egresoData.tipo,
      concepto: egresoData.concepto || '',
      monto: parseInt(egresoData.monto) || 0,
      terapeuta: egresoData.terapeuta || '',
      creadoEn: getTimestamp()
    };

    const inserted = Database.insert(SHEETS.EGRESOS, egreso);

    return resultado(true, inserted, 'Egreso registrado exitosamente');
  },

  /**
   * Actualiza un egreso
   * @param {number} id - ID del egreso
   * @param {Object} updates - Datos a actualizar
   * @returns {Object} - Resultado
   */
  update: function(id, updates) {
    const egreso = this.getById(id);
    if (!egreso) {
      return resultado(false, null, 'Egreso no encontrado');
    }

    const updated = Database.update(SHEETS.EGRESOS, id, updates);
    return resultado(true, updated, 'Egreso actualizado');
  },

  /**
   * Elimina un egreso
   * @param {number} id - ID del egreso
   * @returns {Object} - Resultado
   */
  delete: function(id) {
    const egreso = this.getById(id);
    if (!egreso) {
      return resultado(false, null, 'Egreso no encontrado');
    }

    Database.delete(SHEETS.EGRESOS, id);
    return resultado(true, null, 'Egreso eliminado exitosamente');
  },

  /**
   * Elimina egresos por fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Resultado
   */
  deleteByDate: function(fecha) {
    const deleted = Database.deleteByColumn(SHEETS.EGRESOS, 'fecha', fecha);
    return resultado(true, { count: deleted }, `${deleted} egresos eliminados`);
  },

  /**
   * Obtiene adelantos de un terapeuta por fecha
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Adelantos
   */
  getAdelantos: function(terapeuta, fecha) {
    const egresos = this.getByTherapistAndDate(terapeuta, fecha);
    return egresos.filter(e => e.tipo === TIPOS_EGRESO.ADELANTO);
  },

  /**
   * Obtiene gastos de NeuroTEA por fecha
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Gastos
   */
  getGastosNeurotea: function(fecha) {
    const egresos = this.getByDate(fecha);
    return egresos.filter(e => e.tipo === TIPOS_EGRESO.GASTO_NEUROTEA);
  },

  /**
   * Calcula totales de egresos por fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Totales
   */
  getTotals: function(fecha) {
    const egresos = this.getByDate(fecha);

    const adelantos = egresos.filter(e => e.tipo === TIPOS_EGRESO.ADELANTO);
    const gastos = egresos.filter(e => e.tipo === TIPOS_EGRESO.GASTO_NEUROTEA);

    return {
      totalEgresos: egresos.length,
      totalMonto: egresos.reduce((sum, e) => sum + (e.monto || 0), 0),
      totalAdelantos: adelantos.reduce((sum, e) => sum + (e.monto || 0), 0),
      totalGastos: gastos.reduce((sum, e) => sum + (e.monto || 0), 0),
      cantidadAdelantos: adelantos.length,
      cantidadGastos: gastos.length
    };
  },

  /**
   * Obtiene total de adelantos para un terapeuta en una fecha
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {number} - Total de adelantos
   */
  getTotalAdelantos: function(terapeuta, fecha) {
    const adelantos = this.getAdelantos(terapeuta, fecha);
    return adelantos.reduce((sum, a) => sum + (a.monto || 0), 0);
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Registra un egreso (para frontend)
 */
function registrarEgreso(egresoData) {
  return EgresoService.create(egresoData);
}

/**
 * Obtiene egresos por fecha (para frontend)
 */
function getEgresosPorFecha(fecha) {
  return EgresoService.getByDate(fecha);
}

/**
 * Elimina un egreso (para frontend)
 */
function eliminarEgreso(id) {
  return EgresoService.delete(id);
}

/**
 * Obtiene totales de egresos (para frontend)
 */
function getTotalesEgresos(fecha) {
  return EgresoService.getTotals(fecha);
}
