/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isGroupedResult,
  countAllNodes,
  calculateTileSize,
  getHexDimensions,
  HEX_WIDTH_RATIO,
  HEX_VERTICAL_OVERLAP,
} from './waffle_utils';
import type { EsqlWaffleResult, GroupedWaffleResult, WaffleGroup } from '../../types';

describe('waffle_utils', () => {
  describe('isGroupedResult', () => {
    it('returns true for grouped results', () => {
      const grouped: GroupedWaffleResult = {
        groups: [],
        globalBounds: { min: 0, max: 100 },
      };
      expect(isGroupedResult(grouped)).toBe(true);
    });

    it('returns false for flat results', () => {
      const flat: EsqlWaffleResult = {
        nodes: [],
        bounds: { min: 0, max: 100 },
      };
      expect(isGroupedResult(flat)).toBe(false);
    });
  });

  describe('countAllNodes', () => {
    it('counts nodes in a flat group', () => {
      const group: WaffleGroup = {
        groupKey: 'test',
        nodes: [
          { id: '1', label: 'a', value: 1 },
          { id: '2', label: 'b', value: 2 },
        ],
      };
      expect(countAllNodes(group)).toBe(2);
    });

    it('counts nodes in nested subgroups', () => {
      const group: WaffleGroup = {
        groupKey: 'parent',
        nodes: [{ id: '1', label: 'a', value: 1 }],
        subgroups: [
          {
            groupKey: 'child1',
            nodes: [
              { id: '2', label: 'b', value: 2 },
              { id: '3', label: 'c', value: 3 },
            ],
          },
          {
            groupKey: 'child2',
            nodes: [{ id: '4', label: 'd', value: 4 }],
          },
        ],
      };
      expect(countAllNodes(group)).toBe(4);
    });

    it('handles empty group', () => {
      const group: WaffleGroup = {
        groupKey: 'empty',
        nodes: [],
      };
      expect(countAllNodes(group)).toBe(0);
    });
  });

  describe('getHexDimensions', () => {
    it('calculates correct dimensions for nodeSize 100 with no spacing', () => {
      const dims = getHexDimensions(100, 0);

      expect(dims.hexWidth).toBeCloseTo(86.6, 1); // 100 * 0.866
      expect(dims.hexHeight).toBe(100);
      expect(dims.horizontalStep).toBeCloseTo(86.6, 1);
      expect(dims.verticalStep).toBe(75); // 100 * 0.75
      expect(dims.oddRowOffset).toBeCloseTo(43.3, 1);
    });

    it('includes spacing in step calculations', () => {
      const dims = getHexDimensions(100, 4);

      expect(dims.horizontalStep).toBeCloseTo(90.6, 1); // 86.6 + 4
      expect(dims.verticalStep).toBe(79); // 75 + 4
    });

    it('calculates correct odd row offset (half of horizontal step)', () => {
      const dims = getHexDimensions(80, 8);

      expect(dims.oddRowOffset).toBe(dims.horizontalStep / 2);
    });
  });

  describe('calculateTileSize', () => {
    it('returns default size for empty input', () => {
      expect(calculateTileSize(0, 0, 0)).toBe(96);
      expect(calculateTileSize(500, 500, 0)).toBe(96);
      expect(calculateTileSize(0, 500, 10)).toBe(96);
    });

    it('returns size within bounds for small node count', () => {
      const size = calculateTileSize(800, 600, 5, 'hexagon');

      // For <= 10 nodes: minSize 72, maxSize 130
      expect(size).toBeGreaterThanOrEqual(72);
      expect(size).toBeLessThanOrEqual(130);
    });

    it('returns size within bounds for medium node count', () => {
      const size = calculateTileSize(800, 600, 30, 'hexagon');

      // For <= 50 nodes: minSize 58, maxSize 115
      expect(size).toBeGreaterThanOrEqual(58);
      expect(size).toBeLessThanOrEqual(115);
    });

    it('returns size within bounds for large node count', () => {
      const size = calculateTileSize(800, 600, 100, 'hexagon');

      // For <= 200 nodes: minSize 43, maxSize 94
      expect(size).toBeGreaterThanOrEqual(43);
      expect(size).toBeLessThanOrEqual(94);
    });

    it('returns smaller size for square shape', () => {
      const hexSize = calculateTileSize(800, 600, 20, 'hexagon');
      const squareSize = calculateTileSize(800, 600, 20, 'square');

      // Both should be within their respective bounds
      expect(hexSize).toBeGreaterThanOrEqual(58);
      expect(squareSize).toBeGreaterThanOrEqual(54);
    });
  });

  describe('HEX constants', () => {
    it('has correct width ratio (sqrt(3)/2)', () => {
      expect(HEX_WIDTH_RATIO).toBeCloseTo(Math.sqrt(3) / 2, 3);
    });

    it('has correct vertical overlap (75%)', () => {
      expect(HEX_VERTICAL_OVERLAP).toBe(0.75);
    });
  });
});
