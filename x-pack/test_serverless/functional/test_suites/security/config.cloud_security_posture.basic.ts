/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  junit: {
    reportName: 'Serverless Security Cloud Security Functional Tests',
  },
  kbnServerArgs: [
    `--xpack.fleet.packages.0.name=cloud_security_posture`,
    `--xpack.fleet.packages.0.version=${CLOUD_SECURITY_PLUGIN_VERSION}`,
    // configs the environment to run on the basic product tier, which may include PLI block components or messages
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([])}`,
  ],
  // load tests in the index file
  testFiles: [require.resolve('./ftr/cloud_security_posture')],
});
