/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import { tryForTime } from '../../../scout/common/fixtures/retry';

export const SYNTHETICS_INDEX_BY_TYPE = {
  http: 'synthetics-http-default',
  tcp: 'synthetics-tcp-default',
  icmp: 'synthetics-icmp-default',
  browser: 'synthetics-browser-default',
} as const;

export type SyntheticsMonitorType = keyof typeof SYNTHETICS_INDEX_BY_TYPE;

export interface SyntheticsCheckDoc {
  config_id?: string;
  test_run_id?: string;
  agent?: { id?: string };
  monitor?: { status?: string; type?: string; ip?: string };
  state?: { status?: string };
  summary?: { up?: number; down?: number; final_attempt?: boolean };
  url?: { full?: string; domain?: string };
  http?: { response?: { status_code?: number } };
  resolve?: { ip?: string };
  synthetics?: {
    type?: string;
    step?: { name?: string; status?: string };
  };
}

export const isCheckUp = (doc: SyntheticsCheckDoc): boolean =>
  doc.monitor?.status === 'up' || doc.state?.status === 'up' || doc.summary?.up === 1;

export const isCheckDown = (doc: SyntheticsCheckDoc): boolean =>
  doc.monitor?.status === 'down' || doc.state?.status === 'down' || doc.summary?.down === 1;

const statusMatches = (doc: SyntheticsCheckDoc, expectStatus: 'up' | 'down'): boolean =>
  expectStatus === 'up' ? isCheckUp(doc) : isCheckDown(doc);

const searchLatest = async (
  esClient: EsClient,
  index: string,
  filters: Array<Record<string, unknown>>,
  testRunId?: string
): Promise<SyntheticsCheckDoc | undefined> => {
  await esClient.indices.refresh({ index, ignore_unavailable: true }).catch(() => undefined);

  const res = await esClient.search<SyntheticsCheckDoc>({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 5,
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      bool: {
        filter: testRunId ? [...filters, { term: { test_run_id: testRunId } }] : filters,
      },
    },
  });

  return res.hits.hits[0]?._source;
};

const checkFilters = ({
  type,
  configId,
  agentId,
  since,
}: {
  type: SyntheticsMonitorType;
  configId: string;
  agentId?: string;
  since?: string;
}): Array<Record<string, unknown>> => {
  // Lightweight http/tcp/icmp docs do not set synthetics.type. Browser
  // journeys do — restrict to heartbeat/summary so we skip journey/start.
  const filters: Array<Record<string, unknown>> = [{ term: { config_id: configId } }];
  if (type === 'browser') {
    filters.push({ term: { 'synthetics.type': 'heartbeat/summary' } });
  }
  if (agentId) {
    filters.push({ term: { 'agent.id': agentId } });
  }
  if (since) {
    filters.push({ range: { '@timestamp': { gte: since } } });
  }
  return filters;
};

export async function findSyntheticsCheck(
  esClient: EsClient,
  {
    type,
    configId,
    testRunId,
    agentId,
    since,
  }: {
    type: SyntheticsMonitorType;
    configId: string;
    testRunId?: string;
    agentId?: string;
    since?: string;
  }
): Promise<SyntheticsCheckDoc | undefined> {
  return searchLatest(
    esClient,
    SYNTHETICS_INDEX_BY_TYPE[type],
    checkFilters({ type, configId, agentId, since }),
    testRunId
  );
}

export async function waitForSyntheticsCheck(
  esClient: EsClient,
  {
    type,
    configId,
    testRunId,
    agentId,
    since,
    expectStatus = 'up',
    timeoutMs = 180_000,
  }: {
    type: SyntheticsMonitorType;
    configId: string;
    testRunId?: string;
    agentId?: string;
    since?: string;
    expectStatus?: 'up' | 'down';
    timeoutMs?: number;
  }
): Promise<SyntheticsCheckDoc> {
  const index = SYNTHETICS_INDEX_BY_TYPE[type];

  return tryForTime(
    timeoutMs,
    async () => {
      const source = await findSyntheticsCheck(esClient, {
        type,
        configId,
        testRunId,
        agentId,
        since,
      });

      if (!source) {
        throw new Error(
          `No ${type} check document yet in ${index} for config_id=${configId}` +
            (testRunId ? ` test_run_id=${testRunId}` : '') +
            (agentId ? ` agent.id=${agentId}` : '')
        );
      }
      if (!statusMatches(source, expectStatus)) {
        throw new Error(
          `Latest ${type} summary is not ${expectStatus} (monitor.status=${
            source.monitor?.status
          }, summary=${JSON.stringify(source.summary)})`
        );
      }
      return source;
    },
    { intervalMs: 3_000 }
  );
}

/** Drops Heartbeat docs for a stopped agent so STALE_DATA_MS cannot veto failover. */
export async function deleteSyntheticsDocsForAgent(
  esClient: EsClient,
  agentId: string
): Promise<void> {
  await esClient.deleteByQuery({
    index: 'synthetics-*',
    query: { term: { 'agent.id': agentId } },
    refresh: true,
    ignore_unavailable: true,
    conflicts: 'proceed',
  });
}

export async function waitForBrowserStep(
  esClient: EsClient,
  {
    configId,
    testRunId,
    stepName,
    timeoutMs = 180_000,
  }: {
    configId: string;
    testRunId?: string;
    stepName: string;
    timeoutMs?: number;
  }
): Promise<SyntheticsCheckDoc> {
  const index = SYNTHETICS_INDEX_BY_TYPE.browser;

  return tryForTime(
    timeoutMs,
    async () => {
      const source = await searchLatest(
        esClient,
        index,
        [
          { term: { config_id: configId } },
          { term: { 'synthetics.type': 'step/end' } },
          {
            bool: {
              should: [
                { term: { 'synthetics.step.name.keyword': stepName } },
                { term: { 'synthetics.step.name': stepName } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        testRunId
      );

      if (!source) {
        throw new Error(
          `No browser step/end yet in ${index} for step="${stepName}" config_id=${configId}`
        );
      }
      return source;
    },
    { intervalMs: 3_000 }
  );
}
