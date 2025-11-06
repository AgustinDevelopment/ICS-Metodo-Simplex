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

function extractAlgorithmReason(msg: string): string | null {
  if (!msg) return null
  // Preferir lo que venga después de 'no pudo ser resuelto:'
  const m = /no pudo ser resuelto:\s*(.*)$/i.exec(msg)
  if (m?.[1]) return m[1].trim()
  // Si contiene ': ' tomar lo que viene después
  const m2 = /:\s*(.*)$/.exec(msg)
  if (m2?.[1]) return m2[1].trim()
  return msg.trim() || null
}

function validateField(value: string): string | undefined {
  if (value.trim() === '') return 'Este campo es obligatorio'
  if (!isFiniteNumberStr(value)) return 'Ingrese un número válido'
  return undefined
}

function validateConstraint(ct: ConstraintForm): NonNullable<Errors['constraints']>[string] {
  const e: NonNullable<Errors['constraints']>[string] = {}
  
  const a1Error = validateField(ct.a1)
  if (a1Error) e.a1 = a1Error
  
  const a2Error = validateField(ct.a2)
  if (a2Error) e.a2 = a2Error
  
  const rhsError = validateField(ct.rhs)
  if (rhsError) e.rhs = rhsError
  
  if (!['<=', '=', '>='].includes(ct.op)) {
    e.op = 'Operador inválido'
  }
  
  return e
}

function handleNumericKeyDown(e: React.KeyboardEvent<any>) {
  // Bloquear 'e' y 'E' que permiten notación exponencial en inputs type=number
  if (e.key === 'e' || e.key === 'E') {
    e.preventDefault()
  }
}

// Patrón regex para validar números decimales con signo
const NUMERIC_PATTERN = String.raw`^-?\d*(\.\d+)?$`

function handleNumericPaste(e: React.ClipboardEvent<any>) {
  const paste = e.clipboardData.getData('text').trim()
  if (paste === '') return
  // Aceptar números con signo y punto decimal (no aceptar notación exponencial como 1e3)
  const numericRe = new RegExp(NUMERIC_PATTERN)
  if (!numericRe.test(paste)) {
    e.preventDefault()
  }
}

