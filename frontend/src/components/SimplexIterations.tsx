import { useState, useEffect } from 'react'
import { simplexService, type SimplexIteration } from '../services/simplexService'

interface SimplexIterationsProps {
  problemId: number
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
      } catch (err) {
        setError('Error al cargar las iteraciones')
        console.error('Error fetching iterations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchIterations()
  }, [problemId])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando iteraciones...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#f44336' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (iterations.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No hay iteraciones disponibles para este problema.</p>
      </div>
    )
  }

  const currentIteration = iterations[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(iterations.length - 1, prev + 1))
  }

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '2rem auto', 
      padding: '1.5rem', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>
          Iteración {currentIteration.iterationNumber} de {iterations.length}
        </h2>
        {currentIteration.isOptimal && (
          <span style={{
            padding: '6px 16px',
            borderRadius: '16px',
            backgroundColor: '#4caf50',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓ Solución Óptima
          </span>
        )}
      </div>

      {/* Información de la iteración */}
      {(currentIteration.enteringVar || currentIteration.leavingVar) && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          display: 'flex',
          gap: '2rem'
        }}>
          {currentIteration.enteringVar && (
            <div>
              <strong style={{ color: '#1976d2' }}>Variable que entra:</strong>{' '}
              <code style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {currentIteration.enteringVar}
              </code>
            </div>
          )}
          {currentIteration.leavingVar && (
            <div>
              <strong style={{ color: '#d32f2f' }}>Variable que sale:</strong>{' '}
              <code style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {currentIteration.leavingVar}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Valor de la Función Objetivo */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <strong style={{ fontSize: '18px' }}>Valor de la Función Objetivo (Z):</strong>
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '28px', 
          color: '#1976d2',
          fontWeight: 'bold'
        }}>
          {currentIteration.objectiveValue.toFixed(4)}
        </p>
      </div>

      {/* Variables Básicas */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '0.75rem' }}>Variables Básicas:</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '0.75rem'
        }}>
          {Object.entries(currentIteration.basicVariables).map(([variable, value]) => (
            <div 
              key={variable}
              style={{ 
                padding: '0.75rem', 
                backgroundColor: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: '4px'
              }}
            >
              <code style={{ fontSize: '14px', fontWeight: 'bold' }}>{variable}</code>
              <span style={{ margin: '0 8px' }}>=</span>
              <strong style={{ color: '#1976d2', fontSize: '16px' }}>
                {typeof value === 'number' ? value.toFixed(4) : value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '0.75rem' }}>Tableau:</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <tbody>
              {currentIteration.tableau.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  style={{ 
                    backgroundColor: rowIndex === currentIteration.tableau.length - 1 
                      ? '#fff3e0' 
                      : rowIndex % 2 === 0 ? '#fafafa' : '#fff'
                  }}
                >
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex}
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #e0e0e0',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: rowIndex === currentIteration.tableau.length - 1 ? 'bold' : 'normal'
                      }}
                    >
                      {typeof cell === 'number' ? cell.toFixed(2) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {currentIteration.tableau.length > 0 && (
          <p style={{ 
            marginTop: '0.5rem', 
            fontSize: '12px', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            * La última fila (resaltada) corresponde a la función objetivo
          </p>
        )}
      </div>

      {/* Botones de Navegación */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '2px solid #e0e0e0'
      }}>
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          style={{
            padding: '10px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentIndex === 0 ? '#e0e0e0' : '#1976d2',
            color: currentIndex === 0 ? '#999' : 'white',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          ← Anterior
        </button>

        <div style={{ 
          fontSize: '16px', 
          color: '#666',
          fontWeight: 'bold'
        }}>
          {currentIndex + 1} / {iterations.length}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === iterations.length - 1}
          style={{
            padding: '10px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentIndex === iterations.length - 1 ? '#e0e0e0' : '#1976d2',
            color: currentIndex === iterations.length - 1 ? '#999' : 'white',
            cursor: currentIndex === iterations.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
