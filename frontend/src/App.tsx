import './App.css'
import SimplexForm from './components/SimplexForm'
import SimplexHistory from './components/SimplexHistory'
import { Container, Typography, Box } from "@mui/material";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Container maxWidth="xl" className="flex-1 py-12 px-6 sm:px-12">
      
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-indigo-700 sm:text-5xl">
            Simplex Solver
          </h1>
          <Typography 
            variant="subtitle1" 
            className="text-lg text-gray-600 mt-2"
          >
            Definición y Solución de Problemas de Programación Lineal
          </Typography>
        </header>

        <main className="mb-10">
          <Box className="flex flex-col lg:flex-row gap-8">
            
            {/* Columna 1: Formulario (Ocupa la mitad del espacio en lg) */}
            <Box className="w-full lg:w-1/2">
              <SimplexForm />
            </Box>

            {/* Columna 2: Historial (Ocupa la mitad del espacio en lg) */}
            <Box className="w-full lg:w-1/2">
               <Typography
                variant="h6"
                className="mb-4 text-center text-gray-700 font-medium"
               >
                 Historial de problemas resueltos
               </Typography>
               <SimplexHistory />
            </Box>
            
          </Box>
        </main>

      </Container>
      
      
      <footer className="bg-gray-100 py-4 text-center text-sm text-gray-500 mt-auto">
        © 2025 Proyecto Simplex Solver — Ingeniería y Calidad de Software - UTN FRSR
      </footer>
    </div>
  );
}
