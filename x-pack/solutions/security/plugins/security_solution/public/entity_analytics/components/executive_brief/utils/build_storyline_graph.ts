/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EdgeDataModel,
  NodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { STORY_EDGE_CONFIG } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefEntity,
  BriefSnapshot,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';

type EntityShape = 'ellipse' | 'hexagon' | 'rectangle' | 'pentagon';

const SHAPE_BY_TYPE: Record<BriefEntity['type'], EntityShape> = {
  user: 'ellipse',
  host: 'hexagon',
  service: 'rectangle',
  generic: 'pentagon',
};

const ICON_BY_TYPE: Record<BriefEntity['type'], string> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
  generic: 'globe',
};

const colorForEntity = (entity: BriefEntity): 'primary' | 'danger' | 'warning' => {
  if (entity.riskLevel === 'Critical' || entity.riskLevel === 'High') return 'danger';
  if (entity.riskLevel === 'Moderate') return 'warning';
  return 'primary';
};

export interface StorylineGraphData {
  nodes: NodeDataModel[];
  edges: EdgeDataModel[];
}

/**
 * Builds a static graph for a storyline from its computed edges and the snapshot entities, using
 * the entity -> relationship connector -> entity topology the Graph component expects.
 */
export const buildStorylineGraph = (
  storyline: Storyline,
  snapshot: BriefSnapshot
): StorylineGraphData => {
  const nodes: NodeDataModel[] = [];
  const edges: EdgeDataModel[] = [];
  const addedEntities = new Set<string>();

  const addEntity = (euid: string): boolean => {
    const entity = snapshot.entities[euid];
    if (!entity) return false;
    if (addedEntities.has(euid)) return true;
    addedEntities.add(euid);
    nodes.push({
      id: euid,
      label: entity.name,
      icon: ICON_BY_TYPE[entity.type],
      color: colorForEntity(entity),
      shape: SHAPE_BY_TYPE[entity.type],
      ...(entity.riskScoreNorm !== undefined
        ? { riskScore: { min: entity.riskScoreNorm, max: entity.riskScoreNorm } }
        : {}),
      ...(entity.criticality
        ? { assetCriticality: [{ level: entity.criticality, count: 1 }] }
        : {}),
    });
    return true;
  };

  // The layout (dagre) throws on cycles, so the graph must be a DAG: collapse every edge between
  // the same unordered pair into one connector, oriented by entity order (earlier -> later).
  const order = new Map(storyline.entityEuids.map((euid, index) => [euid, index]));
  const rank = (euid: string): number => order.get(euid) ?? Number.MAX_SAFE_INTEGER;
  const pairs = new Map<string, { from: string; to: string; verbs: string[]; dashed: boolean }>();

  // Display-only edges (supervises) are skipped to keep the preview legible.
  storyline.edges
    .filter((edge) => STORY_EDGE_CONFIG[edge.type].role !== 'context' && edge.from !== edge.to)
    .forEach((edge) => {
      const [from, to] =
        rank(edge.from) < rank(edge.to) ||
        (rank(edge.from) === rank(edge.to) && edge.from < edge.to)
          ? [edge.from, edge.to]
          : [edge.to, edge.from];
      const key = `${from}\u0000${to}`;
      const { verb, role } = STORY_EDGE_CONFIG[edge.type];
      const existing = pairs.get(key) ?? { from, to, verbs: [], dashed: true };
      if (!existing.verbs.includes(verb)) existing.verbs.push(verb);
      existing.dashed = existing.dashed && role === 'attach';
      pairs.set(key, existing);
    });

  Array.from(pairs.values()).forEach((pair, index) => {
    if (!addEntity(pair.from) || !addEntity(pair.to)) return;
    const connectorId = `${storyline.evidenceId}-rel-${index}`;
    const color = pair.dashed ? 'subdued' : 'primary';
    const type = pair.dashed ? 'dashed' : 'solid';
    nodes.push({ id: connectorId, label: pair.verbs.join(' / '), shape: 'relationship' });
    edges.push(
      { id: `${connectorId}-a`, source: pair.from, target: connectorId, color, type },
      { id: `${connectorId}-b`, source: connectorId, target: pair.to, color, type }
    );
  });

  // Entities with no edge still appear (isolated seeds).
  storyline.entityEuids.forEach(addEntity);

  return { nodes, edges };
};
