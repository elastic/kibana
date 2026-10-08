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

  // Display-only edges (supervises) are skipped to keep the preview legible.
  storyline.edges
    .filter((edge) => STORY_EDGE_CONFIG[edge.type].role !== 'context')
    .forEach((edge, index) => {
      if (!addEntity(edge.from) || !addEntity(edge.to)) return;
      const connectorId = `${storyline.evidenceId}-rel-${index}`;
      const dashed = STORY_EDGE_CONFIG[edge.type].role === 'attach';
      nodes.push({
        id: connectorId,
        label: STORY_EDGE_CONFIG[edge.type].verb,
        shape: 'relationship',
      });
      edges.push(
        {
          id: `${connectorId}-a`,
          source: edge.from,
          target: connectorId,
          color: dashed ? 'subdued' : 'primary',
          type: dashed ? 'dashed' : 'solid',
        },
        {
          id: `${connectorId}-b`,
          source: connectorId,
          target: edge.to,
          color: dashed ? 'subdued' : 'primary',
          type: dashed ? 'dashed' : 'solid',
        }
      );
    });

  // Entities with no edge still appear (isolated seeds).
  storyline.entityEuids.forEach(addEntity);

  return { nodes, edges };
};
