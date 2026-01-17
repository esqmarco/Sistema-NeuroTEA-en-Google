/**
 * ===========================
 * SERVICIO DE RENDICION
 * ===========================
 *
 * Crear archivo: "RendicionService"
 */

const RendicionService = {

  /**
   * Obtiene saldo inicial de una fecha
   */
  getSaldoInicial: function(fecha) {
    const saldos = Database.getByColumn(SHEETS.SALDOS_INICIALES, 'fecha', fecha);
    if (saldos.length > 0) {
      return parseInt(saldos[0].efectivo) || 0;
    }
    return 0;
  },

  /**
   * Guarda saldo inicial
   */
  setSaldoInicial: function(fecha, efectivo) {
    const saldos = Database.getByColumn(SHEETS.SALDOS_INICIALES, 'fecha', fecha);

    if (saldos.length > 0) {
      // Actualizar existente
      const sheet = getSheet(SHEETS.SALDOS_INICIALES);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const fechaCol = headers.indexOf('fecha');
      const efectivoCol = headers.indexOf('efectivo');
      const actualizadoCol = headers.indexOf('actualizadoEn');

      for (let i = 1; i < data.length; i++) {
        if (data[i][fechaCol] === fecha) {
          sheet.getRange(i + 1, efectivoCol + 1).setValue(efectivo);
          sheet.getRange(i + 1, actualizadoCol + 1).setValue(getTimestamp());
          break;
        }
      }
    } else {
      // Crear nuevo
      const sheet = getSheet(SHEETS.SALDOS_INICIALES);
      sheet.appendRow([fecha, efectivo, getTimestamp()]);
    }

    // Guardar en historial
    Database.insert(SHEETS.HISTORIAL_SALDOS, {
      fecha: fecha,
      mensaje: 'Saldo inicial actualizado a Gs ' + formatNumber(efectivo),
      timestamp: getTimestamp()
    });

    return resultado(true, { fecha: fecha, efectivo: efectivo }, 'Saldo inicial guardado');
  },

  /**
   * Calcula saldo en caja
   */
  calcularSaldoCaja: function(fecha) {
    let saldo = this.getSaldoInicial(fecha);

    // Sumar efectivo de sesiones
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      saldo += parseInt(s.efectivo) || 0;
    });

    // Sumar efectivo de paquetes
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      saldo += parseInt(p.efectivo) || 0;
    });

    // Sumar efectivo de sesiones grupales
    const grupales = GroupSessionService.getByDate(fecha);
    grupales.forEach(g => {
      saldo += parseInt(g.efectivo) || 0;
    });

    // Restar egresos
    const egresos = EgresoService.getByDate(fecha);
    egresos.forEach(e => {
      saldo -= parseInt(e.monto) || 0;
    });

    // Restar confirmaciones de pago en efectivo
    const confirmaciones = this.getConfirmaciones(fecha);
    confirmaciones.forEach(c => {
      if (c.flujoJSON && c.flujoJSON.efectivoUsado) {
        saldo -= parseInt(c.flujoJSON.efectivoUsado) || 0;
      }
    });

    return Math.max(0, saldo);
  },

  /**
   * Calcula cuenta NeuroTEA (banco)
   */
  calcularCuentaNeuroTEA: function(fecha) {
    let saldo = 0;

    // Sumar transferencias a NeuroTEA de sesiones
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      saldo += parseInt(s.transferenciaNeurotea) || 0;
    });

    // Sumar transferencias de paquetes
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      saldo += parseInt(p.transferenciaNeurotea) || 0;
    });

    // Sumar transferencias de sesiones grupales
    const grupales = GroupSessionService.getByDate(fecha);
    grupales.forEach(g => {
      saldo += parseInt(g.transferenciaNeurotea) || 0;
    });

    // Restar transferencias salientes (confirmaciones)
    const confirmaciones = this.getConfirmaciones(fecha);
    confirmaciones.forEach(c => {
      if (c.flujoJSON && c.flujoJSON.bancoUsado) {
        saldo -= parseInt(c.flujoJSON.bancoUsado) || 0;
      }
    });

    // Sumar vueltos recibidos por transferencia
    confirmaciones.forEach(c => {
      if (c.flujoJSON && c.flujoJSON.vueltoTransferencia) {
        saldo += parseInt(c.flujoJSON.vueltoTransferencia) || 0;
      }
    });

    return Math.max(0, saldo);
  },

  /**
   * Calcula estado de rendicion para una terapeuta
   */
  calcularEstadoTerapeuta: function(fecha, terapeuta, saldoCaja, cuentaNeuroTEA) {
    // Calcular honorarios del dia
    let honorarios = 0;

    // Sesiones individuales
    const sesiones = SessionService.getByDate(fecha).filter(s => s.terapeuta === terapeuta);
    sesiones.forEach(s => {
      honorarios += parseInt(s.honorarios) || 0;
    });

    // Sesiones grupales (proporcional)
    const grupales = GroupSessionService.getByDate(fecha);
    grupales.forEach(g => {
      if (g.terapeutasJSON && Array.isArray(g.terapeutasJSON)) {
        if (g.terapeutasJSON.includes(terapeuta)) {
          // Calcular si es la primera terapeuta (recibe residuo)
          const idx = g.terapeutasJSON.indexOf(terapeuta);
          let honorarioPorTerapeuta = parseInt(g.honorariosPorTerapeuta) || 0;
          if (idx === 0) {
            honorarioPorTerapeuta += parseInt(g.residuoHonorarios) || 0;
          }
          honorarios += honorarioPorTerapeuta;
        }
      }
    });

    // Calcular transferencias recibidas (a cuenta de terapeuta)
    let transferenciasRecibidas = 0;
    sesiones.forEach(s => {
      transferenciasRecibidas += parseInt(s.transferenciaTerminapeuta) || 0;
    });

    // Calcular paquetes de este terapeuta
    const paquetes = PackageService.getByDate(fecha).filter(p => p.terapeuta === terapeuta);
    paquetes.forEach(p => {
      honorarios += parseInt(p.honorarios) || 0;
      transferenciasRecibidas += parseInt(p.transferenciaTerminapeuta) || 0;
    });

    // Calcular egresos (adelantos y gastos)
    let egresos = 0;
    const egresosData = EgresoService.getByDate(fecha).filter(e => e.terapeuta === terapeuta);
    egresosData.forEach(e => {
      egresos += parseInt(e.monto) || 0;
    });

    // Calcular balance
    const debeTerapeuta = transferenciasRecibidas + egresos;
    const debeNeuroTEA = honorarios;
    const balance = debeNeuroTEA - debeTerapeuta;

    // Determinar estado
    let estado = '';
    let mensaje = '';

    if (balance === 0) {
      estado = ESTADOS_RENDICION.SALDADO;
      mensaje = 'Sin movimientos pendientes';
    } else if (balance > 0) {
      // NeuroTEA debe pagar a terapeuta
      if (saldoCaja >= balance) {
        estado = ESTADOS_RENDICION.DAR_EFECTIVO;
        mensaje = 'Dar Gs ' + formatNumber(balance) + ' en efectivo';
      } else if (saldoCaja > 0 && cuentaNeuroTEA >= (balance - saldoCaja)) {
        estado = ESTADOS_RENDICION.DAR_Y_TRANSFERIR;
        mensaje = 'Dar Gs ' + formatNumber(saldoCaja) + ' + Transferir Gs ' + formatNumber(balance - saldoCaja);
      } else if (cuentaNeuroTEA >= balance) {
        estado = ESTADOS_RENDICION.TRANSFERIR;
        mensaje = 'Transferir Gs ' + formatNumber(balance);
      } else {
        estado = ESTADOS_RENDICION.FONDOS_INSUFICIENTES;
        mensaje = 'Fondos insuficientes para pagar Gs ' + formatNumber(balance);
      }
    } else {
      // Terapeuta debe dar a NeuroTEA
      estado = ESTADOS_RENDICION.TERAPEUTA_DEBE_DAR;
      mensaje = 'La terapeuta debe entregar Gs ' + formatNumber(Math.abs(balance));
    }

    return {
      terapeuta: terapeuta,
      honorarios: honorarios,
      transferenciasRecibidas: transferenciasRecibidas,
      egresos: egresos,
      balance: balance,
      estado: estado,
      mensaje: mensaje
    };
  },

  /**
   * Obtiene confirmaciones de una fecha
   */
  getConfirmaciones: function(fecha) {
    return Database.getByDate(SHEETS.CONFIRMACIONES, fecha);
  },

  /**
   * Guarda confirmacion de pago
   */
  confirmarPago: function(confirmacionData) {
    const confirmacion = Database.insert(SHEETS.CONFIRMACIONES, {
      fecha: confirmacionData.fecha,
      terapeuta: confirmacionData.terapeuta,
      tipo: confirmacionData.tipo,
      tipoOpcion: confirmacionData.tipoOpcion || '',
      flujoJSON: JSON.stringify(confirmacionData.flujo || {}),
      estadoCongeladoJSON: JSON.stringify(confirmacionData.estadoCongelado || {}),
      timestamp: getTimestamp()
    });

    return resultado(true, confirmacion, 'Confirmacion guardada');
  },

  /**
   * Elimina confirmacion
   */
  eliminarConfirmacion: function(id) {
    const confirmacion = Database.getById(SHEETS.CONFIRMACIONES, id);
    if (!confirmacion) {
      return resultado(false, null, 'Confirmacion no encontrada');
    }

    Database.delete(SHEETS.CONFIRMACIONES, id);
    return resultado(true, null, 'Confirmacion eliminada');
  },

  /**
   * Obtiene resumen de rendicion del dia
   */
  getResumenDia: function(fecha) {
    const terapeutas = TherapistService.getAll();
    const saldoCaja = this.calcularSaldoCaja(fecha);
    const cuentaNeuroTEA = this.calcularCuentaNeuroTEA(fecha);

    const estados = [];
    let saldoCajaRestante = saldoCaja;
    let cuentaNeuroTEARestante = cuentaNeuroTEA;

    terapeutas.forEach(t => {
      const estado = this.calcularEstadoTerapeuta(fecha, t.nombre, saldoCajaRestante, cuentaNeuroTEARestante);

      // Verificar si ya tiene confirmacion
      const confirmaciones = this.getConfirmaciones(fecha).filter(c => c.terapeuta === t.nombre);
      if (confirmaciones.length > 0) {
        estado.confirmado = true;
        estado.confirmacion = confirmaciones[0];
        // Ajustar saldos segun confirmacion
        if (estado.confirmacion.flujoJSON) {
          saldoCajaRestante -= parseInt(estado.confirmacion.flujoJSON.efectivoUsado) || 0;
          cuentaNeuroTEARestante -= parseInt(estado.confirmacion.flujoJSON.bancoUsado) || 0;
        }
      } else {
        estado.confirmado = false;
      }

      estados.push(estado);
    });

    return {
      fecha: fecha,
      saldoInicial: this.getSaldoInicial(fecha),
      saldoCaja: saldoCaja,
      cuentaNeuroTEA: cuentaNeuroTEA,
      estados: estados
    };
  }
};

// Funcion auxiliar para formatear numeros
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Funciones publicas
function guardarSaldoInicial(fecha, efectivo) {
  return RendicionService.setSaldoInicial(fecha, efectivo);
}

function calcularRendicion(fecha) {
  return RendicionService.getResumenDia(fecha);
}

function confirmarPagoTerapeuta(confirmacionData) {
  return RendicionService.confirmarPago(confirmacionData);
}

function eliminarConfirmacionPago(id) {
  return RendicionService.eliminarConfirmacion(id);
}

function getSaldoCaja(fecha) {
  return RendicionService.calcularSaldoCaja(fecha);
}

function getCuentaNeuroTEA(fecha) {
  return RendicionService.calcularCuentaNeuroTEA(fecha);
}
