/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { ESBoolQuery } from '../../../../common/typed_json';
import { useGlobalTime } from '../../containers/use_global_time';
import { useGlobalFilterQuery } from '../use_global_filter_query';
import { useKibana } from '../../lib/kibana';
import { buildTimeRangeFilter } from '../../lib/kuery';

export const useEsqlGlobalFilterQuery = (): ESBoolQuery | undefined => {
  const { from, to } = useGlobalTime();
  const extraFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);
  const { filterQuery } = useGlobalFilterQuery({ extraFilter });

  return filterQuery;
};

/**
 * Like {@link useEsqlGlobalFilterQuery}, but with a fixed time range instead
 * of the one from the global date picker. Use this for surfaces that should
 * always query a specific range (e.g. a panel hardcoded to "last 30 days")
 * while still respecting pinned KQL and filters from the global filter bar.
 */
export const useEsqlFixedRangeFilterQuery = (from: string, to: string): ESBoolQuery | undefined => {
  const extraFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);
  const { filterQuery } = useGlobalFilterQuery({ extraFilter });

  return filterQuery;
};

/**
 * Builds an ES|QL filter that contains only a time range, ignoring the KQL
 * search bar and global filter pills. Use this when the search bar targets a
 * different index than the one being queried (e.g. an entity-store data view),
 * so its field filters must be resolved separately instead of being applied as
 * a pre-filter on the queried source.
 */
export const useEsqlTimeRangeFilter = (from: string, to: string): ESBoolQuery => {
  const { uiSettings } = useKibana().services;
  return useMemo(
    () =>
      buildEsQuery(undefined, [], [buildTimeRangeFilter(from, to)], getEsQueryConfig(uiSettings)),
    [from, to, uiSettings]
  );
};
