/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  junit: {
    reportName: 'Serverless Security Cloud Security Functional Tests',
  },
  kbnServerArgs: [
    `--xpack.fleet.packages.0.name=cloud_security_posture`,
    `--xpack.fleet.packages.0.version=1.5.2`,
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'essentials' },
      { product_line: 'endpoint', product_tier: 'essentials' },
      { product_line: 'cloud', product_tier: 'essentials' },
    ])}`,
  ],
  // we should only resolve files which are ending with `.essentials.ts`
  testFiles: [require.resolve('./ftr/cloud_security_posture/csp_integrations_form.essentials.ts')],
});
