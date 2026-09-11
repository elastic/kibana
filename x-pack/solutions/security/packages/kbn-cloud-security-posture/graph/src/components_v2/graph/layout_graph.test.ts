/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeViewModel, EdgeViewModel } from '../types';
import { layoutGraph } from './layout_graph';
import { getLayoutNodeCenterY } from './layout_origin_spine';

const getHandleY = getLayoutNodeCenterY;

const entity = (
  id: string,
  extras: Partial<NodeViewModel> = {}
): Node<NodeViewModel> => ({
  id,
  type: 'entity',
  position: { x: 0, y: 0 },
  data: {
    id,
    label: id,
    color: 'primary',
    shape: 'rectangle',
    icon: 'user',
    ...extras,
  },
});

const relationship = (id: string, extras: Partial<NodeViewModel> = {}): Node<NodeViewModel> => ({
  id,
  type: 'relationship',
  position: { x: 0, y: 0 },
  data: {
    id,
    label: id,
    shape: 'relationship',
    ...extras,
  },
});

describe('layoutGraph handle bands', () => {
  it('aligns a 1:1 entity → relationship → entity chain on one handle band', () => {
    const nodes: Array<Node<NodeViewModel>> = [
      entity('john.doe'),
      relationship('owns'),
      entity('laptop', {
        ips: ['10.0.0.1'],
        dataSource: 'Endpoints',
        assetCriticality: 'high_impact',
        countryCodes: ['US'],
      }),
    ];
    const edges: Array<Edge<EdgeViewModel>> = [
      { id: 'e1', source: 'john.doe', target: 'owns' },
      { id: 'e2', source: 'owns', target: 'laptop' },
    ];

    const result = layoutGraph(nodes, edges);
    const handleYs = result.nodes.map((node) => getHandleY(node));

    expect(new Set(handleYs).size).toBe(1);
  });

  it('aligns each fan-out relationship with its destination entity', () => {
    const nodes: Array<Node<NodeViewModel>> = [
      entity('john.doe', { isOrigin: true }),
      relationship('owns'),
      relationship('accesses'),
      relationship('depends'),
      entity('short-dest'),
      entity('tall-dest', {
        ips: ['10.0.0.8'],
        dataSource: 'Active Directory',
        assetCriticality: 'extreme_impact',
        countryCodes: ['GB'],
      }),
      entity('mid-dest', { dataSource: 'Okta' }),
    ];
    const edges: Array<Edge<EdgeViewModel>> = [
      { id: 'e1', source: 'john.doe', target: 'owns' },
      { id: 'e2', source: 'owns', target: 'short-dest' },
      { id: 'e3', source: 'john.doe', target: 'accesses' },
      { id: 'e4', source: 'accesses', target: 'tall-dest' },
      { id: 'e5', source: 'john.doe', target: 'depends' },
      { id: 'e6', source: 'depends', target: 'mid-dest' },
    ];

    const result = layoutGraph(nodes, edges);
    const byId = Object.fromEntries(result.nodes.map((node) => [node.id, node]));

    expect(getHandleY(byId.owns)).toBe(getHandleY(byId['short-dest']));
    expect(getHandleY(byId.accesses)).toBe(getHandleY(byId['tall-dest']));
    expect(getHandleY(byId.depends)).toBe(getHandleY(byId['mid-dest']));

    const destYs = [
      getHandleY(byId['short-dest']),
      getHandleY(byId['tall-dest']),
      getHandleY(byId['mid-dest']),
    ];
    expect(new Set(destYs).size).toBe(3);
  });

  it('keeps origin investigation nodes on a shared handle band', () => {
    const nodes: Array<Node<NodeViewModel>> = [
      entity('originEntity', { isOrigin: true, shape: 'ellipse' }),
      relationship('originRel', { isOrigin: true }),
      {
        id: 'originEvent',
        type: 'label',
        position: { x: 0, y: 0 },
        data: {
          id: 'originEvent',
          label: 'Sign-in',
          color: 'primary',
          shape: 'label',
          isOrigin: true,
        },
      },
      entity('expandedEntity', { shape: 'hexagon' }),
    ];
    const edges: Array<Edge<EdgeViewModel>> = [
      { id: 'e1', source: 'originEntity', target: 'originRel' },
      { id: 'e2', source: 'originRel', target: 'originEvent' },
      { id: 'e3', source: 'originEntity', target: 'expandedEntity' },
    ];

    const result = layoutGraph(nodes, edges);
    const byId = Object.fromEntries(result.nodes.map((node) => [node.id, node]));
    const spineYs = [
      getHandleY(byId.originEntity),
      getHandleY(byId.originRel),
      getHandleY(byId.originEvent),
    ];

    expect(new Set(spineYs).size).toBe(1);
    expect(getHandleY(byId.expandedEntity)).not.toBe(spineYs[0]);
  });
});
