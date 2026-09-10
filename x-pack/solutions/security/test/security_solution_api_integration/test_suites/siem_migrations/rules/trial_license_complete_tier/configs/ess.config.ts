/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { PRECONFIGURED_BEDROCK_ACTION } from '../../../../../config/shared';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  const defaultConfig = functionalConfig.getAll();

  /**
   * The base ESS config's `enabledActionTypes` does not include `.bedrock`,
   * and its `allowedHosts` does not include the mock host used by the
   * runtime-created connector in delete.ts. Both are replaced (not
   * appended) here rather than pushed as a second `--flag`, since Kibana's
   * CLI arg parser is not guaranteed to merge repeated array flags.
   */
  const baseServerArgs = defaultConfig.kbnTestServer.serverArgs.filter(
    (arg: string) =>
      !arg.startsWith('--xpack.actions.enabledActionTypes=') &&
      !arg.startsWith('--xpack.actions.allowedHosts=')
  );

  return {
    ...defaultConfig,
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'SIEM Migrations Integration Tests - ESS Env - Trial License',
    },
    kbnTestServer: {
      ...defaultConfig.kbnTestServer,
      serverArgs: [
        ...baseServerArgs,
        `--xpack.actions.enabledActionTypes=${JSON.stringify([
          '.cases',
          '.email',
          '.index',
          '.pagerduty',
          '.swimlane',
          '.server-log',
          '.servicenow',
          '.slack',
          '.webhook',
          '.bedrock',
          'test.authorization',
          'test.failing',
          'test.index-record',
          'test.noop',
          'test.rate-limit',
        ])}`,
        `--xpack.actions.allowedHosts=${JSON.stringify([
          'localhost',
          'some.non.existent.com',
          'mock-bedrock.invalid.example.com',
        ])}`,
        `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_BEDROCK_ACTION)}`,
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([])}`,
      ],
    },
  };
}
