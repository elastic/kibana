/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityNodeViewModel, EdgeViewModel } from '@kbn/cloud-security-posture-graph';
import type { GetResolutionResponse } from '../../../../../common/api/entity_analytics';

const ENTITY_TYPE_TO_SHAPE: Record<string, EntityNodeViewModel['shape']> = {
  user: 'ellipse',
  host: 'hexagon',
  service: 'pentagon',
  generic: 'rectangle',
};

const ENTITY_TYPE_TO_ICON: Record<string, string> = {
  user: 'user',
  host: 'desktop',
  service: 'gear',
  generic: 'document',
};

/**
 * Transforms entity resolution data into graph nodes and edges for visualization.
 * Creates a star topology with the primary entity at the center.
 */
export function transformResolutionToGraph(
  resolution: GetResolutionResponse,
  entityType: string
): { nodes: EntityNodeViewModel[]; edges: EdgeViewModel[] } {
  const { group_members, primary_entity_id } = resolution;

  // Need at least 2 entities to form a meaningful graph
  if (!group_members || group_members.length < 2) {
    return { nodes: [], edges: [] };
  }

  const shape = ENTITY_TYPE_TO_SHAPE[entityType] ?? 'rectangle';
  const icon = ENTITY_TYPE_TO_ICON[entityType] ?? 'document';

  const nodes: EntityNodeViewModel[] = group_members.map((memberId) => ({
    id: memberId,
    label: memberId, // Entity ID is the name (e.g., "user@domain.com" for users, "hostname" for hosts)
    shape,
    color: memberId === primary_entity_id ? 'primary' : 'warning',
    icon,
  }));

  // Star topology: all member entities connect to the primary entity
  const edges: EdgeViewModel[] = primary_entity_id
    ? group_members
        .filter((id) => id !== primary_entity_id)
        .map((memberId) => ({
          id: `edge-${memberId}-${primary_entity_id}`,
          source: memberId,
          target: primary_entity_id,
          color: 'subdued' as const,
        }))
    : [];

  return { nodes, edges };
}
