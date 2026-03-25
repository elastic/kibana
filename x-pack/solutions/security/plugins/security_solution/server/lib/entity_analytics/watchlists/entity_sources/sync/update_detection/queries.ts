/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { AfterKey } from './types';

const EUID_RUNTIME_FIELD = 'euid';

/** Entity name fields for top_hits _source when syncMarker is set (used by getEntityNameFromDoc) */
const ENTITY_NAME_SOURCE_FIELDS = [
  '@timestamp',
  'user.name',
  'host.name',
  'service.name',
  'entity.name',
] as const;

export const buildEntitiesSearchBody = (
  entityType: EntityType,
  afterKey?: AfterKey,
  pageSize: number = 100,
  syncMarker?: string,
  allowedEntityIds?: string[]
): Omit<estypes.SearchRequest, 'index'> => {
  const must = [euid.dsl.getEuidDocumentsContainsIdFilter(entityType)];
  if (allowedEntityIds && allowedEntityIds.length > 0) {
    must.push({ terms: { [EUID_RUNTIME_FIELD]: allowedEntityIds } });
  }
  if (syncMarker) {
    must.push({ range: { '@timestamp': { gte: syncMarker, lte: 'now' } } });
  }

  const entitiesComposite = {
    size: pageSize,
    sources: [{ euid: { terms: { field: EUID_RUNTIME_FIELD } } }],
    ...(afterKey ? { after: afterKey } : {}),
  };

  return {
    size: 0,
    query: { bool: { must } },
    runtime_mappings: {
      [EUID_RUNTIME_FIELD]: euid.painless.getEuidRuntimeMapping(entityType),
    },
    aggs: {
      entities: {
        composite: entitiesComposite,
        ...(syncMarker
          ? {
              aggs: {
                latest_doc: {
                  top_hits: {
                    size: 1,
                    sort: [{ '@timestamp': { order: 'desc' as const } }],
                    _source: [...ENTITY_NAME_SOURCE_FIELDS],
                  },
                },
              },
            }
          : {}),
      },
    },
  };
};
