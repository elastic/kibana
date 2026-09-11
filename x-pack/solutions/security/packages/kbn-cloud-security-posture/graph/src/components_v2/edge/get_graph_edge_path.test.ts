/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@xyflow/react';
import {
  GRAPH_EDGE_STEP_OFFSET,
  alignEdgeEndpoints,
  getGraphEdgePath,
} from './get_graph_edge_path';

/** Vertical corridor X used by a smooth-step path (the first non-source X). */
const firstVerticalX = (path: string): number | undefined => {
  const match = path.match(/[ML]\s*([\d.-]+)[,\s]+[\d.-]+/g);
  if (!match) {
    return undefined;
  }

  for (const segment of match) {
    const coords = segment.match(/([\d.-]+)[,\s]+([\d.-]+)/);
    const x = coords ? Number(coords[1]) : NaN;
    if (Number.isFinite(x) && x !== 0) {
      return x;
    }
  }

  return undefined;
};

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

    it('places outgoing verticals from the same node on one corridor', () => {
      const shared = {
        sourceX: 0,
        sourceY: 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        stepOffset: 0,
      } as const;

      const toNearTarget = getGraphEdgePath({
        ...shared,
        targetX: 200,
        targetY: 160,
      });
      const toFarTarget = getGraphEdgePath({
        ...shared,
        targetX: 320,
        targetY: 240,
      });

      expect(firstVerticalX(toNearTarget)).toBe(firstVerticalX(toFarTarget));
      expect(toNearTarget).toContain(`Q ${GRAPH_EDGE_STEP_OFFSET},`);
      expect(toFarTarget).toContain(`Q ${GRAPH_EDGE_STEP_OFFSET},`);
    });
  });
});
