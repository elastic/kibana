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
  TopologyEdgeVariant,
  TopologyEdgeResolution,
  TopologyNode,
  TopologyNodeType,
  TopologyProvenance,
  TopologySnapshotProperties,
} from '@kbn/significant-events-schema';
import {
  MAX_ID_LENGTH,
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
    if (!list.some(({ node_id: nodeId }) => nodeId === node.node_id)) {
      list.push(node);
    }
  } else {
    index.set(normalized, [node]);
  }
};

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
    for (const feature of sorted) {
      const featureName = stringProperty(feature, 'name');
      const featureTechnology = stringProperty(feature, 'technology');
      if (featureName) pushIndexed(byName, featureName, node);
      if (featureTechnology) pushIndexed(byTechnology, featureTechnology, node);
    }
  }

  return { bySlug, byName, byTechnology };
}

interface ResolvedEndpoint {
  nodeId: string | null;
  resolution: TopologyEdgeResolution;
}

function resolveEndpoint(ref: string, index: NodeIndex): ResolvedEndpoint {
  const normalized = normalizeFeatureSlug(ref);
  const bySlug = index.bySlug.get(normalized);
  if (bySlug) return { nodeId: bySlug.node_id, resolution: 'slug' };

  const byName = index.byName.get(normalized);
  if (byName) {
    return byName.length === 1
      ? { nodeId: byName[0].node_id, resolution: 'name' }
      : { nodeId: null, resolution: 'unresolved' };
  }

  const byTechnology = index.byTechnology.get(normalized);
  if (byTechnology) {
    return byTechnology.length === 1
      ? { nodeId: byTechnology[0].node_id, resolution: 'technology' }
      : { nodeId: null, resolution: 'unresolved' };
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
    const variantGroups = new Map<string, Feature[]>();
    for (const feature of group) {
      const sourceRef = stringProperty(feature, 'source');
      const targetRef = stringProperty(feature, 'target');
      if (!sourceRef || !targetRef) continue;
      const protocol = stringProperty(feature, 'protocol');
      const variantKey = JSON.stringify([
        normalizeFeatureSlug(sourceRef),
        normalizeFeatureSlug(targetRef),
        feature.subtype ? normalizeFeatureSlug(feature.subtype) : null,
        protocol ? normalizeFeatureSlug(protocol) : null,
      ]);
      variantGroups.set(variantKey, [...(variantGroups.get(variantKey) ?? []), feature]);
    }

    const variants: TopologyEdgeVariant[] = [...variantGroups.values()]
      .map((variantGroup) => {
        const sorted = [...variantGroup].sort(byConfidenceDesc);
        const [primary] = sorted;
        const sourceRef = stringProperty(primary, 'source');
        const targetRef = stringProperty(primary, 'target');
        if (!sourceRef || !targetRef) return undefined;
        const protocol = stringProperty(primary, 'protocol');
        const source = resolveEndpoint(sourceRef, index);
        const target = resolveEndpoint(targetRef, index);
        return {
          ...(primary.subtype ? { subtype: primary.subtype } : {}),
          ...(protocol ? { protocol } : {}),
          source_ref: sourceRef,
          target_ref: targetRef,
          source_node_id: source.nodeId,
          target_node_id: target.nodeId,
          source_resolution: source.resolution,
          target_resolution: target.resolution,
          provenance: sortProvenance(sorted.map(toProvenance)),
        };
      })
      .filter((variant): variant is TopologyEdgeVariant => variant !== undefined)
      .sort(
        (a, b) =>
          a.source_ref.localeCompare(b.source_ref) ||
          a.target_ref.localeCompare(b.target_ref) ||
          (a.subtype ?? '').localeCompare(b.subtype ?? '') ||
          (a.protocol ?? '').localeCompare(b.protocol ?? '')
      );
    if (variants.length === 0) continue;
    edges.push({
      edge_id: slug,
      variants,
    });
  }
  return edges;
}

export function buildTopologySnapshot({
  features,
  sourceIds,
  builtAt,
  truncated = false,
}: {
  features: Feature[];
  sourceIds: string[];
  builtAt: string;
  truncated?: boolean;
}): TopologySnapshotProperties {
  const index = buildNodes(features);
  const nodes = [...index.bySlug.values()].sort((a, b) => a.node_id.localeCompare(b.node_id));
  const edges = buildEdges(features, index).sort((a, b) => a.edge_id.localeCompare(b.edge_id));

  return {
    built_at: builtAt,
    source_ids: [...new Set(sourceIds)].sort(),
    nodes,
    edges,
    node_count: nodes.length,
    edge_count: edges.length,
    truncated,
  };
}

interface TopologyNeighborhoodSelection {
  featureIds: string[];
  selectedFeatureUuids: string[];
}

export function topologyNeighborhoodSelection({
  snapshot,
  seedIds,
  hops = 1,
}: {
  snapshot: Pick<TopologySnapshotProperties, 'edges'>;
  seedIds: string[];
  hops?: number;
}): TopologyNeighborhoodSelection {
  const seeds = new Set(seedIds.map(normalizeFeatureSlug));
  const reached = new Set(seeds);
  const edgesReached = new Set<string>();
  const variantsReached = new Set<string>();
  const selectedFeatureUuids = new Set<string>();
  let frontier = new Set(seeds);

  for (let hop = 0; hop < hops && frontier.size > 0; hop++) {
    const next = new Set<string>();
    snapshot.edges.forEach((edge, edgeIndex) => {
      edge.variants.forEach((variant, variantIndex) => {
        const variantKey = `${edgeIndex}:${variantIndex}`;
        if (variantsReached.has(variantKey)) return;
        const touches =
          frontier.has(edge.edge_id) ||
          frontier.has(normalizeFeatureSlug(variant.source_ref)) ||
          frontier.has(normalizeFeatureSlug(variant.target_ref)) ||
          (variant.source_node_id !== null && frontier.has(variant.source_node_id)) ||
          (variant.target_node_id !== null && frontier.has(variant.target_node_id));
        if (!touches) return;
        variantsReached.add(variantKey);
        edgesReached.add(edge.edge_id);
        variant.provenance.forEach(({ feature_uuid: featureUuid }) =>
          selectedFeatureUuids.add(featureUuid)
        );
        for (const nodeId of [variant.source_node_id, variant.target_node_id]) {
          if (nodeId !== null && !reached.has(nodeId)) {
            reached.add(nodeId);
            next.add(nodeId);
          }
        }
      });
    });
    frontier = next;
  }

  return {
    featureIds: [...new Set([...reached, ...edgesReached])].sort(),
    selectedFeatureUuids: [...selectedFeatureUuids].sort(),
  };
}

export function topologyNeighborhood(
  options: Parameters<typeof topologyNeighborhoodSelection>[0]
): string[] {
  return topologyNeighborhoodSelection(options).featureIds;
}
