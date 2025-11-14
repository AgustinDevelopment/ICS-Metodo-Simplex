import SimplexForm from './components/SimplexForm'
import SimplexHistory from './components/SimplexHistory'
import { Container, Typography, Box, Paper } from '@mui/material'

export default function App() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      <Container maxWidth="xl" sx={{ flex: 1, py: 6, px: { xs: 2, sm: 4 } }}>
        <Box component="header" sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
            Simplex Solver
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
            Definición y Solución de Problemas de Programación Lineal
          </Typography>
        </Box>

        <Box component="main" sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <SimplexForm />
            </Box>
            <Box sx={{ flex: 1 }}>
              <SimplexHistory />
            </Box>
          </Box>
        </Box>
      </Container>

      <Paper
        component="footer"
        square
        elevation={0}
        sx={{ py: 2, textAlign: 'center', bgcolor: 'grey.100', mt: 'auto' }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2025 Proyecto Simplex Solver — Ingeniería y Calidad de Software - UTN FRSR
        </Typography>
      </Paper>
    </Box>
  )
}
