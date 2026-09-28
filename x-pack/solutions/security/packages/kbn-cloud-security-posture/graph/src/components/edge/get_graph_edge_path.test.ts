/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@xyflow/react';
import {
  alignEdgeEndpoints,
  getBundleJoinX,
  getBundledHorizontalEdgePath,
  getGraphEdgePath,
} from './get_graph_edge_path';

describe('get_graph_edge_path', () => {
  describe('alignEdgeEndpoints', () => {
    it('snaps the source onto the target y so bundled edges share one endpoint', () => {
      expect(alignEdgeEndpoints(0, 100, 200, 106, Position.Right, Position.Left, 10)).toEqual({
        sourceX: 0,
        sourceY: 106,
        targetX: 200,
        targetY: 106,
      });
    });

    it('leaves endpoints unchanged when y delta exceeds the threshold', () => {
      expect(alignEdgeEndpoints(0, 100, 200, 120, Position.Right, Position.Left, 10)).toEqual({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 120,
      });
    });
  });

  describe('getBundledHorizontalEdgePath', () => {
    it('draws a full stem to the target for the leader', () => {
      const path = getBundledHorizontalEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 160,
        borderRadius: 20,
      });

      expect(path).toContain('Q');
      expect(path.endsWith('L 200,160')).toBe(true);
    });

    it('stops at the shared joinX for siblings (no final stem)', () => {
      const joinX = getBundleJoinX(0, 200);
      const path = getBundledHorizontalEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 160,
        borderRadius: 20,
        truncateAtTrunk: true,
      });

      expect(path).toContain('Q');
      expect(path.endsWith('L 200,160')).toBe(false);
      expect(path.endsWith(`${joinX},160`)).toBe(true);
    });

    it('uses the same joinX for siblings with different source Y', () => {
      const a = getBundledHorizontalEdgePath({
        sourceX: 0,
        sourceY: 40,
        targetX: 200,
        targetY: 100,
        borderRadius: 20,
        truncateAtTrunk: true,
      });
      const b = getBundledHorizontalEdgePath({
        sourceX: 0,
        sourceY: 160,
        targetX: 200,
        targetY: 100,
        borderRadius: 20,
        truncateAtTrunk: true,
      });
      const joinX = getBundleJoinX(0, 200);

      expect(a.endsWith(`${joinX},100`)).toBe(true);
      expect(b.endsWith(`${joinX},100`)).toBe(true);
    });

    it('truncates straight siblings at joinX so only the leader reaches the node', () => {
      const joinX = getBundleJoinX(0, 200);

      expect(
        getBundledHorizontalEdgePath({
          sourceX: 0,
          sourceY: 100,
          targetX: 200,
          targetY: 100,
          borderRadius: 20,
          truncateAtTrunk: true,
        })
      ).toBe(`M 0,100L ${joinX},100`);

      expect(
        getBundledHorizontalEdgePath({
          sourceX: 0,
          sourceY: 100,
          targetX: 200,
          targetY: 100,
          borderRadius: 20,
        })
      ).toBe('M 0,100L 200,100');
    });
  });

  describe('getGraphEdgePath', () => {
    it('keeps source Y on bundled near-align so relationship through-lines do not jog', () => {
      const path = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 104,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 0,
      });

      // Must start at the relationship handle Y (100), not snapped to target (104).
      expect(path.startsWith('M 0,100')).toBe(true);
      expect(path).not.toBe('M 0,104L 200,104');
    });

    it('still snaps near-align when bundling is off', () => {
      const path = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 104,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 20,
      });

      expect(path).toBe('M 0,104L 200,104');
    });

    it('returns a stepped path with soft corners when a turn is required', () => {
      const path = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 160,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 0,
      });

      expect(path).toContain('Q');
      expect(path).not.toBe('M 0,100L 200,160');
    });

    it('uses zero offset when bundled routing is enabled', () => {
      const bundledPath = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 160,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 0,
      });
      const separatedPath = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 160,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 20,
      });

      expect(bundledPath).not.toEqual(separatedPath);
    });

    it('truncates bundled siblings before the entity endpoint', () => {
      const leader = getGraphEdgePath({
        sourceX: 0,
        sourceY: 40,
        targetX: 200,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 0,
      });
      const sibling = getGraphEdgePath({
        sourceX: 0,
        sourceY: 40,
        targetX: 200,
        targetY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 0,
        truncateAtTrunk: true,
      });

      expect(leader.endsWith('L 200,100')).toBe(true);
      expect(sibling.endsWith('L 200,100')).toBe(false);
    });
  });
});
