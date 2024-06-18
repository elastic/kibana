/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));

  const serverArgs: string[] = [...baseFleetApiConfig.get('kbnTestServer.serverArgs')];

  const enableExperimentalIndex = serverArgs.findIndex((val) =>
    val.includes('xpack.fleet.enableExperimental')
  );
  serverArgs[enableExperimentalIndex] = `--xpack.fleet.enableExperimental=${JSON.stringify([
    'outputSecretsStorage',
    'agentTamperProtectionEnabled',
    'enableStrictKQLValidation',
    'subfeaturePrivileges',
    'enablePackagesStateMachine',
    'useSpaceAwareness',
  ])}`;

  return {
    ...baseFleetApiConfig.getAll(),
    kbnTestServer: {
      ...baseFleetApiConfig.get('kbnTestServer'),
      serverArgs,
    },
    testFiles: [require.resolve('./apis/space_awareness')],
    junit: {
      reportName: 'X-Pack Fleet Agent Policy API Integration Tests',
    },
  };
}
