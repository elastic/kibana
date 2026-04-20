/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EntityType } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
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

/**
 * Builds a search body for querying a user-specified source index during index source sync.
 * Filters by correlation field values (from entity store) and an optional KQL queryRule.
 * Groups results by the identifier field using a composite aggregation.
 */
export const buildIndexSourceSearchBody = (
  identifierField: string,
  correlationValues: string[],
  afterKey?: AfterKey,
  pageSize: number = 100,
  queryRule?: string
): Omit<estypes.SearchRequest, 'index'> => {
  const must: estypes.QueryDslQueryContainer[] = [
    { terms: { [identifierField]: correlationValues } },
  ];

  if (queryRule) {
    must.push(toElasticsearchQuery(fromKueryExpression(queryRule)));
  }

  return {
    size: 0,
    query: { bool: { must } },
    aggs: {
      identifiers: {
        composite: {
          size: pageSize,
          sources: [{ identifier: { terms: { field: identifierField } } }],
          ...(afterKey ? { after: afterKey } : {}),
        },
      },
    },
  };
};

/**
 * Builds a search body for querying integration source indices during integration source sync.
 * Uses EUID runtime mappings to compute entity IDs from source documents.
 */
export const buildEntitiesSearchBody = (
  entityType: EntityType,
  afterKey?: AfterKey,
  pageSize: number = 100,
  syncMarker?: string,
  allowedEntityIds?: string[],
  queryRule?: string
): Omit<estypes.SearchRequest, 'index'> => {
  const must: estypes.QueryDslQueryContainer[] = [
    euid.dsl.getEuidDocumentsContainsIdFilter(entityType),
  ];
  if (allowedEntityIds && allowedEntityIds.length > 0) {
    must.push({ terms: { [EUID_RUNTIME_FIELD]: allowedEntityIds } });
  }
  if (syncMarker) {
    must.push({ range: { '@timestamp': { gte: syncMarker, lte: 'now' } } });
  }
  if (queryRule) {
    must.push(toElasticsearchQuery(fromKueryExpression(queryRule)));
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
