/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ESBoolQuery } from '../../../../common/typed_json';
import { useGlobalTime } from '../../containers/use_global_time';
import { useGlobalFilterQuery } from '../use_global_filter_query';
import { buildTimeRangeFilter } from '../../lib/kuery';

export const useEsqlGlobalFilterQuery = (): ESBoolQuery | undefined => {
  const { from, to } = useGlobalTime();
  const extraFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);
  const { filterQuery } = useGlobalFilterQuery({ extraFilter });

  return filterQuery;
};
