import * as THREE from 'three';

// =====================================================================
//  CRAFT KART — a blocky kart racer
// =====================================================================

// ---------- small utils ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = mulberry32(20261018);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const wrapAngle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
const fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 5, y * 2.1 + 9) * 0.3 + vnoise(x * 4.3 + 11, y * 4.3 + 3) * 0.1;
const isTouch = matchMedia('(pointer: coarse)').matches;
const VERSION = 'v1.1.0 \u00b7 2026-10-19';
function showErr(m) { let d = document.getElementById('errbox'); if (!d) { d = document.createElement('pre'); d.id = 'errbox'; d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:40%;overflow:auto;margin:0;padding:8px;z-index:99;background:rgba(120,0,0,.9);color:#fff;font:11px monospace;white-space:pre-wrap'; document.body.appendChild(d); } d.textContent += m + '\n'; }
addEventListener('error', e => showErr('ERR ' + e.message + ' @' + (e.lineno || '')));
addEventListener('unhandledrejection', e => showErr('REJ ' + (e.reason && e.reason.message || e.reason)));
document.querySelectorAll('.foot:not(.r)').forEach(e => { e.textContent = 'Craft Kart ' + VERSION; });

// ---------- pixel textures ----------
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb = (r, g, b) => `rgb(${clamp(r | 0, 0, 255)},${clamp(g | 0, 0, 255)},${clamp(b | 0, 0, 255)})`;
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
function palFill(g, s, pal, x0 = 0, y0 = 0, w = s, h = s) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(g, x, y, pal[(rand() * pal.length) | 0]); }
function noiseFill(g, s, base, vari = 0.1) { const [R, G, B] = hexRgb(base); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const f = 1 + (rand() - 0.5) * 2 * vari; px(g, x, y, rgb(R * f, G * f, B * f)); } }
function makeCanvas(s, draw) { const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'); draw(g, s); return c; }
function texFrom(c, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const tex = (s, draw, repeat) => texFrom(makeCanvas(s, draw), repeat);
function patternCanvas(rows, pal) { return makeCanvas(8, g => rows.forEach((r, y) => [...r].forEach((ch, x) => px(g, x, y, pal[ch])))); }

const GREENS = ['#5f9f35', '#6aab3c', '#559530', '#77b649', '#4e8a2b'];
const DIRT = ['#866043', '#79553a', '#96704f', '#6c4b32', '#8d6646'];
const T = {};
T.grassTop = tex(16, (g, s) => palFill(g, s, GREENS), true);
T.dirt = tex(16, (g, s) => palFill(g, s, DIRT));
T.grassSide = tex(16, (g, s) => { palFill(g, s, DIRT); for (let x = 0; x < s; x++) { const h = 3 + ((rand() * 2.6) | 0); palFill(g, s, GREENS, x, 0, 1, h); } });
T.road = tex(16, (g, s) => { palFill(g, s, ['#6d6d6d', '#747474', '#666666', '#7b7b7b', '#626262']); for (let i = 0; i < 10; i++) px(g, (rand() * s) | 0, (rand() * s) | 0, '#555'); });
T.stone = tex(16, (g, s) => palFill(g, s, ['#7f7f7f', '#878787', '#747474', '#8f8f8f']));
T.woolRed = tex(16, (g, s) => noiseFill(g, s, '#b52c26', 0.09));
T.woolWhite = tex(16, (g, s) => noiseFill(g, s, '#e9ecec', 0.05));
T.checker = tex(16, (g, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const w = ((x >> 3) + (y >> 3)) % 2; const f = 1 + (rand() - 0.5) * 0.12; px(g, x, y, w ? rgb(235 * f, 235 * f, 235 * f) : rgb(28 * f, 28 * f, 30 * f)); } });
T.planks = tex(16, (g, s) => { noiseFill(g, s, '#a2834f', 0.07); for (let y = 0; y < s; y += 4) { g.fillStyle = '#73582f'; g.fillRect(0, y + 3, s, 1); const sx = (rand() * s) | 0; g.fillRect(sx, y, 1, 3); } });
T.logSide = tex(16, (g, s) => { for (let x = 0; x < s; x++) { const b = (x % 4 === 1 || x % 5 === 3) ? '#55401f' : '#6b5132'; for (let y = 0; y < s; y++) { const [R, G, B] = hexRgb(b); const f = 1 + (rand() - 0.5) * 0.16; px(g, x, y, rgb(R * f, G * f, B * f)); } } });
T.logTop = tex(16, (g, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); px(g, x, y, d > 6.5 ? '#6b5132' : (Math.floor(d) % 2 ? '#b8945f' : '#9c7a48')); } });
T.leaves = tex(16, (g, s) => { palFill(g, s, ['#3b7a1e', '#2f6a18', '#4a8c28', '#24561a', '#3f7f22']); for (let i = 0; i < 24; i++) px(g, (rand() * s) | 0, (rand() * s) | 0, '#173a0c'); });
T.sand = tex(16, (g, s) => palFill(g, s, ['#dbd3a0', '#d6cc94', '#e3dbab', '#cfc68e']));
T.water = tex(16, (g, s) => palFill(g, s, ['#3f76e4', '#3a6dd6', '#4a80ea', '#355fc4', '#4677e0']), true);
T.gold = tex(16, (g, s) => { noiseFill(g, s, '#f5d63d', 0.08); g.fillStyle = '#fff59a'; g.fillRect(1, 1, 14, 1); g.fillRect(1, 1, 1, 14); g.fillStyle = '#c9a224'; g.fillRect(1, 14, 14, 1); g.fillRect(14, 1, 1, 14); });
T.bounce = tex(16, (g, s) => {
  noiseFill(g, s, '#45c8e0', 0.05);
  for (const [o, c] of [[0, '#2b8fb0'], [2, '#7fe3f2']]) { g.fillStyle = c; g.fillRect(o, o, s - 2 * o, 1); g.fillRect(o, s - 1 - o, s - 2 * o, 1); g.fillRect(o, o, 1, s - 2 * o); g.fillRect(s - 1 - o, o, 1, s - 2 * o); }
  g.fillStyle = '#ffffff'; g.fillRect(7, 4, 2, 1); g.fillRect(6, 5, 4, 1); g.fillRect(5, 6, 6, 1); g.fillRect(7, 7, 2, 5);
});
const crateFrame = g => { g.fillStyle = '#5a3d1e'; g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2); g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16); };
T.crateSide = tex(16, (g, s) => { noiseFill(g, s, '#9a6a34', 0.08); for (let y = 5; y < 11; y++) for (let x = 0; x < s; x++) px(g, x, y, ((x + y) >> 1) % 2 ? '#1c1c1c' : '#f2c21b'); crateFrame(g); });
T.crateTop = tex(16, (g, s) => { noiseFill(g, s, '#9a6a34', 0.08); crateFrame(g); g.fillStyle = '#d8342a'; g.fillRect(4, 4, 8, 8); g.fillStyle = '#ffffff'; g.fillRect(7, 5, 2, 4); g.fillRect(7, 10, 2, 1); });
T.boost = tex(16, (g, s) => {
  g.fillStyle = '#4a2f08'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = (y - Math.abs(x - 7.5) * 0.9 + 32) % 8; // chevron pointing to canvas bottom (= +z on the pad)
    if (v < 3) px(g, x, y, v < 1.5 ? '#fff27a' : '#ffae1a');
  }
}, true);
T.boost.repeat.set(1, 2);
const SHROOM_PAL = ['#c8322b', '#f4f0e8', '#efe4c8', '#a82620', '#333333'];
const STEM = ['#efe4c8', '#e6d9b8', '#f5ecd6', '#ddd0ae'];
T.shroomStem = tex(8, (g, s) => palFill(g, s, STEM));
T.shroomFace = tex(8, (g, s) => { palFill(g, s, STEM); ['KK....KK', '.KK..KK.', '.KW..KW.', '.KK..KK.', '........', '..MMMM..', '.M....M.', '........'].forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') px(g, x, y, c === 'K' ? '#1a1a1a' : c === 'W' ? '#ffffff' : '#7a2a2a'); })); });
T.shroomCap = tex(16, (g, s) => { noiseFill(g, s, '#c8322b', 0.07); g.fillStyle = '#f4f0e8'; for (const [x, y] of [[2, 2], [9, 3], [5, 9], [12, 11], [1, 12], [13, 6]]) g.fillRect(x, y, 2, 2); });
function oreTex(c1, c2) { return tex(16, (g, s) => { palFill(g, s, ['#7f7f7f', '#878787', '#747474', '#8f8f8f']); for (const [x, y] of [[2, 3], [9, 2], [5, 8], [11, 10], [2, 12], [12, 5], [7, 13]]) { g.fillStyle = c2; g.fillRect(x, y + 1, 3, 2); g.fillStyle = c1; g.fillRect(x, y, 2, 2); } }); }
const ORES = {
  coal: { name: 'Coal', c1: '#262626', c2: '#4a4a4a', w: 0.35 },
  iron: { name: 'Iron', c1: '#e3b89a', c2: '#9c7660', w: 0.3 },
  gold: { name: 'Gold', c1: '#fcee4b', c2: '#c9a224', w: 0.25 },
  ruby: { name: 'Ruby', c1: '#ff3b5c', c2: '#a3122e', w: 0.1 },
};
for (const o of Object.values(ORES)) {
  o.tex = oreTex(o.c1, o.c2);
  o.icon = makeCanvas(16, g => { [[5, 4, 6, 8], [4, 6, 8, 5], [6, 3, 3, 2]].forEach(([x, y, w, h]) => { g.fillStyle = o.c2; g.fillRect(x, y + 1, w, h); g.fillStyle = o.c1; g.fillRect(x, y, w, h - 1); }); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(6, 5, 2, 1); }).toDataURL();
}
const ICONS = {
  arrow: makeCanvas(16, g => { for (let k = 0; k < 9; k++) { g.fillStyle = '#8a5a2b'; g.fillRect(3 + k, 12 - k, 1, 1); } g.fillStyle = '#ff3b5c'; g.fillRect(11, 2, 3, 3); g.fillRect(12, 4, 2, 1); g.fillStyle = '#eee'; g.fillRect(2, 12, 2, 2); g.fillRect(3, 11, 1, 1); }).toDataURL(),
  shield: makeCanvas(16, g => { g.fillStyle = '#5a5a5a'; g.fillRect(3, 2, 10, 9); g.fillRect(4, 11, 8, 2); g.fillRect(6, 13, 4, 1); g.fillStyle = '#c9ced4'; g.fillRect(4, 3, 8, 8); g.fillRect(5, 11, 6, 1); g.fillStyle = '#e3b89a'; g.fillRect(7, 4, 2, 7); }).toDataURL(),
  rush: makeCanvas(16, g => { g.fillStyle = '#c9a224'; g.fillRect(8, 1, 3, 6); g.fillRect(5, 6, 6, 2); g.fillRect(5, 8, 3, 6); g.fillStyle = '#fcee4b'; g.fillRect(9, 1, 2, 5); g.fillRect(6, 6, 4, 1); g.fillRect(6, 8, 2, 5); }).toDataURL(),
  charge: makeCanvas(16, g => { g.fillStyle = '#5a3d1e'; g.fillRect(2, 4, 12, 10); g.fillStyle = '#9a6a34'; g.fillRect(3, 5, 10, 8); for (let x = 3; x < 13; x++) { g.fillStyle = (x >> 1) % 2 ? '#1c1c1c' : '#f2c21b'; g.fillRect(x, 8, 1, 2); } g.fillStyle = '#ff7a1a'; g.fillRect(8, 1, 1, 3); g.fillStyle = '#fff2a0'; g.fillRect(8, 0, 1, 1); }).toDataURL(),
};
T.wheel = tex(8, (g) => { g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 8, 8); g.fillStyle = '#2c2c2c'; g.fillRect(0, 0, 8, 1); g.fillStyle = '#9a9a9a'; g.fillRect(2, 2, 4, 4); g.fillStyle = '#5a5a5a'; g.fillRect(3, 3, 2, 2); });
T.tire = tex(8, (g, s) => { palFill(g, s, ['#1b1b1b', '#222', '#161616']); for (let y = 0; y < 8; y += 2) { g.fillStyle = '#2e2e2e'; g.fillRect(0, y, 8, 1); } });
const gemCanvas = makeCanvas(16, (g, s) => {
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5) * 1.15;
    if (d < 7.2) { const edge = d > 6; const lit = (x + y) < 13; px(g, x, y, edge ? '#0b6b2a' : lit ? ((x + y) < 9 ? '#9dffc0' : '#41e07a') : '#17b04f'); }
  }
  px(g, 6, 4, '#ffffff'); px(g, 5, 5, '#ffffff');
});
T.gem = texFrom(gemCanvas);
document.getElementById('emIcon').src = gemCanvas.toDataURL();
function flowerTex(kind) {
  return tex(16, (g) => {
    g.clearRect(0, 0, 16, 16);
    if (kind === 'grass') { for (let x = 1; x < 15; x += 2) { const h = 5 + ((rand() * 9) | 0); for (let y = 16 - h; y < 16; y++) px(g, x + (y % 3 === 0 ? 1 : 0), y, GREENS[(rand() * 5) | 0]); } return; }
    for (let y = 8; y < 16; y++) px(g, 7, y, '#3f7f22'); px(g, 8, 11, '#4a8c28'); px(g, 9, 10, '#4a8c28'); px(g, 6, 12, '#4a8c28');
    const c = kind === 'poppy' ? ['#e0261b', '#a8140c', '#ff4b36'] : ['#ffe11f', '#e6b800', '#fff38a'];
    [[6, 5], [7, 5], [8, 5], [6, 6], [7, 6], [8, 6], [7, 4], [6, 7], [8, 7], [5, 6], [9, 6]].forEach(([x, y], i) => px(g, x, y, c[i % 3]));
    px(g, 7, 6, kind === 'poppy' ? '#1a1a1a' : '#b07800');
  });
}
T.tallGrass = flowerTex('grass'); T.poppy = flowerTex('poppy'); T.dandelion = flowerTex('dandelion');

