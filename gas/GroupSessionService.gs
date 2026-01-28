/**
 * ===========================
 * SERVICIO DE SESIONES GRUPALES
 * CRUD y operaciones de terapia grupal
 * ===========================
 */

const GroupSessionService = {

  /**
   * Obtiene sesiones grupales por fecha
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Array<Object>} - Sesiones grupales
   */
  getByDate: function(fecha) {
    const sessions = Database.getByDate(SHEETS.SESIONES_GRUPALES, fecha);
    // Parsear campos JSON
    return sessions.map(s => ({
      ...s,
      asistencia: s.asistenciaJSON || [],
      terapeutas: s.terapeutasJSON || []
    }));
  },

  /**
   * Obtiene una sesion grupal por ID
   * @param {number} id - ID de la sesion
   * @returns {Object|null} - Sesion encontrada
   */
  getById: function(id) {
    const session = Database.getById(SHEETS.SESIONES_GRUPALES, id);
    if (session) {
      session.asistencia = session.asistenciaJSON || [];
      session.terapeutas = session.terapeutasJSON || [];
    }
    return session;
  },

  /**
   * Registra una nueva sesion grupal
   * @param {Object} sessionData - Datos de la sesion grupal
   * @returns {Object} - Resultado
   */
  create: function(sessionData) {
    // Validaciones
    if (!sessionData.fecha) {
      return resultado(false, null, 'La fecha es requerida');
    }
    if (!sessionData.grupoId) {
      return resultado(false, null, 'El grupo es requerido');
    }
    if (!sessionData.terapeutas || sessionData.terapeutas.length === 0) {
      return resultado(false, null, 'Debe haber al menos un terapeuta');
    }
    if (!sessionData.asistencia || sessionData.asistencia.length === 0) {
      return resultado(false, null, 'Debe haber al menos un nino presente');
    }

    // Obtener informacion del grupo
    const grupo = GroupService.getById(sessionData.grupoId);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    // Calcular valores
    const cantidadPresentes = sessionData.asistencia.filter(a => a.presente).length;
    const cantidadTerapeutas = sessionData.terapeutas.length;
    const porcentajeAporte = grupo.porcentajeAporte || 30;

    // Valor total = suma de valores de ninos presentes
    let valorTotal = 0;
    sessionData.asistencia.forEach(a => {
      if (a.presente && a.valor) {
        valorTotal += parseInt(a.valor) || 0;
      }
    });

    // Aporte NeuroTEA (usando Math.round para coincidir con sistema original)
    const aporteNeurotea = Math.round(valorTotal * porcentajeAporte / 100);

    // Honorarios totales
    const honorariosTotales = Math.max(0, valorTotal - aporteNeurotea);

    // Division proporcional entre terapeutas
    const honorariosPorTerapeuta = Math.floor(honorariosTotales / cantidadTerapeutas);
    const residuoHonorarios = honorariosTotales - (honorariosPorTerapeuta * cantidadTerapeutas);

    // Calcular efectivo y transferencias
    let efectivoTotal = 0;
    let transferenciaNeuroTEATotal = 0;
    let transferenciaTerapeutaTotal = 0;
    sessionData.asistencia.forEach(a => {
      if (a.presente) {
        efectivoTotal += parseInt(a.efectivo) || 0;
        transferenciaNeuroTEATotal += parseInt(a.transferenciaNeurotea) || 0;
        transferenciaTerapeutaTotal += parseInt(a.transferenciaTerapeuta) || 0;
      }
    });

    // Preparar datos
    const session = {
      fecha: sessionData.fecha,
      grupoId: sessionData.grupoId,
      grupoNombre: grupo.nombre,
      asistenciaJSON: sessionData.asistencia,
      terapeutasJSON: sessionData.terapeutas,
      cantidadTerapeutas: cantidadTerapeutas,
      cantidadPresentes: cantidadPresentes,
      valorTotal: valorTotal,
      porcentajeAporte: porcentajeAporte,
      aporteNeurotea: aporteNeurotea,
      honorariosTotales: honorariosTotales,
      honorariosPorTerapeuta: honorariosPorTerapeuta,
      residuoHonorarios: residuoHonorarios,
      efectivo: efectivoTotal,
      transferenciaNeurotea: transferenciaNeuroTEATotal,
      transferenciaTerapeuta: transferenciaTerapeutaTotal,
      creadoEn: getTimestamp()
    };

    const inserted = Database.insert(SHEETS.SESIONES_GRUPALES, session);

    return resultado(true, {
      ...inserted,
      asistencia: sessionData.asistencia,
      terapeutas: sessionData.terapeutas
    }, 'Sesion grupal registrada exitosamente');
  },

  /**
   * Elimina una sesion grupal
   * @param {number} id - ID de la sesion
   * @returns {Object} - Resultado
   */
  delete: function(id) {
    const session = this.getById(id);
    if (!session) {
      return resultado(false, null, 'Sesion grupal no encontrada');
    }

    // Limpiar confirmaciones de terapeutas que participaron
    const terapeutas = session.terapeutasJSON || [];
    RendicionService.cleanupGroupSessionConfirmations(session.fecha, id, terapeutas);

    // Limpiar estados de transferencia de cada niño presente
    const asistencia = session.asistenciaJSON || [];
    TransferService.cleanupGroupSessionTransferStates(id, asistencia, terapeutas);

    Database.delete(SHEETS.SESIONES_GRUPALES, id);
    return resultado(true, null, 'Sesion grupal eliminada');
  },

  /**
   * Elimina sesiones grupales por fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Resultado
   */
  deleteByDate: function(fecha) {
    const sessions = this.getByDate(fecha);

    // Limpiar cada sesion completamente
    sessions.forEach(session => {
      // Limpiar confirmaciones de terapeutas que participaron
      const terapeutas = session.terapeutasJSON || session.terapeutas || [];
      RendicionService.cleanupGroupSessionConfirmations(fecha, session.id, terapeutas);

      // Limpiar estados de transferencia de cada nino presente
      const asistencia = session.asistenciaJSON || session.asistencia || [];
      TransferService.cleanupGroupSessionTransferStates(session.id, asistencia, terapeutas);
    });

    const deleted = Database.deleteByColumn(SHEETS.SESIONES_GRUPALES, 'fecha', fecha);
    return resultado(true, { count: deleted }, `${deleted} sesiones grupales eliminadas`);
  },

  /**
   * Actualiza una sesion grupal
   * @param {number} id - ID de la sesion
   * @param {Object} updates - Datos a actualizar
   * @returns {Object} - Resultado
   */
  update: function(id, updates) {
    const session = this.getById(id);
    if (!session) {
      return resultado(false, null, 'Sesion grupal no encontrada');
    }

    // Obtener datos del grupo
    const grupo = GroupService.getById(session.grupoId);
    const porcentajeAporte = grupo ? grupo.porcentajeAporte : 30;

    // Recalcular totales basados en asistencia actualizada
    const asistencia = updates.asistencia || session.asistenciaJSON || [];
    const presentes = asistencia.filter(a => a.presente);
    const valorTotal = presentes.reduce((sum, a) => sum + (a.valor || 0), 0);
    const efectivoTotal = presentes.reduce((sum, a) => sum + (a.efectivo || 0), 0);
    const transferenciaNeuroTEATotal = presentes.reduce((sum, a) => sum + (a.transferenciaNeurotea || 0), 0);
    const transferenciaTerapeutaTotal = presentes.reduce((sum, a) => sum + (a.transferenciaTerapeuta || 0), 0);

    // Recalcular aporte y honorarios
    const aporteNeurotea = Math.round(valorTotal * porcentajeAporte / 100);
    const honorariosTotales = valorTotal - aporteNeurotea;
    const terapeutas = updates.terapeutas || session.terapeutasJSON || [];
    const cantidadTerapeutas = terapeutas.length;
    const honorariosPorTerapeuta = cantidadTerapeutas > 0 ? Math.floor(honorariosTotales / cantidadTerapeutas) : 0;
    const residuoHonorarios = honorariosTotales - (honorariosPorTerapeuta * cantidadTerapeutas);

    const updateData = {
      asistenciaJSON: asistencia,
      terapeutasJSON: terapeutas,
      cantidadTerapeutas: cantidadTerapeutas,
      cantidadPresentes: presentes.length,
      valorTotal: valorTotal,
      aporteNeurotea: aporteNeurotea,
      honorariosTotales: honorariosTotales,
      honorariosPorTerapeuta: honorariosPorTerapeuta,
      residuoHonorarios: residuoHonorarios,
      efectivo: efectivoTotal,
      transferenciaNeurotea: transferenciaNeuroTEATotal,
      transferenciaTerapeuta: transferenciaTerapeutaTotal
    };

    Database.update(SHEETS.SESIONES_GRUPALES, id, updateData);

    return resultado(true, { ...session, ...updateData }, 'Sesion grupal actualizada');
  },

  /**
   * Calcula honorarios proporcionales para un terapeuta
   * @param {Object} session - Sesion grupal
   * @param {string} terapeuta - Nombre del terapeuta
   * @returns {Object} - Honorarios del terapeuta
   */
  getTherapistShare: function(session, terapeuta) {
    const terapeutas = session.terapeutas || session.terapeutasJSON || [];
    const index = terapeutas.indexOf(terapeuta);

    if (index === -1) return null;

    const isFirst = index === 0;
    const honorarios = session.honorariosPorTerapeuta + (isFirst ? session.residuoHonorarios : 0);
    const cantidadTerapeutas = session.cantidadTerapeutas || terapeutas.length;

    // Valor proporcional
    const valorProporcional = Math.floor(session.valorTotal / cantidadTerapeutas);
    const residuoValor = session.valorTotal - (valorProporcional * cantidadTerapeutas);

    // Aporte proporcional
    const aporteProporcional = Math.floor(session.aporteNeurotea / cantidadTerapeutas);
    const residuoAporte = session.aporteNeurotea - (aporteProporcional * cantidadTerapeutas);

    // Transferencia a terapeuta proporcional
    const transferenciaTerapeutaTotal = session.transferenciaTerapeuta || 0;
    const transferenciaTerapeutaProporcional = Math.floor(transferenciaTerapeutaTotal / cantidadTerapeutas);
    const residuoTransferencia = transferenciaTerapeutaTotal - (transferenciaTerapeutaProporcional * cantidadTerapeutas);

    return {
      terapeuta: terapeuta,
      honorarios: honorarios,
      valorProporcional: valorProporcional + (isFirst ? residuoValor : 0),
      aporteProporcional: aporteProporcional + (isFirst ? residuoAporte : 0),
      transferenciaTerapeutaProporcional: transferenciaTerapeutaProporcional + (isFirst ? residuoTransferencia : 0),
      recibeResiduo: isFirst
    };
  },

  /**
   * Obtiene totales de sesiones grupales por fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Totales
   */
  getTotals: function(fecha) {
    const sessions = this.getByDate(fecha);

    return {
      totalSesiones: sessions.length,
      totalValor: sessions.reduce((sum, s) => sum + (s.valorTotal || 0), 0),
      totalAporteNeurotea: sessions.reduce((sum, s) => sum + (s.aporteNeurotea || 0), 0),
      totalHonorarios: sessions.reduce((sum, s) => sum + (s.honorariosTotales || 0), 0),
      totalEfectivo: sessions.reduce((sum, s) => sum + (s.efectivo || 0), 0),
      totalTransferenciaNeurotea: sessions.reduce((sum, s) => sum + (s.transferenciaNeurotea || 0), 0),
      totalTransferenciaTerapeuta: sessions.reduce((sum, s) => sum + (s.transferenciaTerapeuta || 0), 0),
      totalNinosAtendidos: sessions.reduce((sum, s) => sum + (s.cantidadPresentes || 0), 0)
    };
  },

  /**
   * Obtiene sesiones grupales donde participo un terapeuta
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Sesiones con datos proporcionales
   */
  getByTherapist: function(terapeuta, fecha) {
    const sessions = this.getByDate(fecha);
    const result = [];

    sessions.forEach(session => {
      const terapeutas = session.terapeutas || session.terapeutasJSON || [];
      if (terapeutas.includes(terapeuta)) {
        const share = this.getTherapistShare(session, terapeuta);
        result.push({
          ...session,
          therapistShare: share
        });
      }
    });

    return result;
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Registra sesion grupal (para frontend)
 */
function registrarSesionGrupal(sessionData) {
  return GroupSessionService.create(sessionData);
}

/**
 * Obtiene sesiones grupales por fecha (para frontend)
 */
function getSesionesGrupalesPorFecha(fecha) {
  return GroupSessionService.getByDate(fecha);
}

/**
 * Elimina sesion grupal (para frontend)
 */
function eliminarSesionGrupal(id) {
  return GroupSessionService.delete(id);
}

/**
 * Obtiene sesion grupal por ID (para frontend)
 */
function getSesionGrupalPorId(id) {
  const session = GroupSessionService.getById(id);
  if (session) {
    return resultado(true, session);
  }
  return resultado(false, null, 'Sesion grupal no encontrada');
}

/**
 * Actualiza sesion grupal (para frontend)
 */
function actualizarSesionGrupal(id, updates) {
  return GroupSessionService.update(id, updates);
}
