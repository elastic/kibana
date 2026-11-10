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
import type { ApiServicesFixture, EsClient, KbnClient, KibanaRole } from '@kbn/scout-oblt';

export const V1_EPISODE_TAG = 'scout-obs-priv-v1';
export const V2_EPISODE_TAG = 'scout-obs-priv-v2';
export const CUSTOM_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';
export const V2_PRIVILEGE_RULE_NAME = '[scout] Observability privilege v2 rule';

/** Source index the v1 custom threshold rule queries. */
export const THRESHOLD_TEST_INDEX = 'scout-obs-priv-threshold';

/** Data view / index-pattern SO id referenced by `searchConfiguration.index`. */
export const THRESHOLD_DATA_VIEW_ID = 'scout-obs-priv-threshold-dv';

/** AAD alias/pattern used by observability custom threshold alerts. */
export const OBS_THRESHOLD_ALERTS_INDEX_PATTERN = '.alerts-observability.threshold.alerts-*';

/** Read on every index, so Elasticsearch privileges never limit what a test role sees. */
export const READER_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: [],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

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

const ALERT_POLL_TIMEOUT_MS = 90_000;

/**
 * Polls `index` until the rule engine writes an alert for `ruleId` and returns the alert ids.
 * `execution_status: ok` is not sufficient, since that can mean a successful run with no alerts.
 */
const waitForRuleAlertIds = async (
  esClient: EsClient,
  index: string,
  ruleId: string
): Promise<string[]> => {
  const deadline = Date.now() + ALERT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await esClient.search<{ 'kibana.alert.uuid': string }>(
      {
        index,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        _source: ['kibana.alert.uuid'],
      },
      { ignore: [404] }
    );
    const hits = 'hits' in result ? result.hits?.hits ?? [] : [];
    const alertIds = hits
      .map((hit) => hit._source?.['kibana.alert.uuid'])
      .filter((id): id is string => typeof id === 'string');
    if (alertIds.length > 0) {
      return alertIds;
    }
    await sleep(1_000);
  }
  throw new Error(
    `alert for rule ${ruleId} did not appear in ${index} within ${ALERT_POLL_TIMEOUT_MS}ms`
  );
};

const deleteRuleAlerts = async (
  esClient: EsClient,
  index: string,
  ruleId: string
): Promise<void> => {
  await esClient.deleteByQuery(
    {
      index,
      refresh: true,
      conflicts: 'proceed',
      query: { term: { 'kibana.alert.rule.uuid': ruleId } },
    },
    { ignore: [404] }
  );
};

/**
 * Waits for the custom threshold alert of `ruleId`, then sets its `kibana.alert.workflow_tags` to
 * `[V1_EPISODE_TAG]` so the classic-source tag aggregation (which reads workflow tags, not rule
 * tags) includes it in the "Alert tags" filter.
 */
export const waitForV1RuleAlert = async (
  esClient: EsClient,
  kbnClient: KbnClient,
  ruleId: string
): Promise<void> => {
  const alertIds = await waitForRuleAlertIds(esClient, OBS_THRESHOLD_ALERTS_INDEX_PATTERN, ruleId);
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
  await esClient.indices.refresh({ index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN }, { ignore: [404] });
};

export const deleteV1PrivilegeAlerts = async (esClient: EsClient, ruleId: string): Promise<void> =>
  deleteRuleAlerts(esClient, OBS_THRESHOLD_ALERTS_INDEX_PATTERN, ruleId);

export const ES_QUERY_RULE_TYPE_ID = '.es-query';

/** AAD alias used by stack rule type alerts, which `.es-query` writes to whatever its consumer. */
export const STACK_ALERTS_INDEX_PATTERN = '.alerts-stack.alerts-default';

export const waitForStackRuleAlert = async (esClient: EsClient, ruleId: string): Promise<void> => {
  await waitForRuleAlertIds(esClient, STACK_ALERTS_INDEX_PATTERN, ruleId);
};

export const deleteStackPrivilegeAlerts = async (
  esClient: EsClient,
  ruleId: string
): Promise<void> => deleteRuleAlerts(esClient, STACK_ALERTS_INDEX_PATTERN, ruleId);

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

interface RuleSeedServices {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  kbnClient: KbnClient;
}