// ---------- racers ----------
// Every racer is a 64x64 skin in the common block-character layout: head faces at y 0..16
// (hat overlay +32 px in x), body front at 20,20, arm at 44,20. Presets are drawn here;
// players paint or import their own, and those never leave the browser (localStorage).
const PRESETS = [
  { id: 'ace', name: 'Ace', kart: '#d63a33', shirt: '#2a2a2a', hair: '#d23a3a', skin: '#d9a27c', hairRows: 3,
    face: ['RRRRRRRR', 'RRWWWWRR', 'RRRRRRRR', 'DDDDDDDD', 'DGGDDGGD', 'SSSSSSSS', 'SSSMMSSS', 'SSSSSSSS'],
    pal: { R: '#d23a3a', W: '#f2f2f2', D: '#222222', G: '#8fd6ff', S: '#d9a27c', M: '#8a4a3a' } },
  { id: 'fern', name: 'Fern', kart: '#4fc25a', shirt: '#e8c040', hair: '#3f9e5a', skin: '#efc29c', hairRows: 2,
    face: ['GGGGGGGG', 'gGgGgGgG', 'RSSSSSSR', 'RSSSSSSR', 'SSKSSKSS', 'SFSSSSFS', 'SSSPPSSS', 'RSSSSSSR'],
    pal: { G: '#3f9e5a', g: '#2f7a45', R: '#c4502a', S: '#efc29c', K: '#1d1d1d', F: '#d08a66', P: '#c9605a' } },
  { id: 'bolt', name: 'Bolt', kart: '#3c7fe0', shirt: '#5b636b', hair: '#9aa3ad', skin: '#9aa3ad', hairRows: 8,
    face: ['MMMMMMMM', 'MLLLLLLM', 'MMMMMMMM', 'CCCCCCCC', 'CWCCCCWC', 'MMMMMMMM', 'MGMGMGMM', 'MMMMMMMM'],
    pal: { M: '#9aa3ad', L: '#c3cad1', C: '#2fd4e8', W: '#e8ffff', G: '#5b636b' } },
  { id: 'rusty', name: 'Rusty', kart: '#e08a2c', shirt: '#3d5a8a', hair: '#e2741f', skin: '#e2741f', hairRows: 8,
    face: ['OOOOOOOO', 'OOOOOOOO', 'OOOOOOOO', 'OKOOOOKO', 'OOWWWWOO', 'OWWWWWWO', 'OWWKKWWO', 'OOWWWWOO'],
    pal: { O: '#e2741f', W: '#f4ede0', K: '#1b1b1b' } },
];
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newSkin = () => { const c = document.createElement('canvas'); c.width = c.height = 64; return c; };
function noiseRect(g, x, y, w, h, amt = 0.07) { const d = g.getImageData(x, y, w, h); for (let k = 0; k < d.data.length; k += 4) { if (!d.data[k + 3]) continue; const f = 1 + (rand() - 0.5) * 2 * amt; d.data[k] *= f; d.data[k + 1] *= f; d.data[k + 2] *= f; } g.putImageData(d, x, y); }
function paintHead(g, hair, skin, hairRows) {
  g.clearRect(32, 0, 32, 16);
  g.fillStyle = hair; g.fillRect(8, 0, 8, 8); g.fillStyle = skin; g.fillRect(16, 0, 8, 8);
  for (const [x0, rows] of [[0, Math.min(8, hairRows + 1)], [16, Math.min(8, hairRows + 1)], [24, Math.max(6, hairRows)]]) { g.fillStyle = hair; g.fillRect(x0, 8, 8, rows); g.fillStyle = skin; g.fillRect(x0, 8 + rows, 8, 8 - rows); }
  noiseRect(g, 8, 0, 16, 8, 0.05); noiseRect(g, 0, 8, 8, 8, 0.05); noiseRect(g, 16, 8, 16, 8, 0.05);
}
function paintFace(g, rows, pal) { rows.forEach((r, y) => [...r].forEach((ch, x) => { g.fillStyle = pal[ch]; g.fillRect(8 + x, 8 + y, 1, 1); })); g.clearRect(40, 8, 8, 8); }
function paintShirt(g, shirt) { g.fillStyle = shirt; g.fillRect(16, 16, 40, 16); noiseRect(g, 16, 16, 40, 16, 0.07); }
function presetSkin(p) { const c = newSkin(), g = c.getContext('2d'); paintHead(g, p.hair, p.skin, p.hairRows); paintFace(g, p.face, p.pal); paintShirt(g, p.shirt); return c; }
// legacy skins often fill the hat layer with one solid color; the game ignores that, like most viewers do
function hatIsJunk(src, x, y, w, h) {
  const d = src.getContext('2d').getImageData(x, y, w, h).data;
  for (let k = 0; k < d.length; k += 4) if (d[k + 3] < 255 || d[k] !== d[0] || d[k + 1] !== d[1] || d[k + 2] !== d[2]) return false;
  return true;
}
function skinPart(src, x, y, w, h, hat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.drawImage(src, x, y, w, h, 0, 0, w, h);
  if (hat && !hatIsJunk(src, x + 32, y, w, h)) g.drawImage(src, x + 32, y, w, h, 0, 0, w, h);
  return c;
}
function makeRacer(skin, meta) {
  const P = (x, y) => skinPart(skin, x, y, 8, 8);
  const front = P(8, 8);
  const r = { ...meta, skin };
  // box face order: +x (racer's left), -x (racer's right), top, bottom, front (+z), back
  r.headMats = [P(16, 8), P(0, 8), P(8, 0), P(16, 0), front, P(24, 8)].map(cv => new THREE.MeshLambertMaterial({ map: texFrom(cv) }));
  const big = document.createElement('canvas'); big.width = big.height = 64; const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(front, 0, 0, 64, 64);
  r.faceURL = big.toDataURL();
  r.shirtTex = texFrom(skinPart(skin, 20, 20, 8, 12, false));
  r.armTex = texFrom(skinPart(skin, 44, 20, 4, 12, false));
  r.kartTex = tex(16, (g, s) => noiseFill(g, s, meta.kart, 0.08));
  r.kartDark = tex(16, (g, s) => { const [R, G, B] = hexRgb(meta.kart); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const f = 0.6 + (rand() - 0.5) * 0.1; px(g, x, y, rgb(R * f, G * f, B * f)); } });
  return r;
}
const STORE = 'craftkart.racers.v1', SEL_STORE = 'craftkart.selected';
const roster = PRESETS.map(p => makeRacer(presetSkin(p), { id: p.id, name: p.name, kart: p.kart, preset: true }));
let selectedId = 'ace';
try { selectedId = localStorage.getItem(SEL_STORE) || 'ace'; } catch {}
const racerById = id => roster.find(r => r.id === id) || roster[0];
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function imageToSkin(img) { if (img.width !== 64 || (img.height !== 64 && img.height !== 32)) return null; const c = newSkin(); c.getContext('2d').drawImage(img, 0, 0); return c; }
async function loadCustomRacers() {
  let list = []; try { list = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch {}
  for (const rec of list) { try { const skin = imageToSkin(await loadImage(rec.skin)); if (skin) roster.push(makeRacer(skin, { id: rec.id, name: rec.name, kart: rec.kart, custom: true })); } catch {} }
}
function saveCustomRacers() {
  try { localStorage.setItem(STORE, JSON.stringify(roster.filter(r => r.custom).map(r => ({ id: r.id, name: r.name, kart: r.kart, skin: r.skin.toDataURL() })))); return true; } catch { return false; }
}

// ---------- renderer / scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(isTouch ? 1 : Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
const SKY = 0x8ab4f8;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 140, 460);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 1200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8a5a, 1.55));
const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
sunLight.position.set(0.45, 1, 0.25);
scene.add(sunLight);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// =====================================================================
//  TRACK
// =====================================================================
const RAW = [[-10, 105], [40, 100], [110, 130], [170, 80], [160, -10], [100, -40], [60, -10], [10, -60], [-40, -130], [-120, -120], [-170, -60], [-150, 60], [-60, 110]];
const SCALE = 1.4;
const curve = new THREE.CatmullRomCurve3(RAW.map(([x, z]) => new THREE.Vector3(x * SCALE, 0, z * SCALE)), true, 'centripetal');
const TRACK_LEN = curve.getLength();
const N = Math.round(TRACK_LEN);
const SEG = TRACK_LEN / N;
const spaced = curve.getSpacedPoints(N); spaced.pop();
const PX = new Float32Array(N), PZ = new Float32Array(N), TXa = new Float32Array(N), TZa = new Float32Array(N), NX = new Float32Array(N), NZ = new Float32Array(N), CURV = new Float32Array(N);
for (let i = 0; i < N; i++) { PX[i] = spaced[i].x; PZ[i] = spaced[i].z; }
for (let i = 0; i < N; i++) {
  const a = (i - 2 + N) % N, b = (i + 2) % N; let tx = PX[b] - PX[a], tz = PZ[b] - PZ[a]; const l = Math.hypot(tx, tz); tx /= l; tz /= l;
  TXa[i] = tx; TZa[i] = tz; NX[i] = -tz; NZ[i] = tx;
}
for (let i = 0; i < N; i++) { const j = (i + 1) % N; CURV[i] = Math.abs(wrapAngle(Math.atan2(TXa[j], TZa[j]) - Math.atan2(TXa[i], TZa[i]))); }
const idxWrap = i => ((i % N) + N) % N;
const idxDiff = (a, b) => { let d = a - b; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; };

const B = 3;                 // block size
const ROAD_HW = 9, CURB = 11.6, WALL = 22.5, HEDGE_IN = 24, HEDGE_OUT = 27.2;

// spatial hash of track samples
const HB = 40; const hashMap = new Map();
const hkey = (cx, cz) => (cx + 500) * 2000 + (cz + 500);
for (let i = 0; i < N; i++) { const k = hkey(Math.floor(PX[i] / HB), Math.floor(PZ[i] / HB)); if (!hashMap.has(k)) hashMap.set(k, []); hashMap.get(k).push(i); }
function nearestGlobal(x, z) {
  const cx = Math.floor(x / HB), cz = Math.floor(z / HB); let best = 1e12, bi = 0;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const arr = hashMap.get(hkey(cx + dx, cz + dz)); if (!arr) continue; for (const i of arr) { const d = (PX[i] - x) ** 2 + (PZ[i] - z) ** 2; if (d < best) { best = d; bi = i; } } }
  return best > 1e11 ? { d: 999, i: 0 } : { d: Math.sqrt(best), i: bi };
}
function nearestLocal(x, z, idx, win = 30) {
  let best = 1e12, bi = idx;
  for (let k = -win; k <= win; k++) { const i = idxWrap(idx + k); const d = (PX[i] - x) ** 2 + (PZ[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
  return bi;
}
const latOf = (x, z, i) => (x - PX[i]) * NX[i] + (z - PZ[i]) * NZ[i];

// =====================================================================
//  WORLD GEN
// =====================================================================
const GX = 200, GZ = 170, X0 = -GX * B / 2, Z0 = -GZ * B / 2;
const cellX = i => X0 + (i + 0.5) * B, cellZ = j => Z0 + (j + 0.5) * B;
const LAKE = { x: -84, z: 14, r: 52 };
const blockLists = { grass: [], dirt: [], road: [], curbR: [], curbW: [], checker: [], hedge: [], sand: [], water: [], log: [], leaves: [], stone: [] };
const occupied = new Set();
const TYPE_NAMES = Object.keys(blockLists), blockMeshes = {};
const cellDepth = new Float32Array(200 * 170), flushType = new Int8Array(200 * 170).fill(-1), flushIdx = new Int32Array(200 * 170), hedgeIdx = new Int32Array(200 * 170).fill(-1);
const cratered = new Set();
const ok = (i, j, k) => i + ',' + j + ',' + k;
function addBlock(type, i, j, k, flush = false) {
  const key = ok(i, j, k); if (occupied.has(key)) return; occupied.add(key);
  const idx = blockLists[type].length / 3, id = j * GX + i;
  if (flush) { flushType[id] = TYPE_NAMES.indexOf(type); flushIdx[id] = idx; }
  if (type === 'hedge') hedgeIdx[id] = idx;
  blockLists[type].push(cellX(i), flush ? -B / 2 + (type === 'water' ? 0.05 : 0.03) : k * B + B / 2, cellZ(j));
}
const heights = new Int8Array(GX * GZ);
const cellType = new Uint8Array(GX * GZ); // 0 grass,1 road,2 curb,3 hedge,4 water,5 sand,6 hill
const cellInfo = new Float32Array(GX * GZ);
function buildWorld() {
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
    const x = cellX(i), z = cellZ(j), id = j * GX + i;
    const { d, i: ti } = nearestGlobal(x, z);
    cellInfo[id] = d;
    if (d < ROAD_HW) { cellType[id] = 1; const s = ti; if (s < 3 || s > N - 3) addBlock('checker', i, j, 0, true); else addBlock('road', i, j, 0, true); continue; }
    if (d < CURB) { cellType[id] = 2; addBlock(Math.floor(ti * SEG / (B * 1.5)) % 2 ? 'curbR' : 'curbW', i, j, 0, true); continue; }
    if (d < HEDGE_IN) { addBlock('grass', i, j, -1, true); continue; }
    if (d < HEDGE_OUT) { cellType[id] = 3; heights[id] = 1; addBlock('hedge', i, j, 0); addBlock('grass', i, j, -1, true); continue; }
    const ld = Math.hypot(x - LAKE.x, z - LAKE.z) - (fbm(x * 0.03, z * 0.03) - 0.5) * 30;
    if (ld < LAKE.r && d > 34) { cellType[id] = 4; addBlock('water', i, j, 0, true); continue; }
    if (ld < LAKE.r + 7 && d > 30) { cellType[id] = 5; addBlock('sand', i, j, 0, true); continue; }
    const n = fbm(x * 0.017 + 40, z * 0.017 - 13);
    const edge = smoothstep(32, 75, d) * smoothstep(LAKE.r + 7, LAKE.r + 30, ld);
    let h = clamp((n - 0.43) * 17, 0, 7) * edge;
    const border = Math.max(Math.abs(x) - 250, Math.abs(z) - 200) / 35;
    h += clamp(border, 0, 1) * 7;
    h = Math.floor(h);
    if (h > 0) { cellType[id] = 6; heights[id] = h; } else addBlock('grass', i, j, -1, true);
  }
  // hills: only exposed blocks
  const H = (i, j) => (i < 0 || j < 0 || i >= GX || j >= GZ) ? 0 : heights[j * GX + i];
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
    const id = j * GX + i; if (cellType[id] !== 6) continue; const h = heights[id];
    const mn = Math.min(H(i - 1, j), H(i + 1, j), H(i, j - 1), H(i, j + 1));
    for (let k = Math.max(0, mn - 0); k < h; k++) {
      if (k === h - 1) addBlock('grass', i, j, k);
      else addBlock(k < h - 4 ? 'stone' : 'dirt', i, j, k);
    }
  }
  // trees
  const trees = [];
  for (let a = 0; a < 2400 && trees.length < 120; a++) {
    const i = 3 + ((rand() * (GX - 6)) | 0), j = 3 + ((rand() * (GZ - 6)) | 0), id = j * GX + i;
    const d = cellInfo[id]; if (d < 32 || d > 170) continue;
    if (cellType[id] === 4 || cellType[id] === 5) continue;
    if (trees.some(t => Math.abs(t[0] - i) < 5 && Math.abs(t[1] - j) < 5)) continue;
    const base = heights[id]; trees.push([i, j]);
    const th = 4 + ((rand() * 2) | 0);
    for (let k = 0; k < th; k++) addBlock('log', i, j, base + k);
    for (let k = th - 2; k < th + 2; k++) {
      const r = k < th ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && (k === th + 1 || rand() < 0.5)) continue;
        if (k === th + 1 && Math.abs(dx) + Math.abs(dz) > 1) continue;
        addBlock('leaves', i + dx, j + dz, base + k);
      }
    }
  }
  // instanced meshes
  const geo = new THREE.BoxGeometry(B, B, B);
  const M = (t, extra = {}) => new THREE.MeshLambertMaterial({ map: t, ...extra });
  const mats = {
    grass: [M(T.grassSide), M(T.grassSide), M(T.grassTop), M(T.dirt), M(T.grassSide), M(T.grassSide)],
    dirt: M(T.dirt), stone: M(T.stone), road: M(T.road), curbR: M(T.woolRed), curbW: M(T.woolWhite), checker: M(T.checker),
    hedge: M(T.leaves), leaves: M(T.leaves), sand: M(T.sand),
    water: new THREE.MeshLambertMaterial({ map: T.water }),
    log: [M(T.logSide), M(T.logSide), M(T.logTop), M(T.logTop), M(T.logSide), M(T.logSide)],
  };
  const m4 = new THREE.Matrix4();
  for (const [type, arr] of Object.entries(blockLists)) {
    const n = arr.length / 3; if (!n) continue;
    const mesh = new THREE.InstancedMesh(geo, mats[type], n); blockMeshes[type] = mesh;
    const white = new THREE.Color(1, 1, 1);
    for (let k = 0; k < n; k++) { m4.makeTranslation(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]); mesh.setMatrixAt(k, m4); mesh.setColorAt(k, white); }
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  // ground outside the block grid: four tiled grass strips around it (the grid itself is real blocks)
  const W = 1500, gx = -X0, gz = -Z0;
  for (const [x0, z0, x1, z1] of [[-W, gz, W, W], [-W, -W, W, -gz], [gx, -gz, W, gz], [-W, -gz, -gx, gz]]) {
    const w = x1 - x0, d = z1 - z0; const t = T.grassTop.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / B, d / B);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); scene.add(m);
  }
  // torches along both edges of the track
  const torchPos = [];
  for (let i = 0; i < N; i += Math.round(34 / SEG)) for (const sd of [-1, 1]) torchPos.push([PX[i] + NX[i] * sd * (WALL + 0.8), PZ[i] + NZ[i] * sd * (WALL + 0.8)]);
  const stick = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 2.2, 0.35), new THREE.MeshLambertMaterial({ map: T.logSide }), torchPos.length);
  const flame = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffc23a }), torchPos.length);
  torchPos.forEach(([x, z], k) => { m4.makeTranslation(x, 1.1, z); stick.setMatrixAt(k, m4); m4.makeTranslation(x, 2.35, z); flame.setMatrixAt(k, m4); });
  scene.add(stick, flame); torchFlames = { mesh: flame, pos: torchPos };

  // flowers & grass tufts
  const fGeo = new THREE.PlaneGeometry(1.6, 1.6); fGeo.translate(0, 0.8, 0);
  const flowerSets = [[T.tallGrass, 900], [T.poppy, 160], [T.dandelion, 160]];
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  for (const [t, count] of flowerSets) {
    const mesh = new THREE.InstancedMesh(fGeo, new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }), count * 2);
    let n = 0;
    for (let a = 0; a < count * 6 && n < count * 2; a++) {
      const i = (rand() * GX) | 0, j = (rand() * GZ) | 0, id = j * GX + i; const ty = cellType[id];
      if (ty !== 0 && ty !== 6) continue; const d = cellInfo[id]; if (d < CURB + 1 || d > 120) continue;
      const y = heights[id] * B; const x = cellX(i) + (rand() - 0.5) * 2, z = cellZ(j) + (rand() - 0.5) * 2; const s = 0.8 + rand() * 0.6;
      sc.set(s, s, s);
      for (const r of [Math.PI / 4, -Math.PI / 4]) { q.setFromAxisAngle(up, r); pos.set(x, y, z); m4.compose(pos, q, sc); mesh.setMatrixAt(n++, m4); }
    }
    mesh.count = n; mesh.computeBoundingSphere(); scene.add(mesh);
  }
}

