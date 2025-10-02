//Definicion de operadores
export type Operator = '<=' | '>=' | '=';

export interface Coefficient {
  value: number;
  variable: string;
}

export interface ObjectiveFunction {
  type: 'max' | 'min';
  coefficients: Coefficient[];
}

export interface Constraint {
  coefficients: Coefficient[];
  operator: Operator;
  rightSide: number;
}

// Tipos base para la API Simplex
export interface SimplexProblem {
  id: number;
  name: string;
  objective: string;
  constraints: string;
  variables: number;
  restrictions: number;
  createdAt: string;
  updatedAt: string;
}
