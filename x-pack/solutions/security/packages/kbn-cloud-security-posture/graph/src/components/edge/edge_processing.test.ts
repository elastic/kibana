/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEdgeHandleConfig,
  getGraphEdgeRenderColor,
  shouldRenderGraphEdge,
} from './edge_processing';

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

  describe('getGraphEdgeRenderColor', () => {
    it('returns danger when edge color is danger', () => {
      expect(getGraphEdgeRenderColor({ color: 'danger' })).toBe('danger');
    });

    it('returns danger when connecting to a danger label node', () => {
      expect(
        getGraphEdgeRenderColor({
          color: 'primary',
          sourceShape: 'hexagon',
          targetShape: 'label',
          targetColor: 'danger',
        })
      ).toBe('danger');
    });

    it('returns danger when connecting from a danger label node', () => {
      expect(
        getGraphEdgeRenderColor({
          color: 'subdued',
          sourceShape: 'label',
          sourceColor: 'danger',
          targetShape: 'hexagon',
        })
      ).toBe('danger');
    });

    it('returns subdued for non-alert edges', () => {
      expect(getGraphEdgeRenderColor({ color: 'primary' })).toBe('subdued');
      expect(
        getGraphEdgeRenderColor({
          color: 'primary',
          sourceShape: 'hexagon',
          targetShape: 'label',
          targetColor: 'primary',
        })
      ).toBe('subdued');
    });
  });
});
