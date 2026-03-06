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
import type { SecurityMlJobsSkillsContext } from '../../security_ml_jobs_skill';
import { createFindMlJobsAndIndicesGraph } from './graph';

export const SECURITY_ML_JOBS_INLINE_TOOL = `security.ml.jobs`;

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
  influencers?: string[];
  isJobStarted: boolean;
}

export interface ActiveMlModules {
  moduleTitle: string;
  moduleDescription: string;
  moduleJobs: Array<SecurityJobType>;
}

const getActiveMlModules = async (
  request: KibanaRequest,
  soClient: SavedObjectsClientContract,
  ml?: SecurityMlJobsSkillsContext['ml']
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
  toolContext: ToolHandlerContext & SecurityMlJobsSkillsContext
) => {
  try {
    const { getStartServices, esClient, logger, ml, modelProvider, request, savedObjectsClient } =
      toolContext;

    logger.info(
      `${SECURITY_ML_JOBS_INLINE_TOOL} tool called with args: ${JSON.stringify(toolArgs)}`
    );

    const [core] = await getStartServices();
    const uiSettingsClient = core.uiSettings.asScopedToClient(savedObjectsClient);

    const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);
    const activeMlModules = await getActiveMlModules(request, savedObjectsClient, ml);
    const model = await modelProvider.getDefaultModel();

    const graph = createFindMlJobsAndIndicesGraph({
      activeMlModules,
      entityType: toolArgs.entityType,
      esClient: esClient.asCurrentUser,
      model,
      prompt: toolArgs.prompt,
      threshold: anomalyScore,
    });
    const outState = await graph.invoke({});

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            activeJobIds: outState.recommendedStartedJobIds,
            allJobs: outState.recommendedJobs,
            indices: outState.indices,
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

export const getSecurityMlJobsTool = (ctx: SecurityMlJobsSkillsContext): SkillBoundedTool => ({
  id: SECURITY_ML_JOBS_INLINE_TOOL,
  type: ToolType.builtin,
  schema: mlJobsToolSchema,
  description: `Call this tool to find relevant security ML jobs and their corresponding indices to investigate anomalous or unusual behavior in your environment`,
  handler: async (args, context) =>
    securityMlJobsInlineToolHandler(args as MlJobsToolType, { ...context, ...ctx }),
});
