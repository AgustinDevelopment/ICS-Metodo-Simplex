import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Simplex Solver API',
      version: '1.0.0',
      description: 'API REST para resolver problemas de programación lineal usando el Método Simplex',
      contact: {
        name: 'UTN FRSR - ICS',
        url: 'https://github.com/your-repo'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    tags: [
      {
        name: 'Simplex',
        description: 'Operaciones del método Simplex'
      }
    ],
    components: {
      schemas: {
        SimplexProblem: {
          type: 'object',
          required: ['name', 'objective', 'constraints', 'variables'],
          properties: {
            name: {
              type: 'string',
              example: 'Problema ejemplo'
            },
            objective: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['max', 'min'],
                  example: 'max'
                },
                coefficients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'number', example: 3 },
                      variable: { type: 'string', example: 'x1' }
                    }
                  }
                }
              }
            },
            constraints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  coefficients: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        value: { type: 'number', example: 2 },
                        variable: { type: 'string', example: 'x1' }
                      }
                    }
                  },
                  operator: {
                    type: 'string',
                    enum: ['<=', '>=', '='],
                    example: '<='
                  },
                  rightSide: {
                    type: 'number',
                    example: 100
                  }
                }
              }
            },
            variables: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['x1', 'x2']
            }
          }
        },
        SimplexSolution: {
          type: 'object',
          properties: {
            msg: {
              type: 'string',
              example: 'Problema resuelto'
            },
            problem: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Problema ejemplo' }
              }
            },
            solution: {
              type: 'object',
              properties: {
                variables: {
                  type: 'object',
                  example: { x1: 50, x2: 0 }
                },
                objectiveValue: {
                  type: 'number',
                  example: 150
                },
                status: {
                  type: 'string',
                  example: 'OPTIMAL'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            msg: {
              type: 'string',
              example: 'Error al resolver el problema'
            },
            status: {
              type: 'string',
              enum: ['NO_ACOTADA', 'SIN_SOLUCION', 'ENTRADA_INVALIDA'],
              example: 'SIN_SOLUCION'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)

