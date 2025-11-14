import { z } from 'zod';


export const coefficientSchema = z.object({
  value: z.number(),
  variable: z.string()
});

export const objectiveFunctionSchema = z.object({
  type: z.enum(['max', 'min']),
  coefficients: z.array(coefficientSchema).min(1, {
    message: 'La función objetivo debe tener al menos un coeficiente'
  })
});

export const constraintSchema = z.object({
  coefficients: z.array(coefficientSchema).min(1, {
    message: 'Cada restricción debe tener al menos un coeficiente'
  }),
  operator: z.enum(['<=', '>=', '='] as const),
  rightSide: z.number()
});

export const simplexProblemSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  objective: objectiveFunctionSchema,
  constraints: z.array(constraintSchema).min(1, {
    message: 'Debe existir al menos una restricción'
  }),
  variables: z.array(z.string())
})
.refine(d => d.variables.length === 2, { message: 'Se requieren exactamente 2 variables', path: ['variables'] })
.refine(d => new Set(d.variables).size === d.variables.length, { message: 'Variables duplicadas', path: ['variables'] })
.superRefine((d, ctx) => {
  const variableSet = new Set(d.variables);

  for (let idx = 0; idx < d.objective.coefficients.length; idx++) {
    const c = d.objective.coefficients[idx];
    if (!variableSet.has(c.variable)) {
      ctx.addIssue({
        code: 'custom',
        message: `La variable '${c.variable}' no está declarada en variables`,
        path: ['objective', 'coefficients', idx, 'variable']
      });
    }
  }

  for (let cIdx = 0; cIdx < d.constraints.length; cIdx++) {
    const cons = d.constraints[cIdx];
    for (let idx = 0; idx < cons.coefficients.length; idx++) {
      const coef = cons.coefficients[idx];
      if (!variableSet.has(coef.variable)) {
        ctx.addIssue({
          code: 'custom',
          message: `La variable '${coef.variable}' no está declarada en variables`,
          path: ['constraints', cIdx, 'coefficients', idx, 'variable']
        });
      }
    }
  }
});

export const updateProblemSchema = simplexProblemSchema.partial();

export type SimplexProblemDTO = z.infer<typeof simplexProblemSchema>;
