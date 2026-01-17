/**
 * ===========================
 * SERVICIO DE TERAPEUTAS
 * ===========================
 *
 * Crear archivo: "TherapistService"
 */

const TherapistService = {

  /**
   * Obtiene todos los terapeutas activos
   */
  getAll: function() {
    const all = Database.getAll(SHEETS.TERAPEUTAS);
    return all.filter(t => t.activo !== false).map(t => t.nombre).sort();
  },

  /**
   * Obtiene terapeuta por nombre
   */
  getByName: function(nombre) {
    const all = Database.getAll(SHEETS.TERAPEUTAS);
    return all.find(t => t.nombre === nombre) || null;
  },

  /**
   * Crea un nuevo terapeuta
   */
  create: function(nombre) {
    if (!nombre || nombre.trim() === '') {
      return resultado(false, null, 'El nombre es requerido');
    }

    nombre = nombre.trim();

    // Verificar si ya existe
    const existing = this.getByName(nombre);
    if (existing) {
      if (existing.activo === false) {
        // Reactivar
        Database.update(SHEETS.TERAPEUTAS, existing.id, { activo: true });
        return resultado(true, existing, 'Terapeuta reactivado');
      }
      return resultado(false, null, 'El terapeuta ya existe');
    }

    const terapeuta = Database.insert(SHEETS.TERAPEUTAS, {
      nombre: nombre,
      activo: true,
      creadoEn: getTimestamp()
    });

    return resultado(true, terapeuta, 'Terapeuta creado exitosamente');
  },

  /**
   * Desactiva un terapeuta
   */
  deactivate: function(nombre) {
    const terapeuta = this.getByName(nombre);
    if (!terapeuta) {
      return resultado(false, null, 'Terapeuta no encontrado');
    }

    Database.update(SHEETS.TERAPEUTAS, terapeuta.id, { activo: false });
    return resultado(true, null, 'Terapeuta desactivado');
  },

  /**
   * Elimina un terapeuta permanentemente
   */
  delete: function(nombre) {
    const terapeuta = this.getByName(nombre);
    if (!terapeuta) {
      return resultado(false, null, 'Terapeuta no encontrado');
    }

    Database.delete(SHEETS.TERAPEUTAS, terapeuta.id);
    return resultado(true, null, 'Terapeuta eliminado');
  }
};

// Funciones publicas para frontend
function crearTerapeuta(nombre) {
  return TherapistService.create(nombre);
}

function desactivarTerapeuta(nombre) {
  return TherapistService.deactivate(nombre);
}

function eliminarTerapeuta(nombre) {
  return TherapistService.delete(nombre);
}
