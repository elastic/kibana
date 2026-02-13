/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-common';
import { services } from '../services';
import { pageObjects } from '../page_objects';

export default createTestConfig({
  serverlessProject: 'security',
  pageObjects,
  services,
  junit: {
    reportName: 'Serverless Security Cloud Security Functional Tests',
  },
  kbnServerArgs: [
    `--xpack.fleet.packages.0.name=cloud_security_posture`,
    `--xpack.fleet.packages.0.version=${CLOUD_SECURITY_PLUGIN_VERSION}`,
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'essentials' },
      { product_line: 'endpoint', product_tier: 'essentials' },
      { product_line: 'cloud', product_tier: 'essentials' },
    ])}`,
  ],
  // we should only resolve files which are ending with `.essentials.ts`
  testFiles: [
    require.resolve(
      '../test_suites/ftr/cloud_security_posture/csp_integrations_form.essentials.ts'
    ),
  ],
  enableFleetDockerRegistry: false,
});
