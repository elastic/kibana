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

const STABILITY_CYCLES = 20;

/**
 * Memory stability: 20 consecutive delete/install cycles without delay.
 * Detects memory leaks by checking whether RSS/heap drifts upward across cycles.
 */
export const memoryStabilityScenario: Scenario = {
  name: 'memory_stability',

  async run(ctx: ScenarioContext): Promise<ScenarioResult> {
    const { client, sampler, writer, logger } = ctx;
    const results: IterationResult[] = [];

    sampler.start();

    for (let i = 1; i <= STABILITY_CYCLES; i++) {
      logger.info(`Memory stability cycle ${i}/${STABILITY_CYCLES}: deleting all rules`);
      const deleteResult = await client.deleteAllRules();
      await client.waitForRulesCount(0);

      const beforeMetrics = await client.getProcessMetrics();
      const before = metricsToMb(beforeMetrics);

      logger.info(`Memory stability cycle ${i}/${STABILITY_CYCLES}: installing all rules`);
      const installResult = await client.installAllRules();

      const afterMetrics = await client.getProcessMetrics();
      const after = metricsToMb(afterMetrics);

      const summary = installResult.body.summary;
      logger.info(
        `  Cycle ${i}: ${summary.succeeded} rules in ${installResult.duration_ms}ms | ` +
          `heap: ${before.heap_mb} -> ${after.heap_mb} MB | rss: ${before.rss_mb} -> ${after.rss_mb} MB`
      );

      const iterResult: IterationResult = {
        iteration: i,
        duration_ms: installResult.duration_ms,
        http_status: installResult.status,
        rules_succeeded: summary.succeeded,
        rules_failed: summary.failed,
        rules_skipped: summary.skipped,
        total_rules: summary.total,
        delete_duration_ms: deleteResult.duration_ms,
        rss_before_mb: before.rss_mb,
        rss_after_mb: after.rss_mb,
        heap_before_mb: before.heap_mb,
        heap_after_mb: after.heap_mb,
      };

      results.push(iterResult);

      await writer.indexIteration({
        run_id: ctx.runId,
        environment_id: ctx.envConfig.id,
        scenario: 'memory_stability',
        boot_type: 'warm',
        ...iterResult,
      });
    }

    const samples = sampler.stop();

    if (samples.length > 0) {
      await writer.bulkIndexMemorySamples(
        samples.map((s) => ({
          ...s,
          run_id: ctx.runId,
          environment_id: ctx.envConfig.id,
          scenario: 'memory_stability',
          iteration: 0,
        }))
      );
    }

    return { scenario: 'memory_stability', boot_type: 'warm', iterations: results };
  },
};
