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
export const QUERIES_ENDPOINT = 'internal/significant_events/queries';
export const DISCOVERY_QUERIES_ENDPOINT = 'internal/streams/_queries';
export const BULK_DELETE_QUERIES_ENDPOINT = 'internal/streams/queries/_bulk_delete';
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
const POLL_INTERVAL_MS = 1_000;
const WRITE_LEASE_TIMEOUT_MS = 30_000;
const WRITE_LEASE_CONFLICT_MESSAGE = 'Source knowledge is being updated';

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

/** A filter-only MATCH query, so storing it also installs its backing Alerting v2 rule. */
export const buildRuleBackedQuery = ({
  sourceId,
  viewName,
}: {
  sourceId: string;
  viewName: string;
}) => ({
  title: 'Built-in role access check',
  esql: { query: `FROM ${viewName} | WHERE severity_text == "ERROR"` },
  source_id: sourceId,
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
      data: { event_id: eventId, title: 'Built-in role access check', source_ids: [] },
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

const isConflictResponse = ({ statusCode }: { statusCode: number }): boolean => statusCode === 409;

/**
 * Resends a source knowledge write while another writer (reconcile, onboarding, a sweep) holds the
 * source's write lease, which the write answers with a 409 instead of waiting.
 *
 * Temporary: remove once https://github.com/elastic/kibana/pull/298878 is merged, which makes the
 * server wait for the lease itself.
 */
export const retryOnWriteLease = async <TResponse extends { statusCode: number }>({
  send,
  isLeaseConflict = isConflictResponse,
}: {
  send: () => Promise<TResponse>;
  isLeaseConflict?: (response: TResponse) => boolean;
}): Promise<TResponse> => {
  const deadline = Date.now() + WRITE_LEASE_TIMEOUT_MS;
  let response = await send();
  while (isLeaseConflict(response) && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    response = await send();
  }
  return response;
};

/** Agent Builder tools answer 200 and report the lease conflict as an error result. */
export const isToolWriteLeaseConflict = ({
  body,
}: {
  body: { results?: Array<{ type: string; data?: { message?: string } }> };
}): boolean =>
  (body.results ?? []).some(
    ({ type, data }) =>
      type === 'error' && Boolean(data?.message?.includes(WRITE_LEASE_CONFLICT_MESSAGE))
  );

const requestRetryingWriteLease = async ({
  kbnClient,
  request,
}: {
  kbnClient: KbnClient;
  request: Parameters<KbnClient['request']>[0];
}): Promise<void> => {
  const { statusCode } = await retryOnWriteLease({
    send: async () => {
      const { status } = await kbnClient.request({
        ...request,
        ignoreErrors: [...(request.ignoreErrors ?? []), 409],
      });
      return { statusCode: status };
    },
  });
  if (statusCode === 409) {
    throw new Error(`${request.method} ${request.path} still hit the source write lease`);
  }
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
  await requestRetryingWriteLease({
    kbnClient,
    request: {
      method: 'POST',
      path: `/${getFeaturesEndpoint(sourceId)}`,
      headers: COMMON_API_HEADERS,
      body: buildFeature(featureId),
    },
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
  await requestRetryingWriteLease({
    kbnClient,
    request: {
      method: 'DELETE',
      path: `/${getFeaturesEndpoint(sourceId)}/${featureId}`,
      headers: COMMON_API_HEADERS,
      ignoreErrors: [404],
    },
  });
};

export const seedRuleBackedQuery = async ({
  kbnClient,
  queryId,
  sourceId,
  viewName,
}: {
  kbnClient: KbnClient;
  queryId: string;
  sourceId: string;
  viewName: string;
}): Promise<void> => {
  await requestRetryingWriteLease({
    kbnClient,
    request: {
      method: 'PUT',
      path: `/${QUERIES_ENDPOINT}/${queryId}`,
      headers: COMMON_API_HEADERS,
      body: buildRuleBackedQuery({ sourceId, viewName }),
    },
  });
};

/** Deletes the query and its backing rule. A query that is already gone is skipped. */
export const deleteQuery = async ({
  kbnClient,
  queryId,
}: {
  kbnClient: KbnClient;
  queryId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/${BULK_DELETE_QUERIES_ENDPOINT}`,
    headers: COMMON_API_HEADERS,
    body: { queryIds: [queryId] },
  });
};

/** Creates the source the suites write under, with the admin's session, and returns its identity. */
export const createAccessSource = async ({
  kbnClient,
  title,
}: {
  kbnClient: KbnClient;
  title: string;
}): Promise<{ id: string; slug: string; viewName: string }> => {
  const { data } = await kbnClient.request<{
    source: { id: string; slug: string; view_name: string };
  }>({
    method: 'POST',
    path: `/${SOURCES_ENDPOINT}`,
    headers: COMMON_API_HEADERS,
    body: { title, esql: ACCESS_SOURCE_ESQL },
  });
  const { id, slug, view_name: viewName } = data.source;
  await fenceAutomaticOnboarding({ kbnClient, source: { id, slug } });
  return { id, slug, viewName };
};

/**
 * Creating a source queues a reconcile that holds the source's write lease and then starts a
 * one-time onboarding run. Writes to the source answer 409 until both are out of the way, so the
 * reconcile is applied here first, and the run it started is cancelled and waited out.
 */
export const fenceAutomaticOnboarding = async ({
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
    await delay(POLL_INTERVAL_MS);
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
    await delay(POLL_INTERVAL_MS);
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
