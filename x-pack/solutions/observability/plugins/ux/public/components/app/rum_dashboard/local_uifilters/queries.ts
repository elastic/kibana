/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import { ATTR_SERVICE_ENVIRONMENT } from '@kbn/observability-ui-semantic-conventions';

import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';

type QueryDslQueryContainer = ESFilter;

export function environmentQuery(environment: string): QueryDslQueryContainer[] {
  if (!environment || environment === ENVIRONMENT_ALL.value) {
    return [];
  }

  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    return [{ bool: { must_not: { exists: { field: ATTR_SERVICE_ENVIRONMENT } } } }];
  }

  return [{ term: { [ATTR_SERVICE_ENVIRONMENT]: environment } }];
}
