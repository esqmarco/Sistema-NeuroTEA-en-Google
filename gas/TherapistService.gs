/**
 * ===========================
 * SERVICIO DE TERAPEUTAS
 * CRUD y operaciones de terapeutas
 * ===========================
 */

const TherapistService = {

  /**
   * Obtiene todos los terapeutas activos
   * @returns {Array<Object>} - Lista de terapeutas
   */
  getAll: function() {
    const records = Database.getAll(SHEETS.TERAPEUTAS);
    return records.filter(t => t.activo !== false);
  },

  /**
   * Obtiene todos los terapeutas (incluyendo inactivos)
   * @returns {Array<Object>} - Lista de terapeutas
   */
  getAllIncludingInactive: function() {
    return Database.getAll(SHEETS.TERAPEUTAS);
  },

  /**
   * Obtiene un terapeuta por ID
   * @param {number} id - ID del terapeuta
   * @returns {Object|null} - Terapeuta encontrado o null
   */
  getById: function(id) {
    return Database.getById(SHEETS.TERAPEUTAS, id);
  },

  /**
   * Obtiene un terapeuta por nombre
   * @param {string} nombre - Nombre del terapeuta
   * @returns {Object|null} - Terapeuta encontrado o null
   */
  getByName: function(nombre) {
    const records = Database.getByColumn(SHEETS.TERAPEUTAS, 'nombre', nombre);
    return records.length > 0 ? records[0] : null;
  },

  /**
   * Crea un nuevo terapeuta
   * @param {string} nombre - Nombre del terapeuta
   * @returns {Object} - Resultado de la operacion
   */
  create: function(nombre) {
    // Validar nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return resultado(false, null, 'El nombre del terapeuta es requerido');
    }

    nombre = nombre.trim();

    // Verificar si ya existe
    const existing = this.getByName(nombre);
    if (existing) {
      // Si existe pero esta inactivo, reactivar
      if (existing.activo === false) {
        Database.update(SHEETS.TERAPEUTAS, existing.id, {
          activo: true,
          actualizadoEn: getTimestamp()
        });
        return resultado(true, { ...existing, activo: true }, 'Terapeuta reactivado');
      }
      return resultado(false, null, 'Ya existe un terapeuta con ese nombre');
    }

    // Verificar limite de terapeutas
    const count = Database.count(SHEETS.TERAPEUTAS);
    if (count >= CONFIG.MAX_THERAPISTS) {
      return resultado(false, null, `Limite de ${CONFIG.MAX_THERAPISTS} terapeutas alcanzado`);
    }

    // Crear terapeuta
    const therapist = Database.insert(SHEETS.TERAPEUTAS, {
      nombre: nombre,
      activo: true,
      creadoEn: getTimestamp(),
      actualizadoEn: getTimestamp()
    });

    return resultado(true, therapist, 'Terapeuta creado exitosamente');
  },

  /**
   * Actualiza un terapeuta
   * @param {number} id - ID del terapeuta
   * @param {Object} updates - Datos a actualizar
   * @returns {Object} - Resultado de la operacion
   */
  update: function(id, updates) {
    const therapist = this.getById(id);
    if (!therapist) {
      return resultado(false, null, 'Terapeuta no encontrado');
    }

    // Si se actualiza el nombre, verificar que no exista
    if (updates.nombre && updates.nombre !== therapist.nombre) {
      const existing = this.getByName(updates.nombre);
      if (existing && existing.id !== id) {
        return resultado(false, null, 'Ya existe un terapeuta con ese nombre');
      }
    }

    updates.actualizadoEn = getTimestamp();
    const updated = Database.update(SHEETS.TERAPEUTAS, id, updates);

    return resultado(true, updated, 'Terapeuta actualizado exitosamente');
  },

  /**
   * Desactiva un terapeuta (soft delete)
   * @param {number} id - ID del terapeuta
   * @returns {Object} - Resultado de la operacion
   */
  deactivate: function(id) {
    const therapist = this.getById(id);
    if (!therapist) {
      return resultado(false, null, 'Terapeuta no encontrado');
    }

    Database.update(SHEETS.TERAPEUTAS, id, {
      activo: false,
      actualizadoEn: getTimestamp()
    });

    return resultado(true, null, 'Terapeuta desactivado exitosamente');
  },

  /**
   * Reactiva un terapeuta
   * @param {number} id - ID del terapeuta
   * @returns {Object} - Resultado de la operacion
   */
  reactivate: function(id) {
    const therapist = this.getById(id);
    if (!therapist) {
      return resultado(false, null, 'Terapeuta no encontrado');
    }

    Database.update(SHEETS.TERAPEUTAS, id, {
      activo: true,
      actualizadoEn: getTimestamp()
    });

    return resultado(true, null, 'Terapeuta reactivado exitosamente');
  },

  /**
   * Elimina un terapeuta permanentemente
   * Solo si no tiene registros asociados
   * @param {number} id - ID del terapeuta
   * @returns {Object} - Resultado de la operacion
   */
  delete: function(id) {
    const therapist = this.getById(id);
    if (!therapist) {
      return resultado(false, null, 'Terapeuta no encontrado');
    }

    // Verificar si tiene sesiones individuales
    const sessions = Database.getByColumn(SHEETS.SESIONES, 'terapeuta', therapist.nombre);
    if (sessions.length > 0) {
      return resultado(false, null, 'No se puede eliminar: tiene ' + sessions.length + ' sesiones registradas. Use desactivar en su lugar.');
    }

    // Verificar si tiene egresos (adelantos)
    const egresos = Database.getByColumn(SHEETS.EGRESOS, 'terapeuta', therapist.nombre);
    if (egresos.length > 0) {
      return resultado(false, null, 'No se puede eliminar: tiene ' + egresos.length + ' egresos registrados. Use desactivar en su lugar.');
    }

    // Verificar si tiene paquetes
    const paquetes = Database.getByColumn(SHEETS.PAQUETES, 'terapeuta', therapist.nombre);
    if (paquetes.length > 0) {
      return resultado(false, null, 'No se puede eliminar: tiene ' + paquetes.length + ' paquetes registrados. Use desactivar en su lugar.');
    }

    // Verificar si tiene creditos
    const creditos = Database.getByColumn(SHEETS.CREDITOS, 'terapeuta', therapist.nombre);
    if (creditos.length > 0) {
      return resultado(false, null, 'No se puede eliminar: tiene ' + creditos.length + ' creditos activos. Use desactivar en su lugar.');
    }

    // Verificar si participo en sesiones grupales
    const allGroupSessions = Database.getAll(SHEETS.SESIONES_GRUPALES);
    const groupParticipation = allGroupSessions.filter(gs => {
      const terapeutas = gs.terapeutasJSON || [];
      return terapeutas.includes(therapist.nombre);
    });
    if (groupParticipation.length > 0) {
      return resultado(false, null, 'No se puede eliminar: participo en ' + groupParticipation.length + ' sesiones grupales. Use desactivar en su lugar.');
    }

    // Verificar si tiene confirmaciones de rendicion
    const confirmaciones = Database.getByColumn(SHEETS.CONFIRMACIONES, 'terapeuta', therapist.nombre);
    if (confirmaciones.length > 0) {
      return resultado(false, null, 'No se puede eliminar: tiene ' + confirmaciones.length + ' confirmaciones de pago. Use desactivar en su lugar.');
    }

    // Eliminar permanentemente
    Database.delete(SHEETS.TERAPEUTAS, id);

    return resultado(true, null, 'Terapeuta eliminado permanentemente');
  },

  /**
   * Obtiene estadisticas de un terapeuta
   * @param {string} nombre - Nombre del terapeuta
   * @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
   * @returns {Object} - Estadisticas del terapeuta
   */
  getStats: function(nombre, fechaInicio, fechaFin) {
    const sessions = Database.getByColumn(SHEETS.SESIONES, 'terapeuta', nombre);
    const groupSessions = Database.getAll(SHEETS.SESIONES_GRUPALES);
    const packages = Database.getByColumn(SHEETS.PAQUETES, 'terapeuta', nombre);

    // Filtrar por rango de fechas si se proporciona
    let filteredSessions = sessions;
    let filteredGroupSessions = groupSessions.filter(gs => {
      const therapists = gs.terapeutasJSON || [];
      return therapists.includes(nombre);
    });

    if (fechaInicio && fechaFin) {
      filteredSessions = sessions.filter(s => s.fecha >= fechaInicio && s.fecha <= fechaFin);
      filteredGroupSessions = filteredGroupSessions.filter(gs =>
        gs.fecha >= fechaInicio && gs.fecha <= fechaFin
      );
    }

    // Calcular totales
    const totalSesionesIndividuales = filteredSessions.length;
    const totalSesionesGrupales = filteredGroupSessions.length;
    const totalHonorarios = filteredSessions.reduce((sum, s) => sum + (s.honorarios || 0), 0);
    const totalAporteNeurotea = filteredSessions.reduce((sum, s) => sum + (s.aporteNeurotea || 0), 0);
    const paquetesActivos = packages.filter(p => p.activo).length;

    return {
      nombre: nombre,
      totalSesionesIndividuales: totalSesionesIndividuales,
      totalSesionesGrupales: totalSesionesGrupales,
      totalSesiones: totalSesionesIndividuales + totalSesionesGrupales,
      totalHonorarios: totalHonorarios,
      totalAporteNeurotea: totalAporteNeurotea,
      paquetesActivos: paquetesActivos
    };
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Obtiene todos los terapeutas activos (para frontend)
 */
function getTerapeutas() {
  return TherapistService.getAll().map(t => t.nombre);
}

/**
 * Crea un nuevo terapeuta (para frontend)
 * @param {string} nombre - Nombre del terapeuta
 */
function crearTerapeuta(nombre) {
  return TherapistService.create(nombre);
}

/**
 * Desactiva un terapeuta (para frontend)
 * @param {string} nombre - Nombre del terapeuta
 */
function desactivarTerapeuta(nombre) {
  const therapist = TherapistService.getByName(nombre);
  if (!therapist) {
    return resultado(false, null, 'Terapeuta no encontrado');
  }
  return TherapistService.deactivate(therapist.id);
}

/**
 * Renombra un terapeuta (para frontend)
 * @param {string} nombreActual - Nombre actual del terapeuta
 * @param {string} nuevoNombre - Nuevo nombre del terapeuta
 */
function renombrarTerapeuta(nombreActual, nuevoNombre) {
  const therapist = TherapistService.getByName(nombreActual);
  if (!therapist) {
    return resultado(false, null, 'Terapeuta no encontrado');
  }

  // Actualizar el nombre en la tabla de terapeutas
  const updateResult = TherapistService.update(therapist.id, { nombre: nuevoNombre });

  if (!updateResult.success) {
    return updateResult;
  }

  // Actualizar nombre en sesiones
  const allSessions = Database.getByColumn(SHEETS.SESIONES, 'terapeuta', nombreActual);
  allSessions.forEach(session => {
    Database.update(SHEETS.SESIONES, session.id, { terapeuta: nuevoNombre });
  });

  // Actualizar nombre en egresos
  const allEgresos = Database.getByColumn(SHEETS.EGRESOS, 'terapeuta', nombreActual);
  allEgresos.forEach(egreso => {
    Database.update(SHEETS.EGRESOS, egreso.id, { terapeuta: nuevoNombre });
  });

  // Actualizar nombre en paquetes
  const allPaquetes = Database.getByColumn(SHEETS.PAQUETES, 'terapeuta', nombreActual);
  allPaquetes.forEach(paquete => {
    Database.update(SHEETS.PAQUETES, paquete.id, { terapeuta: nuevoNombre });
  });

  // Actualizar nombre en creditos
  const allCreditos = Database.getByColumn(SHEETS.CREDITOS, 'terapeuta', nombreActual);
  allCreditos.forEach(credito => {
    Database.update(SHEETS.CREDITOS, credito.id, { terapeuta: nuevoNombre });
  });

  // Actualizar nombre en confirmaciones
  const allConfirmaciones = Database.getByColumn(SHEETS.CONFIRMACIONES, 'terapeuta', nombreActual);
  allConfirmaciones.forEach(conf => {
    Database.update(SHEETS.CONFIRMACIONES, conf.id, { terapeuta: nuevoNombre });
  });

  return resultado(true, { nombreAnterior: nombreActual, nuevoNombre: nuevoNombre },
    'Terapeuta renombrado exitosamente en todos los registros');
}
