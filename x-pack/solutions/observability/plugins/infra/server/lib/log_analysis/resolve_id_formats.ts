/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import type { IdFormat, IdFormatByJobType, JobType } from '../../../common/http_api/latest';
import {
  getJobId,
  logEntryCategoriesJobType,
  logEntryRateJobType,
} from '../../../common/log_analysis';

interface ResolveIdFormatsParams {
  spaceId: string;
  logViewId: string;
  mlAnomalyDetectors: MlAnomalyDetectors;
}

interface ResolveIdFormatParams extends ResolveIdFormatsParams {
  jobType: JobType;
}

/** Detects whether the log analysis ML jobs of a space and log view use hashed or legacy IDs. */
export async function resolveIdFormats({
  spaceId,
  logViewId,
  mlAnomalyDetectors,
}: ResolveIdFormatsParams): Promise<IdFormatByJobType> {
  const entryRateFormat = await resolveIdFormat({
    spaceId,
    logViewId,
    jobType: logEntryRateJobType,
    mlAnomalyDetectors,
  });
  const entryCategoriesCountFormat = await resolveIdFormat({
    spaceId,
    logViewId,
    jobType: logEntryCategoriesJobType,
    mlAnomalyDetectors,
  });

  return {
    [logEntryRateJobType]: entryRateFormat,
    [logEntryCategoriesJobType]: entryCategoriesCountFormat,
  };
}

async function resolveIdFormat({
  spaceId,
  logViewId,
  jobType,
  mlAnomalyDetectors,
}: ResolveIdFormatParams): Promise<IdFormat> {
  try {
    const hashedJobId = getJobId(spaceId, logViewId, 'hashed', jobType);
    const hashedJobs = await mlAnomalyDetectors.jobs(hashedJobId);
    if (hashedJobs.count > 0) {
      return 'hashed';
    }
  } catch (e) {
    // Ignore 404 in case the job isn't found
    if (e.statusCode !== 404) {
      throw e;
    }
  }

  try {
    const legacyJobId = getJobId(spaceId, logViewId, 'legacy', jobType);
    const legacyJobs = await mlAnomalyDetectors.jobs(legacyJobId);
    if (legacyJobs.count > 0) {
      return 'legacy';
    }
  } catch (e) {
    // Ignore 404 in case the job isn't found
    if (e.statusCode !== 404) {
      throw e;
    }
  }

  return 'hashed';
}
