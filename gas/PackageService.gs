/**
 * ===========================
 * SERVICIO DE PAQUETES Y CREDITOS
 * Gestion de paquetes de sesiones prepagadas
 * ===========================
 */

const PackageService = {

  /**
   * Obtiene todos los paquetes activos
   * @returns {Array<Object>} - Paquetes activos
   */
  getActive: function() {
    const packages = Database.getAll(SHEETS.PAQUETES);
    return packages.filter(p => p.activo === true);
  },

  /**
   * Obtiene paquetes por terapeuta
   * @param {string} terapeuta - Nombre del terapeuta
   * @returns {Array<Object>} - Paquetes
   */
  getByTherapist: function(terapeuta) {
    const packages = Database.getByColumn(SHEETS.PAQUETES, 'terapeuta', terapeuta);
    return packages.filter(p => p.activo === true);
  },

  /**
   * Obtiene un paquete por ID
   * @param {number} id - ID del paquete
   * @returns {Object|null} - Paquete encontrado
   */
  getById: function(id) {
    return Database.getById(SHEETS.PAQUETES, id);
  },

  /**
   * Crea un nuevo paquete de sesiones
   * @param {Object} packageData - Datos del paquete
   * @returns {Object} - Resultado
   */
  create: function(packageData) {
    // Validaciones
    if (!packageData.paciente) {
      return resultado(false, null, 'El nombre del paciente es requerido');
    }
    if (!packageData.terapeuta) {
      return resultado(false, null, 'El terapeuta es requerido');
    }
    if (!packageData.sesionesTotal || packageData.sesionesTotal < 1) {
      return resultado(false, null, 'La cantidad de sesiones debe ser al menos 1');
    }

    // Calcular valores
    const efectivo = parseInt(packageData.efectivo) || 0;
    const transferenciaNeurotea = parseInt(packageData.transferenciaNeurotea) || 0;
    const transferenciaTerminapeuta = parseInt(packageData.transferenciaTerminapeuta) || 0;
    const valorTotal = efectivo + transferenciaNeurotea + transferenciaTerminapeuta;

    // Calcular aporte NeuroTEA
    let aporteNeurotea = 0;
    const tipoAporte = packageData.tipoAporte || '30';

    if (tipoAporte === 'fixed') {
      aporteNeurotea = parseInt(packageData.aporteNeurotea) || 0;
    } else {
      const porcentaje = parseInt(tipoAporte) || 30;
      aporteNeurotea = Math.round(valorTotal * porcentaje / 100);
    }

    // Preparar datos del paquete
    const pkg = {
      fechaCompra: packageData.fecha || getFechaActual(),
      paciente: packageData.paciente.trim(),
      terapeuta: packageData.terapeuta,
      sesionesTotal: parseInt(packageData.sesionesTotal),
      sesionesRestantes: parseInt(packageData.sesionesTotal),
      valorTotal: valorTotal,
      efectivo: efectivo,
      transferenciaNeurotea: transferenciaNeurotea,
      transferenciaTerminapeuta: transferenciaTerminapeuta,
      aporteNeurotea: aporteNeurotea,
      tipoAporte: tipoAporte,
      activo: true,
      creadoEn: getTimestamp()
    };

    const inserted = Database.insert(SHEETS.PAQUETES, pkg);

    // Crear creditos asociados
    this.createCredits(inserted.id, pkg.paciente, pkg.terapeuta, pkg.sesionesTotal, pkg.fechaCompra);

    return resultado(true, inserted, 'Paquete creado exitosamente');
  },

  /**
   * Crea creditos para un paquete
   * @param {number} paqueteId - ID del paquete
   * @param {string} paciente - Nombre del paciente
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {number} cantidad - Cantidad de creditos
   * @param {string} fechaCompra - Fecha de compra
   */
  createCredits: function(paqueteId, paciente, terapeuta, cantidad, fechaCompra) {
    Database.insert(SHEETS.CREDITOS, {
      paciente: paciente,
      terapeuta: terapeuta,
      paqueteId: paqueteId,
      total: cantidad,
      restante: cantidad,
      fechaCompra: fechaCompra,
      creadoEn: getTimestamp()
    });
  },

  /**
   * Usa un credito de un paquete
   * @param {number} paqueteId - ID del paquete
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} paciente - Nombre del paciente
   * @returns {Object} - Resultado
   */
  useCredit: function(paqueteId, terapeuta, paciente) {
    // Buscar credito
    const creditos = Database.getAll(SHEETS.CREDITOS);
    const credito = creditos.find(c =>
      c.paqueteId == paqueteId &&
      c.terapeuta === terapeuta &&
      c.paciente === paciente &&
      c.restante > 0
    );

    if (!credito) {
      return resultado(false, null, 'No hay creditos disponibles');
    }

    // Decrementar credito
    const nuevoRestante = credito.restante - 1;
    Database.update(SHEETS.CREDITOS, credito.id, { restante: nuevoRestante });

    // Actualizar paquete
    const pkg = this.getById(paqueteId);
    if (pkg) {
      const nuevasRestantes = pkg.sesionesRestantes - 1;
      Database.update(SHEETS.PAQUETES, paqueteId, { sesionesRestantes: nuevasRestantes });

      // Si se acabaron las sesiones, mover a historial
      if (nuevasRestantes <= 0) {
        this.moveToHistory(paqueteId);
      }
    }

    return resultado(true, { restante: nuevoRestante }, 'Credito usado');
  },

  /**
   * Revierte el uso de un credito
   * @param {number} paqueteId - ID del paquete
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} paciente - Nombre del paciente
   * @returns {Object} - Resultado
   */
  revertCredit: function(paqueteId, terapeuta, paciente) {
    // Buscar credito
    const creditos = Database.getAll(SHEETS.CREDITOS);
    const credito = creditos.find(c =>
      c.paqueteId == paqueteId &&
      c.terapeuta === terapeuta &&
      c.paciente === paciente
    );

    if (!credito) {
      // Verificar en historial y restaurar si es necesario
      return this.restoreFromHistory(paqueteId, terapeuta, paciente);
    }

    // Incrementar credito (maximo el total original)
    const nuevoRestante = Math.min(credito.total, credito.restante + 1);
    Database.update(SHEETS.CREDITOS, credito.id, { restante: nuevoRestante });

    // Actualizar paquete
    const pkg = this.getById(paqueteId);
    if (pkg) {
      const nuevasRestantes = Math.min(pkg.sesionesTotal, pkg.sesionesRestantes + 1);
      Database.update(SHEETS.PAQUETES, paqueteId, {
        sesionesRestantes: nuevasRestantes,
        activo: true
      });
    }

    return resultado(true, { restante: nuevoRestante }, 'Credito revertido');
  },

  /**
   * Mueve un paquete completado al historial
   * @param {number} paqueteId - ID del paquete
   */
  moveToHistory: function(paqueteId) {
    const pkg = this.getById(paqueteId);
    if (!pkg) return;

    // Insertar en historial
    Database.insert(SHEETS.HISTORIAL_PAQUETES, {
      id: pkg.id,
      fechaCompra: pkg.fechaCompra,
      fechaCompletado: getFechaActual(),
      paciente: pkg.paciente,
      terapeuta: pkg.terapeuta,
      sesionesTotal: pkg.sesionesTotal,
      valorTotal: pkg.valorTotal,
      efectivo: pkg.efectivo,
      transferenciaNeurotea: pkg.transferenciaNeurotea,
      aporteNeurotea: pkg.aporteNeurotea
    });

    // Marcar como inactivo
    Database.update(SHEETS.PAQUETES, paqueteId, { activo: false });
  },

  /**
   * Restaura un paquete del historial
   * @param {number} paqueteId - ID del paquete
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} paciente - Nombre del paciente
   */
  restoreFromHistory: function(paqueteId, terapeuta, paciente) {
    // Buscar en historial
    const historial = Database.getAll(SHEETS.HISTORIAL_PAQUETES);
    const pkgHistorial = historial.find(p => p.id == paqueteId);

    if (pkgHistorial) {
      // Eliminar del historial
      Database.delete(SHEETS.HISTORIAL_PAQUETES, pkgHistorial.id);

      // Reactivar paquete
      Database.update(SHEETS.PAQUETES, paqueteId, {
        sesionesRestantes: 1,
        activo: true
      });

      // Reactivar credito
      const creditos = Database.getAll(SHEETS.CREDITOS);
      const credito = creditos.find(c => c.paqueteId == paqueteId);
      if (credito) {
        Database.update(SHEETS.CREDITOS, credito.id, { restante: 1 });
      }

      return resultado(true, null, 'Paquete restaurado del historial');
    }

    return resultado(false, null, 'Paquete no encontrado en historial');
  },

  /**
   * Elimina un paquete
   * @param {number} id - ID del paquete
   * @returns {Object} - Resultado
   */
  delete: function(id) {
    const pkg = this.getById(id);
    if (!pkg) {
      return resultado(false, null, 'Paquete no encontrado');
    }

    // Eliminar creditos asociados
    Database.deleteByColumn(SHEETS.CREDITOS, 'paqueteId', id);

    // Eliminar paquete
    Database.delete(SHEETS.PAQUETES, id);

    return resultado(true, null, 'Paquete eliminado exitosamente');
  },

  /**
   * Obtiene creditos disponibles para un paciente y terapeuta
   * @param {string} paciente - Nombre del paciente
   * @param {string} terapeuta - Nombre del terapeuta
   * @returns {Array<Object>} - Creditos disponibles
   */
  getAvailableCredits: function(paciente, terapeuta) {
    const creditos = Database.getAll(SHEETS.CREDITOS);
    return creditos.filter(c =>
      c.paciente === paciente &&
      c.terapeuta === terapeuta &&
      c.restante > 0
    );
  },

  /**
   * Verifica si un paciente tiene creditos con un terapeuta
   * @param {string} paciente - Nombre del paciente
   * @param {string} terapeuta - Nombre del terapeuta
   * @returns {Object} - Info de creditos
   */
  checkCredits: function(paciente, terapeuta) {
    const creditos = this.getAvailableCredits(paciente, terapeuta);

    if (creditos.length === 0) {
      return {
        hasCredits: false,
        totalRemaining: 0,
        packages: []
      };
    }

    const totalRemaining = creditos.reduce((sum, c) => sum + c.restante, 0);

    return {
      hasCredits: true,
      totalRemaining: totalRemaining,
      packages: creditos.map(c => ({
        paqueteId: c.paqueteId,
        restante: c.restante,
        total: c.total,
        fechaCompra: c.fechaCompra
      }))
    };
  },

  /**
   * Obtiene historial de paquetes completados
   * @param {string} terapeuta - Nombre del terapeuta (opcional)
   * @returns {Array<Object>} - Historial
   */
  getHistory: function(terapeuta) {
    const history = Database.getAll(SHEETS.HISTORIAL_PAQUETES);
    if (terapeuta) {
      return history.filter(p => p.terapeuta === terapeuta);
    }
    return history;
  },

  /**
   * Obtiene paquetes comprados en una fecha
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Paquetes
   */
  getByDate: function(fecha) {
    const paquetes = Database.getByColumn(SHEETS.PAQUETES, 'fechaCompra', fecha);
    const historial = Database.getByColumn(SHEETS.HISTORIAL_PAQUETES, 'fechaCompra', fecha);
    return [...paquetes, ...historial];
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Crea un paquete (para frontend)
 */
function crearPaquete(packageData) {
  return PackageService.create(packageData);
}

/**
 * Obtiene paquetes activos (para frontend)
 */
function getPaquetesActivos() {
  return PackageService.getActive();
}

/**
 * Elimina un paquete (para frontend)
 */
function eliminarPaquete(id) {
  return PackageService.delete(id);
}

/**
 * Verifica creditos de un paciente (para frontend)
 */
function verificarCreditos(paciente, terapeuta) {
  return PackageService.checkCredits(paciente, terapeuta);
}

/**
 * Obtiene historial de paquetes (para frontend)
 */
function getHistorialPaquetes() {
  try {
    const historial = PackageService.getHistory();
    return resultado(true, historial);
  } catch (error) {
    return resultado(false, [], error.message);
  }
}

/**
 * Obtiene cantidad de paquetes en historial (para frontend)
 */
function getHistorialPaquetesCount() {
  try {
    const historial = PackageService.getHistory();
    return resultado(true, historial.length);
  } catch (error) {
    return resultado(false, 0, error.message);
  }
}

/**
 * Elimina un paquete del historial (para frontend)
 */
function eliminarPaqueteHistorial(id) {
  try {
    Database.delete(SHEETS.HISTORIAL_PAQUETES, id);
    return resultado(true, null, 'Paquete eliminado del historial');
  } catch (error) {
    return resultado(false, null, error.message);
  }
}
