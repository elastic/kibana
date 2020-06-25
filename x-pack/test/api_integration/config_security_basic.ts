/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-default-export */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { default as createTestConfig } from './config';

export default async function (context: FtrConfigProviderContext) {
  // security APIs should function the same under a basic or trial license
  return createTestConfig(context).then((config) => {
    config.esTestCluster.license = 'basic';
    config.esTestCluster.serverArgs = [
      'xpack.license.self_generated.type=basic',
      'xpack.security.enabled=true',
      'xpack.security.authc.api_key.enabled=true',
    ];
    config.testFiles = [require.resolve('./apis/security/security_basic')];
    return config;
  });
}
