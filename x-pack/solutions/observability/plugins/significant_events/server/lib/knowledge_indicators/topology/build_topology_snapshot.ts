/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import type {
  Feature,
  TopologyEdge,
  TopologyEdgeResolution,
  TopologyNode,
  TopologyNodeType,
  TopologyProvenance,
  TopologySnapshotProperties,
} from '@kbn/significant-events-schema';
import {
  MAX_ID_LENGTH,
  MAX_TOPOLOGY_EDGES,
  MAX_TOPOLOGY_NODES,
  MAX_TOPOLOGY_PROVENANCE,
  TOPOLOGY_NODE_TYPES,
  normalizeFeatureSlug,
} from '@kbn/significant-events-schema';

export const TOPOLOGY_INPUT_FEATURE_TYPES = ['entity', 'dependency'] as const;

const NODE_TYPE_SET = new Set<string>(TOPOLOGY_NODE_TYPES);

const isNodeType = (type: string): type is TopologyNodeType => NODE_TYPE_SET.has(type);

// Properties are LLM-authored and unbounded; values over the schema cap are treated as absent.
const stringProperty = (feature: Feature, key: string): string | undefined => {
  const value = feature.properties[key];
  return isString(value) && value.length > 0 && value.length <= MAX_ID_LENGTH ? value : undefined;
};

const toProvenance = (feature: Feature): TopologyProvenance => ({
  source_id: feature.source_id,
  feature_id: feature.id,
  feature_uuid: feature.uuid,
  confidence: feature.confidence,
});

const byConfidenceDesc = (a: Feature, b: Feature): number =>
  b.confidence - a.confidence ||
  a.source_id.localeCompare(b.source_id) ||
  a.uuid.localeCompare(b.uuid);

const sortProvenance = (provenance: TopologyProvenance[]): TopologyProvenance[] =>
  [...provenance]
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        a.source_id.localeCompare(b.source_id) ||
        a.feature_uuid.localeCompare(b.feature_uuid)
    )
    .slice(0, MAX_TOPOLOGY_PROVENANCE);

interface NodeIndex {
  bySlug: Map<string, TopologyNode>;
  byName: Map<string, TopologyNode[]>;
  byTechnology: Map<string, TopologyNode[]>;
}

const pushIndexed = (index: Map<string, TopologyNode[]>, key: string, node: TopologyNode) => {
  const normalized = normalizeFeatureSlug(key);
  const list = index.get(normalized);
  if (list) {
    list.push(node);
  } else {
    index.set(normalized, [node]);
  }
};

// Same slug across sources collapses into one node; identity attributes come
// from the highest-confidence contributor.
function buildNodes(features: Feature[]): NodeIndex {
  const grouped = new Map<string, Feature[]>();
  for (const feature of features) {
    if (!isNodeType(feature.type)) continue;
    const slug = normalizeFeatureSlug(feature.id);
    const group = grouped.get(slug);
    if (group) {
      group.push(feature);
    } else {
      grouped.set(slug, [feature]);
    }
  }

  const bySlug = new Map<string, TopologyNode>();
  const byName = new Map<string, TopologyNode[]>();
  const byTechnology = new Map<string, TopologyNode[]>();

  for (const [slug, group] of grouped) {
    const sorted = [...group].sort(byConfidenceDesc);
    const [primary] = sorted;
    if (!isNodeType(primary.type)) continue;
    const name = sorted.map((f) => stringProperty(f, 'name')).find(isString);
    const technology = sorted.map((f) => stringProperty(f, 'technology')).find(isString);
    const node: TopologyNode = {
      node_id: slug,
      node_type: primary.type,
      ...(primary.subtype ? { subtype: primary.subtype } : {}),
      ...(primary.title ? { title: primary.title } : {}),
      ...(name ? { name } : {}),
      ...(technology ? { technology } : {}),
      provenance: sortProvenance(sorted.map(toProvenance)),
    };
    bySlug.set(slug, node);
    if (name) pushIndexed(byName, name, node);
    if (technology) pushIndexed(byTechnology, technology, node);
  }

  return { bySlug, byName, byTechnology };
}

interface ResolvedEndpoint {
  nodeId: string | null;
  resolution: TopologyEdgeResolution;
}

