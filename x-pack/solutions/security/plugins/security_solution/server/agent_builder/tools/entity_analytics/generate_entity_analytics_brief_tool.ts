/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  ToolAvailabilityContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { isInferenceError } from '@kbn/inference-common';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { ExperimentalFeatures } from '../../../../common';
import { EntityAnalyticsScope } from '../../../../common/entity_analytics/ai_brief/scope';
import { RiskScoreDataClient } from '../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { securityTool } from '../constants';
import { BRIEF_RESULT_INSTRUCTIONS, BRIEF_TOOL_DESCRIPTION, generateBrief } from './brief';
import { getEntityAnalyticsToolAvailability } from './entity_analytics_availability';
import { checkResolutionAccess } from './resolution/check_resolution_access';
import { createToolTelemetryTracker } from './tool_telemetry_tracker';

export const SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID = securityTool(
  'generate_entity_analytics_brief'
);

const NO_SCOPE_MESSAGE =
  'No valid Entity Analytics view is attached, so no brief was generated. Open the brief from the Entity Analytics page.';
const ENTITY_READ_FAILED_MESSAGE = "Entity details couldn't be read, so no brief was generated.";
const MODEL_FAILED_MESSAGE = 'The AI model call failed, so no brief was generated.';
const FAILED_MESSAGE = "The brief couldn't be generated. Try again.";

const schema = lazySchema(() =>
  z.object({
    scopeAttachmentId: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe(
        `Id of the ${SecurityAgentBuilderAttachments.entityAnalyticsAiBrief} attachment to brief on. Omit it to use the most recently attached view.`
      ),
  })
);

/** Builds the tool that turns a captured Entity Analytics view into the AI brief. */
export const generateEntityAnalyticsBriefTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  kibanaVersion: string
): BuiltinToolDefinition<typeof schema> => ({
  id: SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID,
  type: ToolType.builtin,
  description: BRIEF_TOOL_DESCRIPTION,
  schema,
  tags: ['security', 'entity-analytics'],
  annotations: {
    title: 'Generate Entity Analytics brief',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  excludeFromMcp: true,
  availability: {
    cacheMode: 'space',
    handler: async ({ request, spaceId }: ToolAvailabilityContext) =>
      getEntityAnalyticsToolAvailability({
        core,
        request,
        spaceId,
        experimentalFeatures,
        logger,
      }),
  },
  handler: async (
    { scopeAttachmentId },
    { request, spaceId, esClient, savedObjectsClient, modelProvider, attachments }
  ) => {
    const telemetryTracker = createToolTelemetryTracker({
      core,
      toolId: SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID,
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
      const parsedScope = EntityAnalyticsScope.safeParse(
        getScopeData(attachments, scopeAttachmentId)
      );
      if (!parsedScope.success) {
        telemetryTracker.recordFailure(NO_SCOPE_MESSAGE);
        return errorResult(NO_SCOPE_MESSAGE);
      }
      const { inferenceClient } = await modelProvider.getDefaultModel();
      const { brief, priorityCount } = await generateBrief({
        scope: parsedScope.data,
        spaceId,
        esClient: esClient.asCurrentUser,
        inferenceClient,
        attachments,
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
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { brief, instructions: BRIEF_RESULT_INSTRUCTIONS },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`${SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID} failed: ${errorMessage}`);
      telemetryTracker.recordFailure(errorMessage);
      return errorResult(getFailureMessage(error));
    } finally {
      await telemetryTracker.report();
    }
  },
});

/** The named scope attachment's current data, or the most recently added active scope's. */
const getScopeData = (attachments: AttachmentStateManager, scopeAttachmentId?: string): unknown => {
  const attachmentId =
    scopeAttachmentId ??
    attachments
      .getActive()
      .filter(({ type }) => type === SecurityAgentBuilderAttachments.entityAnalyticsAiBrief)
      .at(-1)?.id;
  if (attachmentId === undefined) {
    return undefined;
  }
  const attachment = attachments.get(attachmentId);
  if (attachment?.type !== SecurityAgentBuilderAttachments.entityAnalyticsAiBrief) {
    return undefined;
  }
  return attachment.data.data;
};

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
