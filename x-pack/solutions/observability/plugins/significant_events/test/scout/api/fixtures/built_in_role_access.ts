/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type { EsClient, KbnClient } from '@kbn/scout-oblt';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from './constants';

export const RULE_EVENTS_INDEX = '.rule-events';
export const DETECTIONS_DATA_STREAM = '.significant_events-detections';
export const KI_STREAM_NAME = 'logs.otel';

export const EVENTS_ENDPOINT = 'internal/significant_events/events';
export const DETECTIONS_ENDPOINT = 'internal/significant_events/detections';
export const MARK_SCANNED_ENDPOINT = 'internal/significant_events/detections/_mark_scanned';
export const FEATURES_ENDPOINT = 'internal/streams/_features';
export const STREAM_FEATURES_ENDPOINT = `internal/streams/${KI_STREAM_NAME}/features`;
export const RUN_QUOTAS_ENDPOINT = 'internal/significant_events/run_quotas';
export const TOOL_EXECUTE_ENDPOINT = 'api/agent_builder/tools/_execute';

export const EVENT_SEARCH_TOOL_ID = 'platform.sig_events.event_search';
export const KI_FEATURE_CREATE_TOOL_ID = 'platform.sig_events.ki_feature_create';

/** Settings routes that need both `manage_nightshift` and `configure_nightshift`. */
export const CONFIGURE_ONLY_REQUESTS = [
  { method: 'put', path: RUN_QUOTAS_ENDPOINT },
  { method: 'put', path: 'internal/streams/_significant_events/scheduled_discovery/settings' },
  {
    method: 'put',
    path: 'internal/streams/_knowledge_indicators/continuous_ki_extraction/settings',
  },
  { method: 'post', path: 'internal/significant_events/maintenance/_pause' },
  { method: 'post', path: 'internal/significant_events/maintenance/_resume' },
  { method: 'post', path: 'internal/significant_events/maintenance/_reset' },
  { method: 'post', path: 'internal/significant_events/maintenance/cleanup/_bootstrap' },
] as const;

export const POLL_OPTIONS = { timeout: 30_000, intervals: [1_000] };

export const TOOL_API_HEADERS = PUBLIC_API_HEADERS;

export interface RunQuotaLimits {
  enabled: boolean;
  limits: {
    detection: number;
    investigation: number;
    ki_extraction: number;
  };
}

export const buildDetection = (ruleUuid: string) => ({
  detection_id: `${ruleUuid}-detection`,
  rule_uuid: ruleUuid,
  rule_name: 'Built-in role access check',
  change_point_type: 'spike',
  p_value: 0.001,
});

export const buildFeature = (id: string) => ({
  id,
  stream_name: KI_STREAM_NAME,
  type: 'entity',
  subtype: 'service',
  title: 'Built-in role access check',
  description: 'Feature seeded by the built-in role access tests',
  properties: { name: id },
  confidence: 90,
  evidence: [`service.name=${id}`],
  tags: ['entity', 'service'],
});

/** Indexes a significant event straight into `.rule-events`, the way the alerting v2 executor stores it. */
export const seedSignificantEvent = async (esClient: EsClient, eventId: string): Promise<void> => {
  const now = new Date().toISOString();
  await esClient.index({
    index: RULE_EVENTS_INDEX,
    op_type: 'create',
    refresh: true,
    document: {
      '@timestamp': now,
      scheduled_timestamp: now,
      type: 'alert',
      source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
      space_id: 'default',
      status: 'breached',
      severity: 'high',
      group_hash: eventId,
      rule: { id: eventId, version: 1 },
      alert: { id: eventId, status: 'active' },
      data: { event_id: eventId, title: 'Built-in role access check', stream_names: [] },
    },
  });
};

export const deleteSignificantEvent = async (
  esClient: EsClient,
  eventId: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: RULE_EVENTS_INDEX,
    query: { term: { group_hash: eventId } },
    refresh: true,
    ignore_unavailable: true,
  });
};

export const seedDetection = async (kbnClient: KbnClient, ruleUuid: string): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/${DETECTIONS_ENDPOINT}`,
    headers: COMMON_API_HEADERS,
    body: { detections: [buildDetection(ruleUuid)] },
  });
};

export const deleteDetections = async (esClient: EsClient, ruleUuid: string): Promise<void> => {
  await esClient.deleteByQuery({
    index: DETECTIONS_DATA_STREAM,
    query: { term: { rule_uuid: ruleUuid } },
    refresh: true,
    ignore_unavailable: true,
  });
};

export const seedFeature = async (kbnClient: KbnClient, featureId: string): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/${STREAM_FEATURES_ENDPOINT}`,
    headers: COMMON_API_HEADERS,
    body: buildFeature(featureId),
  });
};

export const deleteFeature = async (kbnClient: KbnClient, featureId: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/${STREAM_FEATURES_ENDPOINT}/${featureId}`,
    headers: COMMON_API_HEADERS,
    ignoreErrors: [404],
  });
};
