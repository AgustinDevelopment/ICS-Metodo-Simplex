/**
 * Servicio para gestión de problemas
 * Responsabilidad: CRUD de problemas en la base de datos
 */

import prisma from '../config/database';
import { SimplexProblem } from '../types/types';

export interface ProblemDTO {
  name: string;
  objective: any;
  constraints: any;
  variables: any;
}

export class ProblemService {
  /**
   * Crea un nuevo problema
   */
  async createProblem(data: ProblemDTO) {
    return await prisma.problem.create({
      data: {
        name: data.name,
        objectiveFunction: data.objective,
        constraints: data.constraints,
        variables: data.variables
      }
    });
  }

  /**
   * Obtiene todos los problemas
   */
  async getAllProblems() {
    return await prisma.problem.findMany({
      orderBy: { id: 'asc' }
    });
  }

  /**
   * Obtiene un problema por ID
   */
  async getProblemById(id: number) {
    return await prisma.problem.findUnique({
      where: { id }
    });
  }

  /**
   * Actualiza un problema
   */
  async updateProblem(id: number, data: ProblemDTO) {
    return await prisma.problem.update({
      where: { id },
      data: {
        name: data.name,
        objectiveFunction: data.objective,
        constraints: data.constraints,
        variables: data.variables
      }
    });
  }

  /**
   * Elimina un problema
   */
  async deleteProblem(id: number) {
    return await prisma.problem.delete({
      where: { id }
    });
  }

  /**
   * Convierte datos de BD a SimplexProblem
   */
  toDomain(problemData: any): SimplexProblem {
    return {
      name: problemData.name,
      objective: typeof problemData.objectiveFunction === 'string' 
        ? JSON.parse(problemData.objectiveFunction) 
        : problemData.objectiveFunction,
      constraints: typeof problemData.constraints === 'string' 
        ? JSON.parse(problemData.constraints) 
        : problemData.constraints,
      variables: typeof problemData.variables === 'string' 
        ? JSON.parse(problemData.variables) 
        : problemData.variables
    };
  }
}
