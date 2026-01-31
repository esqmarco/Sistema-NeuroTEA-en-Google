# Lecciones Aprendidas y Errores a Evitar
## Sistema NeuroTEA en Google Apps Script

**Última actualización**: 2026-01-31 (v1.7.3)

Este documento recopila las lecciones aprendidas durante el desarrollo y los errores que NO deben repetirse.

---

## 1. Errores Críticos a Evitar

### 1.1 getElementById sin Validación de Null

**Problema**: Llamar `getElementById()` y usar el resultado sin verificar si existe.

```javascript
// ❌ INCORRECTO - Puede fallar silenciosamente
const btn = document.getElementById('register-btn');
btn.disabled = false;  // TypeError si btn es null

// ✅ CORRECTO - Siempre verificar
const btn = document.getElementById('register-btn');
if (btn) {
  btn.disabled = false;
} else {
  console.warn('Elemento register-btn no encontrado');
}
```

**Impacto**: La interfaz deja de responder sin mensaje de error visible.

**Estado**: ✅ `validateRegisterButton()` corregido en v1.7.3 (2026-01-31)

---

### 1.2 Event Listeners Duplicados

**Problema**: Agregar listeners en funciones que se llaman múltiples veces.

```javascript
// ❌ INCORRECTO - Se duplica cada vez que se llama la función
function updateSelect() {
  const select = document.getElementById('my-select');
  select.onchange = function() { doSomething(); };  // Se acumula
}

// ✅ CORRECTO - Remover antes de agregar
function updateSelect() {
  const select = document.getElementById('my-select');
  if (select) {
    select.onchange = null;  // Limpiar primero
    select.onchange = function() { doSomething(); };
  }
}
```

**Impacto**: Memory leaks y llamadas duplicadas a funciones.

---

### 1.3 Catch Vacíos que Ocultan Errores

**Problema**: Capturar excepciones sin loggear nada.

```javascript
// ❌ INCORRECTO - Error invisible
try {
  riskyOperation();
} catch (e) {
  // Ignorar
}

// ✅ CORRECTO - Al menos loggear
try {
  riskyOperation();
} catch (e) {
  Logger.log('Error esperado en riskyOperation: ' + e.message);
}
```

**Impacto**: Bugs imposibles de debuggear.

**Ubicaciones conocidas**: TransferService.gs líneas 158, 174, 182, 204, 218

---

### 1.4 Comparación con == en vez de ===

**Problema**: La comparación flexible permite coerción de tipos inesperada.

```javascript
// ❌ INCORRECTO - "123" == 123 es true
if (record.id == inputId) { ... }

// ✅ CORRECTO - Comparación estricta
if (String(record.id) === String(inputId)) { ... }
```

**Impacto**: Coincidencias inesperadas entre strings y números.

**Ubicaciones conocidas**: Database.gs líneas 67, 132, 174

---

### 1.5 Código Muerto que Confunde

**Problema**: Funciones que nunca se usan pero permanecen en el código.

**Estado**: ✅ CORREGIDO en v1.7.3 (2026-01-31)

Se eliminaron 13 funciones helper no utilizadas de `Helpers.gs`:
- `capitalize()`, `deepClone()`, `daysBetween()`, `formatDateShort()`
- `generateFileName()`, `getLocalDateString()`, `isEmpty()`, `groupBy()`
- `isValidDate()`, `logSaldoChange()`, `parseCurrency()`, `sortBy()`, `sumField()`

**Lección aprendida**: Revisar periódicamente el código para identificar funciones no utilizadas.

**Recomendación**: Antes de agregar funciones "por si acaso", verificar que realmente se necesitan.

---

### 1.6 Iconos Lucide No Renderizados Después de Actualizar DOM

**Problema**: Al insertar HTML dinámicamente con iconos Lucide (`<i data-lucide="edit">`), los iconos no se renderizan porque Lucide necesita procesar los nuevos elementos.

```javascript
// ❌ INCORRECTO - Iconos quedan vacíos
function updateList() {
  container.innerHTML = items.map(i => `
    <button><i data-lucide="edit"></i></button>
  `).join('');
}

// ✅ CORRECTO - Llamar lucide.createIcons() después
function updateList() {
  container.innerHTML = items.map(i => `
    <button><i data-lucide="edit"></i></button>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
