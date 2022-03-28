/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { createTestConfig, CreateTestConfig } from '../common/config';

const apmFtrConfigs = {
  basic: {
    license: 'basic' as const,
  },
  trial: {
    license: 'trial' as const,
  },
  rules: {
    license: 'trial' as const,
    kibanaConfig: {
      'xpack.ruleRegistry.write.enabled': 'true',
      'xpack.actions.enabledActionTypes': JSON.stringify(['.index']),
    },
  },
};

export type APMFtrConfigName = keyof typeof apmFtrConfigs;

export const configs: Record<APMFtrConfigName, CreateTestConfig> = mapValues(
  apmFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as APMFtrConfigName,
      ...value,
    });
  }
);
