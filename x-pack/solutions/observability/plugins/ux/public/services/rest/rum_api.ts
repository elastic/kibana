/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  RumErrorsResponse,
  RumFiltersResponse,
  RumOverviewResponse,
  RumPagesResponse,
} from '../../../common/rum_app';

export interface RumQueryParams {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  browser?: string;
  os?: string;
  pageUrl?: string;
  frustration?: string;
  user?: string;
  includeBots?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
}

const rumQuery = ({
  rangeFrom,
  rangeTo,
  serviceName,
  browser,
  os,
  pageUrl,
  frustration,
  user,
  includeBots,
  kuery,
  breakpoint,
  connection,
  device,
}: Omit<RumQueryParams, 'http'>) => ({
  rangeFrom,
  rangeTo,
  ...(serviceName ? { serviceName } : {}),
  ...(browser ? { browser } : {}),
  ...(os ? { os } : {}),
  ...(pageUrl ? { pageUrl } : {}),
  ...(frustration ? { frustration } : {}),
  ...(user ? { user } : {}),
  ...(includeBots ? { includeBots } : {}),
  ...(kuery ? { kuery } : {}),
  ...(breakpoint ? { breakpoint } : {}),
  ...(connection ? { connection } : {}),
  ...(device ? { device } : {}),
});

export const fetchRumFilters = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumFiltersResponse> => {
  return http.get<RumFiltersResponse>('/internal/ux/rum/filters', { query: rumQuery(params) });
};

export const fetchRumOverview = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumOverviewResponse> => {
  return http.get<RumOverviewResponse>('/internal/ux/rum/overview', { query: rumQuery(params) });
};

export const fetchRumPages = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumPagesResponse> => {
  return http.get<RumPagesResponse>('/internal/ux/rum/pages', { query: rumQuery(params) });
};

export const fetchRumErrors = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumErrorsResponse> => {
  return http.get<RumErrorsResponse>('/internal/ux/rum/errors', { query: rumQuery(params) });
};
