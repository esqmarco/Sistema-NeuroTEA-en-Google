/**
 * ===========================
 * SERVICIO DE SESIONES INDIVIDUALES
 * ===========================
 *
 * Crear archivo: "SessionService"
 */

const SessionService = {

  /**
   * Obtiene sesiones por fecha
   */
  getByDate: function(fecha) {
    return Database.getByDate(SHEETS.SESIONES, fecha);
  },

  /**
   * Obtiene sesiones por terapeuta y fecha
   */
  getByTherapistAndDate: function(terapeuta, fecha) {
    const all = this.getByDate(fecha);
    return all.filter(s => s.terapeuta === terapeuta);
  },

  /**
   * Registra una nueva sesion
   */
  create: function(sessionData) {
    // Validaciones
    if (!sessionData.fecha) {
      return resultado(false, null, 'La fecha es requerida');
    }
    if (!sessionData.terapeuta) {
      return resultado(false, null, 'El terapeuta es requerido');
    }
    if (!sessionData.paciente || sessionData.paciente.trim() === '') {
      return resultado(false, null, 'El paciente es requerido');
    }

    // Calcular valores
    const efectivo = parseInt(sessionData.efectivo) || 0;
    const transferenciaNeurotea = parseInt(sessionData.transferenciaNeurotea) || 0;
    const transferenciaTerminapeuta = parseInt(sessionData.transferenciaTerminapeuta) || 0;

    let valorSesion = efectivo + transferenciaNeurotea + transferenciaTerminapeuta;
    let aporteNeurotea = 0;
    let honorarios = 0;

    // Si usa credito, el valor es 0 (ya fue pagado)
    if (sessionData.usaCredito) {
      // Obtener valor del credito
      const creditoInfo = PackageService.getCreditosDisponibles(sessionData.paciente, sessionData.terapeuta);
      if (creditoInfo.length === 0) {
        return resultado(false, null, 'No hay creditos disponibles para este paciente');
      }

      // Usar credito
      const useResult = PackageService.usarCredito(sessionData.paciente, sessionData.terapeuta);
      if (!useResult.success) {
        return resultado(false, null, useResult.message);
      }

      valorSesion = 0;
      aporteNeurotea = 0;
      honorarios = 0;
    } else {
      // Calcular aporte segun tipo
      const tipoAporte = sessionData.tipoAporte || '30';

      if (tipoAporte === 'fixed') {
        aporteNeurotea = parseInt(sessionData.aporteNeurotea) || 0;
      } else {
        const porcentaje = parseInt(tipoAporte) || 30;
        aporteNeurotea = Math.floor(valorSesion * porcentaje / 100);
      }

      honorarios = Math.max(0, valorSesion - aporteNeurotea);
    }

    // Crear sesion
    const session = Database.insert(SHEETS.SESIONES, {
      fecha: sessionData.fecha,
      terapeuta: sessionData.terapeuta,
      paciente: sessionData.paciente.trim(),
      valorSesion: valorSesion,
      efectivo: efectivo,
      transferenciaNeurotea: transferenciaNeurotea,
      transferenciaTerminapeuta: transferenciaTerminapeuta,
      aporteNeurotea: aporteNeurotea,
      honorarios: honorarios,
      tipoAporte: sessionData.tipoAporte || '30',
      usaCredito: sessionData.usaCredito || false,
      paqueteId: sessionData.paqueteId || '',
      creadoEn: getTimestamp()
    });

    return resultado(true, session, 'Sesion registrada exitosamente');
  },

  /**
   * Elimina una sesion
   */
  delete: function(id) {
    const session = Database.getById(SHEETS.SESIONES, id);
    if (!session) {
      return resultado(false, null, 'Sesion no encontrada');
    }

    // Si uso credito, revertir
    if (session.usaCredito && session.paqueteId) {
      PackageService.revertirCredito(session.paciente, session.terapeuta, session.paqueteId);
    }

    Database.delete(SHEETS.SESIONES, id);
    return resultado(true, null, 'Sesion eliminada');
  },

  /**
   * Elimina sesiones por fecha
   */
  deleteByDate: function(fecha) {
    // Primero revertir creditos
    const sessions = this.getByDate(fecha);
    sessions.forEach(s => {
      if (s.usaCredito && s.paqueteId) {
        PackageService.revertirCredito(s.paciente, s.terapeuta, s.paqueteId);
      }
    });

    const deleted = Database.deleteByColumn(SHEETS.SESIONES, 'fecha', fecha);
    return resultado(true, { count: deleted }, deleted + ' sesiones eliminadas');
  },

  /**
   * Obtiene totales por fecha
   */
  getTotals: function(fecha) {
    const sessions = this.getByDate(fecha);

    return {
      totalSesiones: sessions.length,
      totalValor: sessions.reduce((sum, s) => sum + (s.valorSesion || 0), 0),
      totalEfectivo: sessions.reduce((sum, s) => sum + (s.efectivo || 0), 0),
      totalTransferenciaNeurotea: sessions.reduce((sum, s) => sum + (s.transferenciaNeurotea || 0), 0),
      totalAporteNeurotea: sessions.reduce((sum, s) => sum + (s.aporteNeurotea || 0), 0),
      totalHonorarios: sessions.reduce((sum, s) => sum + (s.honorarios || 0), 0),
      sesionesConCredito: sessions.filter(s => s.usaCredito).length
    };
  }
};

// Funciones publicas para frontend
function registrarSesion(sessionData) {
  return SessionService.create(sessionData);
}

function eliminarSesion(id) {
  return SessionService.delete(id);
}

function getSesionesPorFecha(fecha) {
  return SessionService.getByDate(fecha);
}
