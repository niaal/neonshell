// Bundles multiple PNG sizes into a Windows .ico file.
// Usage:  node build/generate-ico.js
// Reads icon_<size>.png siblings, writes icon.ico.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SIZES = [16, 32, 48, 64, 128, 256];
const dir = __dirname;
const src = path.join(dir, "icon.png");

// Generate the per-size PNGs via macOS sips
const pngs = SIZES.map((s) => {
  const out = path.join(dir, `icon_${s}.png`);
  execSync(`sips -z ${s} ${s} "${src}" --out "${out}" > /dev/null`);
  return { size: s, data: fs.readFileSync(out), path: out };
});

// ICO header (6 bytes): reserved=0, type=1 (icon), count=N
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);

// Directory entries (16 bytes each)
const dirEntries = Buffer.alloc(16 * pngs.length);
let imageOffset = 6 + 16 * pngs.length;
pngs.forEach((p, i) => {
  const off = i * 16;
  dirEntries.writeUInt8(p.size === 256 ? 0 : p.size, off + 0);   // width
  dirEntries.writeUInt8(p.size === 256 ? 0 : p.size, off + 1);   // height
  dirEntries.writeUInt8(0, off + 2);          // color palette
  dirEntries.writeUInt8(0, off + 3);          // reserved
  dirEntries.writeUInt16LE(1, off + 4);       // color planes
  dirEntries.writeUInt16LE(32, off + 6);      // bits per pixel
  dirEntries.writeUInt32LE(p.data.length, off + 8);
  dirEntries.writeUInt32LE(imageOffset, off + 12);
  imageOffset += p.data.length;
});

const ico = Buffer.concat([header, dirEntries, ...pngs.map((p) => p.data)]);
const icoPath = path.join(dir, "icon.ico");
fs.writeFileSync(icoPath, ico);

// Clean up temp PNGs
pngs.forEach((p) => fs.unlinkSync(p.path));

console.log(`wrote ${icoPath} (${ico.length} bytes, ${pngs.length} sizes)`);
