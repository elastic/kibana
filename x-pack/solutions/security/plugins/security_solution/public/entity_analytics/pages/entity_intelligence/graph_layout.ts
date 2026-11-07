/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure radial-layout math for the relationship graph. Kept free of React / EUI
 * so the placement rules (minimum angular separation, ring overflow, badge
 * offset, label collision) are deterministic and unit-testable.
 */

export interface Point {
  x: number;
  y: number;
}

/** A resolved slot on a ring: polar angle (radians) + ring radius (px). */
export interface RingSlot {
  angle: number;
  radius: number;
}

/**
 * Approximate on-canvas footprint (px) a node occupies tangentially on its
 * ring: the node diameter plus a gap so adjacent nodes (and their badges) do
 * not touch. Used to derive the minimum angular step at a given radius.
 */
export const NODE_FOOTPRINT = 84;

/** Extra radius added per overflow ring when a ring can't hold all nodes. */
export const RING_STEP = 116;

/**
 * Minimum angle (radians) between two node centers on a ring of `radius` so
 * their footprints do not overlap. Derived from chord geometry: the tangential
 * arc length must be at least one footprint. Clamped so tiny radii don't demand
 * an impossible (>2π) step.
 */
export const minAngularStep = (radius: number, footprint: number = NODE_FOOTPRINT): number => {
  const safeRadius = Math.max(1, radius);
  const step = footprint / safeRadius;
  return Math.min(step, Math.PI * 2);
};

/**
 * How many nodes a full ring of `radius` can hold while preserving the minimum
 * angular separation. Always at least 1.
 */
export const ringCapacity = (radius: number, footprint: number = NODE_FOOTPRINT): number =>
  Math.max(1, Math.floor((Math.PI * 2) / minAngularStep(radius, footprint)));

/**
 * Distributes `count` nodes across one or more concentric rings starting at
 * `baseRadius`. A ring only holds as many nodes as `ringCapacity` allows at the
 * minimum separation; the remainder spills onto the next ring (baseRadius +
 * RING_STEP, etc.). Returns one slot per node, in input order, so callers can
 * zip results back onto a stably-sorted node list. Nodes on each ring are
 * evenly spread and each ring is rotated by a half-step to avoid radial
 * "spokes" of stacked labels between rings.
 */
export const distributeRadial = (
  count: number,
  baseRadius: number,
  footprint: number = NODE_FOOTPRINT
): RingSlot[] => {
  if (count <= 0) return [];
  const slots: RingSlot[] = [];
  let remaining = count;
  let ring = 0;
  while (remaining > 0) {
    const radius = baseRadius + ring * RING_STEP;
    const capacity = ringCapacity(radius, footprint);
    const onThisRing = Math.min(remaining, capacity);
    const rotation = ring % 2 === 0 ? 0 : Math.PI / Math.max(onThisRing, 1);
    for (let index = 0; index < onThisRing; index++) {
      const angle = (index / onThisRing) * Math.PI * 2 - Math.PI / 2 + rotation;
      slots.push({ angle, radius });
    }
    remaining -= onThisRing;
    ring += 1;
  }
  return slots;
};

/**
 * Consistent alert-count badge offset (top-right of a node ring). Returns the
 * badge center relative to the node center, so every badge sits in the same
 * quadrant and never stacks on the node icon or label.
 */
export const badgeOffset = (radius: number): Point => {
  // 45° up-and-right on the node circle, nudged out by a few px.
  const diagonal = radius * Math.SQRT1_2;
  return { x: diagonal + 3, y: -(diagonal + 3) };
};

/**
 * Determines which node labels to hide to avoid label-on-label collisions.
 * Greedy sweep: labels are considered in priority order (lower `priority`
 * value = kept first, e.g. selected/focused/root). A label is hidden when its
 * bounding box overlaps an already-kept label's box. Returns the set of node
 * ids whose labels should be hidden.
 */
export interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}

const boxesOverlap = (a: LabelBox, b: LabelBox): boolean => {
  const ax0 = a.x - a.width / 2;
  const ax1 = a.x + a.width / 2;
  const ay0 = a.y - a.height / 2;
  const ay1 = a.y + a.height / 2;
  const bx0 = b.x - b.width / 2;
  const bx1 = b.x + b.width / 2;
  const by0 = b.y - b.height / 2;
  const by1 = b.y + b.height / 2;
  return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
};

