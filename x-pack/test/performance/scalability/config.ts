/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import fs from 'fs';
import path from 'path';
import { serializeApmGlobalLabels } from '../utils';
import { ScalabilityTestRunner } from './runner';

// These "secret" values are intentionally written in the source.
const APM_SERVER_URL = 'https://142fea2d3047486e925eb8b223559cae.apm.europe-west1.gcp.cloud.es.io';
const APM_PUBLIC_TOKEN = 'pWFFEym07AKBBhUE2i';
const AGGS_SHARD_DELAY = process.env.LOAD_TESTING_SHARD_DELAY;
const DISABLE_PLUGINS = process.env.LOAD_TESTING_DISABLE_PLUGINS;

export default async function ({ readConfigFile, log }: FtrConfigProviderContext) {
  const performanceConfig = await readConfigFile(require.resolve('../journeys/base.config.ts'));

  const scalabilityJsonPath = process.env.SCALABILITY_JOURNEY_PATH;
  const isJsonPathDefined =
    scalabilityJsonPath &&
    fs.existsSync(scalabilityJsonPath) &&
    path.extname(scalabilityJsonPath) === '.json';

  const apmGlobalLabels = {
    ...performanceConfig.get('kbnTestServer').env.ELASTIC_APM_GLOBAL_LABELS,
    journeyFilePath: isJsonPathDefined ? path.basename(scalabilityJsonPath) : 'unknown',
    journeyName: isJsonPathDefined
      ? JSON.parse(fs.readFileSync(scalabilityJsonPath, 'utf8')).journeyName
      : 'unknown',
  };

  return {
    ...performanceConfig.getAll(),

    testRunner: ScalabilityTestRunner,

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
      env: {
        ELASTIC_APM_ACTIVE: process.env.ELASTIC_APM_ACTIVE,
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_BREAKDOWN_METRICS: false,
        ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES: false,
        ELASTIC_APM_METRICS_INTERVAL: '120s',
        ELASTIC_APM_MAX_QUEUE_SIZE: 20480,
        ELASTIC_APM_GLOBAL_LABELS: serializeApmGlobalLabels(apmGlobalLabels),
      },
      // delay shutdown by 150 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 150_000,
    },
  };
}