export default function SimplexForm() {
  // Redux
  const dispatch = useAppDispatch()
  const { currentResult, isLoading, error: reduxError } = useAppSelector((state) => state.simplex)

  // Estados para manejo de errores
  const [errorMessages, setErrorMessages] = useState<{
    validation: string[],
    backend: string | null,
    algorithm: string | null
  }>({
    validation: [],
    backend: null,
    algorithm: null
  })

  // Si currentResult existe y no tiene 'solution' => es un error del algoritmo
  const isAlgorithmError = Boolean(currentResult && !('solution' in currentResult))
  
  // Extraer y formatear mensaje del error del algoritmo
  const algorithmError = useMemo(() => {
    if (!isAlgorithmError) return null
    const cr: any = currentResult
    if (cr.status === 'SIN_SOLUCION') 
      return 'No se encontró una solución con los coeficientes proporcionados. Intente con otros valores.'
    if (cr.status === 'NO_ACOTADA') 
      return 'El problema no está acotado: la solución tiende a infinito.'
    if (cr.status === 'ENTRADA_INVALIDA') 
      return 'Los datos ingresados son inválidos. Por favor verifique los valores.'
    return extractAlgorithmReason(cr.msg) ?? 'Error al resolver el problema'
  }, [currentResult, isAlgorithmError])

  // Efecto para actualizar errores cuando cambia el estado del backend
  useEffect(() => {
    setErrorMessages(prev => ({
      ...prev,
      algorithm: algorithmError,
      backend: typeof reduxError === 'string' ? reduxError : null
    }))
  }, [algorithmError, reduxError])

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
    
    // Validar coeficientes de la función objetivo
    const c1Error = validateField(c1)
    if (c1Error) next.c1 = c1Error
    
    const c2Error = validateField(c2)
    if (c2Error) next.c2 = c2Error
    
    // Validar que haya al menos una restricción
    if (constraints.length === 0) {
      next.general = 'Agregue al menos una restricción'
    }
    
    // Validar cada restricción
    for (const ct of constraints) {
      const constraintErrors = validateConstraint(ct)
      if (Object.keys(constraintErrors).length > 0) {
        next.constraints![ct.id] = constraintErrors
      }
    }
    
    // Limpiar constraints si no hay errores
    if (Object.keys(next.constraints!).length === 0) {
      delete next.constraints
    }
    
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

    // Si hay errores cliente, actualizar mensajes de validación
    if (v.c1 || v.c2 || v.general || v.constraints) {
      // Reunir todos los mensajes de error
      const messages: string[] = []
      if (v.general) messages.push(v.general)
      if (v.c1) messages.push(`Coeficiente x1: ${v.c1}`)
      if (v.c2) messages.push(`Coeficiente x2: ${v.c2}`)
      
      // Agregar errores de restricciones
      if (v.constraints) {
        Object.entries(v.constraints).forEach(([id, err], idx) => {
          const msgs = []
          if (err.a1) msgs.push(`x1: ${err.a1}`)
          if (err.a2) msgs.push(`x2: ${err.a2}`)
          if (err.rhs) msgs.push(`valor: ${err.rhs}`)
          if (msgs.length > 0) {
            messages.push(`Restricción ${idx + 1}: ${msgs.join(', ')}`)
          }
        })
      }

      setErrorMessages(prev => ({
        ...prev,
        validation: messages
      }))
      return
    }

    // Limpiar errores de validación si pasa
    setErrorMessages(prev => ({
      ...prev,
      validation: []
    }))
    
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
    dispatch(clearCurrentResult())
    setErrors({})
    dispatch(setLoading(true))
    
    try {
      // 1. Guardar el problema en el backend (base de datos)
      const createdProblem = await simplexService.createProblem(problem)
      
      // 2. Resolver el problema guardado usando su ID
      const response = await simplexService.solveProblemById(createdProblem.problem.id)
      
      // 3. Guardar en Redux y limpiar errores
      dispatch(setSolution(response))
      setErrorMessages(prev => ({...prev, backend: null}))
    } catch (error: any) {
      if (error.response?.data) {
        // Error del algoritmo
        dispatch(setError(error.response.data))
      } else {
        // Error de conexión
        const msg = 'Error al conectar con el servidor'
        dispatch(setError(msg))
        setErrors({ general: msg })
        setErrorMessages(prev => ({...prev, backend: msg}))
      }
    } finally {
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
          {/* Mostrar errores de validación */}
          {errorMessages.validation.length > 0 && (
            <Alert 
              severity="error" 
              variant="outlined" 
              onClose={() => setErrorMessages(prev => ({...prev, validation: []}))}
            >
              <Typography variant="subtitle2" gutterBottom>
                Por favor corrija los siguientes errores:
              </Typography>
              <ul className="list-disc pl-4 mt-2">
                {errorMessages.validation.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Mostrar error del backend o algoritmo */}
          {(errorMessages.backend || errorMessages.algorithm) && (
            <Alert 
              severity="error" 
              variant="outlined" 
              onClose={() => setErrorMessages(prev => ({...prev, backend: null, algorithm: null}))}
            >
              {errorMessages.algorithm ?? errorMessages.backend}
            </Alert>
          )}

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
                slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }}
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
                slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }}
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
                      error={!!e.a1} helperText={e.a1} slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }} />
                    <TextField label="x2" type="number" size="small" className="flex-1 min-w-[80px]"
                      value={ct.a2} onChange={(ev) => handleConstraintChange(ct.id, { a2: ev.target.value })}
                      onKeyDown={handleNumericKeyDown} onPaste={handleNumericPaste}
                      error={!!e.a2} helperText={e.a2} slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }} />
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
                      error={!!e.rhs} helperText={e.rhs} slotProps={{ htmlInput: { inputMode: 'decimal', pattern: NUMERIC_PATTERN } }} />
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


      </CardContent>
    </Card>
  );
}
