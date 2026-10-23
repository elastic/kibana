/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import moment from 'moment';
import type { ApiClientFixture, EsClient, KbnClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { makeDownSummary, makeUpSummary } from '@kbn/observability-synthetics-test-data';
import type { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../common/runtime_types';
import {
  SYNTHETICS_ALERTS_INDEX,
  SYNTHETICS_API_URLS,
  SYNTHETICS_MONITOR_SO_TYPES,
  type SyntheticsAlertDoc,
  type SyntheticsApiServicesFixture,
} from '../../../common/fixtures';
import { enableSynthetics, saveMonitorInternal } from '../../../common/fixtures/monitors';
import { delay, tryForTime } from '../../../common/fixtures/retry';

export const SYNTHETICS_DOCS_INDEX = 'synthetics-http-default';
export const STATUS_RULE_TYPE_ID = 'xpack.synthetics.alerts.monitorStatus';

export const DEV_LOCATIONS = [
  { id: 'dev', isServiceManaged: true, label: 'Dev Service' },
  { id: 'dev2', isServiceManaged: true, label: 'Dev Service 2' },
] as const;

export interface SyntheticsAlertActionDoc {
  status?: string;
  reason?: string;
  locationNames?: string;
  locationId?: string;
  linkMessage?: string;
  recoveryReason?: string;
  recoveryStatus?: string;
  'monitor.id'?: string;
}

export interface StatusRuleTestEnv {
  readonly alertActionIndex: string;
  readonly ruleTag: string;
  actionId: string;
  editorHeaders: Record<string, string>;
}

/**
 * Creates a suite-isolated index connector and index for custom status rule
 * action verification.
 */
export function createStatusRuleTestEnv(suiteSlug: string): StatusRuleTestEnv {
  const runId = randomUUID().slice(0, 8);
  return {
    alertActionIndex: `alert-action-synthetics-${suiteSlug}-${runId}`,
    ruleTag: `scout-synthetics-${suiteSlug}-${runId}`,
    actionId: '',
    editorHeaders: {},
  };
}

export async function setupStatusRuleTestEnv({
  env,
  apiClient,
  apiServices,
  esClient,
  editorHeaders,
}: {
  env: StatusRuleTestEnv;
  apiClient: ApiClientFixture;
  apiServices: SyntheticsApiServicesFixture;
  esClient: EsClient;
  editorHeaders: Record<string, string>;
}) {
  env.editorHeaders = editorHeaders;

  await enableSynthetics(apiClient, editorHeaders);

  await esClient.indices.create({
    index: env.alertActionIndex,
    mappings: {
      properties: {
        'monitor.id': {
          type: 'keyword',
        },
        locationId: {
          type: 'keyword',
        },
        status: {
          type: 'keyword',
        },
      },
    },
  });

  const connector = await apiServices.alerting.connectors.create({
    name: `Index Connector: Synthetics API test (${env.ruleTag})`,
    connectorTypeId: '.index',
    config: {
      index: env.alertActionIndex,
      refresh: true,
    },
  });
  env.actionId = connector.id as string;
}

export async function teardownStatusRuleTestEnv({
  env,
  apiServices,
  esClient,
  kbnClient,
  monitorIds,
}: {
  env: StatusRuleTestEnv;
  apiServices: SyntheticsApiServicesFixture;
  esClient: EsClient;
  kbnClient: KbnClient;
  monitorIds: string[];
}) {
  await apiServices.alerting.cleanup.deleteRulesByTags([env.ruleTag]);
  if (env.actionId) {
    await apiServices.alerting.connectors.delete(env.actionId);
  }
  await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
  await esClient.indices.delete({
    index: env.alertActionIndex,
    ignore_unavailable: true,
  });
  if (monitorIds.length > 0) {
    await esClient.deleteByQuery({
      index: `${SYNTHETICS_DOCS_INDEX}*`,
      query: { terms: { 'monitor.id': monitorIds } },
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
    });
    await esClient.deleteByQuery({
      index: SYNTHETICS_ALERTS_INDEX,
      query: { terms: { 'monitor.id': monitorIds } },
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
    });
  }
}

export async function clearActionIndex(esClient: EsClient, alertActionIndex: string) {
  await esClient.deleteByQuery({
    index: alertActionIndex,
    query: { match_all: {} },
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
  });
}

export async function createCustomStatusRule({
  apiServices,
  env,
  params,
  name = 'Custom status rule',
}: {
  apiServices: SyntheticsApiServicesFixture;
  env: StatusRuleTestEnv;
  params: StatusRuleParams;
  name?: string;
}): Promise<{ id: string; params: StatusRuleParams }> {
  const response = await apiServices.alerting.rules.create({
    name,
    ruleTypeId: STATUS_RULE_TYPE_ID,
    consumer: 'alerts',
    schedule: { interval: '1m' },
    tags: [env.ruleTag],
    params,
    actions: [
      {
        group: 'recovered',
        id: env.actionId,
        params: {
          documents: [
            {
              status: 'recovered',
              reason: '{{context.reason}}',
              locationNames: '{{context.locationNames}}',
              locationId: '{{context.locationId}}',
              linkMessage: '{{context.linkMessage}}',
              recoveryReason: '{{context.recoveryReason}}',
              recoveryStatus: '{{context.recoveryStatus}}',
              'monitor.id': '{{context.monitorId}}',
            },
          ],
        },
        frequency: {
          notify_when: 'onActionGroupChange',
          throttle: null,
          summary: false,
        } as unknown as {
          summary: boolean;
          notifyWhen: string;
          throttle?: string;
        },
      },
      {
        group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
        id: env.actionId,
        params: {
          documents: [
            {
              status: 'active',
              reason: '{{context.reason}}',
              locationNames: '{{context.locationNames}}',
              locationId: '{{context.locationId}}',
              linkMessage: '{{context.linkMessage}}',
              'monitor.id': '{{context.monitorId}}',
            },
          ],
        },
        frequency: {
          notify_when: 'onActionGroupChange',
          throttle: null,
          summary: false,
        } as unknown as {
          summary: boolean;
          notifyWhen: string;
          throttle?: string;
        },
      },
    ],
  });
  expect(response).toHaveStatusCode(200);
  return response.data as { id: string; params: StatusRuleParams };
}

export async function addTestMonitor(
  apiClient: ApiClientFixture,
  editorHeaders: Record<string, string>,
  name: string
): Promise<EncryptedSyntheticsSavedMonitor> {
  const res = await saveMonitorInternal(apiClient, editorHeaders, {
    locations: [...DEV_LOCATIONS],
    name,
    type: 'http',
    url: 'http://www.google.com',
    schedule: 1,
  });
  return res.body as EncryptedSyntheticsSavedMonitor;
}

export async function makeSummaries({
  esClient,
  monitor,
  downChecks = 0,
  upChecks = 0,
  location,
}: {
  esClient: EsClient;
  monitor: EncryptedSyntheticsSavedMonitor;
  downChecks?: number;
  upChecks?: number;
  location?: {
    id: string;
    label: string;
  };
}) {
  const docs: Array<Record<string, unknown> & { '@timestamp': string }> = [];
  for (let i = downChecks; i > 0; i--) {
    const doc = await addSummaryDocument({
      esClient,
      monitor,
      location,
      status: 'down',
      timestamp: moment()
        .subtract(i - 1, 'minutes')
        .toISOString(),
    });
    docs.push(doc);
  }
  for (let i = upChecks; i > 0; i--) {
    const doc = await addSummaryDocument({
      esClient,
      monitor,
      location,
      status: 'up',
      timestamp: moment()
        .subtract(i - 1, 'minutes')
        .toISOString(),
    });
    docs.push(doc);
  }
  return docs;
}

export async function addSummaryDocument({
  esClient,
  monitor,
  location,
  status = 'up',
  timestamp = new Date(Date.now()).toISOString(),
}: {
  esClient: EsClient;
  monitor: EncryptedSyntheticsSavedMonitor;
  status?: 'up' | 'down';
  timestamp?: string;
  location?: {
    id: string;
    label: string;
  };
}) {
  const commonData = {
    timestamp,
    location,
    monitorId: monitor.id,
    name: monitor.name,
    configId: monitor.config_id,
  };

  const baseDoc = status === 'down' ? makeDownSummary(commonData) : makeUpSummary(commonData);
  const document = {
    ...baseDoc,
    '@timestamp': timestamp,
  };

  await esClient.index({
    index: SYNTHETICS_DOCS_INDEX,
    document,
    refresh: true,
  });

  return document;
}

/**
 * Triggers `_run_soon` while polling the alerts-as-data index until matching
 * alert documents appear.
 */
export async function waitForStatusAlert({
  esClient,
  apiServices,
  ruleId,
  filters = [],
  timeoutMs = 70_000,
}: {
  esClient: EsClient;
  apiServices: SyntheticsApiServicesFixture;
  ruleId: string;
  filters?: Array<Record<string, unknown>>;
  timeoutMs?: number;
}) {
  return tryForTime(
    timeoutMs,
    async () => {
      await apiServices.alerting.rules.runSoon(ruleId);
      const response = await esClient.search<SyntheticsAlertDoc & Record<string, unknown>>({
        index: SYNTHETICS_ALERTS_INDEX,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }, ...filters],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      });
      if (response.hits.hits.length === 0) {
        throw new Error(`No alerts found for rule ${ruleId}`);
      }
      return response;
    },
    { intervalMs: 1_500 }
  );
}

