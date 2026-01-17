/**
 * ===========================
 * SERVICIO DE GRUPOS
 * ===========================
 *
 * Crear archivo: "GroupService"
 */

const GroupService = {

  /**
   * Obtiene todos los grupos
   */
  getAll: function() {
    return Database.getAll(SHEETS.GRUPOS);
  },

  /**
   * Obtiene grupos activos
   */
  getActivos: function() {
    const all = this.getAll();
    return all.filter(g => g.estado === 'activo');
  },

  /**
   * Obtiene grupo por ID
   */
  getById: function(id) {
    return Database.getById(SHEETS.GRUPOS, id);
  },

  /**
   * Obtiene grupo por nombre
   */
  getByName: function(nombre) {
    const grupos = Database.getByColumn(SHEETS.GRUPOS, 'nombre', nombre);
    return grupos.length > 0 ? grupos[0] : null;
  },

  /**
   * Crea un nuevo grupo
   */
  create: function(groupData) {
    if (!groupData.nombre || groupData.nombre.trim() === '') {
      return resultado(false, null, 'El nombre del grupo es requerido');
    }

    // Verificar nombre unico
    const existing = this.getByName(groupData.nombre.trim());
    if (existing) {
      return resultado(false, null, 'Ya existe un grupo con ese nombre');
    }

    const ninos = groupData.ninos || [];
    if (ninos.length === 0) {
      return resultado(false, null, 'El grupo debe tener al menos un niño');
    }

    const grupo = Database.insert(SHEETS.GRUPOS, {
      nombre: groupData.nombre.trim(),
      porcentajeAporte: parseInt(groupData.porcentajeAporte) || 30,
      ninosJSON: JSON.stringify(ninos),
      estado: 'activo',
      creadoEn: getTimestamp()
    });

    return resultado(true, grupo, 'Grupo creado exitosamente');
  },

  /**
   * Actualiza un grupo
   */
  update: function(id, groupData) {
    const grupo = this.getById(id);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    const updateData = {};

    if (groupData.nombre !== undefined) {
      updateData.nombre = groupData.nombre.trim();
    }

    if (groupData.porcentajeAporte !== undefined) {
      updateData.porcentajeAporte = parseInt(groupData.porcentajeAporte) || 30;
    }

    if (groupData.ninos !== undefined) {
      updateData.ninosJSON = JSON.stringify(groupData.ninos);
    }

    Database.update(SHEETS.GRUPOS, id, updateData);

    return resultado(true, this.getById(id), 'Grupo actualizado');
  },

  /**
   * Agrega nino al grupo
   */
  addChild: function(groupId, child) {
    const grupo = this.getById(groupId);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    const ninos = grupo.ninosJSON || [];

    // Verificar duplicados
    if (ninos.some(n => n.nombre === child.nombre)) {
      return resultado(false, null, 'El niño ya está en el grupo');
    }

    ninos.push({
      nombre: child.nombre,
      terapeuta: child.terapeuta,
      valorSesion: parseInt(child.valorSesion) || 0
    });

    Database.update(SHEETS.GRUPOS, groupId, {
      ninosJSON: JSON.stringify(ninos)
    });

    return resultado(true, this.getById(groupId), 'Niño agregado al grupo');
  },

  /**
   * Elimina nino del grupo
   */
  removeChild: function(groupId, childName) {
    const grupo = this.getById(groupId);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    const ninos = (grupo.ninosJSON || []).filter(n => n.nombre !== childName);

    Database.update(SHEETS.GRUPOS, groupId, {
      ninosJSON: JSON.stringify(ninos)
    });

    return resultado(true, this.getById(groupId), 'Niño eliminado del grupo');
  },

  /**
   * Desactiva un grupo
   */
  deactivate: function(id) {
    const grupo = this.getById(id);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    Database.update(SHEETS.GRUPOS, id, { estado: 'inactivo' });

    return resultado(true, null, 'Grupo desactivado');
  },

  /**
   * Elimina un grupo
   */
  delete: function(id) {
    const grupo = this.getById(id);
    if (!grupo) {
      return resultado(false, null, 'Grupo no encontrado');
    }

    // Verificar si tiene sesiones asociadas
    const sesiones = Database.getByColumn(SHEETS.SESIONES_GRUPALES, 'grupoId', id);
    if (sesiones.length > 0) {
      return resultado(false, null, 'No se puede eliminar el grupo porque tiene sesiones registradas');
    }

    Database.delete(SHEETS.GRUPOS, id);

    return resultado(true, null, 'Grupo eliminado');
  }
};

// Funciones publicas
function crearGrupo(groupData) {
  return GroupService.create(groupData);
}

function actualizarGrupo(id, groupData) {
  return GroupService.update(id, groupData);
}

function eliminarGrupo(id) {
  return GroupService.delete(id);
}

function agregarNinoAGrupo(groupId, child) {
  return GroupService.addChild(groupId, child);
}

function eliminarNinoDeGrupo(groupId, childName) {
  return GroupService.removeChild(groupId, childName);
}
