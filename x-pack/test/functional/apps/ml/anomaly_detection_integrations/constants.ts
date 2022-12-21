/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';

// @ts-expect-error not full interface
export const JOB_CONFIG: Job = {
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
export const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_ae',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_ae',
  query: { bool: { must: [{ match_all: {} }] } },
};

export const ML_EMBEDDABLE_TYPES = {
  ANOMALY_SWIMLANE: 'ml_anomaly_swimlane',
  ANOMALY_CHARTS: 'ml_anomaly_charts',
} as const;
