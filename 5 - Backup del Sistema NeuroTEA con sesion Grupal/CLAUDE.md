# NeuroTEA - Sistema de Gestión de Sesiones

## Descripción
Sistema web de gestión para centro de terapias TEA. Registra sesiones, pagos, egresos y genera rendiciones. Aplicación 100% cliente con IndexedDB.

## Archivos
- `index_FIXED.html` - Interfaz (HTML + Tailwind CSS)
- `neurotea-app_FIXED.js` - Lógica de la aplicación

## Stack
HTML5, Tailwind CSS, JavaScript vanilla, Lucide Icons, jsPDF, IndexedDB

## Convenciones
- Formato fecha: `YYYY-MM-DD` (Paraguay UTC-4)
- Moneda: Guaraníes (Gs) sin decimales
- Funciones agrupadas con `// ===`
- Actualizar CLAUDE.md con cambios relevantes
- Aporte NeuroTEA por defecto: **30%** (configurable por sesión)

## PRINCIPIOS DE COHERENCIA SISTÉMICA

### Regla Principal
**Cada cambio DEBE considerar el impacto en TODO el sistema.** Una funcionalidad NO está completa hasta que funciona en las 9 pestañas.

### Pestañas
1. Registro Diario - Formularios de sesiones
2. Resumen Global - Dashboard, totales, saldos
3. Transferencias - Pendientes/confirmadas
4. Rendición de Cuentas - Por terapeuta, reporte HTML
5. Egresos - Gastos y adelantos
6. Gestión de Terapeutas - CRUD
7. Paquetes/Créditos - Prepagos activos
8. Gestionar Grupos - Terapia grupal
9. Administración - Backup/restore

### Checklist para Modificaciones

**Al CREAR:**
- ¿Se registra, muestra en dashboard, rendición, transferencias?
- ¿Se exporta/importa/incluye en backup?
- ¿Se guarda en IndexedDB?

**Al BORRAR:**
- Eliminar de memoria + IndexedDB
- Revertir cálculos (saldos, créditos, confirmaciones)
- Actualizar TODAS las vistas

**Flujos de dinero sincronizados:**
```
Sesión Normal  → Registro + Resumen + Rendición + Transferencias
Sesión Grupal  → Registro + Resumen + Rendición (proporcional)
Paquete        → Registro + Resumen + Paquetes/Créditos
Uso Crédito    → Registro + Rendición (Gs 0) + Paquetes (descuento)
Egreso         → Egresos + Resumen (saldo caja)
```

### Filosofía
1. **Reversibilidad**: Todo se puede eliminar y revertir
2. **Coherencia**: Mismo dato igual en todas las pestañas
3. **Cálculo dinámico**: Saldos se calculan, no se acumulan

## Variables Globales
- `sessions{}`, `egresos{}` - Por fecha
- `saldosReales{}` - Saldos de efectivo y banco
- `saldosIniciales{}` - Saldo inicial por fecha
- `historialSaldos{}` - Historial de cambios por fecha
- `patientCredits{}` - Por paciente → terapeuta
- `dailyPackagePurchases{}` - Paquetes por fecha
- `packageHistory[]` - Paquetes completados
- `groupTherapy{}`, `groupSessions{}` - Grupos
- `confirmaciones{}` - Estados de pago
- `transferConfirmationStates{}` - Confirmaciones de transferencias

## IndexedDB Stores
therapists, sessions, egresos, confirmaciones, patientCredits, dailyPackagePurchases, packageHistory, groupTherapy, groupSessions, saldos, saldosIniciales, historialSaldos, transferConfirmationStates, groupTherapyHistory (deprecated)

## Sistema de Paquetes/Créditos

### Flujo de Créditos
1. `usePatientCredits()` decrementa remaining
2. `syncPackageRemaining()` sincroniza estructuras
3. Si remaining === 0: `moveCompletedPackageToHistory()`

### Funciones Clave
- `createIndependentPackage()`, `createPatientCredits()`
- `usePatientCredits()`, `hasAvailableCredits()`
- `eliminarPaqueteIndividual()`, `eliminarPaqueteHistoricoDesdeModal()`
- `revertSessionCredits()` - Restaura créditos al borrar sesión

