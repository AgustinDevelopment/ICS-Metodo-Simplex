import { useMemo, useState } from 'react'
import { simplexService, type SimplexProblem } from '../services/simplexService'
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks'
import { setLoading, setSolution, setError, clearCurrentResult } from '../redux/slices/simplexSlice'
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
  Fade,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

type Optimization = 'max' | 'min'
type Operator = '<=' | '=' | '>='

type ConstraintForm = {
  id: string
  a1: string
  a2: string
  op: Operator
  rhs: string
}

type Errors = {
  c1?: string
  c2?: string
  constraints?: Record<string, {
    a1?: string
    a2?: string
    rhs?: string
  }>
  general?: string
}

const NUMERIC_PATTERN = String.raw`^-?\d*(\.\d+)?$`

const isFiniteNumberStr = (s: string): boolean => {
  if (s.trim() === '') return false
  const n = Number(s)
  return Number.isFinite(n)
}

const newConstraint = (): ConstraintForm => ({
  id: crypto.randomUUID(),
  a1: '',
  a2: '',
  op: '<=',
  rhs: '',
})

const validateField = (value: string): string | undefined => {
  if (value.trim() === '') return 'Campo obligatorio'
  if (!isFiniteNumberStr(value)) return 'Número inválido'
  return undefined
}

const handleNumericKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'e' || e.key === 'E') e.preventDefault()
}

const handleNumericPaste = (e: React.ClipboardEvent) => {
  const paste = e.clipboardData.getData('text').trim()
  if (paste && !new RegExp(NUMERIC_PATTERN).test(paste)) {
    e.preventDefault()
  }
}

