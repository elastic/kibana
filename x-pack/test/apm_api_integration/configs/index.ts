/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues } from 'lodash';
import { createTestConfig } from '../common/config';

const apmFtrConfigs = {
  basic: {
    license: 'basic' as const,
    testFiles: [require.resolve('../basic/tests')],
  },
  trial: {
    license: 'trial' as const,
    testFiles: [], // require.resolve('../trial/tests')],
  },
};

export type APMFtrConfigName = keyof typeof apmFtrConfigs;

export const configs = mapValues(apmFtrConfigs, (value, key) => {
  return createTestConfig({
    name: key as APMFtrConfigName,
    ...value,
  });
});
