/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadConfig, type ScenarioName } from './lib/config';
import { Logger } from './lib/logger';
import { ESWriter } from './lib/es_writer';
import { setupIndices } from './index_templates/setup_indices';
import { setupDataViews } from './dashboards/setup_dashboards';
import { runAll } from './orchestrator/runner';

interface CliArgs {
  configPath: string;
  scenarios?: ScenarioName[];
  dryRun: boolean;
  setupOnly: boolean;
  logLevel: 'debug' | 'info';
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    configPath: '',
    dryRun: false,
    setupOnly: false,
    logLevel: 'info',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        result.configPath = args[++i];
        break;
      case '--scenarios':
        result.scenarios = args[++i].split(',') as ScenarioName[];
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--setup-only':
        result.setupOnly = true;
        break;
      case '--verbose':
        result.logLevel = 'debug';
        break;
      default:
        if (!args[i].startsWith('-') && !result.configPath) {
          result.configPath = args[i];
        }
    }
  }

  if (!result.configPath) {
    process.stderr.write(
      'Usage: npx tsx run.ts --config <environments.json> [--scenarios s1,s2] [--dry-run] [--setup-only] [--verbose]\n'
    );
    process.exit(1);
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const logger = new Logger('perf-harness', args.logLevel);

  logger.info('Loading configuration', { config: args.configPath });
  const config = loadConfig(args.configPath);
  logger.info(`Loaded ${config.environments.length} environments`);

  logger.info('Connecting to results cluster');
  const writer = new ESWriter(
    config.results_cluster.es_url,
    config.results_cluster.api_key,
    logger
  );

  const reachable = await writer.ping();
  if (!reachable) {
    logger.error('Cannot reach results cluster. Check es_url and api_key.');
    process.exit(1);
  }
  logger.info('Results cluster connected');

  if (args.setupOnly) {
    logger.info('Setting up index templates');
    await setupIndices(writer.getClient(), logger);

    logger.info('Setting up data views on results Kibana');
    await setupDataViews(config.results_cluster, logger);

    logger.info('Setup complete (--setup-only). Exiting.');
    return;
  }

  await runAll(config, writer, logger, {
    scenarioFilter: args.scenarios,
    dryRun: args.dryRun,
  });
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  if (err instanceof Error && err.stack) {
    process.stderr.write(err.stack + '\n');
  }
  process.exit(1);
});
