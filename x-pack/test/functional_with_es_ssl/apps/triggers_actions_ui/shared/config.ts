/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, findTestPluginPaths } from '@kbn/test';
import { resolve } from 'path';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { REPO_ROOT as KIBANA_ROOT } from '@kbn/repo-info';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    junit: {
      reportName:
        'Chrome X-Pack UI Functional Tests with ES SSL - Shared Triggers Actions UI Components',
    },
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--env.name=development',
        ...findTestPluginPaths([
          resolve(KIBANA_ROOT, 'examples'),
          resolve(KIBANA_ROOT, 'x-pack/examples'),
        ]),
      ],
    },
  };
}
