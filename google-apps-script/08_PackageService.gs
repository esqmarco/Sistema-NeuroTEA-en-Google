/**
 * ===========================
 * SERVICIO DE PAQUETES Y CREDITOS
 * ===========================
 *
 * Crear archivo: "PackageService"
 */

const PackageService = {

  /**
   * Obtiene paquetes activos
   */
  getActivos: function() {
    const all = Database.getAll(SHEETS.PAQUETES);
    return all.filter(p => p.estado !== 'completado' && p.sesionesRestantes > 0);
  },

  /**
   * Obtiene paquetes por fecha
   */
  getByDate: function(fecha) {
    return Database.getByDate(SHEETS.PAQUETES, fecha);
  },

  /**
   * Obtiene paquete por ID
   */
  getById: function(id) {
    return Database.getById(SHEETS.PAQUETES, id);
  },

  /**
   * Crea un nuevo paquete
   */
  create: function(packageData) {
    if (!packageData.terapeuta) {
      return resultado(false, null, 'El terapeuta es requerido');
    }
    if (!packageData.paciente || packageData.paciente.trim() === '') {
      return resultado(false, null, 'El paciente es requerido');
    }
    if (!packageData.sesionesTotal || packageData.sesionesTotal <= 0) {
      return resultado(false, null, 'La cantidad de sesiones debe ser mayor a 0');
    }

    // Calcular valores
    const efectivo = parseInt(packageData.efectivo) || 0;
    const transferenciaNeurotea = parseInt(packageData.transferenciaNeurotea) || 0;
    const transferenciaTerminapeuta = parseInt(packageData.transferenciaTerminapeuta) || 0;
    const valorTotal = efectivo + transferenciaNeurotea + transferenciaTerminapeuta;

    if (valorTotal <= 0) {
      return resultado(false, null, 'El valor total debe ser mayor a 0');
    }

    const sesionesTotal = parseInt(packageData.sesionesTotal);
    const valorPorSesion = Math.floor(valorTotal / sesionesTotal);

    // Calcular aporte
    const tipoAporte = packageData.tipoAporte || '30';
    const porcentaje = parseInt(tipoAporte) || 30;
    const aporteNeurotea = Math.floor(valorTotal * porcentaje / 100);
    const honorarios = valorTotal - aporteNeurotea;

    // Crear paquete
    const paquete = Database.insert(SHEETS.PAQUETES, {
      fecha: packageData.fecha || getFechaActual(),
      terapeuta: packageData.terapeuta,
      paciente: packageData.paciente.trim(),
      sesionesTotal: sesionesTotal,
      sesionesRestantes: sesionesTotal,
      valorTotal: valorTotal,
      valorPorSesion: valorPorSesion,
      efectivo: efectivo,
      transferenciaNeurotea: transferenciaNeurotea,
      transferenciaTerminapeuta: transferenciaTerminapeuta,
      aporteNeurotea: aporteNeurotea,
      honorarios: honorarios,
      tipoAporte: tipoAporte,
      estado: 'activo',
      creadoEn: getTimestamp()
    });

    // Crear creditos
    Database.insert(SHEETS.CREDITOS, {
      paciente: packageData.paciente.trim(),
      terapeuta: packageData.terapeuta,
      paqueteId: paquete.id,
      total: sesionesTotal,
      restante: sesionesTotal,
      valorPorSesion: valorPorSesion,
      fechaCompra: packageData.fecha || getFechaActual(),
      estado: 'activo'
    });

    return resultado(true, paquete, 'Paquete creado exitosamente');
  },

  /**
   * Obtiene creditos disponibles de un paciente
   */
  getCreditosDisponibles: function(paciente, terapeuta) {
    const all = Database.getAll(SHEETS.CREDITOS);
    return all.filter(c =>
      c.paciente === paciente &&
      c.terapeuta === terapeuta &&
      c.restante > 0 &&
      c.estado === 'activo'
    );
  },

  /**
   * Usa un credito
   */
  usarCredito: function(paciente, terapeuta) {
    const creditos = this.getCreditosDisponibles(paciente, terapeuta);

    if (creditos.length === 0) {
      return resultado(false, null, 'No hay creditos disponibles');
    }

    // Usar el credito mas antiguo (FIFO)
    const credito = creditos.sort((a, b) => a.fechaCompra.localeCompare(b.fechaCompra))[0];

    const nuevoRestante = credito.restante - 1;

    // Actualizar credito
    Database.update(SHEETS.CREDITOS, credito.id, {
      restante: nuevoRestante,
      estado: nuevoRestante === 0 ? 'agotado' : 'activo'
    });

    // Actualizar paquete
    const paquete = this.getById(credito.paqueteId);
    if (paquete) {
      const nuevasRestantes = paquete.sesionesRestantes - 1;
      Database.update(SHEETS.PAQUETES, paquete.id, {
        sesionesRestantes: nuevasRestantes,
        estado: nuevasRestantes === 0 ? 'completado' : 'activo'
      });

      // Si se completo, mover a historial
      if (nuevasRestantes === 0) {
        this.moverAHistorial(paquete);
      }
    }

    return resultado(true, {
      creditoId: credito.id,
      paqueteId: credito.paqueteId,
      restantes: nuevoRestante
    }, 'Credito usado');
  },

  /**
   * Revierte un credito usado
   */
  revertirCredito: function(paciente, terapeuta, paqueteId) {
    const creditos = Database.getByColumn(SHEETS.CREDITOS, 'paqueteId', paqueteId);
    const credito = creditos.find(c => c.paciente === paciente && c.terapeuta === terapeuta);

    if (!credito) return false;

    // Revertir credito
    Database.update(SHEETS.CREDITOS, credito.id, {
      restante: credito.restante + 1,
      estado: 'activo'
    });

    // Revertir paquete
    const paquete = this.getById(paqueteId);
    if (paquete) {
      Database.update(SHEETS.PAQUETES, paquete.id, {
        sesionesRestantes: paquete.sesionesRestantes + 1,
        estado: 'activo'
      });
    }

    return true;
  },

  /**
   * Mueve paquete completado a historial
   */
  moverAHistorial: function(paquete) {
    Database.insert(SHEETS.HISTORIAL_PAQUETES, {
      id: paquete.id,
      fechaCompra: paquete.fecha,
      fechaCompletado: getFechaActual(),
      terapeuta: paquete.terapeuta,
      paciente: paquete.paciente,
      sesionesTotal: paquete.sesionesTotal,
      valorTotal: paquete.valorTotal,
      aporteNeurotea: paquete.aporteNeurotea,
      honorarios: paquete.honorarios
    });
  },

  /**
   * Elimina un paquete
   */
  delete: function(id) {
    const paquete = this.getById(id);
    if (!paquete) {
      return resultado(false, null, 'Paquete no encontrado');
    }

    // Eliminar creditos asociados
    Database.deleteByColumn(SHEETS.CREDITOS, 'paqueteId', id);

    // Eliminar paquete
    Database.delete(SHEETS.PAQUETES, id);

    return resultado(true, null, 'Paquete eliminado');
  }
};

// Funciones publicas
function crearPaquete(packageData) {
  return PackageService.create(packageData);
}

function eliminarPaquete(id) {
  return PackageService.delete(id);
}
