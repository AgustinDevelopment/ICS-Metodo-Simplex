import api from './api';

// Tipos que coinciden con el backend
export type Operator = '<=' | '>=' | '=';
export type OptimizationType = 'max' | 'min';

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

export interface SimplexProblem {
  name: string;
  objective: ObjectiveFunction;
  constraints: Constraint[];
  variables: string[];
}

export interface SimplexSolutionResponse {
  msg: string;
  problem: {
    id?: number;
    name: string;
  };
  solution: {
    variables: Record<string, number>;
    objectiveValue: number;
    status: 'OPTIMAL' | 'FEASIBLE' | 'UNBOUNDED';
  };
}

export interface SimplexErrorResponse {
  msg: string;
  status: 'NO_ACOTADA' | 'SIN_SOLUCION' | 'ENTRADA_INVALIDA';
}

export interface SimplexIteration {
  id: number;
  problemId: number;
  iterationNumber: number;
  tableau: number[][];
  basicVariables: Record<string, number>;
  objectiveValue: number;
  enteringVar: string | null;
  leavingVar: string | null;
  isOptimal: boolean;
  createdAt: string;
}

export interface IterationsResponse {
  msg: string;
  iterations: SimplexIteration[];
}

// Servicio para resolver problemas Simplex
export const simplexService = {
  // Resolver problema sin guardarlo en DB
  async solveUnsavedProblem(problem: SimplexProblem): Promise<SimplexSolutionResponse> {
    const response = await api.post<SimplexSolutionResponse>('/problems/solve', problem);
    return response.data;
  },

  // CRUD de problemas (opcional, por si lo necesitas después)
  async createProblem(problem: SimplexProblem) {
    const response = await api.post('/problems', problem);
    return response.data;
  },

  async getProblems() {
    const response = await api.get('/problems');
    return response.data;
  },

  async getProblemById(id: number) {
    const response = await api.get(`/problems/${id}`);
    return response.data;
  },

  async solveProblemById(id: number): Promise<SimplexSolutionResponse> {
    const response = await api.post<SimplexSolutionResponse>(`/problems/${id}/solve`);
    return response.data;
  },

  async updateProblem(id: number, problem: Partial<SimplexProblem>) {
    const response = await api.put(`/problems/${id}`, problem);
    return response.data;
  },

  async deleteProblem(id: number) {
    const response = await api.delete(`/problems/${id}`);
    return response.data;
  },

  // Obtener iteraciones de un problema
  async getIterations(problemId: number): Promise<IterationsResponse> {
    const response = await api.get<IterationsResponse>(`/problems/${problemId}/iterations`);
    return response.data;
  },
};