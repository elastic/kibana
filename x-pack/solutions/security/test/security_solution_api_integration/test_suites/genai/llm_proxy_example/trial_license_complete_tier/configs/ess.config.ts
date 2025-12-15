/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

// Action types enabled for this test suite - includes .gen-ai for LLM proxy testing
const enabledActionTypes = [
  '.cases',
  '.email',
  '.index',
  '.pagerduty',
  '.swimlane',
  '.server-log',
  '.servicenow',
  '.slack',
  '.webhook',
  '.gen-ai', // Required for LLM proxy testing
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.rate-limit',
];

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'GenAI LLM Proxy Example - ESS Integration Tests - Trial License',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.startsWith('--xpack.actions.enabledActionTypes')),
        `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
      ],
    },
  };
}
