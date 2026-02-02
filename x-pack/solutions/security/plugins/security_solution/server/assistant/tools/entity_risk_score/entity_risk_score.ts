/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { z } from '@kbn/zod';
import {
  getAnonymizedValue,
  getRawDataOrDefault,
  isDenied,
  sizeIsOutOfRange,
  transformRawData,
} from '@kbn/elastic-assistant-common';
import { tool } from '@langchain/core/tools';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';
import { createGetRiskScores } from '../../../lib/entity_analytics/risk_score/get_risk_score';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { APP_UI_ID } from '../../../../common';
import { createGetAlertsById } from './get_alert_by_id';

export type EntityRiskScoreToolParams = Require<
  AssistantToolParams,
  'alertsIndexPattern' | 'size' | 'assistantContext'
>;

export const ENTITY_RISK_SCORE_TOOL_DESCRIPTION = `Call this for knowledge about the latest entity risk score and the inputs that contributed to the calculation (sorted by 'kibana.alert.risk_score') in the environment, or when answering questions about how critical or risky an entity is. When informing the risk score value for a entity you must use the normalized field 'calculated_score_norm'. The 'modifiers' array contains risk adjustments including asset criticality and privileged user monitoring (watchlist/privmon).`;

export const ENTITY_RISK_SCORE_TOOL_ID = 'entity-risk-score-tool';

/**
 * Returns a tool for querying entity risk score, or null if the
 * request doesn't have all the required parameters.
 */
export const ENTITY_RISK_SCORE_TOOL: AssistantTool = {
  id: ENTITY_RISK_SCORE_TOOL_ID,
  name: 'EntityRiskScoreTool',
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: ENTITY_RISK_SCORE_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is EntityRiskScoreToolParams => {
    const { alertsIndexPattern, request, size } = params;
    return (
      requestHasRequiredAnonymizationParams(request) &&
      alertsIndexPattern != null &&
      size != null &&
      !sizeIsOutOfRange(size)
    );
  },

  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const {
      alertsIndexPattern,
      anonymizationFields = [],
      onNewReplacements,
      replacements,
      assistantContext,
      logger,
      esClient,
    } = params as EntityRiskScoreToolParams;
    return tool(
      async (input) => {
        const spaceId = assistantContext.getSpaceId();

        const getRiskScore = createGetRiskScores({
          logger,
          esClient,
          spaceId,
        });
        const getAlerts = createGetAlertsById({
          esClient,
        });

        const entityField = EntityTypeToIdentifierField[input.identifier_type];

        if (isDenied({ anonymizationFields, field: entityField })) {
          return `The field ${entityField} is denied by the anonymization settings and cannot be used to identify the entity. Please modify the anonymization settings and try again.`;
        }

        // Accumulate replacements locally so we can, for example use the same
        // replacement for a hostname when we see it in multiple alerts:
        let localReplacements: Replacements = replacements ?? {};
        const localOnNewReplacements = (newReplacements: Replacements) => {
          localReplacements = { ...localReplacements, ...newReplacements };
          onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
        };

        const deAnonymizedIdentifier = localReplacements[input.identifier] ?? input.identifier;

        const riskScore = await getRiskScore({
          entityType: input.identifier_type as EntityType,
          entityIdentifier: deAnonymizedIdentifier,
          pagination: { querySize: 1, cursorStart: 0 },
        });

        if (riskScore.length === 0) {
          return 'No risk score found for the specified entity.';
        }

        const latestRiskScore = riskScore[0];

        // fetch all alerts that contributed to the risk score to enhance the inputs
        const alertsById = await getAlerts({
          index: alertsIndexPattern,
          ids: latestRiskScore.inputs.map((i) => i.id) ?? [],
          anonymizationFields,
        });

        const enhancedInputs = riskScore.flatMap((r) =>
          r.inputs.map((i) => ({
            risk_score: i.risk_score,
            contribution_score: i.contribution_score,
            category: i.category,
            alert_contribution: transformRawData({
              anonymizationFields,
              currentReplacements: localReplacements,
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements,
              rawData: getRawDataOrDefault(alertsById[i.id]),
            }),
          }))
        );

        const data = {
          ...latestRiskScore,
          inputs: enhancedInputs,
          id_value: input.identifier, // Replace id_value for the anonymized identifier to avoid leaking user data
        };

        return JSON.stringify({
          riskScore: data,
          replacements: localReplacements,
        });
      },
      {
        name: 'EntityRiskScoreTool',
        description: params.description || ENTITY_RISK_SCORE_TOOL_DESCRIPTION,
        schema: z.object({
          identifier_type: IdentifierType,
          identifier: z.string().min(1).describe('The value that identifies the entity.'),
        }),
        tags: ['entity-risk-score', 'entities'],
      }
    );
  },
};