let torchFlames = null;
const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
// ---------- craters: explosions push the surface blocks down (stepped, like a real dig) ----------
const cellOf = (x, z) => { const i = Math.floor((x - X0) / B), j = Math.floor((z - Z0) / B); return (i < 0 || j < 0 || i >= GX || j >= GZ) ? -1 : j * GX + i; };
const groundAt = (x, z) => { const id = cellOf(x, z); return id < 0 ? 0 : -cellDepth[id]; };
const m4c = new THREE.Matrix4(), scorch = new THREE.Color();
function setFlush(id) {
  const ty = flushType[id]; if (ty < 0) return; const mesh = blockMeshes[TYPE_NAMES[ty]];
  const i = id % GX, j = (id / GX) | 0; m4c.makeTranslation(cellX(i), -B / 2 + 0.03 - cellDepth[id], cellZ(j)); mesh.setMatrixAt(flushIdx[id], m4c); mesh.instanceMatrix.needsUpdate = true;
  const sc = cellDepth[id] ? 0.62 - cellDepth[id] * 0.12 : 1; mesh.setColorAt(flushIdx[id], scorch.setRGB(sc, sc * 0.9, sc * 0.8)); mesh.instanceColor.needsUpdate = true;
}
function carve(x, z, r = 7) {
  const ci = Math.floor((x - X0) / B), cj = Math.floor((z - Z0) / B), rc = Math.ceil(r / B);
  for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
    const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= GX || j >= GZ) continue;
    const id = j * GX + i; if (flushType[id] < 0 || cellType[id] === 4) continue;
    const d = Math.hypot(cellX(i) - x, cellZ(j) - z) / r; if (d >= 1) continue;
    const depth = Math.round((1 - d) * 1.9 / 0.5) * 0.5; if (depth <= cellDepth[id]) continue;
    cellDepth[id] = depth; cratered.add(id); setFlush(id);
    if (hedgeIdx[id] >= 0) { const hm = blockMeshes.hedge; hm.setMatrixAt(hedgeIdx[id], zeroMat); hm.instanceMatrix.needsUpdate = true; for (let k = 0; k < 6; k++) emit(cellX(i), 1.5, cellZ(j), (Math.random() - 0.5) * 10, 4 + Math.random() * 8, (Math.random() - 0.5) * 10, 1, 0.5, '#3b7a1e', 24, 0.8); }
  }
}
function repairWorld() {
  for (const id of cratered) {
    cellDepth[id] = 0; setFlush(id);
    if (hedgeIdx[id] >= 0) { m4c.makeTranslation(cellX(id % GX), B / 2, cellZ((id / GX) | 0)); blockMeshes.hedge.setMatrixAt(hedgeIdx[id], m4c); blockMeshes.hedge.instanceMatrix.needsUpdate = true; }
  }
  cratered.clear();
}

// ---------- sky: square sun + blocky clouds ----------
const sun = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ color: 0xfffbd0, fog: false }));
scene.add(sun);
const sunDir = new THREE.Vector3(0.45, 0.55, 0.25).normalize();
const clouds = [];
{
  const cMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x777777, transparent: true, opacity: 0.88, fog: false });
  for (let i = 0; i < 34; i++) {
    const g = new THREE.Group();
    const w = 4 + ((rand() * 6) | 0), d = 3 + ((rand() * 4) | 0);
    for (let k = 0; k < 3; k++) { const bw = (w - k) * 8 * (0.6 + rand() * 0.5), bd = (d - k * 0.5) * 8 * (0.6 + rand() * 0.5); const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 6, bd), cMat); m.position.set((rand() - 0.5) * 20, 0, (rand() - 0.5) * 20); g.add(m); }
    g.position.set((rand() - 0.5) * 1100, 110 + rand() * 20, (rand() - 0.5) * 900);
    scene.add(g); clouds.push(g);
  }
}

// =====================================================================
//  PARTICLES
// =====================================================================
const PMAX = 1200;
const pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
const parts = []; const tmpC = new THREE.Color(); const m4p = new THREE.Matrix4(); const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
for (let i = 0; i < PMAX; i++) { parts.push({ life: 0 }); pMesh.setMatrixAt(i, zeroM); pMesh.setColorAt(i, tmpC.set(0xffffff)); }
let pNext = 0;
function emit(x, y, z, vx, vy, vz, life, size, color, grav = 0, drag = 0, floor = true) {
  const i = pNext; pNext = (pNext + 1) % PMAX; const p = parts[i];
  p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.size = size; p.grav = grav; p.drag = drag; p.floor = floor;
  pMesh.setColorAt(i, tmpC.set(color)); pMesh.instanceColor.needsUpdate = true;
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    const p = parts[i]; if (p.life <= 0) continue;
    p.life -= dt; if (p.life <= 0) { pMesh.setMatrixAt(i, zeroM); continue; }
    p.vy -= p.grav * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor && p.y < p.size / 2) { p.y = p.size / 2; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
    const s = p.size * Math.min(1, p.life / p.max * 2.5);
    m4p.makeScale(s, s, s).setPosition(p.x, p.y, p.z); pMesh.setMatrixAt(i, m4p);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}

// =====================================================================
//  AUDIO (all synthesized)
// =====================================================================
const Audio = {
  ctx: null, master: null, on: true,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(ctx.destination);
    // engine
    this.eGain = ctx.createGain(); this.eGain.gain.value = 0;
    this.eFilter = ctx.createBiquadFilter(); this.eFilter.type = 'lowpass'; this.eFilter.frequency.value = 900;
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = ctx.createOscillator(); this.o2.type = 'square';
    this.o1.connect(this.eFilter); this.o2.connect(this.eFilter); this.eFilter.connect(this.eGain); this.eGain.connect(this.master);
    this.o1.start(); this.o2.start();
    // noise buffer
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // drift screech loop
    this.dSrc = ctx.createBufferSource(); this.dSrc.buffer = this.noise; this.dSrc.loop = true;
    this.dFilter = ctx.createBiquadFilter(); this.dFilter.type = 'bandpass'; this.dFilter.frequency.value = 2400; this.dFilter.Q.value = 6;
    this.dGain = ctx.createGain(); this.dGain.gain.value = 0;
    this.dSrc.connect(this.dFilter); this.dFilter.connect(this.dGain); this.dGain.connect(this.master); this.dSrc.start();
    this.musicT = ctx.currentTime + 1;
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.8 : 0; },
  engine(speed, boost, active) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const f = 42 + Math.abs(speed) * 2.6 + (boost ? 40 : 0);
    this.o1.frequency.setTargetAtTime(f, t, 0.05); this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.eFilter.frequency.setTargetAtTime(500 + Math.abs(speed) * 22 + (boost ? 900 : 0), t, 0.05);
    this.eGain.gain.setTargetAtTime(active ? 0.05 + Math.min(Math.abs(speed), 80) * 0.0008 : 0, t, 0.1);
  },
  drift(level) { if (!this.ctx) return; this.dGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05); },
  tone(freq, dur, type = 'square', vol = 0.15, slideTo = null, delay = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noiseHit(dur, freq, vol = 0.5, type = 'lowpass', sweepTo = null) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  crunch() { this.noiseHit(0.18, 1500, 0.4, 'bandpass'); this.tone(160, 0.08, 'square', 0.12, 80); },
  pling() { this.tone(1568, 0.12, 'sine', 0.18); this.tone(2093, 0.25, 'sine', 0.16, null, 0.07); },
  boom(vol = 1) { this.noiseHit(1.3, 1400, 0.9 * vol, 'lowpass', 60); this.tone(90, 0.6, 'sine', 0.5 * vol, 30); },
  boing() { this.tone(180, 0.35, 'sine', 0.3, 720); this.tone(240, 0.3, 'triangle', 0.12, 900); },
  whoosh() { this.noiseHit(0.6, 400, 0.35, 'bandpass', 4000); },
  bump(v = 0.4) { this.tone(110, 0.15, 'square', v * 0.5, 50); this.noiseHit(0.12, 800, v * 0.5); },
  hiss() { this.noiseHit(0.9, 5000, 0.12, 'highpass'); },
  beep(hi) { this.tone(hi ? 1046 : 523, hi ? 0.5 : 0.22, 'square', 0.14); },
  // gentle C418-ish piano doodles
  music() {
    if (!this.ctx || !this.on) return; const ctx = this.ctx; if (ctx.currentTime < this.musicT) return;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19]; const root = 261.63;
    const n = scale[(Math.random() * scale.length) | 0]; const f = root * Math.pow(2, n / 12) * (Math.random() < 0.3 ? 0.5 : 1);
    const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2; const g2 = ctx.createGain(); g2.gain.value = 0.25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.master); o.start(t); o2.start(t); o.stop(t + 2.7); o2.stop(t + 2.7);
    if (Math.random() < 0.25) this.tone(root / 2 * Math.pow(2, scale[(Math.random() * 4) | 0] / 12), 3, 'sine', 0.05);
    this.musicT = t + 0.45 + Math.random() * 1.3;
  },
};

// =====================================================================
//  KART MODEL
// =====================================================================
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
const exhaustMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
const shadowTex = tex(8, g => { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(1, 0, 6, 8); g.fillRect(0, 1, 8, 6); });
function nameTag(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48; const g = c.getContext('2d');
  g.font = '22px "Press Start 2P", monospace'; const w = Math.min(250, g.measureText(text).width + 20);
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect((256 - w) / 2, 4, w, 40); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true })); s.scale.set(4.2, 0.8, 1); return s;
}
function buildKart(ch, tag) {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const km = new THREE.MeshLambertMaterial({ map: ch.kartTex }), kd = new THREE.MeshLambertMaterial({ map: ch.kartDark });
  body.add(box(2.6, 0.7, 4.4, km, 0, 0.75, 0));
  body.add(box(2.2, 0.5, 1.1, km, 0, 0.62, 2.55));
  body.add(box(2.9, 0.35, 1.0, kd, 0, 0.5, 2.7));       // front bumper
  body.add(box(1.5, 0.5, 1.2, kd, 0, 1.25, 1.3));       // dash
  body.add(box(1.6, 1.0, 0.45, darkMat, 0, 1.55, -1.05)); // seat back
  body.add(box(3.2, 0.22, 0.75, kd, 0, 2.05, -2.05));   // spoiler
  body.add(box(0.2, 0.7, 0.2, darkMat, -0.9, 1.6, -2.0)); body.add(box(0.2, 0.7, 0.2, darkMat, 0.9, 1.6, -2.0));
  body.add(box(0.4, 0.25, 0.1, lightMat, -0.75, 0.8, 3.13)); body.add(box(0.4, 0.25, 0.1, lightMat, 0.75, 0.8, 3.13));
  body.add(box(0.3, 0.3, 0.5, exhaustMat, -0.6, 0.8, -2.35)); body.add(box(0.3, 0.3, 0.5, exhaustMat, 0.6, 0.8, -2.35));
  // driver
  const shirt = new THREE.MeshLambertMaterial({ map: ch.shirtTex }), arm = new THREE.MeshLambertMaterial({ map: ch.armTex });
  body.add(box(1.2, 0.75, 0.62, shirt, 0, 1.45, -0.45));
  const armL = box(0.38, 0.38, 1.1, arm, -0.72, 1.55, 0.2), armR = box(0.38, 0.38, 1.1, arm, 0.72, 1.55, 0.2); body.add(armL, armR);
  const head = box(1.1, 1.1, 1.1, ch.headMats, 0, 2.38, -0.4); body.add(head);
  body.add(box(0.9, 0.12, 0.12, darkMat, 0, 1.6, 0.85)); // steering wheel
  // wheels
  const wm = [new THREE.MeshLambertMaterial({ map: T.wheel }), new THREE.MeshLambertMaterial({ map: T.wheel }), new THREE.MeshLambertMaterial({ map: T.tire }), new THREE.MeshLambertMaterial({ map: T.tire }), new THREE.MeshLambertMaterial({ map: T.tire }), new THREE.MeshLambertMaterial({ map: T.tire })];
  const wheels = [], fronts = [];
  for (const [x, z, f] of [[-1.45, 1.55, 1], [1.45, 1.55, 1], [-1.5, -1.5, 0], [1.5, -1.5, 0]]) {
    const piv = new THREE.Group(); piv.position.set(x, 0.55, z); const w = box(f ? 0.6 : 0.8, 1.1, 1.1, wm); piv.add(w); g.add(piv);
    wheels.push(w); if (f) fronts.push(piv);
  }
  if (tag) { const t = nameTag(ch.name); t.position.y = 3.6; g.add(t); }
  const shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 6.6), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.28, depthWrite: false }));
  shieldMesh.position.y = 1.5; shieldMesh.visible = false; g.add(shieldMesh);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  return { group: g, body, wheels, fronts, head, shadow, shieldMesh };
}

