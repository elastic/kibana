/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerResult, ToolHandlerContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ElasticsearchClient } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { getAssetCriticalityIndex } from '../../../../../../common/entity_analytics/asset_criticality';
import { IdentifierType } from '../../../../../../common/api/entity_analytics/common/common.gen';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';

import { ENTITY_ANALYTICS_ASSET_CRITICALITY_INLINE_TOOL_ID } from '.';
import { escapeEsqlString } from '../common';

const DEFAULT_LIMIT = 10;

/**
 * TODO - asset criticality is moving fully to the entity store v2 so this tool can be removed in favor of
 * the entity store tool
 *
 * We are creating this temporary tool because it's an easy query and allows us to see the agent follow the entity
 * analysis investigation workflow as outine in the skill description.
 */

export const assetCriticalityStaticSchema = z.object({
  entityType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  entityId: z
    .string()
    .describe('The identifier of the entity to retrieve the asset criticality for')
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results to return when entityId is not provided (default: 10)'),
});

export type AssetCriticalityType = Omit<
  z.infer<typeof assetCriticalityStaticSchema>,
  'entityType'
> & {
  entityType: EntityType;
};

type BuildEsqlQueryOpts = AssetCriticalityType & {
  esClient: ElasticsearchClient;
  index: string;
};

export const queryAssetCriticality = async (opts: BuildEsqlQueryOpts) => {
  const entityLimit = opts.limit || DEFAULT_LIMIT;
  const entityType =
    opts.entityType !== 'generic' ? EntityTypeToIdentifierField[opts.entityType] : undefined;
  const entityId = opts.entityId ? escapeEsqlString(opts.entityId) : null;

  const query = `FROM ${opts.index}
  | WHERE criticality_level IS NOT NULL AND criticality_level != "deleted"${
    entityId ? ` AND id_value == "${entityId}"` : ''
  }${entityType ? ` AND id_field == "${entityType}"` : ''}
  | EVAL numerical_level = CASE(criticality_level == "low_impact", 1, criticality_level == "medium_impact", 2, criticality_level == "high_impact", 3, criticality_level == "extreme_impact", 4)
  | KEEP @timestamp, criticality_level, id_field, id_value, numerical_level
  | SORT numerical_level DESC, id_value ASC
  | LIMIT ${entityLimit}`;

  const { columns, values } = await opts.esClient.esql.query({ query, drop_null_columns: true });

  return [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.esqlResults,
      data: { query, columns, values },
    },
  ];
};

const QUERY_FNS = [queryAssetCriticality];

const applyEsqlQueries = async (opts: BuildEsqlQueryOpts) => {
  if (!opts.entityType) {
    throw new Error('entityType is required');
  }

  const results: ToolHandlerResult[] = [];

  await asyncForEach(QUERY_FNS, async (queryFn) => {
    const queryResult = await queryFn(opts);
    if (queryResult != null) {
      results.push(...queryResult);
    }
  });

  return results;
};

export const assetCriticalityStaticInlineToolHandler = async (
  toolArgs: AssetCriticalityType,
  toolContext: ToolHandlerContext & EntityAnalyticsSkillsContext
) => {
  try {
    const { esClient, logger, spaceId } = toolContext;

    logger.info(
      `${ENTITY_ANALYTICS_ASSET_CRITICALITY_INLINE_TOOL_ID} tool called with args: ${JSON.stringify(
        toolArgs
      )}`
    );

    const assetCriticalityIndexPattern = getAssetCriticalityIndex(spaceId);

    const indexExists = await esClient.asInternalUser.indices.exists({
      index: assetCriticalityIndexPattern,
    });

    if (!indexExists) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Asset criticality index does not exist for this space.`,
            },
          },
        ],
      };
    }

    // Form an ES|QL query based on the inputs
    const results = await applyEsqlQueries({
      ...toolArgs,
      esClient: esClient.asCurrentUser,
      index: assetCriticalityIndexPattern,
    });

    return { results };
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

export const getAssetCriticalityInlineTool = (
  ctx: EntityAnalyticsSkillsContext
): SkillBoundedTool => ({
  id: ENTITY_ANALYTICS_ASSET_CRITICALITY_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: assetCriticalityStaticSchema,
  description: `Call this tool to get the asset criticality value for security entities (hosts, users, services, generic).`,
  handler: async (args, context) =>
    assetCriticalityStaticInlineToolHandler(args as AssetCriticalityType, { ...context, ...ctx }),
});
