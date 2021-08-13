/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { createTestConfig } from '../common/config';

const apmFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig: {
      // disable v2 migrations to prevent issue where kibana index is deleted
      // during a migration
      'migrations.enableV2': 'false',
    },
  },
  trial: {
    license: 'trial' as const,
    kibanaConfig: {
      'migrations.enableV2': 'false',
    },
  },
  rules: {
    license: 'trial' as const,
    kibanaConfig: {
      'migrations.enableV2': 'false',
      'xpack.ruleRegistry.write.enabled': 'true',
    },
  },
};

export type APMFtrConfigName = keyof typeof apmFtrConfigs;

export const configs = mapValues(apmFtrConfigs, (value, key) => {
  return createTestConfig({
    name: key as APMFtrConfigName,
    ...value,
  });
});
