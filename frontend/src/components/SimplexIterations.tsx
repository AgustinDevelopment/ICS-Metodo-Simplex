import { useState, useEffect } from 'react'
import { simplexService, type SimplexIteration } from '../services/simplexService'
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Card,
  CardContent,
} from '@mui/material'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'

interface SimplexIterationsProps {
  readonly problemId: number
}

export default function SimplexIterations({ problemId }: SimplexIterationsProps) {
  const [iterations, setIterations] = useState<SimplexIteration[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIterations = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await simplexService.getIterations(problemId)
        setIterations(response.iterations)
        setCurrentIndex(0)
      } catch {
        setError('Error al cargar las iteraciones')
      } finally {
        setLoading(false)
      }
    }
    fetchIterations()
  }, [problemId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" sx={{ mb: 1 }}>No hay iteraciones guardadas</Typography>
          <Typography variant="body2">
            Este problema fue creado antes de implementar el guardado de iteraciones.
            Resuelve el problema nuevamente usando el formulario.
          </Typography>
        </Alert>
      </Box>
    )
  }

  if (iterations.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="body1">No hay iteraciones registradas para este problema.</Typography>
        </Alert>
      </Box>
    )
  }

  const currentIteration = iterations[currentIndex]

  return (
    <Card sx={{ maxWidth: 1000, mx: 'auto', mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: 2, borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Iteración {currentIteration.iterationNumber} de {iterations.length}
          </Typography>
          {currentIteration.isOptimal && (
            <Chip label="Solución Óptima" color="success" icon={<span>✓</span>} />
          )}
        </Box>

        {(currentIteration.enteringVar || currentIteration.leavingVar) && (
          <Paper sx={{ mb: 2, p: 2, bgcolor: 'info.lighter', display: 'flex', gap: 3, flexWrap: 'wrap' }} elevation={0}>
            {currentIteration.enteringVar && (
              <Box>
                <Typography component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Variable que entra:
                </Typography>{' '}
                <Typography component="code" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {currentIteration.enteringVar}
                </Typography>
              </Box>
            )}
            {currentIteration.leavingVar && (
              <Box>
                <Typography component="span" sx={{ fontWeight: 600, color: 'error.main' }}>
                  Variable que sale:
                </Typography>{' '}
                <Typography component="code" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {currentIteration.leavingVar}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        <Paper sx={{ mb: 3, p: 2, bgcolor: 'grey.50' }} elevation={0}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Valor de la Función Objetivo (Z)
          </Typography>
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
            {currentIteration.objectiveValue.toFixed(4)}
          </Typography>
        </Paper>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>Variables Básicas</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5 }}>
            {Object.entries(currentIteration.basicVariables).map(([variable, value]) => (
              <Paper key={variable} sx={{ p: 1.5 }} elevation={1}>
                <Typography component="code" sx={{ fontWeight: 600 }}>{variable}</Typography>
                <Typography component="span" sx={{ mx: 1 }}>=</Typography>
                <Typography component="strong" sx={{ color: 'primary.main', fontSize: '1.1rem' }}>
                  {typeof value === 'number' ? value.toFixed(4) : value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>Tableau</Typography>
          <TableContainer component={Paper} elevation={1}>
            <Table size="small">
              <TableBody>
                {currentIteration.tableau.map((row, rowIndex) => {
                  const isLastRow = rowIndex === currentIteration.tableau.length - 1
                  return (
                    <TableRow key={rowIndex} sx={{ bgcolor: isLastRow ? 'warning.lighter' : rowIndex % 2 === 0 ? 'grey.50' : 'white' }}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} align="center" sx={{ fontFamily: 'monospace', fontWeight: isLastRow ? 600 : 400 }}>
                          {typeof cell === 'number' ? cell.toFixed(2) : cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {currentIteration.tableau.length > 0 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontStyle: 'italic' }}>
              * La última fila (resaltada) corresponde a la función objetivo
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: 2, borderColor: 'divider' }}>
          <Button
            variant="contained"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            startIcon={<NavigateBeforeIcon />}
          >
            Anterior
          </Button>
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {currentIndex + 1} / {iterations.length}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setCurrentIndex(prev => Math.min(iterations.length - 1, prev + 1))}
            disabled={currentIndex === iterations.length - 1}
            endIcon={<NavigateNextIcon />}
          >
            Siguiente
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
