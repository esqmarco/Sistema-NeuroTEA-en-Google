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
