/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { isInferenceError } from '@kbn/inference-common';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { ExperimentalFeatures } from '../../../../common';
import type { EntityAnalyticsScope } from '../../../../common/entity_analytics/ai_brief/scope';
import { WatchlistConfigClient } from '../../../lib/entity_analytics/watchlists/management/watchlist_config';
import { RiskScoreDataClient } from '../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { BriefJobService } from './brief';
import {
  BRIEF_RESULT_INSTRUCTIONS,
  generateBrief,
  getBriefToolDescription,
  getBriefToolId,
} from './brief';
import { checkResolutionAccess } from './resolution/check_resolution_access';
import { buildRenderAttachmentTag } from './attachment_utils';
import { createToolTelemetryTracker } from './tool_telemetry_tracker';

/** The tool's name in logs and telemetry; each captured view gets its own tool id. */
const BRIEF_TOOL_NAME = 'security.generate_entity_analytics_brief';
const BRIEF_TITLE = 'Entity Analytics AI brief';

const ENTITY_READ_FAILED_MESSAGE = "Entity details couldn't be read, so no brief was generated.";
const MODEL_FAILED_MESSAGE = 'The AI model call failed, so no brief was generated.';
const FAILED_MESSAGE = "The brief couldn't be generated. Try again.";

/**
 * The installed ML jobs of the request's space, through the ML plugin's job service, which keeps to the
 * space the saved objects client is scoped to. ML rejects an agent request that it can't check privileges
 * for, so the job list falls back to the request the Security ML jobs skill uses. Only the job list: the
 * anomaly records are read as the user.
 */
const getJobService = (
  ml: MlPluginSetup,
  request: KibanaRequest,
  savedObjectsClient: SavedObjectsClientContract
): BriefJobService => ({
  jobsSummary: async () => {
    try {
      return await ml.jobServiceProvider(request, savedObjectsClient).jobsSummary();
    } catch {
      return await ml
        .jobServiceProvider(Object.create(null) as KibanaRequest, savedObjectsClient)
        .jobsSummary();
    }
  },
});

export interface BriefToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
  kibanaVersion: string;
  /** Absent when the ML plugin is disabled: the brief then has no anomalies. */
  ml?: MlPluginSetup;
}

/**
 * The tool that turns one captured Entity Analytics view into the AI brief. It is bound to the view's
 * attachment, so it only exists in conversations that hold a view.
 */
export const createGenerateBriefTool = ({
  core,
  logger,
  experimentalFeatures,
  kibanaVersion,
  ml,
  attachmentId,
  scope,
}: BriefToolDeps & {
  attachmentId: string;
  scope: EntityAnalyticsScope;
}): BuiltinAttachmentBoundedTool => ({
  id: getBriefToolId(attachmentId),
  type: ToolType.builtin,
  description: getBriefToolDescription(attachmentId),
  schema: z.object({}),
  excludeFromMcp: true,
  handler: async (
    _params,
    { request, spaceId, esClient, savedObjectsClient, modelProvider, attachments }
  ) => {
    const telemetryTracker = createToolTelemetryTracker({
      core,
      toolId: BRIEF_TOOL_NAME,
      spaceId,
      actionType: 'read',
    });
    try {
      const [, { security }] = await core.getStartServices();
      const access = await checkResolutionAccess({
        request,
        security,
        action: 'generate the Entity Analytics brief',
      });
      if (!access.allowed) {
        telemetryTracker.recordFailure(access.result.data.message);
        return { results: [access.result] };
      }
      const { inferenceClient } = await modelProvider.getDefaultModel();
      const { html, height, viewModel, entityTableTag, priorityCount } = await generateBrief({
        scope,
        spaceId,
        esClient: esClient.asCurrentUser,
        inferenceClient,
        attachments,
        watchlistConfigClient: new WatchlistConfigClient({
          soClient: savedObjectsClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        }),
        jobService: ml && getJobService(ml, request, savedObjectsClient),
        riskScoreDataClient: experimentalFeatures.riskScoreHistoryEnabled
          ? new RiskScoreDataClient({
              logger,
              kibanaVersion,
              esClient: esClient.asCurrentUser,
              soClient: savedObjectsClient,
              namespace: spaceId,
            })
          : undefined,
        logger,
      });
      telemetryTracker.recordResultCount(priorityCount);
      const attachment = await attachments.add({
        type: 'visualization',
        data: {
          renderer: 'custom_content',
          query: BRIEF_TITLE,
          visualization: { template: html, height, title: BRIEF_TITLE },
        },
        description: BRIEF_TITLE,
      });
      const { summary, priorities, recommendation } = viewModel;
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              attachment_id: attachment.id,
              version: attachment.current_version,
              brief_tag: buildRenderAttachmentTag({
                attachmentId: attachment.id,
                version: attachment.current_version,
              }),
              entity_table_tag: entityTableTag,
              summary,
              priorities: priorities.map(({ name, nextStep }) => ({ name, nextStep })),
              recommendation,
              instructions: BRIEF_RESULT_INSTRUCTIONS,
            },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`${BRIEF_TOOL_NAME} failed: ${errorMessage}`);
      telemetryTracker.recordFailure(errorMessage);
      return errorResult(getFailureMessage(error));
    } finally {
      await telemetryTracker.report();
    }
  },
});

/** A plain message for the user: Entity Store, model, or anything else. Details go to the log. */
const getFailureMessage = (error: unknown): string => {
  if (error instanceof errors.ElasticsearchClientError) {
    return ENTITY_READ_FAILED_MESSAGE;
  }
  if (isInferenceError(error)) {
    return MODEL_FAILED_MESSAGE;
  }
  return FAILED_MESSAGE;
};

const errorResult = (message: string): ToolHandlerStandardReturn => ({
  results: [{ tool_result_id: getToolResultId(), type: ToolResultType.error, data: { message } }],
});
