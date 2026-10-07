/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, QueryWithOccurrences } from '@kbn/significant-events-schema';
import type { DetectionEntity, DetectionModel } from '../detection/model';
import { getStreamDeployment } from '../detection/deployment_scope';

export type KnowledgeCategory =
  | 'all'
  | 'services'
  | 'technologies'
  | 'dependencies'
  | 'infrastructure'
  | 'patterns';
export interface KnowledgeFilters {
  category: KnowledgeCategory;
  search: string;
  usage: 'all' | 'missing_queries' | 'with_queries';
  confidence: 'all' | 'high' | 'review';
  freshness: 'all' | 'recent';
  showExpired: boolean;
  showExcluded: boolean;
}
export interface KnowledgeAssociation {
  entities: DetectionEntity[];
  queries: QueryWithOccurrences[];
}

export const knowledgeCategory = (feature: Feature): KnowledgeCategory =>
  feature.type === 'entity'
    ? ['host', 'cluster', 'container', 'pod'].includes(feature.subtype ?? '')
      ? 'infrastructure'
      : 'services'
    : feature.type === 'technology'
    ? 'technologies'
    : feature.type === 'dependency'
    ? 'dependencies'
    : feature.type === 'infrastructure'
    ? 'infrastructure'
    : 'patterns';

/** Joins KI usage by source and stored feature ID; run IDs distinguish snapshot references. */
export const associateKnowledge = (
  features: Feature[],
  queries: QueryWithOccurrences[],
  model: DetectionModel
): Map<string, KnowledgeAssociation> =>
  new Map(
    features.map((feature) => [
      feature.uuid,
      {
        entities: model.entities.filter((entity) =>
          entity.features.some((item) => item.uuid === feature.uuid)
        ),
        queries: queries.filter(
          (query) =>
            query.stream_name === feature.stream_name &&
            query.features?.some((reference) => reference.id === feature.id)
        ),
      },
    ])
  );

