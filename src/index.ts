import { vec3 } from "gl-matrix";

const faces = [
  { start: vec3.fromValues(+0.5, -0.5, +0.5), right: vec3.fromValues(0, 0, -1), up: vec3.fromValues(0, +1, 0) }, // Positive X
  { start: vec3.fromValues(-0.5, -0.5, -0.5), right: vec3.fromValues(0, 0, +1), up: vec3.fromValues(0, +1, 0) }, // Negative X
  { start: vec3.fromValues(-0.5, +0.5, +0.5), right: vec3.fromValues(+1, 0, 0), up: vec3.fromValues(0, 0, -1) }, // Positive Y
  { start: vec3.fromValues(-0.5, -0.5, -0.5), right: vec3.fromValues(+1, 0, 0), up: vec3.fromValues(0, 0, +1) }, // Negative Y
  { start: vec3.fromValues(-0.5, -0.5, +0.5), right: vec3.fromValues(+1, 0, 0), up: vec3.fromValues(0, +1, 0) }, // Positive Z
  { start: vec3.fromValues(+0.5, -0.5, -0.5), right: vec3.fromValues(-1, 0, 0), up: vec3.fromValues(0, +1, 0) }, // Negative Z
];

function grid(
  start: vec3,
  right: vec3,
  up: vec3,
  width: number,
  height: number,
  widthSteps: number,
  heightSteps: number
) {
  const positions: vec3[] = [];
  for (let x = 0; x < widthSteps; x++) {
    for (let y = 0; y < heightSteps; y++) {
      const pa = vec3.scaleAndAdd(vec3.create(), start, right, (width * x) / widthSteps);
      vec3.scaleAndAdd(pa, pa, up, (height * y) / heightSteps);
      const pb = vec3.scaleAndAdd(vec3.create(), pa, right, width / widthSteps);
      const pc = vec3.scaleAndAdd(vec3.create(), pb, up, height / heightSteps);
      const pd = vec3.scaleAndAdd(vec3.create(), pa, up, height / heightSteps);
      positions.push(pa, pb, pc, pa, pc, pd);
    }
  }
  return positions;
}

function roundedBoxPoint(point: vec3, size: vec3, radius: number) {
  const boundMax = vec3.multiply(vec3.create(), size, vec3.fromValues(0.5, 0.5, 0.5));
  vec3.subtract(boundMax, boundMax, [radius, radius, radius]);
  const boundMin = vec3.multiply(vec3.create(), size, vec3.fromValues(-0.5, -0.5, -0.5));
  vec3.add(boundMin, boundMin, [radius, radius, radius]);
  const clamped = vec3.max(vec3.create(), boundMin, point);
  vec3.min(clamped, boundMax, clamped);
  const normal = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), point, clamped));
  const position = vec3.scaleAndAdd(vec3.create(), clamped, normal, radius);
  return {
    normal,
    position,
  };
}

class Indexer {
  public positions: vec3[] = [];
  public cells: number[][] = [];

  populateCell(index: number) {
    if (this.cells.length === 0) {
      this.cells.push([]);
    }
    if (this.cells[this.cells.length - 1].length === 3) {
      this.cells.push([]);
    }
    this.cells[this.cells.length - 1].push(index);
  }

  index(points: vec3[]) {
    for (const point of points) {
      let populated = false;
      for (let i = 0; i < this.positions.length; i++) {
        if (vec3.equals(this.positions[i], point)) {
          this.populateCell(i);
          populated = true;
          break;
        }
      }
      if (!populated) {
        this.positions.push(vec3.clone(point));
        this.populateCell(this.positions.length - 1);
      }
    }
  }
}

interface Options {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  resolution?: number;
}

const DEFAULTS = {
  width: 1,
  height: 1,
  depth: 1,
  radius: 0.125,
  resolution: 5,
};

export function generateRoundedBox(options: Options = {}) {
  const { width, height, depth, radius, resolution } = { ...DEFAULTS, ...options };
  const size = vec3.fromValues(width, height, depth);
  vec3.max(size, size, [2 * radius, 2 * radius, 2 * radius]);

  const indexer = new Indexer();
  for (const face of faces) {
    const width = vec3.length(vec3.multiply(vec3.create(), face.right, size));
    const height = vec3.length(vec3.multiply(vec3.create(), face.up, size));
    const s0 = vec3.multiply(vec3.create(), face.start, size);
    const s1 = vec3.scaleAndAdd(vec3.create(), s0, face.right, radius);
    const s2 = vec3.scaleAndAdd(vec3.create(), s0, face.right, width - radius);
    const s3 = vec3.scaleAndAdd(vec3.create(), s0, face.up, radius);
    const s4 = vec3.scaleAndAdd(vec3.create(), s3, face.right, radius);
    const s5 = vec3.scaleAndAdd(vec3.create(), s3, face.right, width - radius);
    const s6 = vec3.scaleAndAdd(vec3.create(), s0, face.up, height - radius);
    const s7 = vec3.scaleAndAdd(vec3.create(), s6, face.right, radius);
    const s8 = vec3.scaleAndAdd(vec3.create(), s6, face.right, width - radius);
    // Each corner grid.
    indexer.index(grid(s0, face.right, face.up, radius, radius, resolution, resolution));
    indexer.index(grid(s2, face.right, face.up, radius, radius, resolution, resolution));
    indexer.index(grid(s6, face.right, face.up, radius, radius, resolution, resolution));
    indexer.index(grid(s8, face.right, face.up, radius, radius, resolution, resolution));
    // Left and right side.
    indexer.index(grid(s3, face.right, face.up, radius, height - 2 * radius, resolution, 1));
    indexer.index(grid(s5, face.right, face.up, radius, height - 2 * radius, resolution, 1));
    // Top and bottom.
    indexer.index(grid(s1, face.right, face.up, width - 2 * radius, radius, 1, resolution));
    indexer.index(grid(s7, face.right, face.up, width - 2 * radius, radius, 1, resolution));
    // Middle face.
    indexer.index(grid(s4, face.right, face.up, width - 2 * radius, height - 2 * radius, 1, 1));
  }

  const { positions, cells } = indexer;

  const normals: vec3[] = [];

  for (const position of positions) {
    const rounded = roundedBoxPoint(position, size, radius);
    position[0] = rounded.position[0];
    position[1] = rounded.position[1];
    position[2] = rounded.position[2];
    normals.push(rounded.normal);
  }

  return {
    positions: positions.map((p) => [p[0], p[1], p[2]]),
    normals: normals.map((n) => [n[0], n[1], n[2]]),
    cells,
  };
}
