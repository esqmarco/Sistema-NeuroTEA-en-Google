/**
 * ===========================
 * FUNCIONES AUXILIARES
 * ===========================
 *
 * Crear archivo: "Helpers"
 */

/**
 * Formatea un numero como moneda (Guaranies)
 * @param {number} num - Numero a formatear
 * @returns {string} - Numero formateado
 */
function formatearMoneda(num) {
  if (num === null || num === undefined) return 'Gs 0';
  const numero = parseInt(num) || 0;
  const formateado = numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Gs ' + formateado;
}

/**
 * Formatea una fecha para mostrar
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} - Fecha formateada DD/MM/YYYY
 */
function formatearFecha(fecha) {
  if (!fecha) return '';
  const partes = fecha.split('-');
  if (partes.length !== 3) return fecha;
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

/**
 * Valida formato de fecha
 * @param {string} fecha - Fecha a validar
 * @returns {boolean} - Es valida
 */
function esFechaValida(fecha) {
  if (!fecha) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) return false;

  const partes = fecha.split('-');
  const year = parseInt(partes[0]);
  const month = parseInt(partes[1]);
  const day = parseInt(partes[2]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Valida que un string no este vacio
 * @param {string} str - String a validar
 * @returns {boolean} - No esta vacio
 */
function noVacio(str) {
  return str !== null && str !== undefined && str.toString().trim() !== '';
}

/**
 * Valida que un numero sea positivo
 * @param {number} num - Numero a validar
 * @returns {boolean} - Es positivo
 */
function esPositivo(num) {
  return num !== null && num !== undefined && parseInt(num) > 0;
}

/**
 * Calcula porcentaje de aporte NeuroTEA
 * @param {number} valor - Valor total
 * @param {number} porcentaje - Porcentaje (default 30)
 * @returns {Object} - { aporte, honorarios }
 */
function calcularAporte(valor, porcentaje) {
  porcentaje = parseInt(porcentaje) || CONFIG.DEFAULT_CONTRIBUTION_PERCENTAGE;
  const aporte = Math.floor(valor * porcentaje / 100);
  const honorarios = valor - aporte;
  return { aporte: aporte, honorarios: honorarios };
}

/**
 * Obtiene nombre del dia de la semana
 * @param {string} fecha - Fecha YYYY-MM-DD
 * @returns {string} - Nombre del dia
 */
function getNombreDia(fecha) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const date = new Date(fecha + 'T12:00:00');
  return dias[date.getDay()];
}

/**
 * Obtiene nombre del mes
 * @param {number} mes - Numero del mes (1-12)
 * @returns {string} - Nombre del mes
 */
function getNombreMes(mes) {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return meses[mes - 1] || '';
}

/**
 * Ordena array por campo
 * @param {Array} arr - Array a ordenar
 * @param {string} campo - Campo para ordenar
 * @param {boolean} desc - Orden descendente
 * @returns {Array} - Array ordenado
 */
function ordenarPor(arr, campo, desc) {
  return arr.sort((a, b) => {
    let valA = a[campo];
    let valB = b[campo];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return desc ? 1 : -1;
    if (valA > valB) return desc ? -1 : 1;
    return 0;
  });
}

/**
 * Agrupa array por campo
 * @param {Array} arr - Array a agrupar
 * @param {string} campo - Campo para agrupar
 * @returns {Object} - Objeto con grupos
 */
function agruparPor(arr, campo) {
  return arr.reduce((grupos, item) => {
    const key = item[campo] || 'Sin clasificar';
    if (!grupos[key]) {
      grupos[key] = [];
    }
    grupos[key].push(item);
    return grupos;
  }, {});
}

/**
 * Suma valores de un campo en un array
 * @param {Array} arr - Array de objetos
 * @param {string} campo - Campo a sumar
 * @returns {number} - Suma total
 */
function sumarCampo(arr, campo) {
  return arr.reduce((suma, item) => suma + (parseInt(item[campo]) || 0), 0);
}

/**
 * Genera reporte HTML simple
 * @param {string} titulo - Titulo del reporte
 * @param {string} contenido - Contenido HTML
 * @returns {HtmlOutput} - Pagina HTML
 */
function generarReporteHTML(titulo, contenido) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4F46E5; color: white; }
        .total { font-weight: bold; background-color: #f3f4f6; }
        h1 { color: #4F46E5; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      ${contenido}
      <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
        Imprimir
      </button>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle(titulo)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Genera reporte de rendicion
 * @param {string} fecha - Fecha del reporte
 * @param {string} terapeuta - Nombre de la terapeuta
 * @returns {HtmlOutput} - Pagina HTML
 */
function generarReporteRendicion(fecha, terapeuta) {
  const sesiones = SessionService.getByDate(fecha).filter(s => s.terapeuta === terapeuta);
  const egresos = EgresoService.getByDate(fecha).filter(e => e.terapeuta === terapeuta);

  let html = '<h2>Fecha: ' + formatearFecha(fecha) + '</h2>';
  html += '<h3>Terapeuta: ' + terapeuta + '</h3>';

  // Tabla de sesiones
  html += '<h4>Sesiones</h4>';
  if (sesiones.length > 0) {
    html += '<table><tr><th>Paciente</th><th>Valor</th><th>Honorarios</th></tr>';
    let totalHonorarios = 0;
    sesiones.forEach(s => {
      totalHonorarios += parseInt(s.honorarios) || 0;
      html += '<tr><td>' + s.paciente + '</td><td>' + formatearMoneda(s.valorSesion) + '</td><td>' + formatearMoneda(s.honorarios) + '</td></tr>';
    });
    html += '<tr class="total"><td>Total</td><td></td><td>' + formatearMoneda(totalHonorarios) + '</td></tr>';
    html += '</table>';
  } else {
    html += '<p>Sin sesiones registradas</p>';
  }

  // Tabla de egresos
  html += '<h4>Adelantos/Gastos</h4>';
  if (egresos.length > 0) {
    html += '<table><tr><th>Concepto</th><th>Tipo</th><th>Monto</th></tr>';
    let totalEgresos = 0;
    egresos.forEach(e => {
      totalEgresos += parseInt(e.monto) || 0;
      html += '<tr><td>' + e.concepto + '</td><td>' + e.tipo + '</td><td>' + formatearMoneda(e.monto) + '</td></tr>';
    });
    html += '<tr class="total"><td colspan="2">Total</td><td>' + formatearMoneda(totalEgresos) + '</td></tr>';
    html += '</table>';
  } else {
    html += '<p>Sin egresos registrados</p>';
  }

  return generarReporteHTML('Rendición - ' + terapeuta, html);
}

/**
 * Limpia caracteres especiales de un string
 * @param {string} str - String a limpiar
 * @returns {string} - String limpio
 */
function limpiarString(str) {
  if (!str) return '';
  return str.toString().trim().replace(/[<>]/g, '');
}

/**
 * Verifica si es horario laboral (8am - 8pm Paraguay)
 * @returns {boolean} - Es horario laboral
 */
function esHorarioLaboral() {
  const now = new Date();
  const offset = -4 * 60;
  const local = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);
  const hora = local.getHours();
  return hora >= 8 && hora < 20;
}

/**
 * Obtiene primer dia del mes
 * @param {string} fecha - Fecha base
 * @returns {string} - Primer dia del mes
 */
function getPrimerDiaMes(fecha) {
  const partes = fecha.split('-');
  return partes[0] + '-' + partes[1] + '-01';
}

/**
 * Obtiene ultimo dia del mes
 * @param {string} fecha - Fecha base
 * @returns {string} - Ultimo dia del mes
 */
function getUltimoDiaMes(fecha) {
  const partes = fecha.split('-');
  const year = parseInt(partes[0]);
  const month = parseInt(partes[1]);
  const ultimoDia = new Date(year, month, 0).getDate();
  return partes[0] + '-' + partes[1] + '-' + (ultimoDia < 10 ? '0' : '') + ultimoDia;
}
