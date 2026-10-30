/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Scenario,
  type ScenarioContext,
  type ScenarioResult,
  type IterationResult,
  metricsToMb,
} from './types';

/**
 * Double-click test: fires two concurrent install requests to verify the
 * concurrency limiter rejects the second cleanly (no deadlocks, no duplicates).
 */
export const doubleClickScenario: Scenario = {
  name: 'double_click',

  async run(ctx: ScenarioContext): Promise<ScenarioResult> {
    const { client, writer, logger, iterations } = ctx;
    const results: IterationResult[] = [];

    for (let i = 1; i <= iterations; i++) {
      logger.info(`Double-click iteration ${i}/${iterations}: deleting all rules`);
      await client.deleteAllRules();
      await client.waitForRulesCount(0);

      const beforeMetrics = await client.getProcessMetrics();
      const before = metricsToMb(beforeMetrics);

      logger.info(`Double-click iteration ${i}/${iterations}: firing two concurrent installs`);

      const [resultA, resultB] = await Promise.allSettled([
        client.installAllRules(),
        client.installAllRules(),
      ]);

      const afterMetrics = await client.getProcessMetrics();
      const after = metricsToMb(afterMetrics);

      const outcomes = [resultA, resultB].map((settled, idx) => {
        if (settled.status === 'fulfilled') {
          const r = settled.value;
          return {
            label: idx === 0 ? 'A' : 'B',
            rejected: false,
            duration_ms: r.duration_ms,
            http_status: r.status,
            succeeded: r.body.summary.succeeded,
            failed: r.body.summary.failed,
            skipped: r.body.summary.skipped,
            total: r.body.summary.total,
          };
        }
        return {
          label: idx === 0 ? 'A' : 'B',
          rejected: true,
          duration_ms: 0,
          http_status: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          total: 0,
          error: String(settled.reason),
        };
      });

      for (const outcome of outcomes) {
        logger.info(
          `  Request ${outcome.label}: ${outcome.rejected ? 'REJECTED' : 'OK'} ` +
            `status=${outcome.http_status} duration=${outcome.duration_ms}ms ` +
            `succeeded=${outcome.succeeded}`
        );

        const iterResult: IterationResult = {
          iteration: i,
          duration_ms: outcome.duration_ms,
          http_status: outcome.http_status,
          rules_succeeded: outcome.succeeded,
          rules_failed: outcome.failed,
          rules_skipped: outcome.skipped,
          total_rules: outcome.total,
          delete_duration_ms: 0,
          rss_before_mb: before.rss_mb,
          rss_after_mb: after.rss_mb,
          heap_before_mb: before.heap_mb,
          heap_after_mb: after.heap_mb,
          concurrent_install_rejected: outcome.rejected,
          error_message: outcome.rejected ? (outcome as { error?: string }).error : undefined,
        };

        results.push(iterResult);

        await writer.indexIteration({
          run_id: ctx.runId,
          environment_id: ctx.envConfig.id,
          scenario: 'double_click',
          boot_type: 'warm',
          ...iterResult,
        });
      }
    }

    return { scenario: 'double_click', boot_type: 'warm', iterations: results };
  },
};
