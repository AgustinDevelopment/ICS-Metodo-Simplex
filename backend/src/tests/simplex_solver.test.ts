import request from "supertest";
import { app } from "../server";

describe("POST /problems/solve", () => {
    it("Debería devolver una solución óptima para un problema válido", async () => {
        const response = await request(app)
            .post("/problems/solve")
            .send({
                name: "Test Problem",
                objective: {
                    type: "max",
                    coefficients: [
                        { value: 5, variable: "x1" },
                        { value: 4, variable: "x2" }
                    ]
                },
                constraints: [
                    {
                        coefficients: [
                            { value: 6, variable: "x1" },
                            { value: 4, variable: "x2" }
                        ],
                        operator: "<=",
                        rightSide: 24
                    },
                    {
                        coefficients: [
                            { value: 1, variable: "x1" },
                            { value: 2, variable: "x2" }
                        ],
                        operator: "<=",
                        rightSide: 6
                    }
                ],
                variables: ["x1", "x2"]
            });

        expect(response.status).toBe(200);
        expect(response.body.msg).toBe('Problema resuelto correctamente');
        expect(response.body.solution).toHaveProperty("variables");
        expect(response.body.solution.variables).toHaveProperty("x1");
        expect(response.body.solution.variables).toHaveProperty("x2");
        expect(response.body.solution).toHaveProperty("objectiveValue");
        expect(response.body.solution.status).toBe("OPTIMAL");
    });

    it("Debería devolver error 400 si los datos son inválidos", async () => {
        const response = await request(app)
            .post("/problems/solve")
            .send({
                name: "",  // Nombre vacío para provocar error
                objective: {
                    type: "max",
                    coefficients: []  // Coeficientes vacíos para provocar error
                },
                constraints: [],
                variables: []
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBe("Validation error");
    });

    it("Debería devolver 400 si hay valores no numéricos", async () => {
        const response = await request(app)
            .post("/problems/solve")
            .send({
                name: "Invalid Numbers",
                objective: {
                    type: "max",
                    coefficients: [
                        { value: "5", variable: "x1" },
                        { value: 4, variable: "x2" }
                    ]
                },
                constraints: [
                    {
                        coefficients: [
                            { value: 6, variable: "x1" },
                            { value: 4, variable: "x2" }
                        ],
                        operator: "<=",
                        rightSide: "24"
                    }
                ],
                variables: ["x1", "x2"]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message", "Validation error");
    });
});
