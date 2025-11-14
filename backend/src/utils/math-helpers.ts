/**
 * Utilidades matemáticas para operaciones con números de punto flotante
 * Manejo de precisión y redondeo
 */

import { DEFAULT_DECIMALS } from './constants';

/**
 * Redondea un número a una cantidad específica de decimales
 * @param value - Valor a redondear
 * @param decimals - Cantidad de decimales (por defecto 6)
 * @returns Número redondeado
 */
export function round(value: number, decimals = DEFAULT_DECIMALS): number {
  return +value.toFixed(decimals);
}

/**
 * Clona profundamente un objeto utilizando structuredClone
 * @param obj - Objeto a clonar
 * @returns Clon profundo del objeto
 */
export function cloneDeep<T>(obj: T): T {
  return structuredClone(obj);
}