// Mirrors the KI grounding protocol; ambiguous or missing endpoints stay
// unresolved rather than producing a placeholder node.
function resolveEndpoint(ref: string, index: NodeIndex): ResolvedEndpoint {
  const normalized = normalizeFeatureSlug(ref);
  const bySlug = index.bySlug.get(normalized);
  if (bySlug) return { nodeId: bySlug.node_id, resolution: 'slug' };

  const byName = index.byName.get(normalized);
  if (byName?.length === 1) return { nodeId: byName[0].node_id, resolution: 'name' };

  const byTechnology = index.byTechnology.get(normalized);
  if (byTechnology?.length === 1) {
    return { nodeId: byTechnology[0].node_id, resolution: 'technology' };
  }

  return { nodeId: null, resolution: 'unresolved' };
}

function buildEdges(features: Feature[], index: NodeIndex): TopologyEdge[] {
  const grouped = new Map<string, Feature[]>();
  for (const feature of features) {
    if (feature.type !== 'dependency') continue;
    const sourceRef = stringProperty(feature, 'source');
    const targetRef = stringProperty(feature, 'target');
    if (!sourceRef || !targetRef) continue;
    const slug = normalizeFeatureSlug(feature.id);
    const group = grouped.get(slug);
    if (group) {
      group.push(feature);
    } else {
      grouped.set(slug, [feature]);
    }
  }

  const edges: TopologyEdge[] = [];
  for (const [slug, group] of grouped) {
    const sorted = [...group].sort(byConfidenceDesc);
    const [primary] = sorted;
    const sourceRef = stringProperty(primary, 'source');
    const targetRef = stringProperty(primary, 'target');
    if (!sourceRef || !targetRef) continue;
    const protocol = sorted.map((f) => stringProperty(f, 'protocol')).find(isString);
    const source = resolveEndpoint(sourceRef, index);
    const target = resolveEndpoint(targetRef, index);
    edges.push({
      edge_id: slug,
      ...(primary.subtype ? { subtype: primary.subtype } : {}),
      ...(protocol ? { protocol } : {}),
      source_ref: sourceRef,
      target_ref: targetRef,
      source_node_id: source.nodeId,
      target_node_id: target.nodeId,
      source_resolution: source.resolution,
      target_resolution: target.resolution,
      provenance: sortProvenance(sorted.map(toProvenance)),
    });
  }
  return edges;
}

/** Builds the topology from entity and dependency features; output is independent of input order. */
export function buildTopologySnapshot({
  features,
  sourceIds,
  builtAt,
}: {
  features: Feature[];
  sourceIds: string[];
  builtAt: string;
}): TopologySnapshotProperties {
  const index = buildNodes(features);
  const allNodes = [...index.bySlug.values()].sort((a, b) => a.node_id.localeCompare(b.node_id));
  const allEdges = buildEdges(features, index).sort((a, b) => a.edge_id.localeCompare(b.edge_id));

  const nodes = allNodes.slice(0, MAX_TOPOLOGY_NODES);
  const edges = allEdges.slice(0, MAX_TOPOLOGY_EDGES);

  return {
    built_at: builtAt,
    source_ids: [...new Set(sourceIds)].sort(),
    nodes,
    edges,
    node_count: allNodes.length,
    edge_count: allEdges.length,
    truncated: nodes.length < allNodes.length || edges.length < allEdges.length,
  };
}

/** Node and edge slugs reachable from the seeds; seeds missing from the snapshot are kept so the caller still fetches them directly. */
export function topologyNeighborhood({
  snapshot,
  seedIds,
  hops = 1,
}: {
  snapshot: Pick<TopologySnapshotProperties, 'edges'>;
  seedIds: string[];
  hops?: number;
}): string[] {
  const seeds = new Set(seedIds.map(normalizeFeatureSlug));
  const reached = new Set(seeds);
  const edgesReached = new Set<string>();
  let frontier = new Set(seeds);

  for (let hop = 0; hop < hops && frontier.size > 0; hop++) {
    const next = new Set<string>();
    for (const edge of snapshot.edges) {
      if (edgesReached.has(edge.edge_id)) continue;
      const touches =
        frontier.has(edge.edge_id) ||
        (edge.source_node_id !== null && frontier.has(edge.source_node_id)) ||
        (edge.target_node_id !== null && frontier.has(edge.target_node_id));
      if (!touches) continue;
      edgesReached.add(edge.edge_id);
      for (const nodeId of [edge.source_node_id, edge.target_node_id]) {
        if (nodeId !== null && !reached.has(nodeId)) {
          reached.add(nodeId);
          next.add(nodeId);
        }
      }
    }
    frontier = next;
  }

  return [...new Set([...reached, ...edgesReached])].sort();
}
