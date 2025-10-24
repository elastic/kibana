/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { EntityTypeEnum } from '../../../../common/api/entity_analytics';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../common/entity_analytics/risk_engine';

const entityRiskScoreInternalSchema = z.object({
  entityType: z.nativeEnum(EntityTypeEnum).describe('The type of entity to search for.'),
  informationToRetrieve: z
    .enum(['risk_score', 'asset_criticality', 'entity_store', 'privileged_user_monitoring'])
    .describe('The information to retrieve.')
    .optional(),
});

// export const ENTITY_RISK_SCORE_TOOL_INTERNAL_ID = 'entity-risk-score-tool-internal';

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION = `Call this for knowledge about entity analytics, risk score, asset criticality, entity store, and other entity analytics related questions. This tool provider crucial information about the entity analytics domain.`;

// the latest entity risk score and the inputs that contributed to the calculation (sorted by 'kibana.alert.risk_score') in the environment, or
// when answering questions about how critical or risky an entity is
//
// . When informing the risk score value for a entity you must use the normalized field 'calculated_score_norm'.`;

export const entityRiskScoreToolInternal = (): BuiltinToolDefinition<
  typeof entityRiskScoreInternalSchema
> => {
  return {
    id: 'entity-analytics-tool',
    description: ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION,
    schema: entityRiskScoreInternalSchema,
    type: ToolType.builtin,
    handler: async (
      { entityType, informationToRetrieve },
      //   { identifier_type: identifierType, identifier, alertsIndexPattern },
      { esClient, logger, request, toolProvider }
    ) => {
      // request
      //   logger.debug(
      //     `Entity risk score tool called with identifier: ${identifier}, type: ${identifierType}`
      //   );

      try {
        // TODO:
        // create a parameter to specify which type if knowledge base you want to use: risk, asset, privmon, entitystore
        // - risk score, is it enabled? maybe should tell LLM how to enable it.
        // asset criticality
        // privileged user monitoring
        // entity store, is it enabled?
        //
        // Undefined for now:
        // timerange? Should we use the timerange from security solution timepicker?
        // Get space ID from request context - use default space for now
        const spaceId = 'default';
        // const assetCriticalityIndexPattern = getAssetCriticalityIndex(spaceId);
        // const entityStoreIndexPattern = getEntityStoreIndex(spaceId);
        // const entityAnalyticsIndexPattern = getEntityAnalyticsIndex(spaceId);
        // const entityAnalyticsIndexPattern = getEntityAnalyticsIndex(spaceId);

        if (informationToRetrieve === 'risk_score') {
          // check if risk score index exist, if not return error message saying how to enable it.
          const riskScoreIndexPattern = getRiskScoreLatestIndex(spaceId);
          const riskScoreTimeSeriesIndexPattern = getRiskScoreTimeSeriesIndex(spaceId);

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `This is a set of rules that you must follow strictly:
                  * Use the latest risk score index pattern: ${riskScoreIndexPattern} when answering questions about the current risk score of entities.
                  * Use the risk score time series patterns: ${riskScoreTimeSeriesIndexPattern} when answering questions about how the risk score changes over time.
                  * When querying the risk score for a entity you must **ALWAYS** use the normalized field 'calculated_score_norm'.
                  * The inputs field inside the risk score document contains the 10 highest-risk documents (sorted by 'kibana.alert.risk_score') that contributed to the risk score of an entity.
                  * When searching the risk score index for ${entityType} you must **ALWAYS** filter by: 'where ${entityType}.name IS NOT NULL'                                  
                  `,
                },
              },
            ],
          };
        } else {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Work in proress`,
                },
              },
            ],
          };
        }
      } catch (error) {
        logger.error('Error in entity analytics tool:', error);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error retrieving entity analytics data: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['entity-analytics', 'entities'],
  };
};
