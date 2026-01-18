/**
 * ===========================
 * SERVICIO DE RENDICION DE CUENTAS
 * Calculos de saldos y confirmaciones
 * ===========================
 */

const RendicionService = {

  /**
   * Calcula el estado de un terapeuta para una fecha
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Object} - Estado calculado
   */
  calculateTherapistStatus: function(terapeuta, fecha) {
    // Obtener sesiones individuales
    const sesiones = SessionService.getByTherapistAndDate(terapeuta, fecha);

    // Obtener sesiones grupales
    const sesionesGrupales = GroupSessionService.getByTherapist(terapeuta, fecha);

    // Obtener egresos (adelantos)
    const adelantos = EgresoService.getAdelantos(terapeuta, fecha);
    const totalAdelantos = adelantos.reduce((sum, a) => sum + (a.monto || 0), 0);

    // Obtener paquetes comprados hoy
    const paquetesHoy = PackageService.getByDate(fecha).filter(p => p.terapeuta === terapeuta);

    // Calcular totales de sesiones individuales
    let honorariosIndividuales = 0;
    let aporteIndividual = 0;
    let transferenciaATerapeuta = 0;
    let valorTotalSesiones = 0;

    sesiones.forEach(s => {
      // Si usa credito, no suma a honorarios ni valor (ya fue pagado antes)
      if (s.usaCredito) {
        // Solo contamos la sesion pero sin valor monetario
        return;
      }

      valorTotalSesiones += s.valorSesion || 0;
      aporteIndividual += s.aporteNeurotea || 0;
      honorariosIndividuales += s.honorarios || 0;
      transferenciaATerapeuta += s.transferenciaTerminapeuta || 0;
    });

    // Calcular totales de sesiones grupales (proporcionales)
    let honorariosGrupales = 0;
    let aporteGrupal = 0;
    let valorGrupal = 0;

    sesionesGrupales.forEach(gs => {
      if (gs.therapistShare) {
        honorariosGrupales += gs.therapistShare.honorarios || 0;
        aporteGrupal += gs.therapistShare.aporteProporcional || 0;
        valorGrupal += gs.therapistShare.valorProporcional || 0;
      }
    });

    // Calcular totales de paquetes (aportan al dia de compra)
    let honorariosPaquetes = 0;
    let aportePaquetes = 0;
    let valorPaquetes = 0;

    paquetesHoy.forEach(p => {
      valorPaquetes += p.valorTotal || 0;
      aportePaquetes += p.aporteNeurotea || 0;
      // Honorarios de paquete = valor - aporte
      const honPaquete = (p.valorTotal || 0) - (p.aporteNeurotea || 0);
      honorariosPaquetes += honPaquete;
      transferenciaATerapeuta += p.transferenciaTerminapeuta || 0;
    });

    // Totales combinados
    const honorariosTotales = honorariosIndividuales + honorariosGrupales + honorariosPaquetes;
    const aporteTotalNeurotea = aporteIndividual + aporteGrupal + aportePaquetes;
    const valorTotal = valorTotalSesiones + valorGrupal + valorPaquetes;

    // Calcular lo que NeuroTEA le debe a la terapeuta
    // NeuroTEA debe: honorarios - transferencias recibidas - adelantos
    const neuroteaLeDebe = Math.max(0, honorariosTotales - transferenciaATerapeuta - totalAdelantos);

    // Calcular lo que la terapeuta debe a NeuroTEA
    // Terapeuta debe: si (transferencias + adelantos) > honorarios
    const terapeutaDebe = Math.max(0, transferenciaATerapeuta + totalAdelantos - honorariosTotales);

    // Determinar estado
    let estado = ESTADOS_RENDICION.SALDADO;
    let colorClass = 'badge-secondary';

    if (neuroteaLeDebe > 0 && terapeutaDebe === 0) {
      // NeuroTEA debe pagar
      // Determinar si hay fondos suficientes
      const saldoCaja = this.calcularSaldoCaja(fecha);
      const saldoBanco = this.calcularSaldoCuenta(fecha);

      if (saldoCaja >= neuroteaLeDebe) {
        estado = ESTADOS_RENDICION.DAR_EFECTIVO;
        colorClass = 'badge-success';
      } else if (saldoCaja > 0 && (saldoCaja + saldoBanco) >= neuroteaLeDebe) {
        estado = ESTADOS_RENDICION.DAR_Y_TRANSFERIR;
        colorClass = 'badge-warning';
      } else if (saldoBanco >= neuroteaLeDebe) {
        estado = ESTADOS_RENDICION.TRANSFERIR;
        colorClass = 'badge-info';
      } else {
        estado = ESTADOS_RENDICION.FONDOS_INSUFICIENTES;
        colorClass = 'badge-danger';
      }
    } else if (terapeutaDebe > 0) {
      estado = ESTADOS_RENDICION.TERAPEUTA_DEBE_DAR;
      colorClass = 'badge-danger';
    }

    // Verificar si hay confirmacion
    const confirmacion = this.getConfirmacion(terapeuta, fecha);
    let confirmacionInfo = null;

    if (confirmacion) {
      // Parsear flujoJSON si es string
      let flujo = confirmacion.flujoJSON;
      if (typeof flujo === 'string') {
        try { flujo = JSON.parse(flujo); } catch (e) { flujo = {}; }
      }
      flujo = flujo || {};

      confirmacionInfo = {
        confirmado: true,
        tipo: confirmacion.tipo,
        tipoOpcion: confirmacion.tipoOpcion,
        timestamp: confirmacion.timestamp,
        efectivoUsado: flujo.efectivoUsado || 0,
        bancoUsado: flujo.bancoUsado || 0,
        vueltoEfectivo: flujo.vueltoEfectivo || 0,
        vueltoTransferencia: flujo.vueltoTransferencia || 0,
        efectivoRecibido: flujo.efectivoRecibido || 0
      };
      // NO sobrescribir estado - mantener el estado original calculado
      // Solo cambiar el colorClass para indicar que está confirmado
      colorClass = 'badge-success';
    }

    return {
      terapeuta: terapeuta,
      fecha: fecha,
      estado: estado,
      colorClass: colorClass,

      // Valores calculados
      valorTotalSesiones: valorTotal,
      honorarios: honorariosTotales,
      aporteNeuroTEA: aporteTotalNeurotea,
      transferenciaATerapeuta: transferenciaATerapeuta,
      adelantosRecibidos: totalAdelantos,

      // Desglose
      honorariosIndividuales: honorariosIndividuales,
      honorariosGrupales: honorariosGrupales,
      honorariosPaquetes: honorariosPaquetes,

      // Saldos
      neuroteaLeDebe: neuroteaLeDebe,
      terapeutaDebe: terapeutaDebe,

      // Confirmacion
      confirmacionInfo: confirmacionInfo,

      // Conteos
      totalSesionesIndividuales: sesiones.length,
      totalSesionesGrupales: sesionesGrupales.length,
      totalPaquetes: paquetesHoy.length
    };
  },

  /**
   * Calcula el saldo en caja para una fecha
   * @param {string} fecha - Fecha
   * @returns {number} - Saldo en caja
   */
  calcularSaldoCaja: function(fecha) {
    // Obtener saldo inicial
    let saldo = this.getSaldoInicial(fecha);

    // Sumar efectivo de sesiones
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      if (!s.usaCredito) {
        saldo += s.efectivo || 0;
      }
    });

    // Sumar efectivo de sesiones grupales
    const sesionesGrupales = GroupSessionService.getByDate(fecha);
    sesionesGrupales.forEach(gs => {
      saldo += gs.efectivo || 0;
    });

    // Sumar efectivo de paquetes
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      saldo += p.efectivo || 0;
    });

    // Restar egresos
    const egresos = EgresoService.getByDate(fecha);
    egresos.forEach(e => {
      saldo -= e.monto || 0;
    });

    // Restar pagos confirmados en efectivo
    const confirmaciones = this.getConfirmaciones(fecha);
    confirmaciones.forEach(c => {
      const flujo = c.flujoJSON || {};
      saldo -= flujo.efectivoUsado || 0;
      // Sumar vueltos en efectivo (regresa a caja)
      saldo += flujo.vueltoEfectivo || 0;
      // Sumar efectivo recibido de terapeutas (devolucion)
      saldo += flujo.efectivoRecibido || 0;
    });

    return Math.max(0, saldo);
  },

  /**
   * Calcula el saldo en cuenta bancaria NeuroTEA
   * @param {string} fecha - Fecha
   * @returns {number} - Saldo en cuenta
   */
  calcularSaldoCuenta: function(fecha) {
    let saldo = 0;

    // Sumar transferencias a NeuroTEA de sesiones
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      if (!s.usaCredito) {
        saldo += s.transferenciaNeurotea || 0;
      }
    });

    // Sumar transferencias de sesiones grupales
    const sesionesGrupales = GroupSessionService.getByDate(fecha);
    sesionesGrupales.forEach(gs => {
      saldo += gs.transferenciaNeurotea || 0;
    });

    // Sumar transferencias de paquetes
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      saldo += p.transferenciaNeurotea || 0;
    });

    // Restar transferencias salientes (pagos a terapeutas)
    const confirmaciones = this.getConfirmaciones(fecha);
    confirmaciones.forEach(c => {
      const flujo = c.flujoJSON || {};
      saldo -= flujo.bancoUsado || 0;
      // Sumar vueltos por transferencia (regresa a cuenta)
      saldo += flujo.vueltoTransferencia || 0;
    });

    return Math.max(0, saldo);
  },

  /**
   * Obtiene el saldo inicial de una fecha
   * @param {string} fecha - Fecha
   * @returns {number} - Saldo inicial
   */
  getSaldoInicial: function(fecha) {
    const saldos = Database.getByColumn(SHEETS.SALDOS_INICIALES, 'fecha', fecha);
    return saldos.length > 0 ? (saldos[0].efectivo || 0) : 0;
  },

  /**
   * Establece el saldo inicial de una fecha
   * @param {string} fecha - Fecha
   * @param {number} efectivo - Saldo en efectivo
   * @returns {Object} - Resultado
   */
  setSaldoInicial: function(fecha, efectivo) {
    const existing = Database.getByColumn(SHEETS.SALDOS_INICIALES, 'fecha', fecha);
    const valorAnterior = existing.length > 0 ? (existing[0].efectivo || 0) : 0;
    const valorNuevo = parseInt(efectivo) || 0;

    if (existing.length > 0) {
      // Actualizar existente
      Database.update(SHEETS.SALDOS_INICIALES, existing[0].id || existing[0].fecha, {
        efectivo: valorNuevo,
        actualizadoEn: getTimestamp()
      });
    } else {
      // Crear nuevo
      Database.insert(SHEETS.SALDOS_INICIALES, {
        fecha: fecha,
        efectivo: valorNuevo,
        actualizadoEn: getTimestamp()
      });
    }

    // Registrar en historial si el valor cambio
    if (valorAnterior !== valorNuevo) {
      Database.insert(SHEETS.HISTORIAL_SALDOS, {
        fecha: fecha,
        valorAnterior: valorAnterior,
        valorNuevo: valorNuevo,
        mensaje: `Saldo cambiado de Gs ${valorAnterior} a Gs ${valorNuevo}`,
        timestamp: getTimestamp()
      });
    }

    return resultado(true, null, 'Saldo inicial actualizado');
  },

  /**
   * Obtiene confirmaciones de una fecha
   * @param {string} fecha - Fecha
   * @returns {Array<Object>} - Confirmaciones
   */
  getConfirmaciones: function(fecha) {
    const confirmaciones = Database.getByDate(SHEETS.CONFIRMACIONES, fecha);
    return confirmaciones.map(c => ({
      ...c,
      flujo: c.flujoJSON || {},
      estadoCongelado: c.estadoCongeladoJSON || {}
    }));
  },

  /**
   * Obtiene confirmacion de un terapeuta para una fecha
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Object|null} - Confirmacion
   */
  getConfirmacion: function(terapeuta, fecha) {
    const confirmaciones = this.getConfirmaciones(fecha);
    return confirmaciones.find(c => c.terapeuta === terapeuta) || null;
  },

  /**
   * Confirma el pago a un terapeuta
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @param {Object} opcionPago - Opcion de pago seleccionada
   * @returns {Object} - Resultado
   */
  confirmarPago: function(terapeuta, fecha, opcionPago) {
    // Verificar que no exista confirmacion
    const existing = this.getConfirmacion(terapeuta, fecha);
    if (existing) {
      return resultado(false, null, 'Ya existe una confirmacion para este terapeuta');
    }

    // Obtener estado actual para congelar
    const status = this.calculateTherapistStatus(terapeuta, fecha);

    // Preparar flujo segun tipo de opcion
    const flujo = {
      efectivoUsado: opcionPago.efectivoUsado || 0,
      bancoUsado: opcionPago.bancoUsado || 0,
      vueltoEfectivo: opcionPago.vueltoEfectivo || 0,
      vueltoTransferencia: opcionPago.vueltoTransferencia || 0,
      efectivoRecibido: opcionPago.efectivoRecibido || 0,
      tipoOpcion: opcionPago.tipoOpcion
    };

    // Crear confirmacion
    const confirmacion = Database.insert(SHEETS.CONFIRMACIONES, {
      fecha: fecha,
      terapeuta: terapeuta,
      tipo: status.estado,
      tipoOpcion: opcionPago.tipoOpcion,
      flujoJSON: flujo,
      estadoCongeladoJSON: status,
      timestamp: getTimestamp()
    });

    return resultado(true, confirmacion, 'Pago confirmado exitosamente');
  },

  /**
   * Revierte una confirmacion de pago
   * @param {string} terapeuta - Nombre del terapeuta
   * @param {string} fecha - Fecha
   * @returns {Object} - Resultado
   */
  revertirConfirmacion: function(terapeuta, fecha) {
    const confirmacion = this.getConfirmacion(terapeuta, fecha);
    if (!confirmacion) {
      return resultado(false, null, 'No hay confirmacion para revertir');
    }

    Database.delete(SHEETS.CONFIRMACIONES, confirmacion.id);

    return resultado(true, null, 'Confirmacion revertida');
  },

  /**
   * Obtiene resumen de rendicion para una fecha
   * @param {string} fecha - Fecha
   * @returns {Object} - Resumen
   */
  getResumenDia: function(fecha) {
    const terapeutas = TherapistService.getAll();
    const estados = [];

    terapeutas.forEach(t => {
      const status = this.calculateTherapistStatus(t.nombre, fecha);
      if (status.totalSesionesIndividuales > 0 ||
          status.totalSesionesGrupales > 0 ||
          status.totalPaquetes > 0 ||
          status.adelantosRecibidos > 0) {
        estados.push(status);
      }
    });

    return {
      fecha: fecha,
      terapeutas: estados,
      saldoCaja: this.calcularSaldoCaja(fecha),
      saldoCuenta: this.calcularSaldoCuenta(fecha),
      saldoInicial: this.getSaldoInicial(fecha),
      totalPorPagar: estados.reduce((sum, e) => sum + e.neuroteaLeDebe, 0),
      totalPorCobrar: estados.reduce((sum, e) => sum + e.terapeutaDebe, 0)
    };
  }
};