// =====================================================================
//  BOOMSHROOM MODEL
// =====================================================================
const PXL = 1.1 / 8;
function buildShroom() {
  const stem = new THREE.MeshLambertMaterial({ map: T.shroomStem, emissive: 0x000000 });
  const face = new THREE.MeshLambertMaterial({ map: T.shroomFace, emissive: 0x000000 });
  const cap = new THREE.MeshLambertMaterial({ map: T.shroomCap, emissive: 0x000000 });
  const g = new THREE.Group();
  g.add(box(7 * PXL, 9 * PXL, 7 * PXL, [stem, stem, stem, stem, face, stem], 0, 8.5 * PXL, 0));
  const head = new THREE.Group(); head.position.y = 13 * PXL;
  head.add(box(16 * PXL, 5 * PXL, 16 * PXL, cap, 0, 2.5 * PXL, 0), box(11 * PXL, 3 * PXL, 11 * PXL, cap, 0, 6.5 * PXL, 0));
  g.add(head);
  const legs = [];
  for (const [x, z] of [[-2, 2], [2, 2], [-2, -2], [2, -2]]) { const piv = new THREE.Group(); piv.position.set(x * PXL, 4 * PXL, z * PXL); piv.add(box(3 * PXL, 4 * PXL, 3 * PXL, stem, 0, -2 * PXL, 0)); g.add(piv); legs.push(piv); }
  return { group: g, legs, head, mats: [stem, face, cap] };
}

// =====================================================================
//  START ARCH
// =====================================================================
function buildArch() {
  const g = new THREE.Group();
  const logMat = [T.logSide, T.logSide, T.logTop, T.logTop, T.logSide, T.logSide].map(t => new THREE.MeshLambertMaterial({ map: t }));
  const plank = new THREE.MeshLambertMaterial({ map: T.planks });
  const span = CURB + 2;
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) g.add(box(B, B, B, logMat, s * span, k * B + B / 2, 0));
  for (let x = -span; x <= span + 0.01; x += B) g.add(box(B, B, B, plank, x, 4 * B + B / 2, 0));
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const cg = c.getContext('2d');
  cg.fillStyle = '#1e1e1e'; cg.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 32; i++) { cg.fillStyle = i % 2 ? '#eee' : '#1e1e1e'; cg.fillRect(i * 16, 0, 16, 8); cg.fillStyle = i % 2 ? '#1e1e1e' : '#eee'; cg.fillRect(i * 16, 56, 16, 8); }
  cg.font = '28px "Press Start 2P", monospace'; cg.fillStyle = '#ffde3a'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText('START / FINISH', 256, 33);
  const bt = new THREE.CanvasTexture(c); bt.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(span * 2 - B, 3.4), new THREE.MeshBasicMaterial({ map: bt }));
  banner.position.set(0, 3 * B + 0.2, -B / 2 - 0.05); banner.rotation.y = Math.PI; g.add(banner);
  const banner2 = banner.clone(); banner2.position.z = B / 2 + 0.05; banner2.rotation.y = 0; g.add(banner2);
  g.position.set(PX[0], 0, PZ[0]); g.rotation.y = Math.atan2(TXa[0], TZa[0]);
  scene.add(g);
}

// =====================================================================
//  TRACK OBJECTS
// =====================================================================
function straightestNear(frac, range = 0.05) {
  let best = 1e9, bi = 0; const c = Math.round(frac * N), r = Math.round(range * N);
  for (let k = -r; k <= r; k++) { const i = idxWrap(c + k); let s = 0; for (let q = -25; q <= 45; q++) s += CURV[idxWrap(i + q)]; if (s < best) { best = s; bi = i; } }
  return bi;
}
const pads = [], gems = [], crates = [], shrooms = [], ores = [], arrows = [];
function pickOre() { let r = rand(); for (const [k, o] of Object.entries(ORES)) { r -= o.w; if (r <= 0) return k; } return 'coal'; }
const oreMats = {};
let shroomBuilt = false;
function placeObjects() {
  const boostMat = new THREE.MeshBasicMaterial({ map: T.boost });
  const bounceMat = new THREE.MeshLambertMaterial({ map: T.bounce, transparent: true, opacity: 0.9, emissive: 0x0e3a44 });
  let pid = 0;
  const addPad = (i, lat, type) => {
    const p = { id: pid++, i, lat, type, halfL: type === 'boost' ? 3 : 2.4, halfW: type === 'boost' ? 3.2 : 4.2 };
    const x = PX[i] + NX[i] * lat, z = PZ[i] + NZ[i] * lat;
    const m = type === 'boost' ? box(p.halfW * 2, 0.1, p.halfL * 2, boostMat) : box(p.halfW * 2, 0.9, p.halfL * 2, bounceMat);
    m.position.set(x, type === 'boost' ? 0.08 : 0.3, z); m.rotation.y = Math.atan2(TXa[i], TZa[i]); scene.add(m); p.mesh = m; pads.push(p);
  };
  addPad(straightestNear(0.1), 0, 'boost');
  addPad(straightestNear(0.34), -4, 'boost'); addPad(idxWrap(straightestNear(0.34) + 2), 4.5, 'boost');
  addPad(straightestNear(0.6), 3, 'boost');
  addPad(straightestNear(0.86), -3, 'boost');
  const bounceIdx = [straightestNear(0.22, 0.04), straightestNear(0.73, 0.05)];
  const emGeo = new THREE.PlaneGeometry(1.7, 1.7);
  const emMat = new THREE.MeshBasicMaterial({ map: T.gem, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const addEm = (x, y, z) => { const m = new THREE.Mesh(emGeo, emMat); m.position.set(x, y, z); scene.add(m); gems.push({ x, y, z, active: true, t: 0, mesh: m, phase: rand() * 6 }); };
  for (const si of bounceIdx) {
    addPad(si, 0, 'bounce');
    // gem arc along the jump
    for (let t = 0.25; t <= 1.2; t += 0.19) { const i = idxWrap(si + Math.round(50 * t / SEG)); const y = 1.4 + 21 * t - 20 * t * t; addEm(PX[i], Math.max(1.4, y), PZ[i]); }
  }
  // gem rows
  for (const [f, lat] of [[0.05, 5], [0.16, -5], [0.29, 0], [0.42, 6], [0.5, -6], [0.57, 0], [0.66, 5], [0.8, -5], [0.93, 0]]) {
    const c = Math.round(f * N); for (let k = 0; k < 4; k++) { const i = idxWrap(c + k * 5); addEm(PX[i] + NX[i] * lat, 1.4, PZ[i] + NZ[i] * lat); }
  }
  // TNT
  const crateMat = [T.crateSide, T.crateSide, T.crateTop, T.crateTop, T.crateSide, T.crateSide].map(t => new THREE.MeshLambertMaterial({ map: t }));
  for (const [f, lat] of [[0.19, -4.5], [0.45, 3], [0.53, -2], [0.69, 4.5], [0.89, -1], [0.97, 5]]) {
    const i = Math.round(f * N); const x = PX[i] + NX[i] * lat, z = PZ[i] + NZ[i] * lat;
    const m = box(2.6, 2.6, 2.6, crateMat, x, 1.3, z); m.rotation.y = Math.atan2(TXa[i], TZa[i]); scene.add(m);
    crates.push({ id: 100 + crates.length, i, lat, x, z, active: true, t: 0, mesh: m });
  }
}
function placeOres() {
  for (const k of Object.keys(ORES)) oreMats[k] = new THREE.MeshLambertMaterial({ map: ORES[k].tex });
  for (const f of [0.06, 0.29, 0.41, 0.64, 0.81]) {
    const i = Math.round(f * N);
    for (const lat of [-6.5, -2.2, 2.2, 6.5]) {
      const x = PX[i] + NX[i] * lat, z = PZ[i] + NZ[i] * lat, type = pickOre();
      const m = box(2.4, 2.4, 2.4, oreMats[type], x, 1.3, z); m.rotation.y = Math.atan2(TXa[i], TZa[i]); scene.add(m);
      ores.push({ i, lat, x, z, type, active: true, t: 0, mesh: m, phase: rand() * 6 });
    }
  }
}
function buildShrooms() {
  for (const f of [0.08, 0.26, 0.4, 0.48, 0.63, 0.77, 0.9]) {
    const c = buildShroom(); const i = Math.round(f * N); scene.add(c.group);
    shrooms.push({ id: 200 + shrooms.length, ...c, i, lat: 0, phase: rand() * 6.28, speed: 0.28 + rand() * 0.2, active: true, t: 0, fuse: 0, x: 0, z: 0, walk: 0 });
  }
  shroomBuilt = true;
}

// =====================================================================
//  CARS
// =====================================================================
const cars = [];
let player = null;
const DIFF = [
  // skill: top speed vs player; corner: how much AI brakes for curves; turbo: chance of a corner-exit turbo;
  // rb/rbNeg: rubber band when behind/ahead of the player; fuse: boomshroom fuse seconds
  { name: 'Peaceful', skill: 0.8, shrooms: false, aware: 0.9, corner: 0.27, turbo: 0, rb: 0.04, rbNeg: 0.1, fuse: 1.6 },
  { name: 'Easy', skill: 0.87, shrooms: true, aware: 0.6, corner: 0.25, turbo: 0.15, rb: 0.05, rbNeg: 0.08, fuse: 1.6 },
  { name: 'Normal', skill: 0.98, shrooms: true, aware: 0.7, corner: 0.22, turbo: 0.45, rb: 0.07, rbNeg: 0.05, fuse: 1.4 },
  { name: 'Hard', skill: 1.1, shrooms: true, aware: 0.85, corner: 0.15, turbo: 0.85, rb: 0.1, rbNeg: 0.02, fuse: 1.2 },
  { name: 'Hardcore', skill: 1.17, shrooms: true, aware: 0.95, corner: 0.12, turbo: 1, rb: 0.14, rbNeg: 0, fuse: 0.9 },
];
let diffIdx = 2, laps = 3;
class Car {
  constructor(ch, isPlayer, slot) {
    this.ch = ch; this.isPlayer = isPlayer; this.id = slot;
    this.model = buildKart(ch, !isPlayer); scene.add(this.model.group); scene.add(this.model.shadow);
    this.baseMax = 56;
    this.reset(slot);
  }
  reset(slot) {
    const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;
    const i = idxWrap(-10 - row * 11 - (slot % 2) * 4);
    this.idx = i; this.prevIdx = i; this.lap = 0;
    this.x = PX[i] + NX[i] * side * 4.2; this.z = PZ[i] + NZ[i] * side * 4.2; this.y = 0; this.vy = 0;
    this.h = Math.atan2(TXa[i], TZa[i]); this.vx = 0; this.vz = 0; this.vF = 0;
    this.boost = 0; this.drifting = false; this.driftDir = 0; this.charge = 0; this.stun = 0; this.spin = 0;
    this.gems = 0; this.air = 0; this.lapStart = 0; this.lapTimes = []; this.finished = false; this.finishTime = 0;
    this.lane = side * 4; this.laneT = side * 4; this.laneTimer = 2 + rand() * 2; this.lat = 0; this.offroad = false;
    this.wrongT = 0; this.rocket = 0; this.steerVis = 0; this.landT = 0;
    this.skill = 1; this.decide = new Map(); this.inv = []; this.shield = 0; this.craftT = 2; this.rb = 1;
    if (this.model.shieldMesh) this.model.shieldMesh.visible = false;
  }
}

// =====================================================================
//  GAME STATE
// =====================================================================
const G = { state: 'loading', raceTime: 0, cd: 0, cdLast: 0, firstThrottle: null, shake: 0, pausedFrom: null, resultsShown: false, menuT: 0, finishOrder: [] };
const keys = {};
const touchState = { left: false, right: false, brake: false, drift: false };
addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  if (G.state === 'editor' && e.code === 'Escape') { closeEditor(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && G.state !== 'menu' && G.state !== 'editor') e.preventDefault();
  keys[e.code] = true;
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) togglePause();
  if (e.code === 'KeyM' && !e.repeat) setSound(!Audio.on);
  if ((e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'Enter') && !e.repeat && G.state === 'race') G.craftPressed = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { for (const k in keys) keys[k] = false; if (G.state === 'race' || G.state === 'countdown') togglePause(); } });
function readInput() {
  const left = keys.KeyA || keys.ArrowLeft || touchState.left, right = keys.KeyD || keys.ArrowRight || touchState.right;
  const brake = keys.KeyS || keys.ArrowDown || touchState.brake;
  return {
    throttle: !!(keys.KeyW || keys.ArrowUp || (isTouch && !brake)),
    brake: !!brake,
    steer: (left ? 1 : 0) - (right ? 1 : 0),
    drift: !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || touchState.drift),
  };
}

// ---------- HUD helpers ----------
const $ = id => document.getElementById(id);
let titleTimer = 0;
function title(main, sub = '', color = '#fff', dur = 1.6) { $('tMain').textContent = main; $('tMain').style.color = color; $('tSub').textContent = sub; $('title').style.opacity = 1; titleTimer = dur; }
function toast(text, color = '#fff') { const d = document.createElement('div'); d.textContent = text; d.style.color = color; $('toast').appendChild(d); setTimeout(() => d.remove(), 2300); }
function flash(alpha = 0.35) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = alpha; requestAnimationFrame(() => { f.style.transition = 'opacity 0.6s'; f.style.opacity = 0; }); }
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };

