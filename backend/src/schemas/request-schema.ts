import { z } from 'zod';


export const coefficientSchema = z.object({
  value: z.number(),
  variable: z.string()
});

export const objectiveFunctionSchema = z.object({
  type: z.enum(['max', 'min']),
  coefficients: z.array(coefficientSchema)
});

export const constraintSchema = z.object({
  coefficients: z.array(coefficientSchema),
  operator: z.enum(['<=', '>=', '='] as const),
  rightSide: z.number()
});

export const simplexProblemSchema = z.object({
  name: z.string().min(1),
  objective: objectiveFunctionSchema,
  constraints: z.array(constraintSchema),
  variables: z.array(z.string())
})
.refine(d => d.variables.length === 2, { message: 'Se requieren exactamente 2 variables', path: ['variables'] })
.refine(d => new Set(d.variables).size === d.variables.length, { message: 'Variables duplicadas', path: ['variables'] });

export const updateProblemSchema = simplexProblemSchema.partial();

export type SimplexProblemDTO = z.infer<typeof simplexProblemSchema>;

export const requestSchema = {
};
