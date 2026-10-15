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
import type { ExperimentalFeatures } from '../../../../common';
import {
  ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE,
  EntityAnalyticsScope,
} from '../../../../common/entity_analytics/ai_brief/scope';
import { RiskScoreDataClient } from '../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { securityTool } from '../constants';
import { generateBrief } from './brief';
import { getEntityAnalyticsToolAvailability } from './entity_analytics_availability';
import { createToolTelemetryTracker } from './tool_telemetry_tracker';

export const SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID = securityTool(
  'generate_entity_analytics_brief'
);

const BRIEF_INSTRUCTIONS =
  'Reply with `brief` exactly as written, every line, then one short follow-up invitation. Copy each <render_attachment> tag character for character: never change, shorten or "correct" its id, which only resolves exactly as given.';
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
        `Id of the ${ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE} attachment to brief on. Omit it to use the most recently attached view.`
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
  description: `Generates the Entity Analytics AI brief for a captured Entity Analytics page view (a ${ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE} attachment). Use it when the user asks for the brief of an attached Entity Analytics view; for other entity questions use the entity search and lookup tools. It reads the tile values captured from the page and the Entity Store records of the entities in those tiles, and returns a \`brief\` markdown string covering the scope, what needs attention, the counts and their changes, up to three priority entities with a supporting entity table, and a recommended next step.`,
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
    { spaceId, esClient, savedObjectsClient, modelProvider, attachments }
  ) => {
    const telemetryTracker = createToolTelemetryTracker({
      core,
      toolId: SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID,
      spaceId,
      actionType: 'read',
    });
    try {
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
            data: { brief, instructions: BRIEF_INSTRUCTIONS },
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
      .filter(({ type }) => type === ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE)
      .at(-1)?.id;
  if (attachmentId === undefined) {
    return undefined;
  }
  const attachment = attachments.get(attachmentId);
  if (attachment?.type !== ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE) {
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