// minimap base
const mapC = $('map'), mapG = mapC.getContext('2d');
let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
for (let i = 0; i < N; i++) { minX = Math.min(minX, PX[i]); maxX = Math.max(maxX, PX[i]); minZ = Math.min(minZ, PZ[i]); maxZ = Math.max(maxZ, PZ[i]); }
const mapS = 140 / Math.max(maxX - minX, maxZ - minZ);
const mx = x => 80 - (x - (minX + maxX) / 2) * mapS, mz = z => 80 - (z - (minZ + maxZ) / 2) * mapS;
const mapBase = makeCanvas(160, g => {
  g.lineJoin = 'round'; g.strokeStyle = '#222'; g.lineWidth = 9; g.beginPath(); for (let i = 0; i <= N; i += 4) { const k = i % N; i ? g.lineTo(mx(PX[k]), mz(PZ[k])) : g.moveTo(mx(PX[k]), mz(PZ[k])); } g.closePath(); g.stroke();
  g.strokeStyle = '#9a9a9a'; g.lineWidth = 5; g.stroke();
  g.fillStyle = '#fff'; g.fillRect(mx(PX[0]) - 3, mz(PZ[0]) - 3, 6, 6);
});
function drawMap() {
  mapG.clearRect(0, 0, 160, 160); mapG.drawImage(mapBase, 0, 0);
  for (const c of shrooms) if (c.active && c.group.visible) { mapG.fillStyle = '#c8322b'; mapG.fillRect(mx(c.x) - 2, mz(c.z) - 2, 4, 4); }
  for (const c of cars) { const s = c.isPlayer ? 9 : 7; mapG.fillStyle = '#000'; mapG.fillRect(mx(c.x) - s / 2 - 1, mz(c.z) - s / 2 - 1, s + 2, s + 2); mapG.fillStyle = c.isPlayer ? '#fff' : c.ch.kart; mapG.fillRect(mx(c.x) - s / 2, mz(c.z) - s / 2, s, s); }
}
let lastOrderKey = '', lastInvKey = '';
function updateHotbar(order) {
  const key = order.map(c => c.id).join();
  if (key !== lastOrderKey) { lastOrderKey = key; $('standings').innerHTML = order.map((c, i) => `<div class="st${c.isPlayer ? ' me' : ''}"><span>${i + 1}</span><img class="px" src="${c.ch.faceURL}"></div>`).join(''); }
  const r = recipe(player.inv); const ik = player.inv.join() + '|' + (player.shield > 0);
  if (ik === lastInvKey) return; lastInvKey = ik;
  const slots = [0, 1, 2].map(k => `<div class="slot">${player.inv[k] ? `<img class="px" src="${ORES[player.inv[k]].icon}">` : ''}</div>`).join('');
  $('hotbar').innerHTML = slots + `<div class="craft-arrow">&#10140;</div><div class="slot result${r ? ' ready' : ''}">${r ? `<img class="px" src="${ICONS[r.kind]}"><span>${r.n > 1 ? r.n : ''}</span>` : ''}</div>`;
  $('craftName').textContent = r ? r.name + (isTouch ? '' : '  [E]') : player.shield > 0 ? 'Shield up!' : 'Smash ore blocks to craft';
}

// =====================================================================
//  RACE SETUP
// =====================================================================
function setupRace() {
  for (const c of cars) { scene.remove(c.model.group); scene.remove(c.model.shadow); }
  cars.length = 0;
  rand = mulberry32((Math.random() * 1e9) | 0);
  const me = racerById(selectedId);
  const rivals = roster.filter(r => r.preset && r.id !== me.id).sort(() => Math.random() - 0.5).slice(0, 3);
  // player starts at the back of the grid: more overtaking = more fun
  const slots = [3, 0, 1, 2];
  [me, ...rivals].forEach((r, k) => { const c = new Car(r, k === 0, slots[k]); cars.push(c); if (k === 0) player = c; });
  const d = DIFF[diffIdx];
  cars.forEach((c, k) => { if (!c.isPlayer) c.skill = d.skill + (k - 2) * 0.015; });
  for (const e of gems) { e.active = true; e.mesh.visible = true; }
  for (let k = crates.length - 1; k >= 0; k--) { const t = crates[k]; if (t.dropped) { scene.remove(t.mesh); crates.splice(k, 1); } else { t.active = true; t.mesh.visible = true; } }
  for (const o of ores) { o.active = true; o.mesh.visible = true; }
  for (const a of arrows) scene.remove(a.g); arrows.length = 0;
  repairWorld(); lastInvKey = '';
  for (const c of shrooms) { c.active = d.shrooms; c.group.visible = d.shrooms; c.fuse = 0; }
  G.raceTime = 0; G.cd = 3.6; G.cdLast = 4; G.firstThrottle = null; G.resultsShown = false; G.finishOrder = []; lastOrderKey = '';
  G.state = 'countdown';
  $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('pause').classList.add('hidden');
  $('hud').classList.remove('hidden'); if (isTouch) $('touch').classList.remove('hidden');
  $('wrong').classList.add('hidden'); $('title').style.opacity = 0;
  camH = player.h; camera.position.set(player.x - Math.sin(player.h) * 40, 22, player.z - Math.cos(player.h) * 40);
}

// =====================================================================
//  PHYSICS
// =====================================================================
function updateCar(car, inp, dt) {
  car.idx = nearestLocal(car.x, car.z, car.idx);
  const i = car.idx;
  car.lat = latOf(car.x, car.z, i);
  car.offroad = Math.abs(car.lat) > CURB;
  const gY = groundAt(car.x, car.z);
  const grounded = car.y <= gY + 0.001 && car.vy <= 0;
  let { throttle, brake, steer } = inp;
  if (car.stun > 0) { car.stun -= dt; throttle = false; brake = false; steer *= 0.2; }
  const fx = Math.sin(car.h), fz = Math.cos(car.h);
  let vF = car.vx * fx + car.vz * fz;
  let vR = car.vx * fz - car.vz * fx;
  let maxS = car.baseMax * (1 + 0.012 * Math.min(car.gems, 10)) * (car.isPlayer ? 1 : car.skill * (car.rb || 1));
  if (car.offroad && car.boost <= 0) maxS *= 0.55;
  if (gY < -0.2 && car.boost <= 0) maxS *= 0.72; // stuck in a crater
  if (car.boost > 0) { maxS = car.baseMax * 1.4 * (car.isPlayer ? 1 : Math.max(1, car.skill)); car.boost -= dt; }

  // drift release (works airborne too)
  if (car.drifting && (!inp.drift || vF < 10 || car.stun > 0)) {
    car.drifting = false;
    if (car.charge >= 1) {
      const lvl = car.charge >= 3.2 ? 3 : car.charge >= 2 ? 2 : 1;
      car.boost = Math.max(car.boost, [0, 0.7, 1.1, 1.6][lvl]);
      if (car.isPlayer) { Audio.whoosh(); title(['', 'MINI-TURBO!', 'SUPER TURBO!', 'ULTRA TURBO!'][lvl], '', ['', '#6fc7ff', '#ffa531', '#e07bff'][lvl], 0.9); }
    }
    car.charge = 0;
  }

  if (grounded) {
    if (throttle) { if (vF < maxS) vF += (car.boost > 0 ? 70 : 36) * dt * (1 - 0.55 * clamp(vF / maxS, 0, 1)); }
    else if (!brake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 9 * dt);
    if (brake) { if (vF > 0.5) vF -= 60 * dt; else vF = Math.max(vF - 20 * dt, -16); }
    if (car.boost > 0 && vF < maxS) vF += 55 * dt;
    if (vF > maxS) vF -= Math.min(vF - maxS, (car.offroad ? 70 : 22) * dt);
    if (car.rocket > 0) { car.rocket -= dt; }
    const sp = Math.abs(vF);
    const sf = clamp(sp / 9, 0, 1) * (1 - 0.28 * clamp(sp / 75, 0, 1));
    if (inp.drift && !car.drifting && Math.abs(steer) > 0.3 && vF > 17 && car.stun <= 0) {
      car.drifting = true; car.driftDir = Math.sign(steer); car.charge = 0; car.vy = 5.5;
    }
    let turn;
    if (car.drifting) { turn = car.driftDir * (1.5 + 0.85 * steer * car.driftDir) * sf; car.charge += dt * (1 + (steer * car.driftDir > 0.3 ? 0.75 : 0)); }
    else turn = steer * 2.15 * sf * (car.isPlayer ? 1 : Math.max(1, car.skill));
    if (vF < -0.5) turn = -turn;
    car.h += turn * dt;
    vR *= Math.exp(-(car.drifting ? 2.4 : car.offroad ? 5 : 9.5) * dt);
    // off-road dust
    if (car.offroad && sp > 12 && Math.random() < dt * 30) emit(car.x - fx * 2, 0.3, car.z - fz * 2, (Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.6, 0.45, Math.random() < 0.5 ? '#866043' : '#5f9f35', 14, 1);
  } else {
    car.h += steer * 0.6 * dt; // tiny air control
  }

  // recompose velocity along new heading
  const nfx = Math.sin(car.h), nfz = Math.cos(car.h);
  if (grounded) { car.vx = nfx * vF + nfz * vR; car.vz = nfz * vF - nfx * vR; }
  car.vF = car.vx * nfx + car.vz * nfz;

  // vertical
  if (!grounded || car.vy > 0) {
    car.vy -= 42 * dt; car.y += car.vy * dt; car.air += dt;
    if (car.y <= gY) {
      if (car.air > 0.75 && car.isPlayer && car.stun <= 0) { car.boost = Math.max(car.boost, 0.6); title('NICE AIR!', '+ boost', '#80ff20', 0.9); Audio.whoosh(); }
      if (car.vy < -12) { for (let k = 0; k < 14; k++) emit(car.x, 0.3, car.z, (Math.random() - 0.5) * 12, 2 + Math.random() * 5, (Math.random() - 0.5) * 12, 0.6, 0.5, '#9a9a9a', 16, 1.5); if (car.isPlayer) { Audio.bump(0.5); G.shake = Math.max(G.shake, 0.4); } }
      car.y = gY; car.vy = 0; car.air = 0;
    }
  }

  car.x += car.vx * dt; car.z += car.vz * dt;
  // climbing out of a crater costs speed
  const gY2 = groundAt(car.x, car.z);
  if (car.y < gY2) {
    const step = gY2 - car.y; car.y = gY2; car.vx *= 1 - 0.16 * step; car.vz *= 1 - 0.16 * step;
    for (let k = 0; k < 5; k++) emit(car.x, gY2 + 0.3, car.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 6, 0.5, 0.45, '#866043', 16, 1);
    if (car.isPlayer && step > 0.4) { Audio.bump(0.3); G.shake = Math.max(G.shake, 0.25); }
  }

  // walls (leaf hedges)
  const lat2 = latOf(car.x, car.z, i);
  if (Math.abs(lat2) > WALL) {
    const sg = Math.sign(lat2), push = lat2 - sg * WALL;
    car.x -= NX[i] * push; car.z -= NZ[i] * push;
    const vn = car.vx * NX[i] + car.vz * NZ[i];
    if (vn * sg > 0) {
      car.vx -= NX[i] * vn * 1.45; car.vz -= NZ[i] * vn * 1.45; car.vx *= 0.9; car.vz *= 0.9;
      if (Math.abs(vn) > 6) {
        for (let k = 0; k < 10; k++) emit(car.x + NX[i] * sg * 1.5, 1 + Math.random(), car.z + NZ[i] * sg * 1.5, (Math.random() - 0.5) * 8, 3 + Math.random() * 4, (Math.random() - 0.5) * 8, 0.7, 0.4, '#3b7a1e', 14, 1);
        if (car.isPlayer) { Audio.bump(clamp(Math.abs(vn) / 30, 0.2, 0.8)); G.shake = Math.max(G.shake, clamp(Math.abs(vn) / 40, 0.15, 0.6)); }
      }
    }
  }

  // drift sparks
  if (car.drifting && grounded && Math.random() < dt * 50) {
    const col = car.charge >= 3.2 ? '#d05cff' : car.charge >= 2 ? '#ff9a1f' : car.charge >= 1 ? '#4fb3ff' : '#dddddd';
    for (const s of [-1, 1]) { const wx = car.x + nfz * s * 1.5 - nfx * 1.7, wz = car.z - nfx * s * 1.5 - nfz * 1.7; emit(wx, 0.3, wz, (Math.random() - 0.5) * 6 - nfx * 4, 2 + Math.random() * 4, (Math.random() - 0.5) * 6 - nfz * 4, 0.35, car.charge >= 1 ? 0.35 : 0.25, col, 20, 1); }
    if (Math.random() < 0.3) emit(car.x - nfx * 2.2, 0.5, car.z - nfz * 2.2, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.9, 0.9, '#cfcfcf', -1, 1.2, false);
  }
  // boost flames
  if (car.boost > 0 && Math.random() < dt * 60) {
    for (const s of [-0.6, 0.6]) { const ex = car.x + nfz * s - nfx * 2.7, ez = car.z - nfx * s - nfz * 2.7; emit(ex, car.y + 0.8, ez, -nfx * 10 + (Math.random() - 0.5) * 2, Math.random() * 2, -nfz * 10 + (Math.random() - 0.5) * 2, 0.25, 0.45, Math.random() < 0.5 ? '#ffd23a' : '#ff6a1a', 0, 3, false); }
  }

  // pads
  for (const p of pads) {
    const di = idxDiff(car.idx, p.i) * SEG;
    if (Math.abs(di) < p.halfL + 1 && Math.abs(car.lat - p.lat) < p.halfW && car.y < 0.6) {
      if (p.type === 'boost') { if (car.boost < 1.0 && car.isPlayer) { Audio.whoosh(); title('BOOST!', '', '#ffd23a', 0.6); } car.boost = Math.max(car.boost, 1.3); }
      else if (car.vy <= 0 && car.y < 0.2 && car.vF > 5) { car.vy = 21; car.y += 0.02; car.air = 0; car.drifting = false; car.charge = 0; if (car.isPlayer) Audio.boing(); for (let k = 0; k < 12; k++) emit(car.x, 0.6, car.z, (Math.random() - 0.5) * 10, 4 + Math.random() * 5, (Math.random() - 0.5) * 10, 0.7, 0.5, '#45c8e0', 16, 1); }
    }
  }

  // gems
  for (const e of gems) {
    if (!e.active) continue;
    const dx = e.x - car.x, dz = e.z - car.z; if (dx * dx + dz * dz > 9) continue;
    if (Math.abs(e.y - (car.y + 1.3)) > 2.6) continue;
    e.active = false; e.mesh.visible = false; e.t = 10; car.gems++;
    for (let k = 0; k < 6; k++) emit(e.x, e.y, e.z, (Math.random() - 0.5) * 6, Math.random() * 6, (Math.random() - 0.5) * 6, 0.5, 0.3, '#41e07a', 10, 1);
    if (car.isPlayer) { Audio.pling(); }
  }

  // TNT
  for (const t of crates) {
    if (!t.active || (t.owner === car && t.arm > 0)) continue;
    const dx = t.x - car.x, dz = t.z - car.z; if (dx * dx + dz * dz < 2.8 * 2.8 && car.y < 2.4) { t.active = false; t.mesh.visible = false; t.t = t.dropped ? Infinity : 9; explode(t.x, 1.3, t.z, ['#9a6a34', '#f2c21b', '#1c1c1c', '#ff7a1a']); }
  }
  for (const o of ores) {
    if (!o.active) continue;
    const dx = o.x - car.x, dz = o.z - car.z; if (dx * dx + dz * dz > 2.9 * 2.9 || car.y > 2.6) continue;
    o.active = false; o.mesh.visible = false; o.t = 4;
    const ore = ORES[o.type];
    for (let k = 0; k < 16; k++) emit(o.x, 1.3, o.z, (Math.random() - 0.5) * 9, 2 + Math.random() * 7, (Math.random() - 0.5) * 9, 0.8, 0.4 + Math.random() * 0.3, k % 3 ? '#808080' : ore.c1, 22, 0.8);
    if (car.inv.length < 3) { car.inv.push(o.type); if (!car.isPlayer) car.craftT = Math.min(car.craftT, 1 + rand() * 3); }
    if (car.isPlayer) { Audio.crunch(); if (car.inv.length <= 3) toast('+1 ' + ore.name, ore.c1); }
  }

  // lap logic
  const pi = car.prevIdx, ci = car.idx;
  if (pi > N * 0.8 && ci < N * 0.2) onCross(car, 1); else if (pi < N * 0.2 && ci > N * 0.8) onCross(car, -1);
  car.prevIdx = ci;

  // wrong way
  if (car.isPlayer) { const dot = nfx * TXa[i] + nfz * TZa[i]; car.wrongT = (dot < -0.35 && Math.abs(car.vF) > 4) ? car.wrongT + dt : 0; }
}
function onCross(car, dir) {
  if (dir < 0) { car.lap--; return; }
  car.lap++;
  if (G.state !== 'race' && !car.finished && G.state !== 'finished') return;
  if (car.lap >= 2 && !car.finished) { car.lapTimes.push(G.raceTime - car.lapStart); car.lapStart = G.raceTime; }
  if (car.lap > laps && !car.finished) {
    car.finished = true; car.finishTime = G.raceTime; G.finishOrder.push(car);
    if (car.isPlayer) onPlayerFinish();
  } else if (car.isPlayer && car.lap >= 2) {
    const lt = car.lapTimes[car.lapTimes.length - 1];
    if (car.lap === laps) { title('FINAL LAP!', fmt(lt), '#ff5555', 2); Audio.beep(true); Audio.beep(false); }
    else { title('LAP ' + car.lap, fmt(lt), '#fff', 1.5); Audio.beep(true); }
  }
}

// ---------- explosions ----------
function explode(x, y, z, colors, opt = {}) {
  const R = opt.r || 9;
  carve(x, z, opt.carve || 7);
  Audio.boom(clamp(1 - Math.hypot(x - player.x, z - player.z) / 120, 0.15, 1));
  for (let k = 0; k < 46; k++) { const a = Math.random() * 6.28, sp = 6 + Math.random() * 16; emit(x, y, z, Math.cos(a) * sp, 4 + Math.random() * 14, Math.sin(a) * sp, 1 + Math.random() * 0.8, 0.5 + Math.random() * 0.6, colors[(Math.random() * colors.length) | 0], 24, 0.8); }
  for (let k = 0; k < 18; k++) emit(x + (Math.random() - 0.5) * 4, y + Math.random() * 3, z + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3, 1.4 + Math.random(), 1.2 + Math.random() * 1.4, Math.random() < 0.5 ? '#e8e8e8' : '#b0b0b0', -1, 1.5, false);
  for (let k = 0; k < 10; k++) emit(x, y + 1, z, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 0.25, 1.6, '#fff2a0', 0, 4, false);
  for (const c of cars) {
    const d = Math.hypot(c.x - x, c.z - z); if (d > R || c === opt.owner) continue;
    if (c.shield > 0) { c.shield = 0; if (c.isPlayer) { title('BLOCKED!', 'shield absorbed it', '#9fe8ff', 1); Audio.tone(880, 0.2, 'square', 0.12, 440); } continue; }
    const f = 1 - d / R;
    c.vy = 10 + 9 * f; c.y = Math.max(c.y, groundAt(c.x, c.z) + 0.02); c.vx *= 0.3; c.vz *= 0.3;
    const nx = (c.x - x) / (d || 1), nz = (c.z - z) / (d || 1); c.vx += nx * 14 * f; c.vz += nz * 14 * f;
    c.stun = 0.7; c.spin = 1; c.drifting = false; c.charge = 0; c.boost = 0;
    const lost = Math.min(3, c.gems); c.gems -= lost; if (c.inv.length) c.inv.pop();
    if (c.isPlayer) { flash(0.4); title('KABOOM!', lost ? `-${lost} gems` : '', '#ff5555', 1.2); }
  }
  const dp = Math.hypot(player.x - x, player.z - z); G.shake = Math.max(G.shake, clamp(1.3 - dp / 35, 0, 1.3));
}

// ---------- crafting ----------
// Whatever ore you hold is crafted into one item: the main ore picks the item, the ore count picks its power.
function recipe(inv) {
  if (!inv.length) return null;
  const n = inv.length, cnt = t => inv.filter(x => x === t).length;
  if (cnt('ruby')) return { kind: 'arrow', n, name: n > 2 ? 'Triple Arrow' : n > 1 ? 'Double Arrow' : 'Ruby Arrow' };
  const best = ['gold', 'iron', 'coal'].sort((a, b) => cnt(b) - cnt(a))[0];
  const lvl = ['', ' I', ' II', ' III'][n];
  return best === 'gold' ? { kind: 'rush', n, name: 'Gold Rush' + lvl } : best === 'iron' ? { kind: 'shield', n, name: 'Iron Shield' + lvl } : { kind: 'charge', n, name: n > 1 ? n + ' Blast Charges' : 'Blast Charge' };
}
let crateMatShared = null;
function dropCharge(car, back) {
  const fx = Math.sin(car.h), fz = Math.cos(car.h); const x = car.x - fx * back, z = car.z - fz * back;
  if (!crateMatShared) crateMatShared = [T.crateSide, T.crateSide, T.crateTop, T.crateTop, T.crateSide, T.crateSide].map(t => new THREE.MeshLambertMaterial({ map: t }));
  const m = box(2.2, 2.2, 2.2, crateMatShared, x, groundAt(x, z) + 1.1, z); m.rotation.y = car.h; scene.add(m);
  const i = nearestLocal(x, z, car.idx);
  crates.push({ id: 900 + crates.length, i, lat: latOf(x, z, i), x, z, active: true, t: Infinity, mesh: m, dropped: true, owner: car, arm: 1.2 });
}
function craftItem(car) {
  const r = recipe(car.inv); if (!r) return; car.inv = [];
  if (car.isPlayer) { toast('Crafted ' + r.name + '!', '#ffff60'); Audio.tone(523, 0.08, 'square', 0.1); Audio.tone(784, 0.12, 'square', 0.1, null, 0.07); }
  if (r.kind === 'rush') { car.boost = Math.max(car.boost, 0.8 + 0.8 * r.n); if (car.isPlayer) Audio.whoosh(); }
  else if (r.kind === 'shield') { car.shield = 3 + 3.5 * r.n; }
  else if (r.kind === 'charge') { for (let k = 0; k < r.n; k++) dropCharge(car, 4.5 + k * 4.5); }
  else if (r.kind === 'arrow') {
    const st = standings(); const me = st.indexOf(car);
    for (let k = 0; k < Math.min(r.n, 3); k++) {
      const target = st[me - 1 - k] || st[me + 1 + k] || null; if (!target || target === car) continue;
      fireArrow(car, target, k * 0.15);
    }
  }
}
const arrowGeo = new THREE.BoxGeometry(0.25, 0.25, 2.6), arrowMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2b }), arrowHeadMat = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
function fireArrow(car, target, delay) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(arrowGeo, arrowMat)); const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), arrowHeadMat); head.position.z = 1.4; g.add(head);
  g.position.set(car.x, car.y + 2.2, car.z); scene.add(g);
  arrows.push({ g, owner: car, target, x: car.x, y: car.y + 2.2, z: car.z, h: car.h, life: 5, delay });
  if (car.isPlayer || target.isPlayer) Audio.tone(1200, 0.25, 'triangle', 0.12, 300);
  if (target.isPlayer) toast('Incoming arrow! Shield or dodge!', '#ff8080');
}
function updateArrows(dt) {
  for (let k = arrows.length - 1; k >= 0; k--) {
    const a = arrows[k];
    if (a.delay > 0) { a.delay -= dt; a.x = a.owner.x; a.z = a.owner.z; a.g.position.set(a.x, a.owner.y + 2.2, a.z); continue; }
    a.life -= dt;
    const tx = a.target.x, ty = a.target.y + 1.3, tz = a.target.z;
    const want = Math.atan2(tx - a.x, tz - a.z); a.h += clamp(wrapAngle(want - a.h), -4 * dt, 4 * dt) * (a.life < 4.6 ? 2 : 1);
    const sp = 95 * dt; a.x += Math.sin(a.h) * sp; a.z += Math.cos(a.h) * sp; a.y += clamp(ty - a.y, -10 * dt, 10 * dt);
    a.g.position.set(a.x, a.y, a.z); a.g.rotation.y = a.h;
    if (Math.random() < 0.6) emit(a.x, a.y, a.z, 0, 0.5, 0, 0.35, 0.3, '#ff3b5c', 0, 1, false);
    const hit = Math.hypot(tx - a.x, tz - a.z) < 2.6 && Math.abs(ty - a.y) < 3;
    if (hit || a.life <= 0) { scene.remove(a.g); arrows.splice(k, 1); if (hit) explode(a.x, a.y, a.z, ['#ff3b5c', '#a3122e', '#eeeeee', '#555555'], { r: 6, carve: 5, owner: a.owner }); }
  }
}

