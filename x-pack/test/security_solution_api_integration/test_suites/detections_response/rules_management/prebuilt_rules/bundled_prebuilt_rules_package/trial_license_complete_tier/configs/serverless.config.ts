/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createTestConfig } from '../../../../../../../config/serverless/config.base';

export const BUNDLED_PACKAGE_DIR = path.join(
  path.dirname(__filename),
  './../fleet_bundled_packages/fixtures'
);
export default createTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Rules Management - Bundled Prebuilt Rules Integration Tests - Serverless Env - Complete License',
  },
  kbnTestServerArgs: [
    /*  Tests in this directory simulate an air-gapped environment in which the instance doesn't have access to EPR.
     *  To do that, we point the Fleet url to an invalid URL, and instruct Fleet to fetch bundled packages at the
     *  location defined in BUNDLED_PACKAGE_DIR.
     */
    `--xpack.fleet.registryUrl=http://invalidURL:8080`,
    `--xpack.fleet.developer.bundledPackageLocation=${BUNDLED_PACKAGE_DIR}`,
  ],
});
