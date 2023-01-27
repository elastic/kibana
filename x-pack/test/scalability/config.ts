/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import fs from 'fs';
import path from 'path';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { REPO_ROOT } from '@kbn/repo-info';
import { createFlagError } from '@kbn/dev-cli-errors';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { v4 as uuidV4 } from 'uuid';
import { ScalabilityTestRunner } from './runner';
import { FtrProviderContext } from './ftr_provider_context';
import { ScalabilityJourney } from './types';

// These "secret" values are intentionally written in the source.
const APM_SERVER_URL = 'https://142fea2d3047486e925eb8b223559cae.apm.europe-west1.gcp.cloud.es.io';
const APM_PUBLIC_TOKEN = 'pWFFEym07AKBBhUE2i';

const AGGS_SHARD_DELAY = process.env.LOAD_TESTING_SHARD_DELAY;
const DISABLE_PLUGINS = process.env.LOAD_TESTING_DISABLE_PLUGINS;
const scalabilityJsonPath = process.env.SCALABILITY_JOURNEY_PATH;
const gatlingProjectRootPath: string =
  process.env.GATLING_PROJECT_PATH || path.resolve(REPO_ROOT, '../kibana-load-testing');

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
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

  const journey: ScalabilityJourney = JSON.parse(fs.readFileSync(scalabilityJsonPath, 'utf8'));

  const baseConfig = (
    await readConfigFile(require.resolve('../../performance/journeys/login.ts'))
  ).getAll();

  return {
    ...baseConfig,

    services: commonFunctionalServices,
    pageObjects: {},

    testRunner: (context: FtrProviderContext) =>
      ScalabilityTestRunner(context, scalabilityJsonPath, gatlingProjectRootPath),

    esTestCluster: {
      ...baseConfig.esTestCluster,
      esJavaOpts: '-Xms8g -Xmx8g',
    },

    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      sourceArgs: [
        ...baseConfig.kbnTestServer.sourceArgs,
        '--no-base-path',
        '--env.name=development',
        ...(!!AGGS_SHARD_DELAY ? ['--data.search.aggs.shardDelay.enabled=true'] : []),
        ...(!!DISABLE_PLUGINS ? ['--plugins.initialize=false'] : []),
      ],
      env: {
        ELASTIC_APM_ACTIVE: true,
        ELASTIC_APM_CENTRAL_CONFIG: false,
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '0.1',
        ELASTIC_APM_BREAKDOWN_METRICS: false,
        ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES: false,
        ELASTIC_APM_METRICS_INTERVAL: '120s',
        ELASTIC_APM_MAX_QUEUE_SIZE: 20480,
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_GLOBAL_LABELS: Object.entries({
          testBuildId: process.env.BUILDKITE_BUILD_ID ?? `local-${uuidV4()}`,
          testJobId: process.env.BUILDKITE_JOB_ID ?? `local-${uuidV4()}`,
          journeyName: journey.journeyName,
          ftrConfig: path.basename(scalabilityJsonPath),
          branch: process.env.BUILDKITE_BRANCH,
          gitRev: process.env.BUILDKITE_COMMIT,
          ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
        })
          .flatMap(([key, value]) => (value == null ? [] : `${key}=${value}`))
          .join(','),
      },
    },
  };
}
