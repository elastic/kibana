/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { createTestConfig, CreateTestConfig } from '../common/config';

export const datasetQualityDebugLogger = {
  name: 'plugins.datasetQuality',
  level: 'debug',
  appenders: ['console'],
};

const datasetQualityFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig: {
      'logging.loggers': [datasetQualityDebugLogger],
    },
  },
};

export type DatasetQualityFtrConfigName = keyof typeof datasetQualityFtrConfigs;

export const configs: Record<DatasetQualityFtrConfigName, CreateTestConfig> = mapValues(
  datasetQualityFtrConfigs,
  (value, key) => {
    return createTestConfig({
      name: key as DatasetQualityFtrConfigName,
      ...value,
    });
  }
);