// ===========================
// FUNCIONES PUBLICAS PARA FRONTEND
// ===========================

/**
 * Calcula estado de terapeuta (para frontend)
 */
function calcularEstadoTerapeuta(terapeuta, fecha) {
  return RendicionService.calculateTherapistStatus(terapeuta, fecha);
}

/**
 * Obtiene resumen del dia (para frontend)
 */
function getResumenRendicion(fecha) {
  return RendicionService.getResumenDia(fecha);
}

/**
 * Confirma pago a terapeuta (para frontend)
 */
function confirmarPagoTerapeuta(terapeuta, fecha, opcionPago) {
  return RendicionService.confirmarPago(terapeuta, fecha, opcionPago);
}

/**
 * Revierte confirmacion (para frontend)
 */
function revertirConfirmacionPago(terapeuta, fecha) {
  return RendicionService.revertirConfirmacion(terapeuta, fecha);
}

/**
 * Establece saldo inicial (para frontend)
 */
function establecerSaldoInicial(fecha, efectivo) {
  return RendicionService.setSaldoInicial(fecha, efectivo);
}

/**
 * Obtiene saldos del dia (para frontend)
 */
function getSaldosDia(fecha) {
  return {
    saldoCaja: RendicionService.calcularSaldoCaja(fecha),
    saldoCuenta: RendicionService.calcularSaldoCuenta(fecha),
    saldoInicial: RendicionService.getSaldoInicial(fecha)
  };
}

