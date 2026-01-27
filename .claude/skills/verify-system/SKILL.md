---
name: verify-system
description: Verificacion completa del sistema NeuroTEA. Ejecutar despues de cambios para detectar errores antes de commit.
---

# Verificacion del Sistema NeuroTEA

Ejecutar estos pasos en orden. TODOS deben pasar antes de considerar el trabajo completo.

## Paso 1: Verificar IDs HTML vs JavaScript

Buscar IDs usados en JavaScript que NO existen en HTML:

```bash
cd /home/user/Sistema-NeuroTEA-en-Google

# Extraer IDs usados en JavaScript
grep -oE "getElementById\(['\"]([^'\"]+)['\"]\)" gas/Scripts.html | \
  sed "s/.*getElementById(['\"]//;s/['\"].*//" | sort -u > /tmp/js_ids.txt

# Extraer IDs definidos en HTML
grep -oE 'id="([^"]+)"' gas/Index.html | \
  sed 's/id="//;s/"//' | sort -u > /tmp/html_ids.txt

echo "=== IDs en JavaScript pero NO en HTML (ERRORES CRITICOS) ==="
comm -23 /tmp/js_ids.txt /tmp/html_ids.txt

echo ""
echo "=== IDs en HTML pero no usados en JavaScript (OK, solo informativo) ==="
comm -13 /tmp/js_ids.txt /tmp/html_ids.txt | head -10
```

**Si hay IDs en la primera seccion**: Son ERRORES que causaran `null` en runtime.

## Paso 2: Verificar Funciones Backend vs Frontend

Buscar funciones llamadas desde frontend que NO existen en backend:

```bash
cd /home/user/Sistema-NeuroTEA-en-Google

# Funciones llamadas desde frontend
grep -oE "google\.script\.run[^.]*\.([a-zA-Z_]+)" gas/Scripts.html | \
  sed 's/.*\.//' | sort -u > /tmp/called.txt

# Funciones definidas en backend
grep -oE "^function [a-zA-Z_][a-zA-Z0-9_]*" gas/*.gs | \
  sed 's/.*function //' | sort -u > /tmp/defined.txt

echo "=== Funciones llamadas pero NO definidas (ERRORES CRITICOS) ==="
comm -23 /tmp/called.txt /tmp/defined.txt

echo ""
echo "=== Funciones definidas en backend ==="
wc -l /tmp/defined.txt
```

**Si hay funciones faltantes**: Crear la funcion o corregir el nombre.

## Paso 3: Verificar Propiedades de Objetos

Verificar que las propiedades usadas en frontend coincidan con las del backend:

```bash
cd /home/user/Sistema-NeuroTEA-en-Google

echo "=== Propiedades de Sesion Individual (SessionService.create) ==="
grep -A 25 "const session = {" gas/SessionService.gs | grep -oE "[a-zA-Z]+:" | head -15

echo ""
echo "=== Propiedades de Sesion Grupal (GroupSessionService.create) ==="
grep -A 25 "const session = {" gas/GroupSessionService.gs | grep -oE "[a-zA-Z]+:" | head -20

echo ""
echo "=== Verificar uso en Scripts.html (session.PROPIEDAD) ==="
grep -oE "session\.[a-zA-Z]+" gas/Scripts.html | sort | uniq -c | sort -rn | head -15
```

**Revisar**: Que las propiedades usadas en frontend existan en el objeto del backend.

## Paso 4: Verificar withFailureHandler

Todas las llamadas google.script.run deben tener manejo de errores:

```bash
cd /home/user/Sistema-NeuroTEA-en-Google

echo "=== Llamadas SIN withFailureHandler (ADVERTENCIAS) ==="
grep -n "google.script.run" gas/Scripts.html | \
  grep -v "withFailureHandler" | head -10

echo ""
echo "Total llamadas google.script.run:"
grep -c "google.script.run" gas/Scripts.html

echo "Llamadas CON withFailureHandler:"
grep -c "withFailureHandler" gas/Scripts.html
```

**Si hay llamadas sin handler**: Agregar `.withFailureHandler(onError)` o handler especifico.

## Paso 5: Verificar Consistencia de Flujos

Verificar que los flujos criticos esten completos:

