/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createTestConfig } from '../../../../../../config/serverless/config.base';

export const BUNDLED_PACKAGE_DIR = path.join(
  path.dirname(__filename),
  './../fleet_bundled_packages/fixtures'
);
export default createTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Detection Engine Serverless / Large Prebuilt Rules Package Installation API Integration Tests',
  },
  kbnTestServerArgs: [
    /*  Tests in this directory simulate an air-gapped environment in which the instance doesn't have access to EPR.
     *  To do that, we point the Fleet url to an invalid URL, and instruct Fleet to fetch bundled packages at the
     *  location defined in BUNDLED_PACKAGE_DIR.
     *  Since we want to test the installation of a large package, we created a specific package `security_detection_engine-100.0.0`
     *  which contains 15000 rules assets and 750 unique rules, and attempt to install it.
     */
    `--xpack.fleet.registryUrl=http://invalidURL:8080`,
    `--xpack.fleet.developer.bundledPackageLocation=${BUNDLED_PACKAGE_DIR}`,
  ],
  kbnTestServerEnv: {
    /*  Limit the heap memory to the lowest amount with which Kibana doesn't crash with an out of memory error
     *  when installing the large package.
     */
    NODE_OPTIONS: '--max-old-space-size=800',
  },
});
