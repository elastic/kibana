/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import {
  COMMON_HEADERS,
  DETECTION_ENGINE_RULES_PREVIEW_URL,
  CORRELATION_PERF_TAGS,
} from '../fixtures/correlation_perf_constants';
import {
  seedSyntheticAlerts,
  buildCorrelationRule,
  cleanupAll,
} from '../fixtures/correlation_perf_helpers';

const PERF_TIERS = [
  { alertCount: 100, hostCount: 10, maxDurationMs: 5_000, label: '100 alerts' },
  { alertCount: 1_000, hostCount: 50, maxDurationMs: 10_000, label: '1k alerts' },
  { alertCount: 5_000, hostCount: 100, maxDurationMs: 20_000, label: '5k alerts' },
];

apiTest.describe('Correlation engine performance', { tag: CORRELATION_PERF_TAGS }, () => {
  let headers: Record<string, string>;
  const sourceRuleIdsByTier: Record<string, string[]> = {};

  apiTest.beforeAll(async ({ samlAuth, esClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    headers = { ...credentials.cookieHeader, ...COMMON_HEADERS };

    for (const { alertCount, hostCount, label } of PERF_TIERS) {
      const ruleIds = [uuidv4(), uuidv4(), uuidv4()];
      sourceRuleIdsByTier[label] = ruleIds;

      await seedSyntheticAlerts(esClient, alertCount, hostCount, ruleIds);
    }
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    await cleanupAll(apiClient, esClient, headers);
  });

  for (const { maxDurationMs, label } of PERF_TIERS) {
    apiTest(`correlates ${label} within ${maxDurationMs}ms`, async ({ apiClient, log }) => {
      const correlationRule = buildCorrelationRule({
        sourceRuleIds: sourceRuleIdsByTier[label] ?? [],
        groupBy: ['host.name'],
        timespan: '10m',
        correlationType: 'temporal',
      });

      const start = performance.now();
      const response = await apiClient.post(DETECTION_ENGINE_RULES_PREVIEW_URL, {
        headers,
        responseType: 'json',
        body: {
          ...correlationRule,
          invocationCount: 1,
          timeframeEnd: new Date().toISOString(),
        },
      });
      const wallClock = performance.now() - start;

      expect(response.statusCode).toBe(200);

      const { logs, isAborted } = response.body as {
        logs: Array<{ duration: number }>;
        isAborted: boolean;
      };

      const executionDuration = logs?.[0]?.duration ?? wallClock;
      log.info(
        `[PERF] ${label}: wall=${wallClock.toFixed(
          0
        )}ms, exec=${executionDuration}ms, aborted=${isAborted}`
      );

      expect(isAborted).toBe(false);
      expect(executionDuration).toBeLessThan(maxDurationMs);
    });
  }
});