/**
 * Obtiene historial de saldos (para frontend)
 */
function getHistorialSaldos(fecha) {
  try {
    const historial = Database.getByDate(SHEETS.HISTORIAL_SALDOS, fecha);
    // Ordenar por timestamp descendente (mas reciente primero)
    historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    // Limitar a 10 entradas
    return resultado(true, historial.slice(0, 10));
  } catch (error) {
    return resultado(false, [], error.message);
  }
}

/**
 * Agrega entrada al historial de saldos
 */
function agregarHistorialSaldo(fecha, valorNuevo, valorAnterior, mensaje) {
  try {
    const entrada = {
      fecha: fecha,
      valorNuevo: valorNuevo,
      valorAnterior: valorAnterior,
      mensaje: mensaje || '',
      timestamp: getTimestamp()
    };
    Database.insert(SHEETS.HISTORIAL_SALDOS, entrada);
    return resultado(true, entrada);
  } catch (error) {
    return resultado(false, null, error.message);
  }
}

/**
 * Limpia historial y resetea saldo inicial (para frontend)
 */
function limpiarHistorialYSaldo(fecha) {
  try {
    // Eliminar historial de la fecha
    const historial = Database.getByDate(SHEETS.HISTORIAL_SALDOS, fecha);
    historial.forEach(h => {
      Database.delete(SHEETS.HISTORIAL_SALDOS, h.id);
    });

    // Resetear saldo inicial a 0
    const saldoExistente = Database.getByDate(SHEETS.SALDOS_INICIALES, fecha);
    if (saldoExistente && saldoExistente.length > 0) {
      Database.update(SHEETS.SALDOS_INICIALES, saldoExistente[0].id, { efectivo: 0 });
    }

    return resultado(true, null, 'Historial y saldo limpiados');
  } catch (error) {
    return resultado(false, null, error.message);
  }
}