## Sesiones Grupales

### División Proporcional
```javascript
valorPorTerapeuta = Math.floor(totalValue / therapistCount)
// Primera terapeuta recibe el residuo
```

### Integración
- Dashboard: valor TOTAL
- Rendición: valor PROPORCIONAL por terapeuta
- Transferencias: INDIVIDUALES por niño
- Registros del Día: tarjeta informativa por terapeuta

### Tarjetas Informativas de Participación Grupal
En "Registros del Día", debajo de cada terapeuta que participó en una sesión grupal, se muestra una tarjeta informativa con:
- Nombre del grupo
- Badge verde "Terapia Grupal"
- Icono ℹ️ informativo (no eliminable desde ahí)
- División: `Gs [Total] ÷ [N] = Gs [Su parte]`
- Aporte NeuroTEA con porcentaje
- Honorarios proporcionales

**Características:**
- Fondo neutro (`bg-gray-50`) con borde izquierdo verde
- Solo informativo - se elimina desde el registro del grupo
- El contador de sesiones del terapeuta incluye sus participaciones grupales

## Rendición de Cuentas

### Estados
- DAR EFECTIVO, DAR Y TRANSFERIR, TRANSFERIR
- LA TERAPEUTA DEBE DAR (cuando debe devolver)
- SALDADO

### Confirmación
```javascript
confirmaciones[fecha][therapist] = {
    type: string,
    tipoOpcion: string, // exacto, vuelto, vuelto-efectivo, transferir, dar-transferir, devolucion-efectivo, devolucion-transferencia
    flujo: { efectivoUsado, efectivoRecibido, bancoUsado, vueltoEfectivo, vueltoTransferencia, tipoOpcion },
    estadoCongelado: {...}
}
```

### tipoOpcion para Comprobantes
- `exacto`: Pago en efectivo exacto
- `vuelto`: Efectivo con vuelto por transferencia
- `vuelto-efectivo`: Efectivo con vuelto en efectivo
- `transferir`: Solo transferencia bancaria
- `dar-transferir`: Pago mixto (efectivo de caja + transferencia) - Estado "DAR Y TRANSFERIR"
- `devolucion-efectivo`: Terapeuta entrega efectivo
- `devolucion-transferencia`: Terapeuta transfiere a cuenta NeuroTEA

## Cálculo Dinámico de Saldos
```javascript
calcularSaldoCajaReal(fecha)     // Saldo = Inicial + Ingresos - Egresos - Pagos
calcularSaldoCuentaNeuroTEA(fecha) // Transferencias entrantes - salientes
```
No usar variables acumulativas. El saldo se recalcula automáticamente.

## Validación de Fondos Insuficientes

### Principio
El sistema **bloquea operaciones de pago** cuando no hay fondos suficientes. No oculta opciones del dropdown, sino que valida al momento de confirmar.

### Validaciones Implementadas

| Operación | Validación | Mensaje de Error |
|-----------|------------|------------------|
| Solo Transferir | `saldoCuentaNeuroTEA >= neuroteaLeDebe` | "No hay suficiente saldo en Cuenta NeuroTEA para transferir" |
| DAR Y TRANSFERIR | `saldoCuentaNeuroTEA >= diferenciaNecesaria` | "No hay suficiente saldo en Cuenta NeuroTEA para completar el pago" |

### Ubicación en Código
- `handlePaymentOption()`: Valida antes de llamar a `confirmTherapistPayment()`
- `confirmTherapistPayment()`: Valida dentro de cada caso (DAR Y TRANSFERIR, TRANSFERIR)

### Comportamiento
```javascript
// Ejemplo: Solo Transferir
if (status.saldoCuentaNeuroTEA < status.neuroteaLeDebe) {
    alert(`No hay suficiente saldo en Cuenta NeuroTEA para transferir.

Necesario: ${formatCurrency(status.neuroteaLeDebe)}
Disponible: ${formatCurrency(status.saldoCuentaNeuroTEA)}

Por favor use otra opción de pago.`);
    return; // Bloquea la operación
}
```

