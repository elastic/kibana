/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EnvironmentConfig, type PerfConfig, parseCredentials } from '../lib/config';
import { KibanaClient } from '../lib/kibana_client';
import { MemorySampler } from '../lib/memory_sampler';
import { type ESWriter } from '../lib/es_writer';
import { type Logger } from '../lib/logger';
import { computeStats } from '../lib/statistics';
import { coldBootScenario } from '../scenarios/cold_boot';

export async function runColdBoot(
  env: EnvironmentConfig,
  runId: string,
  config: PerfConfig,
  writer: ESWriter,
  logger: Logger
): Promise<void> {
  const envLogger = logger.child(env.id);
  envLogger.info(`Starting cold boot on ${env.kibana_url}`);

  const credentials = parseCredentials(env.credentials);
  const client = new KibanaClient(env.kibana_url, credentials, envLogger);

  envLogger.info('Waiting for Kibana to be healthy');
  await client.waitForHealthy();

  const sampler = new MemorySampler(
    client,
    config.defaults.memory_sample_interval_ms,
    envLogger
  );

  const result = await coldBootScenario.run({
    client,
    sampler,
    writer,
    runId,
    envConfig: env,
    iterations: 1,
    logger: envLogger,
  });

  const durations = result.iterations.map((r) => r.duration_ms);
  const stats = computeStats(durations);

  await writer.indexRunSummary({
    run_id: runId,
    environment_id: env.id,
    environment_role: env.role,
    scenario: 'cold_boot',
    boot_type: 'cold',
    stack_version: env.stack_version,
    kibana_memory_mb: env.kibana_memory_mb,
    es_heap_mb: env.es_heap_mb,
    total_rules: result.iterations[0]?.total_rules ?? 0,
    iterations: 1,
    median_duration_ms: stats.median,
    p95_duration_ms: stats.p95,
    p99_duration_ms: stats.p99,
    min_duration_ms: stats.min,
    max_duration_ms: stats.max,
    mean_duration_ms: stats.mean,
    std_dev_ms: stats.std_dev,
    peak_rss_mb: Math.max(...result.iterations.map((r) => r.rss_after_mb)),
    peak_heap_mb: Math.max(...result.iterations.map((r) => r.heap_after_mb)),
    oom_events: 0,
    errors: result.iterations.filter((r) => r.http_status !== 200).length,
  });

  envLogger.info(`Cold boot complete on ${env.id}`);
}
