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
    require.resolve('../../../../../config/ess/config.base.frozen.trial')
  );

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_BEDROCK_ACTION)}`,
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'entityDetailsHighlightsEnabled',
        ])}`,
        `--xpack.fleet.internal.disableILMPolicies=true`,
      ],
    },

    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'Entity analytics - Entity Details Integration Tests - ESS Env - Trial License',
    },
    mochaOpts: {
      ...functionalConfig.get('mochaOpts'),
      timeout: 360000 * 2,
    },
  };
}
