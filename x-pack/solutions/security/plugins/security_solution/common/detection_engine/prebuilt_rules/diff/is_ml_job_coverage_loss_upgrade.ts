/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MachineLearningJobId } from '../../../api/detection_engine/model/rule_schema/specific_attributes/ml_attributes.gen';
import { affectedJobIds } from '../../../machine_learning/affected_job_ids';

const legacyJobIds = new Set(affectedJobIds);

/**
 * Determines whether upgrading a prebuilt ML rule would drop a legacy ("affected")
 * ML job that the current rule version references but the target version no longer does.
 */
export const isMlJobCoverageLossUpgrade = (
  currentVersion: MachineLearningJobId,
  targetVersion: MachineLearningJobId
): boolean => {
  const currentJobIds = toArray(currentVersion);
  const targetJobIds = new Set(toArray(targetVersion));

  return currentJobIds.some((jobId) => legacyJobIds.has(jobId) && !targetJobIds.has(jobId));
};

const toArray = (jobIds: MachineLearningJobId): string[] =>
  Array.isArray(jobIds) ? jobIds : [jobIds];
