/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGlobalTime } from '../../containers/use_global_time';
import { useGlobalFilterQuery } from '../use_global_filter_query';
import { inputsSelectors } from '../../store';
import { buildTimeRangeFilter } from '../../lib/kuery';
import { buildESQLWithKQLQuery } from '../../utils/esql';
import { useDeepEqualSelector } from '../use_selector';

export const useEsqlQueryWithGlobalFilters = (initialQuery: string) => {
  const { from, to } = useGlobalTime();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const { filterQuery } = useGlobalFilterQuery({ extraFilter: buildTimeRangeFilter(from, to) });
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);

  const query = useMemo(
    () => buildESQLWithKQLQuery(initialQuery, globalQuery.query as string),
    [globalQuery.query, initialQuery]
  );

  return { query, filterQuery };
};
