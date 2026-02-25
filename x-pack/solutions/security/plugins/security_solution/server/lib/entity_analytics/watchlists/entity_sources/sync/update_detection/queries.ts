/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store';
import type { EntityType } from '@kbn/entity-store';
import type { AfterKey } from './types';

const EUID_RUNTIME_FIELD = 'euid';

export const buildEntitiesSearchBody = (
  entityType: EntityType,
  afterKey?: AfterKey,
  pageSize: number = 100
): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    bool: {
      must: [euid.getEuidDslDocumentsContainsIdFilter(entityType)],
    },
  },
  runtime_mappings: {
    [EUID_RUNTIME_FIELD]: euid.getEuidPainlessRuntimeMapping(entityType),
  },
  aggs: {
    entities: {
      composite: {
        size: pageSize,
        sources: [{ euid: { terms: { field: EUID_RUNTIME_FIELD } } }],
        ...(afterKey ? { after: afterKey } : {}),
      },
    },
  },
});
