/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  getAnonymizedValue,
  getRawDataOrDefault,
  transformRawData,
} from '@kbn/elastic-assistant-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { StartServicesAccessor } from '@kbn/core/server';
import { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';
import { createGetRiskScores } from '../../../lib/entity_analytics/risk_score/get_risk_score';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { createGetAlertsById } from './get_alert_by_id';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import type { ToolCitation } from '../types';

const entityRiskScoreInternalSchema = z.object({
  identifier_type: IdentifierType,
  identifier: z.string().min(1).describe('The value that identifies the entity.'),
  alertsIndexPattern: z
    .string()
    .optional()
    .describe('The index pattern for alerts (e.g., ".alerts-security.alerts-default")'),
});

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_ID = 'core.security.entity_risk_score';

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION =
  `Call this for knowledge about the latest entity risk score and the inputs that contributed to the calculation (sorted by 'kibana.alert.risk_score') in the environment, or when answering questions about how critical or risky an entity is. When informing the risk score value for a entity you must use the normalized field 'calculated_score_norm'. ` +
  'IMPORTANT: This tool accepts an optional alertsIndexPattern parameter. If not provided, a sensible default will be used. ' +
  'WORKFLOW: First call the assistant_settings tool with toolId="core.security.entity_risk_score" to get current configuration, then call this tool with the retrieved settings.';

export const entityRiskScoreToolInternal = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof entityRiskScoreInternalSchema> => {
  return {
    id: ENTITY_RISK_SCORE_TOOL_INTERNAL_ID,
    type: ToolType.builtin,
    description: ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION,
    schema: entityRiskScoreInternalSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'], // Type assertion to handle context type mismatch
        promptId: 'EntityRiskScoreTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async (
      {
        identifier_type: identifierType,
        identifier,
        alertsIndexPattern = '.alerts-security.alerts-default',
      },
      { esClient, logger, request, toolProvider }
    ) => {
      logger.debug(
        `Entity risk score tool called with identifier: ${identifier}, type: ${identifierType}`
      );

      try {
        // Get space ID from request context - use default space for now
        const spaceId = 'default';

        const getRiskScore = createGetRiskScores({
          logger,
          esClient: esClient.asCurrentUser,
          spaceId,
        });
        const getAlerts = createGetAlertsById({
          esClient: esClient.asCurrentUser,
        });
        /*
        const entityField = EntityTypeToIdentifierField[identifierType];


        if (isDenied({ anonymizationFields: [], field: entityField })) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  error: `The field ${entityField} is denied by the anonymization settings and cannot be used to identify the entity. Please modify the anonymization settings and try again.`,
                },
              },
            ],
          };
        }
          */

        const deAnonymizedIdentifier = identifier;

        const riskScore = await getRiskScore({
          entityType: identifierType as EntityType,
          entityIdentifier: deAnonymizedIdentifier,
          pagination: { querySize: 1, cursorStart: 0 },
        });

        if (riskScore.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: 'No risk score found for the specified entity.',
                },
              },
            ],
          };
        }

        const latestRiskScore = riskScore[0];

        // fetch all alerts that contributed to the risk score to enhance the inputs
        const alertsById = await getAlerts({
          index: alertsIndexPattern,
          ids: latestRiskScore.inputs.map((i) => i.id) ?? [],
          anonymizationFields: [],
        });

        const enhancedInputs = riskScore.flatMap((r) =>
          r.inputs.map((i) => ({
            risk_score: i.risk_score,
            contribution_score: i.contribution_score,
            category: i.category,
            alert_contribution: transformRawData({
              anonymizationFields: [],
              currentReplacements: {},
              getAnonymizedValue,
              onNewReplacements: () => {},
              rawData: getRawDataOrDefault(alertsById[i.id]),
            }),
          }))
        );

        const citationId = `entity-risk-${identifierType}-${identifier}`;
        const data = {
          ...latestRiskScore,
          inputs: enhancedInputs,
          id_value: identifier,
          citation: `{reference(${citationId})}`,
        };

        const citations: ToolCitation[] = [
          {
            id: citationId,
            type: 'Href',
            metadata: {
              // Note: basePath will be added by agent execution layer
              href: `/app/security/entity_analytics/hosts/${identifier}`,
              title: `Entity Risk Score for ${identifier}`,
            },
          },
        ];

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                riskScore: data,
                replacements: {},
                citations,
              },
            },
          ],
        };
      } catch (error) {
        logger.error('Error in entity risk score tool:', error);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error retrieving entity risk score: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['entity-risk-score', 'entities'],
  };
};
