// Gera os ícones PNG do PWA sem dependências externas (usa zlib nativo).
// Ícone: quadrado verde da marca com um "F" branco (FinControl).
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(pub, { recursive: true });

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
}
function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.concat([u32(size), u32(size), Buffer.from([8, 6, 0, 0, 0])]);
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon(size, padFrac, rounded) {
  const buf = Buffer.alloc(size * size * 4);
  const px = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = 255;
  };
  const fill = (x0, y0, w, h, r, g, b) => {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++)
      for (let x = Math.round(x0); x < Math.round(x0 + w); x++) px(x, y, r, g, b);
  };

  const rad = rounded ? size * 0.22 : 0;
  const inCorner = (x, y) => {
    const corners = [
      [rad, rad],
      [size - rad, rad],
      [rad, size - rad],
      [size - rad, size - rad],
    ];
    for (const [cx, cy] of corners) {
      const outsideX = (cx === rad && x < rad) || (cx !== rad && x > size - rad);
      const outsideY = (cy === rad && y < rad) || (cy !== rad && y > size - rad);
      if (outsideX && outsideY) {
        if (Math.hypot(x - cx, y - cy) > rad) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (inCorner(x, y)) continue;
      px(x, y, 0x16, 0xa3, 0x4a); // fundo verde da marca
    }

  // Três barras ascendentes (gráfico de crescimento) em branco.
  const pad = size * padFrac;
  const inner = size - 2 * pad;
  const gap = inner * 0.1;
  const barW = (inner - 2 * gap) / 3;
  const heights = [0.46, 0.72, 1.0];
  for (let k = 0; k < 3; k++) {
    const h = inner * heights[k];
    const bx = pad + k * (barW + gap);
    const by = pad + (inner - h);
    fill(bx, by, barW, h, 255, 255, 255);
  }
  return buf;
}

const targets = [
  ['pwa-192x192.png', 192, 0.26, true],
  ['pwa-512x512.png', 512, 0.26, true],
  ['maskable-512.png', 512, 0.32, false],
  ['apple-touch-icon.png', 180, 0.24, true],
];
for (const [name, size, pad, rounded] of targets) {
  writeFileSync(join(pub, name), png(size, drawIcon(size, pad, rounded)));
  console.log('gerado', name);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#16a34a"/><g fill="#fff"><rect x="16" y="34" width="9" height="14" rx="1.5"/><rect x="27.5" y="26" width="9" height="22" rx="1.5"/><rect x="39" y="18" width="9" height="30" rx="1.5"/></g></svg>`;
writeFileSync(join(pub, 'favicon.svg'), favicon);
console.log('gerado favicon.svg');
