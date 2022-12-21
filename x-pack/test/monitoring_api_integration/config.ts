/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { FtrConfigProviderContext } from '@kbn/test';

const PACKAGES = [{ name: 'beat', version: '0.0.1' }];

const getPackagesArgs = () => {
  return PACKAGES.flatMap((pkg, i) => {
    return [
      `--xpack.fleet.packages.${i}.name=${pkg.name}`,
      `--xpack.fleet.packages.${i}.version=${pkg.version}`,
    ];
  });
};

const getFullPath = (relativePath: string) => path.join(path.dirname(__filename), relativePath);

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    services: xPackAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack Monitoring API Integration Tests',
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.developer.bundledPackageLocation=${getFullPath('/fixtures/packages')}`,
        ...getPackagesArgs(),
      ],
    },
  };
}
