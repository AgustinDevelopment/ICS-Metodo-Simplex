# 🚀 INICIO RÁPIDO - Visualización de Iteraciones del Simplex

## ⚠️ IMPORTANTE: Primero Ejecuta Estos Comandos

### 1. Backend - Configurar Base de Datos

Abre **CMD** (no PowerShell) y ejecuta:

```bash
cd c:\dev\ICS-Metodo-Simplex\backend

# Generar el cliente de Prisma (esto eliminará los errores de TypeScript)
npx prisma generate

# Aplicar la migración a la base de datos
npx prisma migrate dev --name add-simplex-iterations
```

**Nota:** Asegúrate de que PostgreSQL esté corriendo y las credenciales en `.env` sean correctas.

### 2. Verificar que No Hay Errores

Una vez ejecutado `npx prisma generate`, los errores de TypeScript en el controlador desaparecerán.

---

## 📖 Cómo Usar el Sistema

### Paso 1: Resolver un Problema

```bash
# Endpoint para resolver (guarda automáticamente las iteraciones)
POST http://localhost:3000/api/simplex/:id/solve
```

### Paso 2: Obtener Iteraciones

```bash
# Endpoint para obtener iteraciones
GET http://localhost:3000/api/simplex/:id/iterations
```

Respuesta:
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
    },
    // ... más iteraciones
  ]
}
```

### Paso 3: Mostrar en el Frontend

```tsx
import SimplexIterations from './components/SimplexIterations'

function MyComponent() {
  return (
    <SimplexIterations problemId={1} />
  )
}
```

---

## 📋 Checklist de Verificación

- [ ] PostgreSQL está corriendo
- [ ] Ejecutaste `npx prisma generate`
- [ ] Ejecutaste `npx prisma migrate dev`
- [ ] Backend está corriendo (`npm run dev`)
- [ ] Resolviste al menos un problema (para tener iteraciones)
- [ ] Frontend puede conectarse al backend

---

## 🔧 Solución de Problemas

### Error: "Property 'simplexIteration' does not exist"

**Solución:** Ejecuta `npx prisma generate` en el backend.

### Error: "Authentication failed against database"

**Solución:** 
1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en `backend/.env`
3. Verifica que la base de datos exista

### No se muestran iteraciones en el frontend

**Solución:**
1. Verifica que hayas resuelto el problema primero (`POST /:id/solve`)
2. Verifica que el endpoint esté retornando datos (`GET /:id/iterations`)
3. Verifica la consola del navegador para errores

### Error de CORS

**Solución:** Verifica la configuración de CORS en `backend/src/server.ts`

---

## 📚 Documentación Completa

- **Resumen General**: `TASK-S3-02-COMPLETADO.md`
- **Setup Backend**: `backend/ITERACIONES_SETUP.md`
- **Componente Frontend**: `frontend/ITERACIONES_COMPONENTE.md`

---

## ✅ Todo Listo!

Una vez ejecutados los comandos de migración, el sistema está **100% funcional**.
