# Setup de Iteraciones del Método Simplex

## Cambios Realizados

### 1. Schema de Prisma Actualizado

Se agregó el modelo `SimplexIteration` para guardar cada iteración del método Simplex:

```prisma
model SimplexIteration {
  id              Int      @id @default(autoincrement())
  problemId       Int
  problem         Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)
  iterationNumber Int
  tableau         Json     // Matriz del tableau completo
  basicVariables  Json     // Variables básicas de esta iteración
  objectiveValue  Float
  enteringVar     String?  // Variable que entra (si aplica)
  leavingVar      String?  // Variable que sale (si aplica)
  isOptimal       Boolean  @default(false)
  createdAt       DateTime @default(now())

  @@index([problemId])
}
```

### 2. Controlador Actualizado

- Se agregó el método `saveIterations()` que guarda cada iteración en la base de datos
- Se agregó el endpoint `getIterationsByProblemId()` para obtener las iteraciones de un problema
- El método `solveProblemById()` ahora guarda automáticamente las iteraciones al resolver un problema

### 3. Rutas Actualizadas

Se agregó la ruta:
```
GET /api/simplex/:id/iterations
```

## Pasos para Completar el Setup

### 1. Generar el Cliente de Prisma

Ejecuta en CMD (no PowerShell):
```bash
cd c:\dev\ICS-Metodo-Simplex\backend
npx prisma generate
```

### 2. Ejecutar la Migración de Base de Datos

**IMPORTANTE:** Asegúrate de que tu base de datos PostgreSQL esté corriendo y las credenciales en `.env` sean correctas.

```bash
npx prisma migrate dev --name add-simplex-iterations
```

### 3. Verificar la Base de Datos

Una vez ejecutada la migración, deberías ver la nueva tabla `SimplexIteration` en tu base de datos.

## Uso de las Iteraciones

### Backend

Cuando resuelves un problema con ID:
```
POST /api/simplex/:id/solve
```

Las iteraciones se guardan automáticamente en la base de datos.

Para obtener las iteraciones:
```
GET /api/simplex/:id/iterations
```

Respuesta esperada:
```json
{
  "msg": "Iteraciones obtenidas",
  "iterations": [
    {
      "id": 1,
      "problemId": 1,
      "iterationNumber": 1,
      "tableau": [[1, 0, 5], [0, 1, 8], [0, 0, 0]],
      "basicVariables": { "s1": 5, "s2": 8 },
      "objectiveValue": 0,
      "enteringVar": null,
      "leavingVar": null,
      "isOptimal": false,
      "createdAt": "2025-11-04T..."
    },
    {
      "id": 2,
      "problemId": 1,
      "iterationNumber": 2,
      "tableau": [[1, 0, 2], [0, 1, 8], [0, 0, 9]],
      "basicVariables": { "x1": 3, "s2": 8 },
      "objectiveValue": 9,
      "enteringVar": "x1",
      "leavingVar": "s1",
      "isOptimal": false,
      "createdAt": "2025-11-04T..."
    },
    {
      "id": 3,
      "problemId": 1,
      "iterationNumber": 3,
      "tableau": [[1, 0, 0], [0, 1, 2], [0, 0, 14]],
      "basicVariables": { "x1": 2, "x2": 4 },
      "objectiveValue": 14,
      "enteringVar": "x2",
      "leavingVar": "s1",
      "isOptimal": true,
      "createdAt": "2025-11-04T..."
    }
  ]
}
```

## Frontend

Ahora puedes consumir este endpoint desde el frontend para mostrar las tablas intermedias con navegación entre iteraciones.

## Notas

- Las iteraciones se guardan solo cuando se resuelve un problema que ya existe en la base de datos (con ID)
- Si resuelves el mismo problema nuevamente, las iteraciones anteriores se eliminan y se guardan las nuevas
- El campo `isOptimal` marca la última iteración (solución óptima)
- Los campos `enteringVar` y `leavingVar` ayudan a entender qué variables entraron/salieron en cada pivoteo