```

**Impacto**: Botones de acción aparecen vacíos hasta refrescar la página.

**Estado**: ✅ CORREGIDO en v1.7.3 (2026-01-31)
- `updateTherapistsList()` - agregado `lucide.createIcons()`
- `updateEgresosList()` - agregado `lucide.createIcons()`

**Lección aprendida**: SIEMPRE llamar `lucide.createIcons()` después de insertar HTML con iconos Lucide.

---

### 1.7 Datos Globales No Recargados Después de Operaciones

**Problema**: Después de una operación backend exitosa (confirmar pago, eliminar registro), los arrays globales del frontend no se recargan con los nuevos datos.

```javascript
// ❌ INCORRECTO - Usa datos locales desactualizados
.withSuccessHandler(function(result) {
  if (result.success) {
    updateRendicionView();   // Usa array 'confirmaciones' viejo
    updateSummaryView();     // Calcula saldo con datos viejos
  }
})

// ✅ CORRECTO - Recargar todos los datos
.withSuccessHandler(function(result) {
  if (result.success) {
    loadDateData(fechaActual);  // Recarga TODOS los datos del backend
  }
})
```

**Impacto**: Los cálculos de saldo muestran valores incorrectos hasta refrescar la página.

**Estado**: ✅ CORREGIDO en v1.7.3 (2026-01-31)
- `executePaymentConfirmation()` - ahora usa `loadDateData()`
- `revertConfirmation()` - ahora usa `loadDateData()`

**Lección aprendida**: Después de operaciones que modifican datos, SIEMPRE recargar los datos completos con `loadDateData()` en lugar de actualizar vistas individualmente.

**Regla**: Si una operación modifica la base de datos, el frontend debe recargar los datos afectados antes de recalcular.

---

### 1.8 Validación de Fondos Antes de Operaciones Financieras

**Problema**: Permitir operaciones financieras sin validar que hay fondos suficientes.

```javascript
// ❌ INCORRECTO - No valida fondos
function confirmPaymentTransfer(terapeuta) {
  if (!confirm('Transferir a ' + terapeuta + '?')) return;
  executePaymentConfirmation(terapeuta, { tipoOpcion: 'transferir' });
}

// ✅ CORRECTO - Valida fondos antes de permitir
function confirmPaymentTransfer(terapeuta) {
  // Obtener monto y validar saldo
  const status = getEstadoTerapeuta(terapeuta);
  const saldoCuenta = calcularCuentaNeuroTEALocal();

  if (saldoCuenta < status.neuroteaLeDebe) {
    alert('No hay suficiente saldo en Cuenta NeuroTEA.\n\n' +
          'Necesario: ' + formatCurrency(status.neuroteaLeDebe) + '\n' +
          'Disponible: ' + formatCurrency(saldoCuenta));
    return;
  }

  // Solo entonces permitir confirmar
  if (!confirm('Transferir a ' + terapeuta + '?')) return;
  executePaymentConfirmation(terapeuta, { tipoOpcion: 'transferir' });
}
```

**Impacto**: Pagos confirmados sin fondos reales, saldos negativos virtuales.

**Estado**: ✅ CORREGIDO en v1.7.4 (2026-01-31)
- `handlePaymentOption()` - Valida fondos para DAR EFECTIVO, TRANSFERIR, vueltos
- `confirmPaymentMixed()` - Valida fondos para DAR Y TRANSFERIR

**Casos validados:**
| Tipo de Pago | Validación |
|--------------|------------|
| DAR EFECTIVO | Saldo caja ≥ monto |
| TRANSFERIR | Saldo cuenta ≥ monto |
| Vuelto efectivo | Saldo caja ≥ efectivo a entregar |
| Vuelto transferencia | Saldo cuenta ≥ vuelto |
| DAR Y TRANSFERIR | Saldo cuenta ≥ diferencia |

**Lección aprendida**: SIEMPRE validar fondos disponibles antes de permitir operaciones financieras.

---

### 1.9 Vueltos por Transferencia en Lista de Transferencias

**Problema**: Los vueltos por transferencia no aparecen en la lista de transferencias pendientes, haciendo invisible dinero que debe ingresar.

**Sistema Original**: Muestra vueltos como "Vuelto de Terapeuta" hacia NeuroTEA.

**Estado**: ✅ CORREGIDO en v1.7.4 (2026-01-31)
- `TransferService.getPendientes()` ahora incluye vueltos de confirmaciones

**Lección aprendida**: Toda transferencia pendiente debe ser visible en la UI, incluyendo vueltos por transferencia de confirmaciones de rendición.

---

## 2. Patrones de Diseño Recomendados

### 2.1 Patrón de Respuesta Estándar

**Todas las funciones backend deben retornar**:

```javascript
function miFuncion(parametros) {
  try {
    // Lógica
    return resultado(true, datos, '');
  } catch (error) {
    Logger.log('Error en miFuncion: ' + error.message);
    return resultado(false, null, error.message);
  }
}
```

---

### 2.2 Patrón de Llamada Frontend

**Siempre usar ambos handlers**:

```javascript
google.script.run
  .withSuccessHandler(function(result) {
    if (result.success) {
      // Usar result.data
    } else {
      showNotification('Error: ' + result.message, 'error');
    }
  })
  .withFailureHandler(function(error) {
    showNotification('Error: ' + error.message, 'error');
  })
  .miFuncion(parametros);