export const filterKnowledge = (
  features: Feature[],
  filters: KnowledgeFilters,
  associations: Map<string, KnowledgeAssociation>,
  now: number
): Feature[] =>
  features
    .filter(
      (feature) =>
        (filters.showExcluded || !feature.excluded) &&
        (filters.showExpired || !feature.expires_at || Date.parse(feature.expires_at) > now) &&
        (filters.category === 'all' || knowledgeCategory(feature) === filters.category) &&
        (filters.usage === 'all' ||
          (filters.usage === 'missing_queries'
            ? !associations.get(feature.uuid)?.queries.length
            : Boolean(associations.get(feature.uuid)?.queries.length))) &&
        (filters.confidence === 'all' ||
          (filters.confidence === 'high' ? feature.confidence >= 80 : feature.confidence < 80)) &&
        (filters.freshness === 'all' ||
          Boolean(
            feature.updated_at && Date.parse(feature.updated_at) >= now - 24 * 60 * 60 * 1000
          )) &&
        `${feature.title ?? ''} ${feature.id} ${feature.description} ${feature.stream_name} ${
          feature.subtype ?? ''
        } ${JSON.stringify(feature.properties)}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
    )
    .sort(
      (left, right) =>
        (Date.parse(right.updated_at ?? '') || 0) - (Date.parse(left.updated_at ?? '') || 0)
    );

export interface KnowledgeGraphNode {
  id: string;
  kind: 'feature';
  x: number;
  y: number;
  radius: number;
  degree: number;
  anchor: boolean;
  label: string;
  stream: string;
  category: KnowledgeCategory;
  feature: Feature;
  features: Feature[];
  entity?: DetectionEntity;
}
export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: 'context' | 'dependency' | 'identity';
  features?: Feature[];
}
export interface KnowledgeGraphLayout {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  width: number;
  height: number;
}

export const knowledgeHash = (value: string): number => {
  let result = 7;
  for (const character of value) result = (result * 31 + character.charCodeAt(0)) % 2147483647;
  return result;
};

/** Makes service stars grow with attached knowledge and distinct visible connections. */
export const knowledgeNodeRadius = (degree: number, service = false, records = 1): number =>
  service
    ? Math.min(24, 3 + Math.sqrt(degree + Math.max(0, records - 1)) * 3.2)
    : Math.min(14, 3 + Math.sqrt(degree) * 1.8);

/** Provides a gently tilted two-arm spiral used only as a layout attractor. */
export const knowledgeSpiralPoint = (
  width: number,
  height: number,
  orbit: number,
  arm: number
): { x: number; y: number } => {
  const angle = arm * Math.PI + orbit * 4.8 - 1.2;
  return {
    x: width / 2 + Math.cos(angle) * width * 0.43 * orbit,
    y: height / 2 + Math.sin(angle) * height * 0.4 * orbit,
  };
};

/** Builds KI-only links from shared source context, entity identity, and learned dependency evidence. */
export const buildKnowledgeGraph = (
  features: Feature[],
  associations: Map<string, KnowledgeAssociation>,
  model: DetectionModel,
  aspectRatio = 2.8
): KnowledgeGraphLayout => {
  const matchingDependencies = new Set(
    features.filter((feature) => feature.type === 'dependency').map((feature) => feature.uuid)
  );
  const dependenciesOnly =
    features.length > 0 && features.every((feature) => feature.type === 'dependency');
  const entityIds = new Set(
    features.flatMap((feature) =>
      (associations.get(feature.uuid)?.entities ?? []).map((entity) => entity.id)
    )
  );
  const initialEntities = new Set(entityIds);
  const relationships = model.relationships.filter((relationship) =>
    dependenciesOnly
      ? relationship.features.some((feature) => matchingDependencies.has(feature.uuid))
      : features.length > 0 &&
        (initialEntities.has(relationship.source) || initialEntities.has(relationship.target))
  );
  for (const relationship of relationships) {
    entityIds.add(relationship.source);
    entityIds.add(relationship.target);
  }
  const records = new Map(
    features
      .filter((feature) => feature.type !== 'dependency')
      .map((feature) => [feature.uuid, feature])
  );
  for (const entity of model.entities.filter((candidate) => entityIds.has(candidate.id))) {
    const primary =
      entity.features.find(
        (feature) => feature.type === 'entity' && entity.streams.includes(feature.stream_name)
      ) ?? entity.features.find((feature) => feature.type === 'entity');
    if (primary) records.set(primary.uuid, primary);
  }
  const nodeFeatures = [...records.values()];
  const streams = [...new Set(nodeFeatures.map((feature) => feature.stream_name))].sort(
    (left, right) => knowledgeHash(left) - knowledgeHash(right)
  );
  const width = Math.max(620, Math.sqrt(nodeFeatures.length + 1) * 83);
  const height = Math.max(360, width / Math.max(1.2, Math.min(3, aspectRatio)));
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const entityNodes = new Map<string, string[]>();
  const anchors = new Map<string, Feature>();
  for (const stream of streams) {
    const items = nodeFeatures.filter((feature) => feature.stream_name === stream);
    const name = stream
      .replace(/^logs-/, '')
      .split('.')[0]
      .toLowerCase()
      .replace(/_/g, '-');
    const primary =
      items.find(
        (feature) =>
          feature.type === 'entity' &&
          String(feature.properties.name ?? feature.id)
            .toLowerCase()
            .replace(/_/g, '-') === name
      ) ??
      items.find((feature) => feature.type === 'entity') ??
      items[0];
    anchors.set(stream, primary);
  }
  streams.forEach((stream, streamIndex) => {
    const items = nodeFeatures.filter((feature) => feature.stream_name === stream);
    const primary = anchors.get(stream);
    if (!primary) return;
    // Source membership seeds the arms; gravity and real links still choose local neighborhoods.
    const arm = streamIndex % 2;
    const orbit =
      0.08 + ((Math.floor(streamIndex / 2) + 1) / (Math.ceil(streams.length / 2) + 1)) * 0.88;
    const { x: centerX, y: centerY } = knowledgeSpiralPoint(width, height, orbit, arm);
    items.forEach((feature) => {
      const id = `feature:${feature.uuid}`;
      const owners = associations.get(feature.uuid)?.entities ?? [];
      const entity =
        feature.type === 'entity'
          ? owners.find((owner) =>
              owner.features.some((item) => item.uuid === feature.uuid && item.type === 'entity')
            )
          : undefined;
      if (entity) entityNodes.set(entity.id, [...(entityNodes.get(entity.id) ?? []), id]);
      const phase = ((knowledgeHash(feature.uuid) % 1000) * Math.PI * 2) / 1000;
      const distance = feature.uuid === primary.uuid ? 0 : 12 + Math.sqrt(items.length) * 3;
      const localOrbit = Math.max(
        0.025,
        Math.min(0.98, orbit + ((Math.cos(phase) * distance) / width) * 2)
      );
      const position = knowledgeSpiralPoint(width, height, localOrbit, arm);
      const scatter = feature.uuid === primary.uuid ? 0 : Math.sin(phase) * 12;
      nodes.push({
        id,
        kind: 'feature',
        x: feature.uuid === primary.uuid ? centerX : position.x + Math.cos(phase) * scatter,
        y: feature.uuid === primary.uuid ? centerY : position.y + Math.sin(phase) * scatter,
        radius: 5,
        degree: 0,
        anchor: primary.uuid === feature.uuid,
        label: feature.title ?? feature.id,
        stream,
        category: knowledgeCategory(feature),
        feature,
        features: [feature],
        entity,
      });
      if (feature.uuid !== primary.uuid)
        edges.push({
          id: `context:${feature.uuid}`,
          source: `feature:${primary.uuid}`,
          target: id,
          kind: 'context',
        });
    });
  });
  for (const [entityId, ids] of entityNodes) {
    const primary = ids.find((id) => nodes.find((node) => node.id === id)?.anchor) ?? ids[0];
    for (const id of ids)
      if (id !== primary)
        edges.push({
          id: `identity:${entityId}:${id}`,
          source: primary,
          target: id,
          kind: 'identity',
        });
  }
  for (const relationship of relationships) {
    const sourceIds = entityNodes.get(relationship.source) ?? [];
    const targetIds = entityNodes.get(relationship.target) ?? [];
    const source =
      sourceIds.find((id) => nodes.find((node) => node.id === id)?.anchor) ?? sourceIds[0];
    const target =
      targetIds.find((id) => nodes.find((node) => node.id === id)?.anchor) ?? targetIds[0];
    if (source && target)
      edges.push({
        id: `dependency:${relationship.id}`,
        source,
        target,
        kind: 'dependency',
        features: relationship.features,
      });
  }
  // This view merges duplicate service KIs, while retaining the independent source records.
  const groups = new Map<string, KnowledgeGraphNode>();
  const aliases = new Map<string, string>();
  for (const node of nodes) {
    const name = String(node.feature.properties.name ?? node.feature.id)
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
    const namespace = String(
      node.feature.properties.service_namespace ??
        node.feature.properties.namespace ??
        node.entity?.namespace ??
        getStreamDeployment(node.stream)
    );
    const id =
      node.feature.type === 'entity' && node.category === 'services'
        ? `service:${JSON.stringify([namespace, name])}`
        : node.id;
    aliases.set(node.id, id);
    const existing = groups.get(id);
    if (!existing) {
      groups.set(id, { ...node, id });
      continue;
    }
    existing.features.push(node.feature);
    if (
      (!existing.anchor && node.anchor) ||
      (existing.anchor === node.anchor &&
        Date.parse(node.feature.updated_at ?? '') > Date.parse(existing.feature.updated_at ?? ''))
    ) {
      existing.x = node.x;
      existing.y = node.y;
      existing.feature = node.feature;
      existing.entity = node.entity;
      existing.stream = node.stream;
      existing.label = node.label;
    }
    existing.anchor ||= node.anchor;
  }
  const mergedEdges = edges
    .map((edge) => ({
      ...edge,
      source: aliases.get(edge.source) ?? edge.source,
      target: aliases.get(edge.target) ?? edge.target,
    }))
    .filter((edge) => edge.source !== edge.target);
  const priority = { context: 0, identity: 1, dependency: 2 };
  const edgeGroups = new Map<string, KnowledgeGraphEdge>();
  for (const edge of mergedEdges) {
    const key = [edge.source, edge.target].sort().join(':');
    const existing = edgeGroups.get(key);
    if (!existing || priority[edge.kind] > priority[existing.kind]) edgeGroups.set(key, edge);
    else if (edge.kind === 'dependency' && existing.kind === 'dependency')
      existing.features = [
        ...new Map(
          [...(existing.features ?? []), ...(edge.features ?? [])].map((feature) => [
            feature.uuid,
            feature,
          ])
        ).values(),
      ];
  }
  const unique = [...edgeGroups.values()];
  const mergedNodes = [...groups.values()];
  const degrees = new Map<string, number>();
  for (const edge of unique)
    for (const id of [edge.source, edge.target]) degrees.set(id, (degrees.get(id) ?? 0) + 1);
  for (const node of mergedNodes) {
    node.degree = degrees.get(node.id) ?? 0;
    node.radius = knowledgeNodeRadius(
      node.degree,
      node.feature.type === 'entity' && node.category === 'services',
      node.features.length
    );
  }
  return { nodes: mergedNodes, edges: unique, width, height };
};
