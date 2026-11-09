/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewPercentileParam, OverviewSearchParams } from '../../common/overview_filters';
import type { ApplicationRequestOptions } from '../hooks/use_application_data';

/**
 * The options of an application's request with the Overview's filters and KQL in its query, and
 * `extra` params of the routes that take more, e.g. the percentile.
 */
export const withOverviewFilters = (
  { signal, params: { path, query } }: ApplicationRequestOptions,
  searchParams: OverviewSearchParams,
  extra?: { percentile?: OverviewPercentileParam }
) => ({
  signal,
  params: { path, query: { ...query, ...searchParams, ...extra } },
});
