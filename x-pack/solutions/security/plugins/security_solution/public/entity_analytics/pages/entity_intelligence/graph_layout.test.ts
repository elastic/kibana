/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LabelBox, Point, Rect, RingSlot } from './graph_layout';
import {
  badgeOffset,
  chooseToolbarPlacement,
  distributeRadial,
  hiddenLabelIds,
  minAngularStep,
  NODE_FOOTPRINT,
  RING_STEP,
  ringCapacity,
} from './graph_layout';

const slotToPoint = (center: Point, slot: RingSlot): Point => ({
  x: center.x + Math.cos(slot.angle) * slot.radius,
  y: center.y + Math.sin(slot.angle) * slot.radius,
});

describe('graph layout math', () => {
  describe('minAngularStep', () => {
    it('shrinks the required angle as the ring grows', () => {
      expect(minAngularStep(400)).toBeLessThan(minAngularStep(200));
    });

    it('never exceeds a full turn for tiny radii', () => {
      expect(minAngularStep(1)).toBeLessThanOrEqual(Math.PI * 2);
    });
  });

  describe('distributeRadial', () => {
    it('keeps every node on a full ring at least one footprint apart', () => {
      const center = { x: 0, y: 0 };
      const count = ringCapacity(240);
      const slots = distributeRadial(count, 240);
      expect(slots.every((slot) => slot.radius === 240)).toBe(true);

      const points = slots.map((slot) => slotToPoint(center, slot));
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          // Adjacent nodes on the ring must clear (roughly) one footprint; use a
          // tolerance because the *closest* pair is the adjacent one.
          if (Math.abs(i - j) === 1 || (i === 0 && j === points.length - 1)) {
            expect(distance).toBeGreaterThanOrEqual(NODE_FOOTPRINT * 0.9);
          }
        }
      }
    });

    it('spills overflow onto concentric outer rings when a ring is crowded', () => {
      const baseRadius = 200;
      const perRing = ringCapacity(baseRadius);
      const slots = distributeRadial(perRing + 1, baseRadius);
      const radii = new Set(slots.map((slot) => slot.radius));
      expect(radii.has(baseRadius)).toBe(true);
      expect(radii.has(baseRadius + RING_STEP)).toBe(true);
    });

    it('returns nothing for a non-positive count', () => {
      expect(distributeRadial(0, 200)).toEqual([]);
    });
  });

  describe('badgeOffset', () => {
    it('places the badge in the top-right quadrant, outside the node ring', () => {
      const offset = badgeOffset(30);
      expect(offset.x).toBeGreaterThan(0);
      expect(offset.y).toBeLessThan(0);
      // Sits on/just outside the ring so it never covers the node icon.
      expect(Math.hypot(offset.x, offset.y)).toBeGreaterThanOrEqual(30);
    });
  });

  describe('hiddenLabelIds', () => {
    const box = (id: string, x: number, priority: number): LabelBox => ({
      id,
      x,
      y: 0,
      width: 100,
      height: 25,
      priority,
    });

    it('hides the lower-priority label when two labels overlap', () => {
      const hidden = hiddenLabelIds([box('keep', 0, 0), box('drop', 20, 1)]);
      expect(hidden.has('drop')).toBe(true);
      expect(hidden.has('keep')).toBe(false);
    });

    it('keeps labels that do not overlap', () => {
      const hidden = hiddenLabelIds([box('a', 0, 0), box('b', 200, 1)]);
      expect(hidden.size).toBe(0);
    });

    it('never hides a high-priority (selected/focused/root) label', () => {
      // Two overlapping labels, but the second has higher priority (lower value).
      const hidden = hiddenLabelIds([box('low', 0, 5), box('high', 10, 0)]);
      expect(hidden.has('high')).toBe(false);
      expect(hidden.has('low')).toBe(true);
    });

    it('hides a colliding "+N" group bubble and edge chip while keeping the node label', () => {
      // A node label (priority ~1) plus an overlapping group bubble (priority 2)
      // and edge chip (priority 3) all stacked near the same point.
      const hidden = hiddenLabelIds([
        { id: 'node:a', x: 0, y: 0, width: 100, height: 25, priority: 1 },
        { id: 'group:a', x: 10, y: 0, width: 44, height: 44, priority: 2 },
        { id: 'chip:a', x: 12, y: 0, width: 96, height: 24, priority: 3 },
      ]);
      expect(hidden.has('node:a')).toBe(false);
      expect(hidden.has('group:a')).toBe(true);
      expect(hidden.has('chip:a')).toBe(true);
    });

    it('reveals a selected edge chip (priority 0) over a node label', () => {
      const hidden = hiddenLabelIds([
        { id: 'chip:sel', x: 0, y: 0, width: 96, height: 24, priority: 0 },
        { id: 'node:b', x: 10, y: 0, width: 100, height: 25, priority: 1 },
      ]);
      expect(hidden.has('chip:sel')).toBe(false);
      expect(hidden.has('node:b')).toBe(true);
    });
  });

  describe('chooseToolbarPlacement', () => {
    const viewport = { width: 800, height: 600 };
    const toolbar = { width: 220, height: 40 };
    const node: Point = { x: 400, y: 300 };

    it('places below the node when there is free space', () => {
      const placement = chooseToolbarPlacement(node, 40, toolbar, viewport, []);
      expect(placement.side).toBe('below');
      // Top-left corner sits under the node.
      expect(placement.y).toBeGreaterThan(node.y);
    });

    it('flips to a non-occluding side when a neighbor sits below the node', () => {
      const below: Rect = { x: 400, y: 380, width: 120, height: 120 };
      const placement = chooseToolbarPlacement(node, 40, toolbar, viewport, [below]);
      expect(placement.side).not.toBe('below');
    });

    it('clamps the toolbar fully within the viewport (no edge clipping)', () => {
      const corner: Point = { x: 5, y: 5 };
      const placement = chooseToolbarPlacement(corner, 40, toolbar, viewport, []);
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.y).toBeGreaterThanOrEqual(0);
      expect(placement.x + toolbar.width).toBeLessThanOrEqual(viewport.width);
      expect(placement.y + toolbar.height).toBeLessThanOrEqual(viewport.height);
    });

    it('stays within the viewport even for a node near the far corner', () => {
      const corner: Point = { x: 795, y: 595 };
      const placement = chooseToolbarPlacement(corner, 40, toolbar, viewport, []);
      expect(placement.x + toolbar.width).toBeLessThanOrEqual(viewport.width);
      expect(placement.y + toolbar.height).toBeLessThanOrEqual(viewport.height);
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.y).toBeGreaterThanOrEqual(0);
    });

    it('prefers the side that minimizes total occlusion', () => {
      // Obstacles below and above; right/left should win.
      const obstacles: Rect[] = [
        { x: 400, y: 380, width: 160, height: 160 },
        { x: 400, y: 220, width: 160, height: 160 },
      ];
      const placement = chooseToolbarPlacement(node, 40, toolbar, viewport, obstacles);
      expect(['right', 'left']).toContain(placement.side);
    });
  });
});