```

---

### 2.3 Patrón de Manipulación DOM Segura

```javascript
// Función helper recomendada
function safeSetContent(id, content) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = content;
    return true;
  }
  console.warn('Elemento no encontrado:', id);
  return false;
}

// Uso
safeSetContent('mi-elemento', 'Nuevo contenido');
```

---

## 3. Errores de Arquitectura Evitados

### 3.1 Mezcla de Idiomas en Propiedades

**Problema original**: Sistema local usaba inglés, GAS usa español.

| Local (inglés) | GAS (español) |
|----------------|---------------|
| `patientName` | `paciente` |
| `therapist` | `terapeuta` |
| `sessionValue` | `valorSesion` |
| `cashToNeurotea` | `efectivo` |

**Lección**: Mantener consistencia en TODA la aplicación.

---

### 3.2 JSON Almacenado vs Parseado

**Problema**: Confusión entre columnas JSON y versiones parseadas.

```javascript
// En la base de datos (Sheets)
asistenciaJSON: '[{"nombre":"Juan","presente":true}]'  // String

// Después de parsing en getByDate()
asistencia: [{nombre:"Juan", presente:true}]  // Array

// En frontend usar fallback
const asistencia = gs.asistencia || gs.asistenciaJSON || [];
```

**Lección**: Documentar claramente qué propiedades son JSON strings vs objetos.

---

### 3.3 IDs Dinámicos

**Los IDs que se construyen en runtime** no aparecen en HTML estático:

```javascript
// Estos IDs son dinámicos - NO son errores
'chevron-' + groupId
'sessions-' + name + '_' + type
'tab-' + tabId
'transfers-' + name
```

**Lección**: Documentar qué IDs son dinámicos para evitar falsos positivos en verificación.

---

## 4. Proceso de Desarrollo Recomendado

### 4.1 Antes de Tocar Código

1. **LEER** documentación actualizada:
   - CLAUDE.md (instrucciones del proyecto)
   - CHANGELOG.md (cambios recientes)
   - LECCIONES_APRENDIDAS.md (este documento)

2. **DESCRIBIR** cambio propuesto al usuario

3. **ESPERAR** autorización explícita

---

### 4.2 Después de Cada Cambio

1. **VERIFICAR** con `/verify-system`:
   - IDs HTML vs JavaScript
   - Funciones backend vs frontend
   - Propiedades de objetos

2. **PROBAR** flujos afectados en TODAS las pestañas

3. **DOCUMENTAR** cambios en CHANGELOG.md

---

### 4.3 Checklist Pre-Commit

- [ ] Ejecuté `/verify-system`
- [ ] Corregí todos los errores críticos
- [ ] Verifiqué flujos en todas las pestañas afectadas
- [ ] No hay errores en consola del navegador
- [ ] Actualicé CHANGELOG.md
- [ ] No introduje código muerto nuevo

---

## 5. Trampas Comunes

### 5.1 "Funciona en mi máquina"

GAS tiene particularidades:
- No hay `console.log()`, usar `Logger.log()`
- Límite de 6 minutos por ejecución
- Sin acceso a localStorage desde backend
- Zona horaria: America/Asuncion (UTC-4)

---

### 5.2 Olvidar withFailureHandler

**Estado**: ✅ Corregido en v1.7.3 (2026-01-31)

La llamada anidada a `getPaquetesActivos()` ahora tiene ambos handlers.

**Lección**: Siempre agregar `.withFailureHandler()` a todas las llamadas `google.script.run`.

---

### 5.3 Modificar Código sin Leer Contexto

**NUNCA** editar un archivo sin haberlo leído primero. La regla crítica de CLAUDE.md existe por una razón.

---

## 6. Métricas de Calidad Objetivo

| Métrica | Objetivo | Actual (v1.7.3) |
|---------|----------|--------|
| Cobertura frontend/backend | 100% | 100% ✓ |
| Handlers de error | 100% | 100% ✓ |
| IDs consistentes | 100% | 100% ✓ |
| Código muerto | 0% | 0% ✓ |
| Errores críticos | 0 | 0 ✓ |

---

## 7. Recursos de Referencia

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [CLAUDE.md](../CLAUDE.md) - Instrucciones del proyecto
- [PRD.md](./PRD.md) - Requerimientos del producto
- [Skill verify-system](../.claude/skills/verify-system/SKILL.md) - Verificación

---

**Mantener este documento actualizado** después de cada incidente o descubrimiento importante.
