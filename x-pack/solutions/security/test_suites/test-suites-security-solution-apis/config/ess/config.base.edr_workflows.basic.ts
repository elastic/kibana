/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const edrWorkflowsTrialConfig = await readConfigFile(
    require.resolve('./config.base.edr_workflows.trial')
  );

  return {
    ...edrWorkflowsTrialConfig.getAll(),
    esTestCluster: {
      ...edrWorkflowsTrialConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        ...edrWorkflowsTrialConfig
          .get('esTestCluster.serverArgs')
          .filter((arg: string) => !arg.includes('xpack.license.self_generated.type')),

        'xpack.license.self_generated.type=basic',
      ],
    },
  };
}
