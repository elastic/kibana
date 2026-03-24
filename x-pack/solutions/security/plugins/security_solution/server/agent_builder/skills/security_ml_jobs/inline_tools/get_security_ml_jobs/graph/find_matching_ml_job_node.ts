/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { StateType } from './graph';
import type { ActiveMlModules } from '../get_security_ml_jobs';
import type { EntityType } from '../../../../../../../common/api/entity_analytics';

export const FIND_MATCHING_ML_JOBS_NODE = 'findMatchingMlJobsNode';

interface FindMatchingMlJobsOpts {
  activeMlModules: ActiveMlModules[];
  entityType: EntityType;
  model: ScopedModel;
  prompt: string;
}

export const findMatchingMlJobsNode = async ({
  activeMlModules,
  entityType,
  model,
  prompt,
}: FindMatchingMlJobsOpts): Promise<Partial<StateType>> => {
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
  const recommendedJobs = securityJobsFormatted.filter((job) => recommendedJobIds.includes(job.id));
  const recommendedStartedJobIds = recommendedJobs
    .filter((job) => job.isJobStarted)
    .map((job) => job.id);

  return {
    recommendedJobs,
    recommendedStartedJobIds,
  };
};
