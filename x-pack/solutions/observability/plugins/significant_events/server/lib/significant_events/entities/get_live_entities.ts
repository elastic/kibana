/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import type { DetectionEntity } from '../../../../common/detection_entities';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';

export const MAX_ENTITIES = 1000;

export const getLiveEntities = async (
  knowledgeIndicatorClient: KnowledgeIndicatorClient,
  sourceIds: string[]
): Promise<{
  entities: Array<Omit<DetectionEntity, 'rules' | 'active_events'>>;
  truncated: boolean;
}> => {
  const { hits } = await knowledgeIndicatorClient.getFeatures(sourceIds, {
    type: ['entity'],
    limit: MAX_ENTITIES,
  });
  const groups = new Map<string, Feature[]>();
  for (const feature of hits) {
    const group = groups.get(feature.id);
    if (group) {
      group.push(feature);
    } else {
      groups.set(feature.id, [feature]);
    }
  }

  const entities = Array.from(groups, ([id, features]) => {
    const [feature] = features;
    const subtypes = new Map<string, number>();
    for (const { subtype } of features) {
      const normalized = subtype?.toLowerCase() ?? '';
      subtypes.set(normalized, (subtypes.get(normalized) ?? 0) + 1);
    }
    const subtype = [...subtypes].sort((left, right) => right[1] - left[1])[0][0];
    return {
      id,
      name:
        typeof feature.properties.name === 'string' ? feature.properties.name : feature.title ?? id,
      subtype,
      source_ids: [...new Set(features.map(({ source_id: sourceId }) => sourceId))],
    };
  });

  return { entities, truncated: hits.length >= MAX_ENTITIES };
};
