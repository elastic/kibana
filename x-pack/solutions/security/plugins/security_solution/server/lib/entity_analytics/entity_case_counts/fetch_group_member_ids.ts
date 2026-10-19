/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/server';

const ENTITY_ID_FIELD = 'entity.id';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/** A search returns at most `index.max_result_window` hits, 10,000 by default: one is the probe. */
const MAX_MEMBERS = 10_000 - 1;

/** The members resolved to each entity, by its id, with the given fields of their records. */
export const fetchGroupMembers = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entityIds: readonly string[],
  fields: readonly string[] = []
): Promise<Record<string, Entity[]>> => {
  if (entityIds.length === 0) return {};
  const { hits } = await esClient.search<Entity>({
    index: getEntitiesAlias(ENTITY_LATEST, spaceId),
    ignore_unavailable: true,
    size: MAX_MEMBERS + 1,
    _source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD, ...fields],
    query: { terms: { [RESOLVED_TO_FIELD]: [...entityIds] } },
  });
  if (hits.hits.length > MAX_MEMBERS) {
    throw new Error('The groups of these entities have too many members to read');
  }

  const members: Record<string, Entity[]> = {};
  hits.hits.forEach(({ _source: member }) => {
    const headId = member?.entity?.relationships?.resolution?.resolved_to;
    if (member?.entity?.id && headId) {
      (members[headId] ??= []).push(member);
    }
  });
  return members;
};

export const fetchGroupMemberIds = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entityIds: readonly string[]
): Promise<Record<string, string[]>> =>
  mapValues(await fetchGroupMembers(esClient, spaceId, entityIds), (members) =>
    members.flatMap(({ entity }) => entity?.id ?? [])
  );
