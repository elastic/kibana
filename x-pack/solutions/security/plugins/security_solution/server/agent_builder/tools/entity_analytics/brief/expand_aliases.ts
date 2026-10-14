/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { MAX_BRIEF_CANDIDATES } from './brief_types';

/** Aliases read per brief. A resolution group rarely has more than a handful. */
const MAX_ALIASES = MAX_BRIEF_CANDIDATES * 20;
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/**
 * The alias records of the given golden entity ids, grouped by golden id, in one search. Tile ids are
 * golden entities, while risk scores, alerts and anomalies belong to each alias's own EUID.
 */
export const expandAliases = async ({
  entityIds,
  spaceId,
  esClient,
}: {
  entityIds: string[];
  spaceId: string;
  esClient: ElasticsearchClient;
}): Promise<Map<string, Entity[]>> => {
  const response = await esClient.search<Entity>({
    index: getEntitiesAlias(ENTITY_LATEST, spaceId),
    size: MAX_ALIASES,
    ignore_unavailable: true,
    query: { bool: { filter: [{ terms: { [RESOLVED_TO_FIELD]: entityIds } }] } },
    _source: ['entity.id', 'entity.name', RESOLVED_TO_FIELD, 'entity.risk'],
    sort: [{ 'entity.id': 'asc' }],
  });
  const aliasesById = new Map<string, Entity[]>();
  for (const { _source: record } of response.hits.hits) {
    const goldenId = record?.entity?.relationships?.resolution?.resolved_to;
    if (record && goldenId) {
      aliasesById.set(goldenId, [...(aliasesById.get(goldenId) ?? []), record]);
    }
  }
  return aliasesById;
};