// ---------- shrooms ----------
function updateShrooms(dt) {
  for (const c of shrooms) {
    if (!c.active) {
      if (DIFF[diffIdx].shrooms) { c.t -= dt; if (c.t <= 0) { c.active = true; c.group.visible = true; c.fuse = 0; c.group.scale.setScalar(0.01); } }
      continue;
    }
    if (c.group.scale.x < 1) c.group.scale.setScalar(Math.min(1, c.group.scale.x + dt * 2));
    const amp = ROAD_HW + 3;
    const nearCar = cars.reduce((m, car) => Math.min(m, Math.hypot(car.x - c.x, car.z - c.z)), 1e9);
    const walking = c.fuse <= 0;
    if (walking) c.phase += c.speed * dt;
    c.lat = Math.sin(c.phase) * amp;
    const dir = Math.cos(c.phase) >= 0 ? 1 : -1;
    c.x = PX[c.i] + NX[c.i] * c.lat; c.z = PZ[c.i] + NZ[c.i] * c.lat;
    c.group.position.set(c.x, 0, c.z);
    // face walking direction or the nearest kart when fusing
    let face = Math.atan2(NX[c.i] * dir, NZ[c.i] * dir);
    if (!walking) { const t = cars.reduce((b, car) => Math.hypot(car.x - c.x, car.z - c.z) < Math.hypot(b.x - c.x, b.z - c.z) ? car : b, cars[0]); face = Math.atan2(t.x - c.x, t.z - c.z); }
    c.group.rotation.y = face;
    c.walk += dt * (walking ? 7 : 0);
    c.legs.forEach((l, k) => l.rotation.x = Math.sin(c.walk + (k === 0 || k === 3 ? 0 : Math.PI)) * 0.6);
    // fuse
    if (nearCar < 10) { if (c.fuse === 0) { if (Math.hypot(player.x - c.x, player.z - c.z) < 40) Audio.hiss(); } c.fuse += dt; }
    else c.fuse = Math.max(0, c.fuse - dt * 2);
    const fl = c.fuse > 0 ? ((Math.sin(c.fuse * (10 + c.fuse * 14)) > 0) ? 0.85 : 0) : 0;
    for (const m of c.mats) m.emissive.setScalar(fl);
    const fuseT = DIFF[diffIdx].fuse, swell = 1 + clamp(c.fuse / fuseT, 0, 1) * 0.17; if (c.group.scale.x >= 1) c.group.scale.set(swell, 1 + (swell - 1) * 0.5, swell);
    // collision or fuse done
    let boom = c.fuse > fuseT;
    for (const car of cars) { if (Math.hypot(car.x - c.x, car.z - c.z) < 2.3 && car.y < 3) boom = true; }
    if (boom) { c.active = false; c.group.visible = false; c.t = 7; c.fuse = 0; explode(c.x, 1.5, c.z, SHROOM_PAL); }
  }
}

// ---------- AI ----------
function hazardsNear(car) {
  const out = [];
  for (const t of crates) if (t.active) out.push(t);
  for (const c of shrooms) if (c.active) out.push(c);
  return out;
}
function aiInput(car, dt) {
  const sp = Math.max(car.vF, 12);
  const look = Math.round((7 + sp * 0.36) / SEG);
  car.laneTimer -= dt; if (car.laneTimer <= 0) { car.laneT = (rand() - 0.5) * 11; car.laneTimer = 2 + rand() * 3; }
  // avoid hazards
  for (const hz of hazardsNear(car)) {
    const di = idxDiff(hz.i, car.idx) * SEG; if (di < 4 || di > 38) continue;
    if (!car.decide.has(hz.id + ':' + car.lap)) car.decide.set(hz.id + ':' + car.lap, rand() < DIFF[diffIdx].aware);
    if (!car.decide.get(hz.id + ':' + car.lap)) continue;
    if (Math.abs(car.laneT - hz.lat) < 4.5) car.laneT = clamp(hz.lat + (hz.lat > 0 ? -6.5 : 6.5), -8, 8);
  }
  car.lane = lerp(car.lane, car.laneT, 1 - Math.exp(-1.5 * dt));
  const ti = idxWrap(car.idx + look);
  const tx = PX[ti] + NX[ti] * car.lane, tz = PZ[ti] + NZ[ti] * car.lane;
  const diff = wrapAngle(Math.atan2(tx - car.x, tz - car.z) - car.h);
  let c = 0; for (let k = 4; k < 4 + look * 1.7; k++) c += CURV[idxWrap(car.idx + k)];
  // rubber band towards player
  const D = DIFF[diffIdx];
  car.rb = 1;
  if (!car.isPlayer && !car.finished && player && !player.finished) { const gap = (player.lap * N + player.idx) - (car.lap * N + car.idx); car.rb = 1 + clamp(gap / 300, -D.rbNeg, D.rb); }
  const target = car.baseMax * car.skill * car.rb * (1 - clamp(c * D.corner, 0, 0.55)) + (car.offroad ? -10 : 0);
  // corner-exit turbos, like a player releasing a drift
  let cb = 0; for (let k = 1; k < 45; k++) cb += CURV[idxWrap(car.idx - k)];
  if (c > 0.7) car.turboReady = true;
  if (car.turboReady && cb > 0.6 && c < 0.25) { car.turboReady = false; if (!car.isPlayer && rand() < D.turbo) car.boost = Math.max(car.boost, 0.5 + 0.6 * D.turbo * Math.min(cb, 1.5)); }
  if (car.inv.length && !car.isPlayer || (car.isPlayer && window.__auto && car.inv.length)) {
    car.craftT -= dt;
    const r = recipe(car.inv);
    const want = r.kind === 'rush' ? c < 0.3 : r.kind === 'arrow' ? true : r.kind === 'shield' ? true : player && Math.abs((player.lap * N + player.idx) - (car.lap * N + car.idx)) < 70;
    if (car.craftT <= 0 && (want || car.inv.length === 3 || car.craftT < -4)) { craftItem(car); car.craftT = 2 + rand() * 3; }
  }
  return { throttle: car.vF < target, brake: car.vF > target + 9, steer: clamp(diff * 2.4, -1, 1), drift: false };
}

