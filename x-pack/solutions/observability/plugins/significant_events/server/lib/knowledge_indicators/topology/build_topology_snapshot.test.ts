/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { topologySnapshotPropertiesSchema } from '@kbn/significant-events-schema';
import {
  buildTopologySnapshot,
  topologyNeighborhood,
  topologyNeighborhoodSelection,
} from './build_topology_snapshot';

const BUILT_AT = '2026-10-21T10:00:00.000Z';

const feature = (overrides: Partial<Feature> & Pick<Feature, 'id' | 'type'>): Feature => ({
  uuid: `${overrides.source_id ?? 'src-a'}:${overrides.id}`,
  source_id: 'src-a',
  description: overrides.id,
  properties: {},
  confidence: 80,
  ...overrides,
});

const entity = (id: string, overrides: Partial<Feature> = {}): Feature =>
  feature({ id, type: 'entity', subtype: 'service', properties: { name: id }, ...overrides });

const dependency = (
  id: string,
  source: string,
  target: string,
  overrides: Partial<Feature> = {}
): Feature =>
  feature({
    id,
    type: 'dependency',
    subtype: 'service_dependency',
    properties: { source, target, protocol: 'http' },
    ...overrides,
  });

const build = (features: Feature[], sourceIds = ['src-a']) =>
  buildTopologySnapshot({ features, sourceIds, builtAt: BUILT_AT });

const conflictingVariantSnapshot = build(
  [
    entity('frontend', { source_id: 'src-a' }),
    entity('redis', { source_id: 'src-a' }),
    entity('redis-cluster', { source_id: 'src-b' }),
    dependency('frontend-cache', 'frontend', 'redis', {
      source_id: 'src-a',
      confidence: 90,
    }),
    dependency('frontend-cache', 'frontend', 'redis-cluster', {
      source_id: 'src-b',
      confidence: 60,
    }),
  ],
  ['src-a', 'src-b']
);

describe('buildTopologySnapshot', () => {
  it('merges same-slug entities with provenance', () => {
    const snapshot = build(
      [
        entity('Checkout', {
          source_id: 'src-a',
          confidence: 60,
          properties: { name: 'legacy-checkout', technology: 'express' },
        }),
        entity('checkout', {
          source_id: 'src-b',
          confidence: 90,
          properties: { name: 'checkout', technology: 'nodejs' },
        }),
        entity('frontend'),
        feature({ id: 'aws', type: 'infrastructure' }),
        feature({ id: 'log4j', type: 'technology' }),
      ],
      ['src-a', 'src-b']
    );

    expect(snapshot.nodes).toHaveLength(2);
    const [node] = snapshot.nodes.filter(({ node_id: nodeId }) => nodeId === 'checkout');
    expect(node.node_id).toBe('checkout');
    expect(node.name).toBe('checkout');
    expect(node.technology).toBe('nodejs');
    expect(node.provenance.map((p) => p.source_id)).toEqual(['src-b', 'src-a']);
    expect(snapshot.source_ids).toEqual(['src-a', 'src-b']);
  });

  it('resolves endpoints by precedence', () => {
    const snapshot = build([
      entity('checkout'),
      entity('orders-db', { properties: { name: 'Orders Database', technology: 'postgres' } }),
      entity('cache-1', { properties: { name: 'redis', technology: 'ioredis' } }),
      entity('cache-2', { properties: { name: 'redis', technology: 'keydb' } }),
      entity('cache-3', { properties: { name: 'other-cache', technology: 'redis' } }),
      dependency('checkout-orders', 'checkout', 'postgres'),
      dependency('checkout-redis', 'checkout', 'redis'),
      dependency('checkout-by-name', 'checkout', 'orders database'),
    ]);

    const variantsById = new Map(snapshot.edges.map((edge) => [edge.edge_id, edge.variants[0]]));

    expect(variantsById.get('checkout-orders')).toMatchObject({
      source_node_id: 'checkout',
      source_resolution: 'slug',
      target_node_id: 'orders-db',
      target_resolution: 'technology',
    });
    expect(variantsById.get('checkout-by-name')).toMatchObject({
      target_node_id: 'orders-db',
      target_resolution: 'name',
    });
    expect(variantsById.get('checkout-redis')).toMatchObject({
      target_node_id: null,
      target_resolution: 'unresolved',
      target_ref: 'redis',
    });
    expect(snapshot.nodes.map((n) => n.node_id)).toEqual([
      'cache-1',
      'cache-2',
      'cache-3',
      'checkout',
      'orders-db',
    ]);
    expect(topologySnapshotPropertiesSchema.safeParse(snapshot).success).toBe(true);
  });

  it('preserves conflicting endpoint variants with their own provenance', () => {
    expect(conflictingVariantSnapshot.edges).toHaveLength(1);
    expect(conflictingVariantSnapshot.edges[0]).toMatchObject({
      edge_id: 'frontend-cache',
      variants: [
        {
          source_ref: 'frontend',
          target_ref: 'redis',
          provenance: [{ source_id: 'src-a' }],
        },
        {
          source_ref: 'frontend',
          target_ref: 'redis-cluster',
          provenance: [{ source_id: 'src-b' }],
        },
      ],
    });
  });

  it('is input-order independent', () => {
    const features = [
      entity('b'),
      entity('a'),
      dependency('a-b', 'a', 'b'),
      entity('c', { source_id: 'src-b' }),
      dependency('b-c', 'b', 'c', { source_id: 'src-b' }),
    ];

    const forward = build(features, ['src-b', 'src-a']);
    const reversed = build([...features].reverse(), ['src-a', 'src-b']);

    expect(reversed).toEqual(forward);
    expect(forward.nodes.map((n) => n.node_id)).toEqual(['a', 'b', 'c']);
    expect(forward.edges.map((e) => e.edge_id)).toEqual(['a-b', 'b-c']);
  });

  it('keeps all nodes and edges', () => {
    const nodes = Array.from({ length: 2_005 }, (_, i) =>
      entity(`svc-${String(i).padStart(5, '0')}`)
    );
    const edges = Array.from({ length: 5_005 }, (_, i) =>
      dependency(`edge-${String(i).padStart(5, '0')}`, 'svc-00000', 'svc-00001')
    );

    const snapshot = build([...nodes, ...edges]);

    expect(snapshot.nodes).toHaveLength(2_005);
    expect(snapshot.edges).toHaveLength(5_005);
  });
});

