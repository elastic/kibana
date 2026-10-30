/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Scenario, type ScenarioContext, type ScenarioResult, metricsToMb } from './types';

/**
 * Cold boot: single install on a pristine environment that has never had rules installed.
 * Captures the full first-touch latency including Fleet/EPR package download.
 * The environment is consumed (spent) after this scenario.
 */
export const coldBootScenario: Scenario = {
  name: 'cold_boot',

  async run(ctx: ScenarioContext): Promise<ScenarioResult> {
    const { client, sampler, logger } = ctx;

    logger.info('Verifying pristine state (0 rules installed)');
    const status = await client.getPrebuiltRulesStatus();
    if (status.stats.num_prebuilt_rules_installed > 0) {
      throw new Error(
        `Cold boot environment ${ctx.envConfig.id} already has ` +
          `${status.stats.num_prebuilt_rules_installed} rules installed. ` +
          `Cold boot requires a pristine environment.`
      );
    }

    logger.info('Initializing Security Solution (Fleet/EPR bootstrap)');
    await client.initializeSecuritySolution();

    const beforeMetrics = await client.getProcessMetrics();
    const before = metricsToMb(beforeMetrics);

    logger.info('Starting cold boot install');
    sampler.start();
    const result = await client.installAllRules();
    const samples = sampler.stop();

    const afterMetrics = await client.getProcessMetrics();
    const after = metricsToMb(afterMetrics);

    const summary = result.body.summary;
    logger.info(
      `Cold boot complete: ${summary.succeeded} succeeded, ${summary.failed} failed in ${result.duration_ms}ms`
    );

    const iterResult = {
      iteration: 1,
      duration_ms: result.duration_ms,
      http_status: result.status,
      rules_succeeded: summary.succeeded,
      rules_failed: summary.failed,
      rules_skipped: summary.skipped,
      total_rules: summary.total,
      delete_duration_ms: 0,
      rss_before_mb: before.rss_mb,
      rss_after_mb: after.rss_mb,
      heap_before_mb: before.heap_mb,
      heap_after_mb: after.heap_mb,
    };

    await ctx.writer.indexIteration({
      run_id: ctx.runId,
      environment_id: ctx.envConfig.id,
      scenario: 'cold_boot',
      boot_type: 'cold',
      ...iterResult,
    });

    if (samples.length > 0) {
      await ctx.writer.bulkIndexMemorySamples(
        samples.map((s) => ({
          ...s,
          run_id: ctx.runId,
          environment_id: ctx.envConfig.id,
          scenario: 'cold_boot',
          iteration: 1,
        }))
      );
    }

    return {
      scenario: 'cold_boot',
      boot_type: 'cold',
      iterations: [iterResult],
    };
  },
};
