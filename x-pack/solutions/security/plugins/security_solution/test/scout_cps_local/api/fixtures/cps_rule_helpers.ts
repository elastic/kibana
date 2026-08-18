/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient } from '@kbn/scout-security';
import { PUBLIC_HEADERS } from '.';

export const RULE_INTERVAL = '1m';
export const ALERT_WAIT_TIMEOUT = 180_000;
/** Extra wait after the first in-scope alert so a same-run leak can show up. */
export const ISOLATION_SETTLE_MS = 2_000;

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';
const WAIT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_ALERT_SOURCE_FIELDS = ['host.name', 'kibana.alert.threshold_result.count'];

export interface RuleAlertHit {
  _source?: {
    host?: { name?: string };
    kibana?: { alert?: { threshold_result?: { count?: number } } };
    ['kibana.alert.threshold_result']?: { count?: number };
    ['kibana.alert.threshold_result.count']?: number;
  };
}

export const alertsIndexForSpace = (spaceId = 'default'): string =>
  `.alerts-security.alerts-${spaceId}`;

const spaceBasePath = (spaceId?: string): string =>
  spaceId !== undefined && spaceId !== 'default' ? `/s/${spaceId}` : '';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One event on a `logs-*` data stream. Serverless treats `logs-*` as
 * data-stream-only, so we write with `op_type: create` and let ES create the stream.
 */
export const seedLogsEvent = async (
  esClient: EsClient,
  {
    dataStream,
    hostName,
    eventAction,
    runId,
  }: {
    dataStream: string;
    hostName: string;
    eventAction: string;
    runId: string;
  }
): Promise<void> => {
  await esClient.indices.deleteDataStream({ name: dataStream }, { ignore: [404] });
  await esClient.bulk(
    {
      refresh: 'wait_for',
      operations: [
        { create: { _index: dataStream } },
        {
          '@timestamp': new Date(Date.now() - 5 * 60_000).toISOString(),
          event: { id: `${runId}-${hostName}`, action: eventAction, kind: 'event' },
          host: { name: hostName },
        },
      ],
    },
    { requestTimeout: 180_000 }
  );
};

const hostNamesFromAlertHits = (hits: RuleAlertHit[]): Array<string | undefined> =>
  hits.map((hit) => hit._source?.host?.name);

export const thresholdCountFromAlertHit = (hit: RuleAlertHit): number | undefined => {
  const nested = hit._source?.kibana?.alert?.threshold_result?.count;
  if (typeof nested === 'number') {
    return nested;
  }
  const dottedObject = hit._source?.['kibana.alert.threshold_result']?.count;
  if (typeof dottedObject === 'number') {
    return dottedObject;
  }
  const dottedCount = hit._source?.['kibana.alert.threshold_result.count'];
  return typeof dottedCount === 'number' ? dottedCount : undefined;
};

const searchRuleAlerts = async ({
  esClient,
  ruleName,
  spaceId,
  sourceFields,
}: {
  esClient: EsClient;
  ruleName: string;
  spaceId: string;
  sourceFields: string[];
}): Promise<RuleAlertHit[]> => {
  const index = alertsIndexForSpace(spaceId);
  await esClient.indices.refresh({ index, ignore_unavailable: true });
  const result = await esClient.search({
    index,
    ignore_unavailable: true,
    query: { term: { 'kibana.alert.rule.name': ruleName } },
    _source: sourceFields,
    size: 10,
  });
  return result.hits.hits as RuleAlertHit[];
};

export const waitForRuleAlertHits = async ({
  esClient,
  ruleName,
  minCount,
  timeout = ALERT_WAIT_TIMEOUT,
  spaceId = 'default',
  sourceFields = DEFAULT_ALERT_SOURCE_FIELDS,
  settleMs = 0,
}: {
  esClient: EsClient;
  ruleName: string;
  minCount: number;
  timeout?: number;
  spaceId?: string;
  sourceFields?: string[];
  settleMs?: number;
}): Promise<RuleAlertHit[]> => {
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const hits = await searchRuleAlerts({ esClient, ruleName, spaceId, sourceFields });
      if (hits.length >= minCount) {
        if (settleMs > 0) {
          await sleep(settleMs);
          return searchRuleAlerts({ esClient, ruleName, spaceId, sourceFields });
        }
        return hits;
      }
    } catch (err) {
      lastError = err;
    }
    await sleep(WAIT_POLL_INTERVAL_MS);
  }

  const lastErrorMsg = lastError instanceof Error ? lastError.message : String(lastError ?? '');
  throw new Error(
    `Timed out after ${timeout}ms waiting for >=${minCount} alert(s) for rule "${ruleName}" in space "${spaceId}"${
      lastErrorMsg ? ` (last error: ${lastErrorMsg})` : ''
    }`
  );
};

export const waitForRuleAlertHosts = async (
  opts: Parameters<typeof waitForRuleAlertHits>[0]
): Promise<Array<string | undefined>> => hostNamesFromAlertHits(await waitForRuleAlertHits(opts));

interface JsonApiClient {
  post: (
    url: string,
    opts: { headers: Record<string, string>; responseType: 'json'; body: object }
  ) => Promise<{ statusCode: number; body: unknown }>;
}

/**
 * Creates a detection rule with a UIAM session cookie.
 *
 * Do not switch this to `requestAuth` API keys or Scout `kbnClient`. `cps_local`
 * sets `xpack.alerting.rules.apiKeyType=uiam`. Alerting only grants an `essu_…`
 * execution key when create carries UIAM credentials; basic auth / API keys skip
 * grant and the rule searches origin only.
 */
export const createDetectionRuleWithUiam = async ({
  apiClient,
  cookieHeader,
  body,
  spaceId,
}: {
  apiClient: JsonApiClient;
  cookieHeader: Record<string, string>;
  body: object;
  spaceId?: string;
}): Promise<{ statusCode: number; body: unknown }> => {
  return apiClient.post(`${spaceBasePath(spaceId)}${DETECTION_ENGINE_RULES_URL}`, {
    headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    responseType: 'json',
    body,
  });
};

export const deleteAllDetectionRulesInSpace = async (
  kbnClient: KbnClient,
  spaceId?: string
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `${spaceBasePath(spaceId)}${DETECTION_ENGINE_RULES_BULK_ACTION}`,
    body: {
      query: '',
      action: 'delete',
    },
  });
};

export const deleteAlertsInSpace = async (
  esClient: EsClient,
  spaceId = 'default'
): Promise<void> => {
  const index = alertsIndexForSpace(spaceId);
  await esClient.indices.refresh({ index, ignore_unavailable: true });
  await esClient.deleteByQuery({
    index,
    ignore_unavailable: true,
    query: { match_all: {} },
    conflicts: 'proceed',
    scroll_size: 10000,
    refresh: true,
  });
};
