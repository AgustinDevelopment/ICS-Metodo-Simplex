import { Coefficient, SimplexError, SimplexProblem, SimplexSolution } from '../../types/types';
import { roundSolution } from './utils';

export function solveByVertexEnumeration(problem: SimplexProblem): SimplexSolution | SimplexError | null {
  const [v1, v2] = problem.variables;
  const eps = 1e-9;

  const getCoeff = (coefs: Coefficient[], name: string) => (coefs.find(c => c.variable === name)?.value ?? 0);
  const feasible = (x: number, y: number) => {
    if (x < -eps || y < -eps) return false;
    for (const cons of problem.constraints) {
      const a = getCoeff(cons.coefficients, v1);
      const b = getCoeff(cons.coefficients, v2);
      const lhs = a * x + b * y;
      if (cons.operator === '<=') { if (lhs - cons.rightSide > eps) return false; }
      else if (cons.operator === '>=') { if (cons.rightSide - lhs > eps) return false; }
      else { if (Math.abs(lhs - cons.rightSide) > 1e-7) return false; }
    }
    return true;
  };
  const intersect = (a1:number,b1:number,c1:number,a2:number,b2:number,c2:number): [number,number] | null => {
    const det = a1*b2 - a2*b1;
    if (Math.abs(det) < eps) return null;
    const x = (c1*b2 - c2*b1) / det;
    const y = (a1*c2 - a2*c1) / det;
    if (!isFinite(x) || !isFinite(y)) return null;
    return [x,y];
  };

  const lines: Array<{a:number,b:number,c:number}> = [];
  for (const cons of problem.constraints) {
    const a = getCoeff(cons.coefficients, v1);
    const b = getCoeff(cons.coefficients, v2);
    const c = cons.rightSide;
    lines.push({a,b,c});
    if (Math.abs(a) > eps) lines.push({a:1,b:0,c:0});
    if (Math.abs(b) > eps) lines.push({a:0,b:1,c:0});
  }
  lines.push({a:1,b:0,c:0});
  lines.push({a:0,b:1,c:0});

  const candidates = new Set<string>();
  const addPt = (x:number,y:number) => {
    if (!isFinite(x) || !isFinite(y)) return;
    const kx = Math.abs(x) < eps ? 0 : x;
    const ky = Math.abs(y) < eps ? 0 : y;
    candidates.add(`${kx.toFixed(10)}|${ky.toFixed(10)}`);
  };

  for (let i=0;i<lines.length;i++){
    for (let j=i+1;j<lines.length;j++){
      const p = intersect(lines[i].a,lines[i].b,lines[i].c, lines[j].a,lines[j].b,lines[j].c);
      if (p) addPt(p[0],p[1]);
    }
  }
  addPt(0,0);

  let bestValue = problem.objective.type === 'max' ? -Infinity : Infinity;
  let best: {x:number,y:number} | null = null;
  const evalObj = (x:number,y:number) => {
    const c1 = getCoeff(problem.objective.coefficients, v1);
    const c2 = getCoeff(problem.objective.coefficients, v2);
    return c1*x + c2*y;
  };

  for (const key of candidates) {
    const [xs,ys] = key.split('|');
    const x = parseFloat(xs); const y = parseFloat(ys);
    if (!feasible(x,y)) continue;
    const val = evalObj(x,y);
    if (problem.objective.type === 'max') {
      if (val > bestValue + eps) { bestValue = val; best = {x,y}; }
    } else {
      if (val < bestValue - eps) { bestValue = val; best = {x,y}; }
    }
  }

  if (!best) {
    return { message: 'El problema no tiene solución posible (2D)', type: 'SIN_SOLUCION' };
  }

  const variables = new Map<string, number>([[v1, best.x],[v2, best.y]]);
  return roundSolution({ optimal: true, bounded: true, variables, objectiveValue: bestValue, iterations: [] }, 6) as SimplexSolution;
}