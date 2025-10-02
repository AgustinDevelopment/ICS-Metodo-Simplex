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
  variables: z.array(z.string()),
});

export const updateProblemSchema = simplexProblemSchema.partial();

export const requestSchema = {
};
