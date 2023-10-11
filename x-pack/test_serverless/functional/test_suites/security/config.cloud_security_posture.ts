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
  ],
  // load tests in the index file
  testFiles: [require.resolve('./ftr/cloud_security_posture')],
});
