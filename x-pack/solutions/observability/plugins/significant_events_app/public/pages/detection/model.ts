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
    const namespace = property(feature, 'service_namespace') || property(feature, 'namespace');
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

  const resolveEndpoint = (name: string, stream: string): DetectionEntity | undefined => {
    const candidates = entities.filter((entity) => entity.name === normalizeName(name));
    const local = candidates.filter((entity) =>
      entity.features.some((feature) => feature.stream_name === stream)
    );
    return local.length === 1 ? local[0] : candidates.length === 1 ? candidates[0] : undefined;
  };
  const relationships: DetectionRelationship[] = [];
  let unresolvedRelationships = 0;
  for (const feature of activeFeatures.filter((item) => item.type === 'dependency')) {
    const source = resolveEndpoint(property(feature, 'source'), feature.stream_name);
    const target = resolveEndpoint(property(feature, 'target'), feature.stream_name);
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

/** Keeps dependency layers stable, with a separate row for entities without known relationships. */
export const positionDetectionEntities = (
  model: DetectionModel
): { nodes: PositionedEntity[]; width: number; height: number } => {
  const connected = new Set(model.relationships.flatMap((edge) => [edge.source, edge.target]));
  const depth = new Map(model.entities.map((entity) => [entity.id, 0]));
  const indegree = new Map(
    model.entities.map((entity) => [
      entity.id,
      model.relationships.filter((edge) => edge.target === entity.id).length,
    ])
  );
  const queue = model.entities
    .filter((entity) => indegree.get(entity.id) === 0)
    .map((entity) => entity.id);
  while (queue.length) {
    const id = queue.shift();
    if (!id) continue;
    for (const edge of model.relationships.filter((relationship) => relationship.source === id)) {
      depth.set(edge.target, Math.max(depth.get(edge.target) ?? 0, (depth.get(id) ?? 0) + 1));
      const remaining = (indegree.get(edge.target) ?? 1) - 1;
      indegree.set(edge.target, remaining);
      if (remaining === 0) queue.push(edge.target);
    }
  }
  const layers = new Map<number, DetectionEntity[]>();
  for (const entity of model.entities.filter((item) => connected.has(item.id))) {
    const layer = Math.min(depth.get(entity.id) ?? 0, 4);
    layers.set(layer, [...(layers.get(layer) ?? []), entity]);
  }
  const columns = Math.max(3, layers.size);
  const width = columns * 240;
  const rows = Math.max(1, ...[...layers.values()].map((layer) => layer.length));
  const connectedHeight = rows * 96 + 70;
  const nodes = [...layers.entries()].flatMap(([layer, items]) =>
    items.map((entity, index) => ({
      entity,
      x: 28 + layer * 240,
      y: 54 + index * 96 + (rows - items.length) * 48,
    }))
  );
  const isolated = model.entities.filter((entity) => !connected.has(entity.id));
  nodes.push(
    ...isolated.map((entity, index) => ({
      entity,
      x: 28 + (index % columns) * 240,
      y: connectedHeight + 28 + Math.floor(index / columns) * 96,
    }))
  );
  return {
    nodes,
    width,
    height: Math.max(300, connectedHeight + Math.ceil(isolated.length / columns) * 96 + 38),
  };
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
