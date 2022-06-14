/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { FtrProviderContext } from './ftr_provider_context';

import { SecuritySolutionCypressCliTestRunnerCI } from './runner';

const isChunkingDisabled = process.env.DISABLE_TEST_CASES_SPLITTING === 'true';
const cliNumber = parseInt(process.env.CLI_NUMBER ?? '1', 10);
const cliCount = parseInt(process.env.CLI_COUNT ?? '1', 10);

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const securitySolutionCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...securitySolutionCypressConfig.getAll(),

    testRunner: (context: FtrProviderContext) =>
      // if isChunkingDisabled is true, we will run all existing tests instead splitting them between parallel jobs
      isChunkingDisabled
        ? SecuritySolutionCypressCliTestRunnerCI(context)
        : SecuritySolutionCypressCliTestRunnerCI(context, cliCount, cliNumber),
  };
}
