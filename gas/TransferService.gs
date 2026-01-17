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
   * Obtiene transferencias pendientes para una fecha
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Lista de transferencias pendientes
   */
  getPendientes: function(fecha) {
    const transferencias = [];

    // Obtener sesiones con transferencia a terapeuta
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      if (s.transferenciaTerminapeuta > 0) {
        const transferId = `session_${s.id}_transfer`;
        const estado = this.getEstado(transferId);

        transferencias.push({
          id: transferId,
          tipo: 'sesion',
          sessionId: s.id,
          terapeuta: s.terapeuta,
          paciente: s.paciente,
          monto: s.transferenciaTerminapeuta,
          confirmado: estado ? estado.confirmed : false,
          fecha: fecha
        });
      }
    });

    // Obtener paquetes con transferencia a terapeuta
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      if (p.transferenciaTerminapeuta > 0) {
        const transferId = `package_${p.id}_transfer`;
        const estado = this.getEstado(transferId);

        transferencias.push({
          id: transferId,
          tipo: 'paquete',
          packageId: p.id,
          terapeuta: p.terapeuta,
          paciente: p.paciente,
          monto: p.transferenciaTerminapeuta,
          confirmado: estado ? estado.confirmed : false,
          fecha: fecha
        });
      }
    });

    // Obtener sesiones grupales con transferencias
    const sesionesGrupales = GroupSessionService.getByDate(fecha);
    sesionesGrupales.forEach(gs => {
      const asistencia = gs.asistencia || [];
      asistencia.forEach(a => {
        if (a.presente && a.transferencia > 0) {
          const transferId = `group_${gs.id}_${a.nombre}_transfer`;
          const estado = this.getEstado(transferId);

          transferencias.push({
            id: transferId,
            tipo: 'grupal',
            groupSessionId: gs.id,
            grupoNombre: gs.grupoNombre,
            paciente: a.nombre,
            monto: a.transferencia,
            confirmado: estado ? estado.confirmed : false,
            fecha: fecha
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
