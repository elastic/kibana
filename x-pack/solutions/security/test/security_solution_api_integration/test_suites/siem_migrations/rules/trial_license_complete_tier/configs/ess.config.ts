/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { PRECONFIGURED_BEDROCK_ACTION } from '../../../../../config/shared';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  const defaultConfig = functionalConfig.getAll();
  return {
    ...defaultConfig,
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'SIEM Migrations Integration Tests - ESS Env - Trial License',
    },
    kbnTestServer: {
      ...defaultConfig.kbnTestServer,
      serverArgs: [
        ...defaultConfig.kbnTestServer.serverArgs,
        `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_BEDROCK_ACTION)}`,
      ],
    },
  };
}
