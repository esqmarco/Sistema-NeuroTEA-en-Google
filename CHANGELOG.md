# Changelog
## Sistema NeuroTEA en Google Apps Script

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.7.2] - 2026-01-29

### Agregado
- Nueva función `registerCreditSession()` para registrar sesiones usando créditos
- Nueva función backend `registrarSesionConCredito()` que usa créditos y mueve a historial
- Nueva función `updateTransferStatusButton()` para actualizar botón sin recargar vista

### Corregido
- Botón de registrar ahora se habilita correctamente al seleccionar paciente con crédito
- `updateCreditInfo()` ahora llama a `validateRegisterButton()` después de seleccionar paciente
- `registerSession()` ahora detecta modo de registro y llama a función correcta
- Visualización de paquetes activos ahora muestra desglose completo
- Toggle de confirmación de transferencias ahora funciona con un solo clic

---

## [1.7.1] - 2026-01-28

### Corregido
- Transferencias de paquetes a terapeuta ahora aparecen en pestaña Transferencias
- `TransferService.getPendientes()` ahora incluye paquetes con `transferenciaTerapeuta > 0`
- `PackageService.moveToHistory()` ahora guarda `transferenciaTerapeuta` en historial
- `cleanupPackageTransferState()` ahora limpia estados de transferencia correctamente
- Estructura de hoja `HistorialPaquetes` actualizada con campos faltantes

---

## [1.7.0] - 2026-01-28

### Agregado
- Nueva función `updateSheetColumns()` para agregar columnas faltantes
- Nueva función `reorderSheetColumns()` para reordenar columnas
- Campo `transferenciaTerapeuta` agregado a sesiones grupales

### Corregido
- Rendición ahora incluye transferencias a terapeuta de sesiones grupales
- Transferencias pendientes incluyen sesiones grupales con transferencia a terapeuta
- Saldo caja local no cuenta sesiones con usaCredito (evita doble conteo)
- Cuenta NeuroTEA local no cuenta sesiones con usaCredito

---

## [1.6.0] - 2026-01-27

### Agregado
- Hook PreToolUse que recuerda al agente pedir autorización
- Nueva sección "Comportamiento de Borrado por Entidad" en CLAUDE.md
- Nueva sección "Import/Export Estado Actual" en CLAUDE.md

### Documentación
- Corregida sección "Migración" - documentada incompatibilidad JSON local vs GAS
- Actualizado skill verify-system con Paso 6 de verificación de borrado

---

## [1.5.1] - 2026-01-27

### Corregido
- `deleteTherapist()` ahora hace borrado permanente (hard delete)
- Si terapeuta tiene registros asociados, ofrece desactivar como alternativa
- `validateFullBackupStructure()` corregido campo `date` -> `createdAt`

### Agregado
- Nueva función backend `eliminarTerapeuta()` expuesta al frontend

---

## [1.5.0] - 2026-01-27

### Agregado
- Detección de conflictos al importar datos del día
- Nueva función `validateDayDataStructure()` para validar estructura
- Nueva función `validateFullBackupStructure()` para validar backup
- Nueva función `detectDataConflicts()` para detectar conflictos
- Nueva función `showConflictResolutionDialog()` con diálogo modal
- Nueva función `executeDayDataImport()` con modo elegido

### Corregido
- `importDayData()` ahora detecta conflictos antes de enviar al backend
- `importFullBackup()` ahora valida estructura del archivo

---

## [1.4.0] - 2026-01-27

### Agregado
- Funciones `calcularSaldoCajaLocal()` y `calcularCuentaNeuroTEALocal()`
- Generador de comprobantes/recibos HTML con layout A4
- Generador de reporte de rendición HTML
- Función `updateSaldoBadge()` para estado de saldo inicial

### Corregido
- Cálculo de saldo en caja y cuenta NeuroTEA en Dashboard
- `paquetesFecha` agregado a carga de datos iniciales
- Advertencia de pago grupal en modal de sesión grupal
- `updatePaymentDisplay()` ahora llama `validateRegisterButton()`
- Botón crear paquete habilita/deshabilita según validez
- Inicialización de `confirmaciones` como array (era objeto)

---

## [1.3.0] - 2026-01-22

### Agregado
- Sistema de verificación automática con hooks
- Nuevo skill `/verify-system` para verificación completa
- Hooks PostToolUse para validar ediciones
- Hooks Stop para verificación final
- Sección de verificación obligatoria en CLAUDE.md
- Configuración en `.claude/settings.json`

---

## [1.2.0] - 2025-01-18

### Agregado
- Sección de verificación sistemática para agentes
- Patrones de código seguro documentados
- Ciclos de verificación automatizados definidos

---

## [1.1.0] - 2025-01-17

### Agregado
- Sistema de autorización por correo electrónico
- Nueva hoja `Autorizaciones` para gestionar accesos
- Página `AccesoDenegado.html` para usuarios no autorizados

---

## [1.0.0] - 2025-01-16

### Agregado
- Migración inicial desde versión local (IndexedDB)
- Implementación completa de todas las funcionalidades
- Base de datos en Google Sheets
- 9 pestañas funcionales:
  - Registro Diario
  - Resumen Global
  - Transferencias
  - Rendición de Cuentas
  - Egresos
  - Gestión de Terapeutas
  - Paquetes/Créditos
  - Gestionar Grupos
  - Administración

---

## Tipos de Cambios

- **Agregado**: Para nuevas funcionalidades
- **Cambiado**: Para cambios en funcionalidades existentes
- **Obsoleto**: Para funcionalidades que serán eliminadas
- **Eliminado**: Para funcionalidades eliminadas
- **Corregido**: Para corrección de bugs
- **Seguridad**: Para vulnerabilidades corregidas
- **Documentación**: Para cambios en documentación