/**
 * Polls the index-connector target index until `docCountTarget` documents match `filters`.
 */
export async function waitForActionDocuments({
  esClient,
  indexName,
  filters = [],
  docCountTarget = 1,
  timeoutMs = 70_000,
}: {
  esClient: EsClient;
  indexName: string;
  filters?: Array<Record<string, unknown>>;
  docCountTarget?: number;
  timeoutMs?: number;
}) {
  return tryForTime(
    timeoutMs,
    async () => {
      const response = await esClient.search<SyntheticsAlertActionDoc>({
        index: indexName,
        rest_total_hits_as_int: true,
        ignore_unavailable: true,
        ...(filters.length > 0
          ? {
              query: {
                bool: {
                  filter: filters,
                },
              },
            }
          : {}),
      });
      const total = typeof response.hits.total === 'number' ? response.hits.total : 0;
      if (total < docCountTarget) {
        throw new Error(
          `Expected at least ${docCountTarget} action docs in ${indexName}, found ${total}`
        );
      }
      return response;
    },
    { intervalMs: 1_000 }
  );
}

/**
 * Triggers a rule evaluation and waits for it to complete, then returns the
 * search response for active alerts matching `monitorId` since `sinceTimestamp`.
 */
export async function runAndSearchActiveStatusAlerts({
  esClient,
  apiServices,
  ruleId,
  monitorId,
  sinceTimestamp,
}: {
  esClient: EsClient;
  apiServices: SyntheticsApiServicesFixture;
  ruleId: string;
  monitorId: string;
  sinceTimestamp: string;
}) {
  const dateStart = new Date();
  const waitExecution = apiServices.alerting.waiting.waitForNextExecution(
    ruleId,
    undefined,
    60_000,
    dateStart
  );
  await apiServices.alerting.rules.runSoon(ruleId);
  await waitExecution;
  await delay(1_000);

  return esClient.search<SyntheticsAlertDoc>({
    index: SYNTHETICS_ALERTS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.uuid': ruleId } },
          { term: { 'kibana.alert.status': 'active' } },
          { term: { 'monitor.id': monitorId } },
          { range: { '@timestamp': { gte: sinceTimestamp } } },
        ],
      },
    },
  });
}

