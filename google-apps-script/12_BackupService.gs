/**
 * ===========================
 * SERVICIO DE BACKUP
 * ===========================
 *
 * Crear archivo: "BackupService"
 */

const BackupService = {

  /**
   * Exporta todos los datos a JSON
   */
  exportAll: function() {
    try {
      const backup = {
        version: CONFIG.VERSION,
        fechaExport: getTimestamp(),
        data: {
          terapeutas: Database.getAll(SHEETS.TERAPEUTAS),
          sesiones: Database.getAll(SHEETS.SESIONES),
          sesionesGrupales: Database.getAll(SHEETS.SESIONES_GRUPALES),
          egresos: Database.getAll(SHEETS.EGRESOS),
          confirmaciones: Database.getAll(SHEETS.CONFIRMACIONES),
          paquetes: Database.getAll(SHEETS.PAQUETES),
          historialPaquetes: Database.getAll(SHEETS.HISTORIAL_PAQUETES),
          grupos: Database.getAll(SHEETS.GRUPOS),
          creditos: Database.getAll(SHEETS.CREDITOS),
          saldosIniciales: this.getSaldosIniciales(),
          historialSaldos: Database.getAll(SHEETS.HISTORIAL_SALDOS),
          estadosTransferencia: Database.getAll(SHEETS.ESTADOS_TRANSFERENCIA)
        }
      };

      return resultado(true, backup, 'Backup generado exitosamente');
    } catch (error) {
      Logger.log('Error en exportAll: ' + error.message);
      return resultado(false, null, 'Error al generar backup: ' + error.message);
    }
  },

  /**
   * Obtiene saldos iniciales (formato especial)
   */
  getSaldosIniciales: function() {
    const sheet = getSheet(SHEETS.SALDOS_INICIALES);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    const headers = data[0];
    const result = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = data[i][idx];
      });
      result.push(row);
    }

    return result;
  },

  /**
   * Importa datos desde JSON
   */
  importAll: function(backupData) {
    try {
      if (!backupData || !backupData.data) {
        return resultado(false, null, 'Formato de backup invalido');
      }

      const data = backupData.data;
      let importedCount = 0;

      // Limpiar hojas existentes
      this.clearAllData();

      // Importar cada tipo de datos
      if (data.terapeutas && data.terapeutas.length > 0) {
        data.terapeutas.forEach(item => this.insertRaw(SHEETS.TERAPEUTAS, item));
        importedCount += data.terapeutas.length;
      }

      if (data.sesiones && data.sesiones.length > 0) {
        data.sesiones.forEach(item => this.insertRaw(SHEETS.SESIONES, item));
        importedCount += data.sesiones.length;
      }

      if (data.sesionesGrupales && data.sesionesGrupales.length > 0) {
        data.sesionesGrupales.forEach(item => this.insertRaw(SHEETS.SESIONES_GRUPALES, item));
        importedCount += data.sesionesGrupales.length;
      }

      if (data.egresos && data.egresos.length > 0) {
        data.egresos.forEach(item => this.insertRaw(SHEETS.EGRESOS, item));
        importedCount += data.egresos.length;
      }

      if (data.confirmaciones && data.confirmaciones.length > 0) {
        data.confirmaciones.forEach(item => {
          // Convertir campos JSON si vienen como objetos
          if (item.flujo && typeof item.flujo === 'object') {
            item.flujoJSON = JSON.stringify(item.flujo);
            delete item.flujo;
          }
          if (item.estadoCongelado && typeof item.estadoCongelado === 'object') {
            item.estadoCongeladoJSON = JSON.stringify(item.estadoCongelado);
            delete item.estadoCongelado;
          }
          this.insertRaw(SHEETS.CONFIRMACIONES, item);
        });
        importedCount += data.confirmaciones.length;
      }

      if (data.paquetes && data.paquetes.length > 0) {
        data.paquetes.forEach(item => this.insertRaw(SHEETS.PAQUETES, item));
        importedCount += data.paquetes.length;
      }

      if (data.historialPaquetes && data.historialPaquetes.length > 0) {
        data.historialPaquetes.forEach(item => this.insertRaw(SHEETS.HISTORIAL_PAQUETES, item));
        importedCount += data.historialPaquetes.length;
      }

      if (data.grupos && data.grupos.length > 0) {
        data.grupos.forEach(item => {
          // Convertir ninos si viene como array
          if (item.ninos && Array.isArray(item.ninos)) {
            item.ninosJSON = JSON.stringify(item.ninos);
            delete item.ninos;
          }
          this.insertRaw(SHEETS.GRUPOS, item);
        });
        importedCount += data.grupos.length;
      }

      if (data.creditos && data.creditos.length > 0) {
        // Mapear patientCredits del formato antiguo
        data.creditos.forEach(item => this.insertRaw(SHEETS.CREDITOS, item));
        importedCount += data.creditos.length;
      }

      // Compatibilidad con formato antiguo (patientCredits)
      if (data.patientCredits && data.patientCredits.length > 0) {
        data.patientCredits.forEach(item => {
          this.insertRaw(SHEETS.CREDITOS, {
            id: item.id,
            paciente: item.paciente,
            terapeuta: item.terapeuta,
            paqueteId: item.purchaseId,
            total: item.total,
            restante: item.remaining,
            valorPorSesion: item.valuePerSession,
            fechaCompra: item.purchaseDate,
            estado: item.remaining > 0 ? 'activo' : 'agotado'
          });
        });
        importedCount += data.patientCredits.length;
      }

      if (data.saldosIniciales && data.saldosIniciales.length > 0) {
        data.saldosIniciales.forEach(item => this.insertRaw(SHEETS.SALDOS_INICIALES, item));
        importedCount += data.saldosIniciales.length;
      }

      // Compatibilidad con formato antiguo (saldos)
      if (data.saldos && data.saldos.length > 0) {
        data.saldos.forEach(item => {
          this.insertRaw(SHEETS.SALDOS_INICIALES, {
            fecha: item.fecha,
            efectivo: item.efectivo,
            actualizadoEn: item.actualizadoEn || getTimestamp()
          });
        });
        importedCount += data.saldos.length;
      }

      if (data.historialSaldos && data.historialSaldos.length > 0) {
        data.historialSaldos.forEach(item => this.insertRaw(SHEETS.HISTORIAL_SALDOS, item));
        importedCount += data.historialSaldos.length;
      }

      if (data.estadosTransferencia && data.estadosTransferencia.length > 0) {
        data.estadosTransferencia.forEach(item => this.insertRaw(SHEETS.ESTADOS_TRANSFERENCIA, item));
        importedCount += data.estadosTransferencia.length;
      }

      // Compatibilidad con transferConfirmationStates
      if (data.transferConfirmationStates && data.transferConfirmationStates.length > 0) {
        data.transferConfirmationStates.forEach(item => {
          this.insertRaw(SHEETS.ESTADOS_TRANSFERENCIA, {
            id: item.id,
            confirmado: item.confirmed,
            timestamp: item.timestamp
          });
        });
        importedCount += data.transferConfirmationStates.length;
      }

      return resultado(true, { importedCount: importedCount }, 'Datos importados: ' + importedCount + ' registros');
    } catch (error) {
      Logger.log('Error en importAll: ' + error.message);
      return resultado(false, null, 'Error al importar: ' + error.message);
    }
  },

  /**
   * Inserta un registro raw (respetando ID existente)
   */
  insertRaw: function(sheetName, data) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const row = headers.map(header => {
      if (data.hasOwnProperty(header)) {
        const value = data[header];
        // Serializar objetos/arrays a JSON
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      }
      return '';
    });

    sheet.appendRow(row);
  },

  /**
   * Limpia todos los datos (mantiene encabezados)
   */
  clearAllData: function() {
    const sheetsToClean = [
      SHEETS.TERAPEUTAS,
      SHEETS.SESIONES,
      SHEETS.SESIONES_GRUPALES,
      SHEETS.EGRESOS,
      SHEETS.CONFIRMACIONES,
      SHEETS.PAQUETES,
      SHEETS.HISTORIAL_PAQUETES,
      SHEETS.GRUPOS,
      SHEETS.CREDITOS,
      SHEETS.SALDOS_INICIALES,
      SHEETS.HISTORIAL_SALDOS,
      SHEETS.ESTADOS_TRANSFERENCIA
    ];

    sheetsToClean.forEach(sheetName => {
      try {
        const sheet = getSheet(sheetName);
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.deleteRows(2, lastRow - 1);
        }
      } catch (e) {
        Logger.log('Error limpiando ' + sheetName + ': ' + e.message);
      }
    });
  },

  /**
   * Exporta datos de un rango de fechas
   */
  exportByDateRange: function(fechaInicio, fechaFin) {
    try {
      const allSesiones = Database.getAll(SHEETS.SESIONES);
      const allGrupales = Database.getAll(SHEETS.SESIONES_GRUPALES);
      const allEgresos = Database.getAll(SHEETS.EGRESOS);
      const allPaquetes = Database.getAll(SHEETS.PAQUETES);

      const backup = {
        version: CONFIG.VERSION,
        fechaExport: getTimestamp(),
        rangoFechas: { inicio: fechaInicio, fin: fechaFin },
        data: {
          terapeutas: Database.getAll(SHEETS.TERAPEUTAS),
          sesiones: allSesiones.filter(s => s.fecha >= fechaInicio && s.fecha <= fechaFin),
          sesionesGrupales: allGrupales.filter(s => s.fecha >= fechaInicio && s.fecha <= fechaFin),
          egresos: allEgresos.filter(e => e.fecha >= fechaInicio && e.fecha <= fechaFin),
          paquetes: allPaquetes.filter(p => p.fecha >= fechaInicio && p.fecha <= fechaFin),
          grupos: Database.getAll(SHEETS.GRUPOS)
        }
      };

      return resultado(true, backup, 'Backup por rango generado');
    } catch (error) {
      return resultado(false, null, 'Error: ' + error.message);
    }
  },

  /**
   * Obtiene estadisticas del backup
   */
  getStats: function() {
    return {
      terapeutas: Database.count(SHEETS.TERAPEUTAS),
      sesiones: Database.count(SHEETS.SESIONES),
      sesionesGrupales: Database.count(SHEETS.SESIONES_GRUPALES),
      egresos: Database.count(SHEETS.EGRESOS),
      confirmaciones: Database.count(SHEETS.CONFIRMACIONES),
      paquetes: Database.count(SHEETS.PAQUETES),
      grupos: Database.count(SHEETS.GRUPOS),
      creditos: Database.count(SHEETS.CREDITOS)
    };
  }
};

// Funciones publicas
function exportarBackup() {
  return BackupService.exportAll();
}

function importarBackup(backupData) {
  return BackupService.importAll(backupData);
}

function limpiarTodosLosDatos() {
  BackupService.clearAllData();
  return resultado(true, null, 'Todos los datos han sido eliminados');
}

function getEstadisticasBackup() {
  return BackupService.getStats();
}
