/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombineQueries } from '../../lib/kuery';
import { buildTimeRangeFilter, combineQueries } from '../../lib/kuery';

export const getCombinedFilterQuery = ({
  from,
  to,
  filters,
  ...combineQueriesParams
}: CombineQueries & { from: string; to: string }): string | undefined => {
  const combinedQueries = combineQueries({
    ...combineQueriesParams,
    filters: [...filters, buildTimeRangeFilter(from, to)],
  });

  return combinedQueries ? combinedQueries.filterQuery : undefined;
};