export const hiddenLabelIds = (labels: readonly LabelBox[]): Set<string> => {
  const ordered = [...labels].sort((left, right) => left.priority - right.priority);
  const kept: LabelBox[] = [];
  const hidden = new Set<string>();
  for (const label of ordered) {
    if (kept.some((other) => boxesOverlap(label, other))) {
      hidden.add(label.id);
    } else {
      kept.push(label);
    }
  }
  return hidden;
};

/** A rectangle in screen space, described by its center + size. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Candidate side for placing the floating action toolbar around a node. */
export type ToolbarSide = 'below' | 'above' | 'right' | 'left';

export interface ToolbarPlacement {
  /** Top-left corner (screen px) at which to render the toolbar. */
  x: number;
  y: number;
  side: ToolbarSide;
}

const rectsOverlapArea = (a: Rect, b: Rect): number => {
  const ax0 = a.x - a.width / 2;
  const ax1 = a.x + a.width / 2;
  const ay0 = a.y - a.height / 2;
  const ay1 = a.y + a.height / 2;
  const bx0 = b.x - b.width / 2;
  const bx1 = b.x + b.width / 2;
  const by0 = b.y - b.height / 2;
  const by1 = b.y + b.height / 2;
  const overlapX = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0));
  const overlapY = Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
  return overlapX * overlapY;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Picks a collision-safe screen position for the floating action toolbar of a
 * selected node. Tries below → above → right → left, scoring each candidate by
 * how much its (viewport-clamped) rectangle would overlap nearby obstacles
 * (neighbor node footprints, edge-count chips). The lowest-occlusion side wins;
 * the returned top-left corner is always fully inside the viewport padding so
 * the toolbar never clips a canvas edge.
 *
 * All inputs are screen-space (already pan/zoom transformed) so this stays a
 * pure geometry function independent of React / SVG.
 */
export const chooseToolbarPlacement = (
  node: Point,
  nodeRadius: number,
  toolbar: { width: number; height: number },
  viewport: { width: number; height: number },
  obstacles: readonly Rect[],
  gap = 14,
  padding = 12
): ToolbarPlacement => {
  const halfW = toolbar.width / 2;
  const halfH = toolbar.height / 2;
  const minCenterX = padding + halfW;
  const maxCenterX = viewport.width - padding - halfW;
  const minCenterY = padding + halfH;
  const maxCenterY = viewport.height - padding - halfH;

  const candidates: Array<{ side: ToolbarSide; cx: number; cy: number }> = [
    { side: 'below', cx: node.x, cy: node.y + nodeRadius + gap + halfH },
    { side: 'above', cx: node.x, cy: node.y - nodeRadius - gap - halfH },
    { side: 'right', cx: node.x + nodeRadius + gap + halfW, cy: node.y },
    { side: 'left', cx: node.x - nodeRadius - gap - halfW, cy: node.y },
  ];

  let best: ToolbarPlacement | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const cx = clamp(candidate.cx, minCenterX, maxCenterX);
    const cy = clamp(candidate.cy, minCenterY, maxCenterY);
    const rect: Rect = { x: cx, y: cy, width: toolbar.width, height: toolbar.height };
    // Penalize both obstacle occlusion and how far clamping had to drag the
    // toolbar away from its ideal (off-viewport candidates get pushed back and
    // thus score worse, favoring a side that fits naturally).
    const occlusion = obstacles.reduce(
      (sum, obstacle) => sum + rectsOverlapArea(rect, obstacle),
      0
    );
    const clampPenalty =
      Math.abs(cx - candidate.cx) +
      Math.abs(cy - candidate.cy) +
      rectsOverlapArea(rect, {
        x: node.x,
        y: node.y,
        width: nodeRadius * 2,
        height: nodeRadius * 2,
      });
    const score = occlusion * 4 + clampPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = { x: cx - halfW, y: cy - halfH, side: candidate.side };
    }
  }
  // `candidates` is non-empty so `best` is always assigned.
  return best as ToolbarPlacement;
};
