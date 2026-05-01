// Generates a 1024×1024 placeholder app icon (CRT scope aesthetic).
// Writes build/icon.png. Use sips/iconutil to derive .icns / .ico.
// Runs with no dependencies — only Node built-ins.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 1024;

// ── Minimal PNG writer ────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function writePNG(filename, width, height, getPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // color type RGBA
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace
  const raw = Buffer.alloc(height * (1 + width * 4));
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const c = getPixel(x, y);
      raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2]; raw[p++] = c[3];
    }
  }
  const idat = zlib.deflateSync(raw);
  fs.writeFileSync(
    filename,
    Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])
  );
}

// ── Icon design: green CRT scope on black with rounded corners ────
const cx = SIZE / 2, cy = SIZE / 2;
const cornerRadius = 200;

function inRoundedRect(x, y) {
  const r = cornerRadius;
  if (x >= r && x <= SIZE - r) return true;
  if (y >= r && y <= SIZE - r) return true;
  const px = x < r ? r - x : x > SIZE - r ? x - (SIZE - r) : 0;
  const py = y < r ? r - y : y > SIZE - r ? y - (SIZE - r) : 0;
  return Math.hypot(px, py) <= r;
}

// Hand-rolled 5×7 pixel font for a chunky "DT" wordmark
const GLYPHS = {
  N: [
    "10001",
    "11001",
    "10101",
    "10011",
    "10001",
    "10001",
    "10001",
  ],
  S: [
    "01111",
    "10000",
    "10000",
    "01110",
    "00001",
    "00001",
    "11110",
  ],
};
function drawGlyph(letter, originX, originY, scale, plot) {
  const rows = GLYPHS[letter];
  for (let gy = 0; gy < rows.length; gy++) {
    for (let gx = 0; gx < rows[gy].length; gx++) {
      if (rows[gy][gx] === "1") {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            plot(originX + gx * scale + dx, originY + gy * scale + dy);
          }
        }
      }
    }
  }
}

// Pre-compute the wordmark bitmap into a Set so the per-pixel pass is O(1).
const wordmarkPixels = new Set();
const glyphScale = 38;
const glyphW = 5 * glyphScale;
const glyphH = 7 * glyphScale;
const gap = 60;
const totalW = glyphW * 2 + gap;
const startX = Math.round(cx - totalW / 2);
const startY = Math.round(cy - glyphH / 2);
const plot = (x, y) => wordmarkPixels.add(y * SIZE + x);
drawGlyph("N", startX, startY, glyphScale, plot);
drawGlyph("S", startX + glyphW + gap, startY, glyphScale, plot);

function getPixel(x, y) {
  if (!inRoundedRect(x, y)) return [0, 0, 0, 0];

  const dx = x - cx, dy = y - cy;
  const r = Math.hypot(dx, dy);

  // Background: black with a subtle radial green tint
  let R = 0, G = 0, B = 0, A = 255;
  const lit = Math.max(0, 1 - r / (SIZE * 0.55));
  G = Math.round(18 * lit);

  // Outer phosphor border ring
  const borderInset = 30;
  const distFromEdge = Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y);
  if (distFromEdge < 14 && distFromEdge > 6) {
    G = 220;
    R = 0;
  }

  // Concentric scope rings
  const ringSpacing = 90;
  const ringThickness = 3;
  const nearestRing = Math.abs((r % ringSpacing) - ringSpacing / 2);
  if (nearestRing > ringSpacing / 2 - ringThickness && r < SIZE * 0.45) {
    G = Math.max(G, 100);
  }

  // Cross-hairs
  if ((Math.abs(dx) < 2 || Math.abs(dy) < 2) && r < SIZE * 0.45) {
    G = Math.max(G, 80);
  }

  // Horizontal scanlines (every 4 pixels, very subtle)
  if (y % 4 === 0) {
    G = Math.round(G * 0.7);
  }

  // "DT" wordmark — bright green with shadow halo
  if (wordmarkPixels.has(y * SIZE + x)) {
    R = 80; G = 255; B = 130;
  } else {
    // Halo around wordmark for a phosphor glow
    let halo = 0;
    for (const dxh of [-3, 0, 3]) {
      for (const dyh of [-3, 0, 3]) {
        if (wordmarkPixels.has((y + dyh) * SIZE + (x + dxh))) { halo = 1; break; }
      }
      if (halo) break;
    }
    if (halo) { G = Math.max(G, 140); }
  }

  return [R, G, B, A];
}

const outPath = path.join(__dirname, "icon.png");
writePNG(outPath, SIZE, SIZE, getPixel);
console.log(`wrote ${outPath} (${SIZE}×${SIZE})`);
