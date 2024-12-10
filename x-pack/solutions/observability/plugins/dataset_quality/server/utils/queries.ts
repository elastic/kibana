/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isUndefinedOrNull } from '@kbn/observability-plugin/server/utils/queries';

export function wildcardQuery<T extends string>(
  field: T,
  value: string | undefined | null
): QueryDslQueryContainer[] {
  if (isUndefinedOrNull(value) || value === '') {
    return [];
  }

  return [{ wildcard: { [field]: `*${value}*` } }];
}