/**
 * Obtiene datos para generar comprobante (para frontend)
 */
function getReceiptData(terapeuta, fecha) {
  try {
    // Obtener sesiones del terapeuta en la fecha
    const sesiones = SessionService.getByTherapistAndDate(terapeuta, fecha);

    // Obtener estado calculado
    const status = RendicionService.calculateTherapistStatus(terapeuta, fecha);

    // Verificar si hay confirmacion
    const confirmacion = RendicionService.getConfirmacion(terapeuta, fecha);

    // Obtener adelantos
    const adelantos = EgresoService.getAdelantos(terapeuta, fecha);
    const totalAdelantos = adelantos.reduce((sum, a) => sum + (a.monto || 0), 0);

    // Preparar datos del comprobante
    const receiptData = {
      terapeuta: terapeuta,
      fecha: fecha,
      sesiones: sesiones,
      totalSesiones: sesiones.length + status.totalSesionesGrupales,
      valorTotal: status.valorTotalSesiones,
      aporteTotal: status.aporteNeuroTEA,
      honorariosNetos: status.honorarios,
      transferenciasRecibidas: status.transferenciaATerapeuta,
      adelantos: totalAdelantos,
      neuroteaLeDebe: status.neuroteaLeDebe,
      terapeutaDebe: status.terapeutaDebe,
      estado: status.estado,
      confirmado: !!confirmacion
    };

    return resultado(true, receiptData);
  } catch (error) {
    return resultado(false, null, error.message);
  }
}
