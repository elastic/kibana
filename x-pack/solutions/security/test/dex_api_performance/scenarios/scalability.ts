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

const PAYLOAD_SIZES = [100, 500, 1000, 1965];

/**
 * Scalability (linearity test): install increasing numbers of rules and measure
 * whether duration scales linearly with payload size, or exhibits O(N^2) behavior.
 */
export const scalabilityScenario: Scenario = {
  name: 'scalability',

  async run(ctx: ScenarioContext): Promise<ScenarioResult> {
    const { client, sampler, writer, logger, iterations } = ctx;
    const allResults: IterationResult[] = [];

    logger.info('Deleting all rules before fetching installable pool');
    await client.deleteAllRules();
    await client.waitForRulesCount(0);

    logger.info('Fetching installable rule pool for scalability test');
    const reviewResp = await client.reviewRulesForInstall(1, 2000);
    const rulePool = (reviewResp.rules ?? []).map((r) => ({ rule_id: r.rule_id, version: r.version }));
    logger.info(`Available rule pool: ${rulePool.length} rules`);

    if (rulePool.length === 0) {
      logger.warn('No installable rules found — skipping scalability scenario');
      return { scenario: 'scalability', boot_type: 'warm', iterations: [] };
    }

    for (const size of PAYLOAD_SIZES) {
      const subset = rulePool.slice(0, Math.min(size, rulePool.length));
      const actualSize = subset.length;

      logger.info(`--- Scalability: ${actualSize} rules ---`);

      for (let i = 1; i <= iterations; i++) {
        logger.info(`  Iteration ${i}/${iterations}: deleting all rules`);
        const deleteResult = await client.deleteAllRules();
        await client.waitForRulesCount(0);

        const beforeMetrics = await client.getProcessMetrics();
        const before = metricsToMb(beforeMetrics);

        logger.info(`  Iteration ${i}/${iterations}: installing ${actualSize} rules`);
        sampler.start();
        const installResult = await client.installSpecificRules(subset);
        const samples = sampler.stop();

        const afterMetrics = await client.getProcessMetrics();
        const after = metricsToMb(afterMetrics);

        const summary = installResult.body.summary;
        logger.info(`  ${summary.succeeded} rules in ${installResult.duration_ms}ms`);

        const iterResult: IterationResult = {
          iteration: i,
          duration_ms: installResult.duration_ms,
          http_status: installResult.status,
          rules_succeeded: summary.succeeded,
          rules_failed: summary.failed,
          rules_skipped: summary.skipped,
          total_rules: actualSize,
          delete_duration_ms: deleteResult.duration_ms,
          rss_before_mb: before.rss_mb,
          rss_after_mb: after.rss_mb,
          heap_before_mb: before.heap_mb,
          heap_after_mb: after.heap_mb,
        };

        allResults.push(iterResult);

        await writer.indexIteration({
          run_id: ctx.runId,
          environment_id: ctx.envConfig.id,
          scenario: 'scalability',
          boot_type: 'warm',
          ...iterResult,
        });

        if (samples.length > 0) {
          await writer.bulkIndexMemorySamples(
            samples.map((s) => ({
              ...s,
              run_id: ctx.runId,
              environment_id: ctx.envConfig.id,
              scenario: 'scalability',
              iteration: i,
            }))
          );
        }
      }
    }

    return { scenario: 'scalability', boot_type: 'warm', iterations: allResults };
  },
};
