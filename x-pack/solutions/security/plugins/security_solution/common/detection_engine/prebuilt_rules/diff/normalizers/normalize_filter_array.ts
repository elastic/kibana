/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { RuleFilterArray } from '../../../../api/detection_engine/model/rule_schema';

export const normalizeFilterArray = (filters: RuleFilterArray | undefined): RuleFilterArray => {
  if (!filters?.length) {
    return [];
  }
  return (filters as Filter[]).map((filter) => ({
    query: filter.query,
    meta: filter.meta
      ? {
          negate: filter.meta.negate,
          disabled: filter.meta.disabled ?? false,
          params: filter.meta.params,
          relation: 'relation' in filter.meta ? filter.meta?.relation : undefined,
          type: filter.meta.type ?? 'custom',
          alias: filter.meta.alias ?? undefined,
          key: filter.meta.key ?? undefined,
        }
      : undefined,
  }));
};
