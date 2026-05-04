/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { ModuleJob } from '@kbn/ml-plugin/common/types/modules';
import { isJobStarted } from '../../../../../../common/machine_learning/helpers';
import type { LEGACY_ML_GROUP_ID, ML_GROUP_ID } from '../../../../../../common/constants';
import { DEFAULT_ANOMALY_SCORE, ML_GROUP_IDS } from '../../../../../../common/constants';
import { IdentifierType } from '../../../../../../common/api/entity_analytics/common/common.gen';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { FindSecurityMlJobsSkillsContext } from '../../find_security_ml_jobs_skill';
import { findMatchingMlJobs } from './find_matching_ml_jobs';

export const FIND_SECURITY_ML_JOBS_INLINE_TOOL = `find.security.ml.jobs`;

export const mlJobsToolSchema = z.object({
  entityType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  prompt: z.string().describe('The original question or prompt that the agent is trying to answer'),
});

export type MlJobsToolType = Omit<z.infer<typeof mlJobsToolSchema>, 'entityType'> & {
  entityType: EntityType;
};

const isSecurityJob = (job: ModuleJob): boolean =>
  job.config?.groups?.some((group) =>
    ML_GROUP_IDS.includes(group as typeof ML_GROUP_ID | typeof LEGACY_ML_GROUP_ID)
  ) || false;

export interface SecurityJobType {
  id: string;
  description?: string;
}

interface InternalJobType extends SecurityJobType {
  influencers?: string[];
  isJobStarted: boolean;
}

export interface ActiveMlModules {
  moduleTitle: string;
  moduleDescription: string;
  moduleJobs: Array<InternalJobType>;
}

const getActiveMlModules = async (
  soClient: SavedObjectsClientContract,
  ml?: FindSecurityMlJobsSkillsContext['ml']
): Promise<ActiveMlModules[]> => {
  const fakeRequest = Object.create(null) as KibanaRequest;
  const mlModulesProvider = ml?.modulesProvider(fakeRequest, soClient);
  const modules = await mlModulesProvider?.listModules?.();

  const jobServiceProvider = ml?.jobServiceProvider(fakeRequest, soClient);
  const allJobsWithStatus = await jobServiceProvider?.jobsSummary();

  const formattedModules = modules?.map((module) => ({
    moduleTitle: module.title,
    moduleDescription: module.description,
    moduleJobs: module.jobs.filter(isSecurityJob).map((job) => {
      const jobStatus = allJobsWithStatus?.find(({ id }) => id === job.id);

      return {
        id: job.id,
        description: job.config.description,
        influencers: job.config.analysis_config.influencers,
        isJobStarted: jobStatus ? isJobStarted(jobStatus.jobState, jobStatus.datafeedState) : false,
      };
    }),
  }));

  return formattedModules ?? [];
};

export const securityMlJobsInlineToolHandler = async (
  toolArgs: MlJobsToolType,
  toolContext: ToolHandlerContext & FindSecurityMlJobsSkillsContext
) => {
  try {
    const { getStartServices, logger, ml, modelProvider, savedObjectsClient } = toolContext;

    logger.debug(
      `${FIND_SECURITY_ML_JOBS_INLINE_TOOL} tool called with args: ${JSON.stringify(toolArgs)}`
    );

    const [core] = await getStartServices();
    const uiSettingsClient = core.uiSettings.asScopedToClient(savedObjectsClient);

    const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);
    const activeMlModules = await getActiveMlModules(savedObjectsClient, ml);
    const model = await modelProvider.getDefaultModel();

    const matchingJobs = await findMatchingMlJobs({
      activeMlModules,
      entityType: toolArgs.entityType,
      model,
      prompt: toolArgs.prompt,
    });

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            activeJobIds: matchingJobs.recommendedStartedJobIds,
            allJobs: matchingJobs.recommendedJobs,
            scoreThreshold: anomalyScore,
          },
        },
      ],
    };
  } catch (error) {
    return {
      results: [
        {
          type: ToolResultType.error,
          data: {
            error: `Error retrieving security ml job data: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        },
      ],
    };
  }
};

export const findSecurityMlJobsTool = (ctx: FindSecurityMlJobsSkillsContext): SkillBoundedTool => ({
  id: FIND_SECURITY_ML_JOBS_INLINE_TOOL,
  type: ToolType.builtin,
  schema: mlJobsToolSchema,
  description: `Call this tool to find relevant security ML jobs and their corresponding indices to investigate anomalous or unusual behavior in your environment`,
  handler: async (args, context) =>
    securityMlJobsInlineToolHandler(args as MlJobsToolType, { ...context, ...ctx }),
});