/**
 * Ages out a single down check document for `locationId` so that fewer than
 * `downThreshold` down checks remain within the 5-minute time window, without
 * waiting 30s of wall-clock time.
 */
export async function ageOutOldestDownCheck({
  esClient,
  monitorId,
  locationId,
}: {
  esClient: EsClient;
  monitorId: string;
  locationId: string;
}) {
  const searchRes = await esClient.search({
    index: `${SYNTHETICS_DOCS_INDEX}*`,
    size: 1,
    sort: [{ '@timestamp': 'asc' }],
    query: {
      bool: {
        filter: [
          { term: { 'monitor.id': monitorId } },
          { term: { 'observer.name': locationId } },
          { range: { 'summary.down': { gte: 1 } } },
        ],
      },
    },
  });
  const oldestHit = searchRes.hits.hits[0];
  if (oldestHit?._id && oldestHit?._index) {
    await esClient.delete({
      index: oldestHit._index,
      id: oldestHit._id,
      refresh: true,
    });
  }
}

export async function waitUntilMonitorLocationsPending({
  apiClient,
  editorHeaders,
  monitorId,
  condition,
  expectedLocationCount = 2,
  timeoutMs = 120_000,
}: {
  apiClient: ApiClientFixture;
  editorHeaders: Record<string, string>;
  monitorId: string;
  condition: StatusRuleParams['condition'];
  expectedLocationCount?: number;
  timeoutMs?: number;
}) {
  await tryForTime(
    timeoutMs,
    async () => {
      const res = await apiClient.post(SYNTHETICS_API_URLS.INSPECT_STATUS_RULE, {
        headers: editorHeaders,
        body: {
          monitorIds: [monitorId],
          condition,
        },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      const body = res.body as {
        pendingConfigs?: Record<string, { configId: string }>;
      };
      const matches = Object.values(body.pendingConfigs ?? {}).filter(
        (config) => config.configId === monitorId
      );
      if (matches.length < expectedLocationCount) {
        throw new Error(
          `Monitor ${monitorId} has ${matches.length}/${expectedLocationCount} pending locations`
        );
      }
    },
    { intervalMs: 2_000 }
  );
}

export function buildExpectedErrorLink(
  kibanaBaseUrl: string,
  monitorId: string,
  locationId = 'dev'
) {
  const normalizedBaseUrl = kibanaBaseUrl.replace(/\/$/, '');
  return `- Link: ${normalizedBaseUrl}/app/synthetics/monitor/${monitorId}/errors/Test%20private%20location-18524a3d9a7-0?locationId=${locationId}`;
}
