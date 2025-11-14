/**
 * Utilidad para exportar problemas Simplex a PDF
 * Genera un PDF completo con todas las iteraciones
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { simplexService } from '../services/simplexService'

// Captura elemento HTML y lo convierte a canvas
const captureElement = async (element: HTMLElement) => {
  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })
}

// Agrega canvas al PDF, maneja páginas múltiples
const addCanvasToPDF = (pdf: jsPDF, canvas: HTMLCanvasElement, isFirstPage: boolean) => {
  const imgData = canvas.toDataURL('image/png')
  const imgWidth = 210
  const pageHeight = 297
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const margin = 10

  if (!isFirstPage) {
    pdf.addPage()
  }

  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft >= margin) {
    position = heightLeft - imgHeight + margin
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
}

/**
 * Exporta un problema completo a PDF con todas sus iteraciones
 * Incluye tableaux, variables básicas y función objetivo
 */
export const exportCompleteProblemToPDF = async (problemId: number, problemName: string) => {
  try {
    const response = await simplexService.getIterations(problemId)
    const iterations = response.iterations

    if (iterations.length === 0) {
      alert('No hay iteraciones para exportar')
      return
    }

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '1000px'
    container.style.backgroundColor = '#ffffff'
    container.style.padding = '20px'
    document.body.appendChild(container)

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    let isFirstPage = true

    for (const iteration of iterations) {
      const iterationHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: white;">
          <div style="border-bottom: 3px solid #1976d2; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1976d2;">Iteración ${iteration.iterationNumber} de ${iterations.length}</h2>
            ${iteration.isOptimal ? '<span style="background: #4caf50; color: white; padding: 5px 15px; border-radius: 15px; font-size: 14px; display: inline-block; margin-top: 10px;">✓ Solución Óptima</span>' : ''}
          </div>

          ${iteration.enteringVar || iteration.leavingVar ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              ${iteration.enteringVar ? `<div style="margin-bottom: 10px;"><strong style="color: #1976d2;">Variable que entra:</strong> <code style="font-size: 16px; font-weight: bold;">${iteration.enteringVar}</code></div>` : ''}
              ${iteration.leavingVar ? `<div><strong style="color: #d32f2f;">Variable que sale:</strong> <code style="font-size: 16px; font-weight: bold;">${iteration.leavingVar}</code></div>` : ''}
            </div>
          ` : ''}

          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 8px;">Valor de la Función Objetivo (Z)</div>
            <div style="font-size: 32px; color: #1976d2; font-weight: bold;">${iteration.objectiveValue.toFixed(4)}</div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 18px; margin-bottom: 12px;">Variables Básicas</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
              ${Object.entries(iteration.basicVariables).map(([variable, value]) => `
                <div style="padding: 10px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px;">
                  <code style="font-weight: bold;">${variable}</code> = <strong style="color: #1976d2;">${typeof value === 'number' ? value.toFixed(4) : value}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <h3 style="font-size: 18px; margin-bottom: 12px;">Tableau</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tbody>
                ${iteration.tableau.map((row, rowIndex) => {
                  const isLastRow = rowIndex === iteration.tableau.length - 1
                  return `
                    <tr style="background: ${isLastRow ? '#fff3e0' : rowIndex % 2 === 0 ? '#fafafa' : '#fff'};">
                      ${row.map(cell => `
                        <td style="padding: 6px 10px; border: 1px solid #e0e0e0; text-align: center; font-family: monospace; font-weight: ${isLastRow ? 'bold' : 'normal'};">
                          ${typeof cell === 'number' ? cell.toFixed(2) : cell}
                        </td>
                      `).join('')}
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            <p style="margin-top: 8px; font-size: 11px; color: #666; font-style: italic;">* La última fila (resaltada) corresponde a la función objetivo</p>
          </div>
        </div>
      `

      container.innerHTML = iterationHTML
      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await captureElement(container)
      addCanvasToPDF(pdf, canvas, isFirstPage)
      isFirstPage = false
    }

    document.body.removeChild(container)
    pdf.save(`${problemName}-Completo.pdf`)
  } catch (error) {
    console.error('Error al generar PDF:', error)
    alert('Error al generar el PDF. Por favor intenta nuevamente.')
  }
}

