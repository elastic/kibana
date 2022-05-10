/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from '@kbn/ml-plugin/common/types/common';

import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { DataFrameAnalyticsConfig } from '@kbn/ml-plugin/public/application/data_frame_analytics/common';
import { FtrProviderContext } from '../../ftr_provider_context';

// @ts-expect-error not full interface
const FQ_SM_JOB_CONFIG: Job = {
  job_id: ``,
  description: 'mean(responsetime) on farequote dataset with 15m bucket span',
  groups: ['farequote', 'automated', 'single-metric'],
  analysis_config: {
    bucket_span: '15m',
    influencers: [],
    detectors: [
      {
        function: 'mean',
        field_name: 'responsetime',
      },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '10mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const FQ_MM_JOB_CONFIG: Job = {
  job_id: `fq_multi_1_ae`,
  description:
    'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [
      { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const FQ_DATAFEED_CONFIG: Datafeed = {
  datafeed_id: '',
  indices: ['ft_farequote'],
  job_id: '',
  query: { bool: { must: [{ match_all: {} }] } },
};

const BM_CLASSIFICATION_CONFIG: DeepPartial<DataFrameAnalyticsConfig> = {
  id: '',
  description: 'Classification job based on the bank marketing dataset',
  source: {
    index: ['ft_bank_marketing'],
    query: {
      match_all: {},
    },
  },
  analysis: {
    classification: {
      dependent_variable: 'y',
      training_percent: 80,
    },
  },
  analyzed_fields: {
    includes: [],
    excludes: [],
  },
  model_memory_limit: '80mb',
  allow_lazy_start: false,
  max_num_threads: 1,
};

const IHP_OUTLIER_DETECTION_CONFIG: DeepPartial<DataFrameAnalyticsConfig> = {
  id: '',
  description: 'Outlier detection job based on the Iowa house prices dataset',
  source: {
    index: ['ft_ihp_outlier'],
    query: {
      match_all: {},
    },
  },
  dest: {
    index: '',
    results_field: 'ml',
  },
  analysis: {
    outlier_detection: {},
  },
  analyzed_fields: {
    includes: [],
    excludes: [],
  },
  model_memory_limit: '5mb',
};

export function MachineLearningCommonConfigsProvider({}: FtrProviderContext) {
  return {
    getADFqSingleMetricJobConfig(jobId: string): Job {
      const jobConfig = { ...FQ_SM_JOB_CONFIG, job_id: jobId };
      return jobConfig;
    },

    getADFqMultiMetricJobConfig(jobId: string): Job {
      const jobConfig = { ...FQ_MM_JOB_CONFIG, job_id: jobId };
      return jobConfig;
    },

    getADFqDatafeedConfig(jobId: string): Datafeed {
      const datafeedConfig = {
        ...FQ_DATAFEED_CONFIG,
        datafeed_id: `datafeed-${jobId}`,
        job_id: jobId,
      };
      return datafeedConfig;
    },

    getDFAIhpOutlierDetectionJobConfig(dfaId: string): DataFrameAnalyticsConfig {
      const dfaConfig = {
        ...IHP_OUTLIER_DETECTION_CONFIG,
        id: dfaId,
        dest: { ...IHP_OUTLIER_DETECTION_CONFIG.dest, index: `user-${dfaId}` },
      };
      return dfaConfig as DataFrameAnalyticsConfig;
    },

    getDFABmClassificationJobConfig(dfaId: string): DataFrameAnalyticsConfig {
      const dfaConfig = {
        ...BM_CLASSIFICATION_CONFIG,
        id: dfaId,
        dest: { ...BM_CLASSIFICATION_CONFIG.dest, index: `user-${dfaId}` },
      };
      return dfaConfig as DataFrameAnalyticsConfig;
    },
  };
}