export default function SimplexForm() {
  const dispatch = useAppDispatch()
  const { currentResult, isLoading, error: reduxError } = useAppSelector((state) => state.simplex)

  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [opt, setOpt] = useState<Optimization>('max')
  const [constraints, setConstraints] = useState<ConstraintForm[]>([newConstraint()])
  const [errors, setErrors] = useState<Errors>({})

  const algorithmError = useMemo(() => {
    if (!currentResult || 'solution' in currentResult) return null
    const cr: any = currentResult
    const errorMessages: Record<string, string> = {
      'SIN_SOLUCION': 'No se encontró una solución. Intente con otros valores.',
      'NO_ACOTADA': 'El problema no está acotado.',
      'ENTRADA_INVALIDA': 'Los datos ingresados son inválidos.'
    }
    return errorMessages[cr.status] ?? cr.msg ?? 'Error al resolver el problema'
  }, [currentResult])

  const isValid = useMemo(() => {
    if (!isFiniteNumberStr(c1) || !isFiniteNumberStr(c2)) return false
    if (constraints.length === 0) return false
    return constraints.every(ct => 
      isFiniteNumberStr(ct.a1) && 
      isFiniteNumberStr(ct.a2) && 
      isFiniteNumberStr(ct.rhs) && 
      ['<=', '=', '>='].includes(ct.op)
    )
  }, [c1, c2, constraints])

  const validateAll = (): Errors => {
    const next: Errors = { constraints: {} }
    
    const c1Error = validateField(c1)
    if (c1Error) next.c1 = c1Error
    
    const c2Error = validateField(c2)
    if (c2Error) next.c2 = c2Error
    
    if (constraints.length === 0) {
      next.general = 'Agregue al menos una restricción'
    }
    
    for (const ct of constraints) {
      const err: any = {}
      const a1Error = validateField(ct.a1)
      if (a1Error) err.a1 = a1Error
      const a2Error = validateField(ct.a2)
      if (a2Error) err.a2 = a2Error
      const rhsError = validateField(ct.rhs)
      if (rhsError) err.rhs = rhsError
      
      if (Object.keys(err).length > 0) {
        next.constraints![ct.id] = err
      }
    }
    
    if (Object.keys(next.constraints!).length === 0) {
      delete next.constraints
    }
    
    return next
  }

  const handleAddConstraint = () => {
    setConstraints((prev) => [...prev, newConstraint()])
  }

  const handleRemoveConstraint = (id: string) => {
    setConstraints((prev) => prev.filter((c) => c.id !== id))
    setErrors((prev) => {
      if (!prev.constraints) return prev
      const rest = { ...prev.constraints }
      delete rest[id]
      return { ...prev, constraints: Object.keys(rest).length ? rest : undefined }
    })
  }

  const handleConstraintChange = (id: string, patch: Partial<ConstraintForm>) => {
    setConstraints((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validateAll()
    setErrors(v)

    if (Object.keys(v).length > 0) return
    
    const problem: SimplexProblem = {
      name: 'Problema del formulario',
      objective: {
        type: opt,
        coefficients: [
          { value: Number(c1), variable: 'x1' },
          { value: Number(c2), variable: 'x2' }
        ]
      },
      constraints: constraints.map(ct => ({
        coefficients: [
          { value: Number(ct.a1), variable: 'x1' },
          { value: Number(ct.a2), variable: 'x2' }
        ],
        operator: ct.op,
        rightSide: Number(ct.rhs)
      })),
      variables: ['x1', 'x2']
    }

    dispatch(clearCurrentResult())
    setErrors({})
    dispatch(setLoading(true))
    
    try {
      const createdProblem = await simplexService.createProblem(problem)
      const response = await simplexService.solveProblemById(createdProblem.problem.id)
      dispatch(setSolution(response))
    } catch (error: any) {
      if (error.response?.data) {
        dispatch(setError(error.response.data))
      } else {
        const msg = 'Error al conectar con el servidor'
        dispatch(setError(msg))
        setErrors({ general: msg })
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handleClear = () => {
    setC1('')
    setC2('')
    setOpt('max')
    setConstraints([newConstraint()])
    setErrors({})
    dispatch(clearCurrentResult())
  }

  const constraintsErrors = errors.constraints ?? {}

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, color: 'primary.main', fontWeight: 700, textAlign: 'center' }}>
          Método Simplex (2 variables)
        </Typography>

        <form onSubmit={onSubmit} noValidate>
          <Fade in={!!(algorithmError || reduxError)}>
            <Box>
              {(algorithmError || reduxError) && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearCurrentResult())}>
                  {algorithmError || reduxError}
                </Alert>
              )}
            </Box>
          </Fade>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
              Función Objetivo
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Coeficiente x1"
                type="number"
                value={c1}
                onChange={(e) => setC1(e.target.value)}
                onKeyDown={handleNumericKeyDown}
                onPaste={handleNumericPaste}
                error={!!errors.c1}
                helperText={errors.c1}
                sx={{ flex: 1, minWidth: 120 }}
                slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }}
              />
              <TextField
                label="Coeficiente x2"
                type="number"
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                onKeyDown={handleNumericKeyDown}
                onPaste={handleNumericPaste}
                error={!!errors.c2}
                helperText={errors.c2}
                sx={{ flex: 1, minWidth: 120 }}
                slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }}
              />
              <FormControl sx={{ flex: 1, minWidth: 120 }}>
                <InputLabel>Tipo</InputLabel>
                <Select value={opt} label="Tipo" onChange={(e) => setOpt(e.target.value as Optimization)}>
                  <MenuItem value="max">Maximizar</MenuItem>
                  <MenuItem value="min">Minimizar</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
              Restricciones
            </Typography>
            {errors.general && (
              <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {constraints.map((ct, idx) => {
                const e = constraintsErrors[ct.id] || {}
                return (
                  <Paper key={ct.id} sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'start' }} elevation={1}>
                    <TextField label={`x1 (${idx + 1})`} type="number" size="small" sx={{ flex: 1, minWidth: 80 }}
                      value={ct.a1} onChange={(e) => handleConstraintChange(ct.id, { a1: e.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.a1} helperText={e.a1} slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }} />
                    <TextField label="x2" type="number" size="small" sx={{ flex: 1, minWidth: 80 }}
                      value={ct.a2} onChange={(e) => handleConstraintChange(ct.id, { a2: e.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.a2} helperText={e.a2} slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }} />
                    <FormControl sx={{ flex: 1, minWidth: 80 }} size="small">
                      <InputLabel>Op.</InputLabel>
                      <Select value={ct.op} label="Op." onChange={(e) => handleConstraintChange(ct.id, { op: e.target.value as Operator })}>
                        <MenuItem value="<=">≤</MenuItem>
                        <MenuItem value="=">=</MenuItem>
                        <MenuItem value=">=">≥</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField label="Valor" type="number" size="small" sx={{ flex: 1, minWidth: 80 }}
                      value={ct.rhs} onChange={(e) => handleConstraintChange(ct.id, { rhs: e.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.rhs} helperText={e.rhs} slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }} />
                    <IconButton color="error" onClick={() => handleRemoveConstraint(ct.id)} disabled={constraints.length === 1}>
                      <DeleteIcon />
                    </IconButton>
                  </Paper>
                )
              })}
              <Button variant="outlined" onClick={handleAddConstraint} startIcon={<AddIcon />} sx={{ alignSelf: 'start' }}>
                Agregar restricción
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
            <Button type="submit" variant="contained" color="success" disabled={!isValid || isLoading}
              startIcon={isLoading && <CircularProgress size={18} color="inherit" />}>
              {isLoading ? "Resolviendo..." : "Resolver"}
            </Button>
            <Button variant="outlined" onClick={handleClear}>Limpiar</Button>
          </Box>
        </form>

        <Fade in={!!currentResult}>
          <Box>
            {currentResult && 'solution' in currentResult && (
              <Box sx={{ mt: 4 }}>
                <Alert severity="success" variant="outlined">
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Solución Encontrada
                  </Typography>
                  <Typography><strong>Valor óptimo:</strong> {currentResult.solution.objectiveValue}</Typography>
                  <Box component="ul" sx={{ mt: 1, pl: 3 }}>
                    {Object.entries(currentResult.solution.variables).map(([key, value]) => (
                      <li key={key}>{key} = {value}</li>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                    Puedes exportar el problema completo con todas sus iteraciones desde el Historial
                  </Typography>
                </Alert>
              </Box>
            )}
          </Box>
        </Fade>
      </CardContent>
    </Card>
  )
}
