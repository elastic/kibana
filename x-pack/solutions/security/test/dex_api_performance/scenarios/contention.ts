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
import { computeStats } from '../lib/statistics';

const READ_INTERVAL_MS = 200;

/**
 * Contention test: fires concurrent customer-facing read queries (rules/_find)
 * while the batch install runs, measuring whether the install starves reads.
 */
export const contentionScenario: Scenario = {
  name: 'contention',

  async run(ctx: ScenarioContext): Promise<ScenarioResult> {
    const { client, sampler, writer, logger, iterations } = ctx;
    const results: IterationResult[] = [];

    for (let i = 1; i <= iterations; i++) {
      logger.info(`Contention iteration ${i}/${iterations}: deleting all rules`);
      const deleteResult = await client.deleteAllRules();
      await client.waitForRulesCount(0);

      const readLatencies: number[] = [];
      let readRunning = true;

      const readLoop = (async () => {
        while (readRunning) {
          try {
            const readResult = await client.findRules(1);
            readLatencies.push(readResult.duration_ms);
          } catch {
            // read failure during install is expected under heavy contention
          }
          await sleep(READ_INTERVAL_MS);
        }
      })();

      const beforeMetrics = await client.getProcessMetrics();
      const before = metricsToMb(beforeMetrics);

      logger.info(`Contention iteration ${i}/${iterations}: installing with concurrent reads`);
      sampler.start();
      const installResult = await client.installAllRules();
      const samples = sampler.stop();

      readRunning = false;
      await readLoop;

      const afterMetrics = await client.getProcessMetrics();
      const after = metricsToMb(afterMetrics);

      const readStats = computeStats(readLatencies);
      const summary = installResult.body.summary;

      logger.info(
        `  Install: ${installResult.duration_ms}ms | Reads: ${readLatencies.length} samples, ` +
          `mean=${readStats.mean}ms, p95=${readStats.p95}ms`
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
        customer_read_latency_mean_ms: Math.round(readStats.mean),
        customer_read_latency_p95_ms: Math.round(readStats.p95),
      };

      results.push(iterResult);

      await writer.indexIteration({
        run_id: ctx.runId,
        environment_id: ctx.envConfig.id,
        scenario: 'contention',
        boot_type: 'warm',
        ...iterResult,
      });

      if (samples.length > 0) {
        await writer.bulkIndexMemorySamples(
          samples.map((s) => ({
            ...s,
            run_id: ctx.runId,
            environment_id: ctx.envConfig.id,
            scenario: 'contention',
            iteration: i,
          }))
        );
      }
    }

    return { scenario: 'contention', boot_type: 'warm', iterations: results };
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