### Casos de Uso
1. **Cuenta NeuroTEA vacía + Estado TRANSFERIR**: Bloqueado
2. **Cuenta NeuroTEA < diferencia + Estado DAR Y TRANSFERIR**: Bloqueado
3. **Caja + Banco < Deuda**: El `calculateTherapistStatus()` retorna estado informativo

## Persistencia

### Patrón de Sincronización
Todos los stores usan `clearAndSaveToIndexedDB()` para sincronizar eliminaciones automáticamente:
- `sessions`, `egresos`, `confirmaciones`
- `patientCredits`, `dailyPackagePurchases`, `packageHistory`
- `groupSessions`, `groupTherapy`

### Funciones Clave
- `saveToStorageAsync()` - Guarda todo en IndexedDB
- `saveToStorage()` - Wrapper síncrono (llama a saveToStorageAsync)
- `loadFromStorage()` - Carga al iniciar
- `clearAndSaveToIndexedDB(store, data)` - Limpia store y re-guarda (sincroniza eliminaciones)
- Fallback a localStorage si IndexedDB falla

### Patrón de Eliminación (CRÍTICO)
```javascript
// CORRECTO: Modificar memoria y llamar saveToStorageAsync
delete sessions[fecha][index];
await saveToStorageAsync();  // clearAndSaveToIndexedDB sincroniza todo

// INCORRECTO: NUNCA usar deleteFromIndexedDB para stores que usan clearAndSave
// Esto causa conflictos de transacción y datos que "reaparecen"
```

### Funciones de Eliminación del Sistema
| Función | Qué elimina | Revierte cálculos |
|---------|-------------|-------------------|
| `deleteSession()` | Sesión individual | ✅ Confirmaciones, créditos |
| `deleteGroupSession()` | Sesión grupal | ✅ Confirmaciones de terapeutas |
| `deleteGroup()` | Grupo y sus sesiones | ✅ Confirmaciones de terapeutas |
| `deleteEgreso()` | Egreso individual | ✅ Saldo caja (dinámico) |
| `clearDayRecords()` | TODO el día | ✅ Todo (confirmaciones, créditos, paquetes) |
| `eliminarPaqueteIndividual()` | Paquete activo | ✅ Créditos de paciente |
| `eliminarPaqueteHistoricoDesdeModal()` | Paquete histórico | ✅ Solo histórico |

**Excepción:** `historialSaldos` y `saldosIniciales` aún usan `saveToIndexedDB` (PUT) y requieren eliminación explícita con `deleteHistorialSaldosByDate()` y `deleteFromIndexedDB()`.

## Backup/Exportación

### Exportar Datos del Día (v3.0)
`exportDayData()` genera JSON con:

**Datos del día específico:**
- `sessions`, `egresos`, `confirmaciones`
- `groupSessions`, `saldosIniciales`
- `transferConfirmationStates` (del día)

**Datos globales para sincronización (`syncData`):**
- `dailyPackagePurchases` - TODOS los paquetes activos
- `patientCredits` - TODOS los créditos de pacientes
- `packageHistory` - TODO el histórico de paquetes
- `groupTherapy` - TODA la configuración de grupos

### Importar Datos del Día
`importDayData()` - Requiere contraseña

**v3.0:** Si detecta `syncData`, SOBRESCRIBE completamente:
- Paquetes activos (todas las fechas)
- Créditos de pacientes
- Histórico de paquetes
- Configuración de grupos

**v2.0 (compatibilidad):** Fusiona datos sin sobrescribir globales.

### Backup Completo
- `createFullBackup()` - JSON completo del sistema
- `importFullBackup()` - Requiere doble confirmación (destructivo)

### Auto-Registro de Terapeutas
Al importar datos (día o backup completo), el sistema extrae automáticamente los nombres de terapeutas de:
- Sesiones individuales (`session.therapist`)
- Egresos/Adelantos (`egreso.therapist`)
- Sesiones grupales (`groupSession.therapists[]`)
- Paquetes activos (`package.therapist`)
- Créditos de pacientes (`patientCredits[patient][therapist]`)
- Configuración de grupos (`groupTherapy[id].therapists[]`)

Si una terapeuta no está registrada en la lista de terapeutas, se agrega automáticamente.
Esto garantiza coherencia entre datos importados y dropdowns de selección.

## Reportes y Comprobantes

