/**
 * ===========================
 * SERVICIO DE TRANSFERENCIAS
 * ===========================
 *
 * Crear archivo: "TransferService"
 */

const TransferService = {

  /**
   * Genera ID unico para transferencia
   */
  generateTransferId: function(tipo, itemId, fecha) {
    return tipo + '_' + itemId + '_' + fecha;
  },

  /**
   * Obtiene estado de transferencia
   */
  getEstado: function(transferId) {
    const estados = Database.getByColumn(SHEETS.ESTADOS_TRANSFERENCIA, 'id', transferId);
    if (estados.length > 0) {
      return estados[0].confirmado === true || estados[0].confirmado === 'true';
    }
    return false;
  },

  /**
   * Obtiene todas las transferencias de una fecha
   */
  getByDate: function(fecha) {
    const transferencias = [];

    // Transferencias de sesiones individuales
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      if (parseInt(s.transferenciaNeurotea) > 0) {
        const transferId = this.generateTransferId('sesion', s.id, fecha);
        transferencias.push({
          id: transferId,
          tipo: 'sesion',
          itemId: s.id,
          fecha: fecha,
          descripcion: s.paciente + ' - ' + s.terapeuta,
          monto: parseInt(s.transferenciaNeurotea),
          confirmado: this.getEstado(transferId)
        });
      }
    });

    // Transferencias de sesiones grupales (por nino)
    const grupales = GroupSessionService.getByDate(fecha);
    grupales.forEach(g => {
      if (g.asistenciaJSON && Array.isArray(g.asistenciaJSON)) {
        g.asistenciaJSON.forEach((asistencia, idx) => {
          if (asistencia.presente && asistencia.metodoPago === 'transferencia') {
            const transferId = this.generateTransferId('grupal', g.id + '_' + idx, fecha);
            transferencias.push({
              id: transferId,
              tipo: 'grupal',
              itemId: g.id,
              ninoIndex: idx,
              fecha: fecha,
              descripcion: asistencia.nombre + ' (Grupal: ' + g.grupoNombre + ')',
              monto: parseInt(asistencia.valorSesion) || 0,
              confirmado: this.getEstado(transferId)
            });
          }
        });
      }
    });

    // Transferencias de paquetes
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      if (parseInt(p.transferenciaNeurotea) > 0) {
        const transferId = this.generateTransferId('paquete', p.id, fecha);
        transferencias.push({
          id: transferId,
          tipo: 'paquete',
          itemId: p.id,
          fecha: fecha,
          descripcion: p.paciente + ' - Paquete ' + p.sesionesTotal + ' sesiones',
          monto: parseInt(p.transferenciaNeurotea),
          confirmado: this.getEstado(transferId)
        });
      }
    });

    return transferencias;
  },

  /**
   * Obtiene transferencias pendientes
   */
  getPendientes: function(fecha) {
    return this.getByDate(fecha).filter(t => !t.confirmado);
  },

  /**
   * Obtiene transferencias confirmadas
   */
  getConfirmadas: function(fecha) {
    return this.getByDate(fecha).filter(t => t.confirmado);
  },

  /**
   * Confirma una transferencia
   */
  confirmar: function(transferId) {
    const existente = Database.getByColumn(SHEETS.ESTADOS_TRANSFERENCIA, 'id', transferId);

    if (existente.length > 0) {
      Database.update(SHEETS.ESTADOS_TRANSFERENCIA, existente[0].id, {
        confirmado: true,
        timestamp: getTimestamp()
      });
    } else {
      Database.insert(SHEETS.ESTADOS_TRANSFERENCIA, {
        id: transferId,
        confirmado: true,
        timestamp: getTimestamp()
      });
    }

    return resultado(true, { id: transferId, confirmado: true }, 'Transferencia confirmada');
  },

  /**
   * Revierte confirmacion de transferencia
   */
  revertir: function(transferId) {
    const existente = Database.getByColumn(SHEETS.ESTADOS_TRANSFERENCIA, 'id', transferId);

    if (existente.length > 0) {
      Database.update(SHEETS.ESTADOS_TRANSFERENCIA, existente[0].id, {
        confirmado: false,
        timestamp: getTimestamp()
      });
    } else {
      Database.insert(SHEETS.ESTADOS_TRANSFERENCIA, {
        id: transferId,
        confirmado: false,
        timestamp: getTimestamp()
      });
    }

    return resultado(true, { id: transferId, confirmado: false }, 'Confirmacion revertida');
  },

  /**
   * Toggle estado de transferencia
   */
  toggle: function(transferId) {
    const estadoActual = this.getEstado(transferId);

    if (estadoActual) {
      return this.revertir(transferId);
    } else {
      return this.confirmar(transferId);
    }
  },

  /**
   * Elimina estados de transferencia de un item
   */
  deleteByItem: function(tipo, itemId) {
    const sheet = getSheet(SHEETS.ESTADOS_TRANSFERENCIA);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('id');

    const prefix = tipo + '_' + itemId + '_';
    const rowsToDelete = [];

    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][idCol] && data[i][idCol].toString().startsWith(prefix)) {
        rowsToDelete.push(i + 1);
      }
    }

    // Eliminar de abajo hacia arriba para no afectar indices
    rowsToDelete.forEach(row => {
      sheet.deleteRow(row);
    });
  },

  /**
   * Obtiene resumen de transferencias
   */
  getResumen: function(fecha) {
    const todas = this.getByDate(fecha);
    const pendientes = todas.filter(t => !t.confirmado);
    const confirmadas = todas.filter(t => t.confirmado);

    return {
      total: todas.length,
      pendientes: pendientes.length,
      confirmadas: confirmadas.length,
      montoPendiente: pendientes.reduce((sum, t) => sum + t.monto, 0),
      montoConfirmado: confirmadas.reduce((sum, t) => sum + t.monto, 0)
    };
  }
};

// Funciones publicas
function confirmarTransferencia(transferId) {
  return TransferService.confirmar(transferId);
}

function revertirTransferencia(transferId) {
  return TransferService.revertir(transferId);
}

function getResumenTransferencias(fecha) {
  return TransferService.getResumen(fecha);
}
