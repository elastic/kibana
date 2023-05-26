/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';

export const BUNDLED_PACKAGE_DIR = path.join(
  path.dirname(__filename),
  './fleet_bundled_packages/fixtures'
);

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../config.base.ts'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [
      require.resolve('./prerelease_packages.ts'),
      require.resolve('./install_latest_bundled_prebuilt_rules.ts'),
    ],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.registryUrl=http://invalidURL:8080`,
        `--xpack.fleet.developer.bundledPackageLocation=${BUNDLED_PACKAGE_DIR}`,
      ],
    },
  };
}
