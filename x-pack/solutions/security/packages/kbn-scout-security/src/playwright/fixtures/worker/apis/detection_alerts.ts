/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EsClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const DEFAULT_ALERTS_INDEX_PATTERN = '.alerts-security.alerts-';
const WAIT_FOR_ALERTS_POLL_INTERVAL_MS = 1_000;

export interface DetectionAlertsApiService {
  deleteAll: () => Promise<void>;
  /** Polls until ≥ minCount alerts for ruleName exist; rejects on timeout (default 30s). */
  waitForAlerts: (ruleName: string, minCount?: number, timeout?: number) => Promise<number>;
  /** Returns the earliest and latest `@timestamp` (ISO) of ruleName's searchable alerts; call after waitForAlerts. */
  getAlertsTimeRange: (ruleName: string) => Promise<{ from: string; to: string }>;
}

export const getDetectionAlertsApiService = ({
  esClient,
  log,
  scoutSpace,
}: {
  esClient: EsClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): DetectionAlertsApiService => {
  const space = scoutSpace?.id ?? 'default';

  return {
    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.detectionAlerts.deleteAll', async () => {
        const index = `${DEFAULT_ALERTS_INDEX_PATTERN}${space}`;

        // The alerts index is created lazily by the detection engine, so it may not exist yet when
        // cleanup runs (e.g. defensive `beforeAll` before any alert was generated). `ignore_unavailable`
        // keeps `deleteAll()` idempotent so callers never need a try/catch around it.
        await esClient.indices.refresh({ index, ignore_unavailable: true });

        await esClient.deleteByQuery({
          index,
          ignore_unavailable: true,
          query: {
            match_all: {},
          },
          conflicts: 'proceed',
          scroll_size: 10000,
          refresh: true,
        });
      });
    },

    waitForAlerts: async (ruleName: string, minCount = 1, timeout = 30_000) => {
      return measurePerformanceAsync(log, 'security.detectionAlerts.waitForAlerts', async () => {
        const deadline = Date.now() + timeout;
        const index = `${DEFAULT_ALERTS_INDEX_PATTERN}${space}`;

        while (Date.now() < deadline) {
          try {
            await esClient.indices.refresh({ index });
            const result = await esClient.count({
              index,
              query: {
                term: { 'kibana.alert.rule.name': ruleName },
              },
            });
            if (result.count >= minCount) {
              return result.count;
            }
          } catch {
            // index not yet created — keep polling
          }
          await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_ALERTS_POLL_INTERVAL_MS));
        }

        throw new Error(
          `waitForAlerts timed out after ${timeout}ms: expected >=${minCount} alert(s) for rule "${ruleName}" in space "${space}"`
        );
      });
    },

    getAlertsTimeRange: async (ruleName: string) => {
      return measurePerformanceAsync(
        log,
        'security.detectionAlerts.getAlertsTimeRange',
        async () => {
          const { aggregations } = await esClient.search<
            unknown,
            { earliest: estypes.AggregationsMinAggregate; latest: estypes.AggregationsMaxAggregate }
          >({
            index: `${DEFAULT_ALERTS_INDEX_PATTERN}${space}`,
            size: 0,
            query: {
              term: { 'kibana.alert.rule.name': ruleName },
            },
            aggs: {
              earliest: { min: { field: '@timestamp' } },
              latest: { max: { field: '@timestamp' } },
            },
          });
          const from = aggregations?.earliest.value_as_string;
          const to = aggregations?.latest.value_as_string;
          if (!from || !to) {
            throw new Error(`No alerts found for rule "${ruleName}" in space "${space}"`);
          }
          return { from, to };
        }
      );
    },
  };
};
