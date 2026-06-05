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
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { securityTool } from './constants';
import type { ExperimentalFeatures } from '../../../common';
import type { EsqlRuleCreateProps } from '../../../common/api/detection_engine/model/rule_schema';
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
  existing_rule: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Current rule object from the attachment. Pass when rewriting the query of an existing rule — seeds the graph with the current rule state so non-query fields (severity, risk_score, etc.) are preserved.'
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

The tool stores the result as an attachment (creating new or updating existing). Use the returned attachmentId and version with <render_attachment id="..." version="..."> to display it.

Limitations: only ES|QL rules are supported; requires relevant data in existing Elasticsearch indices to generate a query; severity and risk score default to low/21 and are not AI-adapted from threat context.`,
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

        const spaceAvailability = await getAgentBuilderResourceAvailability({
          core,
          request,
          logger,
        });

        if (spaceAvailability.status === 'unavailable') {
          return spaceAvailability;
        }

        const [coreStart] = await core.getStartServices();
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
        const isEsqlEnabled = await uiSettingsClient.get<boolean>(ENABLE_ESQL);

        if (!isEsqlEnabled) {
          return {
            status: 'unavailable',
            reason: 'ES|QL is disabled in this space via the enableESQL advanced setting.',
          };
        }

        return { status: 'available' };
      },
    },
    handler: async (
      { user_query: userQuery, existing_rule: existingRule },
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
        const result = await iterativeAgent.invoke({
          userQuery,
          ...(existingRule && { rule: existingRule as Partial<EsqlRuleCreateProps> }),
        });

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

        // Strip server-assigned identity fields — `id`/`rule_id` must not appear in the stored draft.
        const {
          id: _id,
          rule_id: _ruleId,
          ...ruleWithoutIds
        } = result.rule as typeof result.rule & {
          id?: string;
          rule_id?: string;
        };

        const attachmentDescription = `Rule: ${result.rule.name}`;
        const existingAttachment = attachments.getAttachmentRecord(SECURITY_RULE_ATTACHMENT_ID);
        const isUpdate = existingAttachment !== undefined;

        // Preserve stored intent so a query rewrite on a saved rule doesn't regress it to 'create'.
        const existingVersionData = isUpdate
          ? (existingAttachment.versions[existingAttachment.current_version - 1]?.data as
              | Record<string, unknown>
              | undefined)
          : undefined;
        const existingIntent = existingVersionData?.intent as string | undefined;

        const attachmentData: Record<string, unknown> = {
          text: JSON.stringify(ruleWithoutIds),
          attachmentLabel: result.rule.name,
          intent: existingIntent ?? 'create',
        };

        let resultAttachmentId: string;
        let version: number | undefined;

        try {
          if (isUpdate) {
            const updated = await attachments.update(SECURITY_RULE_ATTACHMENT_ID, {
              data: attachmentData,
              description: attachmentDescription,
            });
            resultAttachmentId = updated?.id ?? SECURITY_RULE_ATTACHMENT_ID;
            version = updated?.current_version;
            logger.debug(`Updated rule attachment ${resultAttachmentId} v${version}`);
          } else {
            const created = await attachments.add({
              id: SECURITY_RULE_ATTACHMENT_ID,
              type: SecurityAgentBuilderAttachments.rule,
              data: attachmentData,
              description: attachmentDescription,
            });
            resultAttachmentId = created.id;
            version = created.current_version;
            logger.debug(`Created rule attachment ${resultAttachmentId} v${version}`);
          }
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
                attachmentId: resultAttachmentId,
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
