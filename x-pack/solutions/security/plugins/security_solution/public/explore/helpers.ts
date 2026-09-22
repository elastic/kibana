/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

export const euidDslFilterToPageFilters = (dsl: QueryDslQueryContainer | undefined): Filter[] => {
  if (dsl == null) return [];
  return [{ meta: { alias: null, negate: false, disabled: false }, query: dsl }];
};
