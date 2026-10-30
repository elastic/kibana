/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Scenario, type ScenarioContext, type ScenarioResult, type IterationResult, metricsToMb } from './types';

/**
 * Warm boot: repeated delete/install cycles on an already-warmed environment.
 * Measures steady-state install latency after caches, connection pools, and
 * Fleet packages are all warm.
 */
export const warmBootScenario: Scenario = {
  name: 'warm_boot',

  async run(ctx: ScenarioContext): Promise<ScenarioResult> {
    const { client, sampler, writer, logger, iterations } = ctx;
    const results: IterationResult[] = [];

    for (let i = 1; i <= iterations; i++) {
      logger.info(`Warm boot iteration ${i}/${iterations}: deleting all rules`);
      const deleteResult = await client.deleteAllRules();
      await client.waitForRulesCount(0);

      const beforeMetrics = await client.getProcessMetrics();
      const before = metricsToMb(beforeMetrics);

      logger.info(`Warm boot iteration ${i}/${iterations}: installing all rules`);
      sampler.start();
      const installResult = await client.installAllRules();
      const samples = sampler.stop();

      const afterMetrics = await client.getProcessMetrics();
      const after = metricsToMb(afterMetrics);

      const summary = installResult.body.summary;
      logger.info(
        `Iteration ${i}: ${summary.succeeded} rules in ${installResult.duration_ms}ms`
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
        scenario: 'warm_boot',
        boot_type: 'warm',
        ...iterResult,
      });

      if (samples.length > 0) {
        await writer.bulkIndexMemorySamples(
          samples.map((s) => ({
            ...s,
            run_id: ctx.runId,
            environment_id: ctx.envConfig.id,
            scenario: 'warm_boot',
            iteration: i,
          }))
        );
      }
    }

    return { scenario: 'warm_boot', boot_type: 'warm', iterations: results };
  },
};
