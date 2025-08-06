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
  module: 'logs_ui_analysis' | 'logs_ui_categories';
  config: TypeOf<typeof setupModuleBodySchema>;
}

const rateConfig = {
  prefix: '',
  start: Date.now(),
  indexPatternName: 'filebeat-*',
  startDatafeed: true,
  useDedicatedIndex: true,
  jobOverrides: [
    {
      job_id: 'log-entry-rate',
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
      job_id: 'log-entry-rate',
      runtime_mappings: {},
    },
  ],
};

const categoriesCountConfig = {
  prefix: '',
  start: Date.now(),
  indexPatternName: 'filebeat-*',
  startDatafeed: true,
  useDedicatedIndex: true,
  jobOverrides: [
    {
      job_id: 'log-entry-categories-count',
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
          datasetFilter: {
            type: 'includeAll',
          },
        },
      },
    },
  ],
  datafeedOverrides: [
    {
      job_id: 'log-entry-categories-count',
      runtime_mappings: {},
    },
  ],
  query: {
    bool: {
      filter: [
        {
          exists: {
            field: 'message',
          },
        },
      ],
    },
  },
};

export const hashedRateJob: MlJob = {
  jobId: 'logs-11558ee526445db2b42eb3d6b4af58d0-log-entry-rate',
  module: 'logs_ui_analysis',
  config: {
    ...rateConfig,
    prefix: 'logs-11558ee526445db2b42eb3d6b4af58d0-',
  },
};

export const hashedCategoriesCountJob: MlJob = {
  jobId: 'logs-11558ee526445db2b42eb3d6b4af58d0-log-entry-categories-count',
  module: 'logs_ui_categories',
  config: {
    ...categoriesCountConfig,
    prefix: 'logs-11558ee526445db2b42eb3d6b4af58d0-',
  },
};

export const legacyRateJob: MlJob = {
  jobId: 'kibana-logs-ui-default-default-log-entry-rate',
  module: 'logs_ui_analysis',
  config: {
    ...rateConfig,
    prefix: 'kibana-logs-ui-default-default-',
  },
};

export const legacyCategoriesCountJob: MlJob = {
  jobId: 'kibana-logs-ui-default-default-log-entry-categories-count',
  module: 'logs_ui_categories',
  config: {
    ...categoriesCountConfig,
    prefix: 'kibana-logs-ui-default-default-',
  },
};
