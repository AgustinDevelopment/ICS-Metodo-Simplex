// Tipos base para la API Simplex
export interface Problem {
  id: number;
  name: string;
  objective: string;
  constraints: string;
  variables: number;
  restrictions: number;
  createdAt: string;
  updatedAt: string;
}
