import { simplexProblemSchema } from "../schemas/request-schema";

describe("Validación de entradas - simplexProblemSchema", () => {
  it("debería aceptar un problema válido", () => {
    const validData = {
      name: "Problema válido",
      objective: {
        type: "max",
        coefficients: [
          { value: 3, variable: "x1" },
          { value: 2, variable: "x2" },
        ],
      },
      constraints: [
        {
          coefficients: [
            { value: 1, variable: "x1" },
            { value: 2, variable: "x2" },
          ],
          operator: "<=",
          rightSide: 10,
        },
      ],
      variables: ["x1", "x2"],
    };

    const result = simplexProblemSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("debería rechazar si hay variables duplicadas", () => {
    const invalidData = {
      name: "Duplicadas",
      objective: {
        type: "max",
        coefficients: [
          { value: 1, variable: "x1" },
          { value: 2, variable: "x2" },
        ],
      },
      constraints: [
        {
          coefficients: [
            { value: 1, variable: "x1" },
            { value: 2, variable: "x2" },
          ],
          operator: "<=",
          rightSide: 5,
        },
      ],
      variables: ["x1", "x1"], // duplicadas
    };

    const result = simplexProblemSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("debería rechazar si una variable no está declarada", () => {
    const invalidData = {
      name: "Variable no declarada",
      objective: {
        type: "max",
        coefficients: [
          { value: 3, variable: "x1" },
          { value: 2, variable: "x3" }, // x3 no está en variables
        ],
      },
      constraints: [
        {
          coefficients: [
            { value: 1, variable: "x1" },
            { value: 2, variable: "x2" },
          ],
          operator: "<=",
          rightSide: 10,
        },
      ],
      variables: ["x1", "x2"],
    };

    const result = simplexProblemSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("debería rechazar si los coeficientes no son números", () => {
    const invalidData = {
      name: "Coeficiente inválido",
      objective: {
        type: "max",
        coefficients: [
          { value: "no es número", variable: "x1" }, // Rechazar
          { value: 2, variable: "x2" },
        ],
      },
      constraints: [
        {
          coefficients: [
            { value: 1, variable: "x1" },
            { value: 2, variable: "x2" },
          ],
          operator: "<=",
          rightSide: 10,
        },
      ],
      variables: ["x1", "x2"],
    };

    const result = simplexProblemSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});