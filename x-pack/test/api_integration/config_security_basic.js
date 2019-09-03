/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { default as createTestConfig } from './config';

export default async function ({ readConfigFile }) {
  //security APIs should function the same under a basic or trial license
  return createTestConfig({ readConfigFile }).then(config => {
    config.esTestCluster.license = 'basic';
    config.esTestCluster.serverArgs = ['xpack.license.self_generated.type=basic', 'xpack.security.enabled=true'];
    config.testFiles = [require.resolve('./apis/security')];
    return config;
  });
}
