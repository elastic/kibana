/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ApplicationSource } from '../../common/types/applications';
import { useEnvironment } from './use_environment';
import { useSourceFilter } from './use_source_filter';
import type { TimeRange } from './use_time_range';
import { useTimeRange } from './use_time_range';

/** The list's URL query: the time range, plus the list's filters when set. */
interface ListQuery extends TimeRange {
  environment?: string;
  sourceFilter?: ApplicationSource;
}

/**
 * The list's current query, for links that lead back to it (breadcrumbs, application links): the
 * list keeps its filters, and a breadcrumb to the list matches the URL, so no back button shows.
 */
export const useListQuery = (): ListQuery => {
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { sourceFilter } = useSourceFilter();

  return useMemo(
    () => ({
      ...timeRange,
      ...(environment ? { environment } : {}),
      ...(sourceFilter ? { sourceFilter } : {}),
    }),
    [timeRange, environment, sourceFilter]
  );
};
