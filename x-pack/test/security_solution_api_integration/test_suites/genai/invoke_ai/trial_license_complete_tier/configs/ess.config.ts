/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import getPort from 'get-port';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  const proxyPort = await getPort({ port: getPort.makeRange(6200, 6299) });

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // used for connector simulators
        `--xpack.actions.proxyUrl=http://localhost:${proxyPort}`,
        `--xpack.actions.enabledActionTypes=${JSON.stringify(['.bedrock', '.gen-ai', '.gemini'])}`,
      ],
    },
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'GenAI - Invoke AI Tests - ESS Env - Trial License',
    },
  };
}
