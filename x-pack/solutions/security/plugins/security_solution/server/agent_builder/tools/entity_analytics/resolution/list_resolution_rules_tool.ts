/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { securityTool } from '../../constants';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { checkResolutionAccess } from './check_resolution_access';
import { getResolutionToolAvailability } from './resolution_availability';

const schema = z.object({});

export const SECURITY_LIST_RESOLUTION_RULES_TOOL_ID = securityTool('list_resolution_rules');

export const listResolutionRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
    type: ToolType.builtin,
    description: `List the managed entity resolution rules and their effective enabled state for the current space. Each rule's description states what it bridges (e.g. matching entities on email, Windows SID, Entra GUID); most also note which data sources they need and when a user might want to disable them.

Use when the user asks what resolution rules exist, whether a specific rule is on/off, or what automated matching Entity Resolution performs (e.g. "what resolution rules do we have", "is the email matching rule enabled", "what automated entity matching is running").`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'resolution'],
    annotations: {
      title: 'List Resolution Rules',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) =>
        getResolutionToolAvailability({ core, request, spaceId, experimentalFeatures, logger }),
    },
    handler: async (_params, { spaceId, savedObjectsClient, request }) => {
      logger.debug(`${SECURITY_LIST_RESOLUTION_RULES_TOOL_ID} tool called`);

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
        spaceId,
        actionType: 'read',
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, { security, entityStore }] = await core.getStartServices();
        const accessResult = await checkResolutionAccess({
          request,
          security,
          action: 'view entity resolution rules',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const rulesClient = entityStore.createResolutionRulesClient(savedObjectsClient, spaceId);
        const rules = await rulesClient.getEffectiveRules();

        telemetryTracker.recordResultCount(rules.length);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { rules },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error listing resolution rules: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
