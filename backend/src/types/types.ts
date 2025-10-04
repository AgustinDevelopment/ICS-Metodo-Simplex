// Tipos básicos
export type Operator = '<=' | '>=' | '=';
export type OptimizationType = 'max' | 'min';

// DTOs de entrada
export interface Coefficient {
  value: number;
  variable: string;
}

export interface ObjectiveFunction {
  type: OptimizationType;
  coefficients: Coefficient[];
}

export interface Constraint {
  coefficients: Coefficient[];
  operator: Operator;
  rightSide: number;
}

// DTOs para la base de datos
export interface SimplexProblem {
  id?: number;
  name: string;
  objective: ObjectiveFunction;
  constraints: Constraint[];
  variables: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// DTOs para el algoritmo Simplex
export interface SimplexTableau {
  matrix: number[][];
  basis: number[];
  nonBasis: number[];
  objectiveRow: number[];
}

export interface SimplexSolution {
  optimal: boolean;
  bounded: boolean;
  variables: Map<string, number>;
  objectiveValue: number;
  iterations: SimplexTableau[];
}

export interface SimplexError {
  message: string;
  type: 'NO_ACOTADA' | 'SIN_SOLUCION' | 'ENTRADA_INVALIDA';
}
