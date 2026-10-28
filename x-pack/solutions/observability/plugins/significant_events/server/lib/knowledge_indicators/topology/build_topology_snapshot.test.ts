/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import {
  MAX_TOPOLOGY_NODES,
  topologySnapshotPropertiesSchema,
} from '@kbn/significant-events-schema';
import { buildTopologySnapshot, topologyNeighborhood } from './build_topology_snapshot';

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

describe('buildTopologySnapshot', () => {
  it('merges nodes with the same slug across sources and keeps every contributor in provenance', () => {
    const snapshot = build(
      [
        entity('Checkout', {
          source_id: 'src-a',
          confidence: 60,
          properties: { name: 'checkout' },
        }),
        entity('checkout', {
          source_id: 'src-b',
          confidence: 90,
          properties: { name: 'checkout', technology: 'java' },
        }),
      ],
      ['src-a', 'src-b']
    );

    expect(snapshot.nodes).toHaveLength(1);
    const [node] = snapshot.nodes;
    expect(node.node_id).toBe('checkout');
    expect(node.technology).toBe('java');
    expect(node.provenance.map((p) => p.source_id)).toEqual(['src-b', 'src-a']);
    expect(snapshot.node_count).toBe(1);
    expect(snapshot.source_ids).toEqual(['src-a', 'src-b']);
  });

  it('resolves endpoints by slug, name, then unique technology, without placeholder nodes', () => {
    const snapshot = build([
      entity('checkout'),
      entity('orders-db', { properties: { name: 'Orders Database', technology: 'postgres' } }),
      entity('cache-1', { properties: { name: 'redis-primary', technology: 'redis' } }),
      entity('cache-2', { properties: { name: 'redis-replica', technology: 'redis' } }),
      dependency('checkout-orders', 'checkout', 'postgres'),
      dependency('checkout-redis', 'checkout', 'redis'),
      dependency('checkout-by-name', 'checkout', 'orders database'),
      dependency('checkout-unknown', 'checkout', 'mystery'),
    ]);

    const edgesById = new Map(snapshot.edges.map((edge) => [edge.edge_id, edge]));

    expect(edgesById.get('checkout-orders')).toMatchObject({
      source_node_id: 'checkout',
      source_resolution: 'slug',
      target_node_id: 'orders-db',
      target_resolution: 'technology',
    });
    expect(edgesById.get('checkout-by-name')).toMatchObject({
      target_node_id: 'orders-db',
      target_resolution: 'name',
    });
    expect(edgesById.get('checkout-redis')).toMatchObject({
      target_node_id: null,
      target_resolution: 'unresolved',
      target_ref: 'redis',
    });
    expect(edgesById.get('checkout-unknown')).toMatchObject({
      target_node_id: null,
      target_resolution: 'unresolved',
    });
    expect(snapshot.nodes.map((n) => n.node_id)).toEqual([
      'cache-1',
      'cache-2',
      'checkout',
      'orders-db',
    ]);
    expect(topologySnapshotPropertiesSchema.safeParse(snapshot).success).toBe(true);
  });

  it('accepts infrastructure as nodes and ignores other feature types', () => {
    const snapshot = build([
      feature({ id: 'aws', type: 'infrastructure', subtype: 'cloud_deployment' }),
      feature({ id: 'log4j', type: 'technology' }),
      feature({ id: 'ecs', type: 'schema' }),
    ]);

    expect(snapshot.nodes).toEqual([
      expect.objectContaining({ node_id: 'aws', node_type: 'infrastructure' }),
    ]);
  });

  it('is deterministic regardless of input order', () => {
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

  it('truncates past the node bound but keeps the full counts', () => {
    const features = Array.from({ length: MAX_TOPOLOGY_NODES + 5 }, (_, i) =>
      entity(`svc-${String(i).padStart(5, '0')}`)
    );

    const snapshot = build(features);

    expect(snapshot.nodes).toHaveLength(MAX_TOPOLOGY_NODES);
    expect(snapshot.node_count).toBe(MAX_TOPOLOGY_NODES + 5);
    expect(snapshot.truncated).toBe(true);
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
    ],
    ['src-a', 'src-b', 'src-c']
  );

  it('expands one hop from a node seed through its edges', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['Checkout'] })).toEqual([
      'api',
      'api-checkout',
      'checkout',
      'checkout-orders',
      'dangling',
      'orders-db',
    ]);
  });

  it('seeds from an edge slug and reaches both endpoints', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['billing-orders'] })).toEqual([
      'billing',
      'billing-orders',
      'orders-db',
    ]);
  });

  it('keeps unknown seeds so the caller still fetches them directly', () => {
    expect(topologyNeighborhood({ snapshot, seedIds: ['not-in-snapshot'] })).toEqual([
      'not-in-snapshot',
    ]);
  });
});
