/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { securityTool } from './constants';
import type { ExperimentalFeatures } from '../../../common';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../common/constants';
import { getBuildAgent } from '../../lib/detection_engine/ai_rule_creation/agent';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

export const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = securityTool('create_detection_rule');

const createDetectionRuleSchema = z.object({
  user_query: z
    .string()
    .describe(
      'Natural language description of the detection rule to create, including threat scenarios, data sources, and desired detection logic'
    ),
});

export function createDetectionRuleTool(
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): StaticToolRegistration<typeof createDetectionRuleSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof createDetectionRuleSchema> = {
    id: SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
    type: ToolType.builtin,
    description: `Creates a security detection rule based on natural language description. Analyzes the query, identifies relevant data sources, generates ES|QL queries, and produces a complete detection rule with metadata, tags, and scheduling information.

The tool stores the result as an attachment (creating new or updating existing). Use the returned attachmentId and version with <render_attachment id="..." version="..."> to display it.`,
    schema: createDetectionRuleSchema,
    tags: ['security', 'detection', 'rule-creation', 'siem'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        if (!experimentalFeatures?.aiRuleCreationEnabled) {
          return {
            status: 'unavailable',
            reason:
              'AI rule creation is not enabled. Enable it via experimental feature flag "aiRuleCreationEnabled".',
          };
        }

        return getAgentBuilderResourceAvailability({
          core,
          request,
          logger,
        });
      },
    },
    handler: async (
      { user_query: userQuery },
      { esClient, modelProvider, request, events, attachments }
    ) => {
      try {
        logger.debug(
          `Create detection rule tool invoked with query: ${userQuery.substring(0, 100)}...`
        );

        const modelConfig = await modelProvider.getDefaultModel();
        const model = modelConfig.chatModel;
        const connectorId = model.getConnector().connectorId;

        if (!connectorId) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: 'No connector ID provided and no default connector available',
                },
              },
            ],
          };
        }

        const [coreStart, startPlugins] = await core.getStartServices();
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
        const iterativeAgent = await getBuildAgent({
          model,
          logger,
          inference: startPlugins.inference,
          connectorId,
          request,
          esClient: esClient.asCurrentUser,
          savedObjectsClient,
          rulesClient,
          events,
        });
        const result = await iterativeAgent.invoke({ userQuery });

        if (result.errors.length) {
          logger.error(`Rule creation failed with errors: ${result.errors.join('; ')}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to create detection rule: ${result.errors.join('; ')}`,
                  errors: result.errors,
                },
              },
            ],
          };
        }

        logger.debug(`Successfully created detection rule: ${result.rule.name}`);

        const attachmentData = {
          text: JSON.stringify(result.rule),
          attachmentLabel: result.rule.name,
        };
        const attachmentDescription = `Rule: ${result.rule.name}`;

        let resultAttachmentId: string | undefined;
        let version: number | undefined;

        try {
          const created = await attachments.add({
            id: SECURITY_RULE_ATTACHMENT_ID,
            type: SecurityAgentBuilderAttachments.rule,
            data: attachmentData,
            description: attachmentDescription,
          });
          resultAttachmentId = created.id;
          version = created.current_version;
          logger.debug(`Created rule attachment ${resultAttachmentId} v${version}`);
        } catch (attachmentError) {
          logger.error(
            `Could not persist rule attachment: ${
              attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
            }`
          );
          throw Error('Could not persist rule attachment');
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                rule: result.rule,
                ...(resultAttachmentId && { attachmentId: resultAttachmentId }),
                ...(version !== undefined && { version }),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Create detection rule tool failed: ${error.message}`, error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create detection rule: ${error.message}`,
                error: error.toString(),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
