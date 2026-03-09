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
import { getAssetCriticalityIndex } from '../../../../../../common/entity_analytics/asset_criticality';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';
import type { EntityAnalyticsCommonType } from '../common';
import { bootstrapCommonServices, entityAnalyticsCommonSchema } from '../common';
import { ENTITY_ANALYTICS_ASSET_CRITICALITY_INLINE_TOOL_ID } from '.';

/**
 * TODO - asset criticality is moving fully to the entity store v2 so this tool can be removed in favor of
 * the entity store tool
 *
 * We are creating this temporary tool because it's an easy query and allows us to see the agent follow the entity
 * analysis investigation workflow as outine in the skill description.
 */
export const assetCriticalityDynamicInlineToolHandler = async (
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

    const assetCriticalityIndexPattern = getAssetCriticalityIndex(spaceId);

    const indexExists = await esClient.asInternalUser.indices.exists({
      index: assetCriticalityIndexPattern,
    });

    const identifierFilter = isEntityStoreV2Enabled
      ? `'WHERE (${euid.getEuidEsqlDocumentsContainsIdFilter(entityType)})'`
      : `'WHERE ${EntityTypeToIdentifierField[entityType as EntityType]} IS NOT NULL'`;

    if (indexExists) {
      message = `
        This is a set of rules that you must follow strictly:
        * The criticality value is stored in the field 'criticality_level'.,
        * When searching the asset criticality of an entity of type '${entityType}', you must **ALWAYS** use exact and entire filter: "${identifierFilter}"`;

      const model = await modelProvider.getDefaultModel();
      const esqlResponse = await generateEsql({
        model,
        logger,
        events,
        nlQuery: prompt,
        esClient: esClient.asCurrentUser,
        index: assetCriticalityIndexPattern,
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
      message = `Asset criticality index does not exist for this space.`;
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

export const getAssetCriticalityEsqlTool = (
  ctx: EntityAnalyticsSkillsContext
): SkillBoundedTool => ({
  id: ENTITY_ANALYTICS_ASSET_CRITICALITY_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: entityAnalyticsCommonSchema,
  description: `Call this tool to get the asset criticality value for security entities (hosts, users, services, generic).`,
  handler: async (args, context) =>
    assetCriticalityDynamicInlineToolHandler(args as EntityAnalyticsCommonType, {
      ...context,
      ...ctx,
    }),
});