```bash
cd /home/user/Sistema-NeuroTEA-en-Google

echo "=== Flujo: Registrar Sesion ==="
echo "Frontend llama: $(grep -c 'registrarSesion' gas/Scripts.html) veces"
echo "Backend define: $(grep -c 'function registrarSesion' gas/*.gs) veces"

echo ""
echo "=== Flujo: Eliminar Sesion ==="
echo "Frontend llama: $(grep -c 'eliminarSesion' gas/Scripts.html) veces"
echo "Backend define: $(grep -c 'function eliminarSesion' gas/*.gs) veces"
echo "Limpia creditos: $(grep -c 'revertCredit' gas/SessionService.gs) veces"
echo "Limpia transferencias: $(grep -c 'cleanupSessionTransferState' gas/SessionService.gs) veces"

echo ""
echo "=== Flujo: Crear Paquete ==="
echo "Frontend llama: $(grep -c 'crearPaquete' gas/Scripts.html) veces"
echo "Backend define: $(grep -c 'function crearPaquete' gas/*.gs) veces"
echo "Crea creditos: $(grep -c 'createCredits' gas/PackageService.gs) veces"
```

## Paso 6: Verificar Operaciones de Borrado e Import/Export

Verificar que cada entidad tenga flujo de borrado completo:

```bash
cd /home/user/Sistema-NeuroTEA-en-Google

echo "=== Verificar funciones de borrado backend ==="
echo "eliminarTerapeuta: $(grep -c 'function eliminarTerapeuta' gas/TherapistService.gs)"
echo "eliminarSesion: $(grep -c 'function eliminarSesion' gas/SessionService.gs)"
echo "eliminarSesionGrupal: $(grep -c 'function eliminarSesionGrupal' gas/GroupSessionService.gs)"
echo "eliminarEgreso: $(grep -c 'function eliminarEgreso' gas/EgresoService.gs)"
echo "eliminarPaquete: $(grep -c 'function eliminarPaquete' gas/PackageService.gs)"
echo "eliminarGrupo: $(grep -c 'function eliminarGrupo' gas/GroupService.gs)"

echo ""
echo "=== Verificar llamadas frontend → backend de borrado ==="
echo "eliminarTerapeuta llamado: $(grep -c 'eliminarTerapeuta' gas/Scripts.html)"
echo "eliminarSesion llamado: $(grep -c 'eliminarSesion' gas/Scripts.html)"
echo "eliminarSesionGrupal llamado: $(grep -c 'eliminarSesionGrupal' gas/Scripts.html)"
echo "eliminarEgreso llamado: $(grep -c 'eliminarEgreso' gas/Scripts.html)"
echo "eliminarPaquete llamado: $(grep -c 'eliminarPaquete' gas/Scripts.html)"
echo "eliminarGrupo llamado: $(grep -c 'eliminarGrupo' gas/Scripts.html)"

echo ""
echo "=== Verificar limpieza de dependencias al borrar sesion ==="
echo "revertCredit en SessionService: $(grep -c 'revertCredit' gas/SessionService.gs)"
echo "cleanupSessionConfirmations: $(grep -c 'cleanupSessionConfirmations' gas/SessionService.gs)"
echo "cleanupSessionTransferState: $(grep -c 'cleanupSessionTransferState' gas/SessionService.gs)"

echo ""
echo "=== Verificar import/export ==="
echo "validateDayDataStructure: $(grep -c 'validateDayDataStructure' gas/Scripts.html)"
echo "validateFullBackupStructure: $(grep -c 'validateFullBackupStructure' gas/Scripts.html)"
echo "detectDataConflicts: $(grep -c 'detectDataConflicts' gas/Scripts.html)"
echo "showConflictResolutionDialog: $(grep -c 'showConflictResolutionDialog' gas/Scripts.html)"
echo "executeDayDataImport: $(grep -c 'executeDayDataImport' gas/Scripts.html)"
```

**Todas las funciones deben existir (> 0)**. Si falta alguna, es un ERROR CRITICO.

## Reporte Final

Despues de ejecutar todos los pasos:

```
=== REPORTE DE VERIFICACION ===
Fecha: [fecha actual]

ERRORES CRITICOS (deben corregirse):
- [ ] IDs faltantes en HTML: ___
- [ ] Funciones faltantes en backend: ___
- [ ] Propiedades inconsistentes: ___
- [ ] Funciones de borrado faltantes: ___
- [ ] Funciones de import/export faltantes: ___

ADVERTENCIAS (revisar):
- [ ] Llamadas sin withFailureHandler: ___
- [ ] Flujos incompletos: ___
- [ ] Limpieza de dependencias incompleta: ___

RESULTADO: ___ errores, ___ advertencias
ACCION: [Corregir errores / Listo para commit]
===============================
```

**IMPORTANTE**: NO hacer commit hasta que ERRORES CRITICOS = 0
