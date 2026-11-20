/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  apiTest,
  COMMON_HEADERS,
  RECONCILE_RULES_PATH,
  setNightshiftEnabled,
  TICK_PATH,
} from '../fixtures';

const INDEX = 'nightshift-detection-known-failures';
const SOURCES_PATH = 'internal/nightshift/sources';
const QUERIES_PATH = 'internal/significant_events/queries';
const KNOWLEDGE_INDICATOR_ID = 'known-failures-scout-timeouts';
const MINUTE_MS = 60_000;
/** A rule runs when created and every 5 minutes; a row is read once its window has settled. */
const SIGNAL_TIMEOUT_MS = 10 * MINUTE_MS;
const POLL_INTERVAL_MS = 15_000;

interface ReconcileResponse {
  status: 'completed' | 'busy';
  created?: number;
  failures?: unknown[];
}

/**
 * Two timeouts a minute for six hours, then 25 a minute for the last 40 minutes, and on into the
 * next 15 so the rule never reads a half-written minute. A step up the rule reports as active.
 */
const seedStepUp = async (esClient: EsClient) => {
  await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
  await esClient.indices.create({
    index: INDEX,
    mappings: { properties: { '@timestamp': { type: 'date' }, message: { type: 'text' } } },
  });
  const nowMinute = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
  const operations = Array.from({ length: 360 + 15 }, (_, index) => index - 360).flatMap((minute) =>
    Array.from({ length: minute >= -40 ? 25 : 2 }, (__, second) => [
      { create: { _index: INDEX } },
      {
        '@timestamp': new Date(nowMinute + minute * MINUTE_MS + second * 1_000).toISOString(),
        message: 'upstream timeout',
      },
    ]).flat()
  );
  await esClient.bulk({ operations, refresh: 'wait_for' });
};

const findSignal = async (esClient: EsClient) => {
  const response = await esClient.search<{ status: string; data: Record<string, unknown> }>({
    index: ALERT_EVENTS_DATA_STREAM,
    size: 1,
    query: {
      bool: {
        filter: [
          { term: { type: 'signal' } },
          { term: { 'data.fingerprint': `known_failures:${KNOWLEDGE_INDICATOR_ID}` } },
        ],
      },
    },
  });
  return response.hits.hits[0]?._source;
};

/** Ticks until the generator has stored the signal: the rule must run and its window settle. */
const tickUntilSignal = async ({
  apiClient,
  esClient,
  headers,
}: {
  apiClient: ApiClientFixture;
  esClient: EsClient;
  headers: Record<string, string>;
}) => {
  const deadline = Date.now() + SIGNAL_TIMEOUT_MS;
  let signal = await findSignal(esClient);
  while (!signal && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    // A busy answer is fine: the engine's own workflow is ticking the space.
    await apiClient.post(TICK_PATH, { headers, body: {}, responseType: 'json' });
    signal = await findSignal(esClient);
  }
  return signal;
};

apiTest.describe(
  'Known failures',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let sourceId: string;

    apiTest.beforeAll(async ({ samlAuth, apiServices, config, apiClient, esClient }) => {
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, true);
      }
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...COMMON_HEADERS, ...cookieHeader, 'elastic-api-version': '1' };
      await seedStepUp(esClient);

      const source = await apiClient.post(SOURCES_PATH, {
        headers,
        responseType: 'json',
        body: { title: 'Known failures Scout', esql: `FROM ${INDEX}`, enabled: true },
      });
      expect(source).toHaveStatusCode(200);
      sourceId = source.body.source.id;

      const knowledgeIndicator = await apiClient.put(`${QUERIES_PATH}/${KNOWLEDGE_INDICATOR_ID}`, {
        headers,
        responseType: 'json',
        body: {
          source_id: sourceId,
          title: 'Upstream timeouts',
          description: 'Calls upstream time out',
          severity_score: 70,
          esql: { query: `FROM ${source.body.source.view_name} | WHERE message : "timeout"` },
        },
      });
      expect(knowledgeIndicator).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ apiServices, config, apiClient, esClient }) => {
      await apiClient.post('internal/streams/queries/_bulk_delete', {
        headers,
        body: { queryIds: [KNOWLEDGE_INDICATOR_ID] },
      });
      // Deletes the rule of the knowledge indicator just deleted.
      await apiClient.post(RECONCILE_RULES_PATH, { headers, body: {} });
      await apiClient.delete(`${SOURCES_PATH}/${sourceId}`, { headers });
      await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, null);
      }
    });

    apiTest(
      'stores one breached signal for a knowledge indicator whose count stepped up',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(SIGNAL_TIMEOUT_MS + 2 * MINUTE_MS);

        const first = await apiClient.post<ReconcileResponse>(RECONCILE_RULES_PATH, {
          headers,
          body: {},
          responseType: 'json',
        });
        expect(first.body).toMatchObject({ status: 'completed', failures: [] });
        // The rules already match the knowledge indicators, whoever created them first: this
        // call or the workflow the write triggered.
        const second = await apiClient.post<ReconcileResponse>(RECONCILE_RULES_PATH, {
          headers,
          body: {},
          responseType: 'json',
        });
        expect(second.body).toMatchObject({ status: 'completed', created: 0, failures: [] });

        const signal = await tickUntilSignal({ apiClient, esClient, headers });

        expect(signal).toMatchObject({
          status: 'breached',
          data: {
            strategy: 'known_failures',
            source_id: sourceId,
            entity: { type: 'source', name: sourceId },
            compare_with_normal: false,
            quiet_period_minutes: 5,
            details: { ki_id: KNOWLEDGE_INDICATOR_ID, change_point_type: 'step_change' },
          },
        });
      }
    );
  }
);
