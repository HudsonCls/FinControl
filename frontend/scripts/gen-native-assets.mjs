// Gera as imagens-fonte para o @capacitor/assets: ícone 1024 e splash 2732,
// com a marca Avora (fundo verde + três barras brancas de crescimento).
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(assetsDir, { recursive: true });

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
};
function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.concat([u32(size), u32(size), Buffer.from([8, 6, 0, 0, 0])]);
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Desenha fundo verde + três barras brancas ocupando `logoFrac` da largura, centradas.
function draw(size, logoFrac) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = 0x16;
    buf[i * 4 + 1] = 0xa3;
    buf[i * 4 + 2] = 0x4a;
    buf[i * 4 + 3] = 255;
  }
  const fillWhite = (x0, y0, w, h) => {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++)
      for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const i = (y * size + x) * 4;
        buf[i] = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
      }
  };
  const inner = size * logoFrac;
  const left = (size - inner) / 2;
  const top = (size - inner) / 2;
  const gap = inner * 0.1;
  const barW = (inner - 2 * gap) / 3;
  const heights = [0.46, 0.72, 1.0];
  for (let k = 0; k < 3; k++) {
    const h = inner * heights[k];
    fillWhite(left + k * (barW + gap), top + (inner - h), barW, h);
  }
  return buf;
}

// Ícone: barras maiores (safe zone do ícone adaptativo cuida do recorte).
writeFileSync(join(assetsDir, 'icon.png'), png(1024, draw(1024, 0.52)));
console.log('gerado assets/icon.png (1024)');

// Splash: barras pequenas centradas num fundo verde grande.
const splash = png(2732, draw(2732, 0.2));
writeFileSync(join(assetsDir, 'splash.png'), splash);
writeFileSync(join(assetsDir, 'splash-dark.png'), splash);
console.log('gerado assets/splash.png e splash-dark.png (2732)');
