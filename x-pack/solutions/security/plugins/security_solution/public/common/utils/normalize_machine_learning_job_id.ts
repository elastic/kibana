/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MachineLearningJobId } from '../../../common/api/detection_engine';

export function normalizeMachineLearningJobId(jobId: MachineLearningJobId): string[] {
  return typeof jobId === 'string' ? [jobId] : jobId;
}
