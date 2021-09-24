const size = 512;
const count = 255;

export const textureData = new Uint8Array(size * size);
textureData.fill(255);

const walkers: { color: number; x: number; y: number }[] = [];

for (let i = 0; i < count; i++) {
  walkers.push({
    color: 255 - i,
    x: Math.floor(Math.random() * size),
    y: Math.floor(Math.random() * size),
  });
}

for (let step = 0; step < 20000; step++) {
  for (const walker of walkers) {
    if (Math.random() < 0.5) {
      walker.x += Math.random() < 0.5 ? 1 : -1;
      walker.x = ((walker.x % size) + size) % size;
    } else {
      walker.y += Math.random() < 0.5 ? 1 : -1;
      walker.y = ((walker.y % size) + size) % size;
    }
    textureData[walker.y * size + walker.x] = walker.color;
  }
}
