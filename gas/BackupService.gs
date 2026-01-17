/**
 * ===========================
 * SERVICIO DE BACKUP Y RESTAURACION
 * Import/Export de datos
 * ===========================
 */

const BackupService = {

  /**
   * Genera un backup completo del sistema
   * @returns {Object} - Datos de backup
   */
  createFullBackup: function() {
    const backupData = {
      backupInfo: {
        type: 'full_backup',
        createdAt: getTimestamp(),
        version: '1.0.0',
        spreadsheetId: CONFIG.SPREADSHEET_ID
      },

      // Datos de todas las hojas
      therapists: Database.getAll(SHEETS.TERAPEUTAS),
      sessions: Database.getAll(SHEETS.SESIONES),
      groupSessions: Database.getAll(SHEETS.SESIONES_GRUPALES),
      egresos: Database.getAll(SHEETS.EGRESOS),
      confirmaciones: Database.getAll(SHEETS.CONFIRMACIONES),
      paquetes: Database.getAll(SHEETS.PAQUETES),
      historialPaquetes: Database.getAll(SHEETS.HISTORIAL_PAQUETES),
      grupos: Database.getAll(SHEETS.GRUPOS),
      creditos: Database.getAll(SHEETS.CREDITOS),
      saldosIniciales: Database.getAll(SHEETS.SALDOS_INICIALES),
      historialSaldos: Database.getAll(SHEETS.HISTORIAL_SALDOS),
      estadosTransferencia: Database.getAll(SHEETS.ESTADOS_TRANSFERENCIA),
      configuracion: Database.getAll(SHEETS.CONFIGURACION)
    };

    return resultado(true, backupData, 'Backup generado exitosamente');
  },

  /**
   * Exporta datos de un dia especifico
   * @param {string} fecha - Fecha a exportar
   * @returns {Object} - Datos del dia
   */
  exportDayData: function(fecha) {
    const exportData = {
      exportInfo: {
        type: 'day_data',
        fecha: fecha,
        exportedAt: getTimestamp(),
        version: '1.0.0'
      },

      // Datos del dia
      sessions: SessionService.getByDate(fecha),
      groupSessions: GroupSessionService.getByDate(fecha),
      egresos: EgresoService.getByDate(fecha),
      confirmaciones: RendicionService.getConfirmaciones(fecha),
      saldoInicial: RendicionService.getSaldoInicial(fecha),

      // Paquetes comprados ese dia
      paquetes: PackageService.getByDate(fecha),

      // Estados de transferencia del dia
      estadosTransferencia: TransferService.getEstados(fecha),

      // Datos globales para sincronizacion
      syncData: {
        therapists: TherapistService.getAll(),
        grupos: GroupService.getActive(),
        paquetesActivos: PackageService.getActive(),
        creditos: Database.getAll(SHEETS.CREDITOS),
        historialPaquetes: PackageService.getHistory()
      }
    };

    return resultado(true, exportData, 'Datos del dia exportados');
  },

  /**
   * Importa datos de un dia
   * @param {Object} importData - Datos a importar
   * @param {string} mode - Modo: 'merge' o 'overwrite'
   * @returns {Object} - Resultado
   */
  importDayData: function(importData, mode) {
    // Validar estructura
    if (!importData.exportInfo || importData.exportInfo.type !== 'day_data') {
      return resultado(false, null, 'Formato de datos invalido');
    }

    const fecha = importData.exportInfo.fecha;
    mode = mode || 'merge';

    return Database.transaction(() => {
      try {
        // Si es overwrite, eliminar datos existentes del dia
        if (mode === 'overwrite') {
          SessionService.deleteByDate(fecha);
          GroupSessionService.deleteByDate(fecha);
          EgresoService.deleteByDate(fecha);
          Database.deleteByColumn(SHEETS.CONFIRMACIONES, 'fecha', fecha);
        }

        // Importar sesiones
        if (importData.sessions && Array.isArray(importData.sessions)) {
          importData.sessions.forEach(session => {
            // Verificar si existe (por ID)
            const existing = SessionService.getById(session.id);
            if (!existing) {
              Database.insert(SHEETS.SESIONES, session);
            }
          });
        }

        // Importar sesiones grupales
        if (importData.groupSessions && Array.isArray(importData.groupSessions)) {
          importData.groupSessions.forEach(gs => {
            const existing = GroupSessionService.getById(gs.id);
            if (!existing) {
              Database.insert(SHEETS.SESIONES_GRUPALES, {
                ...gs,
                asistenciaJSON: gs.asistencia || gs.asistenciaJSON,
                terapeutasJSON: gs.terapeutas || gs.terapeutasJSON
              });
            }
          });
        }

        // Importar egresos
        if (importData.egresos && Array.isArray(importData.egresos)) {
          importData.egresos.forEach(egreso => {
            const existing = EgresoService.getById(egreso.id);
            if (!existing) {
              Database.insert(SHEETS.EGRESOS, egreso);
            }
          });
        }

        // Importar confirmaciones
        if (importData.confirmaciones && Array.isArray(importData.confirmaciones)) {
          importData.confirmaciones.forEach(conf => {
            const existing = RendicionService.getConfirmacion(conf.terapeuta, fecha);
            if (!existing) {
              Database.insert(SHEETS.CONFIRMACIONES, {
                ...conf,
                flujoJSON: conf.flujo || conf.flujoJSON,
                estadoCongeladoJSON: conf.estadoCongelado || conf.estadoCongeladoJSON
              });
            }
          });
        }

        // Importar saldo inicial
        if (importData.saldoInicial !== undefined) {
          RendicionService.setSaldoInicial(fecha, importData.saldoInicial);
        }

        // Sincronizar datos globales si existen
        if (importData.syncData) {
          this.syncGlobalData(importData.syncData);
        }

        return resultado(true, null, `Datos del dia ${fecha} importados exitosamente`);

      } catch (error) {
        Logger.log('Error importando datos: ' + error.message);
        return resultado(false, null, 'Error al importar: ' + error.message);
      }
    });
  },

  /**
   * Sincroniza datos globales
   * @param {Object} syncData - Datos a sincronizar
   */
  syncGlobalData: function(syncData) {
    // Sincronizar terapeutas
    if (syncData.therapists) {
      syncData.therapists.forEach(t => {
        const existing = TherapistService.getByName(t.nombre);
        if (!existing) {
          TherapistService.create(t.nombre);
        }
      });
    }

    // Sincronizar grupos
    if (syncData.grupos) {
      syncData.grupos.forEach(g => {
        const existing = GroupService.getByName(g.nombre);
        if (!existing) {
          GroupService.create({
            nombre: g.nombre,
            porcentajeAporte: g.porcentajeAporte,
            ninos: g.ninos || g.ninosJSON || []
          });
        }
      });
    }
  },

  /**
   * Restaura un backup completo
   * @param {Object} backupData - Datos de backup
   * @returns {Object} - Resultado
   */
  restoreFullBackup: function(backupData) {
    // Validar estructura
    if (!backupData.backupInfo || backupData.backupInfo.type !== 'full_backup') {
      return resultado(false, null, 'Formato de backup invalido');
    }

    return Database.transaction(() => {
      try {
        // Limpiar todas las hojas (excepto configuracion)
        const sheetsToClear = [
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

        sheetsToClear.forEach(sheetName => {
          const sheet = getSheet(sheetName);
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet.deleteRows(2, lastRow - 1);
          }
        });

        // Restaurar cada coleccion
        const collections = [
          { key: 'therapists', sheet: SHEETS.TERAPEUTAS },
          { key: 'sessions', sheet: SHEETS.SESIONES },
          { key: 'groupSessions', sheet: SHEETS.SESIONES_GRUPALES },
          { key: 'egresos', sheet: SHEETS.EGRESOS },
          { key: 'confirmaciones', sheet: SHEETS.CONFIRMACIONES },
          { key: 'paquetes', sheet: SHEETS.PAQUETES },
          { key: 'historialPaquetes', sheet: SHEETS.HISTORIAL_PAQUETES },
          { key: 'grupos', sheet: SHEETS.GRUPOS },
          { key: 'creditos', sheet: SHEETS.CREDITOS },
          { key: 'saldosIniciales', sheet: SHEETS.SALDOS_INICIALES },
          { key: 'historialSaldos', sheet: SHEETS.HISTORIAL_SALDOS },
          { key: 'estadosTransferencia', sheet: SHEETS.ESTADOS_TRANSFERENCIA }
        ];

        collections.forEach(col => {
          const data = backupData[col.key];
          if (data && Array.isArray(data)) {
            data.forEach(record => {
              Database.insert(col.sheet, record);
            });
          }
        });

        return resultado(true, null, 'Backup restaurado exitosamente');

      } catch (error) {
        Logger.log('Error restaurando backup: ' + error.message);
        return resultado(false, null, 'Error al restaurar: ' + error.message);
      }
    });
  },

  /**
   * Limpia datos antiguos
   * @param {number} diasMantener - Dias de datos a mantener
   * @returns {Object} - Resultado
   */
  cleanOldData: function(diasMantener) {
    diasMantener = diasMantener || 365; // Default: 1 año

    const deleted = {
      sesiones: Database.cleanOldRecords(SHEETS.SESIONES, 'fecha', diasMantener),
      sesionesGrupales: Database.cleanOldRecords(SHEETS.SESIONES_GRUPALES, 'fecha', diasMantener),
      egresos: Database.cleanOldRecords(SHEETS.EGRESOS, 'fecha', diasMantener),
      confirmaciones: Database.cleanOldRecords(SHEETS.CONFIRMACIONES, 'fecha', diasMantener)
    };

    const total = deleted.sesiones + deleted.sesionesGrupales + deleted.egresos + deleted.confirmaciones;

    return resultado(true, deleted, `${total} registros antiguos eliminados`);
  },

  /**
   * Obtiene estadisticas del sistema
   * @returns {Object} - Estadisticas
   */
  getSystemStats: function() {
    return {
      totalTerapeutas: Database.count(SHEETS.TERAPEUTAS),
      totalSesiones: Database.count(SHEETS.SESIONES),
      totalSesionesGrupales: Database.count(SHEETS.SESIONES_GRUPALES),
      totalEgresos: Database.count(SHEETS.EGRESOS),
      totalPaquetesActivos: PackageService.getActive().length,
      totalGruposActivos: GroupService.getActive().length,
      totalHistorialPaquetes: Database.count(SHEETS.HISTORIAL_PAQUETES),
      ultimaActualizacion: getTimestamp()
    };
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Crea backup completo (para frontend)
 */
function crearBackupCompleto() {
  return BackupService.createFullBackup();
}

/**
 * Exporta datos de un dia (para frontend)
 */
function exportarDatosDia(fecha) {
  return BackupService.exportDayData(fecha);
}

/**
 * Importa datos de un dia (para frontend)
 */
function importarDatosDia(importData, mode) {
  return BackupService.importDayData(importData, mode);
}

/**
 * Restaura backup completo (para frontend)
 */
function restaurarBackupCompleto(backupData) {
  return BackupService.restoreFullBackup(backupData);
}

/**
 * Obtiene estadisticas del sistema (para frontend)
 */
function getEstadisticasSistema() {
  return BackupService.getSystemStats();
}