// ---------- car vs car ----------
function carCollisions() {
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const A = cars[a], Bc = cars[b]; const dx = Bc.x - A.x, dz = Bc.z - A.z; const d = Math.hypot(dx, dz);
    if (d > 3.4 || d === 0 || Math.abs(A.y - Bc.y) > 2) continue;
    const nx = dx / d, nz = dz / d, o = (3.4 - d) / 2;
    A.x -= nx * o; A.z -= nz * o; Bc.x += nx * o; Bc.z += nz * o;
    const rv = (Bc.vx - A.vx) * nx + (Bc.vz - A.vz) * nz;
    if (rv < 0) { const j = -rv * 0.6; A.vx -= nx * j; A.vz -= nz * j; Bc.vx += nx * j; Bc.vz += nz * j; if ((A.isPlayer || Bc.isPlayer) && -rv > 5) { Audio.bump(0.35); G.shake = Math.max(G.shake, 0.25); emit(A.x + nx * 1.7, 1, A.z + nz * 1.7, 0, 3, 0, 0.3, 0.4, '#ffe680', 10, 1); } }
  }
}

// =====================================================================
//  RENDER SYNC
// =====================================================================
function syncCar(car, dt) {
  const m = car.model;
  m.group.position.set(car.x, car.y, car.z);
  if (car.spin > 0) car.spin = Math.max(0, car.spin - dt * 1.3);
  const driftYaw = car.drifting ? car.driftDir * 0.38 : 0;
  car.visYaw = lerp(car.visYaw || 0, driftYaw, 1 - Math.exp(-10 * dt));
  m.group.rotation.y = car.h + car.visYaw + car.spin * Math.PI * 4;
  const inp = car.lastSteer || 0;
  car.steerVis = lerp(car.steerVis, inp, 1 - Math.exp(-12 * dt));
  m.fronts.forEach(f => f.rotation.y = car.steerVis * 0.45);
  m.body.rotation.z = -car.steerVis * clamp(car.vF / 60, 0, 1) * 0.06 - car.visYaw * 0.15;
  m.body.rotation.x = clamp(-car.vy * 0.012, -0.25, 0.25);
  m.head.rotation.y = car.steerVis * 0.35;
  for (const w of m.wheels) w.rotation.x += car.vF * dt / 0.55;
  const sg = groundAt(car.x, car.z); m.shadow.position.set(car.x, sg + 0.07, car.z); m.shadow.visible = sg > -0.2;
  m.shieldMesh.visible = car.shield > 0; if (car.shield > 0) m.shieldMesh.material.opacity = 0.2 + Math.sin(G.raceTime * 12) * 0.08 * (car.shield < 1.5 ? 2 : 1); m.shadow.rotation.z = car.h; const s = 1 / (1 + Math.max(0, car.y - sg) * 0.12); m.shadow.scale.set(s, s, 1); m.shadow.material.opacity = s;
}

// =====================================================================
//  CAMERA
// =====================================================================
let camH = 0;
const camLook = new THREE.Vector3();
function updateCamera(dt) {
  const c = player;
  camH += wrapAngle(c.h + (c.visYaw || 0) * 0.4 - camH) * (1 - Math.exp(-5.5 * dt));
  const spd = clamp(Math.abs(c.vF) / 75, 0, 1);
  const dist = 10 + spd * 2.2, hgt = 4.4 + spd * 0.6;
  const tx = c.x - Math.sin(camH) * dist, tz = c.z - Math.cos(camH) * dist, ty = c.y * 0.7 + hgt;
  const k = 1 - Math.exp(-14 * dt);
  camera.position.x = lerp(camera.position.x, tx, k); camera.position.z = lerp(camera.position.z, tz, k); camera.position.y = lerp(camera.position.y, ty, 1 - Math.exp(-6 * dt));
  camLook.set(c.x + Math.sin(camH) * 5, c.y * 0.8 + 1.8, c.z + Math.cos(camH) * 5);
  if (G.shake > 0) { camera.position.x += (Math.random() - 0.5) * G.shake; camera.position.y += (Math.random() - 0.5) * G.shake; G.shake = Math.max(0, G.shake - dt * 1.8); }
  camera.lookAt(camLook);
  const fov = 68 + spd * 12 + (c.boost > 0 ? 8 : 0);
  camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-5 * dt)); camera.updateProjectionMatrix();
}
function menuCamera(dt) {
  G.menuT += dt * 14;
  const i = idxWrap(Math.floor(G.menuT)), j = idxWrap(i + 50);
  const side = 26;
  camera.position.lerp(new THREE.Vector3(PX[i] + NX[i] * side, 15, PZ[i] + NZ[i] * side), 1 - Math.exp(-2 * dt));
  camLook.lerp(new THREE.Vector3(PX[j], 2, PZ[j]), 1 - Math.exp(-2 * dt)); camera.lookAt(camLook);
  if (camera.fov !== 65) { camera.fov = 65; camera.updateProjectionMatrix(); }
}

// =====================================================================
//  MAIN LOOP
// =====================================================================
function standings() {
  return [...cars].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1; if (b.finished) return 1;
    return (b.lap * N + b.idx) - (a.lap * N + a.idx);
  });
}
function onPlayerFinish() {
  G.state = 'finished';
  const place = G.finishOrder.indexOf(player) + 1;
  title(place === 1 ? 'VICTORY!' : ord(place) + ' PLACE', fmt(player.finishTime), place === 1 ? '#ffde3a' : '#fff', 3);
  Audio.tone(523, 0.2, 'square', 0.15); Audio.tone(659, 0.2, 'square', 0.15, null, 0.18); Audio.tone(784, 0.2, 'square', 0.15, null, 0.36); Audio.tone(1046, 0.6, 'square', 0.15, null, 0.54);
  setTimeout(showResults, 2600);
}
function showResults() {
  if (G.state !== 'finished') return;
  G.resultsShown = true; titleTimer = 0; $('title').style.opacity = 0; $('results').classList.remove('hidden'); $('touch').classList.add('hidden');
  renderResults();
}
function renderResults() {
  const place = G.finishOrder.indexOf(player) + 1;
  $('resTitle').textContent = place === 1 ? 'You won the race!' : `You finished ${ord(place)}`;
  const best = Math.min(...player.lapTimes);
  $('resStats').innerHTML = `Time ${fmt(player.finishTime)} &nbsp; Best lap ${fmt(best)}<br>Gems held ${player.gems}`;
  $('resTable').innerHTML = standings().map((c, i) => `<tr class="${c.isPlayer ? 'me' : ''}"><td>${ord(i + 1)}</td><td><img class="px" src="${c.ch.faceURL}"></td><td>${esc(c.ch.name)}</td><td>${c.finished ? fmt(c.finishTime) : 'racing...'}</td></tr>`).join('');
}
let last = performance.now(), hudT = 0, resT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.state === 'paused' || G.state === 'loading') { renderer.render(scene, camera); return; }
  Audio.music();
  const t = now / 1000;

  // world animation
  T.boost.offset.y = (T.boost.offset.y + dt * 1.6) % 1;
  T.water.offset.x = (t * 0.02) % 1;
  for (const cl of clouds) { cl.position.x += dt * 2.5; if (cl.position.x > 600) cl.position.x -= 1200; }
  for (const e of gems) { if (!e.active) { e.t -= dt; if (e.t <= 0) { e.active = true; e.mesh.visible = true; } continue; } e.mesh.rotation.y = t * 2.2 + e.phase; e.mesh.position.y = e.y + Math.sin(t * 3 + e.phase) * 0.25; }
  for (const tn of crates) { if (tn.arm > 0) tn.arm -= dt; if (!tn.active) { tn.t -= dt; if (tn.t <= 0) { tn.active = true; tn.mesh.visible = true; } } }
  for (const o of ores) {
    if (!o.active) { o.t -= dt; if (o.t <= 0) { o.active = true; o.mesh.visible = true; o.type = pickOre(); o.mesh.material = oreMats[o.type]; o.mesh.scale.setScalar(0.1); } continue; }
    if (o.mesh.scale.x < 1) o.mesh.scale.setScalar(Math.min(1, o.mesh.scale.x + dt * 3));
    o.mesh.position.y = 1.3 + Math.sin(t * 2 + o.phase) * 0.12;
  }
  if (torchFlames && Math.random() < 0.5) { const [x, z] = torchFlames.pos[(Math.random() * torchFlames.pos.length) | 0]; if (Math.hypot(x - camera.position.x, z - camera.position.z) < 120) emit(x + (Math.random() - 0.5) * 0.3, 2.7, z + (Math.random() - 0.5) * 0.3, 0, 1.2, 0, 0.6, 0.15, Math.random() < 0.5 ? '#ffb02e' : '#ff6a1a', -0.5, 0.5, false); }

  if (G.state === 'editor') {
    editorView(dt);
    if (shroomBuilt) updateShroomsMenu(dt);
  } else if (G.state === 'menu') {
    menuCamera(dt);
    if (shroomBuilt) updateShroomsMenu(dt);
  } else {
    if (G.state === 'countdown') {
      const prev = G.cd; G.cd -= dt;
      const n = Math.ceil(G.cd);
      if (n !== G.cdLast && n >= 0) {
        G.cdLast = n;
        if (n > 0 && n <= 3) { title(String(n), n === 3 ? 'Get ready...' : '', '#fff', 0.9); Audio.beep(false); }
      }
      const inp = readInput();
      if (inp.throttle && G.firstThrottle === null) G.firstThrottle = G.cd;
      Audio.engine(inp.throttle ? 30 + Math.random() * 10 : 0, false, true);
      if (G.cd <= 0) {
        G.state = 'race'; G.raceTime = 0; title('GO!', '', '#80ff20', 0.9); Audio.beep(true);
        for (const c of cars) c.lapStart = 0;
        if (G.firstThrottle !== null && G.firstThrottle < 0.65 && inp.throttle) { player.boost = 1.2; toast('Rocket start!', '#80ff20'); Audio.whoosh(); }
        else if (!isTouch && G.firstThrottle !== null && G.firstThrottle > 2.4) { player.stun = 0.6; toast('Engine flooded! (too early)', '#ff8080'); }
        for (const c of cars) if (!c.isPlayer && rand() < 0.5) c.boost = 0.6;
      }
      for (const c of cars) syncCar(c, dt);
      updateCamera(dt);
    } else {
      G.raceTime += dt;
      // inputs & physics (2 substeps for stability)
      const pin = G.state === 'race' && !window.__auto ? readInput() : aiInput(player, dt);
      for (let s = 0; s < 2; s++) {
        const h = dt / 2;
        for (const c of cars) { const inp = c.isPlayer ? pin : aiInput(c, h); c.lastSteer = inp.steer; updateCar(c, inp, h); }
        carCollisions();
      }
      if (DIFF[diffIdx].shrooms) updateShrooms(dt);
      updateArrows(dt);
      for (const c of cars) if (c.shield > 0) c.shield -= dt;
      if (G.state === 'race' && G.craftPressed) { G.craftPressed = false; craftItem(player); }
      for (const c of cars) syncCar(c, dt);
      updateCamera(dt);
      Audio.engine(player.vF, player.boost > 0, true);
      Audio.drift(player.drifting && player.y <= 0 ? 0.05 + clamp(player.charge / 3.2, 0, 1) * 0.04 : 0);
      if (G.state === 'finished' && G.resultsShown) { resT += dt; if (resT > 0.5) { resT = 0; renderResults(); } }
    }
    // HUD
    hudT += dt;
    if (titleTimer > 0) { titleTimer -= dt; if (titleTimer <= 0) $('title').style.opacity = 0; }
    if (hudT > 0.05) { hudT = 0; updateHUD(); }
  }
  updateParticles(dt);
  sun.position.copy(camera.position).addScaledVector(sunDir, 700); sun.lookAt(camera.position);
  renderer.render(scene, camera);
}
function updateShroomsMenu(dt) { // shrooms wander in the attract mode too
  for (const c of shrooms) {
    if (!c.active) continue; c.phase += c.speed * dt; c.lat = Math.sin(c.phase) * (ROAD_HW + 3); const dir = Math.cos(c.phase) >= 0 ? 1 : -1;
    c.x = PX[c.i] + NX[c.i] * c.lat; c.z = PZ[c.i] + NZ[c.i] * c.lat; c.group.position.set(c.x, 0, c.z); c.group.rotation.y = Math.atan2(NX[c.i] * dir, NZ[c.i] * dir);
    c.walk += dt * 7; c.legs.forEach((l, k) => l.rotation.x = Math.sin(c.walk + (k === 0 || k === 3 ? 0 : Math.PI)) * 0.6);
  }
}
function updateHUD() {
  const st = standings(); const place = st.indexOf(player) + 1;
  $('posN').textContent = place; $('posS').textContent = ord(place).slice(String(place).length);
  $('posN').style.color = place === 1 ? '#ffde3a' : '#fff';
  $('lap').textContent = `LAP ${clamp(player.lap, 1, laps)}/${laps}`;
  $('time').textContent = fmt(player.finished ? player.finishTime : G.raceTime);
  $('best').textContent = 'BEST LAP ' + (player.lapTimes.length ? fmt(Math.min(...player.lapTimes)) : '--');
  const kmh = Math.round(Math.abs(player.vF) * 3.6);
  $('spdN').innerHTML = `${kmh} <small>km/h</small>`;
  $('xpFill').style.width = clamp(Math.abs(player.vF) / (player.baseMax * 1.4) * 100, 0, 100) + '%';
  const ch = player.drifting ? player.charge : 0;
  $('chargeFill').style.width = clamp(ch / 3.2 * 100, 0, 100) + '%';
  $('chargeFill').style.background = ch >= 3.2 ? '#d05cff' : ch >= 2 ? '#ff9a1f' : ch >= 1 ? '#4fb3ff' : '#888';
  $('emN').textContent = player.gems; $('emBonus').textContent = `+${Math.round(Math.min(player.gems, 10) * 1.2)}% speed`;
  $('wrong').classList.toggle('hidden', !(player.wrongT > 1 && G.state === 'race'));
  updateHotbar(st); drawMap();
}

