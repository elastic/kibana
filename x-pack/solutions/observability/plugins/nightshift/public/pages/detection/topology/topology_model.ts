/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TopologyEdgeVariant,
  TopologyNode,
  TopologySnapshotProperties,
} from '@kbn/significant-events-schema';

export interface TopologyViewNode {
  id: string;
  label: string;
  subtitle?: string;
  unresolved: boolean;
  topologyNode?: TopologyNode;
}

export interface TopologyViewEdge {
  id: string;
  edgeId: string;
  source: string;
  target: string;
  variant: TopologyEdgeVariant;
}

export interface TopologyViewModel {
  nodes: TopologyViewNode[];
  edges: TopologyViewEdge[];
}

const unresolvedNodeId = (
  edgeId: string,
  variantIndex: number,
  endpoint: 'source' | 'target',
  takenIds: ReadonlyMap<string, unknown>
): string => {
  let id = `unresolved:${edgeId}:${variantIndex}:${endpoint}`;
  while (takenIds.has(id)) {
    id = `unresolved:${id}`;
  }
  return id;
};

type TopologySnapshotGraph = Pick<TopologySnapshotProperties, 'nodes' | 'edges'>;

/** Unresolved references become synthetic nodes so the graph never hides a dependency endpoint. */
const projectTopology = (
  snapshot: TopologySnapshotGraph,
  includeVariant: (variant: TopologyEdgeVariant) => boolean,
  seedNodeIds: Iterable<string>
): TopologyViewModel => {
  const topologyNodesById = new Map(snapshot.nodes.map((node) => [node.node_id, node]));
  const viewNodesById = new Map<string, TopologyViewNode>();
  const viewEdges: TopologyViewEdge[] = [];

  const addResolvedNode = (nodeId: string | null) => {
    if (nodeId === null || viewNodesById.has(nodeId)) {
      return;
    }
    const node = topologyNodesById.get(nodeId);
    if (node) {
      viewNodesById.set(nodeId, {
        id: nodeId,
        // Same label as the Detections entities list.
        label: node.name ?? nodeId,
        subtitle: node.technology ?? node.subtype,
        unresolved: false,
        topologyNode: node,
      });
    }
  };

  for (const nodeId of seedNodeIds) {
    addResolvedNode(nodeId);
  }

  snapshot.edges.forEach(({ edge_id: edgeId, variants }) => {
    variants.forEach((variant, variantIndex) => {
      if (!includeVariant(variant)) {
        return;
      }

      const source =
        variant.source_node_id ??
        unresolvedNodeId(edgeId, variantIndex, 'source', topologyNodesById);
      const target =
        variant.target_node_id ??
        unresolvedNodeId(edgeId, variantIndex, 'target', topologyNodesById);

      addResolvedNode(variant.source_node_id);
      addResolvedNode(variant.target_node_id);

      if (variant.source_node_id === null) {
        viewNodesById.set(source, {
          id: source,
          label: variant.source_ref,
          unresolved: true,
        });
      }
      if (variant.target_node_id === null) {
        viewNodesById.set(target, {
          id: target,
          label: variant.target_ref,
          unresolved: true,
        });
      }

      viewEdges.push({
        id: `${edgeId}:${variantIndex}`,
        edgeId,
        source,
        target,
        variant,
      });
    });
  });

  return {
    nodes: [...viewNodesById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: viewEdges.sort((left, right) => left.id.localeCompare(right.id)),
  };
};

/** Projects the entire snapshot, including entities that have no dependencies. */
export const buildFullTopology = (snapshot: TopologySnapshotGraph): TopologyViewModel =>
  projectTopology(
    snapshot,
    () => true,
    snapshot.nodes.map(({ node_id: nodeId }) => nodeId)
  );

/** Projects dependencies within `hops` edges of the focused entities, in either direction. */
export const buildTopologyNeighborhood = (
  snapshot: TopologySnapshotGraph,
  focusedNodeIds: string[],
  hops = 1
): TopologyViewModel => {
  const adjacency = new Map<string, Set<string>>();
  const connect = (from: string, to: string) => {
    const neighbors = adjacency.get(from) ?? new Set<string>();
    neighbors.add(to);
    adjacency.set(from, neighbors);
  };
  snapshot.edges.forEach(({ variants }) =>
    variants.forEach(({ source_node_id: source, target_node_id: target }) => {
      if (source !== null && target !== null) {
        connect(source, target);
        connect(target, source);
      }
    })
  );

  const expanded = new Set<string>(focusedNodeIds);
  let frontier = focusedNodeIds;
  for (let depth = 1; depth < hops && frontier.length > 0; depth++) {
    const next: string[] = [];
    frontier.forEach((nodeId) =>
      adjacency.get(nodeId)?.forEach((neighbor) => {
        if (!expanded.has(neighbor)) {
          expanded.add(neighbor);
          next.push(neighbor);
        }
      })
    );
    frontier = next;
  }

  return projectTopology(
    snapshot,
    ({ source_node_id: source, target_node_id: target }) =>
      (source !== null && expanded.has(source)) || (target !== null && expanded.has(target)),
    focusedNodeIds
  );
};
