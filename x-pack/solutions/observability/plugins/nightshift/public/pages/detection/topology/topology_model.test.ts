/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopologyNode, TopologySnapshotProperties } from '@kbn/significant-events-schema';
import { buildFullTopology, buildTopologyNeighborhood } from './topology_model';

const node = (nodeId: string): TopologyNode => ({
  node_id: nodeId,
  node_type: 'entity',
  title: nodeId.toUpperCase(),
  provenance: [],
});

describe('buildTopologyNeighborhood', () => {
  it('keeps incident variants distinct and exposes unresolved endpoints', () => {
    const snapshot: Pick<TopologySnapshotProperties, 'nodes' | 'edges'> = {
      nodes: [node('api'), node('database'), node('unrelated')],
      edges: [
        {
          edge_id: 'api-storage',
          variants: [
            {
              protocol: 'http',
              source_ref: 'api',
              target_ref: 'database',
              source_node_id: 'api',
              target_node_id: 'database',
              source_resolution: 'slug',
              target_resolution: 'slug',
              provenance: [],
            },
            {
              protocol: 'grpc',
              source_ref: 'api',
              target_ref: 'database',
              source_node_id: 'api',
              target_node_id: 'database',
              source_resolution: 'slug',
              target_resolution: 'name',
              provenance: [],
            },
            {
              source_ref: 'api',
              target_ref: 'external-cache',
              source_node_id: 'api',
              target_node_id: null,
              source_resolution: 'slug',
              target_resolution: 'unresolved',
              provenance: [],
            },
          ],
        },
        {
          edge_id: 'outside-focus',
          variants: [
            {
              source_ref: 'database',
              target_ref: 'unrelated',
              source_node_id: 'database',
              target_node_id: 'unrelated',
              source_resolution: 'slug',
              target_resolution: 'slug',
              provenance: [],
            },
          ],
        },
      ],
    };

    const result = buildTopologyNeighborhood(snapshot, ['api']);

    expect(result.nodes.map(({ id }) => id)).toEqual([
      'api',
      'database',
      'unresolved:api-storage:2:target',
    ]);
    expect(result.edges.map(({ id, source, target }) => ({ id, source, target }))).toEqual([
      { id: 'api-storage:0', source: 'api', target: 'database' },
      { id: 'api-storage:1', source: 'api', target: 'database' },
      {
        id: 'api-storage:2',
        source: 'api',
        target: 'unresolved:api-storage:2:target',
      },
    ]);
  });
});

const chain: Pick<TopologySnapshotProperties, 'nodes' | 'edges'> = {
  nodes: ['a', 'b', 'c', 'd', 'isolated'].map(node),
  edges: [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
  ].map(([source, target]) => ({
    edge_id: `${source}-${target}`,
    variants: [
      {
        source_ref: source,
        target_ref: target,
        source_node_id: source,
        target_node_id: target,
        source_resolution: 'slug' as const,
        target_resolution: 'slug' as const,
        provenance: [],
      },
    ],
  })),
};

describe('buildTopologyNeighborhood hops', () => {
  it('includes dependencies within the hop limit', () => {
    const result = buildTopologyNeighborhood(chain, ['a'], 2);

    expect(result.nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(result.edges.map(({ id }) => id)).toEqual(['a-b:0', 'b-c:0']);
  });

  it('merges the neighborhoods of several focused entities', () => {
    const result = buildTopologyNeighborhood(chain, ['a', 'd']);

    expect(result.nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.edges.map(({ id }) => id)).toEqual(['a-b:0', 'c-d:0']);
  });

  it('follows dependencies against their direction', () => {
    const result = buildTopologyNeighborhood(chain, ['d'], 2);

    expect(result.nodes.map(({ id }) => id)).toEqual(['b', 'c', 'd']);
  });
});

describe('buildFullTopology', () => {
  it('includes every entity and dependency, including isolated entities', () => {
    const result = buildFullTopology(chain);

    expect(result.nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c', 'd', 'isolated']);
    expect(result.edges).toHaveLength(3);
  });
});

describe('synthetic unresolved endpoints', () => {
  it('does not overwrite a real entity whose id matches the synthetic id', () => {
    const syntheticId = 'unresolved:api-storage:0:target';
    const snapshot: Pick<TopologySnapshotProperties, 'nodes' | 'edges'> = {
      nodes: [node('api'), node(syntheticId)],
      edges: [
        {
          edge_id: 'api-storage',
          variants: [
            {
              source_ref: 'api',
              target_ref: 'missing',
              source_node_id: 'api',
              target_node_id: null,
              source_resolution: 'slug',
              target_resolution: 'unresolved',
              provenance: [],
            },
          ],
        },
      ],
    };

    const { nodes, edges } = buildFullTopology(snapshot);

    expect(nodes.filter(({ unresolved }) => !unresolved).map(({ id }) => id)).toEqual([
      'api',
      syntheticId,
    ]);
    expect(nodes.find(({ id }) => id === edges[0].target)?.unresolved).toBe(true);
    expect(edges[0].target).not.toBe(syntheticId);
  });
});
