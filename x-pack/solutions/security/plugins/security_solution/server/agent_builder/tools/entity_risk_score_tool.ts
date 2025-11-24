/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server/tools';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import { createGetRiskScores } from '../../lib/entity_analytics/risk_score/get_risk_score';
import type { EntityType } from '../../../common/entity_analytics/types';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from './helpers';
import { ESSENTIAL_ALERT_FIELDS, securityTool } from './constants';

const entityRiskScoreSchema = z.object({
  identifierType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  identifier: z
    .string()
    .min(1)
    .describe('The value that identifies the entity (e.g., hostname, username)'),
});

export const SECURITY_ENTITY_RISK_SCORE_TOOL_ID = securityTool('entity_risk_score');

/**
 * Fetches alerts by their IDs, returning only essential fields for risk score context
 */
const getAlertsById = async ({
  esClient,
  index,
  ids,
}: {
  esClient: ElasticsearchClient;
  index: string;
  ids: string[];
}): Promise<Record<string, unknown>> => {
  if (ids.length === 0) {
    return {};
  }

  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: ids.length,
    _source: ESSENTIAL_ALERT_FIELDS,
    query: {
      bool: {
        filter: [{ terms: { _id: ids } }],
      },
    },
  });

  return response.hits.hits.reduce<Record<string, unknown>>((acc, hit) => {
    if (hit._source && hit._id) {
      acc[hit._id] = hit._source;
    }
    return acc;
  }, {});
};

export const entityRiskScoreTool = (): BuiltinToolDefinition<typeof entityRiskScoreSchema> => {
  return {
    id: SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    type: ToolType.builtin,
    description: `Call this tool to get the latest entity risk score and the inputs that contributed to the calculation for a specific entity (host, user, service, or generic). The risk score is sorted by 'kibana.alert.risk_score'. When reporting the risk score value, use the normalized field 'calculated_score_norm' which ranges from 0-100.`,
    schema: entityRiskScoreSchema,
    handler: async ({ identifierType, identifier }, { request, esClient, logger }) => {
      const spaceId = getSpaceIdFromRequest(request);
      const alertsIndexPattern = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      logger.debug(
        `${SECURITY_ENTITY_RISK_SCORE_TOOL_ID} tool called with identifierType: ${identifierType}, identifier: ${identifier}`
      );

      try {
        const getRiskScore = createGetRiskScores({
          logger,
          esClient: esClient.asCurrentUser,
          spaceId,
        });

        const riskScores = await getRiskScore({
          entityType: identifierType as EntityType,
          entityIdentifier: identifier,
          pagination: { querySize: 1, cursorStart: 0 },
        });

        if (riskScores.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `No risk score found for ${identifierType} entity with identifier: ${identifier}`,
                },
              },
            ],
          };
        }

        const latestRiskScore = riskScores[0];

        // Fetch all alerts that contributed to the risk score to enhance the inputs
        const alertIds = latestRiskScore.inputs.map((i) => i.id).filter(Boolean);
        const alertsById = await getAlertsById({
          esClient: esClient.asCurrentUser,
          index: alertsIndexPattern,
          ids: alertIds,
        });

        // Enhance inputs with alert data
        const enhancedInputs = latestRiskScore.inputs.map((input) => ({
          risk_score: input.risk_score,
          contribution_score: input.contribution_score,
          category: input.category,
          alert_contribution: alertsById[input.id] || null,
        }));

        const riskScoreData = {
          ...latestRiskScore,
          inputs: enhancedInputs,
        };

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                riskScore: riskScoreData,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ENTITY_RISK_SCORE_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error fetching risk score: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-risk-score', 'entities'],
  };
};
