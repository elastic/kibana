/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@xyflow/react';
import { alignEdgeEndpoints, getGraphEdgePath } from './get_graph_edge_path';

describe('get_graph_edge_path', () => {
  describe('alignEdgeEndpoints', () => {
    it('snaps nearly-horizontal endpoints to a shared y coordinate', () => {
      expect(alignEdgeEndpoints(0, 100, 200, 106, Position.Right, Position.Left, 10)).toEqual({
        sourceX: 0,
        sourceY: 103,
        targetX: 200,
        targetY: 103,
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

  describe('getGraphEdgePath', () => {
    it('returns a straight path for aligned horizontal edges', () => {
      const path = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 104,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      expect(path).toBe('M 0,102L 200,102');
    });

    it('returns a stepped path with 8px corners when a turn is required', () => {
      const path = getGraphEdgePath({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 160,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      expect(path).toContain('Q');
      expect(path).not.toBe('M 0,100L 200,160');
    });
  });
});
