/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { setupModuleBodySchema } from '@kbn/ml-plugin/server/routes/schemas/modules';

export interface MlJob {
  jobId: string;
  config: TypeOf<typeof setupModuleBodySchema>;
}

const baseConfig = {
  start: Date.now(),
  indexPatternName: 'filebeat-*',
  startDatafeed: true,
  jobOverrides: [
    {
      job_id: '',
      analysis_config: {
        bucket_span: '900000ms',
      },
      data_description: {
        time_field: '@timestamp',
      },
      custom_settings: {
        logs_source_config: {
          indexPattern: 'filebeat-*',
          timestampField: '@timestamp',
          bucketSpan: 900000,
        },
      },
    },
  ],
  datafeedOverrides: [
    {
      job_id: '',
      runtime_mappings: {},
    },
  ],
  useDedicatedIndex: true,
};

const rateJobConfig = Object.assign({}, baseConfig);
rateJobConfig.jobOverrides[0].job_id = 'log-entry-rate';
rateJobConfig.datafeedOverrides[0].job_id = 'log-entry-rate';

const categoriesCountConfig = Object.assign({}, baseConfig);
categoriesCountConfig.jobOverrides[0].job_id = 'log-entry-categories-count';
categoriesCountConfig.datafeedOverrides[0].job_id = 'log-entry-categories-count';

export const legacyRateJob: MlJob = {
  jobId: 'kibana-logs-ui-default-default-log-entry-rate',
  config: {
    ...rateJobConfig,
    prefix: 'kibana-logs-ui-default-default-',
  },
};

export const hashedRateJob: MlJob = {
  jobId: 'logs-11558ee526445db2b42eb3d6b4af58d0-log-entry-rate',
  config: {
    ...rateJobConfig,
    prefix: 'logs-11558ee526445db2b42eb3d6b4af58d0-',
  },
};

export const legacyCategoriesCountJob: MlJob = {
  jobId: 'kibana-logs-ui-default-default-log-entry-categories-count',
  config: {
    ...categoriesCountConfig,
    prefix: 'kibana-logs-ui-default-default-',
  },
};

export const hashedCategoriesCountJob: MlJob = {
  jobId: 'logs-11558ee526445db2b42eb3d6b4af58d0-categories-count',
  config: {
    ...categoriesCountConfig,
    prefix: 'logs-11558ee526445db2b42eb3d6b4af58d0-',
  },
};
