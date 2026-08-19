/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  RUM_APP_SETTINGS_API,
  type RumAppSettings,
  type RumAppSettingsBody,
} from '../../../common/rum_app_settings';
import type { RumAppsQueryStage, RumAppsResponse } from '../../../common/rum_apps';
import type {
  RumErrorsResponse,
  RumFiltersResponse,
  RumOverviewResponse,
  RumPagesResponse,
  RumResourceRow,
  RumTrendPoint,
  RumVitalAttribution,
} from '../../../common/rum_app';
import type { RumBackendCall } from '../../../common/rum_backend';
import type { RumClickMapResponse } from '../../../common/rum_click_map';
import type {
  RumReportCompareMode,
  RumReportResponse,
  RumReportTemplateId,
} from '../../../common/rum_report';
import { RUM_REMOTE_CLUSTERS_API, type RumRemoteCluster } from '../../../common/rum_ccs';

export interface RumQueryParams {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  frustration?: string;
  user?: string;
  includeBots?: string;
  botUa?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  errorGroup?: string;
  analyticsMode?: string;
}

const rumQuery = ({
  rangeFrom,
  rangeTo,
  serviceName,
  browser,
  os,
  location,
  pageUrl,
  frustration,
  user,
  includeBots,
  botUa,
  kuery,
  breakpoint,
  connection,
  device,
  errorGroup,
  analyticsMode,
}: Omit<RumQueryParams, 'http'>) => ({
  rangeFrom,
  rangeTo,
  ...(serviceName ? { serviceName } : {}),
  ...(browser ? { browser } : {}),
  ...(os ? { os } : {}),
  ...(location ? { location } : {}),
  ...(pageUrl ? { pageUrl } : {}),
  ...(frustration ? { frustration } : {}),
  ...(user ? { user } : {}),
  ...(includeBots ? { includeBots } : {}),
  ...(botUa ? { botUa } : {}),
  ...(kuery ? { kuery } : {}),
  ...(breakpoint ? { breakpoint } : {}),
  ...(connection ? { connection } : {}),
  ...(device ? { device } : {}),
  ...(errorGroup ? { errorGroup } : {}),
  ...(analyticsMode ? { analyticsMode } : {}),
});

export const fetchRumFilters = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumFiltersResponse> => {
  return http.get<RumFiltersResponse>('/internal/ux/rum/filters', { query: rumQuery(params) });
};

export const fetchRumAppSettings = async ({
  http,
  serviceName,
}: Pick<RumQueryParams, 'http'> & { serviceName: string }): Promise<RumAppSettings> => {
  return http.get<RumAppSettings>(
    `${RUM_APP_SETTINGS_API}/${encodeURIComponent(serviceName)}/settings`
  );
};

export const updateRumAppSettings = async ({
  http,
  serviceName,
  settings,
}: Pick<RumQueryParams, 'http'> & {
  serviceName: string;
  settings: RumAppSettingsBody;
}): Promise<RumAppSettings> => {
  return http.put<RumAppSettings>(
    `${RUM_APP_SETTINGS_API}/${encodeURIComponent(serviceName)}/settings`,
    { body: JSON.stringify(settings) }
  );
};

export const fetchRumApps = async ({
  http,
  rangeFrom,
  rangeTo,
  includeBots,
  botUa,
  stage,
}: Pick<RumQueryParams, 'http' | 'rangeFrom' | 'rangeTo' | 'includeBots' | 'botUa'> & {
  stage?: RumAppsQueryStage;
}): Promise<RumAppsResponse> => {
  return http.get<RumAppsResponse>('/internal/ux/rum/apps', {
    query: {
      rangeFrom,
      rangeTo,
      ...(includeBots ? { includeBots } : {}),
      ...(botUa ? { botUa } : {}),
      ...(stage ? { stage } : {}),
    },
  });
};

export const fetchRumOverview = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumOverviewResponse> => {
  return http.get<RumOverviewResponse>('/internal/ux/rum/overview', { query: rumQuery(params) });
};

export const fetchRumTrends = async ({
  http,
  ...params
}: RumQueryParams): Promise<{ trends: RumTrendPoint[] }> => {
  return http.get<{ trends: RumTrendPoint[] }>('/internal/ux/rum/trends', {
    query: rumQuery(params),
  });
};

export const fetchRumClickMap = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumClickMapResponse> => {
  return http.get<RumClickMapResponse>('/internal/ux/rum/click_map', { query: rumQuery(params) });
};

export const fetchRumPages = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumPagesResponse> => {
  return http.get<RumPagesResponse>('/internal/ux/rum/pages', { query: rumQuery(params) });
};

export const fetchRumPageDetail = async ({
  http,
  pageUrl,
  ...params
}: RumQueryParams & { pageUrl: string }): Promise<{
  attribution: RumVitalAttribution;
  resources: RumResourceRow[];
  backendCalls: RumBackendCall[];
}> => {
  return http.get('/internal/ux/rum/pages/detail', {
    query: rumQuery({ ...params, pageUrl }),
  });
};

export const fetchRumErrors = async ({
  http,
  ...params
}: RumQueryParams): Promise<RumErrorsResponse> => {
  return http.get<RumErrorsResponse>('/internal/ux/rum/errors', { query: rumQuery(params) });
};

export const fetchRumReport = async ({
  http,
  templateId,
  compare,
  includePii,
  funnelSteps,
  ...params
}: RumQueryParams & {
  templateId: RumReportTemplateId;
  compare?: RumReportCompareMode;
  includePii?: boolean;
  funnelSteps?: string;
}): Promise<RumReportResponse> => {
  return http.get<RumReportResponse>(`/internal/ux/rum/reports/${encodeURIComponent(templateId)}`, {
    query: {
      ...rumQuery(params),
      ...(compare ? { compare } : {}),
      ...(includePii ? { includePii: 'true' } : {}),
      ...(funnelSteps ? { funnelSteps } : {}),
    },
  });
};

export const fetchRumRemoteClusters = async ({
  http,
}: {
  http: HttpStart;
}): Promise<RumRemoteCluster[]> => {
  return http.get<RumRemoteCluster[]>(RUM_REMOTE_CLUSTERS_API);
};
