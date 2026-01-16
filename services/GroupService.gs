/**
 * ===========================
 * SERVICIO DE GRUPOS DE TERAPIA
 * Configuracion de grupos fijos para terapia grupal
 * ===========================
 */

const GroupService = {

  /**
   * Obtiene todos los grupos activos
   * @returns {Array<Object>} - Grupos activos
   */
  getActive: function() {
    const groups = Database.getAll(SHEETS.GRUPOS);
    return groups.filter(g => g.estado === 'active').map(g => ({
      ...g,
      ninos: g.ninosJSON || []
    }));
  },

  /**
   * Obtiene todos los grupos (incluyendo inactivos)
   * @returns {Array<Object>} - Todos los grupos
   */
  getAll: function() {
    const groups = Database.getAll(SHEETS.GRUPOS);
    return groups.map(g => ({
      ...g,
      ninos: g.ninosJSON || []
    }));
  },

  /**
   * Obtiene un grupo por ID
   * @param {number|string} id - ID del grupo
   * @returns {Object|null} - Grupo encontrado
   */
  getById: function(id) {
    const group = Database.getById(SHEETS.GRUPOS, id);
    if (group) {
      group.ninos = group.ninosJSON || [];
    }
    return group;
  },

  /**
   * Obtiene un grupo por nombre
   * @param {string} nombre - Nombre del grupo
   * @returns {Object|null} - Grupo encontrado
   */
  getByName: function(nombre) {
    const groups = Database.getByColumn(SHEETS.GRUPOS, 'nombre', nombre);
    if (groups.length > 0) {
      const group = groups[0];
      group.ninos = group.ninosJSON || [];
      return group;
    }
    return null;
  },

  /**
   * Crea un nuevo grupo
   * @param {Object} groupData - Datos del grupo
   * @returns {Object} - Resultado
   */
  create: function(groupData) {
    // Validaciones
    if (!groupData.nombre) {
      return resultado(false, null, 'El nombre del grupo es requerido');
    }
    if (!groupData.ninos || groupData.ninos.length === 0) {
      return resultado(false, null, 'Debe agregar al menos un nino al grupo');
    }

    // Verificar nombre unico
    const existing = this.getByName(groupData.nombre);
    if (existing) {
      return resultado(false, null, 'Ya existe un grupo con ese nombre');
    }

    // Validar estructura de ninos
    const ninosValidados = groupData.ninos.map(nino => ({
      nombre: nino.nombre || '',
      valor: parseInt(nino.valor) || 0,
      terapeuta: nino.terapeuta || ''
    }));

    // Calcular valor maximo total
    const valorMaximoTotal = ninosValidados.reduce((sum, n) => sum + n.valor, 0);

    // Preparar datos
    const group = {
      nombre: groupData.nombre.trim(),
      porcentajeAporte: parseInt(groupData.porcentajeAporte) || 30,
      ninosJSON: ninosValidados,
      valorMaximoTotal: valorMaximoTotal,
      estado: 'active',
      creadoEn: getTimestamp(),
      actualizadoEn: getTimestamp()
    };

    const inserted = Database.insert(SHEETS.GRUPOS, group);

    return resultado(true, {
      ...inserted,
      ninos: ninosValidados
    }, 'Grupo creado exitosamente');
  },

  /**
   * Actualiza un grupo
   * @param {number|string} id - ID del grupo
   * @param {Object} updates - Datos a actualizar
   * @returns {Object} - Resultado
   */
  update: function(id, updates) {
    const group = this.getById(id);
    if (!group) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    // Si se actualiza el nombre, verificar unicidad
    if (updates.nombre && updates.nombre !== group.nombre) {
      const existing = this.getByName(updates.nombre);
      if (existing && existing.id !== id) {
        return resultado(false, null, 'Ya existe un grupo con ese nombre');
      }
    }

    // Si se actualizan los ninos, convertir a JSON y recalcular valor
    if (updates.ninos) {
      updates.ninosJSON = updates.ninos;
      updates.valorMaximoTotal = updates.ninos.reduce((sum, n) => sum + (parseInt(n.valor) || 0), 0);
      delete updates.ninos;
    }

    updates.actualizadoEn = getTimestamp();

    const updated = Database.update(SHEETS.GRUPOS, id, updates);

    return resultado(true, {
      ...updated,
      ninos: updated.ninosJSON || []
    }, 'Grupo actualizado');
  },

  /**
   * Desactiva un grupo
   * @param {number|string} id - ID del grupo
   * @returns {Object} - Resultado
   */
  deactivate: function(id) {
    const group = this.getById(id);
    if (!group) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    Database.update(SHEETS.GRUPOS, id, {
      estado: 'inactive',
      actualizadoEn: getTimestamp()
    });

    return resultado(true, null, 'Grupo desactivado');
  },

  /**
   * Reactiva un grupo
   * @param {number|string} id - ID del grupo
   * @returns {Object} - Resultado
   */
  reactivate: function(id) {
    const group = this.getById(id);
    if (!group) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    Database.update(SHEETS.GRUPOS, id, {
      estado: 'active',
      actualizadoEn: getTimestamp()
    });

    return resultado(true, null, 'Grupo reactivado');
  },

  /**
   * Elimina un grupo permanentemente
   * @param {number|string} id - ID del grupo
   * @returns {Object} - Resultado
   */
  delete: function(id) {
    const group = this.getById(id);
    if (!group) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    // Verificar si tiene sesiones
    const sessions = Database.getByColumn(SHEETS.SESIONES_GRUPALES, 'grupoId', id);
    if (sessions.length > 0) {
      return resultado(false, null, 'No se puede eliminar: tiene sesiones registradas. Use desactivar en su lugar.');
    }

    Database.delete(SHEETS.GRUPOS, id);
    return resultado(true, null, 'Grupo eliminado permanentemente');
  },

  /**
   * Agrega un nino a un grupo
   * @param {number|string} grupoId - ID del grupo
   * @param {Object} ninoData - Datos del nino
   * @returns {Object} - Resultado
   */
  addChild: function(grupoId, ninoData) {
    const group = this.getById(grupoId);
    if (!group) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    const ninos = group.ninos || [];

    // Verificar que no exista
    const exists = ninos.some(n => n.nombre === ninoData.nombre);
    if (exists) {
      return resultado(false, null, 'El nino ya esta en el grupo');
    }

    ninos.push({
      nombre: ninoData.nombre,
      valor: parseInt(ninoData.valor) || 0,
      terapeuta: ninoData.terapeuta || ''
    });

    return this.update(grupoId, { ninos: ninos });
  },

  /**
   * Remueve un nino de un grupo
   * @param {number|string} grupoId - ID del grupo
   * @param {string} nombreNino - Nombre del nino
   * @returns {Object} - Resultado
   */
  removeChild: function(grupoId, nombreNino) {
    const group = this.getById(grupoId);
    if (!group) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    const ninos = (group.ninos || []).filter(n => n.nombre !== nombreNino);

    if (ninos.length === group.ninos.length) {
      return resultado(false, null, 'Nino no encontrado en el grupo');
    }

    return this.update(grupoId, { ninos: ninos });
  },

  /**
   * Obtiene estadisticas de un grupo
   * @param {number|string} grupoId - ID del grupo
   * @returns {Object} - Estadisticas
   */
  getStats: function(grupoId) {
    const group = this.getById(grupoId);
    if (!group) return null;

    const sessions = Database.getByColumn(SHEETS.SESIONES_GRUPALES, 'grupoId', grupoId);

    return {
      id: group.id,
      nombre: group.nombre,
      cantidadNinos: (group.ninos || []).length,
      totalSesiones: sessions.length,
      totalValor: sessions.reduce((sum, s) => sum + (s.valorTotal || 0), 0),
      totalAporte: sessions.reduce((sum, s) => sum + (s.aporteNeurotea || 0), 0)
    };
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Crea un grupo (para frontend)
 */
function crearGrupo(groupData) {
  return GroupService.create(groupData);
}

/**
 * Obtiene grupos activos (para frontend)
 */
function getGruposActivos() {
  return GroupService.getActive();
}

/**
 * Actualiza un grupo (para frontend)
 */
function actualizarGrupo(id, updates) {
  return GroupService.update(id, updates);
}

/**
 * Elimina un grupo (para frontend)
 */
function eliminarGrupo(id) {
  return GroupService.delete(id);
}

/**
 * Desactiva un grupo (para frontend)
 */
function desactivarGrupo(id) {
  return GroupService.deactivate(id);
}
