/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { K8sEntity } from '../../../common/k8s_entity';

export const K8S_ENTITY_NODE_W = 180;
export const K8S_ENTITY_NODE_H = 60;

/** Returns the first scalar value from a potentially multivalue field. */
export const firstVal = (v: string | string[] | null | undefined): string | null => {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
};

/**
 * Ownership resolution — first match in `presentIds` wins.
 * Returns null when the child has no reachable ancestor in the result set
 * (i.e. it is a root or an orphan).
 *
 * Parent table (evaluated per child type):
 *   container  → pod (by uid)   → namespace (fallback)
 *   pod        → replicaset     → daemonset → namespace
 *   replicaset → deployment     → namespace
 *   deployment → namespace
 *   daemonset  → namespace
 *   namespace  → (root)
 *   node       → (excluded from graph — treated as an attribute on pods)
 */
const resolveParent = (item: K8sEntity, presentIds: Set<string>): string | null => {
  const type = item['entity.EngineMetadata.Type'];
  const ns = firstVal(item['k8s.namespace.name']);

  const check = (cand: string): string | null => (presentIds.has(cand) ? cand : null);

  if (type === 'k8s.namespace' || type === 'k8s.node') return null;

  if (type === 'k8s.container') {
    const podUid = firstVal(item['k8s.pod.uid']);
    if (podUid) {
      const r = check(`k8s.pod:${podUid}`);
      if (r) return r;
    }
    if (ns) return check(`k8s.namespace:${ns}`);
    return null;
  }

  if (type === 'k8s.pod') {
    const rs = firstVal(item['k8s.replicaset.name']);
    if (rs && ns) {
      const r = check(`k8s.replicaset:${ns}/${rs}`);
      if (r) return r;
    }
    const ds = firstVal(item['k8s.daemonset.name']);
    if (ds && ns) {
      const r = check(`k8s.daemonset:${ns}/${ds}`);
      if (r) return r;
    }
    if (ns) return check(`k8s.namespace:${ns}`);
    return null;
  }

  if (type === 'k8s.replicaset') {
    const dep = firstVal(item['k8s.deployment.name']);
    if (dep && ns) {
      const r = check(`k8s.deployment:${ns}/${dep}`);
      if (r) return r;
    }
    if (ns) return check(`k8s.namespace:${ns}`);
    return null;
  }

  if (type === 'k8s.deployment' || type === 'k8s.daemonset') {
    if (ns) return check(`k8s.namespace:${ns}`);
    return null;
  }

  return null;
};

export interface K8sEntityNodeData extends Record<string, unknown> {
  label: string;
  entityType: string;
  /** For pods only: the name of the k8s.node they run on. */
  nodeName: string | null;
}

/**
 * Derives React Flow nodes and edges from a flat list of k8s entities.
 * Pure function — no React or Elasticsearch dependency, so it is unit-testable.
 *
 * k8s.node entities are excluded from the graph; their names are stored as
 * a badge attribute on pod nodes instead.
 */
export const buildTopology = (
  items: K8sEntity[]
): { nodes: Array<Node<K8sEntityNodeData>>; edges: Edge[] } => {
  const presentIds = new Set(items.map((item) => item['entity.id']));

  const nodes: Array<Node<K8sEntityNodeData>> = [];
  const edges: Edge[] = [];

  for (const item of items) {
    const type = item['entity.EngineMetadata.Type'];
    if (type === 'k8s.node') continue;

    nodes.push({
      id: item['entity.id'],
      type: 'k8sEntity',
      position: { x: 0, y: 0 },
      width: K8S_ENTITY_NODE_W,
      height: K8S_ENTITY_NODE_H,
      data: {
        label: item['entity.name'],
        entityType: type,
        nodeName: type === 'k8s.pod' ? firstVal(item['k8s.node.name']) : null,
      },
    });

    const parentId = resolveParent(item, presentIds);
    if (parentId) {
      edges.push({
        id: `${parentId}~${item['entity.id']}`,
        source: parentId,
        target: item['entity.id'],
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
  }

  return { nodes, edges };
};
