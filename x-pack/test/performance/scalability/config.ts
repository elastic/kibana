/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { createFlagError } from '@kbn/dev-cli-errors';
import { serializeApmGlobalLabels } from '../utils';
import { ScalabilityTestRunner } from './runner';
import { FtrProviderContext } from '../ftr_provider_context';

// These "secret" values are intentionally written in the source.
const APM_SERVER_URL = 'https://142fea2d3047486e925eb8b223559cae.apm.europe-west1.gcp.cloud.es.io';
const APM_PUBLIC_TOKEN = 'pWFFEym07AKBBhUE2i';
const AGGS_SHARD_DELAY = process.env.LOAD_TESTING_SHARD_DELAY;
const DISABLE_PLUGINS = process.env.LOAD_TESTING_DISABLE_PLUGINS;
const scalabilityJsonPath = process.env.SCALABILITY_JOURNEY_PATH;
const gatlingProjectRootPath: string =
  process.env.GATLING_PROJECT_PATH || path.resolve(REPO_ROOT, '../kibana-load-testing');

const readScalabilityJourney = (filePath: string): ScalabilityJourney => {
  if (path.extname(filePath) !== '.json') {
    throw createFlagError(`Path to scalability journey json is non-json file: '${filePath}'`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createFlagError(`Path to scalability journey json is invalid: ${filePath}`);
    }
    throw createFlagError(`Invalid JSON provided: '${filePath}', ${error}`);
  }
};

interface ScalabilityJourney {
  journeyName: string;
}

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../journeys/base.config.ts'));

  if (!fs.existsSync(gatlingProjectRootPath)) {
    throw createFlagError(
      `Incorrect path to load testing project: '${gatlingProjectRootPath}'\n
    Clone 'elastic/kibana-load-testing' and set path using 'GATLING_PROJECT_PATH' env var`
    );
  }

  if (!scalabilityJsonPath) {
    throw createFlagError(
      `Set path to scalability journey json using 'SCALABILITY_JOURNEY_PATH' env var`
    );
  }
  const scalabilityJourney = readScalabilityJourney(scalabilityJsonPath);

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env.ELASTIC_APM_GLOBAL_LABELS,
    journeyFilePath: path.basename(scalabilityJsonPath),
    journeyName: scalabilityJourney.journeyName,
  };

  return {
    ...performanceConfig.getAll(),

    testRunner: (context: FtrProviderContext) =>
      ScalabilityTestRunner(context, scalabilityJsonPath, gatlingProjectRootPath),

    esTestCluster: {
      ...performanceConfig.get('esTestCluster'),
      serverArgs: [...performanceConfig.get('esTestCluster.serverArgs')],
      esJavaOpts: '-Xms8g -Xmx8g',
    },

    kbnTestServer: {
      ...performanceConfig.get('kbnTestServer'),
      sourceArgs: [
        ...performanceConfig.get('kbnTestServer.sourceArgs'),
        '--no-base-path',
        '--env.name=development',
        ...(!!AGGS_SHARD_DELAY ? ['--data.search.aggs.shardDelay.enabled=true'] : []),
        ...(!!DISABLE_PLUGINS ? ['--plugins.initialize=false'] : []),
      ],
      serverArgs: [
        ...performanceConfig.get('kbnTestServer.serverArgs'),
        `--telemetry.labels.journeyName=${scalabilityJourney.journeyName}`,
      ],
      env: {
        ELASTIC_APM_ACTIVE: process.env.ELASTIC_APM_ACTIVE,
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_BREAKDOWN_METRICS: false,
        ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES: false,
        ELASTIC_APM_METRICS_INTERVAL: '80s',
        ELASTIC_APM_MAX_QUEUE_SIZE: 20480,
        ELASTIC_APM_GLOBAL_LABELS: serializeApmGlobalLabels(apmGlobalLabels),
      },
      // delay shutdown to ensure that APM can report the data it collects during test execution
      delayShutdown: 90_000,
    },
  };
}
