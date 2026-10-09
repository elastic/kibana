/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import {
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type SignificantEventsWorkflowStatus,
} from '@kbn/significant-events-schema';
import type { EsClient, KbnClient } from '@kbn/scout-oblt';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from './constants';

export const RULE_EVENTS_INDEX = '.rule-events';
export const DETECTIONS_DATA_STREAM = '.significant_events-detections';
/** The ES|QL behind the source the suites store their knowledge indicators and detections under. */
export const ACCESS_SOURCE_ESQL = 'FROM logs.otel, logs.otel.*';

export const EVENTS_ENDPOINT = 'internal/significant_events/events';
export const DETECTIONS_ENDPOINT = 'internal/significant_events/detections';
export const MARK_SCANNED_ENDPOINT = 'internal/significant_events/detections/_mark_scanned';
export const SOURCES_ENDPOINT = 'internal/nightshift/sources';
export const getFeaturesEndpoint = (sourceId: string): string =>
  `internal/streams/${sourceId}/features`;
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

const FENCE_TIMEOUT_MS = 120_000;
const FENCE_POLL_INTERVAL_MS = 1_000;

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

export const buildDetection = (ruleUuid: string, sourceId: string) => ({
  detection_id: `${ruleUuid}-detection`,
  rule_uuid: ruleUuid,
  source_id: sourceId,
  rule_name: 'Built-in role access check',
  change_point_type: 'spike',
  p_value: 0.001,
});

export const buildFeature = (id: string) => ({
  id,
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
    // Status updates are written with a hashed `group_hash`, so match on the event id instead.
    query: { term: { 'data.event_id': eventId } },
    refresh: true,
    ignore_unavailable: true,
  });
};

export const seedDetection = async ({
  kbnClient,
  ruleUuid,
  sourceId,
}: {
  kbnClient: KbnClient;
  ruleUuid: string;
  sourceId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/${DETECTIONS_ENDPOINT}`,
    headers: COMMON_API_HEADERS,
    body: { detections: [buildDetection(ruleUuid, sourceId)] },
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

export const seedFeature = async ({
  kbnClient,
  sourceId,
  featureId,
}: {
  kbnClient: KbnClient;
  sourceId: string;
  featureId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/${getFeaturesEndpoint(sourceId)}`,
    headers: COMMON_API_HEADERS,
    body: buildFeature(featureId),
  });
};

export const deleteFeature = async ({
  kbnClient,
  sourceId,
  featureId,
}: {
  kbnClient: KbnClient;
  sourceId: string;
  featureId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/${getFeaturesEndpoint(sourceId)}/${featureId}`,
    headers: COMMON_API_HEADERS,
    ignoreErrors: [404],
  });
};

/** Creates the source the suites write under, with the admin's session, and returns its identity. */
export const createAccessSource = async ({
  kbnClient,
  title,
}: {
  kbnClient: KbnClient;
  title: string;
}): Promise<{ id: string; slug: string }> => {
  const { data } = await kbnClient.request<{ source: { id: string; slug: string } }>({
    method: 'POST',
    path: `/${SOURCES_ENDPOINT}`,
    headers: COMMON_API_HEADERS,
    body: { title, esql: ACCESS_SOURCE_ESQL },
  });
  const source = { id: data.source.id, slug: data.source.slug };
  await fenceAutomaticOnboarding({ kbnClient, source });
  return source;
};

/**
 * Creating a source queues a reconcile that holds the source's write lease and then starts a
 * one-time onboarding run. Writes to the source answer 409 until both are out of the way, so the
 * reconcile is applied here first, and the run it started is cancelled and waited out.
 */
const fenceAutomaticOnboarding = async ({
  kbnClient,
  source,
}: {
  kbnClient: KbnClient;
  source: { id: string; slug: string };
}): Promise<void> => {
  const deadline = Date.now() + FENCE_TIMEOUT_MS;
  const request = <T>(method: 'GET' | 'POST', path: string, body?: object) =>
    kbnClient.request<T>({
      method,
      path: `/internal/streams/${source.id}/${path}`,
      headers: COMMON_API_HEADERS,
      body,
      ignoreErrors: [409],
    });

  let reconcile = await request('POST', '_reconcile_source', { sourceSlug: source.slug });
  while (reconcile.status === 409 && Date.now() < deadline) {
    await delay(FENCE_POLL_INTERVAL_MS);
    reconcile = await request('POST', '_reconcile_source', { sourceSlug: source.slug });
  }
  if (reconcile.status === 409) {
    throw new Error(`The reconcile of source ${source.id} still held its lease after the deadline`);
  }

  await request('POST', 'onboarding/_execute', { action: 'cancel' });

  while (Date.now() < deadline) {
    const { data } = await request<{ status: SignificantEventsWorkflowStatus }>(
      'GET',
      'onboarding/_status'
    );
    if (!KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(data.status)) {
      return;
    }
    await delay(FENCE_POLL_INTERVAL_MS);
  }
  throw new Error(`Onboarding of source ${source.id} is still running after being cancelled`);
};

export const deleteAccessSource = async ({
  kbnClient,
  sourceId,
}: {
  kbnClient: KbnClient;
  sourceId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/${SOURCES_ENDPOINT}/${sourceId}`,
    headers: COMMON_API_HEADERS,
    ignoreErrors: [404],
  });
};
