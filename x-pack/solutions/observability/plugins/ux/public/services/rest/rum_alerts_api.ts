/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { RumAlertFireBucket } from '../../../common/rum_alert_episodes';
import type {
  RumAlertFilters,
  RumAlertTemplateId,
  RumAlertVital,
} from '../../../common/rum_alerts';

export interface RumAlertRuleSummary {
  id: string;
  name: string;
  enabled: boolean;
  templateId: RumAlertTemplateId | null;
  serviceName?: string;
  description: string;
  every: string;
  lookback?: string;
  createdAt: string;
  updatedAt: string;
  lastFiredAt?: string;
}

export interface RumAlertEpisodeSummary {
  timestamp: string;
  episodeId?: string;
  status?: string;
  ruleId?: string;
  groupHash?: string;
}

export interface RumAlertStatus {
  available: boolean;
  notificationsConfigured: boolean;
  aiAvailable?: boolean;
  connectorId?: string;
  to: string[];
}

export const fetchRumAlertStatus = async (http: HttpStart): Promise<RumAlertStatus> => {
  return http.get<RumAlertStatus>('/internal/ux/rum/alerts/_status');
};

export const fetchRumAlerts = async (
  http: HttpStart
): Promise<{
  rules: RumAlertRuleSummary[];
  episodes: RumAlertEpisodeSummary[];
  fireTrend: RumAlertFireBucket[];
}> => {
  return http.get('/internal/ux/rum/alerts');
};

export const createRumAlert = async (
  http: HttpStart,
  body: {
    templateId: RumAlertTemplateId;
    threshold: number;
    name?: string;
    minSamples?: number;
    groupByPage?: boolean;
    lookback?: string;
    every?: string;
    vital?: RumAlertVital;
    errorType?: string;
    errorMessage?: string;
    prompt?: string;
    query?: string;
    filters?: RumAlertFilters;
  }
): Promise<RumAlertRuleSummary> => {
  return http.post<RumAlertRuleSummary>('/internal/ux/rum/alerts', {
    body: JSON.stringify(body),
  });
};

export const deleteRumAlert = async (http: HttpStart, id: string): Promise<void> => {
  await http.delete(`/internal/ux/rum/alerts/${encodeURIComponent(id)}`);
};

export const enableRumAlert = async (http: HttpStart, id: string): Promise<RumAlertRuleSummary> => {
  return http.post<RumAlertRuleSummary>(
    `/internal/ux/rum/alerts/${encodeURIComponent(id)}/_enable`
  );
};

export const disableRumAlert = async (
  http: HttpStart,
  id: string
): Promise<RumAlertRuleSummary> => {
  return http.post<RumAlertRuleSummary>(
    `/internal/ux/rum/alerts/${encodeURIComponent(id)}/_disable`
  );
};

export const generateRumAlertEsql = async (
  http: HttpStart,
  body: { prompt: string; filters?: RumAlertFilters; connectorId?: string }
): Promise<{ query: string; description: string }> => {
  return http.post('/internal/ux/rum/alerts/_generate', {
    body: JSON.stringify(body),
  });
};

export interface RumAlertPreviewResult {
  columns: Array<{ name: string; type: string }>;
  rows: unknown[][];
  wouldFire: boolean;
  chartQuery: string;
  error?: string;
}

export const previewRumAlertEsql = async (
  http: HttpStart,
  body: { query: string; lookback?: string }
): Promise<RumAlertPreviewResult> => {
  return http.post('/internal/ux/rum/alerts/_preview', {
    body: JSON.stringify(body),
  });
};

export const upsertRumAlertNotifications = async (
  http: HttpStart,
  body: { connectorId: string; to: string[] }
): Promise<{ workflowId: string; policyId: string; connectorId: string; to: string[] }> => {
  return http.post('/internal/ux/rum/alerts/_notifications', {
    body: JSON.stringify(body),
  });
};
