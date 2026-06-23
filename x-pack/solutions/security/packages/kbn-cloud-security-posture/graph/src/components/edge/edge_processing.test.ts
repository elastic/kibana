/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEdgeHandleConfig, shouldRenderGraphEdge } from './edge_processing';

describe('edge_processing', () => {
  describe('shouldRenderGraphEdge', () => {
    it('hides stacked connector return edges to the group node', () => {
      expect(shouldRenderGraphEdge('label', 'group')).toBe(false);
      expect(shouldRenderGraphEdge('relationship', 'group')).toBe(false);
    });

    it('keeps forward paths through stacked groups', () => {
      expect(shouldRenderGraphEdge('group', 'label')).toBe(true);
      expect(shouldRenderGraphEdge('hexagon', 'group')).toBe(true);
      expect(shouldRenderGraphEdge('group', 'hexagon')).toBe(true);
    });
  });

  describe('getEdgeHandleConfig', () => {
    it('assigns stack group handles', () => {
      expect(getEdgeHandleConfig('hexagon', 'group')).toEqual({
        sourceHandle: undefined,
        targetHandle: 'in',
        isReturnStackEdge: false,
      });
      expect(getEdgeHandleConfig('group', 'label')).toEqual({
        sourceHandle: 'inside',
        targetHandle: undefined,
        isReturnStackEdge: false,
      });
      expect(getEdgeHandleConfig('label', 'group')).toEqual({
        sourceHandle: undefined,
        targetHandle: 'out',
        isReturnStackEdge: true,
      });
      expect(getEdgeHandleConfig('group', 'hexagon')).toEqual({
        sourceHandle: 'outside',
        targetHandle: undefined,
        isReturnStackEdge: false,
      });
    });
  });
});
