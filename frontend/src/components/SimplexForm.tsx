import { useMemo, useState, useEffect } from 'react'
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
  Snackbar,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

type Optimization = 'max' | 'min'
type Operator = '<=' | '=' | '>='

type ConstraintForm = {
  id: string
  a1: string // coeficiente de x1
  a2: string // coeficiente de x2
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
    op?: string
  }>
  general?: string
}

function isFiniteNumberStr(s: string): boolean {
  if (s.trim() === '') return false
  const n = Number(s)
  return Number.isFinite(n)
}

function newConstraint(): ConstraintForm {
  return {
    id: crypto.randomUUID(),
    a1: '',
    a2: '',
    op: '<=',
    rhs: '',
  }
}

export default function SimplexForm() {
  // Redux
  const dispatch = useAppDispatch()
  const { currentResult, isLoading, error: reduxError } = useAppSelector((state) => state.simplex)

  // Snackbar error state
  const [openErrorAlert, setOpenErrorAlert] = useState(false)
  // Si currentResult existe y no tiene 'solution' => es un error del algoritmo
  const isAlgorithmError = Boolean(currentResult && !('solution' in currentResult))
  // Extraer la razón limpia que envía el backend (p. ej. "El problema no tiene solución posible (2D)")
  function extractAlgorithmReason(msg: string): string | null {
    if (!msg) return null
    // Preferir lo que venga después de 'no pudo ser resuelto:'
    const m = msg.match(/no pudo ser resuelto:\s*(.*)$/i)
    if (m?.[1]) return m[1].trim()
    // Si contiene ': ' tomar lo que viene después
    const m2 = msg.match(/:\s*(.*)$/)
    if (m2?.[1]) return m2[1].trim()
    return msg.trim() || null
  }

  const rawAlgMsg = isAlgorithmError ? ((currentResult as any).msg ?? '') : ''
  const algorithmReason = extractAlgorithmReason(rawAlgMsg) // ejemplo: "El problema no tiene solución posible (2D)"

  // Mensaje fijo a mostrar en el bloque de resultado cuando el status es SIN_SOLUCION
  const ALG_USER_MSG = 'Por favor introduzca otros coeficientes.'

  // Mostrar alert (Snackbar): si hay error del algoritmo mostrar la razón limpia del backend;
  // si no, mostrar reduxError (error de conexión u otros strings)
  const alertMessage = isAlgorithmError ? (algorithmReason ?? ALG_USER_MSG) : ((reduxError && typeof reduxError === 'string') ? reduxError : null)
  useEffect(() => {
    setOpenErrorAlert(Boolean(alertMessage))
  }, [alertMessage])

  // Estado local del formulario
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [opt, setOpt] = useState<Optimization>('max')
  const [constraints, setConstraints] = useState<ConstraintForm[]>([newConstraint()])
  const [errors, setErrors] = useState<Errors>({})

  // Helpers para bloquear la tecla 'e' (notación exponencial) y filtrar pegado no numérico
  function handleNumericKeyDown(e: React.KeyboardEvent<any>) {
    // Bloquear 'e' y 'E' que permiten notación exponencial en inputs type=number
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault()
    }
  }

  function handleNumericPaste(e: React.ClipboardEvent<any>) {
    const paste = e.clipboardData.getData('text').trim()
    if (paste === '') return
    // Aceptar números con signo y punto decimal (no aceptar notación exponencial como 1e3)
    const numericRe = /^-?\d*(\.\d+)?$/
    if (!numericRe.test(paste)) {
      e.preventDefault()
    }
  }

  const constraintsErrors = errors.constraints ?? {}

  // Validación ligera para habilitar/deshabilitar submit (mantener)
  const isValid = useMemo(() => {
    // Validación ligera para habilitar/deshabilitar submit
    if (!isFiniteNumberStr(c1) || !isFiniteNumberStr(c2)) return false
    if (constraints.length === 0) return false
    for (const ct of constraints) {
      if (!isFiniteNumberStr(ct.a1) || !isFiniteNumberStr(ct.a2) || !isFiniteNumberStr(ct.rhs)) return false
      if (!['<=', '=', '>='].includes(ct.op)) return false
    }
    return true
  }, [c1, c2, constraints])

  function validateAll(): Errors {
    const next: Errors = { constraints: {} }
    if (c1.trim() === '') next.c1 = 'Campo vacío'
    else if (!isFiniteNumberStr(c1)) next.c1 = 'Número inválido'
    if (c2.trim() === '') next.c2 = 'Campo vacío'
    else if (!isFiniteNumberStr(c2)) next.c2 = 'Número inválido'
    if (constraints.length === 0) next.general = 'Agregue al menos una restricción'
    for (const ct of constraints) {
      const e: NonNullable<Errors['constraints']>[string] = {}
      if (ct.a1.trim() === '') e.a1 = 'Campo vacío'
      else if (!isFiniteNumberStr(ct.a1)) e.a1 = 'Número inválido'
      if (ct.a2.trim() === '') e.a2 = 'Campo vacío'
      else if (!isFiniteNumberStr(ct.a2)) e.a2 = 'Número inválido'
      if (ct.rhs.trim() === '') e.rhs = 'Campo vacío'
      else if (!isFiniteNumberStr(ct.rhs)) e.rhs = 'Número inválido'
      if (!['<=', '=', '>='].includes(ct.op)) e.op = 'Operador inválido'
      if (Object.keys(e).length) next.constraints![ct.id] = e
    }
    if (Object.keys(next.constraints!).length === 0) delete next.constraints
    return next
  }

  function handleAddConstraint() {
    setConstraints((prev) => [...prev, newConstraint()])
  }

  function handleRemoveConstraint(id: string) {
    setConstraints((prev) => prev.filter((c) => c.id !== id))
    setErrors((prev) => {
      if (!prev.constraints) return prev
      const rest = { ...prev.constraints }
      delete rest[id]
      const next: Errors = { ...prev, constraints: Object.keys(rest).length ? rest : undefined }
      return next
    })
  }

  function handleConstraintChange(id: string, patch: Partial<ConstraintForm>) {
    setConstraints((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validateAll()
    setErrors(v)
    if (v.c1 || v.c2 || v.general || v.constraints) {
      return
    }
    
    // Construir el problema en el formato del backend
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

    // Enviar al backend usando Redux
    // Reiniciar resultado y errores antes de iniciar nuevo cálculo
    dispatch(clearCurrentResult())
    setErrors({})
    setOpenErrorAlert(false)
    dispatch(setLoading(true))
    
    try {
      // 1. Guardar el problema en el backend (base de datos)
      const createdProblem = await simplexService.createProblem(problem)
      
      // 2. Resolver el problema guardado usando su ID
      const response = await simplexService.solveProblemById(createdProblem.problem.id)
      
      // 3. Guardar en Redux
      dispatch(setSolution(response))
    } catch (error: any) {
      if (error.response?.data) {
        // Error del algoritmo (No esta acotada, No tiene solución, etc.)
        dispatch(setError(error.response.data))
      } else {
        // Error de conexión
        dispatch(setError('Error al conectar con el servidor'))
        setErrors({ general: 'Error al conectar con el servidor' })
      }
    } finally {
      // Siempre quitar estado de carga (protección ante rutas que no llamen setSolution/setError)
      dispatch(setLoading(false))
    }
  }

  // Helper: determinar si hay errores visibles para desactivar submit
  const hasClientErrors = Object.keys(errors).length > 0

  return (
    <Card className="max-w-4xl mx-auto shadow-xl">
      <CardContent className="p-6">
        <Typography variant="h5" className="mb-8 text-indigo-700 font-bold text-center">
          Método Simplex (2 variables)
        </Typography>

        <form onSubmit={onSubmit} noValidate className="space-y-8">
          {/* Función Objetivo */}
          <Box>
            <Typography variant="subtitle1" className="mb-3 font-medium">
              Función Objetivo
            </Typography>
            <Box className="flex flex-col sm:flex-row gap-6 mb-6">
              <TextField
                label="Coef. x1 (a)"
                type="number"
                value={c1}
                onChange={(e) => setC1(e.target.value)}
                onKeyDown={handleNumericKeyDown}
                onPaste={handleNumericPaste}
                error={!!errors.c1}
                helperText={errors.c1}
                fullWidth
                inputProps={{ inputMode: 'decimal', pattern: '^-?\\d*(\\.\\d+)?$' }}
              />
              <TextField
                label="Coef. x2 (b)"
                type="number"
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                onKeyDown={handleNumericKeyDown}
                onPaste={handleNumericPaste}
                error={!!errors.c2}
                helperText={errors.c2}
                fullWidth
                inputProps={{ inputMode: 'decimal', pattern: '^-?\\d*(\\.\\d+)?$' }}
              />

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Optimización</InputLabel>
                <Select
                  value={opt}
                  label="Optimización"
                  onChange={(e) => setOpt(e.target.value as Optimization)}
                >
                  <MenuItem value="max">Maximizar</MenuItem>
                  <MenuItem value="min">Minimizar</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Divider className="my-6" />
         
          {/* Restricciones */}
          <Box>
            <Typography variant="subtitle1" className="mb-3 font-medium mt-4">
              Restricciones
            </Typography>
            {errors.general && (
              <Alert severity="error" className="mb-3">
                {errors.general}
              </Alert>
            )}
            <Box className="flex flex-col gap-3">
              {constraints.map((ct, idx) => {
                const e = constraintsErrors[ct.id] || {};
                return (
                  <Paper key={ct.id} className="p-3 flex flex-wrap items-start gap-2" elevation={1}>
                    <TextField label={`x1 (${idx + 1})`} type="number" size="small" className="flex-1 min-w-[80px]"
                      value={ct.a1} onChange={(ev) => handleConstraintChange(ct.id, { a1: ev.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.a1} helperText={e.a1} inputProps={{ inputMode: 'decimal', pattern: '^-?\\d*(\\.\\d+)?$' }} />
                    <TextField label="x2" type="number" size="small" className="flex-1 min-w-[80px]"
                      value={ct.a2} onChange={(ev) => handleConstraintChange(ct.id, { a2: ev.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.a2} helperText={e.a2} inputProps={{ inputMode: 'decimal', pattern: '^-?\\d*(\\.\\d+)?$' }} />
                    <FormControl className="flex-1 min-w-[80px]" size="small">
                      <InputLabel>Operador</InputLabel>
                      <Select value={ct.op} label="Operador"
                        onChange={(ev) => handleConstraintChange(ct.id, { op: ev.target.value as Operator })}>
                        <MenuItem value="<=">{"<="}</MenuItem>
                        <MenuItem value="=">{"="}</MenuItem>
                        <MenuItem value=">=">{">="}</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField label="RHS" type="number" size="small" className="flex-1 min-w-[80px]"
                      value={ct.rhs} onChange={(ev) => handleConstraintChange(ct.id, { rhs: ev.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.rhs} helperText={e.rhs} inputProps={{ inputMode: 'decimal', pattern: '^-?\\d*(\\.\\d+)?$' }} />
                    <IconButton color="error" onClick={() => handleRemoveConstraint(ct.id)} 
                                disabled={constraints.length === 1}>
                      <DeleteIcon />
                    </IconButton>
                  </Paper>
                );
              })}

              <Button
                variant="outlined"
                color="primary"
                onClick={handleAddConstraint}
                className="self-start mt-2" // 'self-start' lo alinea a la izquierda
                startIcon={<AddIcon />}
              >
                + Agregar restricción
              </Button>
            </Box>
          </Box>

          {/* Botones principales */}
          <Box className="flex flex-wrap gap-4 justify-center pt-4">
            <Button type="submit" variant="contained" color="success"
              startIcon={isLoading ? <CircularProgress size={18} /> : undefined}
              disabled={!isValid || isLoading || hasClientErrors}>
              {isLoading ? "Calculando..." : "Validar y enviar"}
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => {
              setC1(""); setC2(""); setOpt("max"); setConstraints([newConstraint()]);
              setErrors({}); dispatch(clearCurrentResult());
            }}>
              Limpiar
            </Button>
          </Box>
        </form>

        {/* Resultado */}
        {currentResult && (
          <Box className="mt-8 p-4 border border-gray-200 rounded-lg">
            {"solution" in currentResult ? (
              <Alert severity="success" variant="outlined">
                <Typography variant="subtitle1" className="font-semibold mb-2">
                  ✓ Problema resuelto correctamente
                </Typography>
                <Typography>
                  <strong>Valor óptimo:</strong>{" "}
                  {currentResult.solution.objectiveValue}
                </Typography>
                <ul className="list-disc pl-5">
                  {Object.entries(currentResult.solution.variables).map(
                    ([key, value]) => (
                      <li key={key}>
                        {key} = {value}
                      </li>
                    )
                  )}
                </ul>
              </Alert>
            ) : (
              <Alert severity="error" variant="outlined">
                ✗ Error al resolver problema
                {((currentResult as any).status === "SIN_SOLUCION") && (
                  <Typography className="mt-2">
                    Por favor introduzca otros coeficientes.
                  </Typography>
                )}
              </Alert>
            )}
          </Box>
        )}

        {/* Snackbar de errores */}
        <Snackbar
          open={openErrorAlert && !!alertMessage}
          autoHideDuration={6000}
          onClose={() => setOpenErrorAlert(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setOpenErrorAlert(false)}
            severity="error"
            variant="filled"
            sx={{ minWidth: 300 }}
          >
            {alertMessage}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
