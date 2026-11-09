/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Graph + background width. */
const GW = 433;
/** +17 so the head circle's halo isn't cropped at the right edge. */
export const DETECTION_LINE_ARTBOARD_WIDTH = GW + 17;
const CH = 300;
/** Edge-to-edge (banner) has no artboard padding. */
const BLEED_PAD = 0;

export const detectionLineArtboardHeight = (pad: number): number => pad * 2 + CH;

/** Edge-to-edge artboard ratio — hosts size to this so nothing is cropped. */
export const DETECTION_LINE_BLEED_ASPECT = `${DETECTION_LINE_ARTBOARD_WIDTH} / ${detectionLineArtboardHeight(
  BLEED_PAD
)}`;

/** Chart canvas height used when allocating the offscreen buffer. */
export const DETECTION_LINE_CHART_HEIGHT = CH;

/** Visible data points (dense, so small ripples can show). */
const N = 43;
/** Head circle sits on the very right edge of the graph, at the last point. */
const HEAD_X = GW;
const HEAD_I = N - 1;
/** 600-pt periodic data / 16s loop → points per second. */
const SPEED = 600 / 16;
const TAU = Math.PI * 2;
const PERIOD = 600;
const w = (k: number) => (k * TAU) / PERIOD;
/** Overall speed multiplier. */
export const DETECTION_LINE_PLAYBACK = 0.13;
/** Frame used when reduced motion is on — detection mid-rise. */
export const DETECTION_LINE_STATIC_FRAME_S = 10;

