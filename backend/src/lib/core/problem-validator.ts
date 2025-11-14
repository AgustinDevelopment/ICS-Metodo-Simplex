/**
 * Validación de problemas
 * Responsabilidad: Validar problemas de programación lineal
 */

import { SimplexProblem, SimplexError } from '../../types/types';
import { validateProblem } from '../validation';

export class ProblemValidatorService {
  validate(problem: SimplexProblem): SimplexError | null {
    const validation = validateProblem(problem);

    if (validation === 'ENTRADA_INVALIDA') {
      return {
        message: 'Problema no válido para el método simplex',
        type: 'ENTRADA_INVALIDA',
      };
    }

    if (validation === 'SIN_SOLUCION') {
      return {
        message: 'El problema no tiene solución posible (restricciones incompatibles)',
        type: 'SIN_SOLUCION',
      };
    }

    return null;
  }
}
