# Lecciones Aprendidas y Errores a Evitar
## Sistema NeuroTEA en Google Apps Script

**Última actualización**: 2026-01-31

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

**Ubicaciones conocidas**: Scripts.html líneas 281, 295-297, 320-322, 336, 343-345

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

**Funciones identificadas como código muerto** (Helpers.gs):
- `capitalize()` - Nunca usada
- `deepClone()` - Nunca usada
- `daysBetween()` - Nunca usada
- `formatDateShort()` - Nunca usada
- `generateFileName()` - Nunca usada
- `getLocalDateString()` - Nunca usada
- `isEmpty()` - Nunca usada
- `groupBy()` - Nunca usada
- `isValidDate()` - Nunca usada
- `logSaldoChange()` - Nunca usada
- `parseCurrency()` - Nunca usada
- `sortBy()` - Nunca usada
- `sumField()` - Nunca usada

**Impacto**: Aumenta tamaño del código, confunde a desarrolladores nuevos.

**Recomendación**: Eliminar o documentar propósito futuro.

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

**95.7%** de las llamadas tienen ambos handlers. El 4.3% restante son bugs potenciales.

Ubicación conocida sin handler: Línea 5041 - `getPaquetesActivos()` anidado.

---

### 5.3 Modificar Código sin Leer Contexto

**NUNCA** editar un archivo sin haberlo leído primero. La regla crítica de CLAUDE.md existe por una razón.

---

## 6. Métricas de Calidad Objetivo

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Cobertura frontend/backend | 100% | 100% ✓ |
| Handlers de error | 100% | 95.7% |
| IDs consistentes | 100% | 100% ✓ |
| Código muerto | 0% | ~15% |
| Errores críticos | 0 | 1 |

---

## 7. Recursos de Referencia

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [CLAUDE.md](../CLAUDE.md) - Instrucciones del proyecto
- [PRD.md](./PRD.md) - Requerimientos del producto
- [Skill verify-system](../.claude/skills/verify-system/SKILL.md) - Verificación

---

**Mantener este documento actualizado** después de cada incidente o descubrimiento importante.
