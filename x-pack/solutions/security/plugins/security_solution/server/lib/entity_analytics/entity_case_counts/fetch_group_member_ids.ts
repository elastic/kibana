/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/server';

const ENTITY_ID_FIELD = 'entity.id';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/** A search returns at most `index.max_result_window` hits, 10,000 by default: one is the probe. */
const MAX_MEMBERS = 10_000 - 1;

export const fetchGroupMemberIds = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entityIds: readonly string[]
): Promise<Record<string, string[]>> => {
  if (entityIds.length === 0) return {};
  const { hits } = await esClient.search({
    index: getEntitiesAlias(ENTITY_LATEST, spaceId),
    ignore_unavailable: true,
    size: MAX_MEMBERS + 1,
    _source: false,
    fields: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
    query: { terms: { [RESOLVED_TO_FIELD]: [...entityIds] } },
  });
  if (hits.hits.length > MAX_MEMBERS) {
    throw new Error('The groups of these entities have too many members to count their cases');
  }

  const memberIds: Record<string, string[]> = {};
  hits.hits.forEach(({ fields }) => {
    const [memberId] = fields?.[ENTITY_ID_FIELD] ?? [];
    const [headId] = fields?.[RESOLVED_TO_FIELD] ?? [];
    if (typeof memberId === 'string' && typeof headId === 'string') {
      (memberIds[headId] ??= []).push(memberId);
    }
  });
  return memberIds;
};
