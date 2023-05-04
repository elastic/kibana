/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANNOTATION_TYPE } from '@kbn/ml-plugin/common/constants/annotations';
import { Annotation } from '@kbn/ml-plugin/common/types/annotations';

export const commonJobConfig = {
  description: 'test_job_annotation',
  groups: ['farequote', 'automated', 'single-metric'],
  analysis_config: {
    bucket_span: '15m',
    influencers: [],
    detectors: [
      {
        function: 'mean',
        field_name: 'responsetime',
      },
      {
        function: 'min',
        field_name: 'responsetime',
      },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '10mb' },
};

export const createJobConfig = (jobId: string) => {
  return { ...commonJobConfig, job_id: jobId };
};

export const testSetupJobConfigs = [1, 2, 3, 4].map((num) => ({
  ...commonJobConfig,
  job_id: `job_annotation_${num}_${Date.now()}`,
  description: `Test annotation ${num}`,
}));
export const jobIds = testSetupJobConfigs.map((j) => j.job_id);

export const createAnnotationRequestBody = (jobId: string): Partial<Annotation> => {
  return {
    timestamp: Date.now(),
    end_timestamp: Date.now(),
    annotation: 'Test annotation',
    job_id: jobId,
    type: ANNOTATION_TYPE.ANNOTATION,
    event: 'user',
    detector_index: 1,
    partition_field_name: 'airline',
    partition_field_value: 'AAL',
  };
};

export const testSetupAnnotations = testSetupJobConfigs.map((job) =>
  createAnnotationRequestBody(job.job_id)
);
