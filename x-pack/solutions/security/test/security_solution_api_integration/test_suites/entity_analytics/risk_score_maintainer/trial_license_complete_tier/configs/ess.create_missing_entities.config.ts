/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import type { ExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import { PRECONFIGURED_BEDROCK_ACTION } from '../../../../../config/shared';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  // Repeats the base config's flags: `enableExperimental` is a single CLI arg, not merged
  // across occurrences, so this config's array must be complete on its own.
  const securitySolutionEnableExperimental: Array<keyof ExperimentalFeatures> = [
    'entityAnalyticsEntityStoreV2',
    'entityAnalyticsWatchlistEnabled',
    'riskScoreCreateMissingEntitiesEnabled',
  ];

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.includes('xpack.securitySolution.enableExperimental')),
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(
          securitySolutionEnableExperimental
        )}`,
        `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_BEDROCK_ACTION)}`,
      ],
    },
    testFiles: [require.resolve('../create_missing_entities')],
    junit: {
      reportName:
        'Entity Analytics - Risk Score Maintainer - Create Missing Entities Integration Tests - ESS Env - Trial License',
    },
  };
}
