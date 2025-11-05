import { useState } from 'react'
import { useAppSelector, useAppDispatch } from '../hooks/reduxHooks'
import { clearHistory } from '../redux/slices/simplexSlice'
import SimplexIterations from './SimplexIterations'

export default function SimplexHistory() {
  const dispatch = useAppDispatch()
  const history = useAppSelector((state) => state.simplex.history)
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null)

  if (history.length === 0) {
    return null
  }

  // Si hay un problema seleccionado, mostrar sus iteraciones
  if (selectedProblemId !== null) {
    return (
      <div>
        <button
          onClick={() => setSelectedProblemId(null)}
          style={{
            marginBottom: '1rem',
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          ← Volver al Historial
        </button>
        <SimplexIterations problemId={selectedProblemId} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Historial de Soluciones ({history.length})</h2>
        <button
          onClick={() => dispatch(clearHistory())}
          style={{ 
            background: '#f44336', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Limpiar Historial
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {history.map((result, index) => {
          // Crear un ID único basado en los datos del resultado
          const uniqueKey = `${result.problem.name}-${result.solution.objectiveValue}-${index}-${JSON.stringify(result.solution.variables)}`;
          
          return (
            <div 
              key={uniqueKey} 
              style={{ 
                padding: '1rem', 
                border: '1px solid #e0e0e0', 
                borderRadius: '4px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  #{history.length - index} - {result.problem.name}
                </h3>
                <span 
                  style={{ 
                    padding: '4px 12px', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: result.solution.status === 'OPTIMAL' ? '#4caf50' : '#ff9800',
                    color: 'white'
                  }}
                >
                  {result.solution.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <strong>Valor Óptimo:</strong>
                  <p style={{ margin: '4px 0', fontSize: '20px', color: '#1976d2' }}>
                    {result.solution.objectiveValue}
                  </p>
                </div>

                <div>
                  <strong>Variables:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {Object.entries(result.solution.variables).map(([key, value]) => (
                      <li key={key} style={{ margin: '2px 0' }}>
                        <code>{key}</code> = <strong>{value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Botón para ver iteraciones - Solo si el problema tiene ID */}
              {result.problem.id && (
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      if (result.problem.id) {
                        setSelectedProblemId(result.problem.id)
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Ver Iteraciones 📊
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
}
