const pool = require("typedarray-pool");

function hypot(x, y, z) {
  return Math.sqrt(
    Math.pow(x, 2) +
    Math.pow(y, 2) +
    Math.pow(z, 2));
}

function accumulate(out, inp, w) {
  for (let i = 0; i < 3; ++i) {
    out[i] += inp[i] * w;
  }
}

function dup(array) {
  const result = new Array(array.length);
  for (let i = 0; i < array.length; ++i) {
    result[i] = array[i].slice();
  }
  return result;
}

function smoothStep(cells, positions, outAccum, trace, weight) {
  let i;
  const numVerts = positions.length;
  const numCells = cells.length;

  for (i = 0; i < numVerts; ++i) {
    const ov = outAccum[i];
    ov[0] = ov[1] = ov[2] = 0;
  }

  for (i = 0; i < numVerts; ++i) {
    trace[i] = 0;
  }

  for (i = 0; i < numCells; ++i) {
    const cell = cells[i];
    const ia = cell[0];
    const ib = cell[1];
    const ic = cell[2];

    const a = positions[ia];
    const b = positions[ib];
    const c = positions[ic];

    const abx = a[0] - b[0];
    const aby = a[1] - b[1];
    const abz = a[2] - b[2];

    const bcx = b[0] - c[0];
    const bcy = b[1] - c[1];
    const bcz = b[2] - c[2];

    const cax = c[0] - a[0];
    const cay = c[1] - a[1];
    const caz = c[2] - a[2];

    const area = 0.5 * hypot(
      aby * caz - abz * cay,
      abz * cax - abx * caz,
      abx * cay - aby * cax);

    if (area < 1e-8) {
      continue;
    }

    const w = -0.5 / area;
    const wa = w * (abx * cax + aby * cay + abz * caz);
    const wb = w * (bcx * abx + bcy * aby + bcz * abz);
    const wc = w * (cax * bcx + cay * bcy + caz * bcz);

    trace[ia] += wb + wc;
    trace[ib] += wc + wa;
    trace[ic] += wa + wb;

    const oa = outAccum[ia];
    const ob = outAccum[ib];
    const oc = outAccum[ic];

    accumulate(ob, c, wa);
    accumulate(oc, b, wa);
    accumulate(oc, a, wb);
    accumulate(oa, c, wb);
    accumulate(oa, b, wc);
    accumulate(ob, a, wc);
  }

  for (i = 0; i < numVerts; ++i) {
    const o = outAccum[i];
    const p = positions[i];
    const tr = trace[i];
    for (let j = 0; j < 3; ++j) {
      const x = p[j];
      o[j] = x + weight * (o[j] / tr - x);
    }
  }
}

export function taubinSmooth(cells, positions, _options) {
  const options = _options || {};
  const passBand = "passBand" in options ? +options.passBand : 0.1;
  const iters = ("iters" in options ? (options.iters | 0) : 10);

  const trace = pool.mallocDouble(positions.length);

  const pointA = dup(positions);
  const pointB = dup(positions);

  const A = -1;
  const B = passBand;
  const C = 2;

  const discr = Math.sqrt(B * B - 4 * A * C);
  const r0 = (-B + discr) / (2 * A * C);
  const r1 = (-B - discr) / (2 * A * C);

  const lambda = Math.max(r0, r1);
  const mu = Math.min(r0, r1);

  for (let i = 0; i < iters; ++i) {
    smoothStep(cells, pointA, pointB, trace, lambda);
    smoothStep(cells, pointB, pointA, trace, mu);
  }

  pool.free(trace);

  return pointA;
}
