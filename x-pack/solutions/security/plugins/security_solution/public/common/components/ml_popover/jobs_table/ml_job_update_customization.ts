/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype: job IDs treated as customized (conflict path on Update).
 * Only `auth_rare_hour_for_a_user_ea` is considered customized for local testing.
 */
export const CUSTOMIZED_ML_JOB_IDS_FOR_PROTOTYPE = new Set(['auth_rare_hour_for_a_user_ea']);

export const hasMlJobCustomization = (jobId: string): boolean =>
  CUSTOMIZED_ML_JOB_IDS_FOR_PROTOTYPE.has(jobId);

/** Mock customizations shown under "Customizations that will be overwritten". */
export const MOCK_CUSTOMIZATION_FIELDS = [
  'Custom model memory limit (512mb)',
  'Modified datafeed query filter',
  'Custom results retention days',
];
