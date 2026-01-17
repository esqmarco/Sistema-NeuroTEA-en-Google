/**
 * ===========================
 * FUNCIONES AUXILIARES
 * Utilidades generales del sistema
 * ===========================
 */

/**
 * Formatea un numero como moneda (Guaranies)
 * @param {number} value - Valor a formatear
 * @returns {string} - Valor formateado
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return 'Gs 0';
  const num = parseInt(value) || 0;
  return 'Gs ' + num.toLocaleString('es-PY');
}

/**
 * Formatea solo el numero (sin prefijo Gs)
 * @param {number} value - Valor a formatear
 * @returns {string} - Numero formateado
 */
function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  const num = parseInt(value) || 0;
  return num.toLocaleString('es-PY');
}

/**
 * Parsea un valor de moneda a numero
 * @param {string|number} value - Valor a parsear
 * @returns {number} - Valor numerico
 */
function parseCurrency(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  // Remover "Gs", espacios, puntos de miles
  const cleaned = String(value)
    .replace(/Gs/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '');

  return parseInt(cleaned) || 0;
}

/**
 * Formatea una fecha ISO a formato legible
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} - Fecha formateada
 */
function formatDate(fecha) {
  if (!fecha) return '';

  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return `${dias[date.getDay()]}, ${day} de ${meses[month - 1]} de ${year}`;
}

/**
 * Formatea fecha corta DD/MM/YYYY
 * @param {string} fecha - Fecha YYYY-MM-DD
 * @returns {string} - Fecha DD/MM/YYYY
 */
function formatDateShort(fecha) {
  if (!fecha) return '';
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (Paraguay)
 * @returns {string} - Fecha actual
 */
function getLocalDateString() {
  return getFechaActual();
}

/**
 * Valida formato de fecha YYYY-MM-DD
 * @param {string} fecha - Fecha a validar
 * @returns {boolean} - True si es valida
 */
function isValidDate(fecha) {
  if (!fecha) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) return false;

  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
}

/**
 * Calcula la diferencia en dias entre dos fechas
 * @param {string} fecha1 - Primera fecha YYYY-MM-DD
 * @param {string} fecha2 - Segunda fecha YYYY-MM-DD
 * @returns {number} - Diferencia en dias
 */
function daysBetween(fecha1, fecha2) {
  const d1 = new Date(fecha1);
  const d2 = new Date(fecha2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Genera un color de badge segun estado
 * @param {string} estado - Estado de rendicion
 * @returns {string} - Clase CSS del badge
 */
function getBadgeClass(estado) {
  const badgeClasses = {
    'SALDADO': 'badge-secondary',
    'DAR EFECTIVO': 'badge-success',
    'DAR Y TRANSFERIR': 'badge-warning',
    'TRANSFERIR': 'badge-info',
    'LA TERAPEUTA DEBE DAR': 'badge-danger',
    'FONDOS INSUFICIENTES': 'badge-danger',
    'CONFIRMADO': 'badge-success'
  };

  return badgeClasses[estado] || 'badge-secondary';
}

/**
 * Capitaliza la primera letra de cada palabra
 * @param {string} str - Texto a capitalizar
 * @returns {string} - Texto capitalizado
 */
function capitalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

/**
 * Sanitiza un string para uso seguro
 * @param {string} str - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Genera un nombre de archivo seguro
 * @param {string} base - Nombre base
 * @param {string} extension - Extension del archivo
 * @returns {string} - Nombre de archivo
 */
function generateFileName(base, extension) {
  const sanitized = base.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${sanitized}_${timestamp}.${extension}`;
}

/**
 * Verifica si un valor esta vacio
 * @param {*} value - Valor a verificar
 * @returns {boolean} - True si esta vacio
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Agrupa un array por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} key - Propiedad para agrupar
 * @returns {Object} - Objeto agrupado
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Suma un campo de un array de objetos
 * @param {Array} array - Array de objetos
 * @param {string} field - Campo a sumar
 * @returns {number} - Suma total
 */
function sumField(array, field) {
  return array.reduce((sum, item) => sum + (item[field] || 0), 0);
}

/**
 * Ordena un array por una propiedad
 * @param {Array} array - Array a ordenar
 * @param {string} key - Propiedad para ordenar
 * @param {boolean} desc - Orden descendente
 * @returns {Array} - Array ordenado
 */
function sortBy(array, key, desc = false) {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return desc ? 1 : -1;
    if (a[key] > b[key]) return desc ? -1 : 1;
    return 0;
  });
}

/**
 * Clona profundamente un objeto
 * @param {Object} obj - Objeto a clonar
 * @returns {Object} - Objeto clonado
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Registra un mensaje en el historial de saldos
 * @param {string} fecha - Fecha
 * @param {string} mensaje - Mensaje a registrar
 */
function logSaldoChange(fecha, mensaje) {
  Database.insert(SHEETS.HISTORIAL_SALDOS, {
    fecha: fecha,
    mensaje: mensaje,
    timestamp: getTimestamp()
  });
}
