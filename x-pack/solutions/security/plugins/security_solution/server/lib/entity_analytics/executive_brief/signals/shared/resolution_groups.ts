/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BriefEntityType } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import type { EntityRef } from '../types';
import { getEntitiesLatestIndex } from './indices';

const MAX_GROUP_DOCS = 1000;
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

export interface ResolutionGroups {
  /** Golden euid -> golden euid followed by its aliases. */
  membersOf: Map<string, string[]>;
  /** Any member euid (golden or alias) -> its golden euid. */
  goldenOf: Map<string, string>;
  /** `fields` values of every member doc found in the store, by member euid. */
  fieldsOf: Map<string, Record<string, unknown[]>>;
}

const asStringList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : []).filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );

/** Best-effort display name from an euid, for members with no document in the store. */
export const nameFromEuid = (euid: string): string => {
  const body = euid.slice(euid.indexOf(':') + 1);
  return euid.startsWith('user:') ? body.split('@')[0] : body;
};

export const entityTypeFromEuid = (euid: string): BriefEntityType => {
  const prefix = euid.split(':')[0];
  return prefix === 'user' || prefix === 'host' || prefix === 'service' ? prefix : 'generic';
};

/**
 * Expands golden entities to their resolution groups (the golden entity plus every alias that
 * resolves to it) with one search over the Entity Store latest index. Alerts, risk and metadata
 * can be stamped with any member's euid, so entity signals match on the whole group.
 * Extra `fields` of every member doc are returned so callers need no second lookup.
 */
export const fetchResolutionGroups = async ({
  esClient,
  spaceId,
  goldenEuids,
  fields = [],
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  goldenEuids: string[];
  fields?: string[];
  abortSignal: AbortSignal;
}): Promise<ResolutionGroups> => {
  const goldens = [...new Set(goldenEuids)].sort();
  const membersOf = new Map<string, string[]>(goldens.map((euid) => [euid, [euid]]));
  const goldenOf = new Map<string, string>(goldens.map((euid) => [euid, euid]));
  const fieldsOf = new Map<string, Record<string, unknown[]>>();
  if (goldens.length === 0) {
    return { membersOf, goldenOf, fieldsOf };
  }

  const response = await esClient.search(
    {
      index: getEntitiesLatestIndex(spaceId),
      size: MAX_GROUP_DOCS,
      _source: false,
      fields: ['entity.id', RESOLVED_TO_FIELD, ...fields],
      sort: [{ 'entity.id': 'asc' }],
      query: {
        bool: {
          should: [
            { terms: { 'entity.id': goldens } },
            { terms: { [RESOLVED_TO_FIELD]: goldens } },
          ],
          minimum_should_match: 1,
        },
      },
    },
    { signal: abortSignal }
  );

  for (const hit of response.hits.hits) {
    const docFields = (hit.fields ?? {}) as Record<string, unknown[]>;
    const [euid] = asStringList(docFields['entity.id']);
    const [resolvedTo] = asStringList(docFields[RESOLVED_TO_FIELD]);
    const golden = resolvedTo && membersOf.has(resolvedTo) ? resolvedTo : euid;
    if (euid && golden && membersOf.has(golden)) {
      if (golden !== euid) {
        goldenOf.set(euid, golden);
        membersOf.get(golden)?.push(euid);
      }
      fieldsOf.set(euid, docFields);
    }
  }
  membersOf.forEach((members, golden) => {
    members.splice(0, members.length, golden, ...members.filter((m) => m !== golden).sort());
  });
  return { membersOf, goldenOf, fieldsOf };
};

/** Name lookup for any member euid of the given entities. */
export const buildNameLookup = (entities: EntityRef[]): ((euid: string) => string) => {
  const names = new Map(entities.map((entity) => [entity.euid, entity.name]));
  return (euid) => names.get(euid) ?? nameFromEuid(euid);
};