type Rgb = readonly [number, number, number];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Smootherstep — gentler than {@link smooth} at both ends. */
const ease = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgba = (c: Rgb, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Detection level over the loop: 0 = teal, 0.5 = blue, 1 = pink. */
const PHASE = {
  rise: 0.25,
  blue: 0.6,
  toPink: 1.2,
  pink: 0.5,
  toBlue: 1.2,
  blueOut: 0.3,
  fall: 1.8,
};

/**
 * Detection cycle length (same loop units). The phases above add up to ~5.9, so
 * this leaves only a short calm teal stretch before the next rise.
 */
const ACTIVITY_T = 7.5;

function activity(time: number): number {
  const t = ((time % ACTIVITY_T) + ACTIVITY_T) % ACTIVITY_T;
  let x = t;
  const P = PHASE;
  if (x <= 0) return 0;
  if (x < P.rise) return 0.5 * ease(0, P.rise, x);
  x -= P.rise;
  if (x < P.blue) return 0.5;
  x -= P.blue;
  if (x < P.toPink) return 0.5 + 0.5 * ease(0, P.toPink, x);
  x -= P.toPink;
  if (x < P.pink) return 1;
  x -= P.pink;
  if (x < P.toBlue) return 1 - 0.5 * ease(0, P.toBlue, x);
  x -= P.toBlue;
  if (x < P.blueOut) return 0.5;
  x -= P.blueOut;
  if (x < P.fall) return 0.5 * (1 - ease(0, P.fall, x));
  return 0;
}

/** Each data point keeps a fixed value / colour from the moment it enters on the right. */
function pointAt(j: number): { v: number; c: number } {
  const a = activity((j - HEAD_I) / SPEED);
  const m = 1 + 0.6 * Math.sin(w(6) * j + 0.5) * Math.sin(w(19) * j + 1.7);
  const n =
    0.25 * Math.sin(w(8) * j + 0.7) +
    0.18 * Math.sin(w(15) * j + 1.4) +
    0.12 * Math.sin(w(27) * j + 2.3) +
    0.09 * Math.sin(w(41) * j + 0.4) +
    0.06 * Math.sin(w(47) * j + 1.9) +
    m *
      (0.13 * Math.sin(w(70) * j + 0.9) +
        0.105 * Math.sin(w(97) * j + 2.6) +
        0.09 * Math.sin(w(131) * j + 1.1) +
        0.065 * Math.sin(w(173) * j + 0.3));
  const level = 0.22 + 0.56 * a;
  const amp = 0.06 + 0.1 * a;
  return { v: level + amp * n, c: a };
}

type LineColors = { teal: Rgb; blue: Rgb; pink: Rgb };

const colorFor = (c: number, colors: LineColors): Rgb =>
  c <= 0.5
    ? mix(colors.teal, colors.blue, smooth(0.02, 0.5, c))
    : mix(colors.blue, colors.pink, smooth(0.5, 1, c));

/** `px` = artboard units per CSS pixel, so the chart line renders at a fixed 2px. */
export type DetectionLinePalette = {
  grid: string;
  dotFill: string;
  px: number;
  /** Corner radius in CSS px (from an EUI `border.radius.*` token). */
  cornerRadiusPx: number;
  line: LineColors;
};

/**
 * Prototype banner media width — used to freeze dot radii to the on-screen size
 * they had at that layout, independent of the current media scale.
 */
const PROTOTYPE_MEDIA_WIDTH_PX = 261;

/** Stroke widths locked in CSS px (converted via `palette.px`). */
const GRID_LINE_CSS_PX = 1;
const OUTLINE_CSS_PX = 1;
const CHART_LINE_CSS_PX = 2;
const CHART_GLOW_CSS_PX = CHART_LINE_CSS_PX * 3.1;
const DOT_BORDER_CSS_PX = 2;
/** Prototype artboard radii 6 / 12 at {@link PROTOTYPE_MEDIA_WIDTH_PX}. */
const DOT_CORE_CSS_PX = (6 * PROTOTYPE_MEDIA_WIDTH_PX) / DETECTION_LINE_ARTBOARD_WIDTH;
const DOT_HALO_CSS_PX = (12 * PROTOTYPE_MEDIA_WIDTH_PX) / DETECTION_LINE_ARTBOARD_WIDTH;
/** Prototype grid dash (artboard 0.1 / 6) at the same reference width. */
const GRID_DASH_CSS_PX = (0.1 * PROTOTYPE_MEDIA_WIDTH_PX) / DETECTION_LINE_ARTBOARD_WIDTH;
const GRID_GAP_CSS_PX = (6 * PROTOTYPE_MEDIA_WIDTH_PX) / DETECTION_LINE_ARTBOARD_WIDTH;

function roundedRectPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number
): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + width - r, y);
  c.quadraticCurveTo(x + width, y, x + width, y + r);
  c.lineTo(x + width, y + height - r);
  c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  c.lineTo(x + r, y + height);
  c.quadraticCurveTo(x, y + height, x, y + height - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

export function renderDetectionLineAt(
  ctx: CanvasRenderingContext2D,
  octx: CanvasRenderingContext2D,
  off: HTMLCanvasElement,
  dpr: number,
  palette: DetectionLinePalette,
  t: number
): void {
  const pad = BLEED_PAD;
  const W = DETECTION_LINE_ARTBOARD_WIDTH;
  const H = detectionLineArtboardHeight(pad);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const L = 0;
  const R = GW;
  const cw = R - L;
  const top = pad;
  const base = top + CH;
  const HX = HEAD_X;
  const step = cw / (N - 1);
  const off0 = t * SPEED;
  const j0 = Math.floor(off0) - 1;

  type Pt = { X: number; Y: number; c: number; col: Rgb; s: number };
  const pts: Pt[] = [];
  for (let j = j0; j <= j0 + N + 3; j++) {
    const p = pointAt(j);
    const X = L + (j - off0) * step;
    pts.push({
      X,
      Y: base - p.v * CH * 0.95,
      c: p.c,
      col: colorFor(p.c, palette.line),
      s: Math.min(1, Math.max(0, (X - L) / cw)),
    });
  }
  const M = pts.length;

  /** Convert a CSS-px length into artboard units for the current display scale. */
  const u = (cssPx: number) => cssPx * palette.px;
  const cornerR = u(palette.cornerRadiusPx);
  const bg = ctx.createLinearGradient(L, 0, R, 0);
  pts.forEach((p) => bg.addColorStop(p.s, rgba(p.col, 0.08 + 0.02 * smooth(0.03, 0.4, p.c))));
  ctx.fillStyle = bg;
  roundedRectPath(ctx, L, top, cw, CH, cornerR);
  ctx.fill();

  const outline = ctx.createLinearGradient(L, 0, R, 0);
  pts.forEach((p) => outline.addColorStop(p.s, rgba(p.col, 0.28)));
  const outlineWidth = u(OUTLINE_CSS_PX);
  const half = outlineWidth / 2;
  ctx.strokeStyle = outline;
  ctx.lineWidth = outlineWidth;
  roundedRectPath(ctx, L + half, top + half, cw - half * 2, CH - half * 2, cornerR);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = u(GRID_LINE_CSS_PX);
  ctx.lineCap = 'round';
  ctx.setLineDash([u(GRID_DASH_CSS_PX), u(GRID_GAP_CSS_PX)]);
  ctx.beginPath();
  [1 / 4, 2 / 4, 3 / 4].forEach((fraction) => {
    const y = top + CH * fraction;
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
  });
  ctx.stroke();
  ctx.restore();

  const curve = (c2: CanvasRenderingContext2D, dy: number) => {
    c2.moveTo(pts[0]!.X, pts[0]!.Y - dy);
    for (let i = 1; i < M - 1; i++) {
      c2.quadraticCurveTo(
        pts[i]!.X,
        pts[i]!.Y - dy,
        (pts[i]!.X + pts[i + 1]!.X) / 2,
        (pts[i]!.Y + pts[i + 1]!.Y) / 2 - dy
      );
    }
    c2.lineTo(pts[M - 1]!.X, pts[M - 1]!.Y - dy);
  };

  ctx.save();
  roundedRectPath(ctx, L, top, HX - L, CH, cornerR);
  ctx.clip();

  const oy = top - 5;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.globalCompositeOperation = 'source-over';
  octx.clearRect(0, 0, W, CH + 10);
  const hg = octx.createLinearGradient(L, 0, R, 0);
  pts.forEach((p) => hg.addColorStop(p.s, rgba(p.col, 1)));
  octx.beginPath();
  curve(octx, oy);
  octx.lineTo(pts[M - 1]!.X, CH + 5);
  octx.lineTo(pts[0]!.X, CH + 5);
  octx.closePath();
  octx.fillStyle = hg;
  octx.fill();
  octx.globalCompositeOperation = 'destination-in';
  const vg = octx.createLinearGradient(0, 0, 0, CH + 5);
  vg.addColorStop(0, 'rgba(0,0,0,0.38)');
  vg.addColorStop(1, 'rgba(0,0,0,0)');
  octx.fillStyle = vg;
  octx.fillRect(0, 0, W, CH + 10);
  ctx.drawImage(off, 0, 0, off.width, off.height, 0, oy, W, CH + 10);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lg = ctx.createLinearGradient(L, 0, R, 0);
  const glow = ctx.createLinearGradient(L, 0, R, 0);
  pts.forEach((p) => {
    lg.addColorStop(p.s, rgba(p.col, 1));
    glow.addColorStop(p.s, rgba(p.col, 0.16));
  });
  ctx.beginPath();
  curve(ctx, 0);
  ctx.strokeStyle = glow;
  ctx.lineWidth = u(CHART_GLOW_CSS_PX);
  ctx.stroke();
  ctx.strokeStyle = lg;
  ctx.lineWidth = u(CHART_LINE_CSS_PX);
  ctx.stroke();
  ctx.restore();

  for (let i = 1; i < M - 1; i++) {
    const A = {
      X: (pts[i - 1]!.X + pts[i]!.X) / 2,
      Y: (pts[i - 1]!.Y + pts[i]!.Y) / 2,
    };
    const B = {
      X: (pts[i]!.X + pts[i + 1]!.X) / 2,
      Y: (pts[i]!.Y + pts[i + 1]!.Y) / 2,
    };
    if (HX < A.X || HX > B.X) continue;
    const tAlong = (HX - A.X) / (B.X - A.X);
    const y =
      (1 - tAlong) * (1 - tAlong) * A.Y +
      2 * tAlong * (1 - tAlong) * pts[i]!.Y +
      tAlong * tAlong * B.Y;
    const lo = pts[i]!.X <= HX ? i : i - 1;
    const f = (HX - pts[lo]!.X) / (pts[lo + 1]!.X - pts[lo]!.X);
    const col = colorFor(pts[lo]!.c + (pts[lo + 1]!.c - pts[lo]!.c) * f, palette.line);
    ctx.fillStyle = rgba(col, 0.18);
    ctx.beginPath();
    ctx.arc(HX, y, u(DOT_HALO_CSS_PX), 0, TAU);
    ctx.fill();
    ctx.fillStyle = palette.dotFill;
    ctx.strokeStyle = rgba(col, 1);
    ctx.lineWidth = u(DOT_BORDER_CSS_PX);
    ctx.beginPath();
    ctx.arc(HX, y, u(DOT_CORE_CSS_PX), 0, TAU);
    ctx.fill();
    ctx.stroke();
    break;
  }
}
