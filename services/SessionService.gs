/**
 * ===========================
 * SERVICIO DE SESIONES INDIVIDUALES
 * CRUD y operaciones de sesiones
 * ===========================
 */

const SessionService = {

  /**
   * Obtiene sesiones por fecha
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Array<Object>} - Sesiones del dia
   */
  getByDate: function(fecha) {
    return Database.getByDate(SHEETS.SESIONES, fecha);
  },

  /**
   * Obtiene sesiones por terapeuta y fecha
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Sesiones
   */
  getByTherapistAndDate: function(terapeuta, fecha) {
    const sessions = this.getByDate(fecha);
    return sessions.filter(s => s.terapeuta === terapeuta);
  },

  /**
   * Obtiene una sesion por ID
   * @param {number} id - ID de la sesion
   * @returns {Object|null} - Sesion encontrada
   */
  getById: function(id) {
    return Database.getById(SHEETS.SESIONES, id);
  },

  /**
   * Registra una nueva sesion individual
   * @param {Object} sessionData - Datos de la sesion
   * @returns {Object} - Resultado de la operacion
   */
  create: function(sessionData) {
    // Validaciones
    if (!sessionData.fecha) {
      return resultado(false, null, 'La fecha es requerida');
    }
    if (!sessionData.terapeuta) {
      return resultado(false, null, 'El terapeuta es requerido');
    }
    if (!sessionData.paciente) {
      return resultado(false, null, 'El nombre del paciente es requerido');
    }

    // Calcular valores
    const efectivo = parseInt(sessionData.efectivo) || 0;
    const transferenciaNeurotea = parseInt(sessionData.transferenciaNeurotea) || 0;
    const transferenciaTerminapeuta = parseInt(sessionData.transferenciaTerminapeuta) || 0;

    const valorSesion = efectivo + transferenciaNeurotea + transferenciaTerminapeuta;

    // Calcular aporte NeuroTEA segun tipo
    let aporteNeurotea = 0;
    const tipoAporte = sessionData.tipoAporte || '30'; // Default 30%

    if (tipoAporte === 'fixed') {
      aporteNeurotea = parseInt(sessionData.aporteNeurotea) || 0;
    } else {
      const porcentaje = parseInt(tipoAporte) || 30;
      aporteNeurotea = Math.floor(valorSesion * porcentaje / 100);
    }

    // Honorarios = Valor sesion - Aporte NeuroTEA
    const honorarios = Math.max(0, valorSesion - aporteNeurotea);

    // Preparar datos para insertar
    const session = {
      fecha: sessionData.fecha,
      terapeuta: sessionData.terapeuta,
      paciente: sessionData.paciente.trim(),
      efectivo: efectivo,
      transferenciaNeurotea: transferenciaNeurotea,
      transferenciaTerminapeuta: transferenciaTerminapeuta,
      valorSesion: valorSesion,
      aporteNeurotea: aporteNeurotea,
      honorarios: honorarios,
      tipoAporte: tipoAporte,
      usaCredito: sessionData.usaCredito || false,
      paqueteId: sessionData.paqueteId || '',
      creditosRestantes: sessionData.creditosRestantes || 0,
      creadoEn: getTimestamp()
    };

    // Insertar sesion
    const inserted = Database.insert(SHEETS.SESIONES, session);

    // Si usa credito, descontar del paquete
    if (sessionData.usaCredito && sessionData.paqueteId) {
      PackageService.useCredit(sessionData.paqueteId, sessionData.terapeuta, sessionData.paciente);
    }

    return resultado(true, inserted, 'Sesion registrada exitosamente');
  },

  /**
   * Actualiza una sesion
   * @param {number} id - ID de la sesion
   * @param {Object} updates - Datos a actualizar
   * @returns {Object} - Resultado
   */
  update: function(id, updates) {
    const session = this.getById(id);
    if (!session) {
      return resultado(false, null, 'Sesion no encontrada');
    }

    // Recalcular valores si cambian los montos
    if (updates.efectivo !== undefined || updates.transferenciaNeurotea !== undefined ||
        updates.transferenciaTerminapeuta !== undefined) {

      const efectivo = updates.efectivo !== undefined ? updates.efectivo : session.efectivo;
      const transferenciaNeurotea = updates.transferenciaNeurotea !== undefined ?
        updates.transferenciaNeurotea : session.transferenciaNeurotea;
      const transferenciaTerminapeuta = updates.transferenciaTerminapeuta !== undefined ?
        updates.transferenciaTerminapeuta : session.transferenciaTerminapeuta;

      updates.valorSesion = efectivo + transferenciaNeurotea + transferenciaTerminapeuta;

      const tipoAporte = updates.tipoAporte || session.tipoAporte || '30';
      if (tipoAporte !== 'fixed') {
        const porcentaje = parseInt(tipoAporte) || 30;
        updates.aporteNeurotea = Math.floor(updates.valorSesion * porcentaje / 100);
      }

      updates.honorarios = Math.max(0, updates.valorSesion - (updates.aporteNeurotea || session.aporteNeurotea));
    }

    const updated = Database.update(SHEETS.SESIONES, id, updates);
    return resultado(true, updated, 'Sesion actualizada');
  },

  /**
   * Elimina una sesion
   * @param {number} id - ID de la sesion
   * @returns {Object} - Resultado
   */
  delete: function(id) {
    const session = this.getById(id);
    if (!session) {
      return resultado(false, null, 'Sesion no encontrada');
    }

    // Si uso credito, revertir
    if (session.usaCredito && session.paqueteId) {
      PackageService.revertCredit(session.paqueteId, session.terapeuta, session.paciente);
    }

    Database.delete(SHEETS.SESIONES, id);
    return resultado(true, null, 'Sesion eliminada exitosamente');
  },

  /**
   * Elimina todas las sesiones de una fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Resultado
   */
  deleteByDate: function(fecha) {
    const sessions = this.getByDate(fecha);

    // Revertir creditos de sesiones que los usaron
    sessions.forEach(session => {
      if (session.usaCredito && session.paqueteId) {
        PackageService.revertCredit(session.paqueteId, session.terapeuta, session.paciente);
      }
    });

    const deleted = Database.deleteByColumn(SHEETS.SESIONES, 'fecha', fecha);
    return resultado(true, { count: deleted }, `${deleted} sesiones eliminadas`);
  },

  /**
   * Calcula totales de sesiones para una fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Totales
   */
  getTotals: function(fecha) {
    const sessions = this.getByDate(fecha);

    return {
      totalSesiones: sessions.length,
      totalEfectivo: sessions.reduce((sum, s) => sum + (s.efectivo || 0), 0),
      totalTransferenciaNeurotea: sessions.reduce((sum, s) => sum + (s.transferenciaNeurotea || 0), 0),
      totalTransferenciaTerminapeuta: sessions.reduce((sum, s) => sum + (s.transferenciaTerminapeuta || 0), 0),
      totalValorSesiones: sessions.reduce((sum, s) => sum + (s.valorSesion || 0), 0),
      totalAporteNeurotea: sessions.reduce((sum, s) => sum + (s.aporteNeurotea || 0), 0),
      totalHonorarios: sessions.reduce((sum, s) => sum + (s.honorarios || 0), 0),
      sesionesConCredito: sessions.filter(s => s.usaCredito).length
    };
  },

  /**
   * Obtiene sesiones con credito usado por paciente y terapeuta
   * @param {string} paciente - Nombre del paciente
   * @param {string} terapeuta - Nombre del terapeuta
   * @returns {Array<Object>} - Sesiones
   */
  getCreditSessions: function(paciente, terapeuta) {
    const allSessions = Database.getAll(SHEETS.SESIONES);
    return allSessions.filter(s =>
      s.paciente === paciente &&
      s.terapeuta === terapeuta &&
      s.usaCredito === true
    );
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Registra una sesion (para frontend)
 */
function registrarSesion(sessionData) {
  return SessionService.create(sessionData);
}

/**
 * Obtiene sesiones por fecha (para frontend)
 */
function getSesionesPorFecha(fecha) {
  return SessionService.getByDate(fecha);
}

/**
 * Elimina una sesion (para frontend)
 */
function eliminarSesion(id) {
  return SessionService.delete(id);
}

/**
 * Obtiene totales de sesiones (para frontend)
 */
function getTotalesSesiones(fecha) {
  return SessionService.getTotals(fecha);
}
