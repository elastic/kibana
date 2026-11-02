/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ActiveMlModules } from './find_security_ml_jobs';
import type { EntityType } from '../../../../../../common/api/entity_analytics';

interface FindMatchingMlJobsOpts {
  activeMlModules: ActiveMlModules[];
  entityType: EntityType;
  model: ScopedModel;
  prompt: string;
}

interface FindMatchingMlJobsResult {
  recommendedJobs: Array<{
    id: string;
    description?: string;
  }>;
  recommendedStartedJobIds: string[];
}

export const findMatchingMlJobs = async ({
  activeMlModules,
  entityType,
  model,
  prompt,
}: FindMatchingMlJobsOpts): Promise<FindMatchingMlJobsResult> => {
  const output = await model.chatModel.withStructuredOutput(
    z.object({ jobIds: z.array(z.string()).default([]) })
  ).invoke(`
      You are a capable security solution analyst who must filter a list of ML jobs and return only the ones that can satisfy the user's prompt.
      Carefully consider the module title, description and job description and influencers to determine if the job can help answer the user prompt.
      Return only the list of job IDs that can be used to answer the user prompt for the given entity type.

      User prompt: "${prompt}"
      Entity type: "${entityType}"
      Available Modules and Jobs: ${JSON.stringify(activeMlModules)}`);

  const recommendedJobIds = output.jobIds ?? [];
  const securityJobsFormatted = activeMlModules.flatMap((module) => module.moduleJobs) ?? [];
  const matchedJobs = securityJobsFormatted.filter((job) => recommendedJobIds.includes(job.id));
  const recommendedStartedJobIds = matchedJobs
    .filter((job) => job.isJobStarted)
    .map((job) => job.id);

  return {
    recommendedJobs: matchedJobs.map(({ id, description }) => ({ id, description })),
    recommendedStartedJobIds,
  };
};
