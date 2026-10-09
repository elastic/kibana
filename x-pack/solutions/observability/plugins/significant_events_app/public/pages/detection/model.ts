/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Detection,
  Feature,
  QueryWithOccurrences,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { getStreamDeployment } from './deployment_scope';

export interface DetectionEntity {
  id: string;
  name: string;
  label: string;
  subtype: string;
  namespace: string;
  environment: string;
  features: Feature[];
  streams: string[];
  queries: QueryWithOccurrences[];
  detections: Detection[];
  events: SignificantEventResponse[];
}

/** Counts rule presence from unexpired queries with a backing rule. */
export const hasRuleCoverage = (entity: DetectionEntity): boolean =>
  entity.queries.some(
    (query) => query.rule_backed && (!query.expires_at || Date.parse(query.expires_at) > Date.now())
  );

export interface DetectionRelationship {
  id: string;
  source: string;
  target: string;
  features: Feature[];
}

export interface DetectionModel {
  entities: DetectionEntity[];
  relationships: DetectionRelationship[];
  unresolvedRelationships: number;
  unassignedRules: number;
}

const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/_/g, '-');
const property = (feature: Feature, key: string): string => {
  const value = feature.properties[key];
  return typeof value === 'string' ? value : '';
};
const featureName = (feature: Feature): string =>
  normalizeName(property(feature, 'name') || feature.id);
const streamEntityName = (stream: string): string =>
  normalizeName(stream.replace(/^logs-/, '').split('.')[0]);
const ownsStream = (feature: Feature): boolean =>
  featureName(feature) === streamEntityName(feature.stream_name);

/** Builds an evidence-backed read model without inventing links from co-occurrence or prose. */
export const buildDetectionModel = (
  features: Feature[],
  queries: QueryWithOccurrences[],
  detections: Detection[],
  events: SignificantEventResponse[]
): DetectionModel => {
  const activeFeatures = features.filter(
    (feature) =>
      !feature.excluded && (!feature.expires_at || Date.parse(feature.expires_at) > Date.now())
  );
  const entities: DetectionEntity[] = [];
  const featureEntity = new Map<string, DetectionEntity>();
  const key = (feature: Feature): string => `${feature.stream_name}:${feature.id}`;
  const entityFeatures = activeFeatures
    .filter((feature) => feature.type === 'entity')
    .sort(
      (left, right) =>
        Number(ownsStream(right)) - Number(ownsStream(left)) || left.uuid.localeCompare(right.uuid)
    );

  for (const feature of entityFeatures) {
    const name = featureName(feature);
    const namespace =
      property(feature, 'service_namespace') ||
      property(feature, 'namespace') ||
      getStreamDeployment(feature.stream_name);
    const environment =
      property(feature, 'environment') || property(feature, 'deployment_environment');
    const candidates = entities.filter(
      (entity) =>
        entity.name === name &&
        (!namespace || !entity.namespace || namespace === entity.namespace) &&
        (!environment || !entity.environment || environment === entity.environment)
    );
    const entity: DetectionEntity =
      candidates.length === 1
        ? candidates[0]
        : {
            id: JSON.stringify([environment, namespace, name]),
            name,
            label: feature.title || property(feature, 'name') || feature.id,
            subtype: feature.subtype || 'service',
            namespace,
            environment,
            features: [],
            streams: [],
            queries: [],
            detections: [],
            events: [],
          };
    if (!entities.includes(entity)) entities.push(entity);
    if (ownsStream(feature) || entity.streams.length === 0) {
      if (!entity.streams.includes(feature.stream_name)) entity.streams.push(feature.stream_name);
    }
    entity.features.push(feature);
    featureEntity.set(key(feature), entity);
  }

  const streamOwners = (stream: string): DetectionEntity[] => {
    const explicit = entities.filter(
      (entity) => entity.name === streamEntityName(stream) && entity.streams.includes(stream)
    );
    if (explicit.length) return explicit;
    const candidates = entities.filter((entity) => entity.streams.includes(stream));
    return candidates.length === 1 ? candidates : [];
  };
  for (const feature of activeFeatures.filter((item) => item.type !== 'entity')) {
    for (const entity of streamOwners(feature.stream_name)) entity.features.push(feature);
  }

  const resolveEndpoint = (
    name: string,
    stream: string,
    namespace?: string
  ): DetectionEntity | undefined => {
    const deployment =
      namespace || streamOwners(stream)[0]?.namespace || getStreamDeployment(stream);
    const candidates = entities.filter(
      (entity) =>
        entity.name === normalizeName(name) && (!deployment || entity.namespace === deployment)
    );
    const local = candidates.filter((entity) =>
      entity.features.some((feature) => feature.stream_name === stream)
    );
    return local.length === 1 ? local[0] : candidates.length === 1 ? candidates[0] : undefined;
  };
  const relationships: DetectionRelationship[] = [];
  let unresolvedRelationships = 0;
  for (const feature of activeFeatures.filter((item) => item.type === 'dependency')) {
    const source = resolveEndpoint(
      property(feature, 'source'),
      feature.stream_name,
      property(feature, 'source_namespace')
    );
    const target = resolveEndpoint(
      property(feature, 'target'),
      feature.stream_name,
      property(feature, 'target_namespace')
    );
    if (!source || !target || source === target) {
      unresolvedRelationships++;
      continue;
    }
    const id = JSON.stringify([source.id, target.id]);
    const existing = relationships.find((relationship) => relationship.id === id);
    if (existing) existing.features.push(feature);
    else relationships.push({ id, source: source.id, target: target.id, features: [feature] });
  }

  let unassignedRules = 0;
  for (const query of queries) {
    const owners = streamOwners(query.stream_name);
    const direct = (query.features ?? []).flatMap((reference) => {
      const entity = featureEntity.get(`${query.stream_name}:${reference.id}`);
      return entity ? [entity] : [];
    });
    const assigned = owners.length ? owners : [...new Set(direct)];
    if (!assigned.length) unassignedRules++;
    for (const entity of assigned) entity.queries.push(query);
  }
  for (const detection of detections) {
    for (const entity of entities.filter((item) =>
      item.queries.some((query) => query.rule_uuid === detection.rule_uuid)
    )) {
      entity.detections.push(detection);
    }
  }
  for (const event of events) {
    const referencedIds = new Set(
      (event.causal_features ?? []).map((feature) => feature.feature_id)
    );
    for (const entity of entities) {
      const hasFeature = entity.features.some(
        (feature) =>
          referencedIds.has(feature.id) && event.stream_names.includes(feature.stream_name)
      );
      const hasSource = entity.streams.some((stream) => event.stream_names.includes(stream));
      if (hasFeature || hasSource) entity.events.push(event);
    }
  }
  return {
    entities: entities.sort((left, right) => left.label.localeCompare(right.label)),
    relationships,
    unresolvedRelationships,
    unassignedRules,
  };
};

