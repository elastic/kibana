/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const DEFAULT_ALERTS_INDEX_PATTERN = '.alerts-security.alerts-';
const WAIT_FOR_ALERTS_POLL_INTERVAL_MS = 1_000;

export interface DetectionAlertsApiService {
  deleteAll: () => Promise<void>;
  /** Polls until ≥ minCount alerts for ruleName exist; rejects on timeout (default 30s). */
  waitForAlerts: (ruleName: string, minCount?: number, timeout?: number) => Promise<number>;
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
  const space = scoutSpace?.id ? scoutSpace?.id : 'default';

  return {
    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.detectionAlerts.deleteAll', async () => {
        await esClient.indices.refresh({
          index: `${DEFAULT_ALERTS_INDEX_PATTERN}${space}`,
          ignore_unavailable: true,
        });

        await esClient.deleteByQuery({
          index: `${DEFAULT_ALERTS_INDEX_PATTERN}${space}`,
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
  };
};
