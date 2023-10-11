/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlApi } from '../../../services/ml/api';
import { MlJob } from './ml_job_configs';

export function createMlJobHelper(ml: MlApi) {
  async function createMlJob(mlJob: MlJob) {
    await ml.setupModule('logs_ui_analysis', mlJob.config, 'default');
    await ml.waitForAnomalyDetectionJobToExist(mlJob.jobId);
  }

  async function deleteMlJob(mlJob: MlJob) {
    await ml.deleteAnomalyDetectionJobES(mlJob.jobId);
    await ml.waitForAnomalyDetectionJobNotToExist(mlJob.jobId);
  }

  return { createMlJob, deleteMlJob };
}

export type MlJobHelper = ReturnType<typeof createMlJobHelper>;
