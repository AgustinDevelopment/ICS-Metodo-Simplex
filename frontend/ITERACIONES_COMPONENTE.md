# Componente SimplexIterations - Visualización de Iteraciones

## Descripción

El componente `SimplexIterations` muestra las tablas intermedias de cada iteración del método Simplex, permitiendo navegar entre ellas con botones "Anterior" y "Siguiente".

## Características Implementadas ✅

- ✅ Muestra una tabla por cada iteración del Simplex
- ✅ Las tablas incluyen los valores de las variables básicas
- ✅ Muestra el resultado de la función objetivo en cada iteración
- ✅ Navegación entre tablas con botones "Anterior" y "Siguiente"
- ✅ Indica cuál es la solución óptima
- ✅ Muestra qué variable entra y cuál sale en cada iteración
- ✅ Visualización completa del tableau (matriz)
- ✅ Interfaz clara y ordenada con información resaltada

## Uso del Componente

### Importación

```tsx
import { SimplexIterations } from './components'
// o
import SimplexIterations from './components/SimplexIterations'
```

### Ejemplo de Uso

```tsx
import { useState } from 'react'
import SimplexIterations from './components/SimplexIterations'

function App() {
  const [problemId, setProblemId] = useState<number | null>(null)

  return (
    <div>
      {/* Aquí puedes tener un formulario o lista de problemas */}
      <button onClick={() => setProblemId(1)}>
        Ver iteraciones del Problema 1
      </button>

      {/* Mostrar iteraciones cuando se selecciona un problema */}
      {problemId && <SimplexIterations problemId={problemId} />}
    </div>
  )
}
```

### Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `problemId` | `number` | El ID del problema del cual se quieren ver las iteraciones |

## Integración con el Backend

El componente consume el endpoint:
```
GET /api/simplex/:id/iterations
```

Y espera una respuesta con el formato:
```json
{
  "msg": "Iteraciones obtenidas",
  "iterations": [
    {
      "id": 1,
      "problemId": 1,
      "iterationNumber": 1,
      "tableau": [[...], [...]],
      "basicVariables": { "x1": 0, "s1": 5 },
      "objectiveValue": 0,
      "enteringVar": null,
      "leavingVar": null,
      "isOptimal": false
    }
  ]
}
```

## Características Visuales

### 1. Header
- Muestra el número de iteración actual (ej: "Iteración 2 de 5")
- Badge de "Solución Óptima" cuando corresponde

### 2. Información de Pivoteo
- Variable que entra (azul)
- Variable que sale (rojo)

### 3. Función Objetivo
- Valor destacado en grande
- Color azul (#1976d2)
- Formato con 4 decimales

### 4. Variables Básicas
- Grid responsivo
- Cada variable en su propia tarjeta
- Formato: `variable = valor`

### 5. Tableau (Matriz)
- Tabla completa con scroll horizontal
- Última fila resaltada (función objetivo)
- Formato de números con 2 decimales
- Filas alternadas para mejor lectura

### 6. Controles de Navegación
- Botón "Anterior" (deshabilitado en primera iteración)
- Contador central (ej: "2 / 5")
- Botón "Siguiente" (deshabilitado en última iteración)

## Estados del Componente

### Loading
```tsx
<p>Cargando iteraciones...</p>
```

### Error
```tsx
<p style={{ color: '#f44336' }}>Error al cargar las iteraciones</p>
```

### Sin Datos
```tsx
<p>No hay iteraciones disponibles para este problema.</p>
```

### Con Datos
Muestra la interfaz completa con navegación.

## Ejemplo de Integración en SimplexHistory

Puedes agregar un botón en `SimplexHistory` para ver las iteraciones de cada problema resuelto:

```tsx
import { useState } from 'react'
import SimplexIterations from './SimplexIterations'

export default function SimplexHistory() {
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null)
  
  // ... código existente ...

  return (
    <div>
      {history.map((result) => (
        <div key={result.problem.id}>
          {/* ... info del resultado ... */}
          
          <button onClick={() => setSelectedProblemId(result.problem.id)}>
            Ver Iteraciones
          </button>
        </div>
      ))}

      {/* Modal o sección para mostrar iteraciones */}
      {selectedProblemId && (
        <div>
          <button onClick={() => setSelectedProblemId(null)}>Cerrar</button>
          <SimplexIterations problemId={selectedProblemId} />
        </div>
      )}
    </div>
  )
}
```

## Estilos

El componente usa estilos inline por simplicidad, pero puedes:
- Convertirlos a clases de Tailwind CSS
- Usar módulos CSS
- Integrar con Material-UI para una apariencia más consistente

## Próximos Pasos (Opcionales)

1. **Modal o Drawer**: Mostrar las iteraciones en un modal para mejor UX
2. **Animaciones**: Agregar transiciones al cambiar de iteración
3. **Exportar a PDF**: Permitir descargar las iteraciones
4. **Comparación**: Ver dos iteraciones lado a lado
5. **Gráficos**: Visualizar el progreso de la función objetivo
6. **Atajos de teclado**: Navegar con flechas del teclado

## Troubleshooting

### No se cargan las iteraciones

1. Verifica que el backend esté corriendo
2. Verifica que la base de datos tenga las tablas creadas:
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```
3. Verifica que se haya resuelto el problema y guardado las iteraciones:
   ```bash
   POST /api/simplex/:id/solve
   ```

### Errores de CORS

Verifica la configuración de CORS en el backend (`src/server.ts`).

### TypeScript Errors

Asegúrate de tener las últimas versiones de tipos:
```bash
npm install --save-dev @types/react @types/react-dom
```
