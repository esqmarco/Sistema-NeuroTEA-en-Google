/**
 * ===========================
 * SERVICIO DE SESIONES GRUPALES
 * ===========================
 *
 * Crear archivo: "GroupSessionService"
 */

const GroupSessionService = {

  /**
   * Obtiene sesiones grupales por fecha
   */
  getByDate: function(fecha) {
    const sessions = Database.getByDate(SHEETS.SESIONES_GRUPALES, fecha);
    return sessions.map(s => ({
      ...s,
      asistencia: s.asistenciaJSON || [],
      terapeutas: s.terapeutasJSON || []
    }));
  },

  /**
   * Obtiene sesion grupal por ID
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
   * Registra una sesion grupal
   */
  create: function(sessionData) {
    if (!sessionData.fecha) {
      return resultado(false, null, 'La fecha es requerida');
    }
    if (!sessionData.grupoId) {
      return resultado(false, null, 'El grupo es requerido');
    }
    if (!sessionData.terapeutas || sessionData.terapeutas.length === 0) {
      return resultado(false, null, 'Debe haber al menos un terapeuta');
    }

    // Obtener info del grupo
    const grupo = GroupService.getById(sessionData.grupoId);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    // Calcular valores
    const asistencia = sessionData.asistencia || [];
    const presentes = asistencia.filter(a => a.presente);
    const cantidadTerapeutas = sessionData.terapeutas.length;
    const porcentajeAporte = grupo.porcentajeAporte || 30;

    // Valor total
    let valorTotal = 0;
    let efectivoTotal = 0;
    let transferenciaTotal = 0;

    presentes.forEach(a => {
      valorTotal += parseInt(a.valor) || 0;
      efectivoTotal += parseInt(a.efectivo) || 0;
      transferenciaTotal += parseInt(a.transferencia) || 0;
    });

    // Aporte NeuroTEA
    const aporteNeurotea = Math.floor(valorTotal * porcentajeAporte / 100);
    const honorariosTotales = Math.max(0, valorTotal - aporteNeurotea);

    // Division entre terapeutas
    const honorariosPorTerapeuta = Math.floor(honorariosTotales / cantidadTerapeutas);
    const residuoHonorarios = honorariosTotales - (honorariosPorTerapeuta * cantidadTerapeutas);

    // Crear sesion
    const session = Database.insert(SHEETS.SESIONES_GRUPALES, {
      fecha: sessionData.fecha,
      grupoId: sessionData.grupoId,
      grupoNombre: grupo.nombre,
      asistenciaJSON: asistencia,
      terapeutasJSON: sessionData.terapeutas,
      cantidadTerapeutas: cantidadTerapeutas,
      cantidadPresentes: presentes.length,
      valorTotal: valorTotal,
      porcentajeAporte: porcentajeAporte,
      aporteNeurotea: aporteNeurotea,
      honorariosTotales: honorariosTotales,
      honorariosPorTerapeuta: honorariosPorTerapeuta,
      residuoHonorarios: residuoHonorarios,
      efectivo: efectivoTotal,
      transferenciaNeurotea: transferenciaTotal,
      creadoEn: getTimestamp()
    });

    return resultado(true, {
      ...session,
      asistencia: asistencia,
      terapeutas: sessionData.terapeutas
    }, 'Sesion grupal registrada');
  },

  /**
   * Elimina sesion grupal
   */
  delete: function(id) {
    const session = this.getById(id);
    if (!session) {
      return resultado(false, null, 'Sesion grupal no encontrada');
    }

    Database.delete(SHEETS.SESIONES_GRUPALES, id);
    return resultado(true, null, 'Sesion grupal eliminada');
  },

  /**
   * Obtiene sesiones de un terapeuta
   */
  getByTherapist: function(terapeuta, fecha) {
    const sessions = this.getByDate(fecha);
    return sessions.filter(s => {
      const terapeutas = s.terapeutas || [];
      return terapeutas.includes(terapeuta);
    }).map(s => {
      // Calcular proporcion del terapeuta
      const terapeutas = s.terapeutas || [];
      const index = terapeutas.indexOf(terapeuta);
      const isFirst = index === 0;
      const count = terapeutas.length;

      const valorProp = Math.floor(s.valorTotal / count);
      const aporteProp = Math.floor(s.aporteNeurotea / count);
      const honorarios = s.honorariosPorTerapeuta + (isFirst ? s.residuoHonorarios : 0);

      return {
        ...s,
        therapistShare: {
          terapeuta: terapeuta,
          honorarios: honorarios,
          valorProporcional: valorProp + (isFirst ? s.valorTotal - (valorProp * count) : 0),
          aporteProporcional: aporteProp + (isFirst ? s.aporteNeurotea - (aporteProp * count) : 0)
        }
      };
    });
  },

  /**
   * Obtiene totales
   */
  getTotals: function(fecha) {
    const sessions = this.getByDate(fecha);
    return {
      totalSesiones: sessions.length,
      totalValor: sessions.reduce((sum, s) => sum + (s.valorTotal || 0), 0),
      totalAporteNeurotea: sessions.reduce((sum, s) => sum + (s.aporteNeurotea || 0), 0),
      totalHonorarios: sessions.reduce((sum, s) => sum + (s.honorariosTotales || 0), 0),
      totalEfectivo: sessions.reduce((sum, s) => sum + (s.efectivo || 0), 0),
      totalTransferencia: sessions.reduce((sum, s) => sum + (s.transferenciaNeurotea || 0), 0)
    };
  }
};

// Funciones publicas
function registrarSesionGrupal(sessionData) {
  return GroupSessionService.create(sessionData);
}

function eliminarSesionGrupal(id) {
  return GroupSessionService.delete(id);
}
