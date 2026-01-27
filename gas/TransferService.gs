/**
 * ===========================
 * SERVICIO DE TRANSFERENCIAS
 * Gestion de estados de confirmacion de transferencias
 * ===========================
 */

const TransferService = {

  /**
   * Obtiene todos los estados de transferencia para una fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Estados indexados por ID
   */
  getEstados: function(fecha) {
    const estados = Database.getAll(SHEETS.ESTADOS_TRANSFERENCIA);
    const result = {};

    estados.forEach(e => {
      // Filtrar por fecha usando el timestamp
      if (e.timestamp) {
        const fechaEstado = e.timestamp.split('T')[0];
        if (fechaEstado === fecha) {
          result[e.id] = {
            id: e.id,
            confirmed: e.confirmado === true,
            timestamp: e.timestamp
          };
        }
      }
    });

    return result;
  },

  /**
   * Obtiene el estado de una transferencia especifica
   * @param {string} transferId - ID de la transferencia
   * @returns {Object|null} - Estado de la transferencia
   */
  getEstado: function(transferId) {
    const estado = Database.getById(SHEETS.ESTADOS_TRANSFERENCIA, transferId);
    if (estado) {
      return {
        id: estado.id,
        confirmed: estado.confirmado === true,
        timestamp: estado.timestamp
      };
    }
    return null;
  },

  /**
   * Alterna el estado de confirmacion de una transferencia
   * @param {string} transferId - ID de la transferencia
   * @returns {Object} - Resultado
   */
  toggleConfirmation: function(transferId) {
    const existing = this.getEstado(transferId);

    if (existing) {
      // Actualizar estado existente
      const newConfirmed = !existing.confirmed;
      Database.update(SHEETS.ESTADOS_TRANSFERENCIA, transferId, {
        confirmado: newConfirmed
      });

      return resultado(true, { confirmed: newConfirmed }, 'Estado actualizado');
    } else {
      // Crear nuevo estado
      Database.insert(SHEETS.ESTADOS_TRANSFERENCIA, {
        id: transferId,
        confirmado: true,
        timestamp: getTimestamp()
      });

      return resultado(true, { confirmed: true }, 'Estado creado');
    }
  },

  /**
   * Confirma una transferencia
   * @param {string} transferId - ID de la transferencia
   * @returns {Object} - Resultado
   */
  confirm: function(transferId) {
    const existing = this.getEstado(transferId);

    if (existing) {
      if (existing.confirmed) {
        return resultado(false, null, 'La transferencia ya esta confirmada');
      }
      Database.update(SHEETS.ESTADOS_TRANSFERENCIA, transferId, {
        confirmado: true
      });
    } else {
      Database.insert(SHEETS.ESTADOS_TRANSFERENCIA, {
        id: transferId,
        confirmado: true,
        timestamp: getTimestamp()
      });
    }

    return resultado(true, { confirmed: true }, 'Transferencia confirmada');
  },

  /**
   * Marca una transferencia como pendiente
   * @param {string} transferId - ID de la transferencia
   * @returns {Object} - Resultado
   */
  setPending: function(transferId) {
    const existing = this.getEstado(transferId);

    if (existing) {
      if (!existing.confirmed) {
        return resultado(false, null, 'La transferencia ya esta pendiente');
      }
      Database.update(SHEETS.ESTADOS_TRANSFERENCIA, transferId, {
        confirmado: false
      });
    } else {
      Database.insert(SHEETS.ESTADOS_TRANSFERENCIA, {
        id: transferId,
        confirmado: false,
        timestamp: getTimestamp()
      });
    }

    return resultado(true, { confirmed: false }, 'Transferencia marcada como pendiente');
  },

  /**
   * Elimina el estado de una transferencia
   * @param {string} transferId - ID de la transferencia
   * @returns {Object} - Resultado
   */
  deleteEstado: function(transferId) {
    const existing = this.getEstado(transferId);

    if (!existing) {
      return resultado(false, null, 'Estado no encontrado');
    }

    Database.delete(SHEETS.ESTADOS_TRANSFERENCIA, transferId);
    return resultado(true, null, 'Estado eliminado');
  },

  /**
   * Limpia estados de transferencia para una sesion individual eliminada
   * @param {number} sessionId - ID de la sesion
   */
  cleanupSessionTransferState: function(sessionId) {
    const transferId = `session_${sessionId}_transfer`;
    try {
      Database.delete(SHEETS.ESTADOS_TRANSFERENCIA, transferId);
      Logger.log('Estado de transferencia eliminado: ' + transferId);
    } catch (e) {
      // Ignorar si no existe
    }
  },

  /**
   * Limpia estados de transferencia para un paquete eliminado
   * @param {number} packageId - ID del paquete
   */
  cleanupPackageTransferState: function(packageId) {
    const transferId = `package_${packageId}_transfer`;
    try {
      Database.delete(SHEETS.ESTADOS_TRANSFERENCIA, transferId);
      Logger.log('Estado de transferencia de paquete eliminado: ' + transferId);
    } catch (e) {
      // Ignorar si no existe
    }
  },

  /**
   * Limpia estados de transferencia para una sesion grupal eliminada
   * @param {number} groupSessionId - ID de la sesion grupal
   * @param {Array} asistencia - Lista de asistencia para limpiar estados individuales
   */
  cleanupGroupSessionTransferStates: function(groupSessionId, asistencia) {
    if (!asistencia || !Array.isArray(asistencia)) return;

    asistencia.forEach(function(a, childIndex) {
      if (a.presente && a.transferencia > 0) {
        var transferId = 'group_' + groupSessionId + '_child_' + childIndex + '_neurotea';
        try {
          Database.delete(SHEETS.ESTADOS_TRANSFERENCIA, transferId);
          Logger.log('Estado de transferencia grupal eliminado: ' + transferId);
        } catch (e) {
          // Ignorar si no existe
        }
      }
    });
  },

  /**
   * Obtiene transferencias pendientes para una fecha
   * Muestra transferencias ENTRANTES a NeuroTEA (para conciliacion bancaria)
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Lista de transferencias pendientes
   */
  getPendientes: function(fecha) {
    const transferencias = [];

    // Obtener sesiones
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      // Transferencia a NeuroTEA (entrante)
      if (s.transferenciaNeurotea > 0 && !s.usaCredito) {
        const transferId = 'session_' + s.id + '_neurotea';
        const estado = this.getEstado(transferId);

        transferencias.push({
          id: transferId,
          tipo: 'A NeuroTEA',
          destinatario: 'NeuroTEA',
          concepto: 'Pago de sesion con ' + s.terapeuta,
          paciente: s.paciente || 'Sin nombre',
          monto: s.transferenciaNeurotea,
          confirmado: estado ? estado.confirmed : false,
          fecha: fecha,
          isGrupal: false
        });
      }
      // Transferencia a Terapeuta (saliente)
      if (s.transferenciaTerapeuta > 0 && !s.usaCredito) {
        var transferId2 = 'session_' + s.id + '_therapist';
        transferencias.push({
          id: transferId2,
          tipo: 'A Terapeuta',
          destinatario: s.terapeuta,
          concepto: 'Pago de sesion con ' + s.terapeuta,
          paciente: s.paciente || 'Sin nombre',
          monto: s.transferenciaTerapeuta,
          confirmado: false,
          fecha: fecha,
          isGrupal: false
        });
      }
    });

    // Obtener paquetes con transferencia a NeuroTEA
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      if (p.transferenciaNeurotea > 0) {
        var transferId3 = 'package_' + p.id + '_neurotea';
        var estado2 = this.getEstado(transferId3);

        transferencias.push({
          id: transferId3,
          tipo: 'A NeuroTEA',
          destinatario: 'NeuroTEA',
          concepto: 'Pago de paquete con ' + p.terapeuta,
          paciente: p.paciente || 'Sin nombre',
          monto: p.transferenciaNeurotea,
          confirmado: estado2 ? estado2.confirmed : false,
          fecha: fecha,
          isGrupal: false
        });
      }
    });

    // Obtener sesiones grupales con transferencias a NeuroTEA (por nino)
    const sesionesGrupales = GroupSessionService.getByDate(fecha);
    sesionesGrupales.forEach(gs => {
      const asistencia = gs.asistenciaJSON || gs.asistencia || [];
      asistencia.forEach(function(a, childIndex) {
        if (a.presente && a.transferencia > 0) {
          var transferId4 = 'group_' + gs.id + '_child_' + childIndex + '_neurotea';
          var estado3 = TransferService.getEstado(transferId4);
          var groupName = gs.grupoNombre || 'Grupo';

          transferencias.push({
            id: transferId4,
            tipo: 'A NeuroTEA (Grupal)',
            destinatario: 'NeuroTEA',
            concepto: 'Pago de sesion grupal de ' + (a.nombre || 'Nino') + ' - "' + groupName + '"',
            paciente: a.nombre || ('Nino ' + (childIndex + 1)),
            monto: a.transferencia,
            confirmado: estado3 ? estado3.confirmed : false,
            fecha: fecha,
            isGrupal: true
          });
        }
      });
    });

    return transferencias;
  },

  /**
   * Obtiene resumen de transferencias por fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Resumen
   */
  getResumen: function(fecha) {
    const transferencias = this.getPendientes(fecha);

    const pendientes = transferencias.filter(t => !t.confirmado);
    const confirmadas = transferencias.filter(t => t.confirmado);

    return {
      fecha: fecha,
      totalTransferencias: transferencias.length,
      totalMonto: transferencias.reduce((sum, t) => sum + (t.monto || 0), 0),

      pendientes: pendientes,
      totalPendientes: pendientes.length,
      montoPendientes: pendientes.reduce((sum, t) => sum + (t.monto || 0), 0),

      confirmadas: confirmadas,
      totalConfirmadas: confirmadas.length,
      montoConfirmadas: confirmadas.reduce((sum, t) => sum + (t.monto || 0), 0)
    };
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Alterna confirmacion de transferencia (para frontend)
 */
function toggleTransferencia(transferId) {
  return TransferService.toggleConfirmation(transferId);
}

/**
 * Obtiene transferencias pendientes (para frontend)
 */
function getTransferenciasPendientes(fecha) {
  return TransferService.getPendientes(fecha);
}

/**
 * Obtiene resumen de transferencias (para frontend)
 */
function getResumenTransferencias(fecha) {
  return TransferService.getResumen(fecha);
}

/**
 * Confirma transferencia (para frontend)
 */
function confirmarTransferencia(transferId) {
  return TransferService.confirm(transferId);
}