### Reporte de Rendición Diaria (HTML)
`generateRendicionHTML()` genera archivo HTML descargable con diseño profesional:
- Header con marca "Avanza NeuroTEA" y fecha
- Resumen Financiero (6 conceptos)
- Rendición por Terapeuta (9 columnas con status badges)
- Egresos del Día (header rojo distintivo)
- Transferencias del Día
- Optimizado para impresión (@media print)
- Descarga como: `NeuroTEA_Rendicion_YYYY_MM_DD.html`
- **Optimización**: Usa `calculateTherapistStatusOptimized()` con datos pre-calculados

### Comprobantes Individuales por Terapeuta (HTML)
`generateReceiptHTMLContent()` genera comprobante individual:
- Detalle de sesiones del terapeuta
- Estado de confirmación y flujo de pago
- Observaciones dinámicas (créditos usados, sesiones grupales)
- Descarga como: `Comprobante_[Terapeuta]_YYYY-MM-DD.html`

### Textos de Transferencias (Estandarizados)
```
Sesión individual: "Pago de sesión con [Terapeuta]"
Sesión grupal:     "Pago de sesión grupal de [Paciente] - "[NombreGrupo]""
Paquete:           "Pago de paquete con [Terapeuta]"
Vuelto:            "Vuelto de [Terapeuta] por pago en efectivo"
```

### Comprobante Individual - Sesiones Grupales
- Columna PACIENTE: Solo nombre del grupo (sin prefijo "Grupo:")
- Observaciones: `[NombreGrupo]: [X] niños presentes. Gs [Total] ÷ [N] = Gs [Valor] p/terapeuta`

### Clases CSS para Estados en Reportes
```css
.status-badge.equilibrado   /* Verde - SALDADO */
.status-badge.debe-recibir  /* Naranja - DAR EFECTIVO/TRANSFERIR */
.status-badge.debe-dar      /* Rojo - LA TERAPEUTA DEBE DAR */
.status-badge.confirmado    /* Azul - Pago confirmado */
```

## Optimización de Rendimiento

### Función Optimizada para Reportes
`calculateTherapistStatusOptimized(therapist, fecha, precalcData)` evita recálculos redundantes:
- Recibe datos pre-calculados: `daySessions`, `allDayPackages`, `dayGroupSessions`, `saldoCaja`, `cuentaNeuroTEA`
- Evita filtrar `packageHistory` múltiples veces
- Usa saldos ya calculados en lugar de recalcularlos por cada terapeuta

## Sistema de Pruebas Automatizadas

### Archivo de Pruebas
`test_sistema.js` - Suite completa con 82 pruebas automatizadas

### Grupos de Pruebas
| Grupo | Cobertura |
|-------|-----------|
| 1-10 | Pruebas unitarias (funciones individuales) |
| 11-15 | Pruebas de integración (flujos completos) |
| 16 | Validación de fondos insuficientes |
| 17 | Sincronización de contadores |

### Ejecución
```bash
node test_sistema.js
```

### Hook Automático
Configurado en `.claude/settings.json` para ejecutar tests automáticamente después de cada modificación a archivos `.js` o `.html`.

## Agentes Especializados (Slash Commands)

### Ubicación
`.claude/commands/`

### Agentes Disponibles

| Comando | Descripción | Cuándo Usar |
|---------|-------------|-------------|
| `/verify-neurotea` | Verificación completa del sistema | Después de cambios grandes o migraciones |
| `/test-neurotea` | Ejecutar pruebas automatizadas | Después de cada modificación de código |
| `/audit-coherence` | Auditar coherencia sistémica | Verificar que los principios se cumplan |

### Uso Recomendado
1. **Después de modificar código**: Usar `/test-neurotea`
2. **Después de agregar funcionalidades**: Usar `/verify-neurotea`
3. **Antes de releases o backups importantes**: Usar `/audit-coherence`

## Protocolo Post-Cambios

Después de reparaciones o mejoras significativas, preguntar al usuario:
- ¿Actualizar tests para cubrir el nuevo comportamiento?
- ¿Actualizar CLAUDE.md con la documentación?
- ¿Actualizar agentes si aplica?

**Nota**: Los tests se ejecutan automáticamente vía hook después de cada Edit/Write.
