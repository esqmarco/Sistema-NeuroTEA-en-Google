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
    const transferenciaTerapeuta = parseInt(sessionData.transferenciaTerapeuta) || 0;

    const valorSesion = efectivo + transferenciaNeurotea + transferenciaTerapeuta;

    // Calcular aporte NeuroTEA segun tipo
    let aporteNeurotea = 0;
    const tipoAporte = sessionData.tipoAporte || '30'; // Default 30%

    if (tipoAporte === 'fixed') {
      aporteNeurotea = parseInt(sessionData.aporteNeurotea) || 0;
    } else {
      const porcentaje = parseInt(tipoAporte) || 30;
      // Usar Math.round() para coincidir con el sistema original
      aporteNeurotea = Math.round(valorSesion * porcentaje / 100);
    }

    // Honorarios = Valor sesion - Aporte NeuroTEA
    const honorarios = Math.max(0, valorSesion - aporteNeurotea);

    // Si usa credito, descontar ANTES para obtener creditosRestantes
    let creditosRestantes = 0;
    if (sessionData.usaCredito && sessionData.paqueteId) {
      const creditResult = PackageService.useCredit(sessionData.paqueteId, sessionData.terapeuta, sessionData.paciente);
      if (creditResult && creditResult.success) {
        creditosRestantes = creditResult.data ? creditResult.data.restante : 0;
      }
    }

    // Preparar datos para insertar
    const session = {
      fecha: sessionData.fecha,
      terapeuta: sessionData.terapeuta,
      paciente: sessionData.paciente.trim(),
      efectivo: efectivo,
      transferenciaNeurotea: transferenciaNeurotea,
      transferenciaTerapeuta: transferenciaTerapeuta,
      valorSesion: valorSesion,
      aporteNeurotea: aporteNeurotea,
      honorarios: honorarios,
      tipoAporte: tipoAporte,
      usaCredito: sessionData.usaCredito || false,
      paqueteId: sessionData.paqueteId || '',
      creditosRestantes: creditosRestantes,
      creadoEn: getTimestamp()
    };

    // Insertar sesion
    const inserted = Database.insert(SHEETS.SESIONES, session);

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
        updates.transferenciaTerapeuta !== undefined) {

      const efectivo = updates.efectivo !== undefined ? updates.efectivo : session.efectivo;
      const transferenciaNeurotea = updates.transferenciaNeurotea !== undefined ?
        updates.transferenciaNeurotea : session.transferenciaNeurotea;
      const transferenciaTerapeuta = updates.transferenciaTerapeuta !== undefined ?
        updates.transferenciaTerapeuta : session.transferenciaTerapeuta;

      updates.valorSesion = efectivo + transferenciaNeurotea + transferenciaTerapeuta;

      const tipoAporte = updates.tipoAporte || session.tipoAporte || '30';
      if (tipoAporte !== 'fixed') {
        const porcentaje = parseInt(tipoAporte) || 30;
        // Usar Math.round() para coincidir con el sistema original
        updates.aporteNeurotea = Math.round(updates.valorSesion * porcentaje / 100);
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

    // Limpiar confirmaciones si el terapeuta no tiene otras sesiones
    RendicionService.cleanupSessionConfirmations(session.fecha, session);

    // Limpiar estado de transferencia asociado
    TransferService.cleanupSessionTransferState(id);

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

    // Limpiar cada sesion completamente
    sessions.forEach(session => {
      // Revertir creditos si aplica
      if (session.usaCredito && session.paqueteId) {
        PackageService.revertCredit(session.paqueteId, session.terapeuta, session.paciente);
      }
      // Limpiar confirmaciones
      RendicionService.cleanupSessionConfirmations(fecha, session);
      // Limpiar estado de transferencia
      TransferService.cleanupSessionTransferState(session.id);
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
      totalTransferenciaTerapeuta: sessions.reduce((sum, s) => sum + (s.transferenciaTerapeuta || 0), 0),
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
 * Registra una sesion usando creditos de un paquete (para frontend)
 * El paciente ya pago el paquete, solo se descuenta el credito
 * @param {Object} data - {fecha, terapeuta, paciente, paqueteId}
 * @returns {Object} - Resultado con creditos restantes
 */
function registrarSesionConCredito(data) {
  try {
    // Validaciones
    if (!data.terapeuta) {
      return resultado(false, null, 'El terapeuta es requerido');
    }
    if (!data.paciente) {
      return resultado(false, null, 'El paciente es requerido');
    }
    if (!data.paqueteId) {
      return resultado(false, null, 'El ID del paquete es requerido');
    }

    // Usar credito del paquete (esto actualiza el credito y mueve a historial si es necesario)
    const creditResult = PackageService.useCredit(data.paqueteId, data.terapeuta, data.paciente);
    if (!creditResult.success) {
      return resultado(false, null, creditResult.message || 'Error al usar credito');
    }

    // Registrar sesion con valores en 0 (ya fue pagado en el paquete)
    const sessionData = {
      fecha: data.fecha || getFechaActual(),
      terapeuta: data.terapeuta,
      paciente: data.paciente,
      efectivo: 0,
      transferenciaNeurotea: 0,
      transferenciaTerapeuta: 0,
      valorSesion: 0,
      aporteNeurotea: 0,
      honorarios: 0,
      tipoAporte: '30',
      usaCredito: true,
      paqueteId: data.paqueteId,
      creditosRestantes: creditResult.data?.restante || 0
    };

    const sessionResult = Database.insert(SHEETS.SESIONES, {
      fecha: sessionData.fecha,
      terapeuta: sessionData.terapeuta,
      paciente: sessionData.paciente,
      efectivo: 0,
      transferenciaNeurotea: 0,
      transferenciaTerapeuta: 0,
      valorSesion: 0,
      aporteNeurotea: 0,
      honorarios: 0,
      tipoAporte: '30',
      usaCredito: true,
      paqueteId: data.paqueteId,
      creditosRestantes: creditResult.data?.restante || 0,
      creadoEn: getTimestamp()
    });

    return resultado(true, {
      session: sessionResult,
      restante: creditResult.data?.restante || 0
    }, 'Sesion con credito registrada exitosamente');

  } catch (error) {
    Logger.log('Error en registrarSesionConCredito: ' + error.message);
    return resultado(false, null, error.message);
  }
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

/**
 * Actualiza una sesion (para frontend)
 */
function actualizarSesion(id, updates) {
  return SessionService.update(id, updates);
}

/**
 * Obtiene una sesion por ID (para frontend)
 */
function getSesionPorId(id) {
  const session = SessionService.getById(id);
  if (session) {
    return resultado(true, session, 'Sesion encontrada');
  }
  return resultado(false, null, 'Sesion no encontrada');
}
