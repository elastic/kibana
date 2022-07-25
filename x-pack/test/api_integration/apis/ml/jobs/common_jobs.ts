/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';

// @ts-expect-error not full interface
export const SINGLE_METRIC_JOB_CONFIG: Job = {
  job_id: `jobs_summary_fq_single_${Date.now()}`,
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
export const MULTI_METRIC_JOB_CONFIG: Job = {
  job_id: `jobs_summary_fq_multi_${Date.now()}`,
  description: 'mean(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [{ function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' }],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
export const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'REPLACE',
  indices: ['ft_farequote'],
  job_id: 'REPLACE',
  query: { bool: { must: [{ match_all: {} }] } },
};