// =====================================================================
//  MENUS
// =====================================================================
const SPLASHES = ['Drift to win!', '100% blocks!', 'Bounce pads = air time!', 'Gems = speed!', 'Mind the boomshrooms!', 'Vroom vroom!', 'Made of cubes!', 'Ultra turbo!', 'Mind the blast crates!', 'Paint your own racer!', 'Bring your own skin!', 'Rusty is a good boy!', 'Beep boop, says Bolt!'];
function showMenu() {
  G.state = 'menu'; for (const c of cars) { scene.remove(c.model.group); scene.remove(c.model.shadow); } cars.length = 0;
  $('menu').classList.remove('hidden'); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('results').classList.add('hidden'); $('pause').classList.add('hidden'); $('editor').classList.add('hidden');
  $('splash').textContent = SPLASHES[(Math.random() * SPLASHES.length) | 0];
  for (const c of shrooms) { c.active = true; c.group.visible = true; c.group.scale.setScalar(1); for (const m of c.mats) m.emissive.setScalar(0); }
  Audio.engine(0, false, false); Audio.drift(0);
  renderChars();
}
function selectRacer(id) { selectedId = id; try { localStorage.setItem(SEL_STORE, id); } catch {} }
function renderChars() {
  if (!roster.some(r => r.id === selectedId)) selectRacer(roster[0].id);
  const customs = roster.filter(r => r.custom).length;
  $('chars').innerHTML = roster.map(r => `<div class="char${r.id === selectedId ? ' sel' : ''}" data-id="${esc(r.id)}"><img class="px" src="${r.faceURL}" style="background:${esc(r.kart)}">${esc(r.name)}${r.custom ? '<span class="edit" title="Edit racer">&#9998;</span>' : ''}</div>`).join('')
    + (customs < 8 ? '<div class="char new" id="newRacer"><div class="plus">+</div>Create</div>' : '');
  $('chars').querySelectorAll('.char[data-id]').forEach(el => el.onclick = e => {
    if (e.target.classList.contains('edit')) { click(); openEditor(racerById(el.dataset.id)); return; }
    selectRacer(el.dataset.id); renderChars(); Audio.init(); Audio.tone(880, 0.06, 'square', 0.08);
  });
  $('newRacer')?.addEventListener('click', () => { click(); openEditor(null); });
}

// =====================================================================
//  RACER CREATOR
// =====================================================================
const ED = { skin: null, editing: null, color: '#1d1d1d', painting: false, dirty: false, rebuildT: 0, preview: null, prev: {}, delArmed: false, spin: 0 };
const ED_SWATCHES = ['#1d1d1d', '#ffffff', '#7a7a7a', '#3b2a1a', '#8a5a2b', '#e2741f', '#f2d03b', '#d23a3a', '#c9605a', '#ff9ec7', '#8b4dd9', '#3c7fe0', '#2fd4e8', '#3f9e5a', '#9be36b', '#f2c9a0', '#c69c7c', '#6b4a31'];
const edG = () => ED.skin.getContext('2d', { willReadFrequently: true });
const toHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
function skinPixel(x, y) { const d = edG().getImageData(x, y, 1, 1).data; return toHex(d[0], d[1], d[2]); }
function edMsg(t) { $('edMsg').textContent = t; }
function sampleColors() {
  $('edHair').value = ED.prev.hair = skinPixel(12, 3);
  $('edSkin').value = ED.prev.skin = skinPixel(20, 4);
  $('edShirt').value = ED.prev.shirt = skinPixel(23, 25);
}
// grid (built once)
const gridEl = $('edGrid');
for (let k = 0; k < 64; k++) { const d = document.createElement('div'); d.dataset.x = k % 8; d.dataset.y = k >> 3; gridEl.appendChild(d); }
$('edSwatches').innerHTML = ED_SWATCHES.map(c => `<div class="sw" data-c="${c}" style="background:${c}"></div>`).join('');
function edSetColor(c) { ED.color = c; $('edPick').value = c; $('edSwatches').querySelectorAll('.sw').forEach(el => el.classList.toggle('on', el.dataset.c === c)); }
$('edSwatches').onclick = e => { const c = e.target.dataset?.c; if (c) edSetColor(c); };
$('edPick').oninput = e => edSetColor(e.target.value);
function edRender() {
  const front = skinPart(ED.skin, 8, 8, 8, 8).getContext('2d').getImageData(0, 0, 8, 8).data;
  gridEl.querySelectorAll('div').forEach((el, k) => { el.style.background = toHex(front[k * 4], front[k * 4 + 1], front[k * 4 + 2]); });
  ED.dirty = true;
}
function edPaintAt(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY); if (!el || el.parentElement !== gridEl) return;
  const x = +el.dataset.x, y = +el.dataset.y, g = edG();
  g.fillStyle = ED.color; g.fillRect(8 + x, 8 + y, 1, 1); g.clearRect(40 + x, 8 + y, 1, 1);
  el.style.background = ED.color; ED.dirty = true;
}
gridEl.addEventListener('pointerdown', e => { e.preventDefault(); if (e.button === 2) return; ED.painting = true; edPaintAt(e.clientX, e.clientY); });
gridEl.addEventListener('pointermove', e => { if (ED.painting) edPaintAt(e.clientX, e.clientY); });
addEventListener('pointerup', () => { ED.painting = false; });
gridEl.addEventListener('contextmenu', e => { e.preventDefault(); const el = e.target; if (el.parentElement === gridEl) { const c = el.style.background.match(/\d+/g); if (c) edSetColor(toHex(+c[0], +c[1], +c[2])); } });
// recolor: shift every pixel close to the old color, keeping its shading
function recolor(field, regions, newHex) {
  const old = hexRgb(ED.prev[field]), nw = hexRgb(newHex), g = edG();
  for (const [x, y, w, h] of regions) {
    const d = g.getImageData(x, y, w, h);
    for (let k = 0; k < d.data.length; k += 4) {
      if (!d.data[k + 3]) continue;
      const dr = d.data[k] - old[0], dg = d.data[k + 1] - old[1], db = d.data[k + 2] - old[2];
      if (dr * dr + dg * dg + db * db > 40 * 40) continue;
      d.data[k] = nw[0] + dr; d.data[k + 1] = nw[1] + dg; d.data[k + 2] = nw[2] + db;
    }
    g.putImageData(d, x, y);
  }
  ED.prev[field] = newHex; edRender();
}
$('edHair').oninput = e => recolor('hair', [[0, 0, 64, 16]], e.target.value);
$('edSkin').oninput = e => recolor('skin', [[0, 0, 32, 16], [40, 16, 16, 16]], e.target.value);
$('edShirt').oninput = e => recolor('shirt', [[16, 16, 24, 16], [40, 16, 16, 16]], e.target.value);
$('edKart').oninput = () => { ED.dirty = true; };
$('edName').oninput = () => { ED.dirty = true; };
// templates
$('edTemplates').innerHTML = PRESETS.map((p, k) => `<img class="px" data-k="${k}" src="${roster[k].faceURL}" title="Start from ${p.name}">`).join('') + '<button class="mc-btn tiny" id="edBlank">Blank</button>';
$('edTemplates').onclick = e => {
  if (e.target.id === 'edBlank') { const hair = $('edHair').value, skin = $('edSkin').value, g = edG(); g.clearRect(0, 0, 64, 64); paintHead(g, hair, skin, 2); paintFace(g, ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWKSSKWS', 'SSSSSSSS', 'SSSMMSSS', 'SSSSSSSS'], { H: hair, S: skin, W: '#ffffff', K: '#1d1d1d', M: '#8a4a3a' }); paintShirt(g, $('edShirt').value); sampleColors(); edRender(); return; }
  const k = e.target.dataset?.k; if (k === undefined) return;
  const g = edG(); g.clearRect(0, 0, 64, 64); g.drawImage(roster[+k].skin, 0, 0); sampleColors(); edRender();
};
// import a skin file (stays local: read in the browser, saved only to this browser's storage)
async function importSkin(file) {
  if (!file) return;
  if (!/png$/i.test(file.type) && !/\.png$/i.test(file.name)) { edMsg('Please pick a PNG skin file.'); return; }
  if (file.size > 300000) { edMsg('That file is too big to be a skin.'); return; }
  const url = URL.createObjectURL(file);
  try {
    const skin = imageToSkin(await loadImage(url));
    if (!skin) { edMsg('Skins must be 64x64 (or 64x32) pixels.'); return; }
    edG().clearRect(0, 0, 64, 64); edG().drawImage(skin, 0, 0); sampleColors(); edRender();
    if (!$('edName').value.trim()) $('edName').value = file.name.replace(/\.png$/i, '').slice(0, 12);
    edMsg('Skin loaded! Tweak it or hit Save.');
  } catch { edMsg("Couldn't read that image."); } finally { URL.revokeObjectURL(url); }
}
$('edImport').onclick = () => { click(); $('edFile').click(); };
$('edFile').onchange = e => { importSkin(e.target.files[0]); e.target.value = ''; };
$('editor').addEventListener('dragover', e => e.preventDefault());
$('editor').addEventListener('drop', e => { e.preventDefault(); importSkin(e.dataTransfer.files[0]); });
function openEditor(racer) {
  ED.editing = racer; ED.skin = newSkin(); ED.delArmed = false; ED.spin = 0;
  if (racer) { edG().drawImage(racer.skin, 0, 0); $('edName').value = racer.name; $('edKart').value = racer.kart; }
  else { edG().drawImage(roster[(Math.random() * PRESETS.length) | 0].skin, 0, 0); $('edName').value = ''; $('edKart').value = ['#e0408a', '#8b4dd9', '#f2d03b', '#2fd4e8'][(Math.random() * 4) | 0]; }
  sampleColors(); edSetColor('#1d1d1d');
  $('edTitle').textContent = racer ? 'Edit Racer' : 'Create Your Racer';
  $('edDelete').classList.toggle('hidden', !racer); $('edDelete').textContent = 'Delete Racer';
  edMsg('');
  G.state = 'editor'; $('menu').classList.add('hidden'); $('editor').classList.remove('hidden');
  edRender();
}
function closeEditor() {
  if (ED.preview) { scene.remove(ED.preview.group); scene.remove(ED.preview.shadow); ED.preview = null; }
  showMenu();
}
function rebuildPreview() {
  if (ED.preview) { scene.remove(ED.preview.group); scene.remove(ED.preview.shadow); }
  const r = makeRacer(ED.skin, { id: 'preview', name: $('edName').value || 'Racer', kart: $('edKart').value });
  ED.preview = buildKart(r, false); scene.add(ED.preview.group); scene.add(ED.preview.shadow);
}
const edAt = 40, edV = new THREE.Vector3(), edRight = new THREE.Vector3();
function editorView(dt) {
  ED.rebuildT -= dt;
  if (ED.dirty && ED.rebuildT <= 0) { ED.dirty = false; ED.rebuildT = 0.12; rebuildPreview(); }
  const i = edAt, x = PX[i], z = PZ[i];
  ED.spin += dt * 0.7;
  if (ED.preview) { ED.preview.group.position.set(x, 0, z); ED.preview.group.rotation.y = ED.spin; ED.preview.shadow.position.set(x, 0.07, z); ED.preview.shadow.rotation.z = ED.spin; ED.preview.wheels.forEach(w => w.rotation.x += dt * 3); }
  camera.position.set(x + TXa[i] * 7.5 + NX[i] * 1.5, 3.4, z + TZa[i] * 7.5 + NZ[i] * 1.5);
  edV.set(x, 1.4, z); camera.lookAt(edV); camera.updateMatrixWorld();
  if (innerWidth > 900) { edRight.setFromMatrixColumn(camera.matrixWorld, 0); edV.addScaledVector(edRight, -3.2); camera.lookAt(edV); }
  if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
}
$('edSave').onclick = () => {
  click();
  const name = ($('edName').value.trim() || 'Racer').slice(0, 12);
  const skin = newSkin(); skin.getContext('2d').drawImage(ED.skin, 0, 0);
  const id = ED.editing ? ED.editing.id : 'c' + Date.now().toString(36);
  const r = makeRacer(skin, { id, name, kart: $('edKart').value, custom: true });
  const k = roster.findIndex(x => x.id === id); if (k >= 0) roster[k] = r; else roster.push(r);
  selectRacer(id);
  if (!saveCustomRacers()) { edMsg("Saved for this session only (browser storage is blocked)."); }
  closeEditor();
};
$('edCancel').onclick = () => { click(); closeEditor(); };
$('edDelete').onclick = () => {
  click();
  if (!ED.delArmed) { ED.delArmed = true; $('edDelete').textContent = 'Click again to delete'; return; }
  const k = roster.findIndex(x => x.id === ED.editing.id); if (k >= 0) roster.splice(k, 1);
  saveCustomRacers(); closeEditor();
};
function click() { Audio.init(); Audio.tone(660, 0.05, 'square', 0.08); }
$('btnStart').onclick = () => { click(); document.activeElement?.blur(); if (isTouch) setTimeout(() => { try { const r = document.documentElement; (r.requestFullscreen ? r.requestFullscreen() : Promise.reject()).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {}); } catch {} }, 600); setupRace(); };
$('btnDiff').onclick = () => { click(); diffIdx = (diffIdx + 1) % DIFF.length; $('btnDiff').textContent = 'Difficulty: ' + DIFF[diffIdx].name; };
$('btnLaps').onclick = () => { click(); laps = laps === 3 ? 5 : laps === 5 ? 1 : 3; $('btnLaps').textContent = 'Laps: ' + laps; };
function setSound(v) { Audio.setOn(v); $('btnSound').textContent = 'Sound: ' + (v ? 'ON' : 'OFF'); }
$('btnSound').onclick = () => { Audio.init(); setSound(!Audio.on); click(); };
$('btnResume').onclick = () => { click(); togglePause(); };
$('btnRestart').onclick = () => { click(); setupRace(); };
$('btnQuit').onclick = () => { click(); showMenu(); };
$('btnAgain').onclick = () => { click(); setupRace(); };
$('btnTitle').onclick = () => { click(); showMenu(); };
function togglePause() {
  if (G.state === 'paused') { G.state = G.pausedFrom; $('pause').classList.add('hidden'); last = performance.now(); Audio.ctx?.resume(); return; }
  if (G.state === 'race' || G.state === 'countdown') { G.pausedFrom = G.state; G.state = 'paused'; $('pause').classList.remove('hidden'); Audio.engine(0, false, false); Audio.drift(0); }
}
// touch buttons
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); Audio.init(); if (k === 'pause') { togglePause(); return; } if (k === 'craft') { if (G.state === 'race') G.craftPressed = true; return; } touchState[k] = true; b.classList.add('on'); };
  const off = e => { e.preventDefault(); if (k === 'pause' || k === 'craft') return; touchState[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
if (isTouch) document.body.classList.add('touch');

// =====================================================================
//  BOOT
// =====================================================================
requestAnimationFrame(frame);
const fontReady = Promise.race([document.fonts ? document.fonts.load('28px "Press Start 2P"') : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
fontReady.catch(() => {}).then(async () => {
  buildWorld(); buildArch(); placeObjects(); placeOres(); buildShrooms();
  await loadCustomRacers();
  $('loading').classList.add('hidden');
  const i0 = 0; camera.position.set(PX[i0] + 30, 20, PZ[i0]); camLook.set(PX[40], 0, PZ[40]);
  showMenu();
  window.__game = { G, cars, get player() { return player; }, setupRace, N, keys, renderer, shrooms, crates, carve, camera, PX, PZ, TXa, TZa };
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
