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

// Helper function to parse assistant settings and extract configuration
const parseAssistantSettings = (settingsData: unknown) => {
  const result = {
    alertsIndexPattern: '.alerts-security.alerts-default',
  };

  if (
    settingsData &&
    typeof settingsData === 'object' &&
    'settings' in settingsData &&
    settingsData.settings &&
    typeof settingsData.settings === 'object'
  ) {
    // Get defaults for this tool
    if (
      'defaults' in settingsData.settings &&
      settingsData.settings.defaults &&
      typeof settingsData.settings.defaults === 'object' &&
      'entityRiskScoreToolInternal' in settingsData.settings.defaults
    ) {
      const toolDefaults = settingsData.settings.defaults.entityRiskScoreToolInternal;
      if (toolDefaults && typeof toolDefaults === 'object') {
        if (
          'alertsIndexPattern' in toolDefaults &&
          typeof toolDefaults.alertsIndexPattern === 'string'
        ) {
          result.alertsIndexPattern = toolDefaults.alertsIndexPattern;
        }
      }
    }
  }

  return result;
};

const entityRiskScoreInternalSchema = z.object({
  identifier_type: IdentifierType,
  identifier: z.string().min(1).describe('The value that identifies the entity.'),
});

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_ID = 'core.security.entity_risk_score';

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION = `Call this for knowledge about the latest entity risk score and the inputs that contributed to the calculation (sorted by 'kibana.alert.risk_score') in the environment, or when answering questions about how critical or risky an entity is. When informing the risk score value for a entity you must use the normalized field 'calculated_score_norm'.`;

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
      { identifier_type: identifierType, identifier },
      { esClient, logger, request, toolProvider }
    ) => {
      logger.debug(
        `Entity risk score tool called with identifier: ${identifier}, type: ${identifierType}`
      );

      try {
        // Get configuration from assistant settings tool (with fallback defaults)
        let settingsData: unknown = null;

        try {
          const [, pluginsStart] = await getStartServices();
          const toolRegistry = await pluginsStart.onechat.tools.getRegistry({
            request,
          });
          const assistantSettingsResult = await toolRegistry.execute({
            toolId: 'core.security.assistant_settings',
            toolParams: { toolId: 'core.security.entity_risk_score' },
          });

          if (assistantSettingsResult.results && assistantSettingsResult.results.length > 0) {
            settingsData = assistantSettingsResult.results[0].data;
          }
        } catch (error) {
          // Use defaults if assistant settings fails
        }

        // Parse assistant settings to get configuration (with fallbacks)
        const parsed = parseAssistantSettings(settingsData);
        const { alertsIndexPattern } = parsed;

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

        const data = { ...latestRiskScore, inputs: enhancedInputs, id_value: identifier }; // Replace id_value for the anonymized identifier to avoid leaking user data

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                riskScore: data,
                replacements: {},
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
