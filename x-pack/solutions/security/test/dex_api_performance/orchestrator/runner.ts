/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PerfConfig, type ScenarioName, type EnvironmentConfig } from '../lib/config';
import { type ESWriter } from '../lib/es_writer';
import { type Logger } from '../lib/logger';
import { runColdBoot } from './cold_boot_runner';
import { runWarmScenarios } from './warm_scenario_runner';

export async function runAll(
  config: PerfConfig,
  writer: ESWriter,
  logger: Logger,
  options: { scenarioFilter?: ScenarioName[]; dryRun?: boolean }
): Promise<void> {
  const runId = `run-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}-${randomId()}`;
  logger.info(`Starting performance run: ${runId}`);

  const coldEnvs = config.environments.filter((e) => e.role === 'cold_boot');
  const warmEnvs = config.environments.filter((e) => e.role === 'warm_boot');

  logger.info(
    `Environments: ${coldEnvs.length} cold boot, ${warmEnvs.length} warm boot ` +
      `(max parallel: ${config.max_parallel_environments})`
  );

  if (options.dryRun) {
    await validateConnectivity(config.environments, logger);
    logger.info('Dry run complete. All environments reachable.');
    return;
  }

  if (coldEnvs.length > 0) {
    logger.info('--- Phase 1: Cold Boot Environments ---');
    await runWithConcurrency(
      coldEnvs,
      config.max_parallel_environments,
      (env) => runColdBoot(env, runId, config, writer, logger),
      logger
    );
  }

  if (warmEnvs.length > 0) {
    logger.info('--- Phase 2: Warm Boot Scenarios ---');
    await runWithConcurrency(
      warmEnvs,
      config.max_parallel_environments,
      (env) => runWarmScenarios(env, runId, config, writer, logger, options.scenarioFilter),
      logger
    );
  }

  logger.info(`Performance run ${runId} complete.`);
}

async function validateConnectivity(
  environments: EnvironmentConfig[],
  logger: Logger
): Promise<void> {
  for (const env of environments) {
    logger.info(`Checking connectivity to ${env.id} (${env.kibana_url})`);
    try {
      const resp = await fetch(`${env.kibana_url.replace(/\/$/, '')}/api/status`, {
        method: 'GET',
        headers: { 'kbn-xsrf': 'true' },
      });
      logger.info(`  ${env.id}: HTTP ${resp.status}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`  ${env.id}: UNREACHABLE - ${message}`);
    }
  }
}

async function runWithConcurrency<T>(
  items: T[],
  maxConcurrency: number,
  fn: (item: T) => Promise<void>,
  logger: Logger
): Promise<void> {
  const queue = [...items];
  const active: Promise<void>[] = [];

  while (queue.length > 0 || active.length > 0) {
    while (active.length < maxConcurrency && queue.length > 0) {
      const item = queue.shift()!;
      const promise = fn(item)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`Environment task failed: ${message}`);
        })
        .then(() => {
          active.splice(active.indexOf(promise), 1);
        });
      active.push(promise);
    }
    if (active.length > 0) {
      await Promise.race(active);
    }
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