describe('topologyNeighborhood', () => {
  const snapshot = build(
    [
      entity('api', { source_id: 'src-a' }),
      entity('checkout', { source_id: 'src-a' }),
      entity('checkout', { source_id: 'src-b' }),
      entity('orders-db', { source_id: 'src-b' }),
      entity('billing', { source_id: 'src-c' }),
      dependency('api-checkout', 'api', 'checkout', { source_id: 'src-a' }),
      dependency('checkout-orders', 'checkout', 'orders-db', { source_id: 'src-b' }),
      dependency('billing-orders', 'billing', 'orders-db', { source_id: 'src-c' }),
      dependency('dangling', 'checkout', 'nowhere', { source_id: 'src-a' }),
      dependency('external-orders', 'external-api', 'orders-db', { source_id: 'src-b' }),
    ],
    ['src-a', 'src-b', 'src-c']
  );

  it('expands one hop from a node', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['Checkout'] })).toEqual([
      'api',
      'api-checkout',
      'checkout',
      'checkout-orders',
      'dangling',
      'orders-db',
    ]);
  });

  it('expands an edge to both endpoints', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['billing-orders'] })).toEqual([
      'billing',
      'billing-orders',
      'orders-db',
    ]);
  });

  it('keeps unknown seeds', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['not-in-snapshot'] })).toEqual([
      'not-in-snapshot',
    ]);
  });

  it('expands a missing entity reference', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['External-API'] })).toEqual([
      'external-api',
      'external-orders',
      'orders-db',
    ]);
  });

  it('expands endpoint and edge seeds across variants', () => {
    expect(
      topologyNeighborhood({ snapshot: conflictingVariantSnapshot, seedIds: ['redis'] })
    ).toEqual(['frontend', 'frontend-cache', 'redis']);
    expect(
      topologyNeighborhood({
        snapshot: conflictingVariantSnapshot,
        seedIds: ['frontend-cache'],
      })
    ).toEqual(['frontend', 'frontend-cache', 'redis', 'redis-cluster']);
  });

  it('retains the feature instance behind the selected edge variant', () => {
    expect(
      topologyNeighborhoodSelection({
        snapshot: conflictingVariantSnapshot,
        seedIds: ['redis-cluster'],
      })
    ).toEqual({
      featureIds: ['frontend', 'frontend-cache', 'redis-cluster'],
      selectedFeatureUuids: ['src-b:frontend-cache'],
    });
  });
});
