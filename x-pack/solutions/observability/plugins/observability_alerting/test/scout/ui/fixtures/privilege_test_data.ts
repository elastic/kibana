/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ACTIONS_DATA_STREAM,
  ALERT_EVENTS_DATA_STREAM,
  ALERTING_V2_RULE_API_PATH,
} from '@kbn/alerting-v2-constants';
import type { EsClient, KbnClient } from '@kbn/scout-oblt';

export const V1_EPISODE_TAG = 'scout-obs-priv-v1';
export const V2_EPISODE_TAG = 'scout-obs-priv-v2';
export const CUSTOM_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';

/** Source index the v1 custom threshold rule queries. */
export const THRESHOLD_TEST_INDEX = 'scout-obs-priv-threshold';

/** Data view / index-pattern SO id referenced by `searchConfiguration.index`. */
export const THRESHOLD_DATA_VIEW_ID = 'scout-obs-priv-threshold-dv';

/** AAD alias/pattern used by observability custom threshold alerts. */
export const OBS_THRESHOLD_ALERTS_INDEX_PATTERN = '.alerts-observability.threshold.alerts-*';

const RULE_API_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a source index with one `@timestamp` doc so a custom threshold
 * document-count > 0 rule can fire.
 */
export const createV1ThresholdSourceIndex = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.create(
    {
      index: THRESHOLD_TEST_INDEX,
      mappings: { properties: { '@timestamp': { type: 'date' } } },
    },
    { ignore: [400] }
  );
  await esClient.index({
    index: THRESHOLD_TEST_INDEX,
    document: { '@timestamp': new Date().toISOString() },
  });
  await esClient.indices.refresh({ index: THRESHOLD_TEST_INDEX });
};

export const deleteV1ThresholdSourceIndex = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.delete({ index: THRESHOLD_TEST_INDEX }, { ignore: [404] });
};

/**
 * Polls observability threshold AAD until the rule engine writes an alert for
 * `ruleId`. `execution_status: ok` is not sufficient — that can mean a
 * successful run with no alerts.
 *
 * Once the alert document exists, sets `kibana.alert.workflow_tags` to
 * `[V1_EPISODE_TAG]` so the classic-source tag aggregation (which reads
 * workflow tags, not rule tags) includes it in the "Alert tags" filter.
 */
export const waitForV1RuleAlert = async (
  esClient: EsClient,
  kbnClient: KbnClient,
  ruleId: string
): Promise<void> => {
  const timeoutMs = 90_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await esClient.search<{ 'kibana.alert.uuid': string }>(
      {
        index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        _source: ['kibana.alert.uuid'],
      },
      { ignore: [404] }
    );
    const hits = 'hits' in result ? (result.hits?.hits ?? []) : [];
    if (hits.length > 0) {
      const alertIds = hits
        .map((h) => h._source?.['kibana.alert.uuid'])
        .filter((id): id is string => typeof id === 'string');

      await kbnClient.request({
        description: 'seed workflow tags on v1 threshold alert',
        method: 'POST',
        path: '/internal/rac/alerts/tags',
        headers: RULE_API_HEADERS,
        body: {
          index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN,
          alertIds,
          add: [V1_EPISODE_TAG],
        },
      });

      await esClient.indices.refresh(
        { index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN },
        { ignore: [404] }
      );
      return;
    }
    await sleep(1_000);
  }
  throw new Error(
    `v1 alert for rule ${ruleId} did not appear in ${OBS_THRESHOLD_ALERTS_INDEX_PATTERN} within ${timeoutMs}ms`
  );
};

export const deleteV1PrivilegeAlerts = async (
  esClient: EsClient,
  ruleId: string
): Promise<void> => {
  await esClient.deleteByQuery(
    {
      index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN,
      refresh: true,
      conflicts: 'proceed',
      query: { term: { 'kibana.alert.rule.uuid': ruleId } },
    },
    { ignore: [404] }
  );
};

export const deleteV1PrivilegeRule = async (
  kbnClient: KbnClient,
  ruleId: string
): Promise<void> => {
  await kbnClient.request({
    description: 'delete v1 privilege test rule',
    path: `/api/alerting/rule/${ruleId}`,
    method: 'DELETE',
    ignoreErrors: [404],
  });
};

/**
 * Creates a disabled v2 rule plus one episode and a tag action so the inbox
 * tag filter can merge classic (v1) and v2 tag options.
 */
export const seedV2PrivilegeRule = async (
  esClient: EsClient,
  kbnClient: KbnClient
): Promise<string> => {
  const { data: rule } = await kbnClient.request<{ id: string }>({
    description: 'create alerting v2 rule for privilege test',
    method: 'POST',
    path: ALERTING_V2_RULE_API_PATH,
    headers: RULE_API_HEADERS,
    body: {
      kind: 'alert',
      metadata: { name: '[scout] Observability privilege v2 rule', tags: [V2_EPISODE_TAG] },
      schedule: { every: '1h' },
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
    },
  });

  const ruleId = rule.id;
  const groupHash = `${ruleId}-group`;
  const now = new Date().toISOString();

  try {
    await kbnClient.request({
      description: 'disable seeded alerting v2 privilege rule',
      method: 'POST',
      path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}/_disable`,
      headers: RULE_API_HEADERS,
    });

    await esClient.bulk({
      operations: [
        { create: { _index: ALERT_EVENTS_DATA_STREAM } },
        {
          '@timestamp': now,
          scheduled_timestamp: now,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          data: {},
          status: 'breached',
          source: 'scout-test',
          type: 'alert',
          space_id: 'default',
          episode: { id: `${ruleId}-episode`, status: 'active' },
        },
        { create: { _index: ALERT_ACTIONS_DATA_STREAM } },
        {
          '@timestamp': now,
          last_series_event_timestamp: now,
          actor: null,
          action_type: 'tag',
          group_hash: groupHash,
          rule_id: ruleId,
          tags: [V2_EPISODE_TAG],
          space_id: 'default',
          source: 'scout-test',
        },
      ],
      refresh: true,
    });
  } catch (error) {
    await deleteV2PrivilegeRule(esClient, kbnClient, ruleId);
    throw error;
  }

  return ruleId;
};

export const deleteV2PrivilegeRule = async (
  esClient: EsClient,
  kbnClient: KbnClient,
  ruleId: string
): Promise<void> => {
  await esClient.deleteByQuery(
    {
      index: ALERT_EVENTS_DATA_STREAM,
      query: { term: { 'rule.id': ruleId } },
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
    },
    { ignore: [404] }
  );
  await esClient.deleteByQuery(
    {
      index: ALERT_ACTIONS_DATA_STREAM,
      query: { term: { rule_id: ruleId } },
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
    },
    { ignore: [404] }
  );
  await kbnClient.request({
    description: 'delete seeded alerting v2 privilege rule',
    method: 'DELETE',
    path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`,
    headers: RULE_API_HEADERS,
    ignoreErrors: [404],
  });
};
