import { Coefficient, SimplexError, SimplexProblem, SimplexSolution } from '../../types/types';
import { roundSolution, EPS, DEFAULT_DECIMALS } from '../../utils';

function getCoeff(coefs: Coefficient[], name: string): number {
  return coefs.find(c => c.variable === name)?.value ?? 0;
}

function isFeasible2D(problem: SimplexProblem, v1: string, v2: string, x: number, y: number, eps: number): boolean {
  if (x < -eps || y < -eps) return false;
  for (const cons of problem.constraints) {
    const a = getCoeff(cons.coefficients, v1);
    const b = getCoeff(cons.coefficients, v2);
    const lhs = a * x + b * y;
    const diff = lhs - cons.rightSide;
    if (cons.operator === '<=' && diff > eps) return false;
    if (cons.operator === '>=' && -diff > eps) return false;
    if (cons.operator === '=' && Math.abs(diff) > eps) return false;
  }
  return true;
}

function intersectLines(a1:number,b1:number,c1:number,a2:number,b2:number,c2:number, eps:number): [number,number] | null {
  const det = a1*b2 - a2*b1;
  if (Math.abs(det) < eps) return null;
  const x = (c1*b2 - c2*b1) / det;
  const y = (a1*c2 - a2*c1) / det;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x,y];
}

function buildCandidateLines(problem: SimplexProblem, v1: string, v2: string, eps:number) {
  const lines: Array<{a:number,b:number,c:number}> = [];
  for (const cons of problem.constraints) {
    const a = getCoeff(cons.coefficients, v1);
    const b = getCoeff(cons.coefficients, v2);
    const c = cons.rightSide;
    lines.push({a,b,c});
    if (Math.abs(a) > eps) lines.push({a:1,b:0,c:0});
    if (Math.abs(b) > eps) lines.push({a:0,b:1,c:0});
  }
  lines.push(
    {a:1,b:0,c:0},
    {a:0,b:1,c:0}
  );
  return lines;
}

function evaluateObjective(problem: SimplexProblem, v1: string, v2: string, x:number, y:number): number {
  const c1 = getCoeff(problem.objective.coefficients, v1);
  const c2 = getCoeff(problem.objective.coefficients, v2);
  return c1*x + c2*y;
}

export function solveByVertexEnumeration(problem: SimplexProblem): SimplexSolution | SimplexError | null {
  const [v1, v2] = problem.variables;
  const eps = EPS;

  const lines = buildCandidateLines(problem, v1, v2, eps);
  const candidates = new Set<string>();

  const addPt = (x:number,y:number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const kx = Math.abs(x) < eps ? 0 : x;
    const ky = Math.abs(y) < eps ? 0 : y;
    candidates.add(`${kx.toFixed(10)}|${ky.toFixed(10)}`);
  };

  for (let i=0;i<lines.length;i++){
    for (let j=i+1;j<lines.length;j++){
      const p = intersectLines(lines[i].a,lines[i].b,lines[i].c, lines[j].a,lines[j].b,lines[j].c, eps);
      if (p) addPt(p[0],p[1]);
    }
  }
  addPt(0,0);

  let bestValue = problem.objective.type === 'max' ? -Infinity : Infinity;
  let best: {x:number,y:number} | null = null;

  for (const key of candidates) {
    const [xs,ys] = key.split('|');
    const x = Number.parseFloat(xs);
    const y = Number.parseFloat(ys);
    if (!isFeasible2D(problem, v1, v2, x, y, eps)) continue;
    const val = evaluateObjective(problem, v1, v2, x, y);
    const isBetter = problem.objective.type === 'max' ? (val > bestValue + eps) : (val < bestValue - eps);
    if (isBetter) { bestValue = val; best = {x,y}; }
  }

  if (!best) {
    return { message: 'El problema no tiene solución posible (2D)', type: 'SIN_SOLUCION' };
  }

  const variables = new Map<string, number>([[v1, best.x],[v2, best.y]]);
  return roundSolution({ optimal: true, bounded: true, variables, objectiveValue: bestValue, iterations: [] }, DEFAULT_DECIMALS) as SimplexSolution;
}