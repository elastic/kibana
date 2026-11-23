/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  ApplicationSource,
  ApplicationType,
  MobilePlatform,
} from '../../common/types/applications';
import { useApplicationType } from './use_application_type';
import { useEnvironment } from './use_environment';
import { usePlatformFilter } from './use_platform_filter';
import { useSourceFilter } from './use_source_filter';
import type { TimeRange } from './use_time_range';
import { useTimeRange } from './use_time_range';

/** The list's URL query: the time range, plus the list's filters when set. */
interface ListQuery extends TimeRange {
  environment?: string;
  sourceFilter?: ApplicationSource;
  platformFilter?: MobilePlatform;
  applicationType?: ApplicationType;
}

/**
 * The list's current query, for links that lead back to it (breadcrumbs, application links): the
 * list keeps its filters, and a breadcrumb to the list matches the URL, so no back button shows.
 */
export const useListQuery = (): ListQuery => {
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { sourceFilter } = useSourceFilter();
  const { platformFilter } = usePlatformFilter();
  const { applicationType } = useApplicationType();

  return useMemo(
    () => ({
      ...timeRange,
      ...(environment ? { environment } : {}),
      ...(sourceFilter ? { sourceFilter } : {}),
      ...(platformFilter ? { platformFilter } : {}),
      ...(applicationType ? { applicationType } : {}),
    }),
    [timeRange, environment, sourceFilter, platformFilter, applicationType]
  );
};
