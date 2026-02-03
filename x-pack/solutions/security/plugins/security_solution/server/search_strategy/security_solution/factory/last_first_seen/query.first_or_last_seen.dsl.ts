/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common';
import type { FirstLastSeenRequestOptions } from '../../../../../common/api/search_strategy';
import type { ESQuery } from '../../../../../common/typed_json';
import { buildEntityFiltersFromEntityIdentifiers } from '../../../../../common/search_strategy/security_solution/risk_score/common';
import { getEntitiesIndexNameV2 } from '../../../../lib/entity_analytics/entity_store/utils/entity_utils';

import { createQueryFilterClauses } from '../../../../utils/build_query';

/**
 * Converts flat dotted keys (e.g. host.name, user.entity.id) to nested structure
 * expected by entity store v2 EUID (getEuidDslFilterBasedOnDocument).
 */
const flatEntityIdentifiersToNestedDoc = (
  flat: Record<string, string>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const next = (current as Record<string, unknown>)[p];
      if (next === undefined || typeof next !== 'object') {
        (current as Record<string, unknown>)[p] = {};
      }
      current = (current as Record<string, unknown>)[p] as Record<string, unknown>;
    }
    (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
  }
  return result;
};

/**
 * Resolves entity store v2 EUID filter for host or user from flat entityIdentifiers.
 * Falls back to buildEntityFiltersFromEntityIdentifiers for IPs or when EUID has no match.
 */
const getEntityStoreV2Filters = (
  entityIdentifiers: Record<string, string>
): QueryDslQueryContainer[] => {
  const hasHostKeys = Object.keys(entityIdentifiers).some((k) => k.startsWith('host.'));
  const hasUserKeys = Object.keys(entityIdentifiers).some((k) => k.startsWith('user.'));

  if (hasHostKeys) {
    const nestedDoc = flatEntityIdentifiersToNestedDoc(entityIdentifiers);
    const hostFilter = euid.getEuidDslFilterBasedOnDocument('host', nestedDoc);
    if (hostFilter) {
      return [hostFilter];
    }
  }

  if (hasUserKeys) {
    const nestedDoc = flatEntityIdentifiersToNestedDoc(entityIdentifiers);
    const userFilter = euid.getEuidDslFilterBasedOnDocument('user', nestedDoc);
    if (userFilter) {
      return [userFilter];
    }
  }

  return buildEntityFiltersFromEntityIdentifiers(entityIdentifiers) as QueryDslQueryContainer[];
};

/**
 * Resolves entity store v2 index for host/user, or defaultIndex for IPs / fallback.
 */
const getFirstOrLastSeenIndex = (
  entityIdentifiers: Record<string, string>,
  spaceId: string | undefined,
  defaultIndex: string[] | undefined
): string[] => {
  const namespace = spaceId ?? 'default';
  const hasHostKeys = Object.keys(entityIdentifiers).some((k) => k.startsWith('host.'));
  const hasUserKeys = Object.keys(entityIdentifiers).some((k) => k.startsWith('user.'));

  if (hasHostKeys) {
    return [getEntitiesIndexNameV2('host', namespace)];
  }
  if (hasUserKeys) {
    return [getEntitiesIndexNameV2('user', namespace)];
  }
  return defaultIndex ?? [];
};

export const buildFirstOrLastSeenQuery = (options: FirstLastSeenRequestOptions) => {
  const { entityIdentifiers, defaultIndex, order, filterQuery, spaceId } = options;

  const entityFilters = getEntityStoreV2Filters(entityIdentifiers) as ESQuery[];
  const filter = [...createQueryFilterClauses(filterQuery), ...entityFilters];
  const index = getFirstOrLastSeenIndex(entityIdentifiers, spaceId, defaultIndex);

  const dslQuery = {
    allow_no_indices: true,
    index,
    ignore_unavailable: true,
    track_total_hits: false,
    query: { bool: { filter } },
    _source: false,
    fields: [
      {
        field: '@timestamp',
        format: 'strict_date_optional_time',
      },
    ],
    size: 1,
    sort: [
      {
        '@timestamp': {
          order,
        },
      },
    ],
  };

  return dslQuery;
};
