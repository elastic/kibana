/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { type ToolHandlerContext, type ToolHandlerResult } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { euid } from '@kbn/entity-store/common';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import {
  EntityTypeToLevelField,
  EntityTypeToScoreField,
} from '../../../../../../common/search_strategy';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../../../common/entity_analytics/risk_engine';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';
import type { EntityAnalyticsCommonType } from '../common';
import { bootstrapCommonServices, entityAnalyticsCommonSchema } from '../common';
import { ENTITY_ANALYTICS_RISK_SCORE_INLINE_TOOL_ID } from '.';

export const riskScoreDynamicInlineToolHandler = async (
  toolArgs: EntityAnalyticsCommonType,
  toolContext: ToolHandlerContext & EntityAnalyticsSkillsContext
) => {
  try {
    const { entityType, prompt, queryExtraContext } = toolArgs;
    const { esClient, events, getStartServices, modelProvider, logger, request, spaceId } =
      toolContext;
    const results: ToolHandlerResult[] = [];
    let message: string = ``;

    const { defaultMessage, isEntityStoreV2Enabled } = await bootstrapCommonServices({
      entityType,
      esClient,
      getStartServices,
      request,
      spaceId,
    });

    const riskScoreIndexPattern = getRiskScoreLatestIndex(spaceId);
    const riskScoreTimeSeriesIndexPattern = getRiskScoreTimeSeriesIndex(spaceId);

    const indexExists = await esClient.asInternalUser.indices.exists({
      index: riskScoreIndexPattern,
    });

    const identifierFilter = isEntityStoreV2Enabled
      ? `'WHERE (${euid.getEuidEsqlDocumentsContainsIdFilter(entityType)})'`
      : `'WHERE ${EntityTypeToIdentifierField[entityType as EntityType]} IS NOT NULL'`;

    if (indexExists) {
      message = `
        This is a set of rules that you must follow strictly:
        * Use the latest risk score index pattern: ${riskScoreIndexPattern} when answering questions about the current risk score of entities.
        * Use the risk score time series patterns: ${riskScoreTimeSeriesIndexPattern} when answering questions about how the risk score changes over time.
        * When querying the risk score for a entity you must **ALWAYS** use the normalized field '${
          EntityTypeToScoreField[entityType as EntityType]
        }'.
        * The field '${
          EntityTypeToLevelField[entityType as EntityType]
        }' contains a textual description of the risk level.
        * The inputs field inside the risk score document contains the 10 highest-risk documents (sorted by 'kibana.alert.risk_score') that contributed to the risk score of an entity.
        * When searching the risk score of an entity of type '${entityType}', you must **ALWAYS** use exact and entire filter: "${identifierFilter}"`;

      const model = await modelProvider.getDefaultModel();
      const esqlResponse = await generateEsql({
        model,
        logger,
        events,
        nlQuery: prompt,
        esClient: esClient.asCurrentUser,
        index: riskScoreIndexPattern,
        additionalContext: `${message}\n${defaultMessage}\n${queryExtraContext ?? ''}`,
      });

      if (esqlResponse.error) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: esqlResponse.error,
              },
            },
          ],
        };
      } else {
        if (esqlResponse.query) {
          results.push({
            type: ToolResultType.query,
            data: {
              esql: esqlResponse.query,
            },
          });
        }
        if (esqlResponse.answer) {
          results.push({
            type: ToolResultType.other,
            data: {
              answer: esqlResponse.answer,
            },
          });
        }
      }
    } else {
      message = `Risk score index does not exist for this space. The user needs to enable the risk engine so that this agent can answer risk-related questions.`;
    }

    return {
      results: [
        ...results,
        { type: ToolResultType.other, data: { message } },
        { type: ToolResultType.other, data: { message: defaultMessage } },
      ],
    };
  } catch (error) {
    return {
      results: [
        {
          type: ToolResultType.error,
          data: {
            error: `Error retrieving entity analytics data: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        },
      ],
    };
  }
};

export const getRiskScoreEsqlTool = (ctx: EntityAnalyticsSkillsContext): SkillBoundedTool => ({
  id: ENTITY_ANALYTICS_RISK_SCORE_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: entityAnalyticsCommonSchema,
  description: `Call this tool to get the latest entity risk score and the inputs that contributed to the calculation for a specific entity (host, user, service, or generic). IMPORTANT: Always use 'calculated_score_norm' (0-100) when reporting risk scores, NOT 'calculated_score' which is a raw value. The 'calculated_score_norm' field is the normalized score suitable for comparison between entities. The 'modifiers' array contains risk adjustments such as asset criticality and privileged user monitoring (watchlist/privmon type).`,
  handler: async (args, context) =>
    riskScoreDynamicInlineToolHandler(args as EntityAnalyticsCommonType, { ...context, ...ctx }),
});
