/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTopology, firstVal } from './build_topology';
import type { K8sEntity } from '../../../common/k8s_entity';

const makeEntity = (overrides: Partial<K8sEntity>): K8sEntity => ({
  'entity.id': 'k8s.namespace:default',
  'entity.name': 'default',
  'entity.EngineMetadata.Type': 'k8s.namespace',
  'k8s.namespace.name': null,
  'k8s.pod.uid': null,
  'k8s.replicaset.name': null,
  'k8s.deployment.name': null,
  'k8s.daemonset.name': null,
  'k8s.node.name': null,
  'service.name': null,
  'entity.lifecycle.first_seen': null,
  'entity.lifecycle.last_seen': null,
  ...overrides,
});

describe('firstVal', () => {
  it('returns null for null', () => expect(firstVal(null)).toBeNull());
  it('returns null for undefined', () => expect(firstVal(undefined)).toBeNull());
  it('returns scalar value', () => expect(firstVal('foo')).toBe('foo'));
  it('returns first element of array', () => expect(firstVal(['a', 'b'])).toBe('a'));
  it('returns null for empty array', () => expect(firstVal([])).toBeNull());
});

describe('buildTopology', () => {
  const ns = makeEntity({
    'entity.id': 'k8s.namespace:mini-shop',
    'entity.name': 'mini-shop',
    'entity.EngineMetadata.Type': 'k8s.namespace',
  });
  const deploy = makeEntity({
    'entity.id': 'k8s.deployment:mini-shop/api',
    'entity.name': 'api',
    'entity.EngineMetadata.Type': 'k8s.deployment',
    'k8s.namespace.name': 'mini-shop',
    'k8s.deployment.name': 'api',
  });
  const rs = makeEntity({
    'entity.id': 'k8s.replicaset:mini-shop/api-7f8d9',
    'entity.name': 'api-7f8d9',
    'entity.EngineMetadata.Type': 'k8s.replicaset',
    'k8s.namespace.name': 'mini-shop',
    'k8s.replicaset.name': 'api-7f8d9',
    'k8s.deployment.name': 'api',
  });
  const pod = makeEntity({
    'entity.id': 'k8s.pod:uid-1',
    'entity.name': 'api-7f8d9-x1',
    'entity.EngineMetadata.Type': 'k8s.pod',
    'k8s.namespace.name': 'mini-shop',
    'k8s.replicaset.name': 'api-7f8d9',
    'k8s.deployment.name': 'api',
    'k8s.node.name': 'node-1',
  });
  const container = makeEntity({
    'entity.id': 'k8s.container:uid-1/api',
    'entity.name': 'api',
    'entity.EngineMetadata.Type': 'k8s.container',
    'k8s.pod.uid': 'uid-1',
    'k8s.namespace.name': 'mini-shop',
  });
  const node = makeEntity({
    'entity.id': 'k8s.node:node-1',
    'entity.name': 'node-1',
    'entity.EngineMetadata.Type': 'k8s.node',
  });

  it('excludes k8s.node entities from graph nodes', () => {
    const { nodes } = buildTopology([ns, node]);
    expect(nodes.map((n) => n.id)).not.toContain('k8s.node:node-1');
  });

  it('builds full 5-level ownership chain with correct edge ids', () => {
    const { nodes, edges } = buildTopology([ns, deploy, rs, pod, container]);
    const nodeIds = nodes.map((n) => n.id);
    expect(nodeIds).toContain('k8s.namespace:mini-shop');
    expect(nodeIds).toContain('k8s.deployment:mini-shop/api');
    expect(nodeIds).toContain('k8s.replicaset:mini-shop/api-7f8d9');
    expect(nodeIds).toContain('k8s.pod:uid-1');
    expect(nodeIds).toContain('k8s.container:uid-1/api');

    const edgeIds = edges.map((e) => e.id);
    expect(edgeIds).toContain('k8s.namespace:mini-shop~k8s.deployment:mini-shop/api');
    expect(edgeIds).toContain('k8s.deployment:mini-shop/api~k8s.replicaset:mini-shop/api-7f8d9');
    expect(edgeIds).toContain('k8s.replicaset:mini-shop/api-7f8d9~k8s.pod:uid-1');
    expect(edgeIds).toContain('k8s.pod:uid-1~k8s.container:uid-1/api');
  });

  it('handles scalar parent fields (single-element multivalue stored as string)', () => {
    const podScalar = makeEntity({
      ...pod,
      'k8s.namespace.name': 'mini-shop', // scalar, not array
      'k8s.replicaset.name': 'api-7f8d9',
    });
    const { edges } = buildTopology([ns, rs, podScalar]);
    expect(edges.some((e) => e.source === 'k8s.replicaset:mini-shop/api-7f8d9')).toBe(true);
  });

  it('handles array parent fields', () => {
    const podArr = makeEntity({
      ...pod,
      'k8s.namespace.name': ['mini-shop'],
      'k8s.replicaset.name': ['api-7f8d9'],
    });
    const { edges } = buildTopology([ns, rs, podArr]);
    expect(edges.some((e) => e.source === 'k8s.replicaset:mini-shop/api-7f8d9')).toBe(true);
  });

  it('falls back to namespace when replicaset is absent from result set', () => {
    // pod has a replicaset name but the replicaset entity is not in the list
    const { edges } = buildTopology([ns, pod]);
    expect(
      edges.some((e) => e.source === 'k8s.namespace:mini-shop' && e.target === 'k8s.pod:uid-1')
    ).toBe(true);
  });

  it('connects daemonset-owned pod via daemonset', () => {
    const ds = makeEntity({
      'entity.id': 'k8s.daemonset:kube-system/kindnet',
      'entity.name': 'kindnet',
      'entity.EngineMetadata.Type': 'k8s.daemonset',
      'k8s.namespace.name': 'kube-system',
      'k8s.daemonset.name': 'kindnet',
    });
    const kns = makeEntity({
      'entity.id': 'k8s.namespace:kube-system',
      'entity.name': 'kube-system',
      'entity.EngineMetadata.Type': 'k8s.namespace',
    });
    const dsPod = makeEntity({
      'entity.id': 'k8s.pod:uid-ds',
      'entity.name': 'kindnet-xyz',
      'entity.EngineMetadata.Type': 'k8s.pod',
      'k8s.namespace.name': 'kube-system',
      'k8s.daemonset.name': 'kindnet',
    });
    const { edges } = buildTopology([kns, ds, dsPod]);
    expect(
      edges.some(
        (e) => e.source === 'k8s.daemonset:kube-system/kindnet' && e.target === 'k8s.pod:uid-ds'
      )
    ).toBe(true);
  });

  it('attaches k8s.node.name as nodeName on pod data, not as a graph node', () => {
    const { nodes } = buildTopology([ns, pod]);
    const podNode = nodes.find((n) => n.id === 'k8s.pod:uid-1');
    expect(podNode?.data.nodeName).toBe('node-1');
  });

  it('sets nodeName null on non-pod nodes', () => {
    const { nodes } = buildTopology([ns, deploy]);
    const deployNode = nodes.find((n) => n.id === 'k8s.deployment:mini-shop/api');
    expect(deployNode?.data.nodeName).toBeNull();
  });

  it('produces no edges for a standalone namespace', () => {
    const { edges } = buildTopology([ns]);
    expect(edges).toHaveLength(0);
  });
});