export interface PositionedEntity {
  entity: DetectionEntity;
  x: number;
  y: number;
}

export interface DetectionIsland {
  namespace: string;
  entityIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionTopologyLayout {
  nodes: PositionedEntity[];
  islands: DetectionIsland[];
  width: number;
  height: number;
}

const positionNamespaceEntities = (
  entities: DetectionEntity[],
  relationships: DetectionRelationship[],
  preferredColumns: number
): DetectionTopologyLayout => {
  const connected = new Set(relationships.flatMap((edge) => [edge.source, edge.target]));
  const depth = new Map(entities.map((entity) => [entity.id, 0]));
  const indegree = new Map(
    entities.map((entity) => [
      entity.id,
      relationships.filter((edge) => edge.target === entity.id).length,
    ])
  );
  const queue = entities
    .filter((entity) => indegree.get(entity.id) === 0)
    .map((entity) => entity.id);
  while (queue.length) {
    const id = queue.shift();
    if (!id) continue;
    for (const edge of relationships.filter((relationship) => relationship.source === id)) {
      depth.set(edge.target, Math.max(depth.get(edge.target) ?? 0, (depth.get(id) ?? 0) + 1));
      const remaining = (indegree.get(edge.target) ?? 1) - 1;
      indegree.set(edge.target, remaining);
      if (remaining === 0) queue.push(edge.target);
    }
  }
  const layers = new Map<number, DetectionEntity[]>();
  for (const entity of entities.filter((item) => connected.has(item.id))) {
    const layer = Math.min(depth.get(entity.id) ?? 0, 4);
    layers.set(layer, [...(layers.get(layer) ?? []), entity]);
  }
  const rows = Math.max(1, ...[...layers.values()].map((layer) => layer.length));
  const nodes = [...layers.entries()].flatMap(([layer, items]) =>
    items.map((entity, index) => ({
      entity,
      x: 28 + layer * 232,
      y: 76 + index * 96 + (rows - items.length) * 48,
    }))
  );
  const isolated = entities.filter((entity) => !connected.has(entity.id));
  const columns = Math.max(1, Math.min(preferredColumns, Math.ceil(Math.sqrt(isolated.length))));
  const isolatedTop = nodes.length ? Math.max(...nodes.map((node) => node.y)) + 112 : 76;
  nodes.push(
    ...isolated.map((entity, index) => ({
      entity,
      x: 28 + (index % columns) * 232,
      y: isolatedTop + Math.floor(index / columns) * 96,
    }))
  );
  return {
    nodes,
    islands: [],
    width: Math.max(...nodes.map((node) => node.x + 184)) + 28,
    height: Math.max(...nodes.map((node) => node.y + 64)) + 28,
  };
};

/** Packs namespace islands independently, preserving learned dependencies between their services. */
export const positionDetectionEntities = (
  model: DetectionModel,
  preferredColumns = 3,
  viewportAspectRatio = 1.6
): DetectionTopologyLayout => {
  if (!model.entities.length) return { nodes: [], islands: [], width: 300, height: 200 };
  const namespaces = new Map<string, DetectionEntity[]>();
  for (const entity of model.entities) {
    const group = namespaces.get(entity.namespace) ?? [];
    group.push(entity);
    namespaces.set(entity.namespace, group);
  }
  const groups = [...namespaces.entries()]
    .map(([namespace, entities]) => {
      const ids = new Set(entities.map((entity) => entity.id));
      const layout = positionNamespaceEntities(
        [...entities].sort(
          (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id)
        ),
        model.relationships.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
        preferredColumns
      );
      return { namespace, ...layout };
    })
    .sort(
      (left, right) => right.height - left.height || left.namespace.localeCompare(right.namespace)
    );
  const gap = 64;
  const widest = Math.max(...groups.map((group) => group.width));
  const totalWidth = groups.reduce((sum, group) => sum + group.width + gap, -gap);
  const aspectRatio =
    Number.isFinite(viewportAspectRatio) && viewportAspectRatio > 0 ? viewportAspectRatio : 1.6;
  let best: DetectionTopologyLayout | undefined;
  let bestScale = 0;
  // Compare compact arrangements against the actual viewport rather than leaving a long strip of islands.
  for (let attempt = 0; attempt <= 16; attempt++) {
    const limit = widest + ((totalWidth - widest) * attempt) / 16;
    const islands: DetectionIsland[] = [];
    const nodes: PositionedEntity[] = [];
    for (const group of groups) {
      const candidates = [0, ...islands.map((island) => island.x + island.width + gap)];
      const placement = candidates
        .filter((x) => x + group.width <= limit)
        .map((x) => ({
          x,
          y: Math.max(
            0,
            ...islands
              .filter(
                (island) => x < island.x + island.width + gap && x + group.width + gap > island.x
              )
              .map((island) => island.y + island.height + gap)
          ),
        }))
        .sort((left, right) => left.y - right.y || left.x - right.x)[0];
      islands.push({
        namespace: group.namespace,
        entityIds: group.nodes.map((node) => node.entity.id),
        ...placement,
        width: group.width,
        height: group.height,
      });
      nodes.push(
        ...group.nodes.map((node) => ({
          ...node,
          x: node.x + placement.x,
          y: node.y + placement.y,
        }))
      );
    }
    const width = Math.max(...islands.map((island) => island.x + island.width));
    const height = Math.max(...islands.map((island) => island.y + island.height));
    const scale = Math.min(aspectRatio / (width + 96), 1 / (height + 96));
    if (scale > bestScale) {
      bestScale = scale;
      best = { nodes, islands, width, height };
    }
  }
  return best ?? { nodes: [], islands: [], width: 300, height: 200 };
};

export const aggregateOccurrences = (
  queries: QueryWithOccurrences[]
): Array<{ x: number; y: number }> => {
  const buckets = new Map<number, number>();
  for (const query of queries)
    for (const occurrence of query.occurrences) {
      const timestamp = new Date(occurrence.date).getTime();
      if (Number.isFinite(timestamp))
        buckets.set(timestamp, (buckets.get(timestamp) ?? 0) + occurrence.count);
    }
  return [...buckets].sort(([left], [right]) => left - right).map(([x, y]) => ({ x, y }));
};
