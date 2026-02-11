/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext, ToolHandlerResult } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { euid } from '@kbn/entity-store/common';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import {
  EntityTypeToLevelField,
  EntityTypeToScoreField,
} from '../../../../../common/search_strategy';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../../common/entity_analytics/risk_engine';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { EntityAnalysisSkillsContext } from '../entity_analysis_skill';
import type { EntityAnalyticsInlineToolType } from './common';
import { entityAnalyticsInlineToolSchema, bootstrapCommonServices } from './common';

export const ENTITY_ANALYSIS_RISK_SCORE_INLINE_TOOL_ID = 'security.entity_analysis.risk_score';

export const riskScoreInlineToolHandler = async (
  toolArgs: EntityAnalyticsInlineToolType,
  toolContext: ToolHandlerContext & EntityAnalysisSkillsContext
) => {
  try {
    const { entityType, prompt, queryExtraContext } = toolArgs;
    const { esClient, getStartServices, request, spaceId, toolProvider } = toolContext;
    const results: ToolHandlerResult[] = [];
    let message: string = ``;

    const { defaultMessage, generateESQLTool, isEntityStoreV2Enabled } =
      await bootstrapCommonServices({
        entityType,
        esClient,
        getStartServices,
        request,
        spaceId,
        toolProvider,
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

      if (generateESQLTool) {
        const { results: generateESQLResult } = await generateESQLTool.execute({
          toolParams: {
            index: riskScoreIndexPattern,
            query: prompt,
            context: `${message}\n${defaultMessage}\n${queryExtraContext ?? ''}`,
          },
        });
        if (generateESQLResult) {
          results.push(...generateESQLResult);
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
};

export const getRiskScoreInlineTool = (ctx: EntityAnalysisSkillsContext): SkillBoundedTool => ({
  id: ENTITY_ANALYSIS_RISK_SCORE_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: entityAnalyticsInlineToolSchema,
  description: `Entity risk scoring is an advanced Elastic Security analytics feature that helps security analysts detect changes in an entity's risk posture, hunt for new threats, and prioritise incident response`,
  handler: (args, context) =>
    riskScoreInlineToolHandler(args as EntityAnalyticsInlineToolType, { ...context, ...ctx }),
});
