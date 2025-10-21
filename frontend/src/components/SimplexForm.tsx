import { useMemo, useState } from 'react'
import { simplexService, type SimplexProblem } from '../services/simplexService'
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks'
import { setLoading, setSolution, setError, clearCurrentResult } from '../redux/slices/simplexSlice'

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

  // Estado local del formulario
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [opt, setOpt] = useState<Optimization>('max')
  const [constraints, setConstraints] = useState<ConstraintForm[]>([newConstraint()])
  const [errors, setErrors] = useState<Errors>({})

  const constraintsErrors = errors.constraints ?? {}

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
    if (!isFiniteNumberStr(c1)) next.c1 = 'Ingrese un número válido'
    if (!isFiniteNumberStr(c2)) next.c2 = 'Ingrese un número válido'
    if (constraints.length === 0) next.general = 'Agregue al menos una restricción'
    for (const ct of constraints) {
      const e: NonNullable<Errors['constraints']>[string] = {}
      if (!isFiniteNumberStr(ct.a1)) e.a1 = 'Número inválido'
      if (!isFiniteNumberStr(ct.a2)) e.a2 = 'Número inválido'
      if (!isFiniteNumberStr(ct.rhs)) e.rhs = 'Número inválido'
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
    dispatch(setLoading(true))
    
    try {
      const response = await simplexService.solveUnsavedProblem(problem)
      // Guardar en Redux
      dispatch(setSolution(response))
    } catch (error: any) {
      if (error.response?.data) {
        // Error del algoritmo (NO_ACOTADA, SIN_SOLUCION, etc.)
        dispatch(setError(error.response.data))
      } else {
        // Error de conexión
        dispatch(setError('Error al conectar con el servidor'))
        setErrors({ general: 'Error al conectar con el servidor' })
      }
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <h1>Formulario del Método Simplex (2 variables)</h1>

      <form onSubmit={onSubmit} noValidate>
        <fieldset style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem' }}>
          <legend>Función objetivo</legend>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Coef. x1 (a)</span>
              <input
                type="number"
                step="any"
                value={c1}
                onChange={(e) => setC1(e.target.value)}
                required
              />
              {errors.c1 && <span style={{ color: 'crimson', fontSize: 12 }}>{errors.c1}</span>}
            </label>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Coef. x2 (b)</span>
              <input
                type="number"
                step="any"
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                required
              />
              {errors.c2 && <span style={{ color: 'crimson', fontSize: 12 }}>{errors.c2}</span>}
            </label>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Optimización</span>
              <select value={opt} onChange={(e) => setOpt(e.target.value as Optimization)}>
                <option value="max">Maximizar</option>
                <option value="min">Minimizar</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem' }}>
          <legend>Restricciones</legend>
          {errors.general && <div style={{ color: 'crimson', marginBottom: 8 }}>{errors.general}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {constraints.map((ct, idx) => {
              const e = constraintsErrors[ct.id] || {}
              return (
                <div key={ct.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>x1</span>
                    <input
                      type="number"
                      step="any"
                      value={ct.a1}
                      onChange={(e) => handleConstraintChange(ct.id, { a1: e.target.value })}
                      required
                    />
                    {e.a1 && <span style={{ color: 'crimson', fontSize: 12 }}>{e.a1}</span>}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>x2</span>
                    <input
                      type="number"
                      step="any"
                      value={ct.a2}
                      onChange={(e) => handleConstraintChange(ct.id, { a2: e.target.value })}
                      required
                    />
                    {e.a2 && <span style={{ color: 'crimson', fontSize: 12 }}>{e.a2}</span>}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Operador</span>
                    <select
                      value={ct.op}
                      onChange={(e) => handleConstraintChange(ct.id, { op: e.target.value as Operator })}
                    >
                      <option value="<=">{'<='}</option>
                      <option value="=">=</option>
                      <option value=">=">{'>='}</option>
                    </select>
                    {e.op && <span style={{ color: 'crimson', fontSize: 12 }}>{e.op}</span>}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>RHS</span>
                    <input
                      type="number"
                      step="any"
                      value={ct.rhs}
                      onChange={(e) => handleConstraintChange(ct.id, { rhs: e.target.value })}
                      required
                    />
                    {e.rhs && <span style={{ color: 'crimson', fontSize: 12 }}>{e.rhs}</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(ct.id)}
                    aria-label={`Quitar restricción ${idx + 1}`}
                    style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '6px 10px', cursor: 'pointer' }}
                  >
                    Quitar
                  </button>
                </div>
              )
            })}

            <div>
              <button
                type="button"
                onClick={handleAddConstraint}
                style={{ background: '#e7f0ff', border: '1px solid #9cc0ff', padding: '8px 12px', cursor: 'pointer' }}
              >
                + Agregar restricción
              </button>
            </div>
          </div>
        </fieldset>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            style={{ background: '#222', color: '#fff', border: '1px solid #222', padding: '10px 16px', cursor: 'pointer', opacity: (isValid && !isLoading) ? 1 : 0.6 }}
          >
            {isLoading ? 'Resolviendo...' : 'Validar y enviar'}
          </button>
          <button
            type="button"
            onClick={() => { 
              setC1(''); 
              setC2(''); 
              setOpt('max'); 
              setConstraints([newConstraint()]); 
              setErrors({}); 
              dispatch(clearCurrentResult());
            }}
            style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '10px 16px', cursor: 'pointer' }}
          >
            Limpiar
          </button>
        </div>
      </form>
      
      {currentResult && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
          {'solution' in currentResult ? (
            // Solución exitosa
            <div>
              <h3 style={{ color: 'green', marginTop: 0 }}>✓ Problema resuelto correctamente</h3>
              <p><strong>Status:</strong> {currentResult.solution.status}</p>
              <p><strong>Valor óptimo:</strong> {currentResult.solution.objectiveValue}</p>
              <div>
                <strong>Variables:</strong>
                <ul>
                  {Object.entries(currentResult.solution.variables).map(([key, value]) => (
                    <li key={key}>{key} = {value}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            // Error del algoritmo
            <div>
              <h3 style={{ color: 'crimson', marginTop: 0 }}>✗ Error al resolver</h3>
              <p><strong>Status:</strong> {currentResult.status}</p>
              <p>{currentResult.msg}</p>
            </div>
          )}
        </div>
      )}
      
      {reduxError && !currentResult && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid crimson', borderRadius: '4px', backgroundColor: '#fff5f5' }}>
          <p style={{ color: 'crimson', margin: 0 }}>{reduxError}</p>
        </div>
      )}
    </div>
  )
}
