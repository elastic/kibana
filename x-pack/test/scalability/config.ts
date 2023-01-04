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
import { ScalabilityTestRunner } from './runner';
import { FtrProviderContext } from './ftr_provider_context';

// These "secret" values are intentionally written in the source.
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
    },
  };
}