/** Creates a custom threshold rule over a seeded index and waits for its alert. */
export const createV1PrivilegeRule = async ({
  apiServices,
  esClient,
  kbnClient,
  name,
}: RuleSeedServices & { name: string }): Promise<string> => {
  await createV1ThresholdSourceIndex(esClient);
  await apiServices.dataViews.create({
    id: THRESHOLD_DATA_VIEW_ID,
    name: THRESHOLD_DATA_VIEW_ID,
    title: THRESHOLD_TEST_INDEX,
    timeFieldName: '@timestamp',
    override: true,
  });
  const created = await apiServices.alerting.rules.create({
    name,
    ruleTypeId: CUSTOM_THRESHOLD_RULE_TYPE_ID,
    consumer: 'logs',
    enabled: true,
    schedule: { interval: '1m' },
    actions: [],
    params: {
      criteria: [
        {
          comparator: '>',
          threshold: [0],
          timeSize: 5,
          timeUnit: 'm',
          metrics: [{ name: 'A', aggType: 'count' }],
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: { query: '', language: 'kuery' },
        index: THRESHOLD_DATA_VIEW_ID,
      },
    },
  });
  const ruleId = created.data.id as string;
  try {
    await apiServices.alerting.rules.runSoon(ruleId);
    await waitForV1RuleAlert(esClient, kbnClient, ruleId);
    return ruleId;
  } catch (error) {
    await deleteV1PrivilegeAlerts(esClient, ruleId);
    await deleteV1PrivilegeRule(kbnClient, ruleId);
    throw error;
  }
};

/** Removes the custom threshold rule, its alerts, and the seeded index and data view. */
export const deleteV1PrivilegeRuleData = async ({
  apiServices,
  esClient,
  kbnClient,
  ruleId,
}: RuleSeedServices & { ruleId?: string }): Promise<void> => {
  if (ruleId) {
    await deleteV1PrivilegeAlerts(esClient, ruleId);
    await deleteV1PrivilegeRule(kbnClient, ruleId);
  }
  await apiServices.dataViews.delete(THRESHOLD_DATA_VIEW_ID).catch(() => undefined);
  await deleteV1ThresholdSourceIndex(esClient);
};

/** Creates an Elasticsearch query rule over the seeded index and waits for its alert. */
export const createStackPrivilegeRule = async ({
  apiServices,
  esClient,
  kbnClient,
  name,
}: RuleSeedServices & { name: string }): Promise<string> => {
  const created = await apiServices.alerting.rules.create({
    name,
    ruleTypeId: ES_QUERY_RULE_TYPE_ID,
    consumer: 'stackAlerts',
    enabled: true,
    schedule: { interval: '1m' },
    actions: [],
    params: {
      size: 100,
      thresholdComparator: '>',
      threshold: [0],
      index: [THRESHOLD_TEST_INDEX],
      timeField: '@timestamp',
      esQuery: JSON.stringify({ query: { match_all: {} } }),
      timeWindowSize: 1,
      timeWindowUnit: 'd',
      excludeHitsFromPreviousRun: false,
    },
  });
  const ruleId = created.data.id as string;
  try {
    await apiServices.alerting.rules.runSoon(ruleId);
    await waitForStackRuleAlert(esClient, ruleId);
    return ruleId;
  } catch (error) {
    await deleteStackPrivilegeAlerts(esClient, ruleId);
    await deleteV1PrivilegeRule(kbnClient, ruleId);
    throw error;
  }
};

/** Removes the Elasticsearch query rule and its alerts. */
export const deleteStackPrivilegeRuleData = async ({
  esClient,
  kbnClient,
  ruleId,
}: Omit<RuleSeedServices, 'apiServices'> & { ruleId?: string }): Promise<void> => {
  if (!ruleId) {
    return;
  }
  await deleteStackPrivilegeAlerts(esClient, ruleId);
  await deleteV1PrivilegeRule(kbnClient, ruleId);
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
      metadata: { name: V2_PRIVILEGE_RULE_NAME, tags: [V2_EPISODE_TAG] },
      schedule: { every: '1h' },
      query: { base: 'FROM logs-* | LIMIT 1' },
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
    },
  });

  const ruleId = rule.id;
  const groupHash = `${ruleId}-group`;
  const episodeId = `${ruleId}-episode`;
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
          alert: { id: episodeId, status: 'active' },
        },
        { create: { _index: ALERT_ACTIONS_DATA_STREAM } },
        {
          '@timestamp': now,
          last_series_event_timestamp: now,
          actor: null,
          action_type: 'tag',
          alert_id: episodeId,
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
