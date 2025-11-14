# Simplex Solver

Aplicación web para resolver problemas de programación lineal usando el Método Simplex.

**Proyecto:** Ingeniería y Calidad de Software  
**Universidad:** UTN - Facultad Regional San Rafael  
**Año:** 2025

## 🎯 ¿Qué hace?

- ✅ Resuelve problemas de programación lineal (2 variables)
- ✅ Maximiza o minimiza funciones objetivo
- ✅ Visualiza iteraciones paso a paso
- ✅ Exporta resultados a PDF
- ✅ Guarda historial de problemas

## 🚀 Instalación Rápida

### Requisitos
- Node.js 18+
- PostgreSQL 14+

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env  # Configurar DATABASE_URL
npm run db:migrate
npm run dev           # http://localhost:3000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

## 📖 Uso

1. Abre http://localhost:5173
2. Ingresa coeficientes de la función objetivo (x1, x2)
3. Agrega restricciones
4. Click en "Resolver"
5. Ve el resultado y las iteraciones en el historial

## 📚 Documentación

### API (Swagger)
- **URL:** http://localhost:3000/api-docs
- **Endpoints disponibles:**
  - `POST /problems/solve` - Resuelve problema sin guardar
  - `POST /problems` - Crea y guarda problema
  - `POST /problems/:id/solve` - Resuelve problema guardado
  - `GET /problems/:id/iterations` - Obtiene iteraciones
  - `GET /problems` - Lista todos los problemas
  - `GET /problems/:id` - Obtiene un problema específico

### Estructura del Código
- **Frontend:** `/frontend/src/`
  - `components/` - Componentes React
  - `redux/` - Estado global
  - `services/` - Llamadas al backend
  - `utils/` - Utilidades (PDF, etc)

- **Backend:** `/backend/src/`
  - `controllers/` - Manejo de HTTP
  - `services/` - Lógica de negocio
  - `lib/` - Algoritmo Simplex
  - `routes/` - Rutas de la API

---

## 🛠️ Tecnologías

### 🔹 Backend
- **TypeScript**
- **Node.js**
- **Express**
- **PostgreSQL**
- **PrismaORM**

### 🔹 Frontend
- **React**
- **Vite**
- **TailwindCSS**
- **Redux**
- **MUI (Material UI)**

### 🔹 Control de Versiones y Gestión
- **Git + GitHub**
- **GitHub Projects** (gestión de backlog y sprints)
- **Discord/Meet** (comunicación interna)

---

## 🚀 Metodología Ágil: Scrum
El proyecto será gestionado con **Scrum**

- **Roles**:
  - **Product Owner**: Profesor [Pablo Prats](https://github.com/umpprats)
  - **Scrum Master**: [Agustin Alanis](https://github.com/AgustinDevelopment)
  - **Development Team**: [Juan Manuel Kobayashi](https://github.com/Kobyuu) - [Mauro Maccarini](https://github.com/mauurom) - [Franco Caceres](https://github.com/Francoc12) - [Eliezer Rivero](https://github.com/eliezer-afk) - [Martin Juarez](https://github.com/mjuarez713)

---

## 📅 Planificación de Sprints

- **Sprint 0**: Preparación → Configuración de entorno, repositorio, tablero y backlog inicial.  
- **Sprint 1**: MVP (motor de cálculo del método Simplex).  
- **Sprint 2**: Interfaz de usuario básica.  
- **Sprint 3**: Visualización de tablas + validaciones.  
- **Sprint 4**: Exportación PDF + cierre y entrega final.  

---

## 🏁 Sprint 0 – Preparación

**Duración**: 1 semana  

### 🎯 Objetivo
Formar equipos, asignar roles, configurar el entorno de trabajo y definir el **Product Backlog inicial**.

### ✅ Tareas Realizadas
- ✔️ Creación del repositorio en GitHub.  
- ✔️ Configuración del tablero en GitHub Projects.  
- ✔️ Reunión inicial con el Product Owner (profesor).  
- ✔️ Definición de roles:
- ✔️ Creación del **Product Backlog inicial** con las primeras historias de usuario.

### 📅 Resultado de Sprint 0
- Equipo conformado ✅  
- Roles asignados ✅  
- Repositorio y tablero configurados ✅  
- Product Backlog inicial definido ✅  
