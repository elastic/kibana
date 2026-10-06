/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EnvironmentConfig, type PerfConfig, type ScenarioName, parseCredentials } from '../lib/config';
import { KibanaClient } from '../lib/kibana_client';
import { MemorySampler } from '../lib/memory_sampler';
import { type ESWriter } from '../lib/es_writer';
import { type Logger } from '../lib/logger';
import { computeStats } from '../lib/statistics';
import { type Scenario, type ScenarioResult } from '../scenarios/types';
import { warmBootScenario } from '../scenarios/warm_boot';
import { scalabilityScenario } from '../scenarios/scalability';
import { contentionScenario } from '../scenarios/contention';
import { doubleClickScenario } from '../scenarios/double_click';
import { memoryStabilityScenario } from '../scenarios/memory_stability';

const ALL_WARM_SCENARIOS: ScenarioName[] = [
  'warm_boot',
  'scalability',
  'contention',
  'double_click',
  'memory_stability',
];

const SCENARIO_MAP: Record<string, Scenario> = {
  warm_boot: warmBootScenario,
  scalability: scalabilityScenario,
  contention: contentionScenario,
  double_click: doubleClickScenario,
  memory_stability: memoryStabilityScenario,
};

export async function runWarmScenarios(
  env: EnvironmentConfig,
  runId: string,
  config: PerfConfig,
  writer: ESWriter,
  logger: Logger,
  scenarioFilter?: ScenarioName[]
): Promise<void> {
  const envLogger = logger.child(env.id);
  const credentials = parseCredentials(env.credentials);
  const client = new KibanaClient(env.kibana_url, credentials, envLogger);

  envLogger.info('Waiting for Kibana to be healthy');
  await client.waitForHealthy();

  envLogger.info('Running primer: initialize Security Solution');
  await client.initializeSecuritySolution();

  envLogger.info('Primer: install 1 rule to warm caches');
  const { rules } = await client.reviewRulesForInstall(1, 1);
  if (rules.length > 0) {
    await client.installSpecificRules([{ rule_id: rules[0].rule_id, version: rules[0].version }]);
    await client.deleteAllRules();
    await client.waitForRulesCount(0);
  }

  const requestedScenarios = env.scenarios ?? ALL_WARM_SCENARIOS;
  const activeScenarios = scenarioFilter
    ? requestedScenarios.filter((s) => scenarioFilter.includes(s))
    : requestedScenarios;

  const iterations = env.iterations ?? config.defaults.iterations;

  for (const scenarioName of activeScenarios) {
    const scenario = SCENARIO_MAP[scenarioName];
    if (!scenario) {
      envLogger.warn(`Unknown scenario "${scenarioName}", skipping`);
      continue;
    }

    envLogger.info(`=== Running scenario: ${scenarioName} ===`);

    const sampler = new MemorySampler(
      client,
      config.defaults.memory_sample_interval_ms,
      envLogger
    );

    const result: ScenarioResult = await scenario.run({
      client,
      sampler,
      writer,
      runId,
      envConfig: env,
      iterations,
      logger: envLogger,
    });

    await indexRunSummaryFromResult(result, env, runId, writer);

    envLogger.info(`=== Scenario ${scenarioName} complete ===`);
  }

  envLogger.info(`All warm scenarios complete on ${env.id}`);
}

async function indexRunSummaryFromResult(
  result: ScenarioResult,
  env: EnvironmentConfig,
  runId: string,
  writer: ESWriter
): Promise<void> {
  const successfulIterations = result.iterations.filter((r) => r.http_status === 200);
  const durations = successfulIterations.map((r) => r.duration_ms);
  const stats = computeStats(durations);

  await writer.indexRunSummary({
    run_id: runId,
    environment_id: env.id,
    environment_role: env.role,
    scenario: result.scenario,
    boot_type: result.boot_type,
    stack_version: env.stack_version,
    kibana_memory_mb: env.kibana_memory_mb,
    es_heap_mb: env.es_heap_mb,
    total_rules: successfulIterations[0]?.total_rules ?? 0,
    iterations: result.iterations.length,
    median_duration_ms: stats.median,
    p95_duration_ms: stats.p95,
    p99_duration_ms: stats.p99,
    min_duration_ms: stats.min,
    max_duration_ms: stats.max,
    mean_duration_ms: stats.mean,
    std_dev_ms: stats.std_dev,
    peak_rss_mb: result.iterations.length > 0
      ? Math.max(...result.iterations.map((r) => r.rss_after_mb))
      : 0,
    peak_heap_mb: result.iterations.length > 0
      ? Math.max(...result.iterations.map((r) => r.heap_after_mb))
      : 0,
    oom_events: 0,
    errors: result.iterations.filter((r) => r.http_status !== 200).length,
  });
}
