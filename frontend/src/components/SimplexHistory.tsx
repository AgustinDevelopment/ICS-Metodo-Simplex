import { useState } from 'react'
import { useAppSelector, useAppDispatch } from '../hooks/reduxHooks'
import { clearHistory } from '../redux/slices/simplexSlice'
import SimplexIterations from './SimplexIterations'
import { exportCompleteProblemToPDF } from '../utils/pdfExport'
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Card,
  CardContent,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import TimelineIcon from '@mui/icons-material/Timeline'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

export default function SimplexHistory() {
  const dispatch = useAppDispatch()
  const history = useAppSelector((state) => state.simplex.history)
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null)

  if (history.length === 0) {
    return null
  }

  if (selectedProblemId !== null) {
    return (
      <Box>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => setSelectedProblemId(null)}
          sx={{ mb: 2 }}
        >
          Volver al Historial
        </Button>
        <SimplexIterations problemId={selectedProblemId} />
      </Box>
    )
  }

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Historial ({history.length})
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => dispatch(clearHistory())}
            size="small"
          >
            Limpiar
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {history.map((result, index) => {
            const uniqueKey = `${result.problem.id}-${index}-${result.solution.objectiveValue}`
            return (
              <Paper key={uniqueKey} sx={{ p: 2 }} elevation={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    #{index + 1} - {result.problem.name}
                  </Typography>
                  <Chip
                    label={result.solution.status}
                    color={result.solution.status === 'OPTIMAL' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Valor Óptimo:</Typography>
                    <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      {result.solution.objectiveValue}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Variables:</Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {Object.entries(result.solution.variables).map(([key, value]) => (
                        <Typography component="li" key={key} variant="body2">
                          <Typography component="code" sx={{ fontWeight: 600 }}>{key}</Typography> = <strong>{value}</strong>
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </Box>

                {result.problem.id && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => exportCompleteProblemToPDF(result.problem.id!, `Problema-${index + 1}`)}
                    >
                      Exportar PDF Completo
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<TimelineIcon />}
                      onClick={() => setSelectedProblemId(result.problem.id!)}
                    >
                      Ver Iteraciones
                    </Button>
                  </Box>
                )}
              </Paper>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}
