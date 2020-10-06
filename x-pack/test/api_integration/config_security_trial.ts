/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-default-export */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { default as createTestConfig } from './config';

export default async function (context: FtrConfigProviderContext) {
  return createTestConfig(context).then((config) => {
    config.testFiles = [require.resolve('./apis/security/security_trial')];
    config.junit.reportName = 'X-Pack API Integration Tests (Security Trial)';
    return config;
  });
}
